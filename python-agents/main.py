"""FastAPI entry point for the multi-agent service.

Endpoints:
  POST /agent/chat       — Main chat endpoint (orchestrator → agent loop)
  POST /agent/action     — Approve/reject a pending action
  GET  /agent/agents     — List all agent definitions
  POST /knowledge/upload — Upload a file to the knowledge base
  POST /knowledge/scrape — Scrape a URL for the knowledge base
  GET  /health           — Health check
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from config import AGENT_SERVICE_PORT, NEXTJS_BASE_URL
from agents.types import (
    AgentChatRequest,
    AgentChatResponse,
    AgentId,
    AutonomyLevel,
    ChatMessage,
    LLMConfig,
    PendingAction,
    StoreDataSnapshot,
)
from agents.registry import get_agent, get_all_agents
from agents.orchestrator import route_message
from agents.prompts import build_system_prompt
from agents.loop import run_agent_loop
from knowledge.rag import retrieve_context
from knowledge.ingest import ingest_file, scrape_url
from tools.mcp_client import execute_tool, describe_tool_action
from scheduler.runner import scheduler
from scheduler.registry import get_all_job_types

app = FastAPI(title="Virtual PPO Agent Service", version="2.0.0")

# CORS — allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "azmyra-agents",
        "version": "2.0.0",
        "agents": 6,
        "scheduler": scheduler.get_status(),
    }


# ---------------------------------------------------------------------------
# List agents
# ---------------------------------------------------------------------------


@app.get("/agent/agents")
async def list_agents():
    agents = get_all_agents()
    return [
        {
            "id": a.id.value,
            "name": a.name,
            "description": a.description,
            "icon": a.icon,
            "color": a.color,
            "capabilities": a.capabilities,
        }
        for a in agents
    ]


# ---------------------------------------------------------------------------
# Main chat endpoint
# ---------------------------------------------------------------------------


@app.post("/agent/chat")
async def agent_chat(request: AgentChatRequest) -> AgentChatResponse:
    """Main entry point: route message → build prompt → run agent loop."""

    # Extract LLM config
    llm_settings = request.settings.get("llm", {})
    llm_config = LLMConfig(
        provider=llm_settings.get("provider", "openai"),
        api_key=llm_settings.get("apiKey", ""),
        api_endpoint=llm_settings.get("apiEndpoint"),
        model=llm_settings.get("model"),
    )

    # Extract autonomy preferences
    prefs = request.settings.get("preferences", {})
    autonomy_level = AutonomyLevel(prefs.get("autonomyLevel", "oversight"))
    auto_send_emails = prefs.get("autoSendEmails", False)
    auto_create_jira = prefs.get("autoCreateJiraStories", False)

    # Check Confluence connection status
    integrations = request.settings.get("integrations", {})
    confluence_enabled = integrations.get("confluence", {}).get("enabled", False)

    # Route to agent
    explicit_agent = AgentId(request.agent_id) if request.agent_id else None
    agent_id = await route_message(request.message, llm_config, explicit_agent)
    agent_def = get_agent(agent_id)

    # Retrieve RAG context
    knowledge_docs = request.settings.get("_knowledgeDocs", [])
    rag_docs = await retrieve_context(
        request.message,
        llm_config,
        knowledge_docs=knowledge_docs,
        confluence_enabled=confluence_enabled,
        base_url=NEXTJS_BASE_URL,
    )

    # Build system prompt
    system_prompt = build_system_prompt(
        agent_id=agent_id,
        store_data=request.store_data,
        rag_docs=rag_docs,
        available_tools=agent_def.tools if agent_def.tools else None,
    )

    # Convert history
    history = [ChatMessage(role=m.role, content=m.content) for m in request.history]

    # Run agent loop
    result = await run_agent_loop(
        agent_id=agent_id,
        agent_name=agent_def.name,
        system_prompt=system_prompt,
        user_message=request.message,
        history=history,
        llm_config=llm_config,
        temperature=agent_def.temperature,
        max_iterations=agent_def.max_iterations,
        autonomy_level=autonomy_level,
        auto_send_emails=auto_send_emails,
        auto_create_jira_stories=auto_create_jira,
        rag_context=rag_docs,
        base_url=NEXTJS_BASE_URL,
    )

    # Handle handoff (single depth)
    if result.handoff_to and result.handoff_to != agent_id:
        handoff_agent = get_agent(result.handoff_to)
        handoff_prompt = build_system_prompt(
            agent_id=result.handoff_to,
            store_data=request.store_data,
            rag_docs=rag_docs,
            available_tools=handoff_agent.tools if handoff_agent.tools else None,
        )

        handoff_message = (
            f"[Handoff from {agent_def.name}]\n"
            f"Original request: {request.message}\n"
            f"Context from {agent_def.name}: {result.content[:500]}"
        )

        handoff_result = await run_agent_loop(
            agent_id=result.handoff_to,
            agent_name=handoff_agent.name,
            system_prompt=handoff_prompt,
            user_message=handoff_message,
            history=[],
            llm_config=llm_config,
            temperature=handoff_agent.temperature,
            max_iterations=handoff_agent.max_iterations,
            autonomy_level=autonomy_level,
            auto_send_emails=auto_send_emails,
            auto_create_jira_stories=auto_create_jira,
            rag_context=rag_docs,
            base_url=NEXTJS_BASE_URL,
        )

        # Merge results
        combined_content = (
            f"**{agent_def.name}:**\n{result.content}\n\n"
            f"---\n\n**{handoff_agent.name}** (supplementary analysis):\n{handoff_result.content}"
        )
        result.content = combined_content
        result.tools_executed.extend(handoff_result.tools_executed)
        result.pending_actions.extend(handoff_result.pending_actions)
        result.sources.extend(handoff_result.sources)

    return AgentChatResponse(
        response=result.content,
        agent_id=result.agent_id,
        agent_name=result.agent_name,
        tools_executed=result.tools_executed,
        pending_actions=result.pending_actions,
        rag_context=result.rag_context,
        sources=result.sources,
    )


# ---------------------------------------------------------------------------
# Pending action approval/rejection
# ---------------------------------------------------------------------------


@app.post("/agent/action")
async def handle_pending_action(
    action_id: str = "",
    decision: str = "",  # "approve" or "reject"
    settings: dict[str, Any] = {},
):
    """Execute or reject a previously queued pending action."""
    if decision == "approve":
        # Re-execute the tool
        # The caller must pass the tool details
        tool_name = settings.get("tool_name", "")
        tool_args = settings.get("tool_arguments", {})

        if not tool_name:
            raise HTTPException(status_code=400, detail="Missing tool_name")

        result = await execute_tool(tool_name, tool_args, NEXTJS_BASE_URL)
        return {
            "status": "executed",
            "action_id": action_id,
            "result": result["content"],
            "is_error": result["is_error"],
        }

    elif decision == "reject":
        return {"status": "rejected", "action_id": action_id}

    else:
        raise HTTPException(status_code=400, detail="decision must be 'approve' or 'reject'")


# ---------------------------------------------------------------------------
# Knowledge endpoints
# ---------------------------------------------------------------------------


@app.post("/knowledge/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file and extract its content for the knowledge base."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    content = await file.read()

    try:
        result = ingest_file(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "id": f"kd_{uuid.uuid4().hex[:12]}",
        "source_name": result["source_name"],
        "file_type": result["file_type"],
        "chunk_count": result["chunk_count"],
        "char_count": result["char_count"],
        "content": result["content"],
        "content_chunks": result["content_chunks"],
    }


class ScrapeRequest(BaseModel):
    url: str


@app.post("/knowledge/scrape")
async def scrape_url_endpoint(body: ScrapeRequest):
    """Scrape a public URL and extract its content."""
    url = body.url
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    try:
        result = await scrape_url(url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "id": f"kd_{uuid.uuid4().hex[:12]}",
        "source_name": result["source_name"],
        "source_url": result["source_url"],
        "chunk_count": result["chunk_count"],
        "char_count": result["char_count"],
        "domain": result["domain"],
        "content": result["content"],
        "content_chunks": result["content_chunks"],
    }


# ---------------------------------------------------------------------------
# Scheduler endpoints
# ---------------------------------------------------------------------------


@app.get("/scheduler/status")
async def scheduler_status():
    """Return scheduler status and registered job types."""
    return scheduler.get_status()


class TriggerRequest(BaseModel):
    user_id: str
    config: dict[str, Any] | None = None


@app.post("/scheduler/trigger/{job_type}")
async def trigger_job(job_type: str, body: TriggerRequest):
    """Manually trigger a specific job for a user."""
    if job_type not in get_all_job_types():
        raise HTTPException(status_code=404, detail=f"Unknown job type: {job_type}")
    result = await scheduler.trigger_job(body.user_id, job_type, body.config)
    return result


@app.post("/scheduler/check")
async def check_due_jobs():
    """Check for and execute all due jobs. Called by Cloud Scheduler."""
    result = await scheduler.check_and_run_due_jobs()
    return result


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import os
    import uvicorn
    # Cloud Run injects PORT=8080; respect it, fallback to configured port
    port = int(os.environ.get("PORT", AGENT_SERVICE_PORT))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

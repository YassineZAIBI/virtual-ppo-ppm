"""Core Agentic Loop.

Executes: LLM call -> parse tool calls -> autonomy gate -> execute/queue -> repeat.
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Any

from agents.types import (
    AgentId,
    AgentResponse,
    AutonomyLevel,
    ChatMessage,
    LLMConfig,
    PendingAction,
    RAGDocument,
    SourceAttribution,
    ToolExecution,
)
from agents.autonomy import check_autonomy_gate
from providers.llm import chat as llm_chat
from tools.mcp_client import (
    describe_tool_action,
    execute_tool,
    parse_tool_calls,
    strip_tool_blocks,
)


async def run_agent_loop(
    agent_id: AgentId,
    agent_name: str,
    system_prompt: str,
    user_message: str,
    history: list[ChatMessage],
    llm_config: LLMConfig,
    temperature: float = 0.7,
    max_iterations: int = 5,
    autonomy_level: AutonomyLevel = AutonomyLevel.OVERSIGHT,
    auto_send_emails: bool = False,
    auto_create_jira_stories: bool = False,
    rag_context: list[RAGDocument] | None = None,
    base_url: str | None = None,
) -> AgentResponse:
    """Run the agentic loop for a single agent."""

    tools_executed: list[ToolExecution] = []
    pending_actions: list[PendingAction] = []
    sources: list[SourceAttribution] = []
    rag_docs = rag_context or []

    # Build messages
    messages: list[ChatMessage] = [
        ChatMessage(role="system", content=system_prompt),
        *history,
        ChatMessage(role="user", content=user_message),
    ]

    final_content = ""
    iterations = 0

    for i in range(max_iterations):
        iterations = i + 1

        # Call LLM
        response_text = await llm_chat(
            llm_config,
            messages,
            temperature=temperature,
            max_tokens=4096,
        )

        # Parse tool calls
        tool_calls = parse_tool_calls(response_text)

        # No tool calls — final answer
        if not tool_calls:
            final_content = response_text
            break

        # Process each tool call
        tool_result_parts: list[str] = []

        for tc in tool_calls:
            tool_name = tc["name"]
            tool_args = tc["arguments"]

            gate = check_autonomy_gate(
                tool_name,
                autonomy_level,
                auto_send_emails=auto_send_emails,
                auto_create_jira_stories=auto_create_jira_stories,
            )

            if gate.value == "execute":
                # Execute the tool
                result = await execute_tool(tool_name, tool_args, base_url)
                tools_executed.append(ToolExecution(
                    tool_name=tool_name,
                    arguments=tool_args,
                    result=result["content"],
                    status="failed" if result["is_error"] else "executed",
                ))
                tool_result_parts.append(
                    f'Tool "{tool_name}" result:\n{result["content"]}'
                )

            elif gate.value == "gate":
                # Queue for approval (oversight mode)
                action = PendingAction(
                    id=f"pa_{uuid.uuid4().hex[:12]}",
                    agent_id=agent_id,
                    tool_name=tool_name,
                    tool_arguments=tool_args,
                    description=describe_tool_action(tool_name, tool_args),
                    status="pending",
                )
                pending_actions.append(action)
                tools_executed.append(ToolExecution(
                    tool_name=tool_name,
                    arguments=tool_args,
                    status="pending",
                ))
                tool_result_parts.append(
                    f'Tool "{tool_name}" requires approval. Action queued for user review.'
                )

            else:
                # Blocked (advisory/manual mode)
                desc = describe_tool_action(tool_name, tool_args)
                tools_executed.append(ToolExecution(
                    tool_name=tool_name,
                    arguments=tool_args,
                    status="blocked",
                ))
                tool_result_parts.append(
                    f'Tool "{tool_name}" would {desc} — but execution is disabled in {autonomy_level.value} mode.'
                )

        # Feed results back to LLM for next iteration
        messages.append(ChatMessage(role="assistant", content=response_text))
        messages.append(ChatMessage(
            role="user",
            content=(
                "[Tool Results]\n"
                + "\n\n".join(tool_result_parts)
                + "\n\nPlease continue with your analysis based on these results. "
                "If you have all the information you need, provide your final response without any tool calls."
            ),
        ))

    # If loop exhausted without a final answer, force one more call
    if not final_content:
        final_text = await llm_chat(
            llm_config, messages, temperature=temperature, max_tokens=4096
        )
        final_content = strip_tool_blocks(final_text)

    return AgentResponse(
        agent_id=agent_id,
        agent_name=agent_name,
        content=final_content,
        tools_executed=tools_executed,
        pending_actions=pending_actions,
        handoff_to=_detect_handoff(final_content),
        rag_context=rag_docs,
        sources=sources,
        iterations=iterations,
    )


# ---------------------------------------------------------------------------
# Handoff detection
# ---------------------------------------------------------------------------

_HANDOFF_RE = re.compile(
    r"\[HANDOFF:\s*(strategy|discovery|risk|communications|advisor|thinker)\]",
    re.IGNORECASE,
)


def _detect_handoff(content: str) -> AgentId | None:
    m = _HANDOFF_RE.search(content)
    return AgentId(m.group(1).lower()) if m else None

"""Pydantic models for the multi-agent system."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class AgentId(str, Enum):
    STRATEGY = "strategy"
    DISCOVERY = "discovery"
    RISK = "risk"
    COMMUNICATIONS = "communications"
    ADVISOR = "advisor"
    THINKER = "thinker"


class AutonomyLevel(str, Enum):
    FULL = "full"
    OVERSIGHT = "oversight"
    ADVISORY = "advisory"
    MANUAL = "manual"


class AutonomyGateResult(str, Enum):
    EXECUTE = "execute"
    GATE = "gate"
    BLOCK = "block"


class SourceType(str, Enum):
    JIRA = "jira"
    CONFLUENCE = "confluence"
    SLACK = "slack"
    MEETING = "meeting"
    INITIATIVE = "initiative"
    RISK = "risk"
    ROADMAP = "roadmap"
    FILE = "file"
    URL = "url"


class LLMConfig(BaseModel):
    provider: str = "openai"
    api_key: str = ""
    api_endpoint: Optional[str] = None
    model: Optional[str] = None


class SourceAttribution(BaseModel):
    source_type: SourceType
    source_id: str
    source_label: str
    excerpt: Optional[str] = None
    relevance: Optional[float] = None


class ToolExecution(BaseModel):
    tool_name: str
    arguments: dict[str, Any] = {}
    result: Optional[str] = None
    status: str = "executed"  # executed, pending, blocked, failed
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PendingAction(BaseModel):
    id: str
    agent_id: AgentId
    tool_name: str
    tool_arguments: dict[str, Any] = {}
    description: str
    status: str = "pending"  # pending, approved, rejected, executed
    result: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RAGDocument(BaseModel):
    source_type: str  # confluence, file, url
    source_id: str
    source_name: str
    content: str
    relevance: float = 0.0


class AgentDefinition(BaseModel):
    id: AgentId
    name: str
    description: str
    icon: str
    color: str
    temperature: float
    max_iterations: int
    tools: list[str] = []
    capabilities: list[str] = []


class ChatMessage(BaseModel):
    role: str  # system, user, assistant
    content: str


class AgentResponse(BaseModel):
    agent_id: AgentId
    agent_name: str
    content: str
    tools_executed: list[ToolExecution] = []
    pending_actions: list[PendingAction] = []
    handoff_to: Optional[AgentId] = None
    rag_context: list[RAGDocument] = []
    sources: list[SourceAttribution] = []
    iterations: int = 0


class StoreDataSnapshot(BaseModel):
    initiatives: list[dict[str, Any]] = []
    risks: list[dict[str, Any]] = []
    roadmap_items: list[dict[str, Any]] = []
    meetings: list[dict[str, Any]] = []


class AgentChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    settings: dict[str, Any] = {}
    store_data: Optional[StoreDataSnapshot] = None
    agent_id: Optional[AgentId] = None
    pending_action_id: Optional[str] = None
    pending_action_decision: Optional[str] = None  # approve, reject


class AgentChatResponse(BaseModel):
    response: str
    agent_id: AgentId
    agent_name: str
    tools_executed: list[ToolExecution] = []
    pending_actions: list[PendingAction] = []
    rag_context: list[RAGDocument] = []
    sources: list[SourceAttribution] = []

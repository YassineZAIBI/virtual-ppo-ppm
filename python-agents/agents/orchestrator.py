"""Orchestrator — routes user messages to the right agent.

Tier 1: Keyword pattern matching (fast, no LLM call) — covers ~80% of requests.
Tier 2: LLM-based intent classification (low-temp, low-token) — for ambiguous messages.
"""

from __future__ import annotations

import re

from agents.types import AgentId, ChatMessage, LLMConfig
from providers.llm import chat as llm_chat

# ---------------------------------------------------------------------------
# Tier 1: Keyword-based routing
# ---------------------------------------------------------------------------

# Patterns mapped to agent IDs (checked in order — first match wins)
_KEYWORD_RULES: list[tuple[AgentId, list[str]]] = [
    # Thinker — synthesis / big picture / investigation
    (AgentId.THINKER, [
        "big picture", "what do we know", "summarize everything", "full analysis",
        "where does this come from", "trace", "cross-reference", "investigate",
        "connect the dots", "all sources", "comprehensive view", "deep dive",
        "source map", "what's missing",
    ]),

    # Risk — risk assessment, blockers, mitigation
    (AgentId.RISK, [
        "risk", "blocker", "blocked", "mitigation", "threat", "vulnerability",
        "escalat", "severity", "probability", "impact analysis", "fmea",
        "risk matrix", "what could go wrong",
    ]),

    # Communications — emails, Slack, stakeholder updates
    (AgentId.COMMUNICATIONS, [
        "email", "send message", "slack", "notify", "stakeholder update",
        "meeting summary", "announcement", "newsletter", "status update",
        "post to", "draft email", "send to", "share with",
    ]),

    # Discovery — research, market, JTBD, opportunities
    (AgentId.DISCOVERY, [
        "discovery", "research", "market", "competitor", "opportunity",
        "customer need", "jobs to be done", "jtbd", "user interview",
        "hypothesis", "experiment", "validate", "porter",
    ]),

    # Strategy — prioritization, roadmap, OKRs, planning
    (AgentId.STRATEGY, [
        "prioriti", "roadmap", "backlog", "okr", "kpi", "strategy",
        "sprint", "epic", "story", "rice", "wsjf", "plan", "quarter",
        "initiative", "feature", "requirement", "scope", "timeline",
        "jira", "create issue", "create ticket", "create story",
        "dependency", "alignment",
    ]),

    # Advisor — best practices, methodology, architecture
    (AgentId.ADVISOR, [
        "best practice", "advice", "recommend", "how should", "what's the best way",
        "methodology", "framework", "agile", "scrum", "safe", "kanban", "lean",
        "architecture", "pattern", "approach", "opinion", "guidance",
        "industry standard", "benchmark",
    ]),
]


def route_by_keywords(message: str) -> AgentId | None:
    """Attempt to route a message to an agent using keyword matching.

    Returns None if no strong match is found (fall through to Tier 2).
    """
    lower = message.lower()

    for agent_id, keywords in _KEYWORD_RULES:
        for kw in keywords:
            if kw in lower:
                return agent_id

    return None


# ---------------------------------------------------------------------------
# Tier 2: LLM-based intent classification
# ---------------------------------------------------------------------------

_CLASSIFY_PROMPT = """You are a request router. Given a user message, classify which specialized agent should handle it.

Available agents:
- strategy: Product strategy, prioritization, roadmap planning, OKRs, Jira operations
- discovery: Market research, customer needs, opportunity analysis, hypothesis validation
- risk: Risk assessment, mitigation planning, blocker identification, escalation
- communications: Emails, Slack messages, stakeholder updates, meeting summaries
- advisor: Best practices, methodology guidance, architecture advice, expert opinion
- thinker: Big-picture synthesis, cross-source analysis, information gathering, traceability

Respond with ONLY the agent name (one word, lowercase). If truly ambiguous, respond with "strategy" as the default.

User message: {message}

Agent:"""


async def route_by_llm(message: str, llm_config: LLMConfig) -> AgentId:
    """Classify intent using a low-temperature, low-token LLM call."""
    prompt = _CLASSIFY_PROMPT.format(message=message[:500])

    try:
        result = await llm_chat(
            llm_config,
            [ChatMessage(role="user", content=prompt)],
            temperature=0.1,
            max_tokens=20,
        )
        agent_name = result.strip().lower().rstrip(".")
        return AgentId(agent_name)
    except (ValueError, KeyError):
        return AgentId.STRATEGY  # safe default


# ---------------------------------------------------------------------------
# Main routing function
# ---------------------------------------------------------------------------


async def route_message(
    message: str,
    llm_config: LLMConfig,
    explicit_agent: AgentId | None = None,
) -> AgentId:
    """Route a user message to the appropriate agent.

    Priority:
    1. Explicit agent selection (user chose from UI dropdown)
    2. Tier 1: Keyword pattern matching
    3. Tier 2: LLM-based classification
    """
    # If user explicitly selected an agent, use it
    if explicit_agent is not None:
        return explicit_agent

    # Tier 1: keyword matching
    keyword_match = route_by_keywords(message)
    if keyword_match is not None:
        return keyword_match

    # Tier 2: LLM classification
    return await route_by_llm(message, llm_config)

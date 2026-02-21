"""Agent Registry — definitions for all 6 agents.

Each agent has: id, name, description, icon, color, temperature,
max_iterations, allowed tools, and capabilities.

System prompts are in prompts.py (separate file for collaborative review).
"""

from __future__ import annotations

from agents.types import AgentDefinition, AgentId

# ---------------------------------------------------------------------------
# Agent definitions
# ---------------------------------------------------------------------------

AGENTS: dict[AgentId, AgentDefinition] = {
    AgentId.STRATEGY: AgentDefinition(
        id=AgentId.STRATEGY,
        name="Strategy Agent",
        description="Product strategy, prioritization, roadmap planning, OKR alignment, and Jira operations.",
        icon="Target",
        color="blue",
        temperature=0.3,
        max_iterations=5,
        tools=[
            "jira_search_issues",
            "jira_get_issue",
            "jira_create_issue",
            "confluence_search",
            "confluence_create_page",
        ],
        capabilities=[
            "RICE scoring",
            "WSJF prioritization",
            "OKR alignment",
            "Now/Next/Later roadmapping",
            "Dependency mapping",
            "Sprint planning",
            "Backlog grooming",
        ],
    ),

    AgentId.DISCOVERY: AgentDefinition(
        id=AgentId.DISCOVERY,
        name="Discovery Agent",
        description="Market research, customer needs analysis, opportunity assessment, and hypothesis-driven development.",
        icon="Search",
        color="purple",
        temperature=0.5,
        max_iterations=4,
        tools=[
            "confluence_search",
            "confluence_create_page",
        ],
        capabilities=[
            "Jobs-to-be-Done analysis",
            "Porter's Five Forces",
            "Opportunity Solution Trees",
            "Hypothesis-driven development",
            "Customer interview synthesis",
            "Market sizing",
        ],
    ),

    AgentId.RISK: AgentDefinition(
        id=AgentId.RISK,
        name="Risk Agent",
        description="Risk assessment, mitigation planning, blocker identification, and escalation management.",
        icon="ShieldAlert",
        color="red",
        temperature=0.3,
        max_iterations=4,
        tools=[
            "jira_search_issues",
            "slack_post_message",
            "confluence_search",
        ],
        capabilities=[
            "Risk matrix (Probability x Impact)",
            "FMEA analysis",
            "Risk categorization",
            "Escalation rules",
            "Mitigation planning",
            "Dependency risk detection",
        ],
    ),

    AgentId.COMMUNICATIONS: AgentDefinition(
        id=AgentId.COMMUNICATIONS,
        name="Communications Agent",
        description="Stakeholder communications, email drafting, Slack messages, meeting summaries, and status updates.",
        icon="MessageSquare",
        color="green",
        temperature=0.5,
        max_iterations=4,
        tools=[
            "jira_search_issues",
            "jira_get_issue",
            "jira_create_issue",
            "jira_add_comment",
            "slack_post_message",
            "slack_send_meeting_summary",
            "confluence_search",
            "confluence_create_page",
            "email_send",
        ],
        capabilities=[
            "Stakeholder matrix",
            "Email templates",
            "Slack Block Kit formatting",
            "RACI matrix",
            "Meeting summary formatting",
            "Status report generation",
        ],
    ),

    AgentId.ADVISOR: AgentDefinition(
        id=AgentId.ADVISOR,
        name="Expert Advisor",
        description="Best practices, methodology guidance, architecture advice, and expert business/technical opinion. The wise man of the team.",
        icon="GraduationCap",
        color="amber",
        temperature=0.7,
        max_iterations=3,
        tools=[],  # Advisory only — no tool execution
        capabilities=[
            "Agile/Scrum/SAFe/Lean/Kanban expertise",
            "Unit economics analysis",
            "TAM/SAM/SOM sizing",
            "Architecture patterns",
            "Technical debt assessment",
            "Build vs Buy analysis",
            "Go-to-market strategy",
        ],
    ),

    AgentId.THINKER: AgentDefinition(
        id=AgentId.THINKER,
        name="Thinker",
        description="Internal intelligence analyst. Gathers from all sources, cross-references, builds the big picture with full source attribution.",
        icon="Brain",
        color="indigo",
        temperature=0.4,
        max_iterations=5,
        tools=[
            "jira_search_issues",
            "jira_get_issue",
            "confluence_search",
            "slack_post_message",  # for proactive notifications
        ],
        capabilities=[
            "Multi-source synthesis",
            "Cross-referencing",
            "Source attribution",
            "Risk traceability",
            "Gap analysis",
            "Big-picture framing",
            "Proactive notifications",
        ],
    ),
}


def get_agent(agent_id: AgentId) -> AgentDefinition:
    """Get an agent definition by ID."""
    return AGENTS[agent_id]


def get_all_agents() -> list[AgentDefinition]:
    """Get all agent definitions."""
    return list(AGENTS.values())

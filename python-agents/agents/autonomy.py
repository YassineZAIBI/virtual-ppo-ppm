"""Autonomy gating logic.

Determines whether a tool call should be executed, queued for approval,
or blocked — based on the autonomy level and tool type.
"""

from __future__ import annotations

from agents.types import AutonomyLevel, AutonomyGateResult
from tools.mcp_client import READ_ONLY_TOOLS

# Tool-specific autonomy overrides
TOOL_AUTONOMY_OVERRIDES: dict[str, str] = {
    "email_send": "auto_send_emails",
    "jira_create_issue": "auto_create_jira_stories",
}


def check_autonomy_gate(
    tool_name: str,
    autonomy_level: AutonomyLevel,
    auto_send_emails: bool = False,
    auto_create_jira_stories: bool = False,
) -> AutonomyGateResult:
    """Check whether a tool call should be executed, gated, or blocked."""

    # Manual mode blocks everything
    if autonomy_level == AutonomyLevel.MANUAL:
        return AutonomyGateResult.BLOCK

    # Advisory mode blocks all execution (only suggests)
    if autonomy_level == AutonomyLevel.ADVISORY:
        return AutonomyGateResult.BLOCK

    # Read-only tools always execute in oversight and full
    if tool_name in READ_ONLY_TOOLS:
        return AutonomyGateResult.EXECUTE

    # Full autonomy — execute everything
    if autonomy_level == AutonomyLevel.FULL:
        return AutonomyGateResult.EXECUTE

    # Oversight mode — check tool-specific overrides
    if autonomy_level == AutonomyLevel.OVERSIGHT:
        override_key = TOOL_AUTONOMY_OVERRIDES.get(tool_name)
        if override_key:
            prefs = {
                "auto_send_emails": auto_send_emails,
                "auto_create_jira_stories": auto_create_jira_stories,
            }
            if prefs.get(override_key, False):
                return AutonomyGateResult.EXECUTE
        # Gate write tools for approval
        return AutonomyGateResult.GATE

    return AutonomyGateResult.BLOCK

"""MCP Tool Client.

Executes tools by calling back to the Next.js integration API routes.
Parses tool calls from LLM text responses (```tool blocks).
"""

from __future__ import annotations

import json
import re
from typing import Any
from urllib.parse import quote

import httpx

from config import NEXTJS_BASE_URL


# ---------------------------------------------------------------------------
# Tool definitions (mirrors src/lib/mcp/client.ts)
# ---------------------------------------------------------------------------

READ_ONLY_TOOLS = frozenset({
    "jira_search_issues",
    "jira_get_issue",
    "confluence_search",
})

ALL_TOOL_NAMES = frozenset({
    "jira_search_issues",
    "jira_create_issue",
    "jira_get_issue",
    "jira_add_comment",
    "slack_post_message",
    "slack_send_meeting_summary",
    "confluence_search",
    "confluence_create_page",
    "email_send",
})


# ---------------------------------------------------------------------------
# Parse tool calls from LLM text
# ---------------------------------------------------------------------------

TOOL_BLOCK_RE = re.compile(r"```tool\s*\n?([\s\S]*?)```", re.MULTILINE)


def parse_tool_calls(response: str) -> list[dict[str, Any]]:
    """Extract tool call JSON blocks from an LLM response string."""
    calls: list[dict[str, Any]] = []
    for match in TOOL_BLOCK_RE.finditer(response):
        try:
            parsed = json.loads(match.group(1).strip())
            if "name" in parsed and "arguments" in parsed:
                calls.append(parsed)
        except (json.JSONDecodeError, KeyError):
            continue
    return calls


def strip_tool_blocks(response: str) -> str:
    """Remove ```tool ... ``` blocks from text."""
    return TOOL_BLOCK_RE.sub("", response).strip()


# ---------------------------------------------------------------------------
# Execute a tool call via Next.js integration APIs
# ---------------------------------------------------------------------------


async def execute_tool(
    tool_name: str,
    arguments: dict[str, Any],
    base_url: str | None = None,
) -> dict[str, Any]:
    """Execute an MCP tool by calling the corresponding Next.js API route.

    Returns: {"content": str, "is_error": bool, "metadata": dict}
    """
    base = (base_url or NEXTJS_BASE_URL).rstrip("/")

    endpoint = ""
    method = "POST"
    body: dict[str, Any] = {}

    match tool_name:
        # Jira tools
        case "jira_search_issues":
            jql = quote(arguments.get("jql", ""))
            endpoint = f"/api/integrations/jira?action=issues&jql={jql}"
            method = "GET"

        case "jira_create_issue":
            endpoint = "/api/integrations/jira"
            labels_raw = arguments.get("labels", "")
            labels = [l.strip() for l in labels_raw.split(",")] if labels_raw else []
            body = {
                "action": "create",
                "summary": arguments.get("summary", ""),
                "description": arguments.get("description", ""),
                "issueType": arguments.get("issueType", "Story"),
                "labels": labels,
            }

        case "jira_get_issue":
            key = quote(arguments.get("issueKey", ""))
            endpoint = f"/api/integrations/jira?action=issue&issueKey={key}"
            method = "GET"

        case "jira_add_comment":
            endpoint = "/api/integrations/jira"
            body = {
                "action": "comment",
                "issueKey": arguments.get("issueKey", ""),
                "body": arguments.get("body", ""),
            }

        # Slack tools
        case "slack_post_message":
            endpoint = "/api/integrations/slack"
            body = {
                "action": "message",
                "text": arguments.get("text", ""),
                "channel": arguments.get("channel"),
            }

        case "slack_send_meeting_summary":
            endpoint = "/api/integrations/slack"
            action_items = arguments.get("actionItems", "[]")
            decisions = arguments.get("decisions", "[]")
            body = {
                "action": "meeting-summary",
                "meeting": {
                    "title": arguments.get("title", ""),
                    "summary": arguments.get("summary", ""),
                    "actionItems": json.loads(action_items) if isinstance(action_items, str) else action_items,
                    "decisions": json.loads(decisions) if isinstance(decisions, str) else decisions,
                },
            }

        # Confluence tools
        case "confluence_search":
            q = quote(arguments.get("query", ""))
            endpoint = f"/api/integrations/confluence?action=search&q={q}"
            method = "GET"

        case "confluence_create_page":
            endpoint = "/api/integrations/confluence"
            body = {
                "action": "create-page",
                "title": arguments.get("title", ""),
                "body": arguments.get("body", ""),
                "spaceKey": arguments.get("spaceKey"),
            }

        # Email tools
        case "email_send":
            endpoint = "/api/integrations/email"
            body = {
                "action": "send",
                "to": arguments.get("to", ""),
                "subject": arguments.get("subject", ""),
                "html": arguments.get("body", ""),
            }

        case _:
            return {"content": f"Unknown tool: {tool_name}", "is_error": True, "metadata": {}}

    # Execute the HTTP call
    url = f"{base}{endpoint}"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            if method == "GET":
                resp = await client.get(url, headers={"Content-Type": "application/json"})
            else:
                resp = await client.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json=body,
                )

            data = resp.json()

            if resp.status_code >= 400:
                return {
                    "content": f"Error: {data.get('error', 'Request failed')}",
                    "is_error": True,
                    "metadata": {"status_code": resp.status_code},
                }

            return {
                "content": json.dumps(data, indent=2),
                "is_error": False,
                "metadata": {"tool": tool_name},
            }

    except Exception as exc:
        return {
            "content": f"Tool execution failed: {exc}",
            "is_error": True,
            "metadata": {},
        }


def describe_tool_action(tool_name: str, arguments: dict[str, Any]) -> str:
    """Generate a human-readable description of what a tool call will do."""
    match tool_name:
        case "jira_create_issue":
            return f'create a Jira {arguments.get("issueType", "Story")}: "{arguments.get("summary", "")}"'
        case "jira_add_comment":
            return f'add a comment to {arguments.get("issueKey", "")}'
        case "jira_search_issues":
            return f'search Jira issues with: {arguments.get("jql", "")}'
        case "jira_get_issue":
            return f'get details of {arguments.get("issueKey", "")}'
        case "slack_post_message":
            text = arguments.get("text", "")[:80]
            return f'send a Slack message: "{text}..."'
        case "slack_send_meeting_summary":
            return f'post meeting summary "{arguments.get("title", "")}" to Slack'
        case "confluence_search":
            return f'search Confluence for: "{arguments.get("query", "")}"'
        case "confluence_create_page":
            return f'create Confluence page: "{arguments.get("title", "")}"'
        case "email_send":
            return f'send email to {arguments.get("to", "")}: "{arguments.get("subject", "")}"'
        case _:
            return f"execute {tool_name}"

"""Transversal context injection for all agents."""
from __future__ import annotations
import logging
from typing import Any, Optional
import httpx
from config import NEXTJS_BASE_URL

logger = logging.getLogger(__name__)

TRANSVERSAL_TEMPLATE = """
You have access to the complete account context:
- North Star: {north_star}
- Business Goals: {business_goals_summary}
- Active Strategies: {strategies_summary}
- Competitor Intelligence: {competitor_summary}
- Recent Alerts: {recent_alerts}
- Vision Alignment Scores: {alignment_summary}

Use this context to evaluate any request against the big picture.
Flag conflicts between strategies. Flag alignment drift. Flag competitive risks.
"""


async def build_transversal_context(user_id: str) -> str:
    """Build the transversal context string for a user by fetching from APIs."""
    try:
        async with httpx.AsyncClient(
            base_url=NEXTJS_BASE_URL, timeout=10.0
        ) as client:
            headers = {"x-user-id": user_id}

            # Fetch vision pyramid
            pyramid_resp = await client.get(
                "/api/vision/pyramid", headers=headers
            )
            pyramid = (
                pyramid_resp.json() if pyramid_resp.status_code == 200 else {}
            )

            # Fetch portfolio
            portfolio_resp = await client.get(
                "/api/strategy/portfolio", headers=headers
            )
            portfolio = (
                portfolio_resp.json()
                if portfolio_resp.status_code == 200
                else {}
            )

            # Fetch alerts
            alerts_resp = await client.get(
                "/api/alerts?limit=5", headers=headers
            )
            alerts_data = (
                alerts_resp.json() if alerts_resp.status_code == 200 else {}
            )

            # --- Build summary strings ---

            north_star = pyramid.get("northStar", {})
            ns_text = (
                north_star.get("statement", "Not defined")
                if north_star
                else "Not defined"
            )

            goals = pyramid.get("businessGoals", [])
            goals_summary = (
                ", ".join([g.get("title", "") for g in goals[:5]])
                or "None defined"
            )

            portfolio_items = portfolio.get("portfolio", [])
            strategies = [
                p
                for p in portfolio_items
                if p.get("level") in ("solution", "epic")
            ]
            strategies_summary = (
                ", ".join([s.get("title", "") for s in strategies[:5]])
                or "None active"
            )

            alerts = alerts_data.get("alerts", [])
            alerts_summary = (
                "; ".join([a.get("title", "") for a in alerts[:5]])
                or "No recent alerts"
            )

            summary = portfolio.get("summary", {})
            avg_alignment = summary.get("avgAlignment")
            alignment_text = (
                f"Average VAS: {avg_alignment:.0f}/100"
                if avg_alignment
                else "No scores computed"
            )

            return TRANSVERSAL_TEMPLATE.format(
                north_star=ns_text,
                business_goals_summary=goals_summary,
                strategies_summary=strategies_summary,
                competitor_summary="Not yet available (Phase 4)",
                recent_alerts=alerts_summary,
                alignment_summary=alignment_text,
            )
    except Exception as e:
        logger.warning(f"Failed to build transversal context: {e}")
        return "\n[Transversal context unavailable — API unreachable]\n"

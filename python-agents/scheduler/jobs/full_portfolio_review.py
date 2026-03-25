"""Full Portfolio Review — weekly comprehensive review combining all signals."""

from __future__ import annotations

import logging
from typing import Any

from .base import BaseCronJob

logger = logging.getLogger(__name__)


class FullPortfolioReviewJob(BaseCronJob):
    job_type = "full_portfolio_review"

    async def run(self, user_id: str, config: dict[str, Any]) -> dict[str, Any]:
        """Comprehensive weekly review: all scans + cross-strategy radar + rebalancing."""
        resp = await self.http.post(
            "/api/strategy/portfolio/review",
            json={"userId": user_id},
            headers={"x-user-id": user_id},
        )
        if resp.status_code != 200:
            return {"error": "Failed to trigger portfolio review"}

        data = resp.json()
        return {
            "initiatives_reviewed": data.get("initiativesReviewed", 0),
            "conflicts_found": data.get("conflictsFound", 0),
            "synergies_found": data.get("synergiesFound", 0),
            "rebalancing_suggestions": data.get("rebalancingSuggestions", 0),
            "tokens_used": data.get("tokensUsed", 0),
        }

    async def generate_alerts(
        self, user_id: str, result: dict[str, Any]
    ) -> list[dict[str, Any]]:
        alerts = []
        conflicts = result.get("conflicts_found", 0)
        suggestions = result.get("rebalancing_suggestions", 0)

        if conflicts > 0 or suggestions > 0:
            alerts.append({
                "type": "action_required",
                "severity": "warning" if conflicts > 0 else "info",
                "title": "Weekly portfolio review completed",
                "message": (
                    f"Portfolio review: {result.get('initiatives_reviewed', 0)} initiatives reviewed. "
                    f"{conflicts} conflicts found, {result.get('synergies_found', 0)} synergies identified, "
                    f"{suggestions} rebalancing suggestions."
                ),
                "source": "full_portfolio_review",
            })
        return alerts

"""Risk Reassessment — daily re-evaluation of risk scores with fresh data."""

from __future__ import annotations

import logging
from typing import Any

from .base import BaseCronJob

logger = logging.getLogger(__name__)


class RiskReassessJob(BaseCronJob):
    job_type = "risk_reassess"

    async def run(self, user_id: str, config: dict[str, Any]) -> dict[str, Any]:
        """Re-evaluate all active risks with current market/competitor data."""
        resp = await self.http.post(
            "/api/strategy/risks/reassess",
            json={"userId": user_id},
            headers={"x-user-id": user_id},
        )
        if resp.status_code != 200:
            return {"reassessed": 0, "escalated": 0, "error": "Failed to trigger risk reassessment"}

        data = resp.json()
        return {
            "reassessed": data.get("reassessed", 0),
            "escalated": data.get("escalated", 0),
            "tokens_used": data.get("tokensUsed", 0),
        }

    async def generate_alerts(
        self, user_id: str, result: dict[str, Any]
    ) -> list[dict[str, Any]]:
        alerts = []
        escalated = result.get("escalated", 0)
        if escalated > 0:
            alerts.append({
                "type": "strategy_risk",
                "severity": "critical" if escalated >= 3 else "warning",
                "title": f"{escalated} risks escalated",
                "message": f"Risk reassessment found {escalated} risks that have increased in severity. Immediate review recommended.",
                "source": "risk_reassess",
            })
        return alerts

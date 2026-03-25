"""Strategy Eval — daily re-evaluation of initiative alignment scores."""

from __future__ import annotations

import logging
from typing import Any

from .base import BaseCronJob

logger = logging.getLogger(__name__)


class StrategyEvalJob(BaseCronJob):
    job_type = "strategy_eval"

    async def run(self, user_id: str, config: dict[str, Any]) -> dict[str, Any]:
        """Recompute VAS for all initiatives. Flag significant score changes."""
        # Trigger batch alignment recomputation
        resp = await self.http.post(
            "/api/vision/alignment/batch",
            json={"userId": user_id},
            headers={"x-user-id": user_id},
        )
        if resp.status_code != 200:
            return {"evaluated": 0, "drifted": 0, "error": "Failed to trigger batch alignment"}

        data = resp.json()
        return {
            "evaluated": data.get("evaluated", 0),
            "drifted": data.get("drifted", 0),
            "tokens_used": data.get("tokensUsed", 0),
        }

    async def generate_alerts(
        self, user_id: str, result: dict[str, Any]
    ) -> list[dict[str, Any]]:
        alerts = []
        drifted = result.get("drifted", 0)
        if drifted > 0:
            alerts.append({
                "type": "alignment_drift",
                "severity": "warning",
                "title": f"{drifted} initiatives with alignment drift",
                "message": f"Strategy evaluation found {drifted} initiatives whose alignment score dropped significantly. Review your portfolio.",
                "source": "strategy_eval",
            })
        return alerts

"""Market Pulse — daily general market scan for the user's industry."""

from __future__ import annotations

import logging
from typing import Any

from .base import BaseCronJob

logger = logging.getLogger(__name__)


class MarketPulseJob(BaseCronJob):
    job_type = "market_pulse"

    async def run(self, user_id: str, config: dict[str, Any]) -> dict[str, Any]:
        """Scan market for trends relevant to the user's North Star and products."""
        resp = await self.http.post(
            "/api/market-research/pulse",
            json={"userId": user_id},
            headers={"x-user-id": user_id},
        )
        if resp.status_code != 200:
            return {"dataPoints": 0, "error": "Failed to trigger market pulse"}

        data = resp.json()
        return {
            "dataPoints": data.get("dataPoints", 0),
            "notable": data.get("notable", 0),
            "tokens_used": data.get("tokensUsed", 0),
        }

    async def generate_alerts(
        self, user_id: str, result: dict[str, Any]
    ) -> list[dict[str, Any]]:
        alerts = []
        notable = result.get("notable", 0)
        if notable > 0:
            alerts.append({
                "type": "market_shift",
                "severity": "info",
                "title": f"Market pulse: {notable} notable findings",
                "message": f"Daily market scan found {notable} notable market developments relevant to your product strategy.",
                "source": "market_pulse",
            })
        return alerts

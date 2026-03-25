"""VisionGuard — periodic alignment drift detection."""
from __future__ import annotations
import logging
from typing import Any
from .base import BaseCronJob

logger = logging.getLogger(__name__)


class VisionGuardJob(BaseCronJob):
    job_type = "vision_guard"

    async def run(self, user_id: str, config: dict[str, Any]) -> dict[str, Any]:
        """Run alignment drift detection for all user initiatives."""
        resp = await self.http.post(
            "/api/vision/alignment/batch",
            json={"userId": user_id},
            headers={"x-user-id": user_id},
        )
        if resp.status_code != 200:
            return {"error": "Failed to run batch alignment"}

        data = resp.json()
        return {
            "evaluated": data.get("evaluated", 0),
            "drifted": data.get("drifted", 0),
            "scores": data.get("scores", []),
        }

    async def generate_alerts(
        self, user_id: str, result: dict[str, Any]
    ) -> list[dict[str, Any]]:
        alerts: list[dict[str, Any]] = []
        drifted = result.get("drifted", 0)
        if drifted > 0:
            alerts.append(
                {
                    "type": "alignment_drift",
                    "severity": "warning",
                    "title": f"Alignment drift detected in {drifted} initiative(s)",
                    "message": (
                        f"Vision alignment re-evaluation found {drifted} initiative(s) "
                        "with significant score changes (>10 points). Review recommended."
                    ),
                    "source": "vision_guard",
                }
            )
        return alerts

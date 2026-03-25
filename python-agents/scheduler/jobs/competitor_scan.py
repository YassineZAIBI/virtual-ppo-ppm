"""Competitor Scan — daily scan of competitor activity via data adapters."""

from __future__ import annotations

import logging
from typing import Any

from .base import BaseCronJob

logger = logging.getLogger(__name__)


class CompetitorScanJob(BaseCronJob):
    job_type = "competitor_scan"

    async def run(self, user_id: str, config: dict[str, Any]) -> dict[str, Any]:
        """Scan all active competitors using the data pipeline adapters."""
        # Fetch user's competitors
        resp = await self.http.get(
            "/api/competitors",
            headers={"x-user-id": user_id},
        )
        if resp.status_code != 200:
            return {"scanned": 0, "feeds_created": 0, "error": "Failed to fetch competitors"}

        competitors = resp.json()
        if not competitors:
            return {"scanned": 0, "feeds_created": 0}

        feeds_created = 0
        for competitor in competitors:
            if not competitor.get("isActive", True):
                continue

            # Trigger scan for this competitor via data pipeline
            scan_resp = await self.http.post(
                f"/api/competitors/{competitor['id']}/scan",
                json={"userId": user_id},
                headers={"x-user-id": user_id},
            )
            if scan_resp.status_code in (200, 201):
                data = scan_resp.json()
                feeds_created += data.get("feedsCreated", 0)

        return {
            "scanned": len(competitors),
            "feeds_created": feeds_created,
            "tokens_used": 0,
        }

    async def generate_alerts(
        self, user_id: str, result: dict[str, Any]
    ) -> list[dict[str, Any]]:
        alerts = []
        if result.get("feeds_created", 0) > 0:
            alerts.append({
                "type": "competitor_move",
                "severity": "info",
                "title": f"Competitor scan: {result['feeds_created']} new items found",
                "message": f"Daily competitor scan completed. {result['scanned']} competitors scanned, {result['feeds_created']} new feed items discovered.",
                "source": "competitor_scan",
            })
        return alerts

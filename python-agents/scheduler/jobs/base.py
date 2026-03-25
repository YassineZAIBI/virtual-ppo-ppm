"""Base class for all autonomous cron jobs."""

from __future__ import annotations

import time
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any

import httpx

from config import NEXTJS_BASE_URL

logger = logging.getLogger(__name__)


class BaseCronJob(ABC):
    """Abstract base for autonomous cron jobs.

    Subclasses implement `run()` with the actual job logic.
    The `execute()` wrapper handles run tracking, error handling, and alert generation.
    """

    job_type: str = ""

    def __init__(self, base_url: str = NEXTJS_BASE_URL):
        self.base_url = base_url
        self.http = httpx.AsyncClient(base_url=base_url, timeout=60.0)

    async def execute(self, user_id: str, config: dict[str, Any] | None = None) -> dict[str, Any]:
        """Run the job with full lifecycle tracking."""
        config = config or {}
        run_id = await self._create_run(user_id)
        start = time.monotonic()

        try:
            result = await self.run(user_id, config)
            duration_ms = int((time.monotonic() - start) * 1000)
            tokens = result.get("tokens_used", 0)

            await self._complete_run(run_id, result, duration_ms, tokens)
            await self._update_job_stats(user_id, result)

            # Let subclasses generate alerts from results
            alerts = await self.generate_alerts(user_id, result)
            if alerts:
                for alert in alerts:
                    await self._create_alert(user_id, alert)

            logger.info(
                "Job %s completed for user %s in %dms (tokens: %d)",
                self.job_type, user_id, duration_ms, tokens,
            )
            return result

        except Exception as exc:
            duration_ms = int((time.monotonic() - start) * 1000)
            await self._fail_run(run_id, str(exc), duration_ms)
            logger.error("Job %s failed for user %s: %s", self.job_type, user_id, exc)
            raise

    @abstractmethod
    async def run(self, user_id: str, config: dict[str, Any]) -> dict[str, Any]:
        """Execute the job logic. Return a result dict."""
        ...

    async def generate_alerts(
        self, user_id: str, result: dict[str, Any]
    ) -> list[dict[str, Any]]:
        """Override to create UserAlert dicts from results. Return [] for no alerts."""
        return []

    # -- Internal helpers for DB communication via Next.js API --

    async def _create_run(self, user_id: str) -> str:
        """Create a CronRun record via API, return its id."""
        try:
            resp = await self.http.post(
                "/api/cron/runs",
                json={"userId": user_id, "jobType": self.job_type, "status": "running"},
            )
            if resp.status_code == 200 or resp.status_code == 201:
                return resp.json().get("id", "unknown")
        except Exception as exc:
            logger.warning("Failed to create cron run record: %s", exc)
        return "unknown"

    async def _complete_run(
        self, run_id: str, result: dict, duration_ms: int, tokens: int
    ) -> None:
        try:
            await self.http.patch(
                f"/api/cron/runs/{run_id}",
                json={
                    "status": "completed",
                    "result": result,
                    "duration": duration_ms,
                    "tokensUsed": tokens,
                },
            )
        except Exception as exc:
            logger.warning("Failed to update cron run: %s", exc)

    async def _fail_run(self, run_id: str, error: str, duration_ms: int) -> None:
        try:
            await self.http.patch(
                f"/api/cron/runs/{run_id}",
                json={"status": "failed", "error": error, "duration": duration_ms},
            )
        except Exception as exc:
            logger.warning("Failed to mark cron run as failed: %s", exc)

    async def _update_job_stats(self, user_id: str, result: dict) -> None:
        """Update the parent CronJob record with last run info."""
        try:
            await self.http.post(
                "/api/cron/jobs/update-stats",
                json={
                    "userId": user_id,
                    "jobType": self.job_type,
                    "lastResult": result,
                },
            )
        except Exception as exc:
            logger.warning("Failed to update job stats: %s", exc)

    async def _create_alert(self, user_id: str, alert: dict[str, Any]) -> None:
        try:
            await self.http.post(
                "/api/alerts",
                json={"userId": user_id, **alert},
            )
        except Exception as exc:
            logger.warning("Failed to create alert: %s", exc)

    async def close(self) -> None:
        await self.http.aclose()

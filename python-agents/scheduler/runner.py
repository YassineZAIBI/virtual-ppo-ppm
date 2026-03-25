"""Cron scheduler runner using APScheduler.

Integrates with FastAPI's event loop. Reads job schedules from the
CronJob database table via the Next.js API and registers them with
APScheduler's AsyncIOScheduler.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any

import httpx

from config import NEXTJS_BASE_URL
from .registry import get_job_handler, get_all_job_types

logger = logging.getLogger(__name__)

# Whether to enable the scheduler (can be disabled in dev)
SCHEDULER_ENABLED = os.getenv("SCHEDULER_ENABLED", "false").lower() == "true"


class CronScheduler:
    """Manages autonomous cron jobs for all users.

    Instead of APScheduler (which has memory-based state issues on Cloud Run),
    this uses a polling approach: a single periodic task checks the CronJob
    table for jobs that are due, then executes them.

    This is Cloud Run-safe because:
    - No in-memory state to lose on scale-down
    - The DB is the source of truth for schedules
    - Duplicate runs are prevented by checking `nextRun` timestamp
    """

    def __init__(self, base_url: str = NEXTJS_BASE_URL):
        self.base_url = base_url
        self.http = httpx.AsyncClient(base_url=base_url, timeout=60.0)
        self._running = False

    async def check_and_run_due_jobs(self) -> dict[str, Any]:
        """Check for due jobs and execute them. Called by Cloud Scheduler or internal timer."""
        if not SCHEDULER_ENABLED:
            return {"skipped": True, "reason": "scheduler_disabled"}

        try:
            # Fetch all due jobs from the API
            resp = await self.http.get("/api/cron/jobs/due")
            if resp.status_code != 200:
                logger.warning("Failed to fetch due jobs: %s", resp.status_code)
                return {"error": "Failed to fetch due jobs"}

            due_jobs = resp.json()
            if not due_jobs:
                return {"executed": 0}

            results = []
            for job_data in due_jobs:
                job_type = job_data.get("jobType", "")
                user_id = job_data.get("userId", "")

                try:
                    handler = get_job_handler(job_type)
                    config = job_data.get("config", {})
                    result = await handler.execute(user_id, config if isinstance(config, dict) else {})
                    results.append({"jobType": job_type, "userId": user_id, "status": "completed"})
                    await handler.close()
                except Exception as exc:
                    logger.error("Job %s failed for user %s: %s", job_type, user_id, exc)
                    results.append({"jobType": job_type, "userId": user_id, "status": "failed", "error": str(exc)})

            return {"executed": len(results), "results": results}

        except Exception as exc:
            logger.error("Scheduler check failed: %s", exc)
            return {"error": str(exc)}

    async def trigger_job(self, user_id: str, job_type: str, config: dict | None = None) -> dict[str, Any]:
        """Manually trigger a specific job for a user."""
        try:
            handler = get_job_handler(job_type)
            result = await handler.execute(user_id, config or {})
            await handler.close()
            return {"status": "completed", "result": result}
        except ValueError as exc:
            return {"status": "error", "error": str(exc)}
        except Exception as exc:
            logger.error("Manual trigger of %s failed: %s", job_type, exc)
            return {"status": "failed", "error": str(exc)}

    def get_status(self) -> dict[str, Any]:
        """Return scheduler status."""
        return {
            "enabled": SCHEDULER_ENABLED,
            "job_types": get_all_job_types(),
        }

    async def close(self) -> None:
        await self.http.aclose()


# Singleton instance
scheduler = CronScheduler()

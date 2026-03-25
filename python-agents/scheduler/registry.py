"""Job type → handler mapping for the cron scheduler."""

from __future__ import annotations

from typing import Type

from .jobs.base import BaseCronJob
from .jobs.competitor_scan import CompetitorScanJob
from .jobs.strategy_eval import StrategyEvalJob
from .jobs.risk_reassess import RiskReassessJob
from .jobs.market_pulse import MarketPulseJob
from .jobs.full_portfolio_review import FullPortfolioReviewJob
from .jobs.vision_guard import VisionGuardJob

# Registry: job_type string → job class
JOB_REGISTRY: dict[str, Type[BaseCronJob]] = {
    "competitor_scan": CompetitorScanJob,
    "strategy_eval": StrategyEvalJob,
    "risk_reassess": RiskReassessJob,
    "market_pulse": MarketPulseJob,
    "full_portfolio_review": FullPortfolioReviewJob,
    "vision_guard": VisionGuardJob,
}


def get_job_handler(job_type: str) -> BaseCronJob:
    """Instantiate a job handler by type string."""
    cls = JOB_REGISTRY.get(job_type)
    if not cls:
        raise ValueError(f"Unknown job type: {job_type}")
    return cls()


def get_all_job_types() -> list[str]:
    """Return all registered job type strings."""
    return list(JOB_REGISTRY.keys())

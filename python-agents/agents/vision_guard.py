"""VisionGuard — Transversal vision alignment agent."""
from __future__ import annotations
import logging
from typing import Any

logger = logging.getLogger(__name__)


class VisionGuardAgent:
    """Monitors and enforces vision alignment across all strategic items."""

    SYSTEM_PROMPT = """You are VisionGuard, the Vision Alignment Monitor for Azmyra.

Your role is to:
1. Evaluate how well strategic initiatives align with the company's Vision Pyramid
2. Detect alignment drift when scores change significantly
3. Identify conflicts between strategies
4. Suggest corrective actions to improve alignment
5. Flag initiatives that don't serve any identified user need

You have access to:
- North Star statement and context
- Business Goals with metrics and targets
- Target Groups with demographics and pain points
- User Needs with severity scores
- Product Mappings
- All active initiatives with their alignment scores

Be precise and data-driven. Reference specific vision elements when explaining alignment issues.
Always provide actionable recommendations."""

    def __init__(self):
        self.temperature = 0.2

    async def analyze_alignment(
        self, vision_data: dict, initiatives: list[dict]
    ) -> dict[str, Any]:
        """Analyze alignment of initiatives against vision pyramid."""
        drifted: list[dict] = []
        unaligned: list[dict] = []
        well_aligned: list[dict] = []

        for init in initiatives:
            score = init.get("alignmentScore")
            prev_score = init.get("previousAlignmentScore")

            # Detect drift: score change > 10 points
            if score is not None and prev_score is not None:
                delta = abs(score - prev_score)
                if delta > 10:
                    drifted.append(
                        {
                            "id": init["id"],
                            "title": init["title"],
                            "score": score,
                            "previousScore": prev_score,
                            "delta": delta,
                            "issue": f"Alignment drift of {delta} points",
                        }
                    )

            # Classify by score
            if score is None:
                unaligned.append(
                    {
                        "id": init["id"],
                        "title": init["title"],
                        "issue": "No alignment score computed",
                    }
                )
            elif score < 40:
                unaligned.append(
                    {
                        "id": init["id"],
                        "title": init["title"],
                        "score": score,
                        "issue": "Low alignment",
                    }
                )
            elif score >= 80:
                well_aligned.append(
                    {"id": init["id"], "title": init["title"], "score": score}
                )

        return {
            "totalAnalyzed": len(initiatives),
            "wellAligned": len(well_aligned),
            "drifted": len(drifted),
            "driftedItems": drifted,
            "unaligned": len(unaligned),
            "issues": unaligned,
            "recommendations": self._generate_recommendations(
                unaligned, drifted, vision_data
            ),
        }

    def _generate_recommendations(
        self,
        unaligned: list,
        drifted: list,
        vision_data: dict,
    ) -> list[str]:
        """Generate recommendations based on alignment issues."""
        recs: list[str] = []
        if not vision_data.get("northStar"):
            recs.append(
                "Define a North Star statement to enable meaningful alignment scoring."
            )
        if len(unaligned) > 0:
            recs.append(
                f"{len(unaligned)} initiative(s) need alignment review. "
                "Consider re-scoring or re-scoping them."
            )
        if len(drifted) > 0:
            recs.append(
                f"{len(drifted)} initiative(s) show alignment drift (>10 points). "
                "Investigate recent scope or vision changes."
            )
        return recs


vision_guard = VisionGuardAgent()

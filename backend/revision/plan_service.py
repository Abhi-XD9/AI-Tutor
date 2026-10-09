"""Build cumulative, assessment-driven revision plans for topics."""

from collections import defaultdict
from datetime import timedelta

from django.utils import timezone

from ai.assessment.llm import AssessmentLLM
from ai.models import Assessment

from .models import TopicRevisionPlan


class TopicRevisionPlanService:
    """Combine completed assessments into one actionable topic plan."""

    REVIEW_OFFSETS = {
        "high": (1, 3, 7),
        "medium": (3, 10),
        "low": (14, 30),
    }

    def __init__(self, topic):
        self.topic = topic

    def generate(self):
        assessments = list(
            Assessment.objects.filter(
                topic=self.topic,
                status=Assessment.Status.COMPLETED,
            ).order_by("completed_at", "id")
        )
        if not assessments:
            raise ValueError("Complete at least one assessment before creating a revision plan.")

        aggregates = defaultdict(lambda: {"earned": 0.0, "possible": 0.0, "attempts": 0})
        for assessment in assessments:
            for section in (assessment.revision_plan or {}).get("sections", []):
                focus = section.get("focus_area") or section.get("label") or "Topic foundations"
                aggregate = aggregates[focus]
                aggregate["earned"] += float(section.get("score", 0))
                aggregate["possible"] += float(section.get("max_score", 0))
                aggregate["attempts"] += 1

        focus_areas = []
        for focus, aggregate in aggregates.items():
            percentage = round(
                aggregate["earned"] / aggregate["possible"] * 100,
                2,
            ) if aggregate["possible"] else 0
            priority = "high" if percentage < 50 else "medium" if percentage < 80 else "low"
            focus_areas.append({
                "subtopic": focus,
                "score": percentage,
                "attempts": aggregate["attempts"],
                "priority": priority,
                "review_dates": self._review_dates(priority),
            })

        priority_order = {"high": 0, "medium": 1, "low": 2}
        focus_areas.sort(key=lambda item: (priority_order[item["priority"]], item["score"]))
        guidance = self._generate_guidance(focus_areas)
        for item in focus_areas:
            item["guidance"] = guidance.get(item["subtopic"], self._fallback_guidance(item["priority"]))

        weighted_score = self._overall_score(assessments)
        plan = {
            "topic_id": self.topic.topic_id,
            "topic_title": self.topic.title,
            "assessment_count": len(assessments),
            "overall_score": weighted_score,
            "focus_areas": focus_areas,
            "generated_at": timezone.now().isoformat(),
        }
        TopicRevisionPlan.objects.update_or_create(
            topic=self.topic,
            defaults={"plan": plan},
        )
        return plan

    @staticmethod
    def _overall_score(assessments):
        earned = 0.0
        possible = 0.0
        for assessment in assessments:
            plan = assessment.revision_plan or {}
            earned += float(plan.get("overall_score", 0))
            possible += float(plan.get("max_score", 0))
        return round(earned / possible * 100, 2) if possible else 0

    @classmethod
    def _review_dates(cls, priority):
        today = timezone.localdate()
        return [
            (today + timedelta(days=offset)).isoformat()
            for offset in cls.REVIEW_OFFSETS[priority]
        ]

    @staticmethod
    def _fallback_guidance(priority):
        return {
            "high": "Review the core ideas, make short notes, and practise targeted questions.",
            "medium": "Revise the key concepts and practise applying them in new questions.",
            "low": "Use spaced recall to retain this subtopic.",
        }[priority]

    def _generate_guidance(self, focus_areas):
        prompt = f"""
        Create concise revision guidance for the topic "{self.topic.title}".
        Return JSON only as an object whose keys are the exact subtopic names below
        and whose values are one practical sentence about what the learner should focus on.
        Do not invent subtopics.
        Subtopics:
        {[item["subtopic"] for item in focus_areas]}
        """
        try:
            result = AssessmentLLM().invoke_json(prompt)
            return result if isinstance(result, dict) else {}
        except (RuntimeError, ValueError):
            return {}
"""Convert evaluated answers into topic-strength ratings and revision steps."""

from collections import defaultdict
from datetime import timedelta
from decimal import Decimal
import re

from django.utils import timezone
 

class AssessmentReportService:
    def build(self, assessment):
        section_scores = defaultdict(lambda: {"earned": Decimal("0"), "possible": Decimal("0"), "metadata": {}})
        total_earned = Decimal("0")
        total_possible = Decimal("0")

        for answer in assessment.answers.select_related("question"):
            question = answer.question
            metadata = question.section_metadata or {}
            key = (
                metadata.get("document_id"),
                metadata.get("chapter_title", "Uncategorised"),
                metadata.get("heading_title", "General"),
                metadata.get("subheading_title", "General"),
            )
            section = section_scores[key]
            section["earned"] += answer.score
            section["possible"] += question.points
            section["metadata"] = metadata
            total_earned += answer.score
            total_possible += question.points

        sections = []
        for section in section_scores.values():
            percentage = self._percentage(section["earned"], section["possible"])
            rating = self._rating(percentage)
            label, focus_area = self._section_labels(section["metadata"])
            sections.append(
                {
                    **section["metadata"],
                    "label": label,
                    "focus_area": focus_area,
                    "score": float(section["earned"]),
                    "max_score": float(section["possible"]),
                    "percentage": percentage,
                    "rating": rating,
                }
            )

        priority = {"weak": 0, "medium": 1, "strong": 2}
        sections.sort(key=lambda section: (priority[section["rating"]], section["percentage"]))
        overall_percentage = self._percentage(total_earned, total_possible)
        return {
            "overall_score": float(total_earned),
            "max_score": float(total_possible),
            "overall_percentage": overall_percentage,
            "overall_rating": self._rating(overall_percentage),
            "sections": sections,
            "strong_sections": [section for section in sections if section["rating"] == "strong"],
            "medium_sections": [section for section in sections if section["rating"] == "medium"],
            "weak_sections": [section for section in sections if section["rating"] == "weak"],
            "revision_order": [
                {
                    "rating": section["rating"],
                    "section": section.get("label", "Uncategorised content"),
                    "focus_area": section.get("focus_area", "Review this section"),
                    "recommendation": self._recommendation(section["rating"]),
                    "schedule": self._schedule(section["rating"]),
                }
                for section in sections
            ],
        }

    @classmethod
    def _section_labels(cls, metadata):
        labels = []
        for key in ("chapter_title", "heading_title", "subheading_title"):
            value = cls._clean_label(metadata.get(key))
            if value and value not in {"General", "Uncategorised"} and value not in labels:
                labels.append(value)

        if not labels:
            return "Uncategorised content", "Review the available source material"
        return " > ".join(labels), labels[-1]

    @staticmethod
    def _clean_label(value):
        if not value:
            return ""

        value = re.sub(r"(?<!^)(?=\d+(?:\.\d+)+\s)", " ", str(value))
        words = re.sub(r"\s+", " ", value).strip().split(" ")
        for size in range(len(words) // 2, 1, -1):
            if words[-size:] == words[-2 * size:-size]:
                words = words[:-size]
                break
        return " ".join(words).strip(" -:>")

    @staticmethod
    def _percentage(earned, possible):
        return round(float((earned / possible) * 100), 2) if possible else 0

    @staticmethod
    def _rating(percentage):
        if percentage >= 80:
            return "strong"
        if percentage >= 50:
            return "medium"
        return "weak"

    @staticmethod
    def _recommendation(rating):
        return {
            "weak": "Review the source material, make short notes, then retake practice questions.",
            "medium": "Revise key concepts and practise application questions.",
            "strong": "Use spaced revision to retain this section.",
        }[rating]

    @staticmethod
    def _schedule(rating):
        """A simple spaced-revision cadence, ordered by current weakness."""

        offsets = {
            "weak": [1, 3, 7],
            "medium": [3, 10],
            "strong": [14, 30],
        }[rating]
        today = timezone.localdate()
        return [
            {
                "day_offset": offset,
                "target_date": (today + timedelta(days=offset)).isoformat(),
                "focus": "Relearn and practise" if rating == "weak" else "Recall and practise",
            }
            for offset in offsets
        ]

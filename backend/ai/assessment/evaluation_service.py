"""Evaluate submitted assessment answers against their saved source chunks."""

from decimal import Decimal, InvalidOperation
import json

from django.utils import timezone

from ai.models import AssessmentAnswer

from .llm import AssessmentLLM
from .report_service import AssessmentReportService
from .retriever import AssessmentRetrievalService
from ai.services.okf import OpenKnowledgeFormat


class AssessmentEvaluationService:
    def __init__(self, assessment, llm=None):
        self.assessment = assessment
        self.llm = llm
        self.retriever = AssessmentRetrievalService(assessment.topic_id)

    def evaluate(self):
        for answer in self.assessment.answers.select_related("question"):
            if answer.question.question_type in {"mcq", "multi_select"}:
                self._evaluate_mcq(answer)
            else:
                self._evaluate_short_answer(answer)

        report = AssessmentReportService().build(self.assessment)
        self.assessment.total_score = Decimal(str(report["overall_score"]))
        self.assessment.revision_plan = report
        self.assessment.status = self.assessment.Status.COMPLETED
        self.assessment.completed_at = timezone.now()
        self.assessment.save(
            update_fields=["total_score", "revision_plan", "status", "completed_at", "updated_at"]
        )
        return report

    @staticmethod
    def _normalise(value):
        return " ".join(value.strip().casefold().split())

    def _evaluate_mcq(self, answer):
        if answer.question.question_type == "multi_select":
            try:
                correct_answers = json.loads(answer.question.correct_answer)
                submitted_answers = json.loads(answer.user_answer)
            except (json.JSONDecodeError, TypeError):
                correct_answers, submitted_answers = [], []

            correct = {self._normalise(value) for value in correct_answers}
            submitted = {self._normalise(value) for value in submitted_answers}
            answer.is_correct = bool(correct) and submitted == correct and len(submitted_answers) == len(submitted)
            correct_text = ", ".join(correct_answers)
        else:
            correct = self._normalise(answer.question.correct_answer)
            submitted = self._normalise(answer.user_answer)
            answer.is_correct = submitted == correct
            correct_text = answer.question.correct_answer

        answer.score = answer.question.points if answer.is_correct else Decimal("0")
        answer.feedback = answer.question.explanation or (
            "Correct." if answer.is_correct else f"Correct answer: {correct_text}"
        )
        answer.evaluated_at = timezone.now()
        answer.save(update_fields=["is_correct", "score", "feedback", "evaluated_at"])

    def _resolve_source_chunks(self, source_chunk_ids):
        """Return a mixed list of DocumentChunk / _ChunkAdapter from stored IDs."""
        wanted_ids = {str(value) for value in source_chunk_ids}
        return [
            chunk
            for chunk in OpenKnowledgeFormat.chunks_for_topic(self.assessment.topic_id)
            if str(chunk.id) in wanted_ids
        ]

    def _evaluate_short_answer(self, answer):
        source_chunks = self._resolve_source_chunks(answer.question.source_chunk_ids)
        context = self.retriever.build_context(source_chunks)
        prompt = f"""
Grade the learner answer using only SOURCE CONTEXT. Return JSON only:
{{"score": number, "is_correct": boolean, "feedback": "brief constructive feedback"}}
Maximum score: {answer.question.points}
Question: {answer.question.question_text}
Expected answer: {answer.question.correct_answer}
Learner answer: {answer.user_answer}
SOURCE CONTEXT:
{context}
"""
        payload = self._get_llm().invoke_json(prompt)
        try:
            score = Decimal(str(payload.get("score", 0)))
        except (InvalidOperation, TypeError, ValueError):
            score = Decimal("0")
        answer.score = max(Decimal("0"), min(score, answer.question.points))
        answer.is_correct = bool(payload.get("is_correct", answer.score == answer.question.points))
        answer.feedback = str(payload.get("feedback", "Answer evaluated against the source material."))
        answer.evaluated_at = timezone.now()
        answer.save(update_fields=["is_correct", "score", "feedback", "evaluated_at"])

    def _get_llm(self):
        if self.llm is None:
            self.llm = AssessmentLLM()
        return self.llm

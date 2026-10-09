"""Generate balanced assessment questions from every chunk in a topic."""

from collections import defaultdict
from decimal import Decimal, InvalidOperation
from difflib import SequenceMatcher
from itertools import cycle
import json
import re

from django.db import transaction

from ai.models import AssessmentQuestion

from .llm import AssessmentLLM
from .retriever import AssessmentRetrievalService


class AssessmentGenerationService:
    """Plan coverage over all chunks, then generate questions in safe batches."""

    MAX_CONTEXT_CHARS = 12_000
    DEFAULT_QUESTION_TYPES = ("mcq", "short_answer")
    MAX_GENERATION_ATTEMPTS_PER_QUESTION = 3

    def __init__(self, topic_id, llm=None):
        self.retriever = AssessmentRetrievalService(topic_id)
        self.llm = llm or AssessmentLLM()

    def generate(self, assessment, question_count=10, question_type_counts=None):
        if question_count < 1:
            raise ValueError("question_count must be at least 1.")

        batches = self._section_batches()
        if not batches:
            raise ValueError("This topic has no processed document chunks.")

        planned_batches = self._plan_question_coverage(
            batches,
            question_count,
            question_type_counts=question_type_counts,
        )
        generated_questions = []
        batch_cycle = cycle(planned_batches)
        max_attempts = question_count * self.MAX_GENERATION_ATTEMPTS_PER_QUESTION
        for _ in range(max_attempts):
            if len(generated_questions) == question_count:
                break
            batch = next(batch_cycle)
            question = self._generate_for_batch(batch, generated_questions)
            if not self._is_duplicate_question(question["question_text"], generated_questions):
                generated_questions.append(question)

        if len(generated_questions) != question_count:
            raise ValueError(
                "Could not generate enough distinct questions for this assessment. "
                "Try a smaller question count or add more source material."
            )
        if not generated_questions:
            raise ValueError("No assessment questions were generated.")

        with transaction.atomic():
            assessment.questions.all().delete()
            for question_index, question in enumerate(generated_questions, start=1):
                AssessmentQuestion.objects.create(
                    assessment=assessment,
                    question_index=question_index,
                    question_text=question["question_text"],
                    question_type=question["question_type"],
                    options=question["options"],
                    correct_answer=question["correct_answer"],
                    explanation=question["explanation"],
                    difficulty=question["difficulty"],
                    points=question["points"],
                    source_chunk_ids=question["source_chunk_ids"],
                    section_metadata=question["section_metadata"],
                )
            assessment.total_questions = len(generated_questions)
            assessment.save(update_fields=["total_questions", "updated_at"])

        return assessment.questions.all()

    def _section_batches(self):
        """Visit every chunk while limiting each individual model prompt."""

        groups = defaultdict(list)
        for chunk in self.retriever.all_chunks():
            metadata = chunk.meta_data or {}
            key = (
                chunk.document_id,
                metadata.get("chapter_title") or "Uncategorised",
                metadata.get("heading_title") or "General",
                metadata.get("subheading_title") or "General",
            )
            groups[key].append(chunk)

        batches = []
        for (document_id, chapter, heading, subheading), chunks in groups.items():
            current_batch = []
            current_length = 0
            for chunk in chunks:
                chunk_length = len(chunk.chunk_text)
                if current_batch and current_length + chunk_length > self.MAX_CONTEXT_CHARS:
                    batches.append(self._make_batch(current_batch, document_id, chapter, heading, subheading))
                    current_batch, current_length = [], 0
                current_batch.append(chunk)
                current_length += chunk_length
            if current_batch:
                batches.append(self._make_batch(current_batch, document_id, chapter, heading, subheading))
        return batches

    def _make_batch(self, chunks, document_id, chapter, heading, subheading):
        return {
            "chunks": chunks,
            "source_chunk_ids": [chunk.id for chunk in chunks],
            "section_metadata": {
                "document_id": document_id,
                "document_title": chunks[0].document.title,
                "chapter_title": chapter,
                "heading_title": heading,
                "subheading_title": subheading,
            },
        }

    @classmethod
    def _plan_question_coverage(cls, batches, question_count, question_type_counts=None):
        # One question per section/batch first; remaining questions rotate
        # through the same coverage map instead of concentrating on one file.
        planned = list(batches[:question_count])
        if len(planned) < question_count:
            for batch in cycle(batches):
                planned.append(batch)
                if len(planned) == question_count:
                    break

        if question_type_counts is None:
            question_types = [
                cls.DEFAULT_QUESTION_TYPES[index % len(cls.DEFAULT_QUESTION_TYPES)]
                for index in range(question_count)
            ]
        else:
            question_types = []
            for question_type in ("mcq", "multi_select", "short_answer", "coding"):
                question_types.extend(
                    [question_type] * int(question_type_counts.get(question_type, 0))
                )

        return [
            {
                **batch,
                "question_type": question_types[index],
            }
            for index, batch in enumerate(planned)
        ]

    def _generate_for_batch(self, batch, previous_questions):
        context = self.retriever.build_context(batch["chunks"])
        requested_type = batch["question_type"]
        previous_question_text = "\n".join(
            f"- {question['question_text']}" for question in previous_questions
        ) or "- None"
        prompt = f"""
        You create one {requested_type} study assessment question grounded only in SOURCE CONTEXT.
        Return JSON only, with this exact object shape:
        {{
        "question_text": "...",
        "question_type": "mcq", "multi_select", "short_answer", or "coding",
        "options": ["A...", "B...", "C...", "D..."],
        "correct_answer": "..." or ["...", "..."],
        "explanation": "...",
        "difficulty": "easy" or "medium" or "hard",
        "points": 1
        }}

        The question_type must be exactly "{requested_type}".
        For an mcq, provide exactly four options and make correct_answer exactly one option.
        For a multi_select question, provide exactly four options and at least two correct_answer values, each exactly matching an option.
        For a short_answer or coding question, options must be []. Do not mention chunk IDs.
        Do not repeat or rephrase any of these earlier questions:
        {previous_question_text}

        SOURCE CONTEXT:
        {context}
        """
        payload = self.llm.invoke_json(prompt)
        question = self._validate_question(payload, expected_type=requested_type)
        question["source_chunk_ids"] = batch["source_chunk_ids"]
        question["section_metadata"] = batch["section_metadata"]
        return question

    @classmethod
    def _is_duplicate_question(cls, question_text, previous_questions):
        candidate = cls._normalise_question_text(question_text)
        for previous in previous_questions:
            existing = cls._normalise_question_text(previous["question_text"])
            candidate_words = set(candidate.split())
            existing_words = set(existing.split())
            overlap = len(candidate_words & existing_words) / max(1, min(len(candidate_words), len(existing_words)))
            if (
                candidate == existing
                or SequenceMatcher(None, candidate, existing).ratio() >= 0.78
                or overlap >= 0.85
            ):
                return True
        return False

    @staticmethod
    def _normalise_question_text(value):
        return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()

    @staticmethod
    def _validate_question(payload, expected_type=None):
        if not isinstance(payload, dict):
            raise ValueError("Assessment question payload must be a JSON object.")

        question_type = payload.get("question_type")
        if question_type not in {"mcq", "multi_select", "short_answer", "coding"}:
            raise ValueError("Assessment question type must be mcq, multi_select, short_answer, or coding.")
        if expected_type and question_type != expected_type:
            raise ValueError(f"Expected a {expected_type} question, received {question_type}.")

        options = payload.get("options", [])
        if question_type in {"mcq", "multi_select"} and (not isinstance(options, list) or len(options) != 4):
            raise ValueError("A multiple-choice question must have exactly four options.")
        if question_type in {"short_answer", "coding"}:
            options = []

        difficulty = payload.get("difficulty", "medium")
        if difficulty not in {"easy", "medium", "hard"}:
            difficulty = "medium"

        question_text = str(payload.get("question_text", "")).strip()
        answer_value = payload.get("correct_answer", "")
        if question_type == "multi_select":
            if not isinstance(answer_value, list):
                raise ValueError("A multi-select question needs a list of correct options.")
            correct_answers = [str(value).strip() for value in answer_value if str(value).strip()]
            normalised_options = {" ".join(str(option).strip().casefold().split()) for option in options}
            normalised_answers = {" ".join(value.casefold().split()) for value in correct_answers}
            if len(normalised_answers) < 2 or not normalised_answers.issubset(normalised_options):
                raise ValueError("A multi-select question needs at least two correct options from its choices.")
            correct_answer = json.dumps(correct_answers)
        else:
            correct_answer = str(answer_value).strip()
        if not question_text or not correct_answer:
            raise ValueError("A generated question needs text and a correct answer.")

        try:
            points = Decimal(str(payload.get("points", 1)))
        except (InvalidOperation, TypeError, ValueError):
            points = Decimal("1")

        return {
            "question_text": question_text,
            "question_type": question_type,
            "options": options,
            "correct_answer": correct_answer,
            "explanation": str(payload.get("explanation", "")).strip(),
            "difficulty": difficulty,
            "points": max(Decimal("0.25"), min(points, Decimal("100"))),
        }

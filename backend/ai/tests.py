from types import SimpleNamespace
from decimal import Decimal
from unittest.mock import Mock, patch
import json

from django.test import SimpleTestCase

from .assessment.evaluation_service import AssessmentEvaluationService
from .assessment.generation_service import AssessmentGenerationService
from .services.okf import KnowledgeChunk, OpenKnowledgeFormat
from .views import _filter_topic_proposals


class OpenKnowledgeFormatTests(SimpleTestCase):
	def test_chunk_is_serialized_with_source_metadata(self):
		document = SimpleNamespace(id=7, title="Algebra", file_type="pdf")
		source_chunk = SimpleNamespace(
			id=11,
			chunk_index=2,
			chunk_text="A quadratic has degree two.",
			meta_data={
				"page_start": 3,
				"page_end": 4,
				"chapter_title": "Polynomials",
				"heading_title": "Quadratics",
			},
			document=document,
		)
		chunk = KnowledgeChunk(source_chunk, "topic")
		topic = SimpleNamespace(topic_id=5, title="Algebra Basics")

		with patch.object(OpenKnowledgeFormat, "chunks_for_topic", return_value=[chunk]):
			result = OpenKnowledgeFormat.for_topic(topic)

		self.assertEqual(result["okf_version"], "1.0")
		self.assertEqual(result["topic"]["id"], "5")
		self.assertEqual(result["documents"][0]["chunks"][0]["source"]["page_start"], 3)

	def test_empty_topic_has_valid_okf_shape(self):
		topic = SimpleNamespace(topic_id=5, title="Algebra Basics")

		with patch.object(OpenKnowledgeFormat, "chunks_for_topic", return_value=[]):
			result = OpenKnowledgeFormat.for_topic(topic)

		self.assertEqual(result["documents"], [])


class AssessmentQuestionTests(SimpleTestCase):
	def test_reworded_duplicate_question_is_detected(self):
		previous = [{"question_text": "What is the primary purpose of React in web development?"}]

		self.assertTrue(
			AssessmentGenerationService._is_duplicate_question(
				"What is the primary purpose of React?", previous
			)
		)

	def test_multi_select_question_requires_multiple_valid_options(self):
		question = AssessmentGenerationService._validate_question(
			{
				"question_type": "multi_select",
				"question_text": "Which are valid React hooks?",
				"options": ["useState", "useEffect", "useClass", "useLoop"],
				"correct_answer": ["useState", "useEffect"],
			},
			expected_type="multi_select",
		)

		self.assertEqual(json.loads(question["correct_answer"]), ["useState", "useEffect"])

	def test_multi_select_grading_requires_exact_option_set(self):
		service = object.__new__(AssessmentEvaluationService)
		question = SimpleNamespace(
			question_type="multi_select",
			correct_answer=json.dumps(["A", "B"]),
			points=Decimal("1"),
			explanation="Both options are correct.",
		)
		answer = SimpleNamespace(
			question=question,
			user_answer=json.dumps(["B", "A"]),
			save=Mock(),
		)

		service._evaluate_mcq(answer)

		self.assertTrue(answer.is_correct)
		self.assertEqual(answer.score, Decimal("1"))
		answer.user_answer = json.dumps(["A"])
		service._evaluate_mcq(answer)
		self.assertFalse(answer.is_correct)
		self.assertEqual(answer.score, Decimal("0"))


class TopicProposalFilterTests(SimpleTestCase):
	def test_filters_front_matter_topics_but_keeps_learning_topics(self):
		proposals = [
			{"title": "About the Tutorial", "description": "Overview."},
			{"title": "Audience Prerequisites Copyright and Disclaimer", "description": "Admin text."},
			{"title": "Reflection of Light", "description": "How mirrors reflect light."},
		]

		filtered = _filter_topic_proposals(proposals)

		self.assertEqual([proposal["title"] for proposal in filtered], ["Reflection of Light"])

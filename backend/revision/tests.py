from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from revision.models import RevisionSchedule
from revision.services import RevisionService
from subjects.models import Subject
from topics.models import Topic


class RevisionScheduleServiceTests(TestCase):
	def setUp(self):
		user = get_user_model().objects.create_user(
			first_name="Learner",
			last_name="One",
			email="learner@example.com",
			phone="1234567890",
			password="test-password",
		)
		subject = Subject.objects.create(created_by=user, name="Physics")
		self.studied_at = timezone.now()
		self.topic = Topic.objects.create(
			subject=subject,
			title="Light",
			studied_at=self.studied_at,
		)

	def test_create_schedule_is_idempotent(self):
		RevisionService.create_schedule(self.topic)
		RevisionService.create_schedule(self.topic)

		revisions = list(RevisionSchedule.objects.filter(topic=self.topic).order_by("revision_number"))
		self.assertEqual(len(revisions), len(RevisionService.REVISION_INTERVALS))
		self.assertEqual(
			[revision.scheduled_date for revision in revisions],
			[self.studied_at.date() + timedelta(days=offset) for offset in RevisionService.REVISION_INTERVALS],
		)

	def test_create_schedule_uses_unique_plan_review_dates(self):
		plan = {
			"focus_areas": [
				{"review_dates": ["2026-10-03", "2026-10-01"]},
				{"review_dates": ["2026-10-03"]},
			]
		}

		RevisionService.create_schedule(self.topic, plan)
		RevisionService.create_schedule(self.topic, plan)

		revisions = list(RevisionSchedule.objects.filter(topic=self.topic).order_by("revision_number"))
		self.assertEqual(
			[revision.scheduled_date.isoformat() for revision in revisions],
			["2026-10-01", "2026-10-03"],
		)

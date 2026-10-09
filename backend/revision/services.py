from datetime import date, timedelta

from django.db import transaction
from django.utils import timezone

from .models import RevisionSchedule


class RevisionService:

    REVISION_INTERVALS = [1, 7, 20, 35]

    @classmethod
    @transaction.atomic
    def create_schedule(cls, topic, plan=None):
        plan_dates = {
            date.fromisoformat(str(review_date))
            for area in (plan or {}).get("focus_areas", [])
            for review_date in area.get("review_dates", [])
        }
        if plan_dates:
            scheduled_dates = sorted(plan_dates)
        else:
            start_date = topic.studied_at.date() if topic.studied_at else timezone.localdate()
            scheduled_dates = [
                start_date + timedelta(days=offset)
                for offset in cls.REVISION_INTERVALS
            ]

        for revision_number, scheduled_date in enumerate(scheduled_dates, start=1):
            revision, created = RevisionSchedule.objects.get_or_create(
                topic=topic,
                revision_number=revision_number,
                defaults={"scheduled_date": scheduled_date},
            )
            if not created and revision.status == "pending" and revision.scheduled_date != scheduled_date:
                revision.scheduled_date = scheduled_date
                revision.save(update_fields=["scheduled_date"])

        RevisionSchedule.objects.filter(
            topic=topic,
            status="pending",
            revision_number__gt=len(scheduled_dates),
        ).delete()
from datetime import timedelta

from django.db import transaction

from .models import RevisionSchedule


class RevisionService:

    REVISION_INTERVALS = [1, 7, 20, 35]

    @classmethod
    @transaction.atomic
    def create_schedule(cls, topic):

        revisions = []

        for revision_number, days in enumerate(cls.REVISION_INTERVALS, start=1):

            revisions.append(
                RevisionSchedule(
                    topic=topic,
                    revision_number=revision_number,
                    scheduled_date=topic.studied_at.date() + timedelta(days=days),
                )
            )

        RevisionSchedule.objects.bulk_create(revisions)
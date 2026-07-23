from rest_framework import serializers
from .models import RevisionSchedule


class RevisionSerializer(serializers.ModelSerializer):

    topic_name = serializers.CharField(
        source="topic.title",
        read_only=True
    )

    subject_name = serializers.CharField(
        source="topic.subject.name",
        read_only=True
    )

    class Meta:
        model = RevisionSchedule
        fields = [
            "revision_id",
            "topic",
            "topic_name",
            "subject_name",
            "revision_number",
            "scheduled_date",
            "status",
            "completed_at",
        ]
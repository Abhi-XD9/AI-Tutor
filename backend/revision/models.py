from django.db import models
from topics.models import Topic


class RevisionSchedule(models.Model):

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("missed", "Missed"),
    ]

    revision_id = models.AutoField(primary_key=True)

    topic = models.ForeignKey(
        Topic,
        on_delete=models.CASCADE,
        related_name="revisions"
    )

    revision_number = models.PositiveSmallIntegerField()

    scheduled_date = models.DateField()

    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default="pending"
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["scheduled_date"]

        constraints = [
            models.UniqueConstraint(
                fields=["topic", "revision_number"],
                name="unique_revision_number_per_topic"
            )
        ]

    def __str__(self):
        return f"{self.topic.title} - Revision {self.revision_number}"
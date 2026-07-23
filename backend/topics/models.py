from django.db import models
from subjects.models import Subject
# Create your models here.

class Topic(models.Model):

    DIFFICULTY_CHOICES = [
       ("easy", "Easy"),
        ("medium", "Medium"),
        ("hard", "Hard"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("completed", "Completed"),
    ]

    topic_id = models.AutoField(primary_key = True)

    subject = models.ForeignKey(Subject, on_delete = models.CASCADE, related_name = 'topics')
    title = models.CharField(max_length = 100)
    description = models.TextField(blank = True)
    difficulty = models.CharField(
        max_length = 10,
        choices = DIFFICULTY_CHOICES,
        default = "easy"
    )

    estimated_time = models.PositiveIntegerField(default = 30, help_text = "Estimated time in minutes")
    status = models.CharField(
        max_length = 10,
        choices = STATUS_CHOICES,
        default = "pending"
    )
    created_at = models.DateTimeField(auto_now_add = True)
    updated_at = models.DateTimeField(auto_now = True)
    studied_at = models.DateTimeField(null=True,blank=True)

    class Meta:
        ordering = ["title"]
        constraints = [
            models.UniqueConstraint(
                fields = ['subject', 'title'],
                name = 'unique_topic_per_subject'
            )
        ]
    
    def __str__(self):
        return self.title

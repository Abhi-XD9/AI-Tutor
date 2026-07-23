from django.db import models
from topics.models import Topic
import os

# Create your models here.

class TopicDocument(models.Model):


    class ProcessingStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        PROCESSED = 'processed', 'Processed'
        FAILED = 'failed', 'Failed'
    
    topic = models.ForeignKey(Topic, on_delete = models.CASCADE, related_name = "documents_list")

    title = models.CharField(max_length=255)

    file = models.FileField(upload_to="topic_documents/")
    file_type = models.CharField(max_length=20)
    uploaded_at = models.DateField(auto_now_add=True)

    processing_status = models.CharField(max_length=20, choices=ProcessingStatus.choices,default=ProcessingStatus.PENDING)


    def save(self, *args, **kwargs):
        if self.file:
            extension = os.path.splitext(self.file.name)[1]
            self.file_type = extension.lower().replace(".", "")

        super().save(*args, **kwargs)


    def __str__(self):
        return self.title
from django.conf import settings
from django.db import models
from topics.models import Topic
import os
# pyrefly: ignore [missing-import]
from pgvector.django import VectorField


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


class DocumentChunk(models.Model):

    document = models.ForeignKey(TopicDocument,on_delete=models.CASCADE,related_name="chunks")
    chunk_index = models.PositiveIntegerField()
    chunk_text = models.TextField()
    faiss_index = models.PositiveIntegerField(null=True,blank=True)
    meta_data = models.JSONField(default=dict,blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["chunk_index"]

        indexes = [
            models.Index(
                fields=["document", "chunk_index"]
            ),
        ]

    def __str__(self):
        return self.chunk_text[:50]


class Conversation(models.Model):
    id = models.AutoField(primary_key = True)
    topic = models.ForeignKey(
        Topic,
        on_delete=models.CASCADE,
        related_name="conversations"
    )
    title = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    
    def __str__(self):
        return self.title or f"Conversation {self.id}"
    

class Message(models.Model):

    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages"
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices
    )

    content = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict , blank = True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.role} - {self.conversation.id}"
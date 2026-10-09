from django.conf import settings
from django.db import models
from subjects.models import Subject
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


class Assessment(models.Model):
    """One assessment attempt generated from the documents in a topic."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"

    topic = models.ForeignKey(
        Topic,
        on_delete=models.CASCADE,
        related_name="assessments",
    )
    title = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    total_questions = models.PositiveIntegerField(default=0)
    total_score = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        null=True,
        blank=True,
    )
    revision_plan = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title or f"Assessment {self.id} for {self.topic.title}"


class AssessmentQuestion(models.Model):
    """A generated question with the chunk references used to create it."""

    class QuestionType(models.TextChoices):
        MCQ = "mcq", "Multiple choice"
        MULTI_SELECT = "multi_select", "Multiple select"
        SHORT_ANSWER = "short_answer", "Short answer"
        CODING = "coding", "Coding"

    class Difficulty(models.TextChoices):
        EASY = "easy", "Easy"
        MEDIUM = "medium", "Medium"
        HARD = "hard", "Hard"

    assessment = models.ForeignKey(
        Assessment,
        on_delete=models.CASCADE,
        related_name="questions",
    )
    question_index = models.PositiveIntegerField()
    question_text = models.TextField()
    question_type = models.CharField(
        max_length=20,
        choices=QuestionType.choices,
    )
    options = models.JSONField(default=list, blank=True)
    correct_answer = models.TextField()
    explanation = models.TextField(blank=True)
    difficulty = models.CharField(
        max_length=10,
        choices=Difficulty.choices,
        default=Difficulty.MEDIUM,
    )
    points = models.DecimalField(max_digits=5, decimal_places=2, default=1)
    source_chunk_ids = models.JSONField(default=list, blank=True)
    section_metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["question_index"]
        constraints = [
            models.UniqueConstraint(
                fields=["assessment", "question_index"],
                name="unique_assessment_question_index",
            ),
        ]

    def __str__(self):
        return f"Assessment {self.assessment_id}, question {self.question_index}"


class AssessmentAnswer(models.Model):
    """The learner's answer and the evaluation produced for one question."""

    assessment = models.ForeignKey(
        Assessment,
        on_delete=models.CASCADE,
        related_name="answers",
    )
    question = models.ForeignKey(
        AssessmentQuestion,
        on_delete=models.CASCADE,
        related_name="answers",
    )
    user_answer = models.TextField(blank=True)
    is_correct = models.BooleanField(null=True, blank=True)
    score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    feedback = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    evaluated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["assessment", "question"],
                name="unique_answer_per_assessment_question",
            ),
        ]

    def __str__(self):
        return f"Assessment {self.assessment_id}, answer {self.question_id}"


class SubjectDocument(models.Model):
    """Canonical source material uploaded once at subject level."""

    class ProcessingStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        AWAITING_REVIEW = "awaiting_review", "Awaiting review"
        PROCESSED = "processed", "Processed"
        FAILED = "failed", "Failed"

    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="source_documents")
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to="subject_documents/")
    file_type = models.CharField(max_length=20)
    processing_status = models.CharField(max_length=20, choices=ProcessingStatus.choices, default=ProcessingStatus.PENDING)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)

    def save(self, *args, **kwargs):
        if self.file:
            self.file_type = os.path.splitext(self.file.name)[1].lower().lstrip(".")
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class DocumentElement(models.Model):
    """A page-level text, table, image, graph, or figure retained from a source PDF."""

    class ElementType(models.TextChoices):
        TEXT = "text", "Text"
        TABLE = "table", "Table"
        IMAGE = "image", "Image"
        FIGURE = "figure", "Figure"
        CHART = "chart", "Chart"

    document = models.ForeignKey(SubjectDocument, on_delete=models.CASCADE, related_name="elements")
    element_index = models.PositiveIntegerField()
    page_number = models.PositiveIntegerField(null=True, blank=True)
    element_type = models.CharField(max_length=20, choices=ElementType.choices)
    content = models.TextField(blank=True)
    asset = models.FileField(upload_to="document_elements/", blank=True)
    bounding_box = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["page_number", "element_index"]
        constraints = [models.UniqueConstraint(fields=["document", "element_index"], name="unique_element_per_subject_document")]


class ContentChunk(models.Model):
    """Reusable chunk of canonical subject content, with its source elements."""

    document = models.ForeignKey(SubjectDocument, on_delete=models.CASCADE, related_name="chunks")
    chunk_index = models.PositiveIntegerField()
    chunk_text = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    elements = models.ManyToManyField(DocumentElement, related_name="chunks", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["chunk_index"]
        constraints = [models.UniqueConstraint(fields=["document", "chunk_index"], name="unique_content_chunk_per_document")]


class TopicProposal(models.Model):
    """LLM-produced outline that a learner must validate before topics exist."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    document = models.ForeignKey(SubjectDocument, on_delete=models.CASCADE, related_name="topic_proposals")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    raw_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)


class TopicProposalItem(models.Model):
    proposal = models.ForeignKey(TopicProposal, on_delete=models.CASCADE, related_name="items")
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    subtopics = models.JSONField(default=list, blank=True)
    source_chunk_ids = models.JSONField(default=list, blank=True)
    confidence = models.FloatField(default=0)
    approved_topic = models.OneToOneField(Topic, on_delete=models.SET_NULL, null=True, blank=True, related_name="proposal_item")
    is_approved = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["display_order"]


class TopicChunk(models.Model):
    """Approved mapping of reusable source content into a topic-specific index."""

    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name="content_chunks")
    chunk = models.ForeignKey(ContentChunk, on_delete=models.CASCADE, related_name="topic_mappings")
    faiss_index = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["topic", "chunk"], name="unique_chunk_per_topic")]

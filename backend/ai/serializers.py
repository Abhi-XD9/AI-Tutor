from rest_framework import serializers
from .models import (
    Assessment,
    AssessmentAnswer,
    AssessmentQuestion,
    Conversation,
    Message,
    SubjectDocument,
    TopicDocument,
    TopicProposal,
    TopicProposalItem,
)


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TopicDocument
        fields = ["id", "title", "file", "file_type", "processing_status", "uploaded_at"]
        read_only_fields = ["id", "processing_status", "uploaded_at", "file_type"]


class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = ["id", "title", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at", "topic"]


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "role", "conversation", "content", "created_at"]
        read_only_fields = ["id", "created_at", "conversation", "role"]


class AssessmentQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentQuestion
        fields = ["id", "question_index", "question_text", "question_type", "options", "difficulty", "points"]


class AssessmentAnswerSerializer(serializers.ModelSerializer):
    question = AssessmentQuestionSerializer(read_only=True)

    class Meta:
        model = AssessmentAnswer
        fields = ["id", "question", "user_answer", "is_correct", "score", "feedback", "submitted_at", "evaluated_at"]
        read_only_fields = ["id", "question", "user_answer", "is_correct", "score", "feedback", "submitted_at", "evaluated_at"]


class AssessmentReviewQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentQuestion
        fields = [
            "id", "question_index", "question_text", "question_type", "options",
            "difficulty", "points", "correct_answer", "explanation",
        ]


class AssessmentAnswerReviewSerializer(serializers.ModelSerializer):
    question = AssessmentReviewQuestionSerializer(read_only=True)

    class Meta:
        model = AssessmentAnswer
        fields = ["id", "question", "user_answer", "is_correct", "score", "feedback"]
        read_only_fields = fields


class AssessmentSerializer(serializers.ModelSerializer):
    questions = AssessmentQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Assessment
        fields = [
            "id", "topic", "title", "status", "total_questions", "total_score",
            "revision_plan", "created_at", "started_at", "completed_at", "updated_at", "questions",
        ]
        read_only_fields = [
            "id", "topic", "status", "total_questions", "total_score",
            "revision_plan", "created_at", "started_at", "completed_at", "updated_at", "questions",
        ]


class AssessmentHistorySerializer(serializers.ModelSerializer):
    topic_title = serializers.CharField(source="topic.title", read_only=True)
    subject_name = serializers.CharField(source="topic.subject.name", read_only=True)
    overall_percentage = serializers.SerializerMethodField()
    overall_rating = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = [
            "id", "topic", "topic_title", "subject_name", "title",
            "total_questions", "total_score", "overall_percentage", "overall_rating",
            "revision_plan", "completed_at",
        ]

    def get_overall_percentage(self, assessment):
        return (assessment.revision_plan or {}).get("overall_percentage", 0)

    def get_overall_rating(self, assessment):
        return (assessment.revision_plan or {}).get("overall_rating", "pending")


class SubjectDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubjectDocument
        fields = ["id", "title", "file", "file_type", "processing_status", "uploaded_at"]
        read_only_fields = ["id", "file_type", "processing_status", "uploaded_at"]


class TopicProposalItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = TopicProposalItem
        fields = ["id", "title", "description", "confidence", "display_order", "is_approved"]


class TopicProposalSerializer(serializers.ModelSerializer):
    items = TopicProposalItemSerializer(many=True, read_only=True)

    class Meta:
        model = TopicProposal
        fields = ["id", "status", "created_at", "items"]

from rest_framework import serializers
from .models import TopicDocument , Conversation,Message

class DocumentSerializer(serializers.ModelSerializer):

    class Meta:
        model = TopicDocument
        fields = [
            "id",
            "title",
            "file",
            "file_type",
            "processing_status",
            "uploaded_at",
        ]
        read_only_fields = ["id", "processing_status", "uploaded_at","file_type"]


class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = [
            "id",
            "title",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at","topic"]

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = [
            "id",
            "role",
            "conversation",
            "content",
            "created_at",
        ]
        read_only_fields = ["id", "created_at","conversation","role"]
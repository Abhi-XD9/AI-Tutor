from rest_framework import serializers
from .models import TopicDocument

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
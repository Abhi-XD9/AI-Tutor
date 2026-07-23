from rest_framework import serializers
from .models import Topic

class TopicSerializer(serializers.ModelSerializer):

    class Meta:
        model = Topic
        fields = "__all__"
        read_only_fields = [
            "topic_id",
            "created_at",
            "updated_at",
            "status",
        ]
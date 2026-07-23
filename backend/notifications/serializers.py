from rest_framework import serializers
from .models import NotificationSettings


class NotificationSettingsSerializer(serializers.ModelSerializer):

    class Meta:
        model = NotificationSettings
        fields = (
            "id",
            "email_reminder",
            "reminder_time",
        )
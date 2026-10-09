from rest_framework import serializers
from .models import Subject


class SubjectSerializer(serializers.ModelSerializer):
    source_document_count = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = '__all__'
        read_only_fields = ['created_by']

    def get_source_document_count(self, subject):
        return subject.source_documents.count()

    def validate_name(self, value):
            value = value.strip().lower()
            user = self.context['request'].user
            qs = Subject.objects.filter(name=value, created_by=user)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("Subject with this name already exists for this user.")
            return value

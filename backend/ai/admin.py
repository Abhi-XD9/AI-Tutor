from django.contrib import admin
from .models import (
    Assessment,
    AssessmentAnswer,
    AssessmentQuestion,
    Conversation,
    DocumentChunk,
    Message,
    TopicDocument,
)

# Register your models here.
admin.site.register(TopicDocument)
admin.site.register(DocumentChunk)
admin.site.register(Message)
admin.site.register(Conversation)
admin.site.register(Assessment)
admin.site.register(AssessmentQuestion)
admin.site.register(AssessmentAnswer)



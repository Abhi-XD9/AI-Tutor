from django.contrib import admin
from .models import TopicDocument ,DocumentChunk,Message,Conversation

# Register your models here.
admin.site.register(TopicDocument)
admin.site.register(DocumentChunk)
admin.site.register(Message)
admin.site.register(Conversation)



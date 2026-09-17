from django.urls import path
from .views import DocumentsListView ,DocumentDetailView ,ConversationAPIView , ChatView,ResumeChatView

urlpatterns = [
    path('topics/<int:topic_id>/documents/', DocumentsListView.as_view(), name='documents-list'),
    path('topics/<int:topic_id>/documents/<int:doc_id>/', DocumentDetailView.as_view(), name='documents-detail'),

    path('topics/<int:topic_id>/conversations/',ConversationAPIView.as_view(),name='conversations-list'),
    path('topics/<int:topic_id>/conversations/<int:conversation_id>',ConversationAPIView.as_view(),name='conversation-details'),
    path('topics/<int:topic_id>/conversations/<int:conversation_id>/chat',ChatView.as_view(),name='chat-details'),
    path('topics/<int:topic_id>/conversations/<int:conversation_id>/chat/resume',ResumeChatView.as_view(),name='resume_chat'),
]

from django.urls import path
from .views import (
    AssessmentDetailView,
    AssessmentAnswerSaveView,
    AssessmentHistoryView,
    AssessmentInProgressView,
    AssessmentListCreateView,
    AssessmentReportView,
    AssessmentStartView,
    AssessmentSubmitView,
    ChatView,
    ConversationAPIView,
    DocumentDetailView,
    DocumentsListView,
    ResumeChatView,
    SubjectDocumentView,
    TopicProposalView,
    AssessmentResumeView,
    DocumentExtractionVerifyView,
)

urlpatterns = [
    # Subject-level document upload + topic proposals
    path('subjects/<int:subject_id>/documents/', SubjectDocumentView.as_view(), name='subject-documents'),
    path('subjects/<int:subject_id>/documents/<int:document_id>/', SubjectDocumentView.as_view(), name='subject-document-detail'),
    path('subjects/<int:subject_id>/proposals/', TopicProposalView.as_view(), name='subject-proposals'),

    # Topic-level documents
    path('topics/<int:topic_id>/documents/', DocumentsListView.as_view(), name='documents-list'),
    path('topics/<int:topic_id>/documents/<int:doc_id>/', DocumentDetailView.as_view(), name='documents-detail'),

    path('topics/<int:topic_id>/conversations/', ConversationAPIView.as_view(), name='conversations-list'),
    path('topics/<int:topic_id>/conversations/<int:conversation_id>', ConversationAPIView.as_view(), name='conversation-details'),
    path('topics/<int:topic_id>/conversations/<int:conversation_id>/chat', ChatView.as_view(), name='chat-details'),
    path('topics/<int:topic_id>/conversations/<int:conversation_id>/chat/resume', ResumeChatView.as_view(), name='resume_chat'),
    path('topics/<int:topic_id>/assessments/', AssessmentListCreateView.as_view(), name='assessment-list-create'),
    path('assessments/history/', AssessmentHistoryView.as_view(), name='assessment-history'),
    path('assessments/in-progress/', AssessmentInProgressView.as_view(), name='assessment-in-progress'),
    path('assessments/<int:assessment_id>/', AssessmentDetailView.as_view(), name='assessment-detail'),
    path('assessments/<int:assessment_id>/start/', AssessmentStartView.as_view(), name='assessment-start'),
    path('assessments/<int:assessment_id>/answers/', AssessmentAnswerSaveView.as_view(), name='assessment-answer-save'),
    path('assessments/<int:assessment_id>/submit/', AssessmentSubmitView.as_view(), name='assessment-submit'),
    path('assessments/<int:assessment_id>/report/', AssessmentReportView.as_view(), name='assessment-report'),
    path('assessments/<int:assessment_id>/resume/', AssessmentResumeView.as_view(), name='assessment-resume'),
    path('topics/<int:topic_id>/documents/<int:doc_id>/verify/', DocumentExtractionVerifyView.as_view(), name='document-verify'),

]

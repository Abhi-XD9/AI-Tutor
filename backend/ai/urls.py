from django.urls import path
from .views import DocumentsListView ,DocumentDetailView

urlpatterns = [
    path('topics/<int:topic_id>/documents/', DocumentsListView.as_view(), name='documents-list'),
    path('topics/<int:topic_id>/documents/<int:doc_id>/', DocumentDetailView.as_view(), name='documents-detail'),
]

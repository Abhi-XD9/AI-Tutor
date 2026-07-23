from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework import status , viewsets ,serializers
from rest_framework.permissions import IsAuthenticated
from .serializers import TopicSerializer
from .models import Topic
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from revision.services import RevisionService


# Create your views here.

class TopicListView(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["post"])
    def mark_completed(self, request, pk=None):

        topic = self.get_object()
        if topic.status == "completed":
            return Response(
                {"message": "Topic is already completed."},
                status=400
            )
        topic.status = "completed"
        topic.studied_at = timezone.now()
        topic.save()
        RevisionService.create_schedule(topic)
        return Response(
                        {"message": "Topic marked as completed successfully."},
                        status=status.HTTP_200_OK)

    serializer_class = TopicSerializer
    def get_queryset(self):
        return Topic.objects.filter( subject__created_by=self.request.user)

    
    def perform_create(self,serializer):

        subject = serializer.validated_data['subject']

        if subject.created_by != self.request.user :
            raise serializers.ValidationError("You do not have permission to create a topic for this subject.")
        
        serializer.save()
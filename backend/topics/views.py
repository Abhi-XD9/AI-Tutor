from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework import status , viewsets ,serializers
from rest_framework.permissions import IsAuthenticated
from .serializers import TopicSerializer
from .models import Topic
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from revision.plan_service import TopicRevisionPlanService
from revision.models import TopicRevisionPlan
from ai.models import SubjectDocument
from revision.services import RevisionService


# Create your views here.

class TopicListView(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        topic = self.get_object()
        fields_to_update = []
        if topic.status != "completed":
            topic.status = "completed"
            fields_to_update.append("status")
        if topic.studied_at is None:
            topic.studied_at = timezone.now()
            fields_to_update.append("studied_at")
        if fields_to_update:
            topic.save(update_fields=[*fields_to_update, "updated_at"])
        return Response({"data": self.get_serializer(topic).data}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get", "post"], url_path="revision-plan")
    def revision_plan(self, request, pk=None):
        topic = self.get_object()
        if request.method == "GET":
            try:
                plan = topic.revision_plan.plan
                RevisionService.create_schedule(topic, plan)
                return Response({"data": plan}, status=status.HTTP_200_OK)
            except TopicRevisionPlan.DoesNotExist:
                return Response({"message": "No revision plan exists for this topic."}, status=status.HTTP_404_NOT_FOUND)
        try:
            plan = TopicRevisionPlanService(topic).generate()
        except ValueError as error:
            return Response({"message": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        RevisionService.create_schedule(topic, plan)
        return Response({"data": plan}, status=status.HTTP_200_OK)

    serializer_class = TopicSerializer
    def get_queryset(self):
        return Topic.objects.filter( subject__created_by=self.request.user)

    
    def perform_create(self,serializer):

        subject = serializer.validated_data['subject']

        if subject.created_by != self.request.user :
            raise serializers.ValidationError("You do not have permission to create a topic for this subject.")

        # A topic must be grounded in at least one subject-level source
        # document. LLM-approved topics are created by the proposal approval
        # service; this guard applies to learner-created extra topics.
        if not SubjectDocument.objects.filter(subject=subject).exists():
            raise serializers.ValidationError(
                "Upload a document to this subject before adding a topic. "
                "You can add missing topics after reviewing the generated outline."
            )
        
        serializer.save()

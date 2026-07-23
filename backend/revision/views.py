from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import RevisionSchedule
from .serializers import RevisionSerializer


class RevisionViewSet(viewsets.ReadOnlyModelViewSet):

    permission_classes = [IsAuthenticated]
    serializer_class = RevisionSerializer

    def get_queryset(self):
        return (
            RevisionSchedule.objects.filter(
                topic__subject__created_by=self.request.user
            )
            .select_related(
                "topic",
                "topic__subject"
            )
            .order_by("scheduled_date")
        )

    
    @action(detail=False, methods=["get"])
    def today(self, request):

        today = timezone.localdate()

        revisions = self.get_queryset().filter(
            scheduled_date=today,
            status="pending"
        )

        serializer = self.get_serializer(revisions, many=True)

        return Response(serializer.data)

  
    @action(detail=False, methods=["get"])
    def upcoming(self, request):

        today = timezone.localdate()

        revisions = self.get_queryset().filter(
            scheduled_date__gt=today,
            status="pending"
        )

        serializer = self.get_serializer(revisions, many=True)

        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def missed(self, request):

        today = timezone.localdate()

        revisions = self.get_queryset().filter(
            scheduled_date__lt=today,
            status="pending"
        )

        serializer = self.get_serializer(revisions, many=True)

        return Response(serializer.data)

   
    @action(detail=False, methods=["get"])
    def completed(self, request):

        revisions = self.get_queryset().filter(
            status="completed"
        )

        serializer = self.get_serializer(revisions, many=True)

        return Response(serializer.data)

   
    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):

        revision = self.get_object()

        if revision.status == "completed":
            return Response(
                {"message": "Revision already completed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():

            revision.status = "completed"
            revision.completed_at = timezone.now()
            revision.save()

        return Response(
            {
                "message": "Revision completed successfully."
            },
            status=status.HTTP_200_OK
        )
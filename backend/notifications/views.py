from django.shortcuts import render

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import NotificationSettings
from .serializers import NotificationSettingsSerializer


class NotificationSettingsViewSet(viewsets.ViewSet):

    permission_classes = [IsAuthenticated]

    def list(self, request):

        settings = NotificationSettings.objects.get(
            user=request.user
        )

        serializer = NotificationSettingsSerializer(settings)

        return Response(serializer.data)

    def partial_update(self, request, pk=None):

        settings = NotificationSettings.objects.get(
            user=request.user
        )

        serializer = NotificationSettingsSerializer(
            settings,
            data=request.data,
            partial=True
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)
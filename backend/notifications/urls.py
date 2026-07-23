from django.urls import path , include
from rest_framework.routers import DefaultRouter
from .views import NotificationSettingsViewSet


router = DefaultRouter()
router.register('notification-settings', NotificationSettingsViewSet,basename="notification-settings")

urlpatterns = [
   path('', include(router.urls)), 
]


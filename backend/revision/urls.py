from django.urls import path , include
from .views import RevisionViewSet
from rest_framework.routers import  DefaultRouter


router = DefaultRouter()
router.register('revisions', RevisionViewSet,basename="revisions")

urlpatterns = [
   path('', include(router.urls)), 
]

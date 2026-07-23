from django.urls import path , include
from .views import SubjectListView
from rest_framework.routers import  DefaultRouter


router = DefaultRouter()
router.register('subjects', SubjectListView, basename='subjects')

urlpatterns = [
    # path('subjects/', SubjectListView.as_view(), name='subjects'),
    path('', include(router.urls)),  # Include the router URLs
]

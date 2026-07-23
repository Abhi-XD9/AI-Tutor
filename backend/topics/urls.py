from django.urls import path , include
from .views import TopicListView
from rest_framework.routers import  DefaultRouter


router = DefaultRouter()
router.register('topics', TopicListView, basename='topics')

urlpatterns = [
    # path('topics/', TopicListView.as_view(), name='topics'),
    path('', include(router.urls)),  # Include the router URLs
]

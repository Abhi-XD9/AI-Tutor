from django.urls import path

from .consumers import ChatConsumer


websocket_urlpatterns = [
    path(
        "ws/topics/<int:topic_id>/conversations/<int:conversation_id>/chat/",
        ChatConsumer.as_asgi(),
    ),
]
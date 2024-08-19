from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/terminal/<int:session_id>/', consumers.TerminalConsumer.as_asgi()),
]
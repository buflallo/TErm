from django.urls import path, re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/terminal/(?P<container_id>[^/]+)/$', consumers.TerminalConsumer.as_asgi()),
    path('ws/job-status/', consumers.JobConsumer.as_asgi()),
]

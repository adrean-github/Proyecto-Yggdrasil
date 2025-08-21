from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/agendas/$', consumers.AgendaConsumer.as_asgi()),
    re_path(r'ws/boxes/$', consumers.BoxesConsumer.as_asgi()),
]

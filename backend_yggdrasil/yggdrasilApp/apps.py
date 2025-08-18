from django.apps import AppConfig
import os
import threading


class YggdrasilConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'yggdrasilApp'

    _thread_started = False

    def ready(self):
        if not YggdrasilConfig._thread_started:
            YggdrasilConfig._thread_started = True
            from .thread import iniciar_flujo_actualizacion
            iniciar_flujo_actualizacion()
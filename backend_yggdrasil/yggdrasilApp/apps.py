from django.apps import AppConfig
import os
import threading


class YggdrasilConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'yggdrasilApp'

    def ready(self):
        if os.environ.get('RUN_MAIN') == 'true':
            from .thread import iniciar_flujo_actualizacion
            iniciar_flujo_actualizacion()
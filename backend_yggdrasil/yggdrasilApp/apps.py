from django.apps import AppConfig


class YggdrasilConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'yggdrasilApp'

    def ready(self):
        from .thread import iniciar_flujo_actualizacion
        iniciar_flujo_actualizacion()

from ..models import Agendabox
from django.db.models import Q
from .observable import Observable
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

class ActualizadorDatos(Observable):
    def __init__(self):
        super().__init__()


    def actualizar(self, nuevos_agenda_boxes):
        actualizo = False
        agenda_to_save = []
        for agenda, accion in nuevos_agenda_boxes:
            if accion == 'INSERT':
                agenda_to_save.append(agenda)
            actualizo = True
        

        # Si se encontraron nuevos registros, se guardan de una vez
        if actualizo:
            Agendabox.objects.bulk_create(agenda_to_save)
            print('inicio de notificacion')
            # Notificar por websocket usando Channels
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                'agendas',
                {
                    'type': 'agenda_update',
                    'message': 'actualizacion_agenda'
                }
            )
            # Si quieres mantener la notificación a observadores Python:
            self.notificar_observadores()


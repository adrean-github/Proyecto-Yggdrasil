from .models import Agendabox
from django.db.models import Q
from .observable import Observable

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
            self.notificar_observadores()


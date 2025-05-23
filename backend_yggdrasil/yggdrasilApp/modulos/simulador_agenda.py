
from ..models import Agendabox

class SimuladorAgenda:
    def simular(self, datos):
        aprobadas = []
        desaprobadas = []
        for agenda in datos:
            if self.tiene_solapamiento_bdd(agenda):
                desaprobadas.append(agenda)
                continue

            if self.existe_solapamiento_lista(aprobadas, agenda):
                desaprobadas.append(agenda)
                continue

            aprobadas.append(agenda)

        return aprobadas, desaprobadas
    
    def tiene_solapamiento_bdd(self, agenda):
        """
        Revisa en base de datos si existe solapamiento con la agenda dada
        """
        return Agendabox.objects.filter(
            idbox=agenda.idbox,
            fechaagenda=agenda.fechaagenda,
            horainicioagenda__lt=agenda.horafinagenda,
            horafinagenda__gt=agenda.horainicioagenda
        ).exists()
    

    def existe_solapamiento_lista(self, lista_agendas, nueva_agenda):
        """
        Revisa en lista local si existe solapamiento con la nueva agenda
        """
        for agenda in lista_agendas:
            if (
                agenda.idbox == nueva_agenda.idbox and
                agenda.fechaagenda == nueva_agenda.fechaagenda and
                agenda.horainicioagenda < nueva_agenda.horafinagenda and
                agenda.horafinagenda > nueva_agenda.horainicioagenda
            ):
                return True
        return False



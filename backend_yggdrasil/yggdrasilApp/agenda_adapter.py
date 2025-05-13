from .models import Agendabox, Box, Medico

class AgendaAdapter:
    def adaptar_datos(self, datos):
        """Convierte los datos JSON a instancias de AgendaBox."""
        agenda_boxes = []
        for item in datos:
            box_instance = Box.objects.get(idbox=int(item['idBox']))
            medico_instance = Medico.objects.get(idmedico=item['idMedico'])
            agenda_box = Agendabox(
                idmedico=medico_instance,
                idbox=box_instance,
                fechaagenda=item['fecha'],
                horainicioagenda=item['horaInicio'],
                horafinagenda=item['horaFin'],
                habilitada=1
            )
            agenda_boxes.append(agenda_box)
        return agenda_boxes

from ..models import Agendabox, Box, Medico
import pandas as pd


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
            agenda_boxes.append((agenda_box, item['accion']))
        return agenda_boxes


class SimuladorAdapter:
    def adaptar_datos(self, datos):
        print(datos.info())
        df = datos[['idBox', 'idMedico', 'fecha', 'horaInicio', 'horaFin']]

        print(df)
        cols_int = ['idBox', 'idMedico']
        cols_date = ['fecha']
        cols_time = ['horaInicio', 'horaFin']
        for col in cols_int:
            df.loc[:, col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)

        for col in cols_date:
            df.loc[:, col] = pd.to_datetime(df[col], errors='coerce').dt.date

        for col in cols_time:
            df.loc[:, col] = pd.to_datetime(df[col], errors='coerce').dt.time

        agenda_boxes = []
        for fila in df.itertuples():
            box_instance = Box.objects.get(idbox=fila.idBox)
            medico_instance = Medico.objects.get(idmedico=fila.idMedico)
            agenda_box = Agendabox(
                idmedico=medico_instance,
                idbox=box_instance,
                fechaagenda=fila.fecha,
                horainicioagenda=fila.horaInicio,
                horafinagenda=fila.horaFin,
                habilitada=1
            )
            agenda_boxes.append(agenda_box)
        return agenda_boxes

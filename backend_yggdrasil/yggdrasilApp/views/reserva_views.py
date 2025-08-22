# Views relacionadas con reservas (médicas y no médicas)

from rest_framework.views import APIView
from rest_framework.response import Response
from ..models import Box, Agendabox
from ..serializers import AgendaboxSerializer
from rest_framework import status
from datetime import datetime, time, timedelta
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def notificar_cambio_box_agenda(box_id, tipo_evento="agenda_modificada"):
    """
    Función helper para notificar cambios en agendas que afectan el estado de boxes
    """
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "boxes",  # Grupo de boxes
        {
            "type": "agenda_box_actualizada",
            "box_id": box_id,
            "evento": tipo_evento,
        }
    )


class AgendasNoMedicasView(APIView):
    def get(self, request, *args, **kwargs):
        box_id = kwargs.get('id')

        if not box_id:
            return Response({'error': 'ID del box es requerido.'}, status=400)

        agendas = Agendabox.objects.filter(idbox=box_id, esMedica=0)

        eventos = []
        for ag in agendas:
            fecha = ag.fechaagenda.strftime("%Y-%m-%d")
            hora_inicio = ag.horainicioagenda.strftime("%H:%M:%S")
            hora_fin = ag.horafinagenda.strftime("%H:%M:%S") if ag.horafinagenda else None

            eventos.append({
                "title": "No Médica",
                "start": f"{fecha}T{hora_inicio}",
                "end": f"{fecha}T{hora_fin}" if hora_fin else None
            })

        return Response(eventos)


class BloquesNoMedicosDisponiblesView(APIView):
    def get(self, request, *args, **kwargs):
        box_id = kwargs.get('id')
        fecha_str = request.query_params.get('fecha')

        if not box_id or not fecha_str:
            return Response({'error': 'ID del box y fecha son requeridos.'}, status=400)

        try:
            fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({'error': 'Formato de fecha inválido'}, status=400)

        agendas = Agendabox.objects.filter(idbox=box_id, fechaagenda=fecha)

        hora_inicio = time(8, 0)
        hora_fin = time(18, 0)
        duracion = timedelta(minutes=30)

        bloque_actual = datetime.combine(fecha, hora_inicio)
        bloques_disponibles = []

        while (bloque_actual + duracion).time() <= hora_fin:
            bloque_fin = (bloque_actual + duracion).time()

            conflicto = agendas.filter(
                horainicioagenda__lt=bloque_fin,
                horafinagenda__gt=bloque_actual.time()
            ).exists()

            if not conflicto:
                bloque_id = f"{box_id}_{fecha.strftime('%Y%m%d')}_{bloque_actual.time().strftime('%H%M')}"
                bloques_disponibles.append({
                    'bloque_id': bloque_id,
                    'box_id': box_id,
                    'hora_inicio': bloque_actual.time().strftime('%H:%M'),
                    'hora_fin': bloque_fin.strftime('%H:%M'),
                    'fecha': fecha.strftime('%Y-%m-%d'),
                })

            bloque_actual += duracion

        return Response(bloques_disponibles)


class CrearReservaNoMedicaView(APIView):
    def post(self, request):
        data = request.data

        try:
            fecha = datetime.strptime(data.get("fecha"), "%Y-%m-%d").date()
            hora_inicio = datetime.strptime(data.get("horaInicioReserva"), "%H:%M").time()
            hora_fin = datetime.strptime(data.get("horaFinReserva"), "%H:%M").time()
        except (TypeError, ValueError):
            return Response({'error': 'Formato de fecha u hora inválido'}, status=400)

        box_id = data.get("box_id")
        nombre = data.get("nombreResponsable")
        observaciones = data.get("observaciones", "")

        if not box_id or not nombre:
            return Response({'error': 'Faltan campos requeridos'}, status=400)

        conflicto = Agendabox.objects.filter(
            idbox=box_id,
            fechaagenda=fecha,
            horainicioagenda__lt=hora_fin,
            horafinagenda__gt=hora_inicio
        ).exists()

        if conflicto:
            return Response({'error': 'Ya existe una agenda en ese bloque'}, status=400)

        try:
            nueva_agenda = Agendabox.objects.create(
                fechaagenda=fecha,
                horainicioagenda=hora_inicio,
                horafinagenda=hora_fin,
                idbox_id=box_id,
                habilitada=0,
                esMedica=0,
                idmedico=None,
                nombre_responsable=nombre,
                observaciones=observaciones  
            )

            # ⭐ NUEVO: Invalidar cache automáticamente
            from ..modulos.cache_manager import CacheSignals
            CacheSignals.agenda_creada(nueva_agenda, fuente='reserva_no_medica')

            # ⭐ NUEVO: Notificar cambio por WebSocket
            notificar_cambio_box_agenda(box_id, "agenda_creada")

            return Response({
                'mensaje': 'Reserva creada exitosamente',
                'id': nueva_agenda.id,
                'box_id': nueva_agenda.idbox_id,
                'fecha': fecha.strftime('%Y-%m-%d'),
                'hora_inicio': hora_inicio.strftime('%H:%M'),
                'hora_fin': hora_fin.strftime('%H:%M'),
                'responsable': nueva_agenda.nombre_responsable
            }, status=201)

        except Exception as e:
            return Response(
                {'error': f'Error al crear la reserva: {str(e)}'},
                status=500
            )


class CrearReservaMedicaView(APIView):
    def post(self, request):
        data = request.data

        try:
            fecha = datetime.strptime(data.get("fecha"), "%Y-%m-%d").date()
            hora_inicio = datetime.strptime(data.get("horaInicioReserva"), "%H:%M").time()
            hora_fin = datetime.strptime(data.get("horaFinReserva"), "%H:%M").time()
        except (TypeError, ValueError):
            return Response({'error': 'Formato de fecha u hora inválido'}, status=400)

        box_id = data.get("box_id")
        nombre = data.get("nombreResponsable")
        observaciones = data.get("observaciones", "")
        id_medico = data.get("idMedico")  # opcional, si quieres asociar médico

        if not box_id or not nombre:
            return Response({'error': 'Faltan campos requeridos'}, status=400)

        conflicto = Agendabox.objects.filter(
            idbox=box_id,
            fechaagenda=fecha,
            horainicioagenda__lt=hora_fin,
            horafinagenda__gt=hora_inicio
        ).exists()

        if conflicto:
            return Response({'error': 'Ya existe una agenda en ese bloque'}, status=400)

        try:
            nueva_agenda = Agendabox.objects.create(
                fechaagenda=fecha,
                horainicioagenda=hora_inicio,
                horafinagenda=hora_fin,
                idbox_id=box_id,
                habilitada=0,
                esMedica=1,  #acá se diferencia de la no médica
                idmedico_id=id_medico,
                nombre_responsable=nombre,
                observaciones=observaciones
            )

            # ⭐ NUEVO: Invalidar cache automáticamente
            from ..modulos.cache_manager import CacheSignals
            CacheSignals.agenda_creada(nueva_agenda, fuente='reserva_medica')

            # ⭐ NUEVO: Notificar cambio por WebSocket
            notificar_cambio_box_agenda(box_id, "agenda_creada")

            return Response({
                'mensaje': 'Reserva médica creada exitosamente',
                'id': nueva_agenda.id,
                'box_id': nueva_agenda.idbox_id,
                'fecha': fecha.strftime('%Y-%m-%d'),
                'hora_inicio': hora_inicio.strftime('%H:%M'),
                'hora_fin': hora_fin.strftime('%H:%M'),
                'responsable': nueva_agenda.nombre_responsable
            }, status=201)

        except Exception as e:
            return Response({'error': f'Error al crear la reserva: {str(e)}'}, status=500)


class MisReservasMedicasView(APIView):
    def get(self, request):
        id_medico = request.query_params.get("idMedico") 

        ahora = datetime.now()
        reservas = Agendabox.objects.filter(
            esMedica=1,
            habilitada=0,
            fechaagenda__gte=ahora.date()
        ).exclude(
            fechaagenda=ahora.date(),
            horafinagenda__lte=ahora.time()
        )

        if id_medico:
            reservas = reservas.filter(idmedico=id_medico)

        data = [
            {
                "id": r.id,
                "box_id": r.idbox_id,
                "fecha": r.fechaagenda.strftime("%Y-%m-%d"),
                "hora_inicio": r.horainicioagenda.strftime("%H:%M"),
                "hora_fin": r.horafinagenda.strftime("%H:%M"),
                "responsable": r.nombre_responsable,
                "medico": r.idmedico.nombre if r.idmedico else None,
                "habilitada": r.habilitada,
                "puede_liberar": r.habilitada == 0
            }
            for r in reservas
        ]

        return Response(data, status=200)


class MisReservasNoMedicasView(APIView):
    def get(self, request):
        nombre = request.query_params.get("nombreResponsable") 

        ahora = datetime.now()
        reservas = Agendabox.objects.filter(
            esMedica=0,
            habilitada=0,
            fechaagenda__gte=ahora.date()
        ).exclude(
            fechaagenda=ahora.date(),
            horafinagenda__lte=ahora.time()
        )

        if nombre:
            reservas = reservas.filter(nombre_responsable=nombre)

        data = [
            {
                "id": r.id,
                "box_id": r.idbox_id,
                "fecha": r.fechaagenda.strftime("%Y-%m-%d"),
                "hora_inicio": r.horainicioagenda.strftime("%H:%M"),
                "hora_fin": r.horafinagenda.strftime("%H:%M"),
                "responsable": r.nombre_responsable,
                "habilitada": r.habilitada,
                "puede_liberar": r.habilitada == 0
            }
            for r in reservas
        ]

        return Response(data, status=200)


class LiberarReservaView(APIView):
    def delete(self, request, reserva_id):
        try:
            reserva = Agendabox.objects.get(id=reserva_id)
            box_id = reserva.idbox_id  # Guardar el box_id antes de eliminar
            reserva.delete()
            
            # ⭐ NUEVO: Notificar cambio por WebSocket
            notificar_cambio_box_agenda(box_id, "agenda_eliminada")
            
            return Response({'mensaje': 'Reserva eliminada/liberada'}, status=200)
        except Agendabox.DoesNotExist:
            return Response({'error': 'Reserva no encontrada'}, status=404)


class UpdateReservaView(APIView):
    def put(self, request, reserva_id):
        try:
            reserva = Agendabox.objects.get(id=reserva_id)
        except Agendabox.DoesNotExist:
            return Response({'error': 'Reserva no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AgendaboxSerializer(reserva, data=request.data, partial=True) 
        if serializer.is_valid():
            serializer.save()
            
            # ⭐ NUEVO: Notificar cambio por WebSocket
            notificar_cambio_box_agenda(reserva.idbox_id, "agenda_modificada")
            
            return Response({'mensaje': 'Reserva actualizada', 'reserva': serializer.data}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BloquesLibresView(APIView):
    def get(self, request, box_id):
        fecha = request.GET.get('fecha')
        duracion_min = int(request.GET.get('duracion', 30))  
        
        if not fecha:
            return Response({'error': 'Se requiere parámetro fecha'}, status=400)
        
        try:
            agendas = Agendabox.objects.filter(
                idbox=box_id,
                fechaagenda=fecha
            ).order_by('horainicioagenda')
            
            bloques_libres = []
            hora_actual = timezone.datetime.strptime(f"{fecha} 08:00", "%Y-%m-%d %H:%M")
            hora_fin_dia = timezone.datetime.strptime(f"{fecha} 18:00", "%Y-%m-%d %H:%M")
            
            for agenda in agendas:
                hora_inicio_agenda = timezone.datetime.strptime(f"{fecha} {agenda.horainicioagenda}", "%Y-%m-%d %H:%M:%S")
                hora_fin_agenda = timezone.datetime.strptime(f"{fecha} {agenda.horafinagenda}", "%Y-%m-%d %H:%M:%S")
                
                if hora_actual < hora_inicio_agenda:
                    diferencia = (hora_inicio_agenda - hora_actual).total_seconds() / 60
                    if diferencia >= duracion_min:
                        bloques_libres.append({
                            'hora_inicio': hora_actual.strftime('%H:%M'),
                            'hora_fin': hora_inicio_agenda.strftime('%H:%M'),
                            'duracion_minutos': int(diferencia)
                        })
                
                hora_actual = max(hora_actual, hora_fin_agenda)
            
            if hora_actual < hora_fin_dia:
                diferencia = (hora_fin_dia - hora_actual).total_seconds() / 60
                if diferencia >= duracion_min:
                    bloques_libres.append({
                        'hora_inicio': hora_actual.strftime('%H:%M'),
                        'hora_fin': hora_fin_dia.strftime('%H:%M'),
                        'duracion_minutos': int(diferencia)
                    })
            
            return Response({'bloques_libres': bloques_libres})
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)

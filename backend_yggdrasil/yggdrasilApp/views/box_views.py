# Views relacionadas con boxes

from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from ..models import Box, Agendabox, BoxTipoBox, HistorialModificacionesBox
from ..serializers import BoxSerializer
from rest_framework import status
from rest_framework.exceptions import ValidationError
from django.db.models import Q
from datetime import datetime, timedelta
from rest_framework.permissions import AllowAny
from .utils import get_client_ip
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from datetime import datetime, timedelta
from rest_framework.permissions import AllowAny
from .utils import get_client_ip
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer



def registrar_cambio_box(box_id, usuario, accion, campo=None, valor_anterior=None, valor_nuevo=None, comentario=None, request=None):
    """Función helper para registrar cambios en el historial"""
    ip = get_client_ip(request) if request else None
    
    HistorialModificacionesBox.objects.create(
        id_box=box_id,
        usuario=usuario,
        accion=accion,
        campo_modificado=campo,
        valor_anterior=str(valor_anterior) if valor_anterior else None,
        valor_nuevo=str(valor_nuevo) if valor_nuevo else None,
        comentario=comentario,
        ip_address=ip
    )


class BoxListView(APIView):
    def get(self, request, *args, **kwargs):
        box_id = kwargs.get('id')
        fecha = datetime.now().date()
        hora = datetime.now().time()

        def formatear_fecha(fechaagenda, horaagenda):
            """Devuelve la fecha en formato relativo: Hoy, Mañana o dd/mm/YYYY + hora"""
            if not fechaagenda or not horaagenda:
                return "N/A"
            if fechaagenda == fecha:
                dia = "Hoy"
            elif fechaagenda == fecha + timedelta(days=1):
                dia = "Mañana"
            else:
                dia = fechaagenda.strftime("%d/%m/%Y")
            return f"{dia} {horaagenda.strftime('%H:%M')}"

        if box_id:
            try:
                idbox = Box.objects.get(idbox=box_id)
                serializer = BoxSerializer(idbox)

                # Última atención finalizada (puede ser hoy o días anteriores)
                ultima_atencion = Agendabox.objects.filter(
                    Q(fechaagenda__lt=fecha) | Q(fechaagenda=fecha, horafinagenda__lt=hora),
                    idbox=idbox
                ).order_by('-fechaagenda', '-horafinagenda').first()

                ult_str = (
                    f"{formatear_fecha(ultima_atencion.fechaagenda, ultima_atencion.horafinagenda)} "
                    f"({'No Médica' if ultima_atencion.esMedica == 0 else 'Médica'})"
                    if ultima_atencion else "N/A"
                )

                # Próxima atención (puede ser hoy o días siguientes)
                proxima_atencion = Agendabox.objects.filter(
                    Q(fechaagenda__gt=fecha) | Q(fechaagenda=fecha, horainicioagenda__gte=hora),
                    idbox=idbox
                ).order_by('fechaagenda', 'horainicioagenda').first()

                prox_str = (
                    f"{formatear_fecha(proxima_atencion.fechaagenda, proxima_atencion.horainicioagenda)} "
                    f"({'No Médica' if proxima_atencion.esMedica == 0 else 'Médica'})"
                    if proxima_atencion else "N/A"
                )

                # Atención actual (solo hoy, dentro de rango)
                atencion_actual = Agendabox.objects.filter(
                    idbox=idbox,
                    fechaagenda=fecha,
                    horainicioagenda__lt=hora,
                    horafinagenda__gte=hora
                ).first()

                med_str = (
                    f"Dr. {atencion_actual.idmedico.nombre} "
                    f"({'No Médica' if atencion_actual.esMedica == 0 else 'Médica'})"
                    if atencion_actual and atencion_actual.idmedico else "N/A"
                )

                return Response({
                    "ult": ult_str,
                    "prox": prox_str,
                    "med": med_str,
                    "estadobox": serializer.data['estadobox'],
                    "pasillobox": serializer.data['pasillobox'],
                    "especialidades": serializer.data['especialidades'],
                    "especialidad_principal": serializer.data['especialidad_principal'],
                    "comentario": serializer.data['comentario'],
                }, status=status.HTTP_200_OK)

            except Box.DoesNotExist:
                return Response({'error': 'Box no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        else:
            boxes = Box.objects.all()
            serializer = BoxSerializer(boxes, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)


class EstadoBoxView(APIView):

    def hay_tope(agendas):
        for i in range(len(agendas)):
            a1 = agendas[i]
            for j in range(i + 1, len(agendas)):
                a2 = agendas[j]
                if a1['horainicioagenda'] < a2['horafinagenda'] and a2['horainicioagenda'] < a1['horafinagenda']:
                    return True
        return False

    def get(self, request, *args, **kwargs):
        idbox = request.query_params.get('idbox')
        fecha = request.query_params.get('fecha')
        hora = request.query_params.get('hora')

        if not idbox or not fecha or not hora:
            raise ValidationError("Faltan parámetros: idbox, fecha y hora son requeridos.")

        estado = Agendabox.objects.filter(
            Q(idbox=idbox),
            Q(fechaagenda=fecha),
            Q(horainicioagenda__lt=hora),
            Q(horafinagenda__gt=hora)
        ).count()

        if estado == 1:
            estBox = 'Ocupado'
        elif estado == 0:
            estBox = 'Disponible'
        else:
            estBox = 'Tope'

        return Response({"estado": estBox}, status=status.HTTP_200_OK)


class BoxesInhabilitadosView(APIView):
    def get(self, request):
        boxes_inhabilitados = Box.objects.filter(estadobox='Inhabilitado').values('idbox', 'pasillobox')
        return Response(boxes_inhabilitados, status=status.HTTP_200_OK)


class InfoBoxView(APIView):
    def get(self, request, *args, **kwargs):
        idbox = request.query_params.get('idbox')
        fecha = request.query_params.get('fecha')
        hora = request.query_params.get('hora')

        if not idbox or not fecha or not hora:
            raise ValidationError("Faltan parámetros: idbox, fecha y hora son requeridos.")

        hora_fin = Agendabox.objects.filter(
            idbox=idbox,
            fechaagenda__lte=fecha,
            horafinagenda__lt=hora
        ).order_by('-fechaagenda', '-horafinagenda').values_list('fechaagenda', 'horafinagenda').first()

        hora_prox = Agendabox.objects.filter(
            idbox=idbox,
            fechaagenda__gte=fecha,
            horainicioagenda__gte=hora
        ).order_by('fechaagenda', 'horafinagenda').values_list('fechaagenda', 'horainicioagenda').first()

        med = Agendabox.objects.filter(
            idbox=idbox,
            fechaagenda=fecha,
            horainicioagenda__lt=hora,
            horafinagenda__gte=hora
        ).values_list('idmedico')

        return Response({"ult": hora_fin, "prox": hora_prox, "med": med}, status=status.HTTP_200_OK)


class BoxesRecomendadosView(APIView):
    def get(self, request):
        fecha_str = request.query_params.get('fecha')
        hora_inicio_str = request.query_params.get('hora_inicio')
        hora_fin_str = request.query_params.get('hora_fin')

        if not all([fecha_str, hora_inicio_str, hora_fin_str]):
            return Response({'error': 'Fecha, hora_inicio y hora_fin son requeridos'}, status=400)

        try:
            fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
            hora_inicio = datetime.strptime(hora_inicio_str, "%H:%M").time()
            hora_fin = datetime.strptime(hora_fin_str, "%H:%M").time()
        except ValueError:
            return Response({'error': 'Formato de fecha u hora inválido'}, status=400)

        boxes_ocupados = Agendabox.objects.filter(
            fechaagenda=fecha,
            horainicioagenda__lt=hora_fin,
            horafinagenda__gt=hora_inicio
        ).values_list('idbox', flat=True) 

        boxes_disponibles = Box.objects.exclude(idbox__in=boxes_ocupados)

        boxes_data = []
        for box in boxes_disponibles:
            boxes_data.append({
                'id': box.idbox,
                'pasillo': box.pasillobox,
                'hora_inicio': hora_inicio_str,
                'hora_fin': hora_fin_str,
                'disponible': True
            })
        return Response(boxes_data)


class ToggleEstadoBoxView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request, box_id):
        try:
            box = Box.objects.get(idbox=box_id)
            estado_anterior = box.estadobox
            razon = request.data.get('razon', '')
            
            nuevo_estado = request.data.get('estadobox')
            if not nuevo_estado:
                return Response({'error': 'El nuevo estado es requerido'}, status=400)
            
            if nuevo_estado not in ['Habilitado', 'Inhabilitado']:
                return Response({'error': 'Estado inválido'}, status=400)
            
            box.estadobox = nuevo_estado
            box.comentario = razon
            box.save()
            
            registrar_cambio_box(
                box_id=box_id,
                usuario=request.user.username if request.user.is_authenticated else "Sistema",
                accion='INHABILITACION' if nuevo_estado == 'Inhabilitado' else 'HABILITACION',
                comentario=razon,
                request=request
            )
            
            # Enviar mensaje WebSocket a todos los clientes conectados
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "boxes",  # Grupo de boxes
                {
                    "type": "box_estado_actualizado",
                    "box_id": box_id,
                    "nuevo_estado": nuevo_estado,
                }
            )
            
            return Response({
                'estadobox': box.estadobox,
                'comentario': box.comentario,
                'mensaje': f'Box {nuevo_estado.lower()} correctamente'
            })
            
        except Box.DoesNotExist:
            return Response({'error': 'Box no encontrado'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=400)

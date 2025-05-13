from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Box, Agendabox, Medico, Atenamb, LogAtenamb
from .serializers import BoxSerializer
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework.exceptions import ValidationError
from django.db.models import Q
from datetime import datetime
from .event_listener import EventListener
from django.utils.dateparse import parse_datetime
from .event_listener import VistaActualizableDisp
from rest_framework import serializers


class BoxListView(APIView):
    def get(self, request, *args, **kwargs):
        box_id = kwargs.get('id')

        if box_id:
            try:
                idbox = Box.objects.get(idbox=box_id)
                serializer = BoxSerializer(idbox)

                fecha = datetime.now().date()
                hora = datetime.now().time()


                # Realiza la consulta en la base de datos
                hora_fin = Agendabox.objects.filter(
                    idbox=idbox,
                    fechaagenda=fecha.strftime('%Y-%m-%d'),
                    horafinagenda__lt=hora.strftime('%H:%M:%S') 
                ).order_by('-horafinagenda').values('horafinagenda').first()

                if not hora_fin:
                    hora_fin = 'N/A'
                else:
                    hora_fin = hora_fin['horafinagenda']

                hora_prox = Agendabox.objects.filter(
                    idbox=idbox,
                    fechaagenda=fecha.strftime('%Y-%m-%d'),
                    horainicioagenda__gte=hora.strftime('%H:%M:%S')
                ).order_by('horafinagenda').values('horainicioagenda').first()

                if not hora_prox:
                    hora_prox = 'N/A'
                else:
                    hora_prox = hora_prox['horainicioagenda']

                med = Agendabox.objects.filter(
                    idbox=idbox,
                    fechaagenda=fecha.strftime('%Y-%m-%d'),
                    horainicioagenda__lt=hora.strftime('%H:%M:%S'),
                    horafinagenda__gte=hora.strftime('%H:%M:%S')
                )
                if not med:
                    x = 'N/A' 
                else:
                    for ag in med:
                        x = f"Dr. {ag.idmedico.nombre}"

                estadobox = serializer.data['estadobox']
                pasillobox = serializer.data['pasillobox']

        # Devuelve el estado
                return Response({
                    "ult": hora_fin,
                    "prox": hora_prox,
                    "med": x, 
                    "estadobox": estadobox, 
                    "pasillobox": pasillobox
                }, status=status.HTTP_200_OK)
            

            except Box.DoesNotExist:
                return Response({'error': 'Box no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        else:
            boxes = Box.objects.all()
            serializer = BoxSerializer(boxes, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
            


class EstadoBoxView(APIView):
    def get(self, request, *args, **kwargs):
        # Obtiene los parámetros de la solicitud
        idbox = request.query_params.get('idbox')
        fecha = request.query_params.get('fecha')
        hora = request.query_params.get('hora')

        # Valida que los parámetros no sean nulos
        if not idbox or not fecha or not hora:
            raise ValidationError("Faltan parámetros: idbox, fecha y hora son requeridos.")



        # Realiza la consulta en la base de datos
        estado = Agendabox.objects.filter(
            Q(idbox=idbox),
            Q(fechaagenda=fecha),
            Q(horainicioagenda__lt=hora),
            Q(horafinagenda__gt=hora)
        ).exists()

        if estado:
            estBox = 'Ocupado'
        else:
            estBox = 'Disponible'

        # Devuelve el estado
        return Response({"estado": estBox}, status=status.HTTP_200_OK)
    

class InfoBoxView(APIView):
    def get(self, request, *args, **kwargs):
        # Obtiene los parámetros de la solicitud
        idbox = request.query_params.get('idbox')
        fecha = request.query_params.get('fecha')
        hora = request.query_params.get('hora')

        # Valida que los parámetros no sean nulos
        if not idbox or not fecha or not hora:
            raise ValidationError("Faltan parámetros: idbox, fecha y hora son requeridos.")

        # Realiza la consulta en la base de datos
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


        # Devuelve el estado
        return Response({"ult": hora_fin, "prox": hora_prox, "med": med}, status=status.HTTP_200_OK)

class AgendaBox(APIView):
    def get(self, request, *args, **kwargs):
        box_id = kwargs.get('id')
        agenda_box = Agendabox.objects.filter(idbox=box_id)
        eventos = []
        for ag in agenda_box:
            fecha = ag.fechaagenda.strftime("%Y-%m-%d")
            hora_inicio = ag.horainicioagenda.strftime("%H:%M:%S")
            hora_fin = ag.horafinagenda.strftime("%H:%M:%S") if ag.horafinagenda else None

            eventos.append({
                "title": f"Dr. {ag.idmedico.nombre}" if ag.idmedico else "Consulta",
                "start": f"{fecha}T{hora_inicio}",
                "end": f"{fecha}T{hora_fin}" if hora_fin else None
            })
        return Response(eventos, status=status.HTTP_200_OK)

class DatosModificadosAPIView(APIView):
    def get(self, request, fecha_hora_str):
        try:
            # Parsear la fecha y hora desde la URL
            fecha_hora = parse_datetime(fecha_hora_str)
            if fecha_hora is None:
                raise ValueError("Formato inválido")
        except ValueError:
            return Response({"error": "Formato de fecha/hora inválido. Usa YYYY-MM-DDTHH:MM:SS"}, status=status.HTTP_400_BAD_REQUEST)

        # Obtener IDs de registros modificados desde la fecha indicada
        logs = LogAtenamb.objects.using('simulador')\
            .filter(fecha_hora__gte=fecha_hora)\
            .values_list('atenamb_id', flat=True)\
            .distinct()

        # Obtener los datos de atenamb con esos IDs
        datos = list(
            Atenamb.objects.using('simulador')
            .filter(id__in=logs)
            .values()
        )

        return Response(datos, status=status.HTTP_200_OK)


class VistaActualizableDispSerializer(serializers.Serializer):
    actualizado = serializers.BooleanField()

class VistaActualizableDispView(APIView):
    def get(self, request):
        vista = VistaActualizableDisp()
        # Capturamos el valor actual antes de resetear
        data = {"actualizado": vista.actualizado}
        # Resetear el flag después de capturarlo
        vista.resetear()
        return Response(data)

    def put(self, request):
        vista = VistaActualizableDisp()
        serializer = VistaActualizableDispSerializer(data=request.data)
        if serializer.is_valid():
            vista.actualizado = serializer.validated_data['actualizado']
            return Response({"message": "Flag actualizado correctamente."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
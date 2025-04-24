from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Box, Agendabox
from .serializers import BoxSerializer
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework.exceptions import ValidationError
from django.db.models import Q
from datetime import datetime

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
                ).values('idmedico').first()

                if not med:
                    med = 'N/A' 
                else:
                    med = med['idmedico']

                estadobox = serializer.data['estadobox']
                pasillobox = serializer.data['pasillobox']

        # Devuelve el estado
                return Response({"ult": hora_fin, "prox": hora_prox, "med": med, "estadobox": estadobox, "pasillobox": pasillobox}, status=status.HTTP_200_OK)
            

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

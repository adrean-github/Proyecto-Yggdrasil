from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Box, Agendabox
from .serializers import BoxSerializer
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework.exceptions import ValidationError
from django.db.models import Q

class BoxListView(APIView):
    def get(self, request, *args, **kwargs):
        box_id = kwargs.get('id')

        if box_id:
            try:
                box = Box.objects.get(idbox=box_id)
                serializer = BoxSerializer(box)
                return Response(serializer.data, status=status.HTTP_200_OK)
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
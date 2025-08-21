# Views relacionadas con médicos

from rest_framework.views import APIView
from rest_framework.response import Response
from ..models import Medico, Agendabox
from rest_framework.exceptions import ValidationError
from datetime import datetime


class SugerenciasMedicoView(APIView):
    def get(self, request):
        nombre = request.query_params.get("nombre", "").strip()
        if not nombre:
            return Response([])

        medicos = Medico.objects.filter(nombre__icontains=nombre)[:10]
        data = [{"idMedico": m.idmedico, "nombre": m.nombre} for m in medicos]
        return Response(data[:10])


class MedicosDisponiblesView(APIView):
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

        medicos_ocupados = Agendabox.objects.filter(
            esMedica=1,
            fechaagenda=fecha,
            horainicioagenda__lt=hora_fin,
            horafinagenda__gt=hora_inicio
        ).values_list('idmedico', flat=True) 

        medicos_disponibles = Medico.objects.exclude(idmedico__in=medicos_ocupados)

        medicos_data = [{'idMedico': m.idmedico, 'nombre': m.nombre} for m in medicos_disponibles]
        return Response(medicos_data)

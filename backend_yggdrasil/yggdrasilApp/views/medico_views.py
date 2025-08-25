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

class MedicoDisponibilidadView(APIView):
    def get(self, request):
        medico_nombre = request.query_params.get('medico')
        medico_id = request.query_params.get('medico_id')
        fecha_str = request.query_params.get('fecha')
        
        if not fecha_str:
            return Response({'error': 'Fecha es requerida'}, status=400)
        
        if not medico_nombre and not medico_id:
            return Response({'error': 'Nombre de médico o ID de médico son requeridos'}, status=400)
        
        try:
            fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}, status=400)
        
        # Buscar el médico por ID o por nombre
        try:
            if medico_id:
                # Buscar por ID
                try:
                    medico = Medico.objects.get(idmedico=medico_id)
                    medico_nombre_final = medico.nombre
                    medico_id_final = medico.idmedico
                except Medico.DoesNotExist:
                    return Response({'error': 'Médico no encontrado'}, status=404)
            else:
                # Buscar por nombre (comportamiento original)
                medico = Medico.objects.filter(nombre__icontains=medico_nombre).first()
                if not medico:
                    return Response({'error': 'Médico no encontrado'}, status=404)
                medico_nombre_final = medico.nombre
                medico_id_final = medico.idmedico
                
        except Exception as e:
            return Response({'error': f'Error buscando médico: {str(e)}'}, status=500)
        
        # Buscar agendas del médico por ID
        agendas_medico = Agendabox.objects.filter(
            idmedico=medico_id_final,  
            fechaagenda=fecha
        ).values('id', 'horainicioagenda', 'horafinagenda', 'idbox', 'esMedica', 'nombre_responsable')
        
        # Convertir a formato más amigable
        agendas_data = []
        for agenda in agendas_medico:
            agendas_data.append({
                'id': agenda['id'],
                'hora_inicio': agenda['horainicioagenda'].strftime('%H:%M') if agenda['horainicioagenda'] else None,
                'hora_fin': agenda['horafinagenda'].strftime('%H:%M') if agenda['horafinagenda'] else None,
                'box_id': agenda['idbox'],
                'es_medica': agenda['esMedica'],
                'nombre_responsable': agenda['nombre_responsable']
            })
        
        return Response({
            'medico': medico_nombre_final,
            'medico_id': medico_id_final,
            'fecha': fecha_str,
            'agendas': agendas_data,
            'total_agendas': len(agendas_data)
        })
    def get(self, request):
        medico_nombre = request.query_params.get('medico')
        fecha_str = request.query_params.get('fecha')
        
        if not medico_nombre or not fecha_str:
            return Response({'error': 'Nombre de médico y fecha son requeridos'}, status=400)
        
        try:
            fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}, status=400)
        
        # Buscar el médico por nombre para obtener su ID
        try:
            # Buscar médico que coincida con el nombre (búsqueda insensible a mayúsculas)
            medico = Medico.objects.filter(nombre__icontains=medico_nombre).first()
            if not medico:
                return Response({'error': 'Médico no encontrado'}, status=404)
                
            medico_id = medico.idmedico
            
        except Exception as e:
            return Response({'error': f'Error buscando médico: {str(e)}'}, status=500)
        
        # Buscar agendas del médico por ID
        agendas_medico = Agendabox.objects.filter(
            idmedico=medico_id,  
            fechaagenda=fecha
        ).values('id', 'horainicioagenda', 'horafinagenda', 'idbox', 'esMedica', 'nombre_responsable')
        
        # Convertir a formato más amigable
        agendas_data = []
        for agenda in agendas_medico:
            agendas_data.append({
                'id': agenda['id'],
                'hora_inicio': agenda['horainicioagenda'].strftime('%H:%M') if agenda['horainicioagenda'] else None,
                'hora_fin': agenda['horafinagenda'].strftime('%H:%M') if agenda['horafinagenda'] else None,
                'box_id': agenda['idbox'],
                'es_medica': agenda['esMedica'],
                'nombre_responsable': agenda['nombre_responsable']
            })
        
        return Response({
            'medico': medico_nombre,
            'medico_id': medico_id,
            'fecha': fecha_str,
            'agendas': agendas_data,
            'total_agendas': len(agendas_data)
        })
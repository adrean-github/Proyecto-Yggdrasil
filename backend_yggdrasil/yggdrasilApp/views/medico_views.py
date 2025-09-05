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
        # Obtener parámetros de la URL
        medico_nombre = request.query_params.get('medico')
        medico_id = request.query_params.get('medico_id')
        fecha_str = request.query_params.get('fecha')
        
        print(f"=== DEBUG API DISPONIBILIDAD ===")
        print(f"medico_nombre recibido: '{medico_nombre}'")
        print(f"medico_id recibido: '{medico_id}'")
        print(f"fecha_str recibida: '{fecha_str}'")
        print(f"Todos los parámetros: {dict(request.query_params)}")
        
        # Validar que se proporcione fecha
        if not fecha_str:
            print("ERROR: Fecha no proporcionada")
            return Response({'error': 'Fecha es requerida'}, status=400)
        
        # Validar que se proporcione médico (por nombre o ID)
        if not medico_nombre and not medico_id:
            print("ERROR: Ni nombre ni ID de médico proporcionados")
            return Response({'error': 'Nombre de médico o ID de médico son requeridos'}, status=400)
        
        # Validar formato de fecha
        try:
            fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
            print(f"Fecha parseada correctamente: {fecha}")
        except ValueError:
            print("ERROR: Formato de fecha inválido")
            return Response({'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}, status=400)
        
        # Buscar el médico por ID o por nombre
        medico_nombre_final = None
        medico_id_final = None
        
        try:
            if medico_id:
                print(f"Buscando médico por ID: {medico_id}")
                try:
                    # Convertir medico_id a entero si es string
                    medico_id_int = int(medico_id)
                    medico = Medico.objects.get(idmedico=medico_id_int)
                    medico_nombre_final = medico.nombre
                    medico_id_final = medico.idmedico
                    print(f"Médico encontrado por ID: {medico_nombre_final} (ID: {medico_id_final})")
                except ValueError:
                    print(f"ERROR: ID de médico no es un número válido: {medico_id}")
                    return Response({'error': f'ID de médico debe ser un número válido'}, status=400)
                except Medico.DoesNotExist:
                    print(f"ERROR: Médico con ID {medico_id} no encontrado")
                    return Response({'error': f'Médico con ID {medico_id} no encontrado'}, status=404)
            else:
                print(f"Buscando médico por nombre: '{medico_nombre}'")
                # Buscar por nombre si no se proporciona ID
                medicos = Medico.objects.filter(nombre__icontains=medico_nombre)
                if not medicos.exists():
                    print(f"ERROR: No se encontró médico con nombre '{medico_nombre}'")
                    return Response({'error': f'No se encontró médico con nombre "{medico_nombre}"'}, status=404)
                
                # Si hay múltiples coincidencias, tomar la primera
                medico = medicos.first()
                medico_nombre_final = medico.nombre
                medico_id_final = medico.idmedico
                print(f"Médico encontrado por nombre: {medico_nombre_final} (ID: {medico_id_final})")
                
                # Si hay múltiples coincidencias, informar
                if medicos.count() > 1:
                    nombres_encontrados = list(medicos.values_list('nombre', flat=True))
                    print(f"ADVERTENCIA: Múltiples médicos encontrados: {nombres_encontrados}. Usando: {medico_nombre_final}")
                
        except Exception as e:
            print(f"ERROR INESPERADO buscando médico: {str(e)}")
            return Response({'error': f'Error buscando médico: {str(e)}'}, status=500)
        
        # Buscar todas las agendas del médico en la fecha especificada
        try:
            print(f"Buscando agendas para médico ID {medico_id_final} en fecha {fecha}")
            
            agendas_medico = Agendabox.objects.filter(
                idmedico=medico_id_final,  
                fechaagenda=fecha
            ).values('id', 'horainicioagenda', 'horafinagenda', 'idbox', 'esMedica', 'nombre_responsable')
            
            print(f"Encontradas {len(agendas_medico)} agendas")
            
            # Convertir a formato más amigable para el frontend
            agendas_data = []
            for agenda in agendas_medico:
                agenda_formateada = {
                    'id': agenda['id'],
                    'hora_inicio': agenda['horainicioagenda'].strftime('%H:%M') if agenda['horainicioagenda'] else None,
                    'hora_fin': agenda['horafinagenda'].strftime('%H:%M') if agenda['horafinagenda'] else None,
                    'box_id': agenda['idbox'],
                    'es_medica': agenda['esMedica'],
                    'nombre_responsable': agenda['nombre_responsable']
                }
                agendas_data.append(agenda_formateada)
                print(f"Agenda {agenda['id']}: {agenda_formateada['hora_inicio']}-{agenda_formateada['hora_fin']} en Box {agenda['idbox']}")
            
            respuesta = {
                'medico': medico_nombre_final,
                'medico_id': medico_id_final,
                'fecha': fecha_str,
                'agendas': agendas_data,
                'total_agendas': len(agendas_data)
            }
            
            print(f"Respuesta final: {respuesta}")
            return Response(respuesta)
            
        except Exception as e:
            print(f"ERROR obteniendo agendas: {str(e)}")
            return Response({'error': f'Error obteniendo agendas: {str(e)}'}, status=500)
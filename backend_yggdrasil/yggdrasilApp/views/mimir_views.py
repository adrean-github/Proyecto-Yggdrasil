# yggdrasilApp/views/mimir_views.py
import traceback
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import datetime
from ..utils.resolutor_agendas import ResolutorConflictosAgenda
from ..models import Tipobox, Agendabox

class ResolverTopeView(APIView):
    def post(self, request):
        try:
            reservas_ids = request.data.get("reservas", [])
            if not reservas_ids or len(reservas_ids) < 2:
                return Response(
                    {"error": "Se requieren al menos 2 reservas en conflicto"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            resolutor = ResolutorConflictosAgenda()
            resultado = resolutor.resolver_conflicto_agendas(reservas_ids)
            
            if 'error' in resultado:
                return Response(
                    {"error": resultado['error']},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Obtener información básica de cada reserva (adaptado al modelo real)
            reservas_detalladas = []
            for reserva_id in reservas_ids:
                try:
                    reserva = Agendabox.objects.get(id=reserva_id)
                    reservas_detalladas.append({
                        'id': reserva.id,
                        'fecha': reserva.fechaagenda.strftime('%Y-%m-%d') if reserva.fechaagenda else None,
                        'hora_inicio': str(reserva.horainicioagenda) if reserva.horainicioagenda else None,
                        'hora_fin': str(reserva.horafinagenda) if reserva.horafinagenda else None,
                        'medico': reserva.idmedico.nombre if reserva.idmedico else 'N/A',
                        'medico_id': reserva.idmedico.idmedico if reserva.idmedico else None,
                        'box_actual': reserva.idbox.idbox if reserva.idbox else 'N/A',
                        'box_actual_id': reserva.idbox.idbox if reserva.idbox else None,
                        'pasillo_actual': reserva.idbox.pasillobox if reserva.idbox else 'N/A',
                        # Campos que no existen en el modelo real - los omitimos o manejamos diferente
                        'paciente': 'N/A',  # No existe idpaciente en el modelo
                        'paciente_id': None,
                        'estado': 'N/A',    # No existe estadoagenda
                        'observaciones': reserva.observaciones if reserva.observaciones else ''
                    })
                except Agendabox.DoesNotExist:
                    reservas_detalladas.append({
                        'id': reserva_id,
                        'error': 'Reserva no encontrada'
                    })
                except Exception as e:
                    reservas_detalladas.append({
                        'id': reserva_id,
                        'error': str(e)
                    })
            
            # Agregar la información detallada al resultado
            resultado['reservas_detalladas'] = reservas_detalladas
            
            return Response(resultado)
            
        except Exception as e:
            traceback.print_exc()
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AplicarSolucionView(APIView):
    def post(self, request):
        try:
            reserva_id = request.data.get("reserva_id")
            box_destino_id = request.data.get("box_destino")
            comentario = request.data.get("comentario", "")
            
            if not reserva_id or not box_destino_id:
                return Response(
                    {"error": "reserva_id y box_destino son requeridos"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Obtener información del usuario de manera segura
            usuario_info = f"{request.user.username}" if hasattr(request.user, 'username') else "Sistema"
            
            resolutor = ResolutorConflictosAgenda()
            resultado = resolutor.aplicar_cambio_box(
                reserva_id, box_destino_id, usuario_info, comentario
            )
            
            if 'error' in resultado:
                return Response(
                    {"error": resultado['error']},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Obtener información actualizada de la reserva
            try:
                reserva_actualizada = Agendabox.objects.get(id=reserva_id)
                resultado['reserva_actualizada'] = {
                    'id': reserva_actualizada.id,
                    'box_actual': reserva_actualizada.idbox.idbox if reserva_actualizada.idbox else 'N/A',
                    'observaciones': reserva_actualizada.observaciones if reserva_actualizada.observaciones else ''
                }
            except Exception as e:
                resultado['advertencia'] = f"No se pudo obtener información actualizada: {str(e)}"
            
            return Response({
                "mensaje": "Cambio aplicado exitosamente",
                "detalles": resultado
            })
            
        except Exception as e:
            traceback.print_exc()
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SolucionesAlternativasView(APIView):
    def post(self, request):
        try:
            fecha = request.data.get("fecha")
            hora_inicio = request.data.get("hora_inicio")
            hora_fin = request.data.get("hora_fin")
            duracion = request.data.get("duracion")  # en minutos
            especialidades = request.data.get("especialidades", [])
            
            if not all([fecha, hora_inicio, hora_fin]):
                return Response(
                    {"error": "fecha, hora_inicio y hora_fin son requeridos"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Convertir especialidades (nombres) a IDs de Tipobox
            tipos_requeridos = []
            if especialidades:
                tipos_requeridos = list(
                    Tipobox.objects.filter(tipo__in=especialidades)
                    .values_list('idtipobox', flat=True)
                )
            
            resolutor = ResolutorConflictosAgenda()
            
            # Convertir strings a objetos datetime si es necesario
            if isinstance(fecha, str):
                fecha = datetime.strptime(fecha, '%Y-%m-%d').date()
            if isinstance(hora_inicio, str):
                hora_inicio = datetime.strptime(hora_inicio, '%H:%M:%S').time()
            if isinstance(hora_fin, str):
                hora_fin = datetime.strptime(hora_fin, '%H:%M:%S').time()
            
            # Obtener boxes libres con filtrado por especialidades
            boxes_libres = resolutor.obtener_boxes_libres(
                fecha, hora_inicio, hora_fin, 
                tipos_requeridos=tipos_requeridos
            )
            
            # Preparar respuesta con información detallada
            soluciones = []
            for box in boxes_libres:
                # Obtener tipos del box con indicador de principal
                box_tipos = BoxTipoBox.objects.filter(idbox=box.idbox)
                
                tipos_box = []
                for bt in box_tipos:
                    tipos_box.append({
                        'id': bt.idtipobox.idtipobox,
                        'nombre': bt.idtipobox.tipo,
                        'principal': bt.tipoprincipal
                    })
                
                # Calcular compatibilidad real
                tipos_box_ids = {bt.idtipobox.idtipobox for bt in box_tipos}
                compatibilidad = len(set(tipos_requeridos) & tipos_box_ids) if tipos_requeridos else len(tipos_box_ids)
                
                soluciones.append({
                    'idbox': box.idbox,
                    'nombre': f"Box {box.idbox}",
                    'pasillo': box.pasillobox,
                    'estado': box.estadobox,
                    'tipos': tipos_box,
                    'compatibilidad_especialidades': compatibilidad,
                    'porcentaje_compatibilidad': f"{(compatibilidad / len(tipos_requeridos) * 100):.1f}%" if tipos_requeridos else '100%'
                })
            
            # Ordenar por compatibilidad
            soluciones.sort(key=lambda x: x['compatibilidad_especialidades'], reverse=True)
            
            return Response({
                "soluciones_alternativas": soluciones,
                "total_alternativas": len(soluciones),
                "parametros_busqueda": {
                    "fecha": str(fecha),
                    "hora_inicio": str(hora_inicio),
                    "hora_fin": str(hora_fin),
                    "duracion_minutos": duracion,
                    "especialidades_solicitadas": especialidades,
                    "tipos_ids_requeridos": tipos_requeridos
                }
            })
            
        except Exception as e:
            traceback.print_exc()
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ListarEspecialidadesView(APIView):
    """Vista para listar todas las especialidades disponibles"""
    def get(self, request):
        try:
            especialidades = Tipobox.objects.all().values('idtipobox', 'tipo').order_by('tipo')
            
            return Response({
                "especialidades": list(especialidades),
                "total": especialidades.count()
            })
            
        except Exception as e:
            traceback.print_exc()
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class EstadisticasConflictosView(APIView):
    """Vista para obtener estadísticas de conflictos"""
    def post(self, request):
        try:
            fecha_inicio = request.data.get("fecha_inicio")
            fecha_fin = request.data.get("fecha_fin", fecha_inicio)
            
            if not fecha_inicio:
                return Response(
                    {"error": "fecha_inicio es requerida"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Convertir strings a objetos date si es necesario
            if isinstance(fecha_inicio, str):
                fecha_inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
            if isinstance(fecha_fin, str):
                fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
            
            resolutor = ResolutorConflictosAgenda()
            estadisticas = resolutor.obtener_estadisticas_conflictos(fecha_inicio, fecha_fin)
            
            return Response(estadisticas)
            
        except Exception as e:
            traceback.print_exc()
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class InfoReservaView(APIView):
    """Vista para obtener información detallada de una reserva específica"""
    def get(self, request, reserva_id):
        try:
            reserva = Agendabox.objects.get(id=reserva_id)
            
            data = {
                'id': reserva.id,
                'fecha': reserva.fechaagenda.strftime('%Y-%m-%d') if reserva.fechaagenda else None,
                'hora_inicio': str(reserva.horainicioagenda) if reserva.horainicioagenda else None,
                'hora_fin': str(reserva.horafinagenda) if reserva.horafinagenda else None,
                'medico': {
                    'id': reserva.idmedico.idmedico if reserva.idmedico else None,
                    'nombre': reserva.idmedico.nombre if reserva.idmedico else 'N/A',
                    'especialidad': getattr(reserva.idmedico, 'especialidad', 'N/A') if reserva.idmedico else 'N/A'
                },
                'box_actual': {
                    'id': reserva.idbox.idbox if reserva.idbox else None,
                    'nombre': f"Box {reserva.idbox.idbox}" if reserva.idbox else 'N/A',
                    'pasillo': reserva.idbox.pasillobox if reserva.idbox else 'N/A',
                    'estado': reserva.idbox.estadobox if reserva.idbox else 'N/A'
                },
                # Campos que no existen en el modelo real
                'paciente': {
                    'id': None,
                    'nombre': 'N/A',
                    'rut': 'N/A'
                },
                'estado': 'N/A',
                'observaciones': reserva.observaciones if reserva.observaciones else '',
                # Campos de timestamp que no existen
                'creado_en': None,
                'actualizado_en': None
            }
            
            return Response(data)
            
        except Agendabox.DoesNotExist:
            return Response(
                {"error": f"Reserva con ID {reserva_id} no encontrada"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            traceback.print_exc()
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
"""
Vistas para manejar inventarios de boxes y agendas extendidas
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from datetime import datetime
from ..mongo_models import InventarioBox, AgendaExtendida, Implemento, MedicoEnAgenda
from ..models import Box, Agendabox
import json
from bson import ObjectId
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.views import View


@method_decorator(csrf_exempt, name='dispatch')
class InventarioBoxView(View):
    """Vista simple para inventario - sin DRF para evitar problemas de autenticación"""
    
    def get(self, request, box_id=None):
        """Obtener inventario de un box específico o todos"""
        try:
            if box_id:
                # Inventario de un box específico
                inventario = InventarioBox.objects(box_id=box_id).first()
                if not inventario:
                    return JsonResponse({
                        'success': True,
                        'data': {
                            'box_id': box_id,
                            'implementos': [],
                            'total_implementos': 0,
                            'implementos_operacionales': 0,
                            'implementos_no_operacionales': 0
                        }
                    })
                
                data = {
                    'box_id': inventario.box_id,
                    'implementos': [],
                    'total_implementos': len(inventario.implementos),
                    'implementos_operacionales': 0,
                    'implementos_no_operacionales': 0,
                    'updated_at': inventario.updated_at.isoformat(),
                    'updated_by': inventario.updated_by
                }
                
                for impl in inventario.implementos:
                    implemento_data = {
                        'nombre': impl.nombre,
                        'descripcion': impl.descripcion,
                        'marca': impl.marca,
                        'modelo': impl.modelo,
                        'numero_serie': impl.numero_serie,
                        'operacional': impl.operacional,
                        'fecha_ultimo_mantenimiento': impl.fecha_ultimo_mantenimiento.isoformat() if impl.fecha_ultimo_mantenimiento else None,
                        'fecha_proximo_mantenimiento': impl.fecha_proximo_mantenimiento.isoformat() if impl.fecha_proximo_mantenimiento else None,
                        'observaciones': impl.observaciones,
                        'fecha_agregado': impl.fecha_agregado.isoformat()
                    }
                    data['implementos'].append(implemento_data)
                    
                    if impl.operacional:
                        data['implementos_operacionales'] += 1
                    else:
                        data['implementos_no_operacionales'] += 1
                
                return JsonResponse({
                    'success': True,
                    'data': data
                })
            else:
                # Todos los inventarios
                inventarios = InventarioBox.objects.all()
                result = []
                
                for inventario in inventarios:
                    operacionales = sum(1 for impl in inventario.implementos if impl.operacional)
                    no_operacionales = len(inventario.implementos) - operacionales
                    
                    result.append({
                        'box_id': inventario.box_id,
                        'total_implementos': len(inventario.implementos),
                        'implementos_operacionales': operacionales,
                        'implementos_no_operacionales': no_operacionales,
                        'updated_at': inventario.updated_at.isoformat()
                    })
                
                return JsonResponse({
                    'success': True,
                    'data': result
                })
                
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
    
    def post(self, request, box_id):
        """Agregar implemento al inventario del box"""
        try:
            # Verificar que el box existe
            try:
                Box.objects.get(idbox=box_id)
            except Box.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': f'Box {box_id} no existe'
                }, status=404)
            
            # Obtener o crear inventario
            inventario = InventarioBox.objects(box_id=box_id).first()
            if not inventario:
                inventario = InventarioBox(box_id=box_id)
            
            # Datos del implemento
            data = request.data
            nombre = data.get('nombre')
            if not nombre:
                return JsonResponse({
                    'success': False,
                    'error': 'El nombre del implemento es requerido'
                }, status=400)
            
            # Agregar implemento
            implemento = inventario.agregar_implemento(
                nombre=nombre,
                descripcion=data.get('descripcion'),
                marca=data.get('marca'),
                modelo=data.get('modelo'),
                numero_serie=data.get('numero_serie'),
                operacional=data.get('operacional', True),
                observaciones=data.get('observaciones')
            )
            
            # Fechas de mantenimiento si se proporcionan
            if data.get('fecha_ultimo_mantenimiento'):
                implemento.fecha_ultimo_mantenimiento = datetime.fromisoformat(data['fecha_ultimo_mantenimiento'].replace('Z', '+00:00'))
            
            if data.get('fecha_proximo_mantenimiento'):
                implemento.fecha_proximo_mantenimiento = datetime.fromisoformat(data['fecha_proximo_mantenimiento'].replace('Z', '+00:00'))
            
            inventario.updated_by = 'sistema'
            inventario.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Implemento "{nombre}" agregado al box {box_id}',
                'implemento': {
                    'nombre': implemento.nombre,
                    'descripcion': implemento.descripcion,
                    'operacional': implemento.operacional,
                    'fecha_agregado': implemento.fecha_agregado.isoformat()
                }
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
    
    def put(self, request, box_id):
        """Actualizar estado operacional de un implemento"""
        try:
            import json
            data = json.loads(request.body)
            
            inventario = InventarioBox.objects(box_id=box_id).first()
            if not inventario:
                return JsonResponse({
                    'success': False,
                    'error': f'No hay inventario para el box {box_id}'
                }, status=404)
            
            nombre_implemento = data.get('nombre')
            nuevo_estado = data.get('operacional')
            observaciones = data.get('observaciones')
            
            if nombre_implemento is None or nuevo_estado is None:
                return JsonResponse({
                    'success': False,
                    'error': 'Se requiere nombre del implemento y nuevo estado operacional'
                }, status=400)
            
            # Buscar el implemento
            implemento_encontrado = next((impl for impl in inventario.implementos if impl.nombre == nombre_implemento), None)
            
            if not implemento_encontrado:
                return JsonResponse({
                    'success': False,
                    'error': f'Implemento "{nombre_implemento}" no encontrado'
                }, status=404)
            
            # Actualizar estado y observaciones
            implemento_encontrado.operacional = nuevo_estado
            if observaciones is not None:
                implemento_encontrado.observaciones = observaciones
            
            inventario.updated_by = 'sistema'
            inventario.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Estado del implemento "{nombre_implemento}" actualizado',
                'implemento': {
                    'nombre': implemento_encontrado.nombre,
                    'operacional': implemento_encontrado.operacional,
                    'observaciones': implemento_encontrado.observaciones
                }
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)


# Mantener las otras vistas como estaban pero con las mismas modificaciones
@method_decorator(csrf_exempt, name='dispatch')
class AgendaExtendidaView(APIView):
    """Vista para manejar agendas con múltiples médicos"""
    authentication_classes = []
    permission_classes = [AllowAny]
    
    def get(self, request, agenda_id=None):
        """Obtener datos extendidos de una agenda"""
        try:
            if agenda_id:
                # Agenda específica
                agenda_ext = AgendaExtendida.objects(agenda_id=agenda_id).first()
                if not agenda_ext:
                    return Response({
                        'success': True,
                        'data': {
                            'agenda_id': agenda_id,
                            'medicos': [],
                            'tipo_procedimiento': None,
                            'equipamiento_requerido': [],
                            'notas_adicionales': None
                        }
                    })
                
                data = {
                    'agenda_id': agenda_ext.agenda_id,
                    'medicos': [],
                    'tipo_procedimiento': agenda_ext.tipo_procedimiento,
                    'equipamiento_requerido': agenda_ext.equipamiento_requerido,
                    'preparacion_especial': agenda_ext.preparacion_especial,
                    'notas_adicionales': agenda_ext.notas_adicionales,
                    'updated_at': agenda_ext.updated_at.isoformat(),
                    'updated_by': agenda_ext.updated_by
                }
                
                for medico in agenda_ext.medicos:
                    medico_data = {
                        'medico_id': medico.medico_id,
                        'es_principal': medico.es_principal,
                        'rol': medico.rol,
                        'hora_inicio': medico.hora_inicio.isoformat() if medico.hora_inicio else None,
                        'hora_fin': medico.hora_fin.isoformat() if medico.hora_fin else None,
                        'observaciones': medico.observaciones
                    }
                    data['medicos'].append(medico_data)
                
                return Response({
                    'success': True,
                    'data': data
                })
            else:
                # Todas las agendas extendidas
                agendas_ext = AgendaExtendida.objects.all()
                result = []
                
                for agenda in agendas_ext:
                    result.append({
                        'agenda_id': agenda.agenda_id,
                        'total_medicos': len(agenda.medicos),
                        'medico_principal': agenda.get_medico_principal().medico_id if agenda.get_medico_principal() else None,
                        'tipo_procedimiento': agenda.tipo_procedimiento,
                        'updated_at': agenda.updated_at.isoformat()
                    })
                
                return Response({
                    'success': True,
                    'data': result
                })
                
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request, agenda_id):
        """Agregar médico a una agenda o crear agenda extendida"""
        try:
            # Verificar que la agenda existe
            try:
                Agendabox.objects.get(id=agenda_id)
            except Agendabox.DoesNotExist:
                return Response({
                    'success': False,
                    'error': f'Agenda {agenda_id} no existe'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Obtener o crear agenda extendida
            agenda_ext = AgendaExtendida.objects(agenda_id=agenda_id).first()
            if not agenda_ext:
                agenda_ext = AgendaExtendida(agenda_id=agenda_id)
            
            # Datos del médico
            data = request.data
            medico_id = data.get('medico_id')
            if not medico_id:
                return Response({
                    'success': False,
                    'error': 'El ID del médico es requerido'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verificar si el médico ya está en la agenda
            for medico in agenda_ext.medicos:
                if medico.medico_id == medico_id:
                    return Response({
                        'success': False,
                        'error': f'El médico {medico_id} ya está asignado a esta agenda'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Agregar médico
            medico = agenda_ext.agregar_medico(
                medico_id=medico_id,
                es_principal=data.get('es_principal', False),
                rol=data.get('rol'),
                hora_inicio=datetime.fromisoformat(data['hora_inicio'].replace('Z', '+00:00')) if data.get('hora_inicio') else None,
                hora_fin=datetime.fromisoformat(data['hora_fin'].replace('Z', '+00:00')) if data.get('hora_fin') else None,
                observaciones=data.get('observaciones')
            )
            
            # Actualizar otros campos si se proporcionan
            if data.get('tipo_procedimiento'):
                agenda_ext.tipo_procedimiento = data['tipo_procedimiento']
            
            if data.get('equipamiento_requerido'):
                agenda_ext.equipamiento_requerido = data['equipamiento_requerido']
            
            if data.get('notas_adicionales'):
                agenda_ext.notas_adicionales = data['notas_adicionales']
            
            agenda_ext.updated_by = 'sistema'
            agenda_ext.registrar_cambio(
                usuario=agenda_ext.updated_by,
                accion='agregar_medico',
                detalle=f'Médico {medico_id} agregado con rol {medico.rol}'
            )
            agenda_ext.save()
            
            return Response({
                'success': True,
                'message': f'Médico {medico_id} agregado a la agenda {agenda_id}',
                'medico': {
                    'medico_id': medico.medico_id,
                    'es_principal': medico.es_principal,
                    'rol': medico.rol
                }
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request, agenda_id):
        """Remover médico de una agenda"""
        try:
            agenda_ext = AgendaExtendida.objects(agenda_id=agenda_id).first()
            if not agenda_ext:
                return Response({
                    'success': False,
                    'error': f'No hay datos extendidos para la agenda {agenda_id}'
                }, status=status.HTTP_404_NOT_FOUND)
            
            medico_id = request.data.get('medico_id')
            if not medico_id:
                return Response({
                    'success': False,
                    'error': 'El ID del médico es requerido'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Buscar y remover el médico
            medico_removido = None
            for i, medico in enumerate(agenda_ext.medicos):
                if medico.medico_id == medico_id:
                    medico_removido = agenda_ext.medicos.pop(i)
                    break
            
            if not medico_removido:
                return Response({
                    'success': False,
                    'error': f'Médico {medico_id} no encontrado en la agenda'
                }, status=status.HTTP_404_NOT_FOUND)
            
            agenda_ext.updated_by = 'sistema'
            agenda_ext.registrar_cambio(
                usuario=agenda_ext.updated_by,
                accion='remover_medico',
                detalle=f'Médico {medico_id} removido'
            )
            agenda_ext.save()
            
            return Response({
                'success': True,
                'message': f'Médico {medico_id} removido de la agenda {agenda_id}'
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DashboardOptimizadoView(APIView):
    """Vista optimizada del dashboard usando cache MongoDB"""
    authentication_classes = []
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Obtener métricas del dashboard desde cache optimizado"""
        try:
            from ..modulos.dashboard_optimizer import DashboardCacheService
            
            periodo = request.GET.get('range', 'week')
            forzar_refresh = request.GET.get('refresh', 'false').lower() == 'true'
            
            # Obtener datos desde cache optimizado
            dashboard_data = DashboardCacheService.obtener_dashboard_optimizado(
                periodo=periodo, 
                forzar_refresh=forzar_refresh
            )
            
            return Response({
                'success': True,
                'data': dashboard_data,
                'optimizado': True,
                'mensaje': 'Datos obtenidos desde cache optimizado' if not forzar_refresh else 'Cache regenerado'
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error en dashboard optimizado: {str(e)}',
                'usar_fallback': True
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CacheStatusView(APIView):
    """Vista para monitorear el estado del cache del dashboard"""
    authentication_classes = []
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Obtener estado actual del cache"""
        try:
            from ..modulos.cache_manager import CacheManager
            from ..mongo_models import DashboardCache
            
            # Obtener estado de todos los períodos
            periodos = ['day', 'week', 'month', 'year']
            estado_cache = {}
            
            for periodo in periodos:
                cache_obj = CacheManager.obtener_cache_valido(periodo)
                
                if cache_obj:
                    tiempo_restante = (cache_obj.expires_at - datetime.now()).total_seconds()
                    estado_cache[periodo] = {
                        'valido': True,
                        'creado_en': cache_obj.created_at.isoformat(),
                        'expira_en': cache_obj.expires_at.isoformat(),
                        'tiempo_restante_segundos': max(0, int(tiempo_restante)),
                        'tiempo_calculo_ms': cache_obj.tiempo_calculo_ms,
                        'necesita_actualizacion': CacheManager.cache_necesita_actualizacion(periodo)
                    }
                else:
                    estado_cache[periodo] = {
                        'valido': False,
                        'creado_en': None,
                        'expira_en': None,
                        'tiempo_restante_segundos': 0,
                        'tiempo_calculo_ms': None,
                        'necesita_actualizacion': True
                    }
            
            # Estadísticas generales
            total_caches = DashboardCache.objects.count()
            caches_validos = len([c for c in estado_cache.values() if c['valido']])
            
            return Response({
                'success': True,
                'data': {
                    'estado_por_periodo': estado_cache,
                    'resumen': {
                        'total_caches_historicos': total_caches,
                        'caches_validos_actuales': caches_validos,
                        'caches_total_periodos': len(periodos),
                        'porcentaje_cobertura': round((caches_validos / len(periodos)) * 100, 2)
                    },
                    'timestamp': datetime.now().isoformat()
                }
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Invalidar manualmente todo el cache"""
        try:
            from ..modulos.cache_manager import CacheManager
            
            # Invalidar cache
            CacheManager.invalidar_cache_dashboard(
                motivo="invalidacion_manual",
                detalles={'usuario': request.user.username if request.user.is_authenticated else 'anonimo'}
            )
            
            return Response({
                'success': True,
                'message': 'Cache invalidado manualmente. Se regenerará automáticamente en segundo plano.'
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

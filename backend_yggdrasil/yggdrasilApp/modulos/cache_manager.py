"""
Sistema de gestión automática del cache del dashboard
Se invalida automáticamente cuando hay cambios en agendas
"""
from datetime import datetime, timedelta
from django.core.cache import cache
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import logging

logger = logging.getLogger(__name__)


class CacheManager:
    """Gestor central del cache que se actualiza automáticamente"""
    
    CACHE_KEYS = {
        'dashboard_day': 'dashboard_cache_day',
        'dashboard_week': 'dashboard_cache_week', 
        'dashboard_month': 'dashboard_cache_month',
        'dashboard_year': 'dashboard_cache_year',
    }
    
    @staticmethod
    def invalidar_cache_dashboard(motivo="cambio_agenda", detalles=None):
        """Invalida el cache del dashboard y programa regeneración"""
        try:
            logger.info(f"Invalidando cache del dashboard. Motivo: {motivo}")
            
            # Invalidar cache en Django
            for key in CacheManager.CACHE_KEYS.values():
                cache.delete(key)
            
            # Invalidar cache en MongoDB
            from ..mongo_models import DashboardCache
            DashboardCache.objects(expires_at__gt=datetime.now()).update(
                set__expires_at=datetime.now() - timedelta(seconds=1)
            )
            
            # Notificar por WebSocket que el dashboard necesita actualizarse
            CacheManager._notificar_invalidacion_cache()
            
            # Programar regeneración asíncrona del cache
            CacheManager._programar_regeneracion_cache()
            
            logger.info("Cache invalidado correctamente")
            
        except Exception as e:
            logger.error(f"Error invalidando cache: {str(e)}")
    
    @staticmethod
    def _notificar_invalidacion_cache():
        """Notifica via WebSocket que el cache fue invalidado"""
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                'dashboard',
                {
                    'type': 'cache_invalidated',
                    'message': {
                        'evento': 'cache_invalidado',
                        'timestamp': datetime.now().isoformat(),
                        'requiere_refresh': True
                    }
                }
            )
        except Exception as e:
            logger.error(f"Error enviando notificación WebSocket: {str(e)}")
    
    @staticmethod
    def _programar_regeneracion_cache():
        """Programa la regeneración del cache de forma asíncrona"""
        try:
            # Importar aquí para evitar circular imports
            from ..modulos.dashboard_optimizer import DashboardOptimizer
            import threading
            
            def regenerar_cache():
                """Regenera el cache en background"""
                try:
                    periodos = ['day', 'week', 'month']
                    for periodo in periodos:
                        DashboardOptimizer.precalcular_dashboard(periodo)
                        logger.info(f"Cache regenerado para período: {periodo}")
                except Exception as e:
                    logger.error(f"Error regenerando cache: {str(e)}")
            
            # Ejecutar en hilo separado para no bloquear
            thread = threading.Thread(target=regenerar_cache, daemon=True)
            thread.start()
            
        except Exception as e:
            logger.error(f"Error programando regeneración: {str(e)}")
    
    @staticmethod
    def obtener_cache_valido(periodo='week'):
        """Obtiene cache válido o None si no existe/expiró"""
        try:
            from ..mongo_models import DashboardCache
            
            cache_obj = DashboardCache.objects(
                periodo=periodo,
                expires_at__gt=datetime.now()
            ).order_by('-created_at').first()
            
            return cache_obj
            
        except Exception as e:
            logger.error(f"Error obteniendo cache: {str(e)}")
            return None
    
    @staticmethod
    def cache_necesita_actualizacion(periodo='week', umbral_minutos=15):
        """Verifica si el cache necesita actualización proactiva"""
        try:
            cache_obj = CacheManager.obtener_cache_valido(periodo)
            
            if not cache_obj:
                return True
            
            # Si el cache tiene más de X minutos, consideramos actualización
            tiempo_cache = datetime.now() - cache_obj.created_at
            return tiempo_cache.total_seconds() > (umbral_minutos * 60)
            
        except Exception as e:
            logger.error(f"Error verificando cache: {str(e)}")
            return True


class CacheSignals:
    """Señales para invalidación automática del cache"""
    
    @staticmethod
    def agenda_creada(agenda_obj, **kwargs):
        """Cuando se crea una nueva agenda"""
        CacheManager.invalidar_cache_dashboard(
            motivo="agenda_creada",
            detalles={
                'agenda_id': agenda_obj.id,
                'box_id': agenda_obj.idbox_id,
                'fecha': agenda_obj.fechaagenda.isoformat() if agenda_obj.fechaagenda else None,
                'es_medica': agenda_obj.esMedica
            }
        )
    
    @staticmethod
    def agenda_modificada(agenda_obj, **kwargs):
        """Cuando se modifica una agenda existente"""
        CacheManager.invalidar_cache_dashboard(
            motivo="agenda_modificada",
            detalles={
                'agenda_id': agenda_obj.id,
                'box_id': agenda_obj.idbox_id,
                'cambios': kwargs.get('cambios', {})
            }
        )
    
    @staticmethod
    def agenda_eliminada(agenda_id, box_id, **kwargs):
        """Cuando se elimina una agenda"""
        CacheManager.invalidar_cache_dashboard(
            motivo="agenda_eliminada",
            detalles={
                'agenda_id': agenda_id,
                'box_id': box_id
            }
        )
    
    @staticmethod
    def bulk_agendas_creadas(cantidad_agendas, **kwargs):
        """Cuando se crean múltiples agendas (desde thread externo)"""
        CacheManager.invalidar_cache_dashboard(
            motivo="bulk_agendas_thread",
            detalles={
                'cantidad': cantidad_agendas,
                'fuente': 'thread_externo'
            }
        )
    
    @staticmethod
    def box_estado_cambiado(box_id, estado_anterior, estado_nuevo, **kwargs):
        """Cuando cambia el estado de un box"""
        # Solo invalidar si el cambio afecta disponibilidad
        if estado_anterior != estado_nuevo:
            CacheManager.invalidar_cache_dashboard(
                motivo="box_estado_cambiado",
                detalles={
                    'box_id': box_id,
                    'estado_anterior': estado_anterior,
                    'estado_nuevo': estado_nuevo
                }
            )

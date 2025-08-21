
from ..models import Agendabox
from django.db.models import Q
from .observable import Observable
from .cache_manager import CacheSignals
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import hashlib

class ActualizadorDatos(Observable):
    def __init__(self):
        super().__init__()
        # ⭐ Cache temporal para evitar duplicados en la misma ejecución
        self._agendas_procesadas_cache = set()

    def _generar_hash_agenda(self, agenda):
        """Generar un hash único para una agenda"""
        datos = f"{agenda.idmedico.idmedico}_{agenda.idbox.idbox}_{agenda.fechaagenda}_{agenda.horainicioagenda}_{agenda.horafinagenda}"
        return hashlib.md5(datos.encode()).hexdigest()

    def actualizar(self, nuevos_agenda_boxes):
        if not nuevos_agenda_boxes:
            print("ℹ️ No hay datos para procesar")
            return
            
        print(f"🔍 Procesando {len(nuevos_agenda_boxes)} registros recibidos")
        
        actualizo = False
        agenda_to_save = []
        duplicados_bd = 0
        duplicados_cache = 0
        
        for agenda, accion in nuevos_agenda_boxes:
            if accion == 'INSERT':
                # ⭐ GENERAR HASH ÚNICO PARA ESTA AGENDA
                hash_agenda = self._generar_hash_agenda(agenda)
                
                # ⭐ VERIFICAR CACHE TEMPORAL PRIMERO (más rápido)
                if hash_agenda in self._agendas_procesadas_cache:
                    duplicados_cache += 1
                    print(f"⚡ Duplicado en cache detectado: {hash_agenda[:8]}...")
                    continue
                
                # ⭐ VERIFICAR SI YA EXISTE EN LA BASE DE DATOS
                existe = Agendabox.objects.filter(
                    idmedico=agenda.idmedico,
                    idbox=agenda.idbox,
                    fechaagenda=agenda.fechaagenda,
                    horainicioagenda=agenda.horainicioagenda,
                    horafinagenda=agenda.horafinagenda
                ).exists()
                
                if not existe:
                    agenda_to_save.append(agenda)
                    # ⭐ AGREGAR AL CACHE TEMPORAL
                    self._agendas_procesadas_cache.add(hash_agenda)
                    actualizo = True
                    print(f"✅ Agenda nueva válida: Box {agenda.idbox.idbox}, {agenda.fechaagenda} {agenda.horainicioagenda}")
                else:
                    duplicados_bd += 1
                    print(f"⚠️ Duplicado en BD detectado: Box {agenda.idbox.idbox}, {agenda.fechaagenda} {agenda.horainicioagenda}")
        
        # ⭐ LIMPIAR CACHE DESPUÉS DE UN TIEMPO (evitar crecimiento infinito)
        if len(self._agendas_procesadas_cache) > 1000:
            self._agendas_procesadas_cache.clear()
            print("🧹 Cache temporal limpiado")

        # Resumen del procesamiento
        print(f"📊 Resumen: {len(agenda_to_save)} nuevas, {duplicados_bd} duplicadas en BD, {duplicados_cache} duplicadas en cache")

        # Si se encontraron nuevos registros únicos, se guardan de una vez
        if actualizo and agenda_to_save:
            cantidad_nuevas = len(agenda_to_save)
            print(f"💾 Guardando {cantidad_nuevas} nuevas agendas únicas")
            
            try:
                Agendabox.objects.bulk_create(agenda_to_save)
                print(f"✅ Guardado exitoso de {cantidad_nuevas} agendas")
                
                # ⭐ NUEVO: Invalidar cache automáticamente
                CacheSignals.bulk_agendas_creadas(
                    cantidad_agendas=cantidad_nuevas,
                    fuente='thread_externo'
                )
                
                print('🔔 Enviando notificación WebSocket...')
                # Notificar por websocket usando Channels
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    'agendas',
                    {
                        'type': 'agenda_update',
                        'message': 'actualizacion_agenda'
                    }
                )
                # Si quieres mantener la notificación a observadores Python:
                self.notificar_observadores()
                
            except Exception as e:
                print(f"❌ Error al guardar agendas: {e}")
                # Limpiar cache en caso de error para reintentarlo
                for agenda in agenda_to_save:
                    hash_agenda = self._generar_hash_agenda(agenda)
                    self._agendas_procesadas_cache.discard(hash_agenda)
                
        elif not agenda_to_save:
            print("ℹ️ No hay nuevas agendas para procesar (todas eran duplicadas)")
        else:
            print("ℹ️ No se encontraron cambios para procesar")


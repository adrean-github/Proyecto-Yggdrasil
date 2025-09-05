from django.db.models import Q, Count, Subquery, OuterRef, Case, When, Value, IntegerField, Prefetch
from django.utils import timezone
from django.core.cache import cache
from ..models import Box, Agendabox, Tipobox, BoxTipoBox
import logging
from datetime import datetime, timedelta, time

logger = logging.getLogger(__name__)

class ResolutorConflictosAgenda:
    """Clase mejorada para resolver conflictos de agenda con verificación robusta de disponibilidad"""
    
    def __init__(self):
        self.criterios_peso = {
            'mismo_pasillo': 15,
            'carga_diaria': 3, 
            'uso_historico': 2,  
            'tipo_principal_coincide': 25,  
            'tipo_secundario_coincide': 10,  
            'equipamiento_compatible': 8,
            'proximidad_tiempo': 5,
            'disponibilidad_continua': 7,  
            'preferencia_medico': 12, 
            'eficiencia_traslado': 4 
        }
        
        self.cache_timeout = 300
    
    def _normalizar_horarios(self, hora_inicio, hora_fin, fecha):
        """Normaliza horarios para asegurar comparaciones correctas"""
        if isinstance(hora_inicio, str):
            try:
                hora_inicio = datetime.strptime(hora_inicio, '%H:%M:%S').time()
            except ValueError:
                hora_inicio = datetime.strptime(hora_inicio, '%H:%M').time()
        if isinstance(hora_fin, str):
            try:
                hora_fin = datetime.strptime(hora_fin, '%H:%M:%S').time()
            except ValueError:
                hora_fin = datetime.strptime(hora_fin, '%H:%M').time()
        
        inicio_dt = datetime.combine(fecha, hora_inicio)
        fin_dt = datetime.combine(fecha, hora_fin)
        
        return inicio_dt, fin_dt, hora_inicio, hora_fin
    
    def encontrar_conflictos(self, fecha, hora_inicio, hora_fin, excluir_ids=None):
        """Encuentra todos los conflictos en un rango horario con verificación robusta"""
        if excluir_ids is None:
            excluir_ids = []
        
        inicio_dt, fin_dt, hora_inicio_norm, hora_fin_norm = self._normalizar_horarios(
            hora_inicio, hora_fin, fecha
        )
        
        conflictos = Agendabox.objects.filter(
            fechaagenda=fecha,
            horainicioagenda__lt=fin_dt.time(),
            horafinagenda__gt=inicio_dt.time()
        ).exclude(id__in=excluir_ids).select_related('idbox', 'idmedico')
        
        return conflictos
    
    def verificar_disponibilidad_box(self, box_id, fecha, hora_inicio, hora_fin, excluir_ids=None):
        """Verifica específicamente si un box está disponible en el horario exacto"""
        if excluir_ids is None:
            excluir_ids = []
        
        inicio_dt, fin_dt, hora_inicio_norm, hora_fin_norm = self._normalizar_horarios(
            hora_inicio, hora_fin, fecha
        )
        
        conflictos = Agendabox.objects.filter(
            idbox=box_id,
            fechaagenda=fecha,
            horainicioagenda__lt=fin_dt.time(),
            horafinagenda__gt=inicio_dt.time()
        ).exclude(id__in=excluir_ids).exists()
        
        return not conflictos
    
    def obtener_boxes_libres(self, fecha, hora_inicio, hora_fin, excluir_ids=None, tipos_requeridos=None):
        """Obtiene boxes libres con verificación robusta de disponibilidad"""
        if excluir_ids is None:
            excluir_ids = []
        
        inicio_dt, fin_dt, hora_inicio_norm, hora_fin_norm = self._normalizar_horarios(
            hora_inicio, hora_fin, fecha
        )
        
        boxes_ocupados_subquery = Agendabox.objects.filter(
            fechaagenda=fecha,
            horainicioagenda__lt=fin_dt.time(),
            horafinagenda__gt=inicio_dt.time()
        ).exclude(id__in=excluir_ids).values('idbox')
        
        boxes_libres = Box.objects.exclude(
            idbox__in=Subquery(boxes_ocupados_subquery)
        ).filter(
            Q(estadobox__icontains='habilitado') | 
            Q(estadobox__icontains='activo') | 
            Q(estadobox__isnull=True)
        )
        
        # CORRECCIÓN: Usar boxtipobox en lugar de tipoboxes
        if tipos_requeridos:
            boxes_libres = boxes_libres.filter(
                boxtipobox__idtipobox__in=tipos_requeridos
            ).distinct()
        
        boxes_libres = boxes_libres.prefetch_related(
            Prefetch('boxtipobox_set', queryset=BoxTipoBox.objects.select_related('idtipobox'))
        )
        
        logger.info(f"Boxes libres encontrados para {fecha} {hora_inicio_norm}-{hora_fin_norm}: {boxes_libres.count()}")
        
        return boxes_libres
    
    def obtener_tipos_requeridos(self, reservas_conflicto):
        """Obtiene los tipos de box requeridos basados en las reservas en conflicto"""
        tipos_requeridos = set()
        
        for reserva in reservas_conflicto:
            if reserva.idbox:
                box_tipos = BoxTipoBox.objects.filter(idbox=reserva.idbox.idbox)
                for box_tipo in box_tipos:
                    tipos_requeridos.add((box_tipo.idtipobox.idtipobox, box_tipo.tipoprincipal))

        tipos_principales = [tipo_id for tipo_id, es_principal in tipos_requeridos if es_principal]
        tipos_secundarios = [tipo_id for tipo_id, es_principal in tipos_requeridos if not es_principal]
        
        return tipos_principales, tipos_secundarios
    
    def calcular_disponibilidad_continua(self, box, fecha, hora_inicio, hora_fin):
        """Calcula si el box tiene disponibilidad continua antes/después"""
        try:
            inicio_dt = datetime.combine(fecha, hora_inicio)
            fin_dt = datetime.combine(fecha, hora_fin)
            
            ventana_antes = inicio_dt - timedelta(hours=2)
            ventana_despues = fin_dt + timedelta(hours=2)
            
            inicio_dia = datetime.combine(fecha, time.min)
            fin_dia = datetime.combine(fecha, time.max)
            
            ventana_antes = max(ventana_antes, inicio_dia)
            ventana_despues = min(ventana_despues, fin_dia)
            
            reservas_cercanas = Agendabox.objects.filter(
                idbox=box.idbox,
                fechaagenda=fecha,
                horainicioagenda__lt=ventana_despues.time(),
                horafinagenda__gt=ventana_antes.time()
            ).count()
            
            return max(0, 5 - reservas_cercanas)
            
        except Exception as e:
            logger.error(f"Error calculando disponibilidad continua para box {box.idbox}: {str(e)}")
            return 0
    
    def calcular_preferencia_medico(self, box, medico_ids, dias_historico=30):
        """Calcula cuánto usa cada médico este box históricamente"""
        if not medico_ids:
            return 0
            
        fecha_limite = timezone.now().date() - timedelta(days=dias_historico)
        
        total_usos = Agendabox.objects.filter(
            idbox=box.idbox,
            idmedico__idmedico__in=medico_ids,
            fechaagenda__gte=fecha_limite
        ).count()
        
        return min(total_usos, 10)
    
    def calcular_compatibilidad_tipos(self, box, tipos_principales, tipos_secundarios):
        """Calcula la compatibilidad de tipos entre el box y los requeridos"""
        box_tipos = BoxTipoBox.objects.filter(idbox=box.idbox)
        box_tipos_principales = [bt.idtipobox.idtipobox for bt in box_tipos if bt.tipoprincipal]
        box_tipos_secundarios = [bt.idtipobox.idtipobox for bt in box_tipos if not bt.tipoprincipal]
        
        coincidencias_principales = len(set(tipos_principales) & set(box_tipos_principales))
        coincidencias_secundarias = len(set(tipos_secundarios) & set(box_tipos_secundarios))
        
        return coincidencias_principales, coincidencias_secundarias
        
    def calcular_score_box(self, box, reservas_conflicto, fecha, tipos_principales, tipos_secundarios):
        """Calcula el score de adecuación para un box con verificación de disponibilidad"""
        score = 0
        criterios = []
        
        hora_inicio_conflicto = min(r.horainicioagenda for r in reservas_conflicto)
        hora_fin_conflicto = max(r.horafinagenda for r in reservas_conflicto)
        
        disponible = self.verificar_disponibilidad_box(
            box.idbox, fecha, hora_inicio_conflicto, hora_fin_conflicto,
            excluir_ids=[r.id for r in reservas_conflicto]
        )
        
        if not disponible:
            return {
                'score_total': -1000,  
                'criterios': [{
                    'criterio': 'BOX OCUPADO',
                    'puntos': -1000,
                    'detalle': f'Box no disponible en el horario exacto del conflicto ({hora_inicio_conflicto} - {hora_fin_conflicto})',
                    'tipo': 'penalizacion'
                }],
                'box_info': {
                    'idbox': box.idbox,
                    'nombre': f"Box {box.idbox}",
                    'pasillo': box.pasillobox,
                    'estado': box.estadobox,
                    'tipos': [{'tipo': bt.idtipobox.tipo, 'principal': bt.tipoprincipal} 
                            for bt in BoxTipoBox.objects.filter(idbox=box.idbox).select_related('idtipobox')],
                    'habilitado': False,  
                    'ocupado': True,
                    'disponible': False
                }
            }
        
        if box.estadobox and 'inhabilitado' in box.estadobox.lower():
            score -= 100
            criterios.append({
                'criterio': 'Box inhabilitado',
                'puntos': -100,
                'detalle': f"Estado: {box.estadobox}",
                'tipo': 'penalizacion'
            })
        
        carga_diaria = Agendabox.objects.filter(
            idbox=box.idbox,
            fechaagenda=fecha
        ).count()
        puntos_carga = (10 - min(carga_diaria, 10)) * self.criterios_peso['carga_diaria']
        score += puntos_carga
        criterios.append({
            'criterio': 'Carga diaria',
            'puntos': puntos_carga,
            'detalle': f"{carga_diaria} reservas este día",
            'tipo': 'eficiencia'
        })
        
        box_original = reservas_conflicto[0].idbox if reservas_conflicto[0].idbox else None
        if box_original and box.pasillobox == box_original.pasillobox:
            score += self.criterios_peso['mismo_pasillo']
            criterios.append({
                'criterio': 'Mismo pasillo',
                'puntos': self.criterios_peso['mismo_pasillo'],
                'detalle': f"Pasillo {box.pasillobox}",
                'tipo': 'ubicacion'
            })
        
        medicos_ids = [r.idmedico.idmedico for r in reservas_conflicto if r.idmedico]
        if medicos_ids:
            uso_historico = Agendabox.objects.filter(
                idbox=box.idbox,
                idmedico__idmedico__in=medicos_ids
            ).count()
            puntos_historico = min(uso_historico, 10) * self.criterios_peso['uso_historico']
            score += puntos_historico
            criterios.append({
                'criterio': 'Uso histórico',
                'puntos': puntos_historico,
                'detalle': f"{uso_historico} usos previos por los médicos",
                'tipo': 'preferencia'
            })
            
            preferencia = self.calcular_preferencia_medico(box, medicos_ids)
            puntos_preferencia = preferencia * self.criterios_peso['preferencia_medico'] / 10
            score += puntos_preferencia
            criterios.append({
                'criterio': 'Preferencia médico (30 días)',
                'puntos': puntos_preferencia,
                'detalle': f"{preferencia} usos recientes",
                'tipo': 'preferencia'
            })
        
        coincidencias_principales, coincidencias_secundarias = self.calcular_compatibilidad_tipos(
            box, tipos_principales, tipos_secundarios
        )
        
        if coincidencias_principales > 0:
            puntos_tipo_principal = coincidencias_principales * self.criterios_peso['tipo_principal_coincide']
            score += puntos_tipo_principal
            criterios.append({
                'criterio': 'Tipo principal coincide',
                'puntos': puntos_tipo_principal,
                'detalle': f"{coincidencias_principales} tipo(s) principal(es) compatible(s)",
                'tipo': 'compatibilidad'
            })
        
        if coincidencias_secundarias > 0:
            puntos_tipo_secundario = coincidencias_secundarias * self.criterios_peso['tipo_secundario_coincide']
            score += puntos_tipo_secundario
            criterios.append({
                'criterio': 'Tipo secundario coincide',
                'puntos': puntos_tipo_secundario,
                'detalle': f"{coincidencias_secundarias} tipo(s) secundario(s) compatible(s)",
                'tipo': 'compatibilidad'
            })
        
        disponibilidad = self.calcular_disponibilidad_continua(box, fecha, hora_inicio_conflicto, hora_fin_conflicto)
        puntos_disponibilidad = disponibilidad * self.criterios_peso['disponibilidad_continua'] / 5
        score += puntos_disponibilidad
        criterios.append({
            'criterio': 'Disponibilidad continua',
            'puntos': puntos_disponibilidad,
            'detalle': f"Flexibilidad de horario: {disponibilidad}/5",
            'tipo': 'eficiencia'
        })
        
        return {
            'score_total': round(score, 1),
            'criterios': criterios,
            'box_info': {
                'idbox': box.idbox,
                'nombre': f"Box {box.idbox}",
                'pasillo': box.pasillobox,
                'estado': box.estadobox,
                'tipos': [{'tipo': bt.idtipobox.tipo, 'principal': bt.tipoprincipal} 
                        for bt in BoxTipoBox.objects.filter(idbox=box.idbox).select_related('idtipobox')],
                'habilitado': not (box.estadobox and 'inhabilitado' in box.estadobox.lower()),
                'ocupado': False,
                'disponible': True
            }
        }
    
    def resolver_conflicto_agendas(self, reservas_ids):
        """Resuelve conflicto entre múltiples agendas con verificación robusta"""
        try:
            reservas = Agendabox.objects.filter(
                id__in=reservas_ids
            ).select_related("idbox", "idmedico")
            
            if len(reservas) < 2:
                return {'error': 'Se necesitan al menos 2 reservas en conflicto'}
            
            fecha = reservas[0].fechaagenda
            hora_inicio = min(r.horainicioagenda for r in reservas)
            hora_fin = max(r.horafinagenda for r in reservas)
            
            tipos_principales, tipos_secundarios = self.obtener_tipos_requeridos(reservas)
            
            boxes_libres = self.obtener_boxes_libres(
                fecha, hora_inicio, hora_fin, 
                excluir_ids=reservas_ids,
                tipos_requeridos=tipos_principales + tipos_secundarios
            )
            
            boxes_con_score = []
            for box in boxes_libres:
                resultado = self.calcular_score_box(box, reservas, fecha, tipos_principales, tipos_secundarios)
                
                if resultado['score_total'] > -500 and resultado['box_info'].get('disponible', False):
                    boxes_con_score.append(resultado)
            
            boxes_habilitados = [b for b in boxes_con_score if b['box_info']['habilitado']]
            boxes_inhabilitados = [b for b in boxes_con_score if not b['box_info']['habilitado']]
            boxes_ocupados = [b for b in boxes_con_score if b['box_info'].get('ocupado', False)]

            boxes_con_score.sort(key=lambda x: x['score_total'], reverse=True)
            boxes_habilitados.sort(key=lambda x: x['score_total'], reverse=True)
            boxes_inhabilitados.sort(key=lambda x: x['score_total'], reverse=True)

            medicos_data = []
            boxes_involucrados = []
            for r in reservas:
                if r.idmedico:
                    medicos_data.append({
                        'id': r.idmedico.idmedico,
                        'nombre': r.idmedico.nombre
                    })
                if r.idbox:
                    box_tipos = BoxTipoBox.objects.filter(idbox=r.idbox.idbox)
                    boxes_involucrados.append({
                        'id': r.idbox.idbox,
                        'nombre': f"Box {r.idbox.idbox}",
                        'pasillo': r.idbox.pasillobox,
                        'estado': r.idbox.estadobox,
                        'tipos': [{'tipo': bt.idtipobox.tipo, 'principal': bt.tipoprincipal} for bt in box_tipos]
                    })

            def calcular_duracion_conflicto(inicio, fin, fecha):
                try:
                    if isinstance(inicio, time):
                        inicio_dt = datetime.combine(fecha, inicio)
                    else:
                        inicio_dt = inicio
                        
                    if isinstance(fin, time):
                        fin_dt = datetime.combine(fecha, fin)
                    else:
                        fin_dt = fin
                    
                    duracion = fin_dt - inicio_dt
                    return duracion.total_seconds() / 3600
                    
                except Exception as e:
                    logger.error(f"Error calculando duración: {str(e)}")
                    return 0
            
            duracion_conflicto = calcular_duracion_conflicto(hora_inicio, hora_fin, fecha)
            
            return {
                'conflicto': {
                    'fecha': str(fecha),
                    'inicio': str(hora_inicio),
                    'fin': str(hora_fin),
                    'duracion_horas': round(duracion_conflicto, 2),
                    'reservas_involucradas': [{'id': r.id, 'nombre': str(r)} for r in reservas],
                    'boxes_involucrados': boxes_involucrados,
                    'medicos_involucrados': medicos_data,
                    'tipos_requeridos': {
                        'principales': [Tipobox.objects.get(idtipobox=t).tipo for t in tipos_principales],
                        'secundarios': [Tipobox.objects.get(idtipobox=t).tipo for t in tipos_secundarios]
                    }
                },
                'recomendaciones': boxes_con_score,
                'mejores_opciones': boxes_habilitados[:5],
                'opciones_emergencia': boxes_inhabilitados[:3] + boxes_ocupados[:2],
                'estadisticas': {
                    'total_boxes_evaluados': len(boxes_con_score),
                    'boxes_habilitados': len(boxes_habilitados),
                    'boxes_inhabilitados': len(boxes_inhabilitados),
                    'boxes_ocupados': len(boxes_ocupados),
                    'mejor_score': boxes_habilitados[0]['score_total'] if boxes_habilitados else 0,
                    'score_promedio': round(sum(b['score_total'] for b in boxes_habilitados) / len(boxes_habilitados), 1) if boxes_habilitados else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Error resolviendo conflicto: {str(e)}")
            return {'error': str(e)}
    
    def aplicar_cambio_box(self, reserva_id, box_destino_id, usuario, comentario=""):
        """Aplica el cambio de box con verificación de disponibilidad robusta"""
        try:
            reserva = Agendabox.objects.get(id=reserva_id)
            box_destino = Box.objects.get(idbox=box_destino_id)
            
            disponible = self.verificar_disponibilidad_box(
                box_destino_id, 
                reserva.fechaagenda, 
                reserva.horainicioagenda, 
                reserva.horafinagenda,
                excluir_ids=[reserva_id]
            )
            
            if not disponible:
                return {'error': 'El box destino no está disponible en el horario exacto'}
            
            box_original = reserva.idbox
            reserva.idbox = box_destino
            
            cambio = f"\n\n--- CAMBIO DE BOX POR CONFLICTO ---\n"
            cambio += f"Fecha cambio: {timezone.now().strftime('%Y-%m-%d %H:%M')}\n"
            cambio += f"Usuario: {usuario}\n"
            cambio += f"Box anterior: {box_original.idbox if box_original else 'N/A'}\n"
            cambio += f"Box nuevo: {box_destino.idbox}\n"
            cambio += f"Horario: {reserva.horainicioagenda} - {reserva.horafinagenda}\n"
            cambio += f"Comentario: {comentario}\n"
            cambio += f"--- FIN CAMBIO ---\n"
            
            reserva.observaciones = (reserva.observaciones or "") + cambio
            reserva.save()
            
            self._invalidar_cache_agenda(reserva.fechaagenda)
            
            logger.info(f"Cambio aplicado: Reserva {reserva_id} -> Box {box_destino_id} por {usuario}")
            
            return {
                'success': True,
                'reserva_id': reserva.id,
                'box_anterior_id': box_original.idbox if box_original else None,
                'box_nuevo_id': box_destino.idbox,
                'fecha_cambio': timezone.now(),
                'horario': f"{reserva.horainicioagenda} - {reserva.horafinagenda}",
                'comentario': comentario
            }
            
        except Exception as e:
            logger.error(f"Error aplicando cambio: {str(e)}")
            return {'error': str(e)}
    
    def _invalidar_cache_agenda(self, fecha):
        """Invalida el cache relacionado con la fecha"""
        patterns = [
            f"boxes_libres_{fecha}",
            f"conflictos_{fecha}",
            f"disponibilidad_{fecha}"
        ]
        
        for pattern in patterns:
            try:
                cache.delete(pattern)
            except:
                pass
        
        logger.info(f"Invalidados cachés para fecha {fecha}")
    
    def obtener_estadisticas_conflictos(self, fecha_inicio, fecha_fin=None):
        """Obtiene estadísticas de conflictos en un rango de fechas"""
        if fecha_fin is None:
            fecha_fin = fecha_inicio
            
        conflictos_por_dia = Agendabox.objects.filter(
            fechaagenda__range=[fecha_inicio, fecha_fin]
        ).values('fechaagenda').annotate(
            total=Count('id'),
            conflictos=Count('id', filter=Q(observaciones__icontains='conflicto') | Q(observaciones__icontains='CONFLICTO'))
        ).order_by('fechaagenda')
        
        return {
            'periodo': f"{fecha_inicio} a {fecha_fin}",
            'conflictos_por_dia': list(conflictos_por_dia),
            'total_dias': conflictos_por_dia.count(),
            'total_conflictos': sum(item['conflictos'] for item in conflictos_por_dia)
        }


def verificar_disponibilidad_box(box_id, fecha, hora_inicio, hora_fin, excluir_reserva_id=None):
    resolutor = ResolutorConflictosAgenda()
    excluir_ids = [excluir_reserva_id] if excluir_reserva_id else []
    return resolutor.verificar_disponibilidad_box(box_id, fecha, hora_inicio, hora_fin, excluir_ids)
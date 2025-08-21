"""
Servicio optimizado para pre-calcular métricas del dashboard
Reduce las consultas complejas en tiempo real
"""
from datetime import datetime, timedelta, time
from django.db.models import Count, Sum, Avg, F, ExpressionWrapper, DurationField, IntegerField
from django.db.models.functions import ExtractWeekDay, ExtractHour, ExtractMinute
from django.utils import timezone
from ..models import Box, Agendabox, BoxTipoBox, Medico
from ..mongo_models import (
    DashboardCache, EstadisticasBox, AlertasInteligentes, 
    InventarioBox, MetricasBasicas
)
import logging

logger = logging.getLogger(__name__)


class DashboardOptimizer:
    """Optimizador de consultas del dashboard usando agregaciones MongoDB"""
    
    @staticmethod
    def precalcular_dashboard(periodo='week', fecha_referencia=None):
        """Pre-calcula todas las métricas del dashboard para un período"""
        if fecha_referencia is None:
            fecha_referencia = timezone.now().date()
        
        try:
            # Calcular rango de fechas
            start_date, end_date, days = DashboardOptimizer._calcular_rango_fechas(periodo, fecha_referencia)
            
            # Verificar si ya existe cache válido
            cache_existente = DashboardCache.objects(
                periodo=periodo,
                fecha_inicio=start_date,
                expires_at__gt=datetime.now()
            ).first()
            
            if cache_existente:
                logger.info(f"Cache válido encontrado para {periodo}")
                return cache_existente
            
            # Calcular métricas
            inicio_calculo = datetime.now()
            
            # Consultas base optimizadas
            reservas_query = Agendabox.objects.filter(
                fechaagenda__gte=start_date,
                fechaagenda__lte=end_date
            ).select_related('idbox', 'idmedico')
            
            total_boxes = Box.objects.count()
            total_reservas = reservas_query.count()
            reservas_medicas = reservas_query.filter(esMedica=True).count()
            reservas_no_medicas = reservas_query.filter(esMedica=False).count()
            
            # Cálculos de ocupación optimizados
            ocupacion_data = DashboardOptimizer._calcular_ocupacion_optimizada(
                reservas_query, total_boxes, days
            )
            
            # Rankings y estadísticas
            ranking_boxes = DashboardOptimizer._calcular_ranking_boxes(reservas_query)
            box_mas_utilizado = ranking_boxes[0] if ranking_boxes else {}
            box_menos_utilizado = ranking_boxes[-1] if ranking_boxes else {}
            
            # Ocupación por turnos
            ocupacion_turnos = DashboardOptimizer._calcular_ocupacion_turnos(reservas_query)
            
            # Especialidades
            especialidades_stats = DashboardOptimizer._calcular_especialidades_optimizado()
            
            # Alertas automáticas
            alertas = DashboardOptimizer._generar_alertas_inteligentes(
                reservas_query, ranking_boxes
            )
            
            # Tendencias (últimos períodos)
            tendencia = DashboardOptimizer._calcular_tendencia_ocupacion(periodo, fecha_referencia)
            
            # Crear cache
            tiempo_calculo = (datetime.now() - inicio_calculo).total_seconds() * 1000
            
            cache = DashboardCache(
                periodo=periodo,
                fecha_inicio=start_date,
                fecha_fin=end_date,
                total_boxes=total_boxes,
                total_reservas=total_reservas,
                reservas_medicas=reservas_medicas,
                reservas_no_medicas=reservas_no_medicas,
                porcentaje_ocupacion=ocupacion_data['porcentaje'],
                tiempo_promedio_ocupacion=ocupacion_data['tiempo_promedio'],
                horas_muertas=ocupacion_data['horas_muertas'],
                box_mas_utilizado=box_mas_utilizado,
                box_menos_utilizado=box_menos_utilizado,
                ocupacion_am=ocupacion_turnos['am'],
                ocupacion_pm=ocupacion_turnos['pm'],
                ranking_boxes=ranking_boxes,
                especialidades_stats=especialidades_stats,
                alertas=alertas,
                tendencia_ocupacion=tendencia,
                tiempo_calculo_ms=int(tiempo_calculo),
                expires_at=datetime.now() + timedelta(hours=1)  # Cache por 1 hora
            )
            
            cache.save()
            logger.info(f"Dashboard cache creado para {periodo} en {tiempo_calculo:.2f}ms")
            return cache
            
        except Exception as e:
            logger.error(f"Error pre-calculando dashboard: {str(e)}")
            return None
    
    @staticmethod
    def _calcular_rango_fechas(periodo, fecha_referencia):
        """Calcula el rango de fechas según el período"""
        if periodo == 'day':
            start_date = end_date = fecha_referencia
            days = 1
        elif periodo == 'week':
            start_date = fecha_referencia - timedelta(days=fecha_referencia.weekday())
            end_date = start_date + timedelta(days=6)
            days = 7
        elif periodo == 'month':
            start_date = fecha_referencia.replace(day=1)
            next_month = start_date.replace(day=28) + timedelta(days=4)
            end_date = next_month - timedelta(days=next_month.day)
            days = (end_date - start_date).days + 1
        elif periodo == 'year':
            start_date = fecha_referencia.replace(month=1, day=1)
            end_date = fecha_referencia.replace(month=12, day=31)
            days = (end_date - start_date).days + 1
        else:
            start_date = fecha_referencia - timedelta(days=fecha_referencia.weekday())
            end_date = start_date + timedelta(days=6)
            days = 7
            
        return start_date, end_date, days
    
    @staticmethod
    def _calcular_ocupacion_optimizada(reservas_query, total_boxes, days):
        """Calcula métricas de ocupación de forma optimizada"""
        # Calcular minutos ocupados en una sola consulta
        ocupacion_stats = reservas_query.annotate(
            hora_fin_minutos=ExpressionWrapper(
                ExtractHour('horafinagenda') * 60 + ExtractMinute('horafinagenda'),
                output_field=IntegerField()
            ),
            hora_inicio_minutos=ExpressionWrapper(
                ExtractHour('horainicioagenda') * 60 + ExtractMinute('horainicioagenda'),
                output_field=IntegerField()
            )
        ).annotate(
            duracion_minutos=ExpressionWrapper(
                F('hora_fin_minutos') - F('hora_inicio_minutos'),
                output_field=IntegerField()
            )
        ).aggregate(
            total_minutos=Sum('duracion_minutos'),
            promedio_duracion=Avg('duracion_minutos')
        )
        
        total_minutos_ocupados = ocupacion_stats['total_minutos'] or 0
        promedio_duracion = ocupacion_stats['promedio_duracion'] or 0
        
        # Calcular capacidad total (8-18 = 10 horas por día)
        total_minutos_disponibles = total_boxes * days * 600  # 10 horas * 60 min
        
        porcentaje_ocupacion = (total_minutos_ocupados / total_minutos_disponibles * 100) if total_minutos_disponibles > 0 else 0
        
        # Calcular horas muertas de forma optimizada
        horas_muertas = DashboardOptimizer._calcular_horas_muertas_optimizado(reservas_query)
        
        return {
            'porcentaje': round(porcentaje_ocupacion, 2),
            'tiempo_promedio': round(promedio_duracion, 2),
            'horas_muertas': horas_muertas
        }
    
    @staticmethod
    def _calcular_horas_muertas_optimizado(reservas_query):
        """Calcula horas muertas de forma más eficiente"""
        # Agrupar por box y fecha, ordenar por hora
        reservas_por_box = {}
        
        reservas_data = reservas_query.values(
            'idbox_id', 'fechaagenda', 'horainicioagenda', 'horafinagenda'
        ).order_by('idbox_id', 'fechaagenda', 'horainicioagenda')
        
        for reserva in reservas_data:
            box_id = reserva['idbox_id']
            fecha = reserva['fechaagenda']
            key = f"{box_id}_{fecha}"
            
            if key not in reservas_por_box:
                reservas_por_box[key] = []
            
            reservas_por_box[key].append({
                'inicio': reserva['horainicioagenda'],
                'fin': reserva['horafinagenda']
            })
        
        total_horas_muertas = 0
        
        for key, reservas_dia in reservas_por_box.items():
            if len(reservas_dia) < 2:
                continue
                
            for i in range(1, len(reservas_dia)):
                tiempo_muerto = (
                    datetime.combine(datetime.today(), reservas_dia[i]['inicio']) -
                    datetime.combine(datetime.today(), reservas_dia[i-1]['fin'])
                ).total_seconds() / 3600
                
                if tiempo_muerto > 0:
                    total_horas_muertas += tiempo_muerto
        
        return round(total_horas_muertas, 2)
    
    @staticmethod
    def _calcular_ranking_boxes(reservas_query):
        """Calcula ranking de boxes por utilización"""
        boxes_stats = reservas_query.annotate(
            hora_fin_minutos=ExpressionWrapper(
                ExtractHour('horafinagenda') * 60 + ExtractMinute('horafinagenda'),
                output_field=IntegerField()
            ),
            hora_inicio_minutos=ExpressionWrapper(
                ExtractHour('horainicioagenda') * 60 + ExtractMinute('horainicioagenda'),
                output_field=IntegerField()
            )
        ).annotate(
            duracion_minutos=ExpressionWrapper(
                F('hora_fin_minutos') - F('hora_inicio_minutos'),
                output_field=IntegerField()
            )
        ).values('idbox_id').annotate(
            total_reservas=Count('id'),
            total_minutos=Sum('duracion_minutos')
        ).order_by('-total_reservas')
        
        ranking = []
        for box_stat in boxes_stats:
            try:
                box = Box.objects.get(idbox=box_stat['idbox_id'])
                ranking.append({
                    'box_id': box_stat['idbox_id'],
                    'total_reservas': box_stat['total_reservas'],
                    'total_minutos': box_stat['total_minutos'] or 0,
                    'pasillo': box.pasillobox,
                    'estado': box.estadobox
                })
            except Box.DoesNotExist:
                continue
        
        return ranking
    
    @staticmethod
    def _calcular_ocupacion_turnos(reservas_query):
        """Calcula ocupación por turnos AM/PM"""
        ocupacion_am = reservas_query.filter(
            horainicioagenda__gte=time(8, 0),
            horafinagenda__lte=time(13, 0)
        ).count()
        
        ocupacion_pm = reservas_query.filter(
            horainicioagenda__gte=time(13, 0),
            horafinagenda__lte=time(18, 0)
        ).count()
        
        return {'am': ocupacion_am, 'pm': ocupacion_pm}
    
    @staticmethod
    def _calcular_especialidades_optimizado():
        """Calcula estadísticas por especialidad de forma optimizada"""
        # Una sola consulta para obtener todas las relaciones
        relaciones = BoxTipoBox.objects.select_related('idtipobox', 'idbox').all()
        
        especialidades = {}
        for relacion in relaciones:
            nombre = relacion.idtipobox.tipo
            if nombre not in especialidades:
                especialidades[nombre] = {
                    'nombre': nombre,
                    'total_boxes': 0,
                    'boxes_principales': 0
                }
            
            especialidades[nombre]['total_boxes'] += 1
            if relacion.tipoprincipal:
                especialidades[nombre]['boxes_principales'] += 1
        
        return list(especialidades.values())
    
    @staticmethod
    def _generar_alertas_inteligentes(reservas_query, ranking_boxes):
        """Genera alertas automáticas basadas en patrones"""
        alertas = []
        
        # Alerta: Boxes subutilizados (menos de 5 reservas en la semana)
        for box_stat in ranking_boxes[-3:]:  # Los 3 menos utilizados
            if box_stat['total_reservas'] < 5:
                alertas.append({
                    'tipo': 'box_subutilizado',
                    'box_id': box_stat['box_id'],
                    'titulo': f"Box {box_stat['box_id']} subutilizado",
                    'descripcion': f"Solo {box_stat['total_reservas']} reservas esta semana",
                    'severidad': 'media',
                    'valor': box_stat['total_reservas']
                })
        
        # Alerta: Boxes sobrecargados (más de 40 reservas en la semana)
        for box_stat in ranking_boxes[:3]:  # Los 3 más utilizados
            if box_stat['total_reservas'] > 40:
                alertas.append({
                    'tipo': 'box_sobrecargado',
                    'box_id': box_stat['box_id'],
                    'titulo': f"Box {box_stat['box_id']} sobrecargado",
                    'descripcion': f"{box_stat['total_reservas']} reservas esta semana",
                    'severidad': 'alta',
                    'valor': box_stat['total_reservas']
                })
        
        # Alerta: Implementos no operacionales
        inventarios = InventarioBox.objects.all()
        for inventario in inventarios:
            implementos_rotos = len(inventario.get_implementos_no_operacionales())
            if implementos_rotos > 0:
                alertas.append({
                    'tipo': 'implementos_fallan',
                    'box_id': inventario.box_id,
                    'titulo': f"Implementos no operacionales en Box {inventario.box_id}",
                    'descripcion': f"{implementos_rotos} implementos necesitan atención",
                    'severidad': 'alta' if implementos_rotos > 2 else 'media',
                    'valor': implementos_rotos
                })
        
        return alertas
    
    @staticmethod
    def _calcular_tendencia_ocupacion(periodo, fecha_referencia):
        """Calcula tendencia de ocupación para gráficos"""
        tendencia = []
        
        if periodo == 'week':
            # Últimas 4 semanas
            for i in range(4):
                fecha_semana = fecha_referencia - timedelta(weeks=i)
                inicio_semana = fecha_semana - timedelta(days=fecha_semana.weekday())
                fin_semana = inicio_semana + timedelta(days=6)
                
                reservas_semana = Agendabox.objects.filter(
                    fechaagenda__gte=inicio_semana,
                    fechaagenda__lte=fin_semana
                ).count()
                
                tendencia.append(reservas_semana)
        
        elif periodo == 'month':
            # Últimos 6 meses
            for i in range(6):
                fecha_mes = fecha_referencia.replace(day=1) - timedelta(days=i*30)
                inicio_mes = fecha_mes.replace(day=1)
                
                reservas_mes = Agendabox.objects.filter(
                    fechaagenda__year=inicio_mes.year,
                    fechaagenda__month=inicio_mes.month
                ).count()
                
                tendencia.append(reservas_mes)
        
        return tendencia[::-1]  # Invertir para orden cronológico
    
    @staticmethod
    def generar_estadisticas_mensuales_boxes():
        """Genera estadísticas mensuales por box para análisis histórico"""
        fecha_actual = datetime.now()
        mes_anterior = fecha_actual.replace(day=1) - timedelta(days=1)
        
        boxes = Box.objects.all()
        
        for box in boxes:
            # Verificar si ya existen estadísticas para este mes
            stats_existentes = EstadisticasBox.objects(
                box_id=box.idbox,
                mes=mes_anterior.month,
                anio=mes_anterior.year
            ).first()
            
            if stats_existentes:
                continue
            
            # Calcular estadísticas del mes anterior
            reservas_mes = Agendabox.objects.filter(
                idbox=box,
                fechaagenda__year=mes_anterior.year,
                fechaagenda__month=mes_anterior.month
            )
            
            total_reservas = reservas_mes.count()
            if total_reservas == 0:
                continue
            
            # Calcular métricas
            horas_ocupadas = sum(
                (datetime.combine(datetime.today(), r.horafinagenda) - 
                 datetime.combine(datetime.today(), r.horainicioagenda)).total_seconds() / 3600
                for r in reservas_mes if r.horainicioagenda and r.horafinagenda
            )
            
            # Día más ocupado
            reservas_por_dia = reservas_mes.extra(
                select={'weekday': 'WEEKDAY(fechaagenda)'}
            ).values('weekday').annotate(count=Count('id')).order_by('-count')
            
            dia_mas_ocupado = reservas_por_dia[0]['weekday'] + 1 if reservas_por_dia else 1
            
            # Hora pico
            reservas_por_hora = reservas_mes.extra(
                select={'hora': 'HOUR(horainicioagenda)'}
            ).values('hora').annotate(count=Count('id')).order_by('-count')
            
            hora_pico = reservas_por_hora[0]['hora'] if reservas_por_hora else 9
            
            # Verificar implementos
            inventario = InventarioBox.objects(box_id=box.idbox).first()
            implementos_rotos = len(inventario.get_implementos_no_operacionales()) if inventario else 0
            
            # Crear estadísticas
            stats = EstadisticasBox(
                box_id=box.idbox,
                mes=mes_anterior.month,
                anio=mes_anterior.year,
                total_reservas_mes=total_reservas,
                horas_ocupadas_mes=round(horas_ocupadas, 2),
                eficiencia_promedio=round((horas_ocupadas / (30 * 10)) * 100, 2),  # 10 horas disponibles por día
                dia_mas_ocupado=dia_mas_ocupado,
                hora_pico=hora_pico,
                implementos_no_operacionales=implementos_rotos,
                reservas_canceladas=reservas_mes.filter(habilitada=0).count()
            )
            
            stats.save()
            logger.info(f"Estadísticas mensuales generadas para box {box.idbox}")


class DashboardCacheService:
    """Servicio para manejar el cache del dashboard de forma inteligente"""
    
    @staticmethod
    def obtener_dashboard_optimizado(periodo='week', forzar_refresh=False):
        """Obtiene dashboard desde cache o lo genera si es necesario"""
        if not forzar_refresh:
            cache = DashboardCache.objects(
                periodo=periodo,
                expires_at__gt=datetime.now()
            ).order_by('-created_at').first()
            
            if cache:
                return DashboardCacheService._convertir_cache_a_response(cache)
        
        # Generar nuevo cache
        cache = DashboardOptimizer.precalcular_dashboard(periodo)
        if cache:
            return DashboardCacheService._convertir_cache_a_response(cache)
        else:
            raise Exception("Error generando cache del dashboard")
    
    @staticmethod
    def _convertir_cache_a_response(cache):
        """Convierte el cache MongoDB a formato de respuesta"""
        return {
            'periodo': cache.periodo,
            'fecha_inicio': cache.fecha_inicio.strftime('%Y-%m-%d'),
            'fecha_fin': cache.fecha_fin.strftime('%Y-%m-%d'),
            'metricas_generales': {
                'total_boxes': cache.total_boxes,
                'total_reservas': cache.total_reservas,
                'reservas_medicas': cache.reservas_medicas,
                'reservas_no_medicas': cache.reservas_no_medicas,
                'porcentaje_ocupacion': cache.porcentaje_ocupacion,
                'tiempo_promedio_ocupacion': cache.tiempo_promedio_ocupacion,
                'horas_muertas': cache.horas_muertas
            },
            'ocupacion_turnos': {
                'am': cache.ocupacion_am,
                'pm': cache.ocupacion_pm
            },
            'ranking_boxes': cache.ranking_boxes,
            'box_mas_utilizado': cache.box_mas_utilizado,
            'box_menos_utilizado': cache.box_menos_utilizado,
            'especialidades': cache.especialidades_stats,
            'alertas': cache.alertas,
            'tendencia': cache.tendencia_ocupacion,
            'cache_info': {
                'tiempo_calculo_ms': cache.tiempo_calculo_ms,
                'generado_en': cache.created_at.isoformat(),
                'expira_en': cache.expires_at.isoformat()
            }
        }

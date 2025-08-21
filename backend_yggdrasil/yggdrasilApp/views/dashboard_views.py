# Views relacionadas con dashboard y estadísticas

from rest_framework.views import APIView
from rest_framework.response import Response
from ..models import Box, Agendabox, BoxTipoBox
from rest_framework import status
from django.db.models import Q, Count, Avg, ExpressionWrapper, DurationField, F, Sum
from django.db.models.functions import ExtractWeekDay
from datetime import datetime, time, timedelta
from django.utils import timezone


class DashboardStatsView(APIView):
    def get(self, request):
        time_range = request.query_params.get('range', 'week')
        today = timezone.now().date()

        # se determina el rango de fechas
        if time_range == 'day':
            start_date = end_date = today
            days = 1
        elif time_range == 'week':
            start_date = today - timedelta(days=today.weekday())
            end_date = start_date + timedelta(days=6)
            days = 7
        elif time_range == 'month':
            start_date = today.replace(day=1)
            next_month = start_date.replace(day=28) + timedelta(days=4)
            end_date = next_month - timedelta(days=next_month.day)
            days = (end_date - start_date).days + 1
        elif time_range == 'year':
            start_date = today.replace(month=1, day=1)
            end_date = today.replace(month=12, day=31)
            days = (end_date - start_date).days + 1
        else:  # default semanal
            start_date = today - timedelta(days=today.weekday())
            end_date = start_date + timedelta(days=6)
            days = 7

        #filtrar reservas por el rango de fechas
        reservas_query = Agendabox.objects.filter(
            fechaagenda__gte=start_date,
            fechaagenda__lte=end_date
        ).order_by('idbox', 'fechaagenda', 'horainicioagenda')

        #métricas generales generales
        total_boxes = Box.objects.count()
        total_reservas = reservas_query.count()
        reservas_medicas = reservas_query.filter(esMedica=True).count()
        reservas_no_medicas = reservas_query.filter(esMedica=False).count()

        #calcular horas disponibles totales
        horas_por_dia = 10
        minutos_por_dia = horas_por_dia * 60
        total_minutos_disponibles = total_boxes * days * minutos_por_dia

        #calcular minutos ocupados
        minutos_ocupados = reservas_query.annotate(
            duracion=ExpressionWrapper(
                F('horafinagenda') - F('horainicioagenda'),
                output_field=DurationField()
            )
        ).aggregate(
            total_minutos=Sum('duracion')
        )['total_minutos'].total_seconds() / 60 if reservas_query.exists() else 0

        #porcentaje de ocupación
        porcentaje_ocupacion = round(
            (minutos_ocupados / total_minutos_disponibles) * 100, 
            2
        ) if total_minutos_disponibles > 0 else 0

        # tiempo promedio de ocupación por reserva en minutos)
        tiempo_promedio_ocupacion = round(
            minutos_ocupados / total_reservas, 
            2
        ) if total_reservas > 0 else 0

        #Cálculo de horas muertas 
        horas_muertas = 0
        if total_reservas > 1:
            #obtenemos todas las reservas ordenadas por box y fecha
            reservas_ordenadas = reservas_query.values(
                'idbox',
                'fechaagenda',
                'horainicioagenda',
                'horafinagenda'
            ).order_by('idbox', 'fechaagenda', 'horainicioagenda')

            reservas_list = list(reservas_ordenadas)
            
            # calculamos tiempo entre reservas para cada box
            tiempo_muerto_total = 0
            box_actual = None
            reserva_anterior = None
            
            for reserva in reservas_list:
                if reserva['idbox'] != box_actual:
                    box_actual = reserva['idbox']
                    reserva_anterior = None
                
                if reserva_anterior:
                    tiempo_entre_reservas = (
                        datetime.combine(reserva['fechaagenda'], reserva['horainicioagenda']) -
                        datetime.combine(reserva_anterior['fechaagenda'], reserva_anterior['horafinagenda'])
                    ).total_seconds() / 60
                    
                    if tiempo_entre_reservas > 0:
                        tiempo_muerto_total += tiempo_entre_reservas
                
                reserva_anterior = reserva
            
            horas_muertas = round(tiempo_muerto_total / 60, 2)

        #Box más utilizado y menos utilizado
        boxes_periodo = reservas_query.values('idbox').annotate(
            total=Count('idbox')
        ).order_by('-total')
        box_mas_utilizado = boxes_periodo.first()
        box_menos_utilizado = boxes_periodo.last()

        #ocupación por turnos (AM/PM)
        ocupacion_am = reservas_query.filter(
            horainicioagenda__gte=time(8, 0),
            horafinagenda__lte=time(13, 0)
        ).count()
        
        ocupacion_pm = reservas_query.filter(
            horainicioagenda__gte=time(13, 0),
            horafinagenda__lte=time(18, 0)
        ).count()

        #estadísticas por especialidad
        especialidades_stats = []
        relaciones_box_tipo = BoxTipoBox.objects.select_related('idtipobox').all()
        especialidades_dict = {}
        
        #primero contamos boxes por especialidad
        for relacion in relaciones_box_tipo:
            nombre_especialidad = relacion.idtipobox.tipo
            if nombre_especialidad not in especialidades_dict:
                especialidades_dict[nombre_especialidad] = {
                    'nombre': nombre_especialidad,
                    'total_reservas': 0,
                    'boxes': 0,
                    'es_principal': False
                }
            especialidades_dict[nombre_especialidad]['boxes'] += 1
            
            if relacion.tipoprincipal:
                especialidades_dict[nombre_especialidad]['es_principal'] = True
        
        #lueego contamos reservas por especialidad
        for box in Box.objects.all():
            reservas_box = reservas_query.filter(idbox=box)
            relaciones_box = BoxTipoBox.objects.filter(idbox=box)
            
            for relacion in relaciones_box:
                nombre_especialidad = relacion.idtipobox.tipo
                especialidades_dict[nombre_especialidad]['total_reservas'] += reservas_box.count()
        
        especialidades_stats = sorted(
            especialidades_dict.values(),
            key=lambda x: (-x['es_principal'], -x['total_reservas'])
        )

        #yipo de reservas (médicas vs no médicas)
        tipo_reservas = [
            {"name": "Médicas", "value": reservas_medicas},
            {"name": "No Médicas", "value": reservas_no_medicas},
        ]

        #tiempo promedio de atención médica vs no médica
        tiempo_medico = reservas_query.filter(esMedica=True).annotate(
            duracion=ExpressionWrapper(
                F('horafinagenda') - F('horainicioagenda'),
                output_field=DurationField()
            )
        ).aggregate(promedio=Avg('duracion'))['promedio']
        
        tiempo_no_medico = reservas_query.filter(esMedica=False).annotate(
            duracion=ExpressionWrapper(
                F('horafinagenda') - F('horainicioagenda'),
                output_field=DurationField()
            )
        ).aggregate(promedio=Avg('duracion'))['promedio']

        #evolución semanal de ocupación
        evolucion_semana = reservas_query.annotate(
            dia_semana=ExtractWeekDay('fechaagenda')
        ).values('dia_semana').annotate(
            total=Count('id')
        ).order_by('dia_semana')

        response_data = {
            "total_boxes": total_boxes,
            "total_reservas": total_reservas,
            "reservas_medicas": reservas_medicas,
            "reservas_no_medicas": reservas_no_medicas,
            "tiempo_promedio_ocupacion": tiempo_promedio_ocupacion,
            "porcentaje_ocupacion": porcentaje_ocupacion,
            "horas_muertas": horas_muertas,
            "box_mas_utilizado": box_mas_utilizado,
            "box_menos_utilizado": box_menos_utilizado,
            "ocupacion_am": ocupacion_am,
            "ocupacion_pm": ocupacion_pm,
            "especialidades_stats": especialidades_stats,
            "tipo_reservas": tipo_reservas,
            "tiempo_medico": tiempo_medico.total_seconds() / 60 if tiempo_medico else None,
            "tiempo_no_medico": tiempo_no_medico.total_seconds() / 60 if tiempo_no_medico else None,
            "evolucion_semana": list(evolucion_semana),
        }

        return Response(response_data, status=status.HTTP_200_OK)

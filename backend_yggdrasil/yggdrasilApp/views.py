from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Box, Agendabox, Medico, Atenamb, LogAtenamb, BoxTipoBox
from .serializers import BoxSerializer, AgendaboxSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework import status
from rest_framework.exceptions import ValidationError
from django.db.models import Q, OuterRef, Subquery
from .modulos.event_listener import EventListener
from datetime import datetime,timedelta, time
from django.utils.dateparse import parse_datetime
from .modulos.event_listener import VistaActualizableDisp
from .modulos.agenda_adapter import SimuladorAdapter
from .modulos.simulador_agenda import SimuladorAgenda
from rest_framework import serializers
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.parsers import MultiPartParser, FormParser
import pandas as pd
from django.http import JsonResponse
from rest_framework.permissions import IsAuthenticated
from django.db import models    

class BoxListView(APIView):   
    def get(self, request, *args, **kwargs):
        box_id = kwargs.get('id')
        fecha = datetime.now().date()
        hora = datetime.now().time()

        if box_id:
            try:
                idbox = Box.objects.get(idbox=box_id)
                serializer = BoxSerializer(idbox)

                # Última atención finalizada
                ultima_atencion = Agendabox.objects.filter(
                    idbox=idbox,
                    fechaagenda=fecha.strftime('%Y-%m-%d'),
                    horafinagenda__lt=hora.strftime('%H:%M:%S')
                ).order_by('-horafinagenda').first()
                
                hora_fin = ultima_atencion.horafinagenda.strftime('%H:%M') if ultima_atencion else 'N/A'
                tipo_ultima = 'No Médica' if ultima_atencion and ultima_atencion.esMedica == 0 else 'Médica' if ultima_atencion else 'N/A'

                # Próxima atención
                proxima_atencion = Agendabox.objects.filter(
                    idbox=idbox,
                    fechaagenda=fecha.strftime('%Y-%m-%d'),
                    horainicioagenda__gte=hora.strftime('%H:%M:%S')
                ).order_by('horainicioagenda').first()
                
                hora_prox = proxima_atencion.horainicioagenda.strftime('%H:%M') if proxima_atencion else 'N/A'
                tipo_proxima = 'No Médica' if proxima_atencion and proxima_atencion.esMedica == 0 else 'Médica' if proxima_atencion else 'N/A'

                # Médico actual
                atencion_actual = Agendabox.objects.filter(
                    idbox=idbox,
                    fechaagenda=fecha.strftime('%Y-%m-%d'),
                    horainicioagenda__lt=hora.strftime('%H:%M:%S'),
                    horafinagenda__gte=hora.strftime('%H:%M:%S')
                ).first()
                
                medico = f"Dr. {atencion_actual.idmedico.nombre}" if atencion_actual and atencion_actual.idmedico else 'N/A'
                tipo_actual = 'No Médica' if atencion_actual and atencion_actual.esMedica == 0 else 'Médica' if atencion_actual else 'N/A'

                return Response({
                    "ult": f"{hora_fin} ({tipo_ultima})",
                    "prox": f"{hora_prox} ({tipo_proxima})",
                    "med": f"{medico} ({tipo_actual})" if medico != 'N/A' else medico,
                    "estadobox": serializer.data['estadobox'],
                    "pasillobox": serializer.data['pasillobox'],
                    "especialidades": serializer.data['especialidades'],
                    "especialidad_principal": serializer.data['especialidad_principal'],
                }, status=status.HTTP_200_OK)

            except Box.DoesNotExist:
                return Response({'error': 'Box no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        else:
            boxes = Box.objects.all()
            serializer = BoxSerializer(boxes, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)


class EstadoBoxView(APIView):

    def hay_tope(agendas):
        for i in range(len(agendas)):
            a1 = agendas[i]
            for j in range(i + 1, len(agendas)):
                a2 = agendas[j]
                if a1['horainicioagenda'] < a2['horafinagenda'] and a2['horainicioagenda'] < a1['horafinagenda']:
                    return True
        return False

    def get(self, request, *args, **kwargs):
        idbox = request.query_params.get('idbox')
        fecha = request.query_params.get('fecha')
        hora = request.query_params.get('hora')

        if not idbox or not fecha or not hora:
            raise ValidationError("Faltan parámetros: idbox, fecha y hora son requeridos.")

        # Realiza la consulta en la base de datos
        estado = Agendabox.objects.filter(
            Q(idbox=idbox),
            Q(fechaagenda=fecha),
            Q(horainicioagenda__lt=hora),
            Q(horafinagenda__gt=hora)
        ).count()

        if estado == 1:
            estBox = 'Ocupado'
        elif estado == 0:
            estBox = 'Disponible'
        else:
            estBox = 'Tope'

        return Response({"estado": estBox}, status=status.HTTP_200_OK)
    

class InfoBoxView(APIView):
    def get(self, request, *args, **kwargs):
        idbox = request.query_params.get('idbox')
        fecha = request.query_params.get('fecha')
        hora = request.query_params.get('hora')

        if not idbox or not fecha or not hora:
            raise ValidationError("Faltan parámetros: idbox, fecha y hora son requeridos.")

        hora_fin = Agendabox.objects.filter(
            idbox=idbox,
            fechaagenda__lte=fecha,
            horafinagenda__lt=hora
        ).order_by('-fechaagenda', '-horafinagenda').values_list('fechaagenda', 'horafinagenda').first()

        hora_prox = Agendabox.objects.filter(
            idbox=idbox,
            fechaagenda__gte=fecha,
            horainicioagenda__gte=hora
        ).order_by('fechaagenda', 'horafinagenda').values_list('fechaagenda', 'horainicioagenda').first()

        med = Agendabox.objects.filter(
            idbox=idbox,
            fechaagenda=fecha,
            horainicioagenda__lt=hora,
            horafinagenda__gte=hora
        ).values_list('idmedico')

        return Response({"ult": hora_fin, "prox": hora_prox, "med": med}, status=status.HTTP_200_OK)
class AgendaBox(APIView):
    def get(self, request, *args, **kwargs):
        box_id = kwargs.get('id')
        agenda_box = Agendabox.objects.filter(idbox=box_id)
        eventos = []
        
        for ag in agenda_box:
            fecha = ag.fechaagenda.strftime("%Y-%m-%d")
            hora_inicio = ag.horainicioagenda.strftime("%H:%M:%S")
            hora_fin = ag.horafinagenda.strftime("%H:%M:%S") if ag.horafinagenda else None
            
            eventos.append({
                "title": f"Dr. {ag.idmedico.nombre}" if ag.idmedico else "Reserva no médica",
                "start": f"{fecha}T{hora_inicio}",
                "end": f"{fecha}T{hora_fin}" if hora_fin else None,
                "esMedica": ag.esMedica, 
                "color": "#d8b4fe" if ag.esMedica == 0 else "#cfe4ff", 
                "textColor": "#000000",
                "extendedProps": {
                    "tipo": "No Médica" if ag.esMedica == 0 else "Médica",
                    "observaciones": ag.observaciones or ""
                }
            })
            
        return Response(eventos, status=status.HTTP_200_OK)

class DatosModificadosAPIView(APIView):
    def get(self, request, fecha_hora_str):
        try:
            #Parsear la fecha y hora desde la URL
            fecha_hora = parse_datetime(fecha_hora_str)
            if fecha_hora is None:
                raise ValueError("Formato inválido")
        except ValueError:
            return Response({"error": "Formato de fecha/hora inválido. Usa YYYY-MM-DDTHH:MM:SS"}, status=status.HTTP_400_BAD_REQUEST)

        #obtener IDs de registros modificados desde la fecha indicada
        logs = LogAtenamb.objects.using('simulador')\
            .filter(fecha_hora__gt=fecha_hora)\
            .values_list('atenamb_id', flat=True)\
            .distinct()
        
        log_subquery = LogAtenamb.objects.using('simulador')\
            .filter(atenamb_id=OuterRef('pk'), fecha_hora__gt=fecha_hora)\
            .order_by('-fecha_hora')\
            .values('accion')[:1] 

        # Obtener los datos de Atenamb con el tipo de acción incluido
        datos = list(
            Atenamb.objects.using('simulador')
            .filter(id__in=logs)
            .annotate(accion=Subquery(log_subquery))
            .values()
        )


        return Response(datos, status=status.HTTP_200_OK)


class VistaActualizableDispSerializer(serializers.Serializer):
    actualizado = serializers.BooleanField()

class VistaActualizableDispView(APIView):
    def get(self, request):
        vista = VistaActualizableDisp()
        #acá capturamos el valor actual antes de resetear
        data = {"actualizado": vista.actualizado}
        #Resetear el flag después de capturarlo
        vista.resetear()
        return Response(data)

    def put(self, request):
        vista = VistaActualizableDisp()
        serializer = VistaActualizableDispSerializer(data=request.data)
        if serializer.is_valid():
            vista.actualizado = serializer.validated_data['actualizado']
            return Response({"message": "Flag actualizado correctamente."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class AgendasNoMedicasView(APIView):
    def get(self, request, *args, **kwargs):
        box_id = kwargs.get('id')

        if not box_id:
            return Response({'error': 'ID del box es requerido.'}, status=400)

        agendas = Agendabox.objects.filter(idbox=box_id, esMedica=0)

        eventos = []
        for ag in agendas:
            fecha = ag.fechaagenda.strftime("%Y-%m-%d")
            hora_inicio = ag.horainicioagenda.strftime("%H:%M:%S")
            hora_fin = ag.horafinagenda.strftime("%H:%M:%S") if ag.horafinagenda else None

            eventos.append({
                "title": "No Médica",
                "start": f"{fecha}T{hora_inicio}",
                "end": f"{fecha}T{hora_fin}" if hora_fin else None
            })

        return Response(eventos)



class BloquesNoMedicosDisponiblesView(APIView):
    def get(self, request, *args, **kwargs):
        box_id = kwargs.get('id')
        fecha_str = request.query_params.get('fecha')

        if not box_id or not fecha_str:
            return Response({'error': 'ID del box y fecha son requeridos.'}, status=400)

        try:
            fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({'error': 'Formato de fecha inválido'}, status=400)

        agendas = Agendabox.objects.filter(idbox=box_id, fechaagenda=fecha)

        hora_inicio = time(8, 0)
        hora_fin = time(18, 0)
        duracion = timedelta(minutes=30)

        bloque_actual = datetime.combine(fecha, hora_inicio)
        bloques_disponibles = []

        while (bloque_actual + duracion).time() <= hora_fin:
            bloque_fin = (bloque_actual + duracion).time()

            conflicto = agendas.filter(
                horainicioagenda__lt=bloque_fin,
                horafinagenda__gt=bloque_actual.time()
            ).exists()

            if not conflicto:
                bloque_id = f"{box_id}_{fecha.strftime('%Y%m%d')}_{bloque_actual.time().strftime('%H%M')}"
                bloques_disponibles.append({
                    'bloque_id': bloque_id,
                    'box_id': box_id,
                    'hora_inicio': bloque_actual.time().strftime('%H:%M'),
                    'hora_fin': bloque_fin.strftime('%H:%M'),
                    'fecha': fecha.strftime('%Y-%m-%d'),
                })

            bloque_actual += duracion

        return Response(bloques_disponibles)


class CrearReservaNoMedicaView(APIView):
    def post(self, request):
        data = request.data

        try:
            fecha = datetime.strptime(data.get("fecha"), "%Y-%m-%d").date()
            hora_inicio = datetime.strptime(data.get("horaInicioReserva"), "%H:%M").time()
            hora_fin = datetime.strptime(data.get("horaFinReserva"), "%H:%M").time()
        except (TypeError, ValueError):
            return Response({'error': 'Formato de fecha u hora inválido'}, status=400)

        box_id = data.get("box_id")
        nombre = data.get("nombreResponsable")
        observaciones = data.get("observaciones", "")

        if not box_id or not nombre:
            return Response({'error': 'Faltan campos requeridos'}, status=400)

        conflicto = Agendabox.objects.filter(
            idbox=box_id,
            fechaagenda=fecha,
            horainicioagenda__lt=hora_fin,
            horafinagenda__gt=hora_inicio
        ).exists()

        if conflicto:
            return Response({'error': 'Ya existe una agenda en ese bloque'}, status=400)

        try:
            nueva_agenda = Agendabox.objects.create(
                fechaagenda=fecha,
                horainicioagenda=hora_inicio,
                horafinagenda=hora_fin,
                idbox_id=box_id,
                habilitada=0,
                esMedica=0,
                idmedico=None,
                nombre_responsable=nombre,
                observaciones=observaciones  
            )

            return Response({
                'mensaje': 'Reserva creada exitosamente',
                'id': nueva_agenda.id,
                'box_id': nueva_agenda.idbox_id,
                'fecha': fecha.strftime('%Y-%m-%d'),
                'hora_inicio': hora_inicio.strftime('%H:%M'),
                'hora_fin': hora_fin.strftime('%H:%M'),
                'responsable': nueva_agenda.nombre_responsable
            }, status=201)

        except Exception as e:
            return Response(
                {'error': f'Error al crear la reserva: {str(e)}'},
                status=500
            )
        


class BoxesRecomendadosView(APIView):
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

        boxes_ocupados = Agendabox.objects.filter(
            fechaagenda=fecha,
            horainicioagenda__lt=hora_fin,
            horafinagenda__gt=hora_inicio
        ).values_list('idbox', flat=True) 

        boxes_disponibles = Box.objects.exclude(idbox__in=boxes_ocupados)

        boxes_data = []
        for box in boxes_disponibles:
            boxes_data.append({
                'id': box.idbox,
                'pasillo': box.pasillobox,
                'hora_inicio': hora_inicio_str,
                'hora_fin': hora_fin_str,
                'disponible': True
            })


        return Response(boxes_data)
    


class MisReservasView(APIView):
    def get(self, request):

        reservas = Agendabox.objects.filter(
            esMedica=0,
            nombre_responsable__isnull=False
        ).order_by('-fechaagenda', '-horainicioagenda')

        reservas_data = []
        for reserva in reservas:
            reservas_data.append({
                'id': reserva.id,
                'box_id': reserva.idbox_id,
                'fecha': reserva.fechaagenda.strftime('%Y-%m-%d'),
                'hora_inicio': reserva.horainicioagenda.strftime('%H:%M'),
                'hora_fin': reserva.horafinagenda.strftime('%H:%M') if reserva.horafinagenda else None,
                'responsable': reserva.nombre_responsable,
                'observaciones': reserva.observaciones,
            })

        return Response(reservas_data)
    

from django.db.models import Q, Count, Avg, ExpressionWrapper, DurationField, F, Sum
from django.db.models.functions import ExtractWeekDay
from datetime import datetime, time, timedelta
from django.utils import timezone
from django.db.models import Q, Count, Avg, ExpressionWrapper, DurationField, F
from django.db.models.functions import ExtractWeekDay


class DashboardStatsView(APIView):
    def get(self, request):
        # Obtener parámetro de rango de tiempo
        time_range = request.query_params.get('range', 'week')
        today = timezone.now().date()

        # Determinar el rango de fechas
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
        else:  # default week
            start_date = today - timedelta(days=today.weekday())
            end_date = start_date + timedelta(days=6)
            days = 7

        # Filtrar reservas por el rango de fechas
        reservas_query = Agendabox.objects.filter(
            fechaagenda__gte=start_date,
            fechaagenda__lte=end_date
        ).order_by('idbox', 'fechaagenda', 'horainicioagenda')

        # Métricas generales
        total_boxes = Box.objects.count()
        total_reservas = reservas_query.count()
        reservas_medicas = reservas_query.filter(esMedica=True).count()
        reservas_no_medicas = reservas_query.filter(esMedica=False).count()

        # Calcular horas disponibles totales (8:00 a 18:00 = 10 horas)
        horas_por_dia = 10
        minutos_por_dia = horas_por_dia * 60
        total_minutos_disponibles = total_boxes * days * minutos_por_dia

        # Calcular minutos ocupados
        minutos_ocupados = reservas_query.annotate(
            duracion=ExpressionWrapper(
                F('horafinagenda') - F('horainicioagenda'),
                output_field=DurationField()
            )
        ).aggregate(
            total_minutos=Sum('duracion')
        )['total_minutos'].total_seconds() / 60 if reservas_query.exists() else 0

        # Calcular porcentaje de ocupación
        porcentaje_ocupacion = round(
            (minutos_ocupados / total_minutos_disponibles) * 100, 
            2
        ) if total_minutos_disponibles > 0 else 0

        # Tiempo promedio de ocupación por reserva (en minutos)
        tiempo_promedio_ocupacion = round(
            minutos_ocupados / total_reservas, 
            2
        ) if total_reservas > 0 else 0

        # Cálculo de horas muertas (tiempo entre reservas)
        horas_muertas = 0
        if total_reservas > 1:
            # Obtenemos todas las reservas ordenadas por box y fecha
            reservas_ordenadas = reservas_query.values(
                'idbox',
                'fechaagenda',
                'horainicioagenda',
                'horafinagenda'
            ).order_by('idbox', 'fechaagenda', 'horainicioagenda')

            # Convertimos a lista para poder iterar
            reservas_list = list(reservas_ordenadas)
            
            # Calculamos tiempo entre reservas para cada box
            tiempo_muerto_total = 0
            box_actual = None
            reserva_anterior = None
            
            for reserva in reservas_list:
                if reserva['idbox'] != box_actual:
                    # Cambio de box, reiniciamos
                    box_actual = reserva['idbox']
                    reserva_anterior = None
                
                if reserva_anterior:
                    # Calculamos tiempo entre fin de reserva anterior e inicio de esta
                    if reserva['fechaagenda'] == reserva_anterior['fechaagenda']:
                        # Mismo día
                        fin_anterior = datetime.combine(
                            reserva_anterior['fechaagenda'], 
                            reserva_anterior['horafinagenda']
                        )
                        inicio_actual = datetime.combine(
                            reserva['fechaagenda'], 
                            reserva['horainicioagenda']
                        )
                        tiempo_muerto = (inicio_actual - fin_anterior).total_seconds() / 60
                        
                        # Solo contamos si es tiempo positivo (no solapamiento)
                        if tiempo_muerto > 0:
                            tiempo_muerto_total += tiempo_muerto
                
                reserva_anterior = reserva
            
            horas_muertas = round(tiempo_muerto_total / 60, 2)

        # Box más utilizado y menos utilizado
        boxes_periodo = reservas_query.values('idbox').annotate(
            total=Count('idbox')
        ).order_by('-total')
        box_mas_utilizado = boxes_periodo.first()
        box_menos_utilizado = boxes_periodo.last()

        # Ocupación por turnos (AM/PM)
        ocupacion_am = reservas_query.filter(
            horainicioagenda__gte=time(8, 0),
            horafinagenda__lte=time(13, 0)
        ).count()
        
        ocupacion_pm = reservas_query.filter(
            horainicioagenda__gte=time(13, 0),
            horafinagenda__lte=time(18, 0)
        ).count()

        # Estadísticas por especialidad
        especialidades_stats = []
        relaciones_box_tipo = BoxTipoBox.objects.select_related('idtipobox').all()
        especialidades_dict = {}
        
        # Primero contamos boxes por especialidad
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
        
        # Luego contamos reservas por especialidad
        for box in Box.objects.all():
            reservas_box = reservas_query.filter(idbox=box)
            relaciones_box = BoxTipoBox.objects.filter(idbox=box)
            
            for relacion in relaciones_box:
                nombre_especialidad = relacion.idtipobox.tipo
                especialidades_dict[nombre_especialidad]['total_reservas'] += reservas_box.count()
        
        # Convertimos a lista y ordenamos
        especialidades_stats = sorted(
            especialidades_dict.values(),
            key=lambda x: (-x['es_principal'], -x['total_reservas'])
        )

        # Tipo de reservas (médicas vs no médicas)
        tipo_reservas = [
            {"name": "Médicas", "value": reservas_medicas},
            {"name": "No Médicas", "value": reservas_no_medicas},
        ]

        # Tiempo promedio de atención médica vs no médica
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

        # Evolución semanal de ocupación
        evolucion_semana = reservas_query.annotate(
            dia_semana=ExtractWeekDay('fechaagenda')
        ).values('dia_semana').annotate(
            total=Count('id')
        ).order_by('dia_semana')

        # Preparar respuesta
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

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json


@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    data = json.loads(request.body)
    username =data.get('username')
    password=data.get('password')

    user = authenticate(request, username=username, password=password)
    if user is not None and user.is_active:
        login(request, user)
        roles = list(user.groups.values_list('name', flat=True))
        return JsonResponse({
            'message' : 'Login exitoso',
            'username' : user.username,
            'roles': roles
        })
    else:
        return JsonResponse({'error' : 'Credenciales inválidas'}, status = 401)

@csrf_exempt
@require_http_methods(["POST"])
def logout_view(request):
    logout(request)
    return JsonResponse({'message': 'Sesión cerrada correctamente'})

@login_required
def user_info(request):
    roles = list(request.user.groups.values_list('name', flat = True))
    return JsonResponse({
        'username':request.user.username,
        'roles':roles
    })



GLOBAL = []

@csrf_exempt
def upload_file(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Solo se permite POST'}, status=405)

    archivo = request.FILES.get('archivo')
    if not archivo:
        return JsonResponse({'error': 'No se recibió ningún archivo'}, status=400)

    try:
        if archivo.name.endswith('.csv'):
            df = pd.read_csv(archivo, sep=',')
        elif archivo.name.endswith('.xlsx'):
            df = pd.read_excel(archivo)
        else:
            return JsonResponse({'error': 'Formato de archivo no soportado'}, status=400)

        sAdapter = SimuladorAdapter()

        simulador = SimuladorAgenda()

        datos = sAdapter.adaptar_datos(df)

        aprobados, desaprobados = simulador.simular(datos)

        GLOBAL.append(aprobados)

        serializer_aprobados = AgendaboxSerializer(aprobados, many=True)
        serializer_desaprobados = AgendaboxSerializer(desaprobados, many=True)

        return JsonResponse({
            'mensaje': 'Archivo recibido correctamente',
            'aprobados': serializer_aprobados.data,
            'desaprobados': serializer_desaprobados.data,
        })

    except Exception as e:
        print(e)
        return JsonResponse({'error': str(e)}, status=500)
    
@csrf_exempt
def confirmar_guardado_agendas(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Solo se permite POST'}, status=405)
    try:
        agendas = GLOBAL.pop()
        Agendabox.objects.bulk_create(agendas)
        return JsonResponse({"mensaje": "Agendas confirmadas y guardadas exitosamente"}, status=status.HTTP_200_OK)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
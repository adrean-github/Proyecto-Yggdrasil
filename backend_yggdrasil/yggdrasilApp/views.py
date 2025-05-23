from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Box, Agendabox, Medico, Atenamb, LogAtenamb
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
                hora_fin = Agendabox.objects.filter(
                    idbox=idbox,
                    fechaagenda=fecha.strftime('%Y-%m-%d'),
                    horafinagenda__lt=hora.strftime('%H:%M:%S')
                ).order_by('-horafinagenda').values('horafinagenda').first()
                hora_fin = hora_fin['horafinagenda'] if hora_fin else 'N/A'

                # Próxima atención
                hora_prox = Agendabox.objects.filter(
                    idbox=idbox,
                    fechaagenda=fecha.strftime('%Y-%m-%d'),
                    horainicioagenda__gte=hora.strftime('%H:%M:%S')
                ).order_by('horainicioagenda').values('horainicioagenda').first()
                hora_prox = hora_prox['horainicioagenda'] if hora_prox else 'N/A'

                # Médico actual
                med = Agendabox.objects.filter(
                    idbox=idbox,
                    fechaagenda=fecha.strftime('%Y-%m-%d'),
                    horainicioagenda__lt=hora.strftime('%H:%M:%S'),
                    horafinagenda__gte=hora.strftime('%H:%M:%S')
                ).first()
                medico = f"Dr. {med.idmedico.nombre}" if med else 'N/A'

                return Response({
                    "ult": hora_fin,
                    "prox": hora_prox,
                    "med": medico,
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
                "title": f"Dr. {ag.idmedico.nombre}" if ag.idmedico else "Consulta",
                "start": f"{fecha}T{hora_inicio}",
                "end": f"{fecha}T{hora_fin}" if hora_fin else None
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
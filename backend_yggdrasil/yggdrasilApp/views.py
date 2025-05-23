from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Box, Agendabox, Medico, Atenamb, LogAtenamb
from .serializers import BoxSerializer, AgendaboxSerializer
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework.exceptions import ValidationError
from django.db.models import Q, OuterRef, Subquery
from datetime import datetime
from .modulos.event_listener import EventListener
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
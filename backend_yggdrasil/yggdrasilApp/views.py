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
import csv
from django.http import HttpResponse

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

class BoxesInhabilitadosView(APIView):
    def get(self, request):
        boxes_inhabilitados = Box.objects.filter(estadobox='Inhabilitado').values('idbox', 'pasillobox')
        return Response(boxes_inhabilitados, status=status.HTTP_200_OK)    


class AgendasConTopeView(APIView):
    def get(self, request):
        desde_str = request.query_params.get('desde')
        hasta_str = request.query_params.get('hasta')
        if not desde_str or not hasta_str:
            raise ValidationError("Se requieren los parámetros 'desde' y 'hasta'.")
        try:
            desde = datetime.strptime(desde_str, "%Y-%m-%d").date()
            hasta = datetime.strptime(hasta_str, "%Y-%m-%d").date()
        except ValueError:
            raise ValidationError("Los parámetros 'desde' y 'hasta' deben estar en formato YYYY-MM-DD")
        
        # Obtenemos todas las agendas en el rango de fechas incluyendo el ID
        agendas = Agendabox.objects.filter(
            fechaagenda__gte=desde,
            fechaagenda__lte=hasta
        ).values('id', 'idbox', 'fechaagenda', 'horainicioagenda', 'horafinagenda').order_by('idbox', 'fechaagenda', 'horainicioagenda')
        
        agendas_con_tope = []
        agendas_dict = {}
        
        # Agrupamos por box y fecha
        for agenda in agendas:
            key = (agenda['idbox'], agenda['fechaagenda'])
            if key not in agendas_dict:
                agendas_dict[key] = []
            agendas_dict[key].append(agenda)
        
        # Verificamos topes para cada grupo
        for key, ags in agendas_dict.items():
            if len(ags) > 1:  # Solo puede haber tope si hay más de una agenda
                # Ordenamos las agendas por hora de inicio
                ags_ordenadas = sorted(ags, key=lambda x: x['horainicioagenda'])
                
                # Verificamos conflictos entre agendas consecutivas
                for i in range(len(ags_ordenadas) - 1):
                    agenda_actual = ags_ordenadas[i]
                    agenda_siguiente = ags_ordenadas[i + 1]
                    
                    # Convertimos las horas de string a objetos time si es necesario
                    fin_actual = agenda_actual['horafinagenda']
                    inicio_siguiente = agenda_siguiente['horainicioagenda']
                    
                    # Si ya son objetos time (puede depender de tu DB driver)
                    if isinstance(fin_actual, str):
                        fin_actual = datetime.strptime(fin_actual, '%H:%M:%S').time()
                    if isinstance(inicio_siguiente, str):
                        inicio_siguiente = datetime.strptime(inicio_siguiente, '%H:%M:%S').time()
                    
                    # Si hay superposición, es un tope
                    if fin_actual > inicio_siguiente:
                        # Agregamos ambas agendas como en tope, referenciándose mutuamente
                        agendas_con_tope.append({
                            'id': agenda_actual['id'],
                            'idbox': agenda_actual['idbox'],
                            'fecha': agenda_actual['fechaagenda'],
                            'tope_con': agenda_siguiente['id']
                        })
                        
                        agendas_con_tope.append({
                            'id': agenda_siguiente['id'],
                            'idbox': agenda_siguiente['idbox'],
                            'fecha': agenda_siguiente['fechaagenda'],
                            'tope_con': agenda_actual['id']
                        })
        
        return Response(agendas_con_tope, status=status.HTTP_200_OK)
    
class TodasAgendasView(APIView):
    def get(self, request):
        desde_str = request.query_params.get('desde')
        hasta_str = request.query_params.get('hasta')
        export = request.query_params.get('export')

        if not desde_str or not hasta_str:
            raise ValidationError("Se requieren los parámetros 'desde' y 'hasta'.")

        try:
            desde = datetime.strptime(desde_str, "%Y-%m-%d").date()
            hasta = datetime.strptime(hasta_str, "%Y-%m-%d").date()
        except ValueError:
            raise ValidationError("Los parámetros 'desde' y 'hasta' deben estar en formato YYYY-MM-DD")

        agendas = Agendabox.objects.filter(
            fechaagenda__gte=desde,
            fechaagenda__lte=hasta
        ).order_by('fechaagenda', 'horainicioagenda')

        data = [
            {
                "id": ag.id,
                "box_id": ag.idbox_id,
                "fecha": ag.fechaagenda.strftime("%Y-%m-%d"),
                "hora_inicio": ag.horainicioagenda.strftime("%H:%M") if ag.horainicioagenda else None,
                "hora_fin": ag.horafinagenda.strftime("%H:%M") if ag.horafinagenda else None,
                "tipo": "Médica" if ag.esMedica else "No Médica",
                "responsable": f"{ag.idmedico.nombre}" if ag.idmedico else (ag.nombre_responsable or "No asignado"),
                "observaciones": ag.observaciones or ""
            } for ag in agendas
        ]

        if export == "csv" and data:
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="todas_agendas.csv"'
            writer = csv.DictWriter(response, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
            return response

        return Response(data, status=status.HTTP_200_OK)

class CheckDisponibilidadView(APIView):
    def get(self, request):
        idbox = request.query_params.get('idbox')
        fecha = request.query_params.get('fecha')
        hora_inicio = request.query_params.get('hora_inicio')
        hora_fin = request.query_params.get('hora_fin')
        id_agenda = request.query_params.get('id_agenda')  

        if not all([idbox, fecha, hora_inicio, hora_fin]):
            return Response({"error": "Faltan parámetros"}, status=status.HTTP_400_BAD_REQUEST)

        conflict = Agendabox.objects.filter(
            Q(idbox=idbox),
            Q(fechaagenda=fecha),
            Q(horainicioagenda__lt=hora_fin),
            Q(horafinagenda__gt=hora_inicio)
        )
        if id_agenda:
            conflict = conflict.exclude(id=id_agenda)

        if conflict.exists():
            return Response({"disponible": False, "conflicto_id": conflict.first().id})
        return Response({"disponible": True})

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
    

def parse_date_param(date_str, param_name):
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise ValidationError(f"El parámetro '{param_name}' debe estar en formato YYYY-MM-DD")


class AgendaBox(APIView):
    def get(self, request, *args, **kwargs):
        box_id = kwargs.get('id')
        desde_str = request.query_params.get('desde')
        hasta_str = request.query_params.get('hasta')

        agenda_box = Agendabox.objects.filter(idbox=box_id)

        if desde_str:
            desde = parse_date_param(desde_str, 'desde')
            agenda_box = agenda_box.filter(fechaagenda__gte=desde)
        if hasta_str:
            hasta = parse_date_param(hasta_str, 'hasta')
            agenda_box = agenda_box.filter(fechaagenda__lte=hasta)

        agenda_box = agenda_box.order_by('fechaagenda', 'horainicioagenda')

        eventos = []
        for ag in agenda_box:
            fecha = ag.fechaagenda.strftime("%Y-%m-%d")
            hora_inicio = ag.horainicioagenda.strftime("%H:%M:%S")
            hora_fin = ag.horafinagenda.strftime("%H:%M:%S") if ag.horafinagenda else None

            eventos.append({
                "id": ag.id,
                "medico": f"{ag.idmedico.nombre}" if ag.idmedico else "Reserva no médica",
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

        return Response(eventos)

class AgendasPorPasilloView(APIView):
    def get(self, request):
        desde_str = request.query_params.get('desde')
        hasta_str = request.query_params.get('hasta')
        pasillo_param = request.query_params.get('pasillo')  
        export = request.query_params.get('export')

        if not desde_str or not hasta_str:
            raise ValidationError("Se requieren los parámetros 'desde' y 'hasta'.")
        if not pasillo_param:
            raise ValidationError("Se requiere el parámetro 'pasillo'.")

        desde = parse_date_param(desde_str, 'desde')
        hasta = parse_date_param(hasta_str, 'hasta')

        try:
            pasillo_id = int(pasillo_param)
            boxes = Box.objects.filter(pasillobox=pasillo_id).values_list('idbox', flat=True)
        except ValueError:
            boxes = Box.objects.filter(pasillobox__icontains=pasillo_param).values_list('idbox', flat=True)

        agendas = Agendabox.objects.filter(
            idbox__in=boxes,
            fechaagenda__gte=desde,
            fechaagenda__lte=hasta
        ).order_by('fechaagenda', 'horainicioagenda')

        data = [
            {
                "id": ag.id,
                "box_id": ag.idbox_id, 
                "fecha": ag.fechaagenda.strftime("%Y-%m-%d"),
                "hora_inicio": ag.horainicioagenda.strftime("%H:%M") if ag.horainicioagenda else None,
                "hora_fin": ag.horafinagenda.strftime("%H:%M") if ag.horafinagenda else None,
                "tipo": "Médica" if ag.esMedica else "No Médica",
                "responsable": f"{ag.idmedico.nombre}" if ag.idmedico else "No asignado",
                "observaciones": ag.observaciones or ""
            } for ag in agendas
        ]

        if export == "csv" and data:
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="agendas_pasillo.csv"'
            writer = csv.DictWriter(response, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
            return response

        return Response(data)


    
class AgendasPorMedicoView(APIView):
    def get(self, request):
        medico_param = request.query_params.get("medico") 
        desde_str = request.query_params.get('desde')
        hasta_str = request.query_params.get('hasta')
        export = request.query_params.get('export')

        if not medico_param:
            raise ValidationError("Se requiere el parámetro 'medico'.")

        try:
            medico_id = int(medico_param)
            agendas = Agendabox.objects.filter(idmedico=medico_id)
        except ValueError:
            agendas = Agendabox.objects.filter(idmedico__nombre__icontains=medico_param)

        if desde_str:
            desde = parse_date_param(desde_str, 'desde')
            agendas = agendas.filter(fechaagenda__gte=desde)
        if hasta_str:
            hasta = parse_date_param(hasta_str, 'hasta')
            agendas = agendas.filter(fechaagenda__lte=hasta)

        agendas = agendas.order_by('fechaagenda', 'horainicioagenda')

        data = [
            {
                "id": ag.id,
                "box_id": ag.idbox_id,
                "medico": ag.idmedico.nombre if ag.idmedico else "No asignado",
                "fecha": ag.fechaagenda.strftime("%Y-%m-%d"),
                "hora_inicio": ag.horainicioagenda.strftime("%H:%M") if ag.horainicioagenda else None,
                "hora_fin": ag.horafinagenda.strftime("%H:%M") if ag.horafinagenda else None,
                "tipo": "Médica" if ag.esMedica else "No Médica",
                "observaciones": ag.observaciones or ""
            } for ag in agendas
        ]

        if export == "csv" and data:
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="agendas_medico.csv"'
            writer = csv.DictWriter(response, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
            return response

        return Response(data)


class SugerenciasMedicoView(APIView):
    def get(self, request):
        nombre = request.query_params.get("nombre", "").strip()
        if not nombre:
            return Response([])

        medicos = Medico.objects.filter(nombre__icontains=nombre)[:10]
        data = [{"idMedico": m.idmedico, "nombre": m.nombre} for m in medicos]
        return Response(data[:10])
    
class DatosModificadosAPIView(APIView):
    def get(self, request, fecha_hora_str):
        try:
            #Parsear la fecha y hora desde la URL
            fecha_hora = parse_datetime(fecha_hora_str)
            if fecha_hora is None:
                raise ValueError("Formato inválido")
        except ValueError:
            return Response({"error": "Formato de fecha/hora inválido. Usa YYYY-MM-DDTHH:MM:SS"}, status=status.HTTP_400_BAD_REQUEST)

        # Obtener todos los logs modificados desde la fecha indicada
        logs = LogAtenamb.objects.using('simulador')\
            .filter(fecha_hora__gt=fecha_hora)\
            .order_by('-fecha_hora', '-id')

        # Deduplicar por atenamb_id, quedándonos con el log más reciente de cada uno
        vistos = set()
        ids_unicos = []
        for log in logs:
            if log.atenamb_id not in vistos:
                vistos.add(log.atenamb_id)
                ids_unicos.append(log.atenamb_id)

        log_subquery = LogAtenamb.objects.using('simulador')\
            .filter(atenamb_id=OuterRef('pk'), fecha_hora__gt=fecha_hora)\
            .order_by('-fecha_hora')\
            .values('accion')[:1]

        # Obtener los datos de Atenamb con el tipo de acción incluido, solo para ids únicos
        datos = list(
            Atenamb.objects.using('simulador')
            .filter(id__in=ids_unicos)
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
        


class CrearReservaMedicaView(APIView):
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
        id_medico = data.get("idMedico")  # opcional, si quieres asociar médico

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
                esMedica=1,  #acá se diferencia de la no médica
                idmedico_id=id_medico,
                nombre_responsable=nombre,
                observaciones=observaciones
            )

            return Response({
                'mensaje': 'Reserva médica creada exitosamente',
                'id': nueva_agenda.id,
                'box_id': nueva_agenda.idbox_id,
                'fecha': fecha.strftime('%Y-%m-%d'),
                'hora_inicio': hora_inicio.strftime('%H:%M'),
                'hora_fin': hora_fin.strftime('%H:%M'),
                'responsable': nueva_agenda.nombre_responsable
            }, status=201)

        except Exception as e:
            return Response({'error': f'Error al crear la reserva: {str(e)}'}, status=500)
        
class MedicosDisponiblesView(APIView):
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

        medicos_ocupados = Agendabox.objects.filter(
            esMedica=1,
            fechaagenda=fecha,
            horainicioagenda__lt=hora_fin,
            horafinagenda__gt=hora_inicio
        ).values_list('idmedico', flat=True) 

        medicos_disponibles = Medico.objects.exclude(idmedico__in=medicos_ocupados)

        medicos_data = [{'idMedico': m.idmedico, 'nombre': m.nombre} for m in medicos_disponibles]
        return Response(medicos_data)

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
    

class MisReservasMedicasView(APIView):
    def get(self, request):
        id_medico = request.query_params.get("idMedico") 

        ahora = datetime.now()
        reservas = Agendabox.objects.filter(
            esMedica=1,
            habilitada=0,
            fechaagenda__gte=ahora.date()
        ).exclude(
            fechaagenda=ahora.date(),
            horafinagenda__lte=ahora.time()
        )

        if id_medico:
            reservas = reservas.filter(idmedico=id_medico)

        data = [
            {
                "id": r.id,
                "box_id": r.idbox_id,
                "fecha": r.fechaagenda.strftime("%Y-%m-%d"),
                "hora_inicio": r.horainicioagenda.strftime("%H:%M"),
                "hora_fin": r.horafinagenda.strftime("%H:%M"),
                "responsable": r.nombre_responsable,
                "medico": r.idmedico.nombre if r.idmedico else None,
                "habilitada": r.habilitada,
                "puede_liberar": r.habilitada == 0
            }
            for r in reservas
        ]

        return Response(data, status=200)


class MisReservasNoMedicasView(APIView):
    def get(self, request):
        nombre = request.query_params.get("nombreResponsable") 

        ahora = datetime.now()
        reservas = Agendabox.objects.filter(
            esMedica=0,
            habilitada=0,
            fechaagenda__gte=ahora.date()
        ).exclude(
            fechaagenda=ahora.date(),
            horafinagenda__lte=ahora.time()
        )

        if nombre:
            reservas = reservas.filter(nombre_responsable=nombre)

        data = [
            {
                "id": r.id,
                "box_id": r.idbox_id,
                "fecha": r.fechaagenda.strftime("%Y-%m-%d"),
                "hora_inicio": r.horainicioagenda.strftime("%H:%M"),
                "hora_fin": r.horafinagenda.strftime("%H:%M"),
                "responsable": r.nombre_responsable,
                "habilitada": r.habilitada,
                "puede_liberar": r.habilitada == 0
            }
            for r in reservas
        ]

        return Response(data, status=200)

class LiberarReservaView(APIView):
    def delete(self, request, reserva_id):
        try:
            reserva = Agendabox.objects.get(id=reserva_id)
            reserva.delete()
            return Response({'mensaje': 'Reserva eliminada/liberada'}, status=200)
        except Agendabox.DoesNotExist:
            return Response({'error': 'Reserva no encontrada'}, status=404)

class UpdateReservaView(APIView):
    def put(self, request, reserva_id):
        try:
            reserva = Agendabox.objects.get(id=reserva_id)
        except Agendabox.DoesNotExist:
            return Response({'error': 'Reserva no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AgendaboxSerializer(reserva, data=request.data, partial=True) 
        if serializer.is_valid():
            serializer.save()
            return Response({'mensaje': 'Reserva actualizada', 'reserva': serializer.data}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

from django.db.models import Q, Count, Avg, ExpressionWrapper, DurationField, F, Sum
from django.db.models.functions import ExtractWeekDay
from datetime import datetime, time, timedelta
from django.utils import timezone
from django.db.models import Q, Count, Avg, ExpressionWrapper, DurationField, F
from django.db.models.functions import ExtractWeekDay


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
                    #cambio de box, reiniciamos
                    box_actual = reserva['idbox']
                    reserva_anterior = None
                
                if reserva_anterior:
                    #Calculamos tiempo entre fin de reserva anterior e inicio de esta
                    if reserva['fechaagenda'] == reserva_anterior['fechaagenda']:
                        fin_anterior = datetime.combine(
                            reserva_anterior['fechaagenda'], 
                            reserva_anterior['horafinagenda']
                        )
                        inicio_actual = datetime.combine(
                            reserva['fechaagenda'], 
                            reserva['horainicioagenda']
                        )
                        tiempo_muerto = (inicio_actual - fin_anterior).total_seconds() / 60
                        
                        #solo contamos si es tiempo positivo
                        if tiempo_muerto > 0:
                            tiempo_muerto_total += tiempo_muerto
                
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

class BloquesLibresView(APIView):
    def get(self, request, box_id):
        fecha = request.GET.get('fecha')
        duracion_min = int(request.GET.get('duracion', 30))  
        
        if not fecha:
            return Response({'error': 'Se requiere parámetro fecha'}, status=400)
        
        try:
            agendas = Agendabox.objects.filter(
                idbox=box_id,
                fechaagenda=fecha
            ).order_by('horainicioagenda')
            
            bloques_libres = []
            hora_actual = timezone.datetime.strptime(f"{fecha} 08:00", "%Y-%m-%d %H:%M")
            hora_fin_dia = timezone.datetime.strptime(f"{fecha} 18:00", "%Y-%m-%d %H:%M")
            
            for agenda in agendas:
                hora_inicio_agenda = timezone.datetime.strptime(f"{fecha} {agenda.horainicioagenda}", "%Y-%m-%d %H:%M:%S")
                hora_fin_agenda = timezone.datetime.strptime(f"{fecha} {agenda.horafinagenda}", "%Y-%m-%d %H:%M:%S")
                
                if hora_actual < hora_inicio_agenda:
                    diferencia = (hora_inicio_agenda - hora_actual).total_seconds() / 60
                    if diferencia >= duracion_min:
                        bloques_libres.append({
                            'inicio': hora_actual.strftime("%H:%M"),
                            'fin': hora_inicio_agenda.strftime("%H:%M")
                        })
                
                hora_actual = max(hora_actual, hora_fin_agenda)
            
            if hora_actual < hora_fin_dia:
                diferencia = (hora_fin_dia - hora_actual).total_seconds() / 60
                if diferencia >= duracion_min:
                    bloques_libres.append({
                        'inicio': hora_actual.strftime("%H:%M"),
                        'fin': hora_fin_dia.strftime("%H:%M")
                    })
            
            return Response({'bloques_libres': bloques_libres})
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)


#-------------------Mimir----------------------------#

class ResolverTopeView(APIView):
    def post(self, request):
        try:
            reservas_ids = request.data.get("reservas", [])
            if not reservas_ids or len(reservas_ids) < 2:
                return Response(
                    {"error": "Se requieren al menos 2 reservas en conflicto"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            reservas = Agendabox.objects.filter(
                id__in=reservas_ids
            ).select_related("idbox", "idmedico").prefetch_related("idbox__tipoboxes")
            
            if reservas.count() < 2:
                return Response(
                    {"error": "No se encontraron todas las reservas especificadas"},
                    status=status.HTTP_404_NOT_FOUND
                )

            primera_reserva = reservas.first()
            fecha = primera_reserva.fechaagenda
            hora_inicio = min(r.horainicioagenda for r in reservas)
            hora_fin = max(r.horafinagenda for r in reservas)
            box_original = primera_reserva.idbox.idbox if primera_reserva.idbox else None
            pasillo_original = primera_reserva.idbox.pasillobox if primera_reserva.idbox else None

            boxes_ocupados = Agendabox.objects.filter(
                fechaagenda=fecha,
                horainicioagenda__lt=hora_fin,
                horafinagenda__gt=hora_inicio
            ).values_list('idbox', flat=True)
            
            boxes_libres = Box.objects.exclude(
                idbox__in=boxes_ocupados
            ).filter(
                habilitado=True
            ).prefetch_related('tipoboxes')
            
            boxes_con_score = []
            for box in boxes_libres:
                score = 0
                razones = []
                
                carga = Agendabox.objects.filter(
                    idbox=box.idbox,
                    fechaagenda=fecha
                ).count()
                score += (10 - min(carga, 10)) * 3
                razones.append(f"Carga diaria: {carga} reservas")
                
                if box.pasillobox == pasillo_original:
                    score += 20
                    razones.append(f"Mismo pasillo: {box.pasillobox}")
                
                medicos_involucrados = [r.idmedico.idmedico for r in reservas if r.idmedico]
                if medicos_involucrados:
                    uso_medico = Agendabox.objects.filter(
                        idbox=box.idbox,
                        idmedico__in=medicos_involucrados
                    ).count()
                    if uso_medico > 0:
                        score += min(15, uso_medico * 3)
                        razones.append(f"Box usado {uso_medico} veces por médico(s) involucrado(s)")
                
                boxes_con_score.append({
                    'idbox': box.idbox,
                    'nombre': f"Box {box.idbox}",
                    'pasillo': box.pasillobox,
                    'score_total': score,
                    'criterios': [{'criterio': 'Carga', 'detalle': r} for r in razones]
                })

            boxes_con_score.sort(key=lambda x: x['score_total'], reverse=True)
            
            medicos_data = []
            for r in reservas:
                if r.idmedico:
                    medicos_data.append({
                        'idmedico': r.idmedico.idmedico,
                        'nombre': f"{r.idmedico.nombre} {r.idmedico.apellido}"
                    })
            
            return Response({
                'conflicto': {
                    'fecha': str(fecha),
                    'inicio': str(hora_inicio),
                    'fin': str(hora_fin),
                    'boxes_involucrados': [{
                        'id': box_original,
                        'nombre': f"Box {box_original}",
                        'pasillo': pasillo_original
                    }],
                    'medicos_involucrados': medicos_data
                },
                'recomendaciones': boxes_con_score,
                'recomendacion_principal': boxes_con_score[0] if boxes_con_score else None
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class AplicarSolucionView(APIView):
    """
    API para aplicar una solución previamente aprobada
    URL: /api/agenda/aplicar-solucion/
    Método: POST
    """
    
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
            
            reserva = Agendabox.objects.get(id=reserva_id)
            box_destino = Box.objects.get(idbox=box_destino_id)
            
            conflicto = Agendabox.objects.filter(
                idbox=box_destino_id,
                fechaagenda=reserva.fechaagenda,
                horainicioagenda__lt=reserva.horafinagenda,
                horafinagenda__gt=reserva.horainicioagenda
            ).exclude(id=reserva_id).exists()
            
            if conflicto:
                return Response(
                    {"error": "El box destino ya no está disponible en ese horario"},
                    status=status.HTTP_409_CONFLICT
                )
            
            box_original = reserva.idbox
            reserva.idbox = box_destino
            reserva.observaciones = self._actualizar_observaciones(reserva.observaciones, comentario, request.user)
            reserva.save()
            
            return Response(
                {
                    "mensaje": "Cambio aplicado exitosamente",
                    "reserva": {
                        "id": reserva.id,
                        "fecha": reserva.fechaagenda,
                        "hora_inicio": reserva.horainicioagenda,
                        "hora_fin": reserva.horafinagenda,
                        "responsable": reserva.nombre_responsable
                    },
                    "box_anterior": {
                        "id": box_original.idbox if box_original else None,
                        "nombre": f"Box {box_original.idbox}" if box_original else None
                    },
                    "box_nuevo": {
                        "id": box_destino.idbox,
                        "nombre": f"Box {box_destino.idbox}"
                    },
                    "usuario": str(request.user),
                    "fecha_cambio": timezone.now().isoformat(),
                    "comentario": comentario
                },
                status=status.HTTP_200_OK
            )
            
        except Agendabox.DoesNotExist:
            return Response(
                {"error": "Reserva no encontrada"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Box.DoesNotExist:
            return Response(
                {"error": "Box destino no encontrado"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _actualizar_observaciones(self, observaciones_actuales, comentario, usuario):
        """Actualiza el campo observaciones con el cambio realizado"""
        cambio = f"\n\n--- CAMBIO DE BOX ---\n"
        cambio += f"Fecha: {timezone.now().strftime('%Y-%m-%d %H:%M')}\n"
        cambio += f"Usuario: {usuario}\n"
        cambio += f"Comentario: {comentario}\n"
        
        if observaciones_actuales:
            return observaciones_actuales + cambio
        return cambio.strip()
        

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
    

class BoxToggleEstadoView(APIView):
    def patch(self, request, pk):
        try:
            box = Box.objects.get(pk=pk)
        except Box.DoesNotExist:
            return Response({'error': 'Box no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        nuevo_estado = request.data.get('estadobox')
        if nuevo_estado not in ['Habilitado', 'Inhabilitado']:
            return Response({'error': 'Estado inválido'}, status=status.HTTP_400_BAD_REQUEST)

        box.estadobox = nuevo_estado
        box.save()
        return Response({'idbox': box.idbox, 'estadobox': box.estadobox}, status=status.HTTP_200_OK)
# Views relacionadas con agendas

from rest_framework.views import APIView
from rest_framework.response import Response
from ..models import Box, Agendabox, Medico, Atenamb, LogAtenamb
from ..serializers import AgendaboxSerializer
from rest_framework import status
from rest_framework.exceptions import ValidationError
from django.db.models import Q, OuterRef, Subquery
from datetime import datetime, time, timedelta
from django.utils.dateparse import parse_datetime
from ..modulos.event_listener import VistaActualizableDisp
from rest_framework import serializers
from django.http import HttpResponse
import csv
from .utils import parse_date_param


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
                    
                    # Si la hora fin de una agenda es mayor que la hora inicio de la siguiente
                    if agenda_actual['horafinagenda'] > agenda_siguiente['horainicioagenda']:
                        agendas_con_tope.extend([agenda_actual, agenda_siguiente])
        
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


class AgendaDetalleExtendidoView(APIView):
    """Vista para obtener información completa de una agenda (PostgreSQL + MongoDB)"""
    
    def get(self, request, agenda_id):
        try:
            from ..mongo_models import AgendaExtendida
            
            # Obtener datos base de PostgreSQL
            agenda = Agendabox.objects.get(id=agenda_id)
            agenda_data = {
                'id': agenda.id,
                'fechaagenda': agenda.fechaagenda,
                'horainicioagenda': agenda.horainicioagenda,
                'horafinagenda': agenda.horafinagenda,
                'idbox': agenda.idbox_id,
                'esMedica': agenda.esMedica,
                'idmedico': agenda.idmedico_id,
                'nombre_medico': agenda.idmedico.nombre if agenda.idmedico else None,
                'nombre_responsable': agenda.nombre_responsable,
                'observaciones': agenda.observaciones,
                'habilitada': agenda.habilitada
            }
            
            # Intentar obtener datos extendidos de MongoDB
            agenda_extendida = AgendaExtendida.objects(agenda_id=agenda_id).first()
            
            if agenda_extendida:
                # Obtener nombres de todos los médicos de una sola consulta
                medicos_ids = [m.medico_id for m in agenda_extendida.medicos if m.medico_id]
                medicos_dict = {}
                
                if medicos_ids:
                    medicos_queryset = Medico.objects.filter(idmedico__in=medicos_ids).values('idmedico', 'nombre')
                    medicos_dict = {m['idmedico']: m['nombre'] for m in medicos_queryset}
                
                # Agregar información de MongoDB con nombres de médicos
                agenda_data['datos_mongo'] = {
                    'tipo_procedimiento': agenda_extendida.tipo_procedimiento,
                    'equipamiento_requerido': agenda_extendida.equipamiento_requerido,
                    'preparacion_especial': agenda_extendida.preparacion_especial,
                    'notas_adicionales': agenda_extendida.notas_adicionales,
                    'medicos': [
                        {
                            'medico_id': m.medico_id,
                            'nombre_medico': medicos_dict.get(m.medico_id, f'Médico ID {m.medico_id}'),
                            'es_principal': m.es_principal,
                            'rol': m.rol,
                            'hora_inicio': m.hora_inicio.isoformat() if m.hora_inicio else None,
                            'hora_fin': m.hora_fin.isoformat() if m.hora_fin else None,
                            'observaciones': m.observaciones
                        } for m in agenda_extendida.medicos
                    ],
                    'created_at': agenda_extendida.created_at.isoformat(),
                    'updated_at': agenda_extendida.updated_at.isoformat(),
                    'updated_by': agenda_extendida.updated_by
                }
            else:
                agenda_data['datos_mongo'] = None
            
            return Response(agenda_data, status=200)
            
        except Agendabox.DoesNotExist:
            return Response({'error': 'Agenda no encontrada'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

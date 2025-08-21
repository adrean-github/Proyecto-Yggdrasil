# Views especiales - Mimir (resolución de topes y optimización)

import traceback
from rest_framework.views import APIView
from rest_framework.response import Response
from ..models import Box, Agendabox
from rest_framework import status
from django.db.models import Q
from django.utils import timezone


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
                    score += 15
                    razones.append("Mismo pasillo que el box original")
                
                medicos_involucrados = [r.idmedico.idmedico for r in reservas if r.idmedico]
                if medicos_involucrados:
                    # Buscar historial de uso de este box por los médicos
                    uso_historico = Agendabox.objects.filter(
                        idbox=box.idbox,
                        idmedico__idmedico__in=medicos_involucrados
                    ).count()
                    score += min(uso_historico, 10) * 2
                    razones.append(f"Uso histórico por médicos: {uso_historico} veces")
                
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
                        'id': r.idmedico.idmedico,
                        'nombre': r.idmedico.nombre
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
                    {"error": "El box destino tiene conflictos de horario"},
                    status=status.HTTP_400_BAD_REQUEST
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

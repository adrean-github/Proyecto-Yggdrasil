# Views relacionadas con simulador y carga de archivos

import json
import pandas as pd
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from ..models import Agendabox
from ..serializers import AgendaboxSerializer
from ..modulos.agenda_adapter import SimuladorAdapter
from ..modulos.simulador_agenda import SimuladorAgenda
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def notificar_cambios_masivos_agenda(boxes_afectados):
    """
    Función helper para notificar cambios masivos en agendas del simulador
    """
    channel_layer = get_channel_layer()
    for box_id in boxes_afectados:
        async_to_sync(channel_layer.group_send)(
            "boxes",  # Grupo de boxes
            {
                "type": "agenda_box_actualizada",
                "box_id": box_id,
                "evento": "agenda_masiva_creada",
            }
        )


# Variable global para almacenar agendas temporalmente
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
            df = pd.read_csv(archivo)
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
        
        # Guardar las agendas
        Agendabox.objects.bulk_create(agendas)
        
        # ⭐ NUEVO: Recopilar boxes afectados y notificar cambios
        boxes_afectados = set()
        for agenda in agendas:
            boxes_afectados.add(agenda.idbox_id)
        
        # Notificar cambios masivos por WebSocket
        notificar_cambios_masivos_agenda(list(boxes_afectados))
        
        return JsonResponse({
            "mensaje": f"Agendas confirmadas y guardadas exitosamente. {len(boxes_afectados)} boxes afectados.",
            "boxes_afectados": len(boxes_afectados)
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

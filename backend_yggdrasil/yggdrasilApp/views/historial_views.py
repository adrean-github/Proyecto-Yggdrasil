# Views relacionadas con historial y modificaciones

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from ..models import HistorialModificacionesBox
from ..serializers import HistorialModificacionesBoxSerializer
from .utils import get_client_ip


@api_view(['GET'])
@permission_classes([AllowAny])  
def HistorialModificacionesBoxView(request, box_id):
    """Obtener historial completo de modificaciones de un box"""
    try:
        historial = HistorialModificacionesBox.objects.filter(id_box=box_id)
        serializer = HistorialModificacionesBoxSerializer(historial, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response([], status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def RegistrarModificacionBoxView(request):
    """Registrar una modificación en el historial"""
    try:
        data = request.data.copy()
        data['usuario'] = request.user.username
        data['ip_address'] = get_client_ip(request)
        
        serializer = HistorialModificacionesBoxSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

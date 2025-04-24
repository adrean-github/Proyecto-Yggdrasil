from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Box
from .serializers import BoxSerializer
from rest_framework.decorators import api_view
from rest_framework import status

class BoxListView(APIView):
    def get(self, request, *args, **kwargs):
        box_id = kwargs.get('id')

        if box_id:
            try:
                box = Box.objects.get(idbox=box_id)
                serializer = BoxSerializer(box)
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Box.DoesNotExist:
                return Response({'error': 'Box no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        else:
            boxes = Box.objects.all()
            serializer = BoxSerializer(boxes, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
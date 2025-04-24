from rest_framework import serializers
from .models import Box, Agendabox

class BoxSerializer(serializers.ModelSerializer):
    class Meta:
        model = Box
        fields ='__all__'


class AgendaboxSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agendabox
        fields ='__all__'


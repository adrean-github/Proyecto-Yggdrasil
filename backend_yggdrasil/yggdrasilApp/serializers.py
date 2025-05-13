from rest_framework import serializers
from .models import Box, Agendabox, Atenamb

class BoxSerializer(serializers.ModelSerializer):
    class Meta:
        model = Box
        fields ='__all__'


class AgendaboxSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agendabox
        fields ='__all__'


class AtenambSerializer(serializers.ModelSerializer):
    class Meta:
        model = Atenamb
        fields ='__all__'
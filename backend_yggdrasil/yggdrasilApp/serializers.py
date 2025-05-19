from rest_framework import serializers
from .models import Box, Agendabox, Atenamb , Tipobox, BoxTipoBox
from django.db.models import Prefetch

"""

class BoxSerializer(serializers.ModelSerializer):
    class Meta:
        model = Box
        fields ='__all__'
"""

class AgendaboxSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agendabox
        fields ='__all__'


class AtenambSerializer(serializers.ModelSerializer):
    class Meta:
        model = Atenamb
        fields ='__all__'


class BoxSerializer(serializers.ModelSerializer):
    especialidades = serializers.SerializerMethodField()
    especialidad_principal = serializers.SerializerMethodField()

    class Meta:
        model = Box
        fields = ['idbox', 'estadobox', 'pasillobox', 'comentario', 'especialidades', 'especialidad_principal']

    def get_especialidades(self, obj):
        return [relacion.idtipobox.tipo for relacion in BoxTipoBox.objects.filter(idbox=obj)]

    def get_especialidad_principal(self, obj):
        relacion = BoxTipoBox.objects.filter(idbox=obj, tipoprincipal=True).first()
        return relacion.idtipobox.tipo if relacion else None


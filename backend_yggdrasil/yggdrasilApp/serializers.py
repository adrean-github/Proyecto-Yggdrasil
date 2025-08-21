from rest_framework import serializers
from .models import Box, Agendabox, Atenamb , Tipobox, BoxTipoBox, Medico, HistorialModificacionesBox
from django.db.models import Prefetch



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
        fields = ['idbox', 'estadobox', 'pasillobox', 'comentario', 'especialidades', 'especialidad_principal', 'comentario']

    def get_especialidades(self, obj):
        return [relacion.idtipobox.tipo for relacion in BoxTipoBox.objects.filter(idbox=obj)]

    def get_especialidad_principal(self, obj):
        relacion = BoxTipoBox.objects.filter(idbox=obj, tipoprincipal=True).first()
        return relacion.idtipobox.tipo if relacion else None


class MedicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medico
        fields = ['idmedico', 'nombre', 'apellido']  
        

class HistorialModificacionesBoxSerializer(serializers.ModelSerializer):
    fecha_formateada = serializers.SerializerMethodField()
    
    class Meta:
        model = HistorialModificacionesBox
        fields = '__all__'
    
    def get_fecha_formateada(self, obj):
        return obj.fecha.strftime('%d/%m/%Y %H:%M')
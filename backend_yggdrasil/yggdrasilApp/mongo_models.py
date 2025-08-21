"""
Modelos MongoDB para extensiones de datos
- Inventario de implementos por box
- Múltiples médicos por agenda
- Base extensible para futuras agregaciones
"""
from mongoengine import Document, EmbeddedDocument, fields
from datetime import datetime


class Implemento(EmbeddedDocument):
    """Implemento individual en el inventario"""
    nombre = fields.StringField(required=True, max_length=100)
    descripcion = fields.StringField(max_length=255)
    marca = fields.StringField(max_length=50)
    modelo = fields.StringField(max_length=50)
    numero_serie = fields.StringField(max_length=100)
    operacional = fields.BooleanField(default=True)
    fecha_ultimo_mantenimiento = fields.DateTimeField()
    fecha_proximo_mantenimiento = fields.DateTimeField()
    observaciones = fields.StringField(max_length=500)
    fecha_agregado = fields.DateTimeField(default=datetime.now)


class InventarioBox(Document):
    """Inventario de implementos para cada box"""
    box_id = fields.IntField(required=True, unique=True)
    
    # Lista de implementos
    implementos = fields.ListField(fields.EmbeddedDocumentField(Implemento))
    
    # Metadata
    created_at = fields.DateTimeField(default=datetime.now)
    updated_at = fields.DateTimeField(default=datetime.now)
    updated_by = fields.StringField(max_length=100)  # Usuario que actualizó
    
    meta = {
        'collection': 'inventario_boxes',
        'indexes': ['box_id']
    }
    
    def save(self, *args, **kwargs):
        self.updated_at = datetime.now()
        return super().save(*args, **kwargs)
    
    def agregar_implemento(self, nombre, descripcion=None, marca=None, modelo=None, 
                          numero_serie=None, operacional=True, observaciones=None):
        """Método helper para agregar un implemento"""
        implemento = Implemento(
            nombre=nombre,
            descripcion=descripcion,
            marca=marca,
            modelo=modelo,
            numero_serie=numero_serie,
            operacional=operacional,
            observaciones=observaciones
        )
        self.implementos.append(implemento)
        return implemento
    
    def get_implementos_no_operacionales(self):
        """Obtiene lista de implementos no operacionales"""
        return [impl for impl in self.implementos if not impl.operacional]
    
    def get_implementos_por_mantenimiento(self):
        """Obtiene implementos que necesitan mantenimiento pronto"""
        hoy = datetime.now()
        return [impl for impl in self.implementos 
                if impl.fecha_proximo_mantenimiento and impl.fecha_proximo_mantenimiento <= hoy]


class MedicoEnAgenda(EmbeddedDocument):
    """Médico participante en una agenda"""
    medico_id = fields.IntField(required=True)
    es_principal = fields.BooleanField(default=False)  # Médico principal de la agenda
    rol = fields.StringField(max_length=50)  # ej: "titular", "residente", "supervisor"
    hora_inicio = fields.DateTimeField()  # Si tiene horario específico diferente
    hora_fin = fields.DateTimeField()
    observaciones = fields.StringField(max_length=255)


class AgendaExtendida(Document):
    """Extensión de datos para agendas con múltiples médicos"""
    agenda_id = fields.IntField(required=True, unique=True)
    
    # Múltiples médicos
    medicos = fields.ListField(fields.EmbeddedDocumentField(MedicoEnAgenda))
    
    # Datos adicionales que podrías necesitar
    tipo_procedimiento = fields.StringField(max_length=100)
    equipamiento_requerido = fields.ListField(fields.StringField(max_length=100))
    preparacion_especial = fields.StringField(max_length=500)
    notas_adicionales = fields.StringField(max_length=1000)
    
    # Control de cambios
    historial_cambios = fields.ListField(fields.DictField())
    
    # Metadata
    created_at = fields.DateTimeField(default=datetime.now)
    updated_at = fields.DateTimeField(default=datetime.now)
    updated_by = fields.StringField(max_length=100)
    
    meta = {
        'collection': 'agendas_extendidas',
        'indexes': ['agenda_id']
    }
    
    def save(self, *args, **kwargs):
        self.updated_at = datetime.now()
        return super().save(*args, **kwargs)
    
    def agregar_medico(self, medico_id, es_principal=False, rol=None, 
                       hora_inicio=None, hora_fin=None, observaciones=None):
        """Método helper para agregar un médico"""
        medico = MedicoEnAgenda(
            medico_id=medico_id,
            es_principal=es_principal,
            rol=rol,
            hora_inicio=hora_inicio,
            hora_fin=hora_fin,
            observaciones=observaciones
        )
        self.medicos.append(medico)
        return medico
    
    def get_medico_principal(self):
        """Obtiene el médico principal de la agenda"""
        for medico in self.medicos:
            if medico.es_principal:
                return medico
        return self.medicos[0] if self.medicos else None
    
    def registrar_cambio(self, usuario, accion, detalle=None):
        """Registra un cambio en el historial"""
        cambio = {
            'timestamp': datetime.now(),
            'usuario': usuario,
            'accion': accion,
            'detalle': detalle
        }
        self.historial_cambios.append(cambio)


# Modelo base extensible para futuras agregaciones
class AggregationBase(Document):
    """Modelo base extensible para diferentes tipos de agregaciones"""
    tipo_agregacion = fields.StringField(required=True, max_length=50)  # "inventario", "agenda", "custom"
    entidad_id = fields.IntField(required=True)  # ID de la entidad (box, agenda, etc.)
    entidad_tipo = fields.StringField(required=True, max_length=20)  # "box", "agenda", "medico"
    
    # Datos flexibles
    datos = fields.DictField()  # Almacenamiento flexible de cualquier dato
    
    # Metadata común
    fecha_inicio = fields.DateTimeField()
    fecha_fin = fields.DateTimeField()
    activo = fields.BooleanField(default=True)
    tags = fields.ListField(fields.StringField(max_length=50))  # Para categorizar
    
    # Control
    created_at = fields.DateTimeField(default=datetime.now)
    updated_at = fields.DateTimeField(default=datetime.now)
    created_by = fields.StringField(max_length=100)
    
    meta = {
        'collection': 'agregaciones_base',
        'indexes': [
            ('tipo_agregacion', 'entidad_tipo'),
            'entidad_id',
            'activo'
        ]
    }
    
    def save(self, *args, **kwargs):
        self.updated_at = datetime.now()
        return super().save(*args, **kwargs)


# Modelo específico para métricas futuras (preparado pero simple)
class MetricasBasicas(Document):
    """Modelo simple para métricas básicas - extensible"""
    nombre_metrica = fields.StringField(required=True, max_length=100)
    valor = fields.FloatField()
    unidad = fields.StringField(max_length=20)  # "porcentaje", "cantidad", "horas"
    
    # Contexto
    box_id = fields.IntField()
    medico_id = fields.IntField()
    fecha = fields.DateTimeField(default=datetime.now)
    periodo = fields.StringField(max_length=20)  # "diario", "semanal", "mensual"
    
    # Datos adicionales flexibles
    metadata = fields.DictField()
    
    created_at = fields.DateTimeField(default=datetime.now)
    
    meta = {
        'collection': 'metricas_basicas',
        'indexes': [
            ('nombre_metrica', 'fecha'),
            'box_id',
            'medico_id'
        ]
    }


class DashboardCache(Document):
    """Cache optimizado para métricas del dashboard - evita consultas complejas en tiempo real"""
    periodo = fields.StringField(required=True, choices=['day', 'week', 'month', 'year'])
    fecha_inicio = fields.DateTimeField(required=True)
    fecha_fin = fields.DateTimeField(required=True)
    
    # Métricas pre-calculadas (lo que actualmente calculas en tiempo real)
    total_boxes = fields.IntField(default=0)
    total_reservas = fields.IntField(default=0)
    reservas_medicas = fields.IntField(default=0)
    reservas_no_medicas = fields.IntField(default=0)
    
    # Ocupación optimizada
    porcentaje_ocupacion = fields.FloatField(default=0.0)
    tiempo_promedio_ocupacion = fields.FloatField(default=0.0)
    horas_muertas = fields.FloatField(default=0.0)
    
    # Box más/menos utilizados (pre-calculado)
    box_mas_utilizado = fields.DictField()  # {box_id, total_reservas, nombre}
    box_menos_utilizado = fields.DictField()
    
    # Ocupación por turnos (pre-calculada)
    ocupacion_am = fields.IntField(default=0)
    ocupacion_pm = fields.IntField(default=0)
    
    # Top boxes por ocupación
    ranking_boxes = fields.ListField(fields.DictField())  # [{box_id, total, porcentaje}]
    
    # Estadísticas por especialidad (pre-calculadas)
    especialidades_stats = fields.ListField(fields.DictField())
    
    # Alertas automáticas
    alertas = fields.ListField(fields.DictField())  # Boxes sin reservas, sobrecarga, etc.
    
    # Tendencias (últimos períodos para gráficos)
    tendencia_ocupacion = fields.ListField(fields.FloatField())  # Últimos 7 días/semanas
    
    # Metadata
    tiempo_calculo_ms = fields.IntField()  # Para monitorear performance
    created_at = fields.DateTimeField(default=datetime.now)
    expires_at = fields.DateTimeField()  # TTL del cache
    
    meta = {
        'collection': 'dashboard_cache',
        'indexes': [
            ('periodo', 'fecha_inicio'),
            'expires_at'
        ]
    }


class EstadisticasBox(Document):
    """Estadísticas históricas por box - para análisis de eficiencia"""
    box_id = fields.IntField(required=True)
    mes = fields.IntField(required=True)  # 1-12
    anio = fields.IntField(required=True)
    
    # Métricas mensuales por box
    total_reservas_mes = fields.IntField(default=0)
    horas_ocupadas_mes = fields.FloatField(default=0.0)
    eficiencia_promedio = fields.FloatField(default=0.0)  # % de tiempo ocupado vs disponible
    
    # Patrones de uso
    dia_mas_ocupado = fields.IntField()  # 1=lunes, 7=domingo
    hora_pico = fields.IntField()  # Hora con más reservas
    
    # Mantenimiento e incidencias
    implementos_no_operacionales = fields.IntField(default=0)
    ultima_revision_implementos = fields.DateTimeField()
    
    # Para identificar boxes problemáticos
    reservas_canceladas = fields.IntField(default=0)
    tiempo_muerto_promedio = fields.FloatField(default=0.0)
    
    meta = {
        'collection': 'estadisticas_box',
        'indexes': [
            ('box_id', 'anio', 'mes'),
            'eficiencia_promedio'
        ]
    }


class AlertasInteligentes(Document):
    """Sistema de alertas basado en patrones y umbrales"""
    tipo_alerta = fields.StringField(required=True, choices=[
        'box_subutilizado',      # Box con muy pocas reservas
        'box_sobrecargado',      # Box con demasiadas reservas
        'implementos_fallan',    # Muchos implementos no operacionales
        'patron_cancelaciones',  # Demasiadas cancelaciones
        'eficiencia_baja',      # Eficiencia menor a umbral
        'mantenimiento_pendiente'
    ])
    
    # Contexto de la alerta
    box_id = fields.IntField()
    medico_id = fields.IntField()
    agenda_id = fields.IntField()
    
    # Detalles de la alerta
    titulo = fields.StringField(max_length=200)
    descripcion = fields.StringField(max_length=500)
    severidad = fields.StringField(choices=['baja', 'media', 'alta', 'critica'])
    
    # Datos que dispararon la alerta
    valor_actual = fields.FloatField()
    umbral_definido = fields.FloatField()
    datos_contexto = fields.DictField()
    
    # Estado
    activa = fields.BooleanField(default=True)
    fecha_resolucion = fields.DateTimeField()
    resuelto_por = fields.StringField(max_length=100)
    
    created_at = fields.DateTimeField(default=datetime.now)
    
    meta = {
        'collection': 'alertas_inteligentes',
        'indexes': [
            ('tipo_alerta', 'activa'),
            'box_id',
            'severidad'
        ]
    }

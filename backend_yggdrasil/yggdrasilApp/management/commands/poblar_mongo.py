"""
Comando para poblar MongoDB con datos ficticios pero consistentes
basados en la base de datos SQL existente
"""
from django.core.management.base import BaseCommand
from django.db.models import Q
from datetime import datetime, timedelta, time
import random
from yggdrasilApp.models import Box, Agendabox, Medico, Tipobox, BoxTipoBox
from yggdrasilApp.mongo_models import (
    InventarioBox, AgendaExtendida, DashboardCache, 
    EstadisticasBox, AlertasInteligentes, MetricasBasicas
)
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Pobla MongoDB con datos ficticios consistentes basados en SQL'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--boxes',
            type=int,
            default=0,
            help='Número de boxes para los que generar inventario (0 = todos)'
        )
        parser.add_argument(
            '--agendas',
            type=int,
            default=50,
            help='Número de agendas para las que generar datos extendidos'
        )
        parser.add_argument(
            '--limpiar',
            action='store_true',
            help='Limpiar datos existentes en MongoDB antes de poblar'
        )
        parser.add_argument(
            '--solo-inventario',
            action='store_true',
            help='Solo generar inventarios de boxes'
        )
        parser.add_argument(
            '--solo-agendas',
            action='store_true',
            help='Solo generar agendas extendidas'
        )
        parser.add_argument(
            '--solo-cache',
            action='store_true',
            help='Solo generar cache del dashboard'
        )
    
    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🚀 Iniciando población de MongoDB...')
        )
        
        if options['limpiar']:
            self.limpiar_datos_mongo()
        
        if options['solo_inventario']:
            self.generar_inventarios(options['boxes'])
        elif options['solo_agendas']:
            self.generar_agendas_extendidas(options['agendas'])
        elif options['solo_cache']:
            self.generar_cache_dashboard()
        else:
            # Generar todo
            self.generar_inventarios(options['boxes'])
            self.generar_agendas_extendidas(options['agendas'])
            self.generar_estadisticas_historicas()
            self.generar_cache_dashboard()
            self.generar_alertas_ficticias()
        
        self.stdout.write(
            self.style.SUCCESS('✅ Población de MongoDB completada!')
        )
    
    def limpiar_datos_mongo(self):
        """Limpia todos los datos de MongoDB"""
        self.stdout.write('🧹 Limpiando datos existentes en MongoDB...')
        
        try:
            # Limpiar todas las colecciones
            InventarioBox.objects.all().delete()
            AgendaExtendida.objects.all().delete()
            DashboardCache.objects.all().delete()
            EstadisticasBox.objects.all().delete()
            AlertasInteligentes.objects.all().delete()
            MetricasBasicas.objects.all().delete()
            
            self.stdout.write(
                self.style.SUCCESS('✅ Datos de MongoDB limpiados')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error limpiando MongoDB: {str(e)}')
            )
    
    def generar_inventarios(self, num_boxes=0):
        """Genera inventarios ficticios para boxes"""
        self.stdout.write('📦 Generando inventarios de boxes...')
        
        try:
            # Obtener boxes de SQL
            if num_boxes > 0:
                boxes = Box.objects.all()[:num_boxes]
            else:
                boxes = Box.objects.all()
            
            implementos_base = [
                'Monitor de Signos Vitales',
                'Desfibrilador',
                'Ventilador Mecánico',
                'Bomba de Infusión',
                'Oxímetro de Pulso',
                'Electrocardiografo',
                'Camilla Eléctrica',
                'Lámpara Quirúrgica',
                'Aspirador de Secreciones',
                'Monitor de Presión Arterial',
                'Nebulizador',
                'Termómetro Digital',
                'Glucómetro',
                'Fonendoscopio',
                'Otoscopio'
            ]
            
            marcas = ['Philips', 'GE Healthcare', 'Siemens', 'Medtronic', 'Dräger', 'Mindray']
            
            inventarios_creados = 0
            
            for box in boxes:
                # Verificar si ya existe inventario
                inventario_existente = InventarioBox.objects(box_id=box.idbox).first()
                if inventario_existente:
                    self.stdout.write(f'⚠️  Box {box.idbox} ya tiene inventario, saltando...')
                    continue
                
                inventario = InventarioBox(box_id=box.idbox, updated_by='sistema_poblado')
                
                # Generar entre 3 y 8 implementos por box
                num_implementos = random.randint(3, 8)
                implementos_box = random.sample(implementos_base, num_implementos)
                
                for implemento_nombre in implementos_box:
                    # 85% probabilidad de que esté operacional
                    operacional = random.random() < 0.85
                    
                    # Fechas de mantenimiento
                    fecha_ultimo = datetime.now() - timedelta(days=random.randint(30, 180))
                    fecha_proximo = fecha_ultimo + timedelta(days=random.randint(90, 365))
                    
                    inventario.agregar_implemento(
                        nombre=implemento_nombre,
                        descripcion=f"Equipo médico - {implemento_nombre}",
                        marca=random.choice(marcas),
                        modelo=f"Modelo-{random.randint(100, 999)}",
                        numero_serie=f"SN{random.randint(10000, 99999)}",
                        operacional=operacional,
                        observaciones="Funcionando correctamente" if operacional else "Requiere mantenimiento"
                    )
                    
                    # Actualizar fechas de mantenimiento
                    inventario.implementos[-1].fecha_ultimo_mantenimiento = fecha_ultimo
                    inventario.implementos[-1].fecha_proximo_mantenimiento = fecha_proximo
                
                inventario.save()
                inventarios_creados += 1
                
                self.stdout.write(f'📦 Box {box.idbox}: {num_implementos} implementos')
            
            self.stdout.write(
                self.style.SUCCESS(f'✅ {inventarios_creados} inventarios de boxes creados')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error generando inventarios: {str(e)}')
            )
    
    def generar_agendas_extendidas(self, num_agendas=50):
        """Genera agendas extendidas ficticias"""
        self.stdout.write('📅 Generando agendas extendidas...')
        
        try:
            # Obtener agendas médicas recientes de SQL
            agendas_medicas = Agendabox.objects.filter(
                esMedica=1,
                fechaagenda__gte=datetime.now().date() - timedelta(days=30)
            ).order_by('-fechaagenda')[:num_agendas]
            
            medicos = list(Medico.objects.all())
            
            tipos_procedimiento = [
                'Consulta General',
                'Cirugía Menor',
                'Endoscopia',
                'Ecografía',
                'Electrocardiograma',
                'Radiografía',
                'Tomografía',
                'Resonancia Magnética',
                'Biopsia',
                'Quimioterapia'
            ]
            
            roles_medicos = ['titular', 'residente', 'supervisor', 'especialista', 'consultor']
            
            agendas_creadas = 0
            
            for agenda in agendas_medicas:
                # Verificar si ya existe agenda extendida
                agenda_ext_existente = AgendaExtendida.objects(agenda_id=agenda.id).first()
                if agenda_ext_existente:
                    continue
                
                agenda_ext = AgendaExtendida(
                    agenda_id=agenda.id,
                    tipo_procedimiento=random.choice(tipos_procedimiento),
                    updated_by='sistema_poblado'
                )
                
                # Agregar médico principal (el que ya está en la agenda)
                if agenda.idmedico:
                    agenda_ext.agregar_medico(
                        medico_id=agenda.idmedico.idmedico,
                        es_principal=True,
                        rol='titular',
                        hora_inicio=datetime.combine(agenda.fechaagenda, agenda.horainicioagenda) if agenda.horainicioagenda else None,
                        hora_fin=datetime.combine(agenda.fechaagenda, agenda.horafinagenda) if agenda.horafinagenda else None
                    )
                
                # 40% probabilidad de tener médicos adicionales
                if random.random() < 0.4 and len(medicos) > 1:
                    num_medicos_adicionales = random.randint(1, 2)
                    medicos_disponibles = [m for m in medicos if not agenda.idmedico or m.idmedico != agenda.idmedico.idmedico]
                    
                    for _ in range(min(num_medicos_adicionales, len(medicos_disponibles))):
                        medico_adicional = random.choice(medicos_disponibles)
                        medicos_disponibles.remove(medico_adicional)
                        
                        agenda_ext.agregar_medico(
                            medico_id=medico_adicional.idmedico,
                            es_principal=False,
                            rol=random.choice(roles_medicos[1:]),  # No titular
                            observaciones=f"Médico de apoyo - {random.choice(['Supervisión', 'Asistencia', 'Entrenamiento'])}"
                        )
                
                # Equipamiento requerido
                if agenda_ext.tipo_procedimiento in ['Cirugía Menor', 'Endoscopia', 'Biopsia']:
                    agenda_ext.equipamiento_requerido = [
                        'Instrumental quirúrgico',
                        'Monitor de signos vitales',
                        'Anestesia local'
                    ]
                elif agenda_ext.tipo_procedimiento in ['Ecografía', 'Radiografía']:
                    agenda_ext.equipamiento_requerido = [
                        'Equipo de imagenología',
                        'Gel conductor',
                        'Protección radiológica'
                    ]
                
                # Notas adicionales
                agenda_ext.notas_adicionales = f"Procedimiento: {agenda_ext.tipo_procedimiento}. " + \
                    random.choice([
                        "Paciente en ayunas.",
                        "Revisar alergias previas.",
                        "Consentimiento informado firmado.",
                        "Preparación especial requerida."
                    ])
                
                # Registrar cambio inicial
                agenda_ext.registrar_cambio(
                    usuario='sistema_poblado',
                    accion='creacion_automatica',
                    detalle='Agenda extendida generada automáticamente'
                )
                
                agenda_ext.save()
                agendas_creadas += 1
                
                if agendas_creadas % 10 == 0:
                    self.stdout.write(f'📅 {agendas_creadas} agendas extendidas creadas...')
            
            self.stdout.write(
                self.style.SUCCESS(f'✅ {agendas_creadas} agendas extendidas creadas')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error generando agendas extendidas: {str(e)}')
            )
    
    def generar_estadisticas_historicas(self):
        """Genera estadísticas históricas por box"""
        self.stdout.write('📊 Generando estadísticas históricas...')
        
        try:
            from yggdrasilApp.modulos.dashboard_optimizer import DashboardOptimizer
            
            # Generar estadísticas para los últimos 3 meses
            fecha_actual = datetime.now()
            
            for i in range(3):  # Últimos 3 meses
                mes_fecha = fecha_actual - timedelta(days=30 * i)
                DashboardOptimizer.generar_estadisticas_mensuales_boxes()
                self.stdout.write(f'📊 Estadísticas generadas para mes {mes_fecha.strftime("%B %Y")}')
            
            self.stdout.write(
                self.style.SUCCESS('✅ Estadísticas históricas generadas')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error generando estadísticas: {str(e)}')
            )
    
    def generar_cache_dashboard(self):
        """Genera cache inicial del dashboard"""
        self.stdout.write('🚀 Generando cache del dashboard...')
        
        try:
            from yggdrasilApp.modulos.dashboard_optimizer import DashboardOptimizer
            
            periodos = ['day', 'week', 'month', 'year']
            
            for periodo in periodos:
                cache = DashboardOptimizer.precalcular_dashboard(periodo)
                if cache:
                    self.stdout.write(f'🚀 Cache generado para período: {periodo}')
                else:
                    self.stdout.write(f'⚠️  Error generando cache para: {periodo}')
            
            self.stdout.write(
                self.style.SUCCESS('✅ Cache del dashboard generado')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error generando cache: {str(e)}')
            )
    
    def generar_alertas_ficticias(self):
        """Genera algunas alertas ficticias para demostración"""
        self.stdout.write('🚨 Generando alertas ficticias...')
        
        try:
            boxes = Box.objects.all()[:5]  # Primeros 5 boxes
            
            alertas_creadas = 0
            
            for box in boxes:
                # 30% probabilidad de alerta por box
                if random.random() < 0.3:
                    tipo_alerta = random.choice([
                        'box_subutilizado',
                        'implementos_fallan',
                        'eficiencia_baja'
                    ])
                    
                    if tipo_alerta == 'box_subutilizado':
                        alerta = AlertasInteligentes(
                            tipo_alerta=tipo_alerta,
                            box_id=box.idbox,
                            titulo=f"Box {box.idbox} subutilizado",
                            descripcion=f"El box {box.idbox} tiene muy pocas reservas esta semana",
                            severidad='media',
                            valor_actual=random.randint(1, 4),
                            umbral_definido=5.0,
                            datos_contexto={
                                'pasillo': box.pasillobox,
                                'estado': box.estadobox
                            }
                        )
                    elif tipo_alerta == 'implementos_fallan':
                        alerta = AlertasInteligentes(
                            tipo_alerta=tipo_alerta,
                            box_id=box.idbox,
                            titulo=f"Implementos no operacionales en Box {box.idbox}",
                            descripcion=f"Hay implementos que requieren mantenimiento",
                            severidad='alta',
                            valor_actual=random.randint(1, 3),
                            umbral_definido=1.0,
                            datos_contexto={
                                'implementos_afectados': random.randint(1, 3)
                            }
                        )
                    else:  # eficiencia_baja
                        alerta = AlertasInteligentes(
                            tipo_alerta=tipo_alerta,
                            box_id=box.idbox,
                            titulo=f"Eficiencia baja en Box {box.idbox}",
                            descripcion=f"La eficiencia del box está por debajo del promedio",
                            severidad='media',
                            valor_actual=random.uniform(40, 60),
                            umbral_definido=70.0,
                            datos_contexto={
                                'eficiencia_promedio_general': 75.5
                            }
                        )
                    
                    alerta.save()
                    alertas_creadas += 1
            
            self.stdout.write(
                self.style.SUCCESS(f'✅ {alertas_creadas} alertas ficticias creadas')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error generando alertas: {str(e)}')
            )

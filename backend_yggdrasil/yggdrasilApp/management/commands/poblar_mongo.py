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
        """Genera agendas extendidas ficticias basadas en datos reales"""
        self.stdout.write('📅 Generando agendas extendidas para TODAS las agendas...')
        
        try:
            # Obtener TODAS las agendas disponibles (no solo médicas)
            todas_agendas = Agendabox.objects.all().order_by('-fechaagenda')
            
            # Debug: mostrar cuántas agendas encontramos
            self.stdout.write(f'🔍 Encontradas {todas_agendas.count()} agendas en total')
            
            medicos = list(Medico.objects.all())
            self.stdout.write(f'👨‍⚕️ Encontrados {len(medicos)} médicos en la base de datos')
            
            # Ya no calculamos probabilidad - procesamos TODAS las agendas
            self.stdout.write(f'🎯 Objetivo: Poblar TODAS las {todas_agendas.count()} agendas con datos extendidos')
            
            tipos_procedimiento_por_especialidad = {
                'CIRUGIA': [
                    'Cirugía General', 'Cirugía Laparoscópica', 'Cirugía de Emergencia',
                    'Cirugía Cardiovascular', 'Cirugía Traumatológica', 'Cirugía Plástica',
                    'Cirugía Neurológica', 'Cirugía Urológica'
                ],
                'CONSULTA': [
                    'Consulta General', 'Consulta Especializada', 'Control Post-operatorio',
                    'Evaluación Pre-quirúrgica', 'Consulta de Urgencia', 'Segunda Opinión'
                ],
                'DIAGNOSTICO': [
                    'Ecografía', 'Endoscopia', 'Colonoscopia', 'Biopsia',
                    'Electrocardiograma', 'Holter', 'Pruebas de Función Pulmonar'
                ],
                'IMAGENOLOGIA': [
                    'Radiografía', 'Tomografía', 'Resonancia Magnética',
                    'Angiografía', 'Mamografía', 'Densitometría'
                ],
                'TERAPIA': [
                    'Quimioterapia', 'Radioterapia', 'Hemodiálisis',
                    'Fisioterapia', 'Terapia Respiratoria', 'Rehabilitación'
                ]
            }
            
            roles_medicos_especializados = [
                'Cirujano Principal', 'Cirujano Asistente', 'Anestesista',
                'Enfermero Instrumentista', 'Residente', 'Interno',
                'Supervisor', 'Especialista Consultor', 'Médico Tratante',
                'Jefe de Servicio', 'Médico de Apoyo'
            ]
            
            equipamiento_por_tipo = {
                'CIRUGIA': [
                    'Mesa Quirúrgica', 'Lámpara Quirúrgica', 'Electrocauterio',
                    'Aspirador Quirúrgico', 'Monitor de Anestesia', 'Ventilador',
                    'Desfibrilador', 'Instrumental Especializado'
                ],
                'CONSULTA': [
                    'Camilla de Examen', 'Tensiómetro', 'Fonendoscopio',
                    'Otoscopio', 'Oftalmoscopio', 'Báscula', 'Tallímetro'
                ],
                'DIAGNOSTICO': [
                    'Ecógrafo', 'Endoscopio', 'Monitor de Signos Vitales',
                    'Electrocardiógrafo', 'Equipo de Biopsia'
                ],
                'IMAGENOLOGIA': [
                    'Equipo de Rayos X', 'Tomógrafo', 'Resonador',
                    'Mamógrafo', 'Contraste', 'Protección Radiológica'
                ],
                'TERAPIA': [
                    'Bomba de Infusión', 'Monitor Cardiaco', 'Equipo de Diálisis',
                    'Ventilador', 'Oxígeno', 'Medicamentos Especializados'
                ]
            }
            
            agendas_creadas = 0
            agendas_procesadas = 0
            agendas_saltadas_existentes = 0
            
            for agenda in todas_agendas:
                agendas_procesadas += 1
                
                # NO usar probabilidad - procesar TODAS las agendas
                
                # Verificar si ya existe agenda extendida
                agenda_ext_existente = AgendaExtendida.objects(agenda_id=agenda.id).first()
                if agenda_ext_existente:
                    agendas_saltadas_existentes += 1
                    if agendas_saltadas_existentes % 1000 == 0:
                        self.stdout.write(f'⚠️ {agendas_saltadas_existentes} agendas ya tienen extensión...')
                    continue
                
                # Debug: mostrar progreso cada 2000 agendas
                if agendas_creadas % 2000 == 0 and agendas_creadas > 0:
                    porcentaje = (agendas_procesadas / todas_agendas.count()) * 100
                    self.stdout.write(f'🔄 Progreso: {agendas_creadas} creadas, {agendas_procesadas} procesadas ({porcentaje:.1f}%)')
                
                # Determinar tipo de procedimiento basado en el box
                tipo_box = 'CONSULTA'  # Default
                try:
                    if agenda.idbox:
                        # Intentar determinar el tipo de box
                        box_tipos = BoxTipoBox.objects.filter(idbox=agenda.idbox)
                        if box_tipos.exists():
                            # Corregir el nombre del campo - podría ser nombretipobox, nombre, o descripcion
                            tipo_box_obj = box_tipos.first().idtipobox
                            primer_tipo = ""
                            
                            # Intentar diferentes nombres de campo
                            if hasattr(tipo_box_obj, 'nombretipobox'):
                                primer_tipo = tipo_box_obj.nombretipobox.upper()
                            elif hasattr(tipo_box_obj, 'nombre'):
                                primer_tipo = tipo_box_obj.nombre.upper()
                            elif hasattr(tipo_box_obj, 'descripcion'):
                                primer_tipo = tipo_box_obj.descripcion.upper()
                            elif hasattr(tipo_box_obj, 'tipo'):
                                primer_tipo = tipo_box_obj.tipo.upper()
                            else:
                                # Si no encontramos el campo, usar string representation
                                primer_tipo = str(tipo_box_obj).upper()
                            
                            if any(keyword in primer_tipo for keyword in ['CIRUG', 'QUIROF']):
                                tipo_box = 'CIRUGIA'
                            elif any(keyword in primer_tipo for keyword in ['IMAGEN', 'RADIO', 'TOMO']):
                                tipo_box = 'IMAGENOLOGIA'
                            elif any(keyword in primer_tipo for keyword in ['DIAG', 'ENDO', 'ECO']):
                                tipo_box = 'DIAGNOSTICO'
                            elif any(keyword in primer_tipo for keyword in ['TERAP', 'QUIMIO', 'DIALISIS']):
                                tipo_box = 'TERAPIA'
                except Exception as e:
                    # Silenciar el error ya que no afecta la funcionalidad
                    pass  # Mantener default
                
                agenda_ext = AgendaExtendida(
                    agenda_id=agenda.id,
                    tipo_procedimiento=random.choice(tipos_procedimiento_por_especialidad[tipo_box]),
                    updated_by='sistema_poblado'
                )
                
                # Agregar médico principal (el que ya está en la agenda)
                if agenda.idmedico:
                    # Determinar rol principal basado en el tipo de procedimiento
                    rol_principal = 'Médico Tratante'
                    if tipo_box == 'CIRUGIA':
                        rol_principal = 'Cirujano Principal'
                    elif tipo_box == 'CONSULTA':
                        rol_principal = 'Médico Especialista'
                    
                    # Manejo seguro de horarios
                    hora_inicio = None
                    hora_fin = None
                    try:
                        if agenda.horainicioagenda and agenda.fechaagenda:
                            hora_inicio = datetime.combine(agenda.fechaagenda, agenda.horainicioagenda)
                        if agenda.horafinagenda and agenda.fechaagenda:
                            hora_fin = datetime.combine(agenda.fechaagenda, agenda.horafinagenda)
                    except Exception as e:
                        self.stdout.write(f'⚠️ Error procesando horarios para agenda {agenda.id}: {str(e)}')
                    
                    agenda_ext.agregar_medico(
                        medico_id=agenda.idmedico.idmedico,
                        es_principal=True,
                        rol=rol_principal,
                        hora_inicio=hora_inicio,
                        hora_fin=hora_fin,
                        observaciones="Médico responsable principal del procedimiento"
                    )
                
                # MODIFICAR: Agregar médicos adicionales con 40% de probabilidad
                if random.random() < 0.4 and len(medicos) > 1:  # 40% de probabilidad para TODAS las agendas
                    # Determinar número de médicos adicionales
                    if tipo_box == 'CIRUGIA':
                        num_medicos_adicionales = random.randint(1, 3)  # Cirugías pueden tener más médicos
                    elif tipo_box == 'DIAGNOSTICO' or tipo_box == 'TERAPIA':
                        num_medicos_adicionales = random.randint(1, 2)  # Procedimientos especializados
                    else:  # CONSULTA, IMAGENOLOGIA
                        num_medicos_adicionales = random.randint(1, 2)  # Consultas y estudios
                    
                    medicos_disponibles = [m for m in medicos if not agenda.idmedico or m.idmedico != agenda.idmedico.idmedico]
                    
                    for i in range(min(num_medicos_adicionales, len(medicos_disponibles))):
                        medico_adicional = random.choice(medicos_disponibles)
                        medicos_disponibles.remove(medico_adicional)
                        
                        # Roles específicos por tipo
                        roles_disponibles = roles_medicos_especializados[1:]  # Excluir principal
                        if tipo_box == 'CIRUGIA':
                            roles_disponibles = ['Cirujano Asistente', 'Anestesista', 'Enfermero Instrumentista', 'Residente']
                        elif tipo_box == 'CONSULTA':
                            roles_disponibles = ['Residente', 'Interno', 'Médico de Apoyo', 'Especialista Consultor']
                        elif tipo_box == 'DIAGNOSTICO':
                            roles_disponibles = ['Especialista Consultor', 'Residente', 'Médico de Apoyo']
                        elif tipo_box == 'IMAGENOLOGIA':
                            roles_disponibles = ['Radiólogo', 'Técnico Especializado', 'Residente']
                        elif tipo_box == 'TERAPIA':
                            roles_disponibles = ['Especialista en Terapia', 'Enfermero Especializado', 'Residente']
                        
                        # Calcular horarios para médicos adicionales
                        hora_inicio_adicional = None
                        hora_fin_adicional = None
                        if agenda.horainicioagenda and agenda.horafinagenda:
                            base_inicio = datetime.combine(agenda.fechaagenda, agenda.horainicioagenda)
                            base_fin = datetime.combine(agenda.fechaagenda, agenda.horafinagenda)
                            
                            # Algunos médicos llegan antes, otros durante el procedimiento
                            if random.random() < 0.3:  # 30% llega antes
                                hora_inicio_adicional = base_inicio - timedelta(minutes=random.randint(15, 60))
                                hora_fin_adicional = base_fin
                            else:  # Llega durante o justo a tiempo
                                hora_inicio_adicional = base_inicio + timedelta(minutes=random.randint(0, 30))
                                hora_fin_adicional = base_fin - timedelta(minutes=random.randint(0, 30))
                        
                        observaciones_especificas = [
                            "Médico de apoyo especializado",
                            "Supervisión de procedimiento",
                            "Entrenamiento y seguimiento",
                            "Consulta especializada requerida",
                            "Apoyo en técnica específica",
                            "Supervisión de residentes",
                            "Colaboración interdisciplinaria",
                            "Segunda opinión médica"
                        ]
                        
                        agenda_ext.agregar_medico(
                            medico_id=medico_adicional.idmedico,
                            es_principal=False,
                            rol=random.choice(roles_disponibles),
                            hora_inicio=hora_inicio_adicional,
                            hora_fin=hora_fin_adicional,
                            observaciones=random.choice(observaciones_especificas)
                        )
                
                # Equipamiento requerido específico por tipo
                if tipo_box in equipamiento_por_tipo:
                    num_equipos = random.randint(2, min(6, len(equipamiento_por_tipo[tipo_box])))
                    agenda_ext.equipamiento_requerido = random.sample(
                        equipamiento_por_tipo[tipo_box], 
                        num_equipos
                    )
                
                # Preparación especial más específica
                preparaciones_especiales = {
                    'CIRUGIA': [
                        "Ayuno de 8 horas previo",
                        "Preparación intestinal completa",
                        "Suspensión de anticoagulantes",
                        "Profilaxis antibiótica pre-quirúrgica",
                        "Marcaje de sitio quirúrgico"
                    ],
                    'DIAGNOSTICO': [
                        "Ayuno de 4 horas",
                        "Suspensión de medicamentos específicos",
                        "Preparación intestinal parcial",
                        "Sedación consciente programada"
                    ],
                    'IMAGENOLOGIA': [
                        "Contraste oral programado",
                        "Ayuno para contraste endovenoso",
                        "Retirar objetos metálicos",
                        "Verificar alergias a contraste"
                    ],
                    'TERAPIA': [
                        "Acceso vascular confirmado",
                        "Laboratorios pre-tratamiento",
                        "Medicación pre-terapia",
                        "Monitoreo especializado"
                    ]
                }
                
                if random.random() < 0.6:  # 60% tiene preparación especial
                    agenda_ext.preparacion_especial = random.choice(
                        preparaciones_especiales.get(tipo_box, ["Preparación estándar"])
                    )
                
                # Notas adicionales más detalladas
                notas_base = f"Procedimiento: {agenda_ext.tipo_procedimiento}. "
                
                notas_adicionales = {
                    'CIRUGIA': [
                        "Consentimiento informado firmado. Riesgo quirúrgico evaluado.",
                        "Interconsulta anestésica completada. Paciente estable.",
                        "Estudios pre-operatorios completos y vigentes.",
                        "Reserva de sangre confirmada. Familiares notificados."
                    ],
                    'CONSULTA': [
                        "Historia clínica completa disponible.",
                        "Estudios complementarios solicitados.",
                        "Seguimiento de tratamiento previo.",
                        "Evaluación para nuevo tratamiento."
                    ],
                    'DIAGNOSTICO': [
                        "Indicación médica clara y específica.",
                        "Consentimiento para procedimiento firmado.",
                        "Alergias verificadas y documentadas.",
                        "Preparación del paciente confirmada."
                    ]
                }
                
                agenda_ext.notas_adicionales = notas_base + random.choice(
                    notas_adicionales.get(tipo_box, ["Procedimiento estándar programado."])
                )
                
                # Registrar cambio inicial con más detalle
                agenda_ext.registrar_cambio(
                    usuario='sistema_poblado',
                    accion='creacion_automatica',
                    detalle=f'Agenda extendida generada para {tipo_box}: {agenda_ext.tipo_procedimiento}'
                )
                
                # Intentar guardar la agenda extendida
                try:
                    agenda_ext.save()
                    agendas_creadas += 1
                    
                    # Mostrar progreso cada 5000 agendas creadas
                    if agendas_creadas % 5000 == 0:
                        porcentaje = (agendas_procesadas / todas_agendas.count()) * 100
                        self.stdout.write(f'✅ {agendas_creadas} agendas extendidas creadas ({porcentaje:.1f}% completado)')
                
                except Exception as e:
                    self.stdout.write(f'❌ Error guardando agenda extendida {agenda.id}: {str(e)}')
                    continue
                
                # Mostrar progreso cada 10000 agendas procesadas
                if agendas_procesadas % 10000 == 0:
                    porcentaje_completado = (agendas_procesadas / todas_agendas.count()) * 100
                    tiempo_estimado = "Calculando..." if agendas_procesadas < 1000 else f"~{int((todas_agendas.count() - agendas_procesadas) / 1000)} min restantes"
                    self.stdout.write(f'📊 Procesadas {agendas_procesadas}/{todas_agendas.count()} ({porcentaje_completado:.1f}%) - Creadas: {agendas_creadas} - {tiempo_estimado}')
            
            self.stdout.write(
                self.style.SUCCESS(f'✅ {agendas_creadas} agendas extendidas creadas de {agendas_procesadas} agendas procesadas')
            )
            self.stdout.write(f'📊 Agendas saltadas (ya existían): {agendas_saltadas_existentes}')
            self.stdout.write(f'📊 Total de agendas en el sistema: {todas_agendas.count()}')
            self.stdout.write(f'📊 Porcentaje de cobertura: {((agendas_creadas + agendas_saltadas_existentes) / todas_agendas.count()) * 100:.1f}%')
            
            # Estadísticas de médicos múltiples
            agendas_con_multiples_medicos = 0
            total_medicos_adicionales = 0
            for agenda_ext in AgendaExtendida.objects.all():
                if len(agenda_ext.medicos) > 1:
                    agendas_con_multiples_medicos += 1
                    total_medicos_adicionales += len(agenda_ext.medicos) - 1
            
            if agendas_creadas > 0:
                porcentaje_multiples = (agendas_con_multiples_medicos / (agendas_creadas + agendas_saltadas_existentes)) * 100
                self.stdout.write(f'📊 Agendas con múltiples médicos: {agendas_con_multiples_medicos} ({porcentaje_multiples:.1f}%)')
                self.stdout.write(f'📊 Total de médicos adicionales agregados: {total_medicos_adicionales}')
            
            tipos_generados = {}
            for agenda_ext in AgendaExtendida.objects.all():
                tipo = agenda_ext.tipo_procedimiento
                tipos_generados[tipo] = tipos_generados.get(tipo, 0) + 1
            
            self.stdout.write('📊 Tipos de procedimientos generados:')
            for tipo, cantidad in sorted(tipos_generados.items(), key=lambda x: x[1], reverse=True)[:5]:
                self.stdout.write(f'   • {tipo}: {cantidad}')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error generando agendas extendidas: {str(e)}')
            )
            logger.error(f'Error en generar_agendas_extendidas: {str(e)}', exc_info=True)
    
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
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error generando alertas: {str(e)}')
            )

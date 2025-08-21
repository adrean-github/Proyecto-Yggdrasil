"""
Script para poblar la base de datos MongoDB con datos de prueba
Ejecutar desde el directorio del proyecto Django con: python manage.py shell < poblador_mongo.py
"""

import os
import sys
import django
from datetime import datetime, timedelta, time
import random

# Configurar Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'yggdrasil_backend.settings')
django.setup()

# Importar modelos después de configurar Django
from yggdrasilApp.models import Agendabox, Box, Medico
from yggdrasilApp.mongo_models import (
    AgendaExtended, BoxInventory, BoxAnalytics, AuditLog,
    MedicoParticipante, EquipoUtilizado, MetricasConsulta, MetricasUso
)
from yggdrasilApp.services.agenda_service import AgendaService
from yggdrasilApp.services.box_service import BoxService
from yggdrasilApp.services.audit_service import AuditService

def limpiar_mongodb():
    """Limpia todos los documentos de MongoDB para empezar fresh"""
    print("🧹 Limpiando base de datos MongoDB...")
    
    AgendaExtended.drop_collection()
    BoxInventory.drop_collection()
    BoxAnalytics.drop_collection()
    AuditLog.drop_collection()
    
    print("✅ Base de datos MongoDB limpia")

def crear_inventarios_boxes():
    """Crea inventarios de prueba para los boxes existentes"""
    print("📦 Creando inventarios para boxes...")
    
    # Obtener boxes desde SQL
    boxes = Box.objects.all()[:5]  # Primeros 5 boxes
    
    # Equipos de ejemplo por tipo de box
    equipos_ejemplos = {
        'general': [
            {'nombre': 'Monitor de Signos Vitales', 'tipo': 'monitoreo', 'cantidad': 1, 'codigo': 'MSV-001'},
            {'nombre': 'Tensiómetro Digital', 'tipo': 'medicion', 'cantidad': 2, 'codigo': 'TD-002'},
            {'nombre': 'Oxímetro de Pulso', 'tipo': 'medicion', 'cantidad': 3, 'codigo': 'OP-003'},
            {'nombre': 'Termómetro Infrarrojo', 'tipo': 'medicion', 'cantidad': 1, 'codigo': 'TI-004'},
        ],
        'urgencia': [
            {'nombre': 'Desfibrilador', 'tipo': 'emergencia', 'cantidad': 1, 'codigo': 'DEF-001'},
            {'nombre': 'Monitor Cardíaco', 'tipo': 'monitoreo', 'cantidad': 1, 'codigo': 'MC-001'},
            {'nombre': 'Respirador Artificial', 'tipo': 'soporte_vital', 'cantidad': 1, 'codigo': 'RA-001'},
            {'nombre': 'Carro de Paro', 'tipo': 'emergencia', 'cantidad': 1, 'codigo': 'CP-001'},
            {'nombre': 'Monitor Multiparamétrico', 'tipo': 'monitoreo', 'cantidad': 1, 'codigo': 'MM-001'},
        ],
        'cirugia': [
            {'nombre': 'Mesa Quirúrgica', 'tipo': 'mobiliario', 'cantidad': 1, 'codigo': 'MQ-001'},
            {'nombre': 'Lámpara Cialítica', 'tipo': 'iluminacion', 'cantidad': 2, 'codigo': 'LC-001'},
            {'nombre': 'Electrobisturí', 'tipo': 'quirurgico', 'cantidad': 1, 'codigo': 'EB-001'},
            {'nombre': 'Aspirador Quirúrgico', 'tipo': 'quirurgico', 'cantidad': 1, 'codigo': 'AQ-001'},
            {'nombre': 'Monitor de Anestesia', 'tipo': 'anestesia', 'cantidad': 1, 'codigo': 'MA-001'},
        ]
    }
    
    inventarios_creados = 0
    
    for box in boxes:
        # Determinar tipo de equipos según el nombre del box
        tipo_equipos = 'general'
        if 'urgencia' in box.nombre.lower() or 'emergencia' in box.nombre.lower():
            tipo_equipos = 'urgencia'
        elif 'cirugia' in box.nombre.lower() or 'quirofano' in box.nombre.lower():
            tipo_equipos = 'cirugia'
        
        equipos_box = equipos_ejemplos[tipo_equipos].copy()
        
        # Agregar algunos equipos generales siempre
        equipos_box.extend([
            {'nombre': 'Computadora', 'tipo': 'informatica', 'cantidad': 1, 'codigo': f'PC-{box.id:03d}'},
            {'nombre': 'Impresora', 'tipo': 'informatica', 'cantidad': 1, 'codigo': f'IMP-{box.id:03d}'},
        ])
        
        # Agregar variabilidad en el estado y uso
        for equipo in equipos_box:
            equipo['estado'] = random.choice(['disponible', 'en_uso', 'mantenimiento_requerido'])
            equipo['tiempo_uso_total'] = random.randint(0, 5000)  # minutos
            equipo['usos_registrados'] = random.randint(0, 100)
            equipo['ultimo_mantenimiento'] = datetime.utcnow() - timedelta(days=random.randint(1, 90))
            equipo['requiere_calibracion'] = random.choice([True, False])
            equipo['observaciones'] = f"Equipo en {tipo_equipos}, último uso registrado"
        
        try:
            inventario_id = BoxService.crear_inventario_box(box.id, equipos_box)
            inventarios_creados += 1
            print(f"  ✅ Inventario creado para {box.nombre} ({len(equipos_box)} equipos)")
            
            # Registrar en auditoría
            AuditService.registrar_cambio_inventario(
                usuario_id=1,  # Usuario admin
                box_id=box.id,
                accion="inventario_inicial_creado",
                datos_cambio={'total_equipos': len(equipos_box), 'tipo': tipo_equipos}
            )
            
        except Exception as e:
            print(f"  ❌ Error creando inventario para {box.nombre}: {str(e)}")
    
    print(f"📦 {inventarios_creados} inventarios creados")

def crear_agendas_extendidas():
    """Crea agendas extendidas con múltiples médicos"""
    print("👥 Creando agendas extendidas...")
    
    # Obtener datos base
    agendas = Agendabox.objects.all()[:10]  # Primeras 10 agendas
    medicos = list(Medico.objects.all())
    
    agendas_extendidas = 0
    tipos_consulta = ['general', 'especializada', 'cirugia_menor', 'cirugia_mayor', 'urgencia', 'teleconsulta']
    
    for agenda in agendas:
        # 40% de probabilidad de crear extensión
        if random.random() < 0.4:
            continue
            
        # Seleccionar médicos adicionales (0-2)
        medicos_adicionales = []
        num_adicionales = random.randint(0, 2)
        
        if num_adicionales > 0:
            medicos_disponibles = [m for m in medicos if m.id != agenda.medico_id]
            medicos_seleccionados = random.sample(medicos_disponibles, min(num_adicionales, len(medicos_disponibles)))
            
            for medico_adicional in medicos_seleccionados:
                medicos_adicionales.append({
                    'medico_id': medico_adicional.id,
                    'rol': random.choice(['colaborador', 'observador', 'especialista', 'residente']),
                    'porcentaje': random.randint(10, 50)
                })
        
        # Datos de la agenda extendida
        data_agenda = {
            'medico_principal_id': agenda.medico_id,
            'box_id': agenda.box_id,
            'fecha': agenda.fecha,
            'hora_inicio': agenda.hora_inicio,
            'hora_fin': agenda.hora_fin,
            'tipo_consulta': random.choice(tipos_consulta),
            'duracion_estimada': random.randint(15, 120),
            'medicos_adicionales': medicos_adicionales,
            'equipos_necesarios': random.sample([
                'monitor_cardiaco', 'oximetro', 'tensiometro', 'electrobisturi', 
                'desfibrilador', 'respirador', 'ecografo'
            ], random.randint(1, 3)),
            'preparacion_especial': {
                'ayuno_requerido': random.choice([True, False]),
                'medicacion_previa': random.choice(['ninguna', 'analgesia', 'antibiotico']),
                'consentimiento_informado': random.choice([True, False])
            },
            'notas_internas': f"Consulta {random.choice(['rutinaria', 'compleja', 'seguimiento'])}",
            'permite_teleconsulta': random.choice([True, False])
        }
        
        try:
            resultado = AgendaService.crear_agenda_extendida(data_agenda)
            agendas_extendidas += 1
            
            # Simular métricas si la agenda ya fue completada
            if agenda.estado == 'completada':
                metricas = {
                    'duracion_real': random.randint(data_agenda['duracion_estimada'] - 10, 
                                                  data_agenda['duracion_estimada'] + 30),
                    'satisfaccion': random.randint(7, 10),
                    'complicaciones': random.choice([None, 'leves', 'moderadas'])
                }
                AgendaService.actualizar_metricas_consulta(agenda.id, metricas)
            
            print(f"  ✅ Agenda extendida: {agenda.medico.nombres} - {len(medicos_adicionales)} médicos adicionales")
            
        except Exception as e:
            print(f"  ❌ Error creando agenda extendida: {str(e)}")
    
    print(f"👥 {agendas_extendidas} agendas extendidas creadas")

def generar_analytics_boxes():
    """Genera analíticas para los boxes con inventario"""
    print("📊 Generando analíticas de boxes...")
    
    # Obtener boxes con inventario
    inventarios = BoxInventory.objects.all()
    analytics_generadas = 0
    
    fecha_fin = datetime.utcnow()
    fecha_inicio = fecha_fin - timedelta(days=30)
    
    for inventario in inventarios:
        try:
            analytics_id = BoxService.generar_analytics_box(
                inventario.box_sql_id, 
                fecha_inicio, 
                fecha_fin
            )
            analytics_generadas += 1
            print(f"  ✅ Analíticas generadas para Box ID {inventario.box_sql_id}")
            
        except Exception as e:
            print(f"  ❌ Error generando analíticas para Box {inventario.box_sql_id}: {str(e)}")
    
    print(f"📊 {analytics_generadas} analíticas generadas")

def simular_actividad_sistema():
    """Simula actividad del sistema para generar logs de auditoría"""
    print("🔄 Simulando actividad del sistema...")
    
    eventos_simulados = 0
    
    # Eventos de login/logout
    for _ in range(20):
        AuditService.registrar_acceso_usuario(
            usuario_id=random.randint(1, 5),
            accion=random.choice(['login', 'logout']),
            recurso=random.choice(['dashboard', 'agendas', 'inventarios', None]),
            ip_address=f"192.168.1.{random.randint(1, 100)}",
            exitoso=random.choice([True, True, True, False])  # 75% exitoso
        )
        eventos_simulados += 1
    
    # Eventos de cambios en inventarios
    inventarios = BoxInventory.objects.all()
    for inventario in inventarios[:3]:
        for _ in range(random.randint(2, 5)):
            BoxService.actualizar_uso_equipo(
                box_id=inventario.box_sql_id,
                equipo_nombre=random.choice([eq.nombre for eq in inventario.equipos_disponibles]),
                tiempo_uso=random.randint(15, 120),
                observaciones=f"Uso simulado - {datetime.now().strftime('%H:%M')}"
            )
            eventos_simulados += 1
    
    # Eventos críticos ocasionales
    for _ in range(3):
        AuditService.registrar_evento(
            usuario_id=random.randint(1, 3),
            tipo_evento='error_sistema',
            entidad_tipo=random.choice(['box', 'agenda', 'inventario']),
            entidad_id=str(random.randint(1, 10)),
            descripcion=f"Error simulado en {random.choice(['conexión BD', 'validación', 'procesamiento'])}",
            nivel=AuditService.NIVEL_ERROR
        )
        eventos_simulados += 1
    
    print(f"🔄 {eventos_simulados} eventos de actividad simulados")

def mostrar_estadisticas():
    """Muestra estadísticas de los datos creados"""
    print("\n📈 ESTADÍSTICAS DE DATOS CREADOS:")
    print("=" * 50)
    
    # Contadores MongoDB
    total_agendas_ext = AgendaExtended.objects.count()
    total_inventarios = BoxInventory.objects.count()
    total_analytics = BoxAnalytics.objects.count()
    total_logs = AuditLog.objects.count()
    
    print(f"🏥 Agendas Extendidas: {total_agendas_ext}")
    print(f"📦 Inventarios de Boxes: {total_inventarios}")
    print(f"📊 Analíticas Generadas: {total_analytics}")
    print(f"📝 Logs de Auditoría: {total_logs}")
    
    # Estadísticas por tipo
    if total_agendas_ext > 0:
        tipos_consulta = {}
        for agenda in AgendaExtended.objects.all():
            tipos_consulta[agenda.tipo_consulta] = tipos_consulta.get(agenda.tipo_consulta, 0) + 1
        
        print(f"\n📋 Tipos de Consulta:")
        for tipo, cantidad in tipos_consulta.items():
            print(f"   • {tipo}: {cantidad}")
    
    if total_inventarios > 0:
        total_equipos = sum(len(inv.equipos_disponibles) for inv in BoxInventory.objects.all())
        print(f"\n🔧 Total de Equipos Registrados: {total_equipos}")
    
    print("\n✅ ¡Base de datos poblada exitosamente!")
    print("\nPuedes probar las APIs híbridas ahora:")
    print("• GET /api/boxes/{id}/dashboard/ - Dashboard completo del box")
    print("• GET /api/agendas/busqueda-avanzada/ - Búsqueda con filtros híbridos")
    print("• GET /api/sistema/estadisticas/ - Estadísticas generales")

def main():
    """Función principal del poblador"""
    print("🚀 POBLADOR DE BASE DE DATOS MONGODB - YGGDRASIL")
    print("=" * 55)
    
    try:
        # Limpiar y poblar
        limpiar_mongodb()
        crear_inventarios_boxes()
        crear_agendas_extendidas()
        generar_analytics_boxes()
        simular_actividad_sistema()
        mostrar_estadisticas()
        
    except Exception as e:
        print(f"\n❌ ERROR GENERAL: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

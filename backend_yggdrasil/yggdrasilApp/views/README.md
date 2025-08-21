# Organización de Views por Módulos

Este directorio contiene la refactorización de las views organizadas por funcionalidad para mejorar la mantenibilidad y estructura del código.

## Estructura de Módulos

### 📦 `box_views.py`
**Funcionalidad**: Gestión de boxes (consultorios)
- `BoxListView` - Listar y consultar información de boxes
- `EstadoBoxView` - Verificar estado de ocupación de un box
- `BoxesInhabilitadosView` - Listar boxes inhabilitados
- `InfoBoxView` - Información específica de un box
- `BoxesRecomendadosView` - Sugerir boxes disponibles
- `ToggleEstadoBoxView` - Habilitar/inhabilitar boxes
- `registrar_cambio_box` - Función helper para auditoría

### 📅 `agenda_views.py`
**Funcionalidad**: Gestión de agendas y horarios
- `AgendasConTopeView` - Detectar conflictos de horarios
- `TodasAgendasView` - Listar todas las agendas con exportación CSV
- `CheckDisponibilidadView` - Verificar disponibilidad de horarios
- `AgendaBox` - Calendario de agendas por box
- `AgendasPorPasilloView` - Agendas filtradas por pasillo
- `AgendasPorMedicoView` - Agendas filtradas por médico
- `DatosModificadosAPIView` - Cambios desde una fecha específica
- `VistaActualizableDispView` - Manejo de flags de actualización

### 👨‍⚕️ `medico_views.py`
**Funcionalidad**: Gestión de médicos
- `SugerenciasMedicoView` - Autocompletado de médicos
- `MedicosDisponiblesView` - Médicos disponibles en un horario

### 📋 `reserva_views.py`
**Funcionalidad**: Gestión de reservas médicas y no médicas
- `AgendasNoMedicasView` - Visualizar reservas no médicas
- `BloquesNoMedicosDisponiblesView` - Bloques disponibles para reservas
- `CrearReservaNoMedicaView` - Crear reservas no médicas
- `CrearReservaMedicaView` - Crear reservas médicas
- `MisReservasMedicasView` - Reservas médicas del usuario
- `MisReservasNoMedicasView` - Reservas no médicas del usuario
- `LiberarReservaView` - Eliminar/liberar reservas
- `UpdateReservaView` - Modificar reservas existentes
- `BloquesLibresView` - Consultar bloques de tiempo libres

### 📊 `dashboard_views.py`
**Funcionalidad**: Estadísticas y métricas
- `DashboardStatsView` - Estadísticas generales del sistema

### 🔐 `auth_views.py`
**Funcionalidad**: Autenticación y autorización
- `login_view` - Inicio de sesión
- `logout_view` - Cierre de sesión
- `user_info` - Información del usuario autenticado

### 📜 `historial_views.py`
**Funcionalidad**: Auditoría y historial de cambios
- `HistorialModificacionesBoxView` - Consultar historial de modificaciones
- `RegistrarModificacionBoxView` - Registrar nuevas modificaciones

### 🧠 `mimir_views.py`
**Funcionalidad**: Resolución inteligente de conflictos (Sistema Mimir)
- `ResolverTopeView` - Analizar y sugerir soluciones para conflictos
- `AplicarSolucionView` - Aplicar soluciones propuestas

### 📁 `simulador_views.py`
**Funcionalidad**: Carga masiva y simulación de agendas
- `upload_file` - Cargar archivos CSV/Excel de agendas
- `confirmar_guardado_agendas` - Confirmar guardado masivo

### 🛠️ `utils.py`
**Funcionalidad**: Utilidades compartidas
- `parse_date_param` - Parsear fechas desde parámetros
- `get_client_ip` - Obtener IP del cliente

## Ventajas de esta Organización

### ✅ **Mantenibilidad**
- Código más fácil de navegar y mantener
- Responsabilidades claras por módulo
- Reducción de conflictos en control de versiones

### ✅ **Escalabilidad**
- Fácil agregar nuevas funcionalidades por módulo
- Estructura preparada para crecimiento del sistema

### ✅ **Legibilidad**
- Importaciones más organizadas
- Código agrupado por funcionalidad lógica

### ✅ **Testabilidad**
- Módulos independientes facilitan testing unitario
- Menor acoplamiento entre componentes

## Migración y Compatibilidad

- ✅ **Compatibilidad total**: Todas las importaciones funcionan igual que antes
- ✅ **URLs inalteradas**: No se requieren cambios en frontend
- ✅ **Backup disponible**: `views_backup.py` contiene el archivo original
- ✅ **Importación automática**: `__init__.py` mantiene todas las importaciones

## Uso

Las views se pueden importar de la misma manera que antes:

```python
from yggdrasilApp.views import BoxListView, AgendaBox
```

O importar módulos específicos:

```python
from yggdrasilApp.views.box_views import BoxListView
from yggdrasilApp.views.agenda_views import AgendaBox
```

## Estructura de Archivos

```
views/
├── __init__.py                 # Importaciones centralizadas
├── box_views.py               # 🏥 Gestión de boxes
├── agenda_views.py            # 📅 Gestión de agendas
├── medico_views.py            # 👨‍⚕️ Gestión de médicos
├── reserva_views.py           # 📋 Gestión de reservas
├── dashboard_views.py         # 📊 Estadísticas
├── auth_views.py              # 🔐 Autenticación
├── historial_views.py         # 📜 Auditoría
├── mimir_views.py             # 🧠 Resolución de conflictos
├── simulador_views.py         # 📁 Carga masiva
├── utils.py                   # 🛠️ Utilidades
└── README.md                  # 📖 Esta documentación
```

---
**Fecha de refactorización**: Agosto 2025  
**Autor**: Sistema de refactorización automatizada

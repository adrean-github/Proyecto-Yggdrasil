# Importación centralizada de todas las views

# Box views
from .box_views import (
    BoxListView,
    EstadoBoxView,
    BoxesInhabilitadosView,
    InfoBoxView,
    BoxesRecomendadosView,
    ToggleEstadoBoxView,
    registrar_cambio_box
)

# Agenda views
from .agenda_views import (
    AgendasConTopeView,
    TodasAgendasView,
    CheckDisponibilidadView,
    AgendaBox,
    AgendasPorPasilloView,
    AgendasPorMedicoView,
    DatosModificadosAPIView,
    VistaActualizableDispSerializer,
    VistaActualizableDispView,
    AgendaDetalleExtendidoView
)

# Médico views
from .medico_views import (
    SugerenciasMedicoView,
    MedicosDisponiblesView,
    MedicoDisponibilidadView
)

# Reserva views
from .reserva_views import (
    AgendasNoMedicasView,
    BloquesNoMedicosDisponiblesView,
    CrearReservaNoMedicaView,
    CrearReservaMedicaView,
    MisReservasMedicasView,
    MisReservasNoMedicasView,
    LiberarReservaView,
    UpdateReservaView,
    BloquesLibresView
)

# Dashboard views
from .dashboard_views import (
    DashboardStatsView
)

# Auth views
from .auth_views import (
    login_view,
    logout_view,
    user_info
)

# Historial views
from .historial_views import (
    HistorialModificacionesBoxView,
    RegistrarModificacionBoxView
)

# Mimir views (resolución de topes)
from .mimir_views import (
    ResolverTopeView,
    AplicarSolucionView
)

# Simulador views
from .simulador_views import (
    upload_file,
    confirmar_guardado_agendas
)

# Utilidades
from .utils import (
    parse_date_param,
    get_client_ip
)

# Exportar todas las views para mantener compatibilidad
__all__ = [
    # Box views
    'BoxListView',
    'EstadoBoxView', 
    'BoxesInhabilitadosView',
    'InfoBoxView',
    'BoxesRecomendadosView',
    'ToggleEstadoBoxView',
    'registrar_cambio_box',
    
    # Agenda views
    'AgendasConTopeView',
    'TodasAgendasView',
    'CheckDisponibilidadView',
    'AgendaBox',
    'AgendasPorPasilloView',
    'AgendasPorMedicoView',
    'DatosModificadosAPIView',
    'VistaActualizableDispSerializer',
    'VistaActualizableDispView',
    'AgendaDetalleExtendidoView',
    
    # Médico views
    'SugerenciasMedicoView',
    'MedicosDisponiblesView',
    
    # Reserva views
    'AgendasNoMedicasView',
    'BloquesNoMedicosDisponiblesView',
    'CrearReservaNoMedicaView',
    'CrearReservaMedicaView',
    'MisReservasMedicasView',
    'MisReservasNoMedicasView',
    'LiberarReservaView',
    'UpdateReservaView',
    'BloquesLibresView',
    
    # Dashboard views
    'DashboardStatsView',
    
    # Auth views
    'login_view',
    'logout_view',
    'user_info',
    
    # Historial views
    'HistorialModificacionesBoxView',
    'RegistrarModificacionBoxView',
    
    # Mimir views
    'ResolverTopeView',
    'AplicarSolucionView',
    
    # Simulador views
    'upload_file',
    'confirmar_guardado_agendas',
    
    # Utilidades
    'parse_date_param',
    'get_client_ip'
]

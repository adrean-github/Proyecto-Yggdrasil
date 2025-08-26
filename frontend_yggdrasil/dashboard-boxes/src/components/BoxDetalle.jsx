import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Building, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Star,
  Settings,
  History,
  UserCheck,
  CalendarDays,
  X,
  ExternalLink,
  Package,
  Activity,
  ClipboardList,
  Info,
  FileText,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { buildApiUrl } from "../config/api";
import { useBoxesWebSocket } from "../hooks/useBoxesWebSocket";
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import InventarioModal from './InventarioModal';
import { useLocation } from 'react-router-dom';

export default function BoxDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [boxData, setBoxData] = useState(null);
  const [agendaboxData, setAgendaBoxData] = useState([]);
  const [historialModificaciones, setHistorialModificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('basico'); // 'basico' o 'extendido'
  const [razonInhabilitacion, setRazonInhabilitacion] = useState("");
  const [showInventarioModal, setShowInventarioModal] = useState(false);
  const location = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]); 

  
  // Función auxiliar para verificar si existen datos extendidos válidos
  const tieneDatosExtendidos = (datosExtendidos) => {
    if (!datosExtendidos || !datosExtendidos.datos_mongo) return false;
    
    const datosMongo = datosExtendidos.datos_mongo;
    
    // Verificar campos de texto
    const camposTexto = [
      'tipo_procedimiento',
      'preparacion_especial',
      'notas_adicionales'
    ];
    
    const tieneTexto = camposTexto.some(campo => {
      const valor = datosMongo[campo];
      return valor && typeof valor === 'string' && valor.trim() !== '';
    });
    
    // Verificar equipamiento (array)
    const tieneEquipamiento = datosMongo.equipamiento_requerido && 
                             Array.isArray(datosMongo.equipamiento_requerido) && 
                             datosMongo.equipamiento_requerido.length > 0;
    
    // Verificar médicos (array de objetos)
    const tieneMedicos = datosMongo.medicos && 
                        Array.isArray(datosMongo.medicos) && 
                        datosMongo.medicos.length > 0;
    
    return tieneTexto || tieneEquipamiento || tieneMedicos;
  };

  // Función para cambiar al tab de detalles completos
  const verDetallesCompletos = () => {
    console.log('[DEBUG] Cambiando a tab extendido');
    console.log('[DEBUG] Datos extendidos:', selectedEvent?.datosExtendidos);
    console.log('[DEBUG] Datos mongo:', selectedEvent?.datosExtendidos?.datos_mongo);
    console.log('[DEBUG] Médicos:', selectedEvent?.datosExtendidos?.datos_mongo?.medicos);
    
    // Debug más específico para médicos
    if (selectedEvent?.datosExtendidos?.datos_mongo?.medicos) {
      selectedEvent.datosExtendidos.datos_mongo.medicos.forEach((medico, index) => {
        console.log(`[DEBUG] Médico ${index}:`, medico, typeof medico);
      });
    }
    
    setActiveTab('extendido');
  };

  // Función para manejar el cierre del modal
  const cerrarModal = () => {
    setShowEventDetails(false);
    setActiveTab('basico');
  };

  // Función para manejar cambios de estado de box desde WebSocket
  const handleBoxStateChange = ({ boxId, nuevoEstado, evento, tipo }) => {
    console.log(`[DEBUG BoxDetalle] Box ${boxId} cambió:`, { nuevoEstado, evento, tipo });
    // Si el box que cambió es el que estamos viendo, actualizar los datos
    if (parseInt(boxId) === parseInt(id)) {
      if (tipo === 'agenda_cambio') {
        // Cambio en agenda - refrescar todos los datos del box
        console.log(`[DEBUG BoxDetalle] Refrescando datos por cambio de agenda: ${evento}`);
        fetchBoxData();
      } else {
        // Cambio directo de estado - actualizar solo si realmente es diferente
        setBoxData(prevData => {
          if (prevData && prevData.estadobox !== nuevoEstado) {
            console.log(`[DEBUG BoxDetalle] WebSocket: actualizando de ${prevData.estadobox} a ${nuevoEstado}`);
            return { ...prevData, estadobox: nuevoEstado };
          }
          return prevData;
        });
      }
    }
  };

  // WebSocket para cambios de estado de boxes
  useBoxesWebSocket(handleBoxStateChange);

  useEffect(() => {
    setLastUpdated(new Date().toLocaleString());
    fetchBoxData();
  }, [id]);

  const fetchBoxData = async () => {
    try {
      const [boxResponse, agendaResponse, historialResponse] = await Promise.all([
        fetch(buildApiUrl(`/api/boxes/${id}/`), {
          credentials: 'include'
        }),
        fetch(buildApiUrl(`/api/box/${id}/`), {
          credentials: 'include'
        }),
        fetch(buildApiUrl(`/api/boxes/${id}/historial-modificaciones/`), {
          credentials: 'include'
        })
      ]);

      if (!boxResponse.ok) throw new Error("Error al obtener los datos del box");
      if (!agendaResponse.ok) throw new Error("Error al obtener las agendas");

      const boxData = await boxResponse.json();
      const agendaData = await agendaResponse.json();
      
      let historialData = [];
      if (historialResponse.ok) {
        historialData = await historialResponse.json();
        historialData = Array.isArray(historialData) ? historialData : [];
      }

      setBoxData(boxData);
      setAgendaBoxData(Array.isArray(agendaData) ? agendaData : []);
      setHistorialModificaciones(historialData);
    } catch (error) {
      console.error("Error al cargar datos del box:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCsrfToken = () => {
    const name = 'csrftoken';
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${name}=`))
      ?.split('=')[1];
    return cookieValue || '';
  };

  const toggleEstado = async () => {
    setCambiandoEstado(true);
    try {
      const csrfToken = getCsrfToken();
  
      // Usar el estado actual del boxData, no calcular antes
      const estadoActual = boxData.estadobox;
      const nuevoEstado = estadoActual === "Habilitado" ? "Inhabilitado" : "Habilitado";
      
      console.log(`[DEBUG toggleEstado] Cambiando de ${estadoActual} a ${nuevoEstado}`);
  
      const response = await fetch(buildApiUrl(`/api/boxes/${id}/toggle-estado/`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          razon: razonInhabilitacion, // Razón de inhabilitación
          estadobox: nuevoEstado, // Campo requerido por el backend
        }),
      });
  
      if (response.ok) {
        const data = await response.json();
  
        // Actualización optimista más robusta
        setBoxData((prev) => {
          const nuevoEstado = data.estadobox;
          console.log(`[DEBUG toggleEstado] Actualizando estado de ${prev?.estadobox} a ${nuevoEstado}`);
          return {
            ...prev,
            estadobox: nuevoEstado,
            comentario: data.comentario || razonInhabilitacion,
          };
        });
  
        setShowConfirmDialog(false);
        setRazonInhabilitacion("");
  
        // Refrescar historial
        const historialResponse = await fetch(
          buildApiUrl(`/api/boxes/${id}/historial-modificaciones/`),
          {
            credentials: "include",
          }
        );
  
        if (historialResponse.ok) {
          const historialData = await historialResponse.json();
          setHistorialModificaciones(Array.isArray(historialData) ? historialData : []);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Error al cambiar el estado: ${errorData.error || response.statusText}`);
      }
    } catch (e) {
      alert("Error de red al cambiar el estado");
    } finally {
      setCambiandoEstado(false);
    }
  };
  const handleEstadoChange = () => {
    if (boxData.estadobox === "Habilitado") {
      setShowConfirmDialog(true);
    } else {
      toggleEstado();
    }
  };

  const handleEventClick = async (info) => {
    const event = info.event;
    const extendedProps = event.extendedProps || {};
    
    console.log('Evento clickeado:', event);
    console.log('¿Es tope?', extendedProps.esTope);
    
    // Cargar información extendida de MongoDB
    let datosExtendidos = null;
    try {
      const response = await fetch(buildApiUrl(`/api/agenda/${event.id}/detalle-extendido/`), {
        credentials: 'include'
      });
      if (response.ok) {
        datosExtendidos = await response.json();
        console.log('Datos extendidos de MongoDB:', datosExtendidos);
        console.log('Estructura datos_mongo:', datosExtendidos?.datos_mongo);
        console.log('Médicos:', datosExtendidos?.datos_mongo?.medicos);
      }
    } catch (error) {
      console.error('Error al cargar datos extendidos:', error);
    }
    
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      extendedProps: extendedProps,
      observaciones: extendedProps.observaciones || 'Sin observaciones',
      medico: extendedProps.medico || 'No asignado',
      esTope: extendedProps.esTope || false,
      datosExtendidos: datosExtendidos // Agregar datos de MongoDB
    });
    setShowEventDetails(true);
  };

  const getUltimoMotivo = () => {
    if (!historialModificaciones.length) {
      return boxData?.comentario || "Sin especificar";
    }
    const inhabilitaciones = historialModificaciones
      .filter(item => item.accion === 'INHABILITACION' && item.comentario)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    if (inhabilitaciones.length > 0) {
      return inhabilitaciones[0].comentario;
    }
    
    return boxData?.comentario || "Sin especificar";
  };

  const isTope = (event, allEvents = agendaboxData) => {
    if (event.tope || event.es_tope || event.title?.toLowerCase().includes('tope')) {
      return true;
    }
  
    const currentStart = new Date(event.start || `${event.fecha}T${event.hora_inicio}`);
    const currentEnd = new Date(event.end || `${event.fecha}T${event.hora_fin}`);
    
    const conflictos = allEvents.filter(otherEvent => {
      if (otherEvent.id === event.id) return false;
      
      const otherStart = new Date(otherEvent.start || `${otherEvent.fecha}T${otherEvent.hora_inicio}`);
      const otherEnd = new Date(otherEvent.end || `${otherEvent.fecha}T${otherEvent.hora_fin}`);
      
      return currentStart < otherEnd && currentEnd > otherStart;
    });
  
    return conflictos.length > 0;
  };

  const navigateToHistorialCompleto = () => {
    window.scrollTo(0, 0);
    navigate(`/boxes/${id}/historial`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 text-[#1B5D52] mx-auto mb-4" />
          <p className="text-gray-600">Cargando información del Box...</p>
        </div>
      </div>
    );
  }

  if (!boxData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 text-lg">No se pudo cargar la información del Box.</p>
          <button 
            onClick={() => navigate("/boxes")}
            className="mt-4 px-4 py-2 bg-[#1B5D52] text-white rounded-lg hover:bg-[#14463d] transition-colors"
          >
            Volver al listado de Boxes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Última actualización: {lastUpdated}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/*Panel de información del box */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-800">Detalle de Box #{id}</h1>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                boxData.estadobox === "Habilitado" 
                  ? "bg-green-100 text-green-800" 
                  : "bg-yellow-100 text-yellow-800"
              }`}>
                {boxData.estadobox}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Building className="text-gray-500" size={18} />
                <div>
                  <p className="text-sm text-gray-600">Pasillo</p>
                  <p className="font-medium">{boxData.pasillobox}</p>
                </div>
              </div>


              <div className="flex items-center gap-3">
                <Clock className="text-gray-500" size={18} />
                <div>
                  <p className="text-sm text-gray-600">Última agenda</p>
                  <p className="font-medium">{boxData.ult || "Sin registros"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="text-gray-500" size={18} />
                <div>
                  <p className="text-sm text-gray-600">Próxima agenda</p>
                  <p className="font-medium">{boxData.prox || "Sin programar"}</p>
                </div>
              </div>

              {boxData.estadobox === "Inhabilitado" && (
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <AlertCircle size={16} />
                      <span>Motivo de deshabilitación</span>
                    </div>
                    <button
                      onClick={navigateToHistorialCompleto}
                      className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 transition-colors"
                    >
                      <ExternalLink size={12} />
                      Ver historial
                    </button>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <p className="text-red-900 text-sm font-medium">
                      {getUltimoMotivo()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Botón de Inventario */}
            <button
              onClick={() => setShowInventarioModal(true)}
              className="w-full mt-4 py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200"
            >
              <Package size={16} />
              Ver Inventario
            </button>

            <button
              onClick={handleEstadoChange}
              disabled={cambiandoEstado}
              className={`w-full mt-6 py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                boxData.estadobox === "Habilitado" 
                  ? "bg-orange-200 text-orange-700 hover:bg-yellow-200" 
                  : "bg-green-100 text-green-700 hover:bg-green-200"
              }`}
            >
              {cambiandoEstado ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Procesando...
                </>
              ) : boxData.estadobox === "Habilitado" ? (
                <>
                  <XCircle size={16} />
                  Deshabilitar Box
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Habilitar Box
                </>
              )}
            </button>
          </motion.div>

          {/* Panel de especialidades */}
          <motion.div
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Star size={18} />
              Especialidades
            </h3>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Principal</p>
                <p className="font-medium bg-green-50 px-3 py-2 rounded-lg">
                  {boxData.especialidad_principal || 'No definida'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">También puede usarse para</p>
                <div className="flex flex-wrap gap-2">
                  {boxData.especialidades && boxData.especialidades.length > 0 ? (
                    boxData.especialidades.map((especialidad, index) => (
                      <span 
                        key={index}
                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                      >
                        {especialidad}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Ninguna especialidad adicional</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tarjeta de acceso rápido al historial */}
          <motion.div
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={navigateToHistorialCompleto}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="text-blue-900" size={20} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Historial Completo</h3>
                  <p className="text-sm text-gray-600">Ver todas las modificaciones del box</p>
                </div>
              </div>
              <ExternalLink className="text-gray-400" size={18} />
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-900 font-medium">Total de registros</span>
                <span className="bg-blue-100 text-blue-900 px-2 py-1 rounded-full text-xs font-semibold">
                  {historialModificaciones.length}
                </span>
              </div>
              
              {historialModificaciones.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  <p>Última modificación: {new Date(historialModificaciones[0].fecha).toLocaleDateString('es-ES')}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Calendario */}
          <motion.div
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Calendar size={30} />
              Agenda del Box
            </h3>
              
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded bg-[#d8b4fe]"></div>
                  <span>No médica</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded bg-[#cfe4ff]"></div>
                  <span>Médica</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded bg-[#ff6b6b]"></div>
                  <span>Tope</span>
                </div>
              </div>
            </div>

            {/* Texto informativo agregado */}
            <div className="mb-3 bg-green-50 border border-[#1B5D52] rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <Info size={16} className="text-[#1B5D52]" />
                <p className="text-sm text-[#1B5D52] font-medium">
                  Presione sobre cualquier agenda para ver sus detalles completos
                </p>
              </div>
            </div>

            <div className="border-t pt-3 sm:pt-4">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: "prev,next",
                  center: "title",
                  right: "timeGridWeek,dayGridMonth"
                }}
                events={agendaboxData.map(event => {
                  const esTope = isTope(event, agendaboxData);
                  
                  return {
                    id: event.id,
                    title: "", 
                    start: event.start || `${event.fecha}T${event.hora_inicio}`,
                    end: event.end || `${event.fecha}T${event.hora_fin}`,
                    color: esTope ? '#ff6b6b' : (event.esMedica === 0 ? '#d8b4fe' : '#cfe4ff'),
                    textColor: esTope ? '#ffffff' : '#000000',
                    borderColor: esTope ? '#dc2626' : 'transparent',
                    extendedProps: {
                      esMedica: event.esMedica,
                      tipo: (event.esMedica === 0 ? 'No médica' : 'Médica'),
                      observaciones: event.observaciones || 'Sin observaciones',
                      esTope: esTope,
                      medico: event.medico || 'No asignado'
                    }
                  }
                })}
                locale={esLocale}
                buttonText={{
                  week: 'Semana',
                  month: 'Mes'
                }}
                allDaySlot={false}
                slotMinTime="08:00:00"
                slotMaxTime="20:00:00" 
                editable={false}
                selectable={false}
                nowIndicator={true}
                eventClick={handleEventClick}
                slotLabelFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                }}
                eventTimeFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                }}
                height="auto"
                dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
                // Configuraciones responsivas
                views={{
                  timeGridWeek: {
                    dayHeaderFormat: { weekday: 'short', day: 'numeric' },
                    slotLabelFormat: {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    }
                  }
                }}
                // Ocultar botones en móviles
                responsiveOptions={[
                  {
                    breakpoint: 640, // breakpoint para sm
                    buttonText: {
                      week: 'Sem',
                      month: 'Mes'
                    },
                    headerToolbar: {
                      left: 'prev,next',
                      center: 'title',
                      right: ''
                    }
                  }
                ]}
              />
            </div>
          </motion.div>
      </div>

      {/* Modal de confirmación para deshabilitar */}
      <AnimatePresence>
        {showConfirmDialog && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
            onClick={() => {
              setShowConfirmDialog(false);
              setRazonInhabilitacion("");
            }}
          >
            <motion.div
              className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="text-yellow-500" size={24} />
                  <h3 className="text-lg font-semibold text-gray-800">Deshabilitar Box</h3>
                </div>
                <button 
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setRazonInhabilitacion("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <p className="text-gray-600 mb-4">
                ¿Está seguro de que desea deshabilitar este box? Por favor, indique la razón:
              </p>
              
              <textarea
                value={razonInhabilitacion}
                onChange={(e) => setRazonInhabilitacion(e.target.value)}
                placeholder="Ej: Reparación de equipos, mantenimiento preventivo, etc."
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#1B5D52] focus:border-transparent resize-none"
                rows={3}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setRazonInhabilitacion("");
                  }}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={toggleEstado}
                  disabled={!razonInhabilitacion.trim()}
                  className={`flex-1 py-2 px-4 rounded-lg text-white font-semibold transition-colors ${
                    !razonInhabilitacion.trim() 
                      ? "bg-gray-400 cursor-not-allowed" 
                      : "bg-red-700 hover:bg-red-900"
                  }`}
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de detalles del evento */}
      <AnimatePresence>
        {showEventDetails && selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <motion.div
              className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CalendarDays className="text-blue-500" size={24} />
                  <h3 className="text-lg font-semibold text-gray-800">Detalles de la agenda</h3>
                </div>
                <button 
                  onClick={cerrarModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  onClick={() => setActiveTab('basico')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'basico'
                      ? 'border-[#1B5D52] text-[#1B5D52]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Información básica
                </button>
                {selectedEvent?.datosExtendidos && tieneDatosExtendidos(selectedEvent.datosExtendidos) && (
                  <button
                    onClick={() => setActiveTab('extendido')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'extendido'
                        ? 'border-[#1B5D52] text-[#1B5D52]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Información extendida
                  </button>
                )}
              </div>

              {/* Contenido del modal con scroll */}
              <div className="overflow-y-auto max-h-[60vh]">
                {activeTab === 'basico' && (
                  <div className="space-y-4">
                    {selectedEvent.esTope && (
                      <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="text-red-800" size={20} />
                          <span className="text-red-900 font-semibold">CONFLICTO DE HORARIO</span>
                        </div>
                        <p className="text-red-800 text-sm mt-1">
                          Este evento se superpone con otra agenda en el mismo box.
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-gray-600">ID agenda</p>
                      <p className="font-medium">
                        #{selectedEvent.id.toString()}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Inicio</p>
                        <p className="font-medium">
                          {selectedEvent.start.toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600">Fin</p>
                        <p className="font-medium">
                          {selectedEvent.end ? selectedEvent.end.toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Sin definir'}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600">Tipo</p>
                      <p className="font-medium">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          selectedEvent.extendedProps.tipo === 'Médica' 
                            ? 'bg-blue-100 text-blue-800' 
                            : selectedEvent.extendedProps.tipo === 'No médica'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedEvent.extendedProps.tipo}
                        </span>
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600">Médico / Responsable</p>
                      <p className="font-medium flex items-center gap-2">
                        <UserCheck size={16} />
                        {selectedEvent.medico}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600">Observaciones</p>
                      <p className="font-medium bg-gray-50 p-3 rounded-lg">
                        {selectedEvent.observaciones}
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'extendido' && selectedEvent?.datosExtendidos?.datos_mongo && (
                  <div className="space-y-6">
                    {/* Información extendida con validaciones estrictas */}
                    {selectedEvent.datosExtendidos.datos_mongo.tipo_procedimiento && 
                     typeof selectedEvent.datosExtendidos.datos_mongo.tipo_procedimiento === 'string' && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                          <Activity size={16} />
                          Tipo de Procedimiento
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                          <p className="font-medium text-blue-800">
                            {selectedEvent.datosExtendidos.datos_mongo.tipo_procedimiento}
                          </p>
                        </div>
                      </div>
                    )}


                    {selectedEvent.datosExtendidos.datos_mongo.medicos && 
                     Array.isArray(selectedEvent.datosExtendidos.datos_mongo.medicos) && 
                     selectedEvent.datosExtendidos.datos_mongo.medicos.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                          <Users size={16} />
                          Médicos Participantes
                        </p>
                        <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded-r-lg">
                          <div className="space-y-2">
                            {selectedEvent.datosExtendidos.datos_mongo.medicos.map((medico, index) => {
                              try {
                                // Renderizar según la estructura de MedicoEnAgenda
                                const medicoId = medico.medico_id || 'ID no disponible';
                                const nombreMedico = medico.nombre_medico || `Médico ID: ${medicoId}`;
                                const rol = medico.rol || '';
                                const esPrincipal = Boolean(medico.es_principal);
                                
                                return (
                                  <div key={index} className={`p-3 rounded-lg ${esPrincipal ? 'bg-blue-100 border border-blue-300' : 'bg-blue-100'}`}>
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <UserCheck size={14} className={esPrincipal ? "text-green-600" : "text-blue-600"} />
                                          <span className={`font-medium ${esPrincipal ? 'text-green-800' : 'text-blue-800'}`}>
                                            {nombreMedico}
                                          </span>
                                          {esPrincipal && (
                                            <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full">
                                              Principal
                                            </span>
                                          )}
                                        </div>
                                        {rol && (
                                          <p className={`text-sm ml-5 ${esPrincipal ? 'text-blue-600' : 'text-blue-600'}`}>
                                            Rol: {rol}
                                          </p>
                                        )}                                        
                                      </div>
                                    </div>
                                  </div>
                                );
                              } catch (error) {
                                console.error('Error renderizando médico:', error, medico);
                                return (
                                  <div key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded">
                                    <UserCheck size={14} className="text-red-600" />
                                    <span className="font-medium text-red-600">Error cargando médico</span>
                                  </div>
                                );
                              }
                            })}
                          </div>
                        </div>
                      </div>
                    )}


                    {selectedEvent.datosExtendidos.datos_mongo.equipamiento_requerido && 
                     Array.isArray(selectedEvent.datosExtendidos.datos_mongo.equipamiento_requerido) &&
                     selectedEvent.datosExtendidos.datos_mongo.equipamiento_requerido.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                          <Package size={16} />
                          Equipamiento Requerido
                        </p>
                        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                          <div className="space-y-1">
                            {selectedEvent.datosExtendidos.datos_mongo.equipamiento_requerido.map((item, index) => (
                              <div key={index} className="flex items-start gap-2">
                                <span className="text-green-600 mt-1">°</span>
                                <span className="font-medium text-green-800">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedEvent.datosExtendidos.datos_mongo.preparacion_especial && 
                     typeof selectedEvent.datosExtendidos.datos_mongo.preparacion_especial === 'string' && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                          <ClipboardList size={16} />
                          Preparación Especial
                        </p>
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                          <p className="font-medium text-yellow-800">
                            {selectedEvent.datosExtendidos.datos_mongo.preparacion_especial}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedEvent.datosExtendidos.datos_mongo.notas_adicionales && 
                     typeof selectedEvent.datosExtendidos.datos_mongo.notas_adicionales === 'string' && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                          <FileText size={16} />
                          Notas Adicionales
                        </p>
                        <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg">
                          <p className="font-medium text-purple-800 whitespace-pre-wrap">
                            {selectedEvent.datosExtendidos.datos_mongo.notas_adicionales}
                          </p>
                        </div>
                      </div>
                    )}

                  

                    {/* Mensaje si no hay datos extendidos */}
                    {selectedEvent.datosExtendidos?.datos_mongo && 
                     !selectedEvent.datosExtendidos.datos_mongo.tipo_procedimiento && 
                     (!selectedEvent.datosExtendidos.datos_mongo.equipamiento_requerido || selectedEvent.datosExtendidos.datos_mongo.equipamiento_requerido.length === 0) && 
                     !selectedEvent.datosExtendidos.datos_mongo.preparacion_especial && 
                     !selectedEvent.datosExtendidos.datos_mongo.notas_adicionales && 
                     (!selectedEvent.datosExtendidos.datos_mongo.medicos || selectedEvent.datosExtendidos.datos_mongo.medicos.length === 0) && (
                      <div className="text-center py-8">
                        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No hay información extendida disponible para esta agenda</p>
                      </div>
                    )}

                    {/* Mensaje si no hay datos de MongoDB */}
                    {!selectedEvent.datosExtendidos?.datos_mongo && (
                      <div className="text-center py-8">
                        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No hay información extendida disponible para esta agenda</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={cerrarModal}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Inventario */}
      <InventarioModal
        boxId={id}
        isOpen={showInventarioModal}
        onClose={() => setShowInventarioModal(false)}
      />
    </div>
  );
}
import React, { useState, useEffect, useCallback } from "react";
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
  Settings,
  Info,
  FileText,
  Eye,
  X,
  History,
  UserCheck,
  CalendarDays,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';

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
  const [razonInhabilitacion, setRazonInhabilitacion] = useState("");
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEventData, setNewEventData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: "08:00",
    hora_fin: "08:30",
    responsable: "",
    observaciones: "",
    esMedica: 1
  });
  const [horasDisponibles, setHorasDisponibles] = useState({
    inicio: [],
    fin: []
  });
  const [conflictos, setConflictos] = useState([]);

  useEffect(() => {
    setLastUpdated(new Date().toLocaleString());
    fetchBoxData();
    
    // WebSocket para actualizaciones en tiempo real
    const ws_scheme = window.location.protocol === "https:" ? "wss" : "ws";
    const ws_url = `${ws_scheme}://localhost:8000/ws/agendas/`;
    const socket = new WebSocket(ws_url);

    socket.onmessage = () => {
      fetchBoxData();
      setLastUpdated(new Date().toLocaleString());
    };

    return () => socket.close();
  }, [id]);

  const fetchBoxData = async () => {
    try {
      const [boxResponse, agendaResponse, historialResponse] = await Promise.all([
        fetch(`http://localhost:8000/api/boxes/${id}/`),
        fetch(`http://localhost:8000/api/box/${id}/`),
        fetch(`http://localhost:8000/api/boxes/${id}/historial-modificaciones/`)
      ]);

      if (!boxResponse.ok) throw new Error("Error al obtener los datos del box");
      if (!agendaResponse.ok) throw new Error("Error al obtener las agendas");

      const boxData = await boxResponse.json();
      const agendaData = await agendaResponse.json();
      
      // Si el endpoint de historial existe, cargar los datos
      let historialData = [];
      if (historialResponse.ok) {
        historialData = await historialResponse.json();
        // Asegurarnos de que siempre sea un array
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

  const HistorialModificaciones = ({ boxId }) => {
    const [historial, setHistorial] = useState([]);
    const [historialLoading, setHistorialLoading] = useState(true);
    const [historialError, setHistorialError] = useState(null);

    useEffect(() => {
      fetchHistorial();
    }, [boxId]);

    const fetchHistorial = async () => {
      try {
        setHistorialError(null);
        const response = await fetch(`http://localhost:8000/api/boxes/${boxId}/historial-modificaciones/`);
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Asegurarnos de que siempre sea un array
        const historialData = Array.isArray(data) ? data : [];
        setHistorial(historialData);
      } catch (error) {
        console.error('Error fetching historial:', error);
        setHistorialError(error.message);
      } finally {
        setHistorialLoading(false);
      }
    };

    const formatAccion = (accion) => {
      const acciones = {
        'CREACION': 'Creación',
        'MODIFICACION': 'Modificación',
        'INHABILITACION': 'Inhabilitación',
        'HABILITACION': 'Habilitación',
        'ELIMINACION': 'Eliminación'
      };
      return acciones[accion] || accion;
    };

    if (historialLoading) return (
      <div className="flex justify-center items-center py-4">
        <RefreshCw className="animate-spin h-5 w-5 text-[#1B5D52] mr-2" />
        <span>Cargando historial...</span>
      </div>
    );

    if (historialError) return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error al cargar el historial: {historialError}</p>
        <button 
          onClick={fetchHistorial}
          className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
        >
          Reintentar
        </button>
      </div>
    );

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Historial de Modificaciones</h3>
        
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {historial.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay registros de modificaciones</p>
          ) : (
            historial.map((item, index) => (
              <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{formatAccion(item.accion)}</p>
                    {item.campo_modificado && (
                      <p className="text-xs text-gray-600">
                        Campo: {item.campo_modificado}
                        {item.valor_anterior && ` (${item.valor_anterior} → ${item.valor_nuevo})`}
                      </p>
                    )}
                    {item.comentario && (
                      <p className="text-xs text-gray-700 mt-1 bg-gray-50 p-2 rounded">
                        {item.comentario}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-gray-500 ml-2">
                    <p className="whitespace-nowrap">{item.usuario || 'Usuario no especificado'}</p>
                    <p className="text-gray-400">
                      {item.fecha_modificacion ? new Date(item.fecha_modificacion).toLocaleString('es-ES') : 'Fecha no disponible'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const toggleEstado = async () => {
    setCambiandoEstado(true);
    try {
      const token = localStorage.getItem('access_token') || '';
      
      const response = await fetch(`http://localhost:8000/api/boxes/${id}/toggle-estado/`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          razon: razonInhabilitacion
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setBoxData(prev => ({ 
          ...prev, 
          estadobox: data.estadobox,
          comentario: data.comentario || razonInhabilitacion
        }));
        setShowConfirmDialog(false);
        setRazonInhabilitacion("");
        
        // Recargar el historial
        fetchBoxData();
      } else {
        alert("Error al cambiar el estado del box");
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

  const handleEventClick = (info) => {
    setSelectedEvent({
      id: info.event.id,
      title: info.event.title,
      start: info.event.start,
      end: info.event.end,
      extendedProps: info.event.extendedProps || {}
    });
    setShowEventDetails(true);
  };

  const handleDateClick = (arg) => {
    // Al hacer clic en una fecha, abrir modal para crear evento
    const fechaSeleccionada = arg.dateStr;
    setNewEventData(prev => ({
      ...prev,
      fecha: fechaSeleccionada
    }));
    setShowCreateEvent(true);
    generarHorasDisponibles(fechaSeleccionada);
  };

  const isTope = (event) => {
    return event.title && event.title.toLowerCase().includes('tope');
  };

  const tieneConflicto = useCallback((agenda, todasLasAgendas) => {
    return todasLasAgendas.some(a => {
      if (a.id === agenda.id || a.box_id !== agenda.box_id || a.fecha !== agenda.fecha) {
        return false;
      }
      
      const startA = parseDateTime(agenda.fecha, agenda.hora_inicio);
      const endA = parseDateTime(agenda.fecha, agenda.hora_fin);
      const startB = parseDateTime(a.fecha, a.hora_inicio);
      const endB = parseDateTime(a.fecha, a.hora_fin);
      
      return startA < endB && startB < endA;
    });
  }, []);

  const parseDateTime = (fecha, hora) => {
    return new Date(`${fecha}T${hora}`);
  };

  const generarHorasDisponibles = async (fecha, horaInicioSeleccionada = null) => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/${id}/bloques-libres/?fecha=${fecha}`
      );
      
      if (!res.ok) throw new Error("Error al obtener bloques libres");
      
      const data = await res.json();
      const bloquesLibres = data.bloques_libres || [];
      
      if (!horaInicioSeleccionada) {
        const horasDisponibles = [];
        
        bloquesLibres.forEach(bloque => {
          const [inicioH, inicioM] = bloque.inicio.split(':').map(Number);
          const [finH, finM] = bloque.fin.split(':').map(Number);
          
          let h = inicioH;
          let m = inicioM;
          
          while (h < finH || (h === finH && m < finM)) {
            horasDisponibles.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
            
            m += 30;
            if (m >= 60) {
              h += 1;
              m -= 60;
            }
          }
        });
        
        setHorasDisponibles(prev => ({
          ...prev,
          inicio: horasDisponibles
        }));
      } else {
        // Generar horas de fin disponibles basadas en la hora de inicio seleccionada
        const [horaH, horaM] = horaInicioSeleccionada.split(':').map(Number);
        
        const horasFinDisponibles = [];
        
        bloquesLibres.forEach(bloque => {
          const [bloqueH, bloqueM] = bloque.inicio.split(':').map(Number);
          const [bloqueFinH, bloqueFinM] = bloque.fin.split(':').map(Number);
          
          // Verificar si la hora de inicio está dentro de este bloque
          if ((horaH > bloqueH || (horaH === bloqueH && horaM >= bloqueM)) &&
              (horaH < bloqueFinH || (horaH === bloqueFinH && horaM < bloqueFinM))) {
            
            // Calcular la primera hora de fin posible (30 minutos después)
            let h = horaH;
            let m = horaM + 30;
            
            if (m >= 60) {
              h += 1;
              m -= 60;
            }
            
            // Generar horas hasta el fin del bloque
            while (h < bloqueFinH || (h === bloqueFinH && m <= bloqueFinM)) {
              horasFinDisponibles.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
              
              m += 30;
              if (m >= 60) {
                h += 1;
                m -= 60;
              }
            }
          }
        });
        
        setHorasDisponibles(prev => ({
          ...prev,
          fin: horasFinDisponibles
        }));
      }
    } catch (err) {
      console.error("Error generando horas disponibles:", err);
      
      // Fallback en caso de error
      const horas = [];
      const inicioDia = 8;
      const finDia = 18;
      const intervalo = 30;
      
      for (let h = inicioDia; h <= finDia; h++) {
        for (let m = 0; m < 60; m += intervalo) {
          if (h === finDia && m > 0) break;
          horas.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
      }
      
      if (!horaInicioSeleccionada) {
        setHorasDisponibles(prev => ({
          ...prev,
          inicio: horas
        }));
      } else {
        const [horaH, horaM] = horaInicioSeleccionada.split(':').map(Number);
        const horasFiltradas = horas.filter(h => {
          const [hh, mm] = h.split(':').map(Number);
          return hh > horaH || (hh === horaH && mm > horaM);
        });
        
        setHorasDisponibles(prev => ({
          ...prev,
          fin: horasFiltradas
        }));
      }
    }
  };

  const validarNuevoEvento = async () => {
    if (!newEventData.hora_inicio || !newEventData.hora_fin) {
      return { valido: false, mensaje: "Debe completar horas de inicio y fin" };
    }
    
    const start = parseDateTime(newEventData.fecha, newEventData.hora_inicio);
    const end = parseDateTime(newEventData.fecha, newEventData.hora_fin);
    
    if (start >= end) {
      return { valido: false, mensaje: "La hora fin debe ser posterior a la hora inicio" };
    }
    
    // Verificar que el horario seleccionado esté dentro de los bloques libres
    try {
      const res = await fetch(
        `http://localhost:8000/api/${id}/bloques-libres/?fecha=${newEventData.fecha}`
      );
      
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const bloquesLibres = data.bloques_libres || [];
      
      const horarioValido = bloquesLibres.some(bloque => {
        const bloqueInicio = parseDateTime(newEventData.fecha, bloque.inicio);
        const bloqueFin = parseDateTime(newEventData.fecha, bloque.fin);
        return start >= bloqueInicio && end <= bloqueFin;
      });
      
      if (!horarioValido) {
        return { 
          valido: false, 
          mensaje: "El horario seleccionado no está disponible"
        };
      }
      
      // Verificar conflictos con otras agendas
      const conflicto = agendaboxData.some(agenda => {
        if (agenda.fecha !== newEventData.fecha) return false;
        
        const agendaStart = parseDateTime(agenda.fecha, agenda.hora_inicio);
        const agendaEnd = parseDateTime(agenda.fecha, agenda.hora_fin);
        
        return start < agendaEnd && agendaStart < end;
      });
      
      if (conflicto) {
        return { 
          valido: false, 
          mensaje: "Existe un conflicto con otra agenda en este horario"
        };
      }
      
      return { valido: true };
    } catch (error) {
      return { 
        valido: false, 
          mensaje: "Error al validar el horario: " + error.message
      };
    }
  };

  const crearNuevoEvento = async () => {
    const validacion = await validarNuevoEvento();
    if (!validacion.valido) {
      alert(validacion.mensaje);
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:8000/api/reservas/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idbox: id,
          fechaagenda: newEventData.fecha,
          horainicioagenda: newEventData.hora_inicio + ":00",
          horafinagenda: newEventData.hora_fin + ":00",
          nombre_responsable: newEventData.responsable,
          observaciones: newEventData.observaciones,
          es_medica: newEventData.esMedica
        })
      });
      
      if (response.ok) {
        // Recargar datos
        fetchBoxData();
        setShowCreateEvent(false);
        setNewEventData({
          fecha: new Date().toISOString().split('T')[0],
          hora_inicio: "08:00",
          hora_fin: "08:30",
          responsable: "",
          observaciones: "",
          esMedica: 1
        });
        alert("Evento creado exitosamente");
      } else {
        throw new Error("Error al crear el evento");
      }
    } catch (error) {
      alert("Error al crear el evento: " + error.message);
    }
  };

  const eliminarEvento = async () => {
    if (!selectedEvent) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/reservas/${selectedEvent.id}/liberar/`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        // Recargar datos
        fetchBoxData();
        setShowEventDetails(false);
        alert("Evento eliminado exitosamente");
      } else {
        throw new Error("Error al eliminar el evento");
      }
    } catch (error) {
      alert("Error al eliminar el evento: " + error.message);
    }
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
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/boxes")}
          className="flex items-center gap-2 text-[#1B5D52] font-medium hover:text-[#14463d] transition-colors"
        >
          <ArrowLeft size={20} />
          Volver al listado
        </button>
        
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Última actualización: {lastUpdated}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de información del box */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Box #{id}</h2>
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
                <User className="text-gray-500" size={18} />
                <div>
                  <p className="text-sm text-gray-600">Médico asignado</p>
                  <p className="font-medium">{boxData.med || "No asignado"}</p>
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

              {/* Información de última deshabilitación */}
              {boxData.estadobox === "Inhabilitado" && (
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <AlertCircle size={16} />
                    <span>Motivo de deshabilitación</span>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <p className="text-red-700 text-sm font-medium">
                      {boxData.comentario || "Sin especificar"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleEstadoChange}
              disabled={cambiandoEstado}
              className={`w-full mt-6 py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                boxData.estadobox === "Habilitado" 
                  ? "bg-red-100 text-red-700 hover:bg-red-200" 
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
              <Settings size={18} />
              Especialidades
            </h3>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Principal</p>
                <p className="font-medium bg-blue-50 px-3 py-2 rounded-lg">
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

          {/* Historial de modificaciones */}
          <motion.div
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <HistorialModificaciones boxId={id} />
          </motion.div>
        </div>

        {/* Calendario */}
        <motion.div
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Calendar size={18} />
              Agenda del Box
            </h3>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-[#d8b4fe]"></div>
                  <span>No médica</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-[#cfe4ff]"></div>
                  <span>Médica</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-[#ff6b6b]"></div>
                  <span>Tope</span>
                </div>
              </div>
              
              <button
                onClick={() => setShowCreateEvent(true)}
                className="flex items-center gap-2 px-3 py-2 bg-[#1B5D52] text-white rounded-lg hover:bg-[#14463d] transition-colors text-sm"
              >
                <Plus size={16} />
                Nueva agenda
              </button>
            </div>
          </div>

          <div className="border-t pt-4">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "timeGridWeek,dayGridMonth"
              }}
              events={agendaboxData.map(event => ({
                id: event.id,
                title: event.title || (event.esMedica === 0 ? 'No médica' : 'Médica'),
                start: `${event.fecha}T${event.hora_inicio}`,
                end: `${event.fecha}T${event.hora_fin}`,
                color: isTope(event) ? '#ff6b6b' : (event.esMedica === 0 ? '#d8b4fe' : '#cfe4ff'),
                textColor: isTope(event) ? '#ffffff' : '#000000',
                borderColor: 'transparent',
                // Añadir propiedades extendidas para mostrar en el modal
                extendedProps: {
                  esMedica: event.esMedica,
                  tipo: isTope(event) ? 'Tope' : (event.esMedica === 0 ? 'No médica' : 'Médica'),
                  responsable: event.responsable || 'No especificado',
                  observaciones: event.observaciones || 'Sin observaciones'
                }
              }))}
              locale={esLocale}
              buttonText={{
                today: 'Hoy',
                week: 'Semana',
                month: 'Mes'
              }}
              allDaySlot={false}
              slotMinTime="08:00:00"
              slotMaxTime="20:00:00" 
              editable={true}
              selectable={true}
              nowIndicator={true}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
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
            />
          </div>
        </motion.div>
      </div>

      {/* Modal de confirmación para deshabilitar */}
      <AnimatePresence>
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
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
                      : "bg-red-500 hover:bg-red-600"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md"
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
                  onClick={() => setShowEventDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Título</p>
                  <p className="font-medium">{selectedEvent.title}</p>
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
                  <p className="text-sm text-gray-600">Responsable</p>
                  <p className="font-medium flex items-center gap-2">
                    <UserCheck size={16} />
                    {selectedEvent.extendedProps.responsable}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Observaciones</p>
                  <p className="font-medium bg-gray-50 p-3 rounded-lg">
                    {selectedEvent.extendedProps.observaciones}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={eliminarEvento}
                  className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => setShowEventDetails(false)}
                  className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para crear nuevo evento */}
      <AnimatePresence>
        {showCreateEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Plus className="text-green-500" size={24} />
                  <h3 className="text-lg font-semibold text-gray-800">Nueva agenda</h3>
                </div>
                <button 
                  onClick={() => setShowCreateEvent(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Fecha</p>
                  <input
                    type="date"
                    value={newEventData.fecha}
                    onChange={(e) => {
                      setNewEventData({...newEventData, fecha: e.target.value});
                      generarHorasDisponibles(e.target.value);
                    }}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#1B5D52] focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Hora inicio</p>
                    <select
                      value={newEventData.hora_inicio}
                      onChange={async (e) => {
                        setNewEventData({...newEventData, hora_inicio: e.target.value, hora_fin: ""});
                        await generarHorasDisponibles(newEventData.fecha, e.target.value);
                      }}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#1B5D52] focus:border-transparent"
                    >
                      {horasDisponibles.inicio.map((hora, index) => (
                        <option key={index} value={hora}>{hora}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Hora fin</p>
                    <select
                      value={newEventData.hora_fin}
                      onChange={(e) => setNewEventData({...newEventData, hora_fin: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#1B5D52] focus:border-transparent"
                    >
                      <option value="">Seleccione hora fin</option>
                      {horasDisponibles.fin.map((hora, index) => (
                        <option key={index} value={hora}>{hora}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tipo de agenda</p>
                  <select
                    value={newEventData.esMedica}
                    onChange={(e) => setNewEventData({...newEventData, esMedica: parseInt(e.target.value)})}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#1B5D52] focus:border-transparent"
                  >
                    <option value={1}>Médica</option>
                    <option value={0}>No médica</option>
                  </select>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Responsable</p>
                  <input
                    type="text"
                    value={newEventData.responsable}
                    onChange={(e) => setNewEventData({...newEventData, responsable: e.target.value})}
                    placeholder="Nombre del responsable"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#1B5D52] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <p className="text-sm text gray-600 mb-1">Observaciones</p>
                  <textarea
                    value={newEventData.observaciones}
                    onChange={(e) => setNewEventData({...newEventData, observaciones: e.target.value})}
                    placeholder="Observaciones adicionales"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#1B5D52] focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateEvent(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={crearNuevoEvento}
                  className="flex-1 py-2 px-4 bg-[#1B5D52] text-white rounded-lg hover:bg-[#14463d] transition-colors"
                >
                  Crear agenda
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
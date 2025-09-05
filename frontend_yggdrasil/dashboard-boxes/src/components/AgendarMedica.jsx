import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, CheckCircle, AlertCircle, User, ChevronRight, ChevronLeft, ClipboardList, Filter, Stethoscope } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO, isBefore } from 'date-fns';
import Autosuggest from 'react-autosuggest';
import { buildApiUrl } from "../config/api";

export default function AgendarMedica() {
  const navigate = useNavigate();
  const [boxId, setBoxId] = useState("");
  const [fecha, setFecha] = useState(null);
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("08:30");
  const [observaciones, setObservaciones] = useState("");
  const [medicoId, setMedicoId] = useState("");
  const [medicosDisponibles, setMedicosDisponibles] = useState([]);
  const [boxesRecomendados, setBoxesRecomendados] = useState([]);
  const [reservasUsuario, setReservasUsuario] = useState([]);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [loading, setLoading] = useState(false);
  const [pasoActual, setPasoActual] = useState(1);
  const [selectedBox, setSelectedBox] = useState(null);
  const [showReservas, setShowReservas] = useState(true);
  const [boxSeleccionadoData, setBoxSeleccionadoData] = useState(null);
  const [pasilloFiltro, setPasilloFiltro] = useState("");
  const [fechaError, setFechaError] = useState("");
  const [medicoError, setMedicoError] = useState("");
  const [showConfirmacion, setShowConfirmacion] = useState(false);
  const [reservaALiberar, setReservaALiberar] = useState(null);
  const [medicoQuery, setMedicoQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  // Funciones para el autosuggest
  const getSuggestions = (value) => {
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;

    return inputLength === 0 
      ? [] 
      : medicosDisponibles.filter(medico =>
          `${medico.nombre} ${medico.apellido || ''}`
            .toLowerCase()
            .includes(inputValue)
        );
  };

  const formatDateToYYYYMMDD = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const validarFechaHora = () => {
    setFechaError("");
    
    if (!fecha) {
      setFechaError("Debes seleccionar una fecha");
      return false;
    }

    const fechaSeleccionada = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (isBefore(fechaSeleccionada, hoy)) {
      setFechaError("No puedes seleccionar una fecha pasada");
      return false;
    }

    if (horaInicio >= horaFin) {
      setMensaje({ texto: "La hora de fin debe ser mayor a la hora de inicio", tipo: "error" });
      setTimeout(() => setMensaje({ texto: "", tipo: "" }), 3000);
      return false;
    }

    return true;
  };

  const onSuggestionsFetchRequested = ({ value }) => {
    setSuggestions(getSuggestions(value));
  };

  const onSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  const getSuggestionValue = (suggestion) => {
    return `${suggestion.nombre} ${suggestion.apellido || ''}`;
  };

  const renderSuggestion = (suggestion, { isHighlighted }) => (
    <div 
      className="px-4 py-2 transition-colors duration-200 cursor-pointer border-b border-opacity-20 last:border-b-0"
      style={{
        backgroundColor: isHighlighted ? 'var(--accent-color)' : 'transparent',
        color: isHighlighted ? '#ffffff' : 'var(--text-color)',
        borderBottomColor: 'var(--border-color)'
      }}
    >
      <div className="flex items-center gap-2">
        <User size={16} className="flex-shrink-0" />
        <span className="font-medium">{suggestion.nombre} {suggestion.apellido || ''}</span>
      </div>
    </div>
  );

  const onSuggestionSelected = (event, { suggestion }) => {
    setMedicoId(suggestion.idMedico);
    setMedicoError("");
  };

  const buscarBoxesRecomendados = async () => {
    if (!validarFechaHora()) return;

    setLoading(true);
    try {
      const response = await fetch(
        buildApiUrl(`/api/boxes-recomendados/?fecha=${formatDateToYYYYMMDD(fecha)}&hora_inicio=${horaInicio}&hora_fin=${horaFin}`)
      );
      if (!response.ok) throw new Error("Error al buscar recomendaciones");
      const data = await response.json();
      setBoxesRecomendados(data);
      
      if (data.length > 0) {
        buscarMedicosDisponibles();
        setPasoActual(2);
      } else {
        setMensaje({ texto: "No hay boxes disponibles para este horario", tipo: "info" });
      }
    } catch (error) {
      setMensaje({ texto: "Error al buscar boxes recomendados", tipo: "error" });
    } finally {
      setLoading(false);
    }
  };

  const buscarMedicosDisponibles = async () => {
    try {
      const response = await fetch(
        buildApiUrl(`/api/medicos-disponibles/?fecha=${formatDateToYYYYMMDD(fecha)}&hora_inicio=${horaInicio}&hora_fin=${horaFin}`)
      );
      if (!response.ok) throw new Error("Error al buscar médicos disponibles");
      const data = await response.json();
      setMedicosDisponibles(data);
    } catch (error) {
      setMensaje({ texto: "Error al obtener médicos disponibles", tipo: "error" });
    }
  };

  const seleccionarBox = (boxId) => {
    const boxData = boxesRecomendados.find(b => b.id === boxId);
    setSelectedBox(boxId);
    setBoxSeleccionadoData(boxData);
    setPasoActual(3);
  };

  const validarMedico = () => {
    setMedicoError("");
    
    if (!medicoId) {
      setMedicoError("Debes seleccionar un médico");
      return false;
    }
    
    return true;
  };

  const avanzarAResumen = () => {
    if (validarMedico()) {
      setPasoActual(4);
    }
  };

  const realizarReserva = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/reservar-medica/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          box_id: selectedBox,
          fecha: formatDateToYYYYMMDD(fecha), 
          horaInicioReserva: horaInicio,  
          horaFinReserva: horaFin,        
          nombreResponsable: "Nombre del responsable",
          observaciones: observaciones,
          idMedico: medicoId
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setMensaje({ texto: "Agenda médica realizada con éxito", tipo: "success" });
        fetchReservasUsuario();
        resetearEstado();
        setTimeout(() => setMensaje({ texto: "", tipo: "" }), 3000);
      } else {
        throw new Error(data.error || "Error al realizar agenda");
      }
    } catch (error) {
      setMensaje({ texto: error.message, tipo: "error" });
      setTimeout(() => setMensaje({ texto: "", tipo: "" }), 3000);
    }
  };

  const confirmarLiberarReserva = (id) => {
    setReservaALiberar(id);
    setShowConfirmacion(true);
  };

  const liberarReserva = async () => {
    if (!reservaALiberar) return;
    
    try {
      const response = await fetch(buildApiUrl(`/api/reservas/${reservaALiberar}/liberar/`), {
        method: 'DELETE', 
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al liberar la agenda");
      }

      setMensaje({ texto: "Agenda liberada con éxito", tipo: "success" });
      fetchReservasUsuario();
      setTimeout(() => setMensaje({ texto: "", tipo: "" }), 3000);
    } catch (error) {
      setMensaje({ texto: error.message, tipo: "error" });
      setTimeout(() => setMensaje({ texto: "", tipo: "" }), 3000);
    } finally {
      setShowConfirmacion(false);
      setReservaALiberar(null);
    }
  };

  const fetchReservasUsuario = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/mis-reservas-medicas/'));
      const data = await response.json();
      setReservasUsuario(data);
    } catch (error) {
      console.error("Error al obtener agendas:", error);
    }
  };

  const resetearEstado = () => {
    setPasoActual(1);
    setFecha("");
    setHoraInicio("08:00");
    setHoraFin("08:30");
    setSelectedBox(null);
    setBoxSeleccionadoData(null);
    setObservaciones("");
    setMedicoId("");
    setPasilloFiltro("");
  };

  useEffect(() => {
    fetchReservasUsuario();
  }, []);

  // Filtrar boxes por pasillo (case insensitive)
  const boxesFiltrados = pasilloFiltro 
    ? boxesRecomendados.filter(box => 
        box.pasillo.toString().toLowerCase().includes(pasilloFiltro.toLowerCase())
      )
    : boxesRecomendados;

  return (
    <div 
      className="min-h-screen relative pb-20 px-4 md:px-8 transition-colors duration-300" 
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      {/* Header */}
      <div 
        className="py-6 mb-6 border-b transition-colors duration-300" 
        style={{ borderColor: 'var(--border-color)' }}
      >
        <h1 
          className="text-center text-4xl font-bold mt-8 mb-3 transition-colors duration-300" 
          style={{ color: 'var(--text-color)' }}
        >
          Agendamiento Médico
        </h1>
        <p 
          className="text-center transition-colors duration-300" 
          style={{ color: 'var(--text-muted)' }}
        >
          Reserva boxes para atenciones médicas y procedimientos
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Panel principal - izquierda */}
        <div className="flex-1 space-y-6">
          {/* Barra de progreso */}
          <div 
            className="flex items-center justify-between p-4 rounded-lg shadow-sm border transition-colors duration-300" 
            style={{ 
              backgroundColor: 'var(--bg-color)', 
              borderColor: 'var(--border-color)' 
            }}
          >
            <div 
              className="flex flex-col items-center" 
              style={{ color: pasoActual >= 1 ? 'var(--accent-color)' : 'var(--text-muted)' }}
            >
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300" 
                style={{ 
                  backgroundColor: pasoActual >= 1 ? 'var(--accent-color)' : 'var(--bg-secondary)',
                  color: pasoActual >= 1 ? '#ffffff' : 'var(--text-muted)'
                }}
              >
                1
              </div>
              <span className="text-xs mt-1 text-center">Horario</span>
            </div>
            
            <ChevronRight 
              className="mx-1 transition-colors duration-300" 
              style={{ color: pasoActual >= 2 ? 'var(--accent-color)' : 'var(--text-muted)' }} 
            />
            
            <div 
              className="flex flex-col items-center" 
              style={{ color: pasoActual >= 2 ? 'var(--accent-color)' : 'var(--text-muted)' }}
            >
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300" 
                style={{ 
                  backgroundColor: pasoActual >= 2 ? 'var(--accent-color)' : 'var(--bg-secondary)',
                  color: pasoActual >= 2 ? '#ffffff' : 'var(--text-muted)'
                }}
              >
                2
              </div>
              <span className="text-xs mt-1 text-center">Box</span>
            </div>

            <ChevronRight 
              className="mx-1 transition-colors duration-300" 
              style={{ color: pasoActual >= 3 ? 'var(--accent-color)' : 'var(--text-muted)' }} 
            />
            
            <div 
              className="flex flex-col items-center" 
              style={{ color: pasoActual >= 3 ? 'var(--accent-color)' : 'var(--text-muted)' }}
            >
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300" 
                style={{ 
                  backgroundColor: pasoActual >= 3 ? 'var(--accent-color)' : 'var(--bg-secondary)',
                  color: pasoActual >= 3 ? '#ffffff' : 'var(--text-muted)'
                }}
              >
                3
              </div>
              <span className="text-xs mt-1 text-center">Médico</span>
            </div>

            <ChevronRight 
              className="mx-1 transition-colors duration-300" 
              style={{ color: pasoActual >= 4 ? 'var(--accent-color)' : 'var(--text-muted)' }} 
            />
            
            <div 
              className="flex flex-col items-center" 
              style={{ color: pasoActual >= 4 ? 'var(--accent-color)' : 'var(--text-muted)' }}
            >
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300" 
                style={{ 
                  backgroundColor: pasoActual >= 4 ? 'var(--accent-color)' : 'var(--bg-secondary)',
                  color: pasoActual >= 4 ? '#ffffff' : 'var(--text-muted)'
                }}
              >
                4
              </div>
              <span className="text-xs mt-1 text-center">Confirmar</span>
            </div>
          </div>

          {/* Paso 1: Selección de fecha y hora */}
          {pasoActual === 1 && (
            <motion.div
              className="border rounded-lg p-6 shadow-lg transition-colors duration-300"
              style={{ 
                backgroundColor: 'var(--bg-color)', 
                borderColor: 'var(--accent-color)' 
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2 
                className="text-xl font-semibold mb-6 flex items-center gap-2 transition-colors duration-300" 
                style={{ color: 'var(--accent-color)' }}
              >
                <Calendar size={20} /> Paso 1: Selecciona Fecha y Horario
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label 
                    className="block text-sm font-medium mb-1 transition-colors duration-300" 
                    style={{ color: 'var(--text-color)' }}
                  >
                    Fecha *
                  </label>
                  <DatePicker
                    selected={fecha}
                    onChange={(date) => {
                      setFecha(date);
                      setFechaError("");
                    }}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-opacity-50 transition-all duration-300 ${
                      fechaError ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    style={{ 
                      borderColor: fechaError ? '#ef4444' : 'var(--border-color)',
                      backgroundColor: 'var(--bg-color)',
                      color: 'var(--text-color)'
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Seleccione fecha"
                    minDate={new Date()}
                    isClearable
                    showPopperArrow={false}
                    calendarClassName="custom-datepicker"
                  />
                  {fechaError && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {fechaError}
                    </p>
                  )}
                </div>
                
                <div>
                  <label 
                    className="block text-sm font-medium mb-1 transition-colors duration-300" 
                    style={{ color: 'var(--text-color)' }}
                  >
                    Hora Inicio *
                  </label>
                  <select
                    value={horaInicio}
                    onChange={(e) => {
                      setHoraInicio(e.target.value);
                      const [h, m] = e.target.value.split(':').map(Number);
                      const nextValidTime = `${h.toString().padStart(2,'0')}:30`;
                      setHoraFin(nextValidTime);
                    }}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 transition-colors duration-300"
                    style={{ 
                      borderColor: 'var(--border-color)',
                      backgroundColor: 'var(--bg-color)',
                      color: 'var(--text-color)'
                    }}
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const hour = 8 + i;
                      return (
                        <option key={hour} value={`${hour.toString().padStart(2,'0')}:00`}>
                          {`${hour}:00`}
                        </option>
                      );
                    })}
                  </select>
                </div>
                
                <div>
                  <label 
                    className="block text-sm font-medium mb-1 transition-colors duration-300" 
                    style={{ color: 'var(--text-color)' }}
                  >
                    Hora Fin *
                  </label>
                  <select
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 transition-colors duration-300"
                    style={{ 
                      borderColor: 'var(--border-color)',
                      backgroundColor: 'var(--bg-color)',
                      color: 'var(--text-color)'
                    }}
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const hour = 8 + i;
                      const optionHora = `${hour.toString().padStart(2,'0')}:30`;
                      
                      const [hInicio, mInicio] = horaInicio.split(':').map(Number);
                      const [hOpcion, mOpcion] = optionHora.split(':').map(Number);
                      const minutosInicio = hInicio * 60 + mInicio;
                      const minutosOpcion = hOpcion * 60 + mOpcion;

                      return minutosOpcion > minutosInicio ? (
                        <option key={optionHora} value={optionHora}>
                          {optionHora}
                        </option>
                      ) : null;
                    })}
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={buscarBoxesRecomendados}
                  disabled={loading || !fecha}
                  className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-all ${
                    loading ? 'cursor-not-allowed opacity-60' : 'shadow-md hover:shadow-lg hover:brightness-110'
                  }`}
                  style={{
                    backgroundColor: loading ? 'var(--disabled-bg)' : 'var(--accent-color)'
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Buscando...
                    </span>
                  ) : (
                    'Buscar Boxes Disponibles'
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Paso 2: Selección de Box */}
          {pasoActual === 2 && (
            <motion.div
              className="border rounded-lg p-6 shadow-lg transition-colors duration-300"
              style={{ 
                backgroundColor: 'var(--bg-color)', 
                borderColor: 'var(--accent-color)' 
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 
                  className="text-xl font-semibold flex items-center gap-2 transition-colors duration-300" 
                  style={{ color: 'var(--accent-color)' }}
                >
                  <ClipboardList size={20} /> Paso 2: Selecciona un Box
                </h2>
                <button
                  onClick={() => setPasoActual(1)}
                  className="text-sm flex items-center font-extrabold hover:opacity-80 transition-colors duration-300"
                  style={{ color: 'var(--accent-color)' }}
                >
                  <ChevronLeft size={20} className="mr-1" /> Volver
                </button>
              </div>
              
              <p 
                className="mb-4 transition-colors duration-300" 
                style={{ color: 'var(--text-muted)' }}
              >
                Disponibles para {horaInicio} - {horaFin} el {fecha ? format(fecha, 'dd/MM/yyyy') : ''}
              </p>
              
              {/* Filtro por pasillo */}
              <div className="mb-4">
                <label 
                  className="block text-sm font-medium mb-1 transition-colors duration-300" 
                  style={{ color: 'var(--text-color)' }}
                >
                  Filtrar por pasillo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <input
                    type="text"
                    value={pasilloFiltro}
                    onChange={(e) => setPasilloFiltro(e.target.value)}
                    placeholder="Ingresa nombre de pasillo"
                    className="pl-10 w-full border rounded-lg px-3 py-2 focus:ring-2 transition-colors duration-300"
                    style={{ 
                      borderColor: 'var(--border-color)',
                      backgroundColor: 'var(--bg-color)',
                      color: 'var(--text-color)'
                    }}
                  />
                </div>
              </div>
              
              {boxesFiltrados.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {boxesFiltrados.map((box) => (
                    <motion.div
                      key={box.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className={`border rounded-lg p-4 cursor-pointer transition-all duration-300 ${
                        selectedBox === box.id
                          ? 'border-2 shadow-md'
                          : 'hover:shadow-md hover:border-[var(--accent-color)]'
                      }`}
                      style={{
                        borderColor: selectedBox === box.id ? 'var(--accent-color)' : 'var(--border-color)',
                        backgroundColor: selectedBox === box.id ? 'var(--success-bg)' : 'var(--bg-color)'
                      }}
                      onClick={() => seleccionarBox(box.id)}
                    >
                      <div 
                        className="font-medium text-lg transition-colors duration-300" 
                        style={{ color: 'var(--text-color)' }}
                      >
                        Box {box.id}
                      </div>
                      <div 
                        className="text-sm transition-colors duration-300" 
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Pasillo: {box.pasillo}
                      </div>
                      {selectedBox === box.id && (
                        <div 
                          className="flex items-center gap-1 text-sm mt-2 transition-colors duration-300" 
                          style={{ color: 'var(--accent-color)' }}
                        >
                          <CheckCircle size={14} /> Seleccionado
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div 
                  className="text-center py-8 rounded-lg transition-colors duration-300" 
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <AlertCircle size={32} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                  <p 
                    className="font-medium transition-colors duration-300" 
                    style={{ color: 'var(--text-muted)' }}
                  >
                    No hay boxes disponibles para este horario
                  </p>
                  <p 
                    className="text-sm mt-1 transition-colors duration-300" 
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Intenta con otro horario o fecha
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Paso 3: Selección de Médico */}
          {pasoActual === 3 && (
            <motion.div
              className="border rounded-lg p-6 shadow-lg transition-colors duration-300"
              style={{ 
                backgroundColor: 'var(--bg-color)', 
                borderColor: 'var(--accent-color)' 
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 
                  className="text-xl font-semibold flex items-center gap-2 transition-colors duration-300" 
                  style={{ color: 'var(--accent-color)' }}
                >
                  <Stethoscope size={20} /> Paso 3: Selecciona un Médico
                </h2>
                <button
                  onClick={() => setPasoActual(2)}
                  className="text-sm flex items-center font-extrabold hover:opacity-80 transition-colors duration-300"
                  style={{ color: 'var(--accent-color)' }}
                >
                  <ChevronLeft size={20} className="mr-1" /> Volver
                </button>
              </div>

              <p 
                className="mb-4 transition-colors duration-300" 
                style={{ color: 'var(--text-muted)' }}
              >
                Médicos disponibles para {horaInicio} - {horaFin} el {fecha ? format(fecha, 'dd/MM/yyyy') : ''}
              </p>

              <div className="mb-4">
                <label 
                  className="block text-sm font-medium mb-1 transition-colors duration-300" 
                  style={{ color: 'var(--text-color)' }}
                >
                  Médico *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Stethoscope size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <Autosuggest
                    suggestions={suggestions}
                    onSuggestionsFetchRequested={onSuggestionsFetchRequested}
                    onSuggestionsClearRequested={onSuggestionsClearRequested}
                    getSuggestionValue={getSuggestionValue}
                    renderSuggestion={renderSuggestion}
                    onSuggestionSelected={onSuggestionSelected}
                    inputProps={{
                      placeholder: 'Buscar médico por nombre...',
                      value: medicoQuery,
                      onChange: (_, { newValue }) => {
                        setMedicoQuery(newValue);
                        if (!newValue) {
                          setMedicoId("");
                        }
                      },
                      className: `pl-10 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-opacity-50 transition-all duration-300 ${
                        medicoError ? 'border-red-500 focus:border-red-500' : ''
                      }`,
                      style: { 
                        borderColor: medicoError ? '#ef4444' : 'var(--border-color)',
                        backgroundColor: 'var(--bg-color)',
                        color: 'var(--text-color)',
                        focusRingColor: 'var(--accent-color)'
                      }
                    }}
                    theme={{
                      container: 'relative',
                      suggestionsContainerOpen: 'absolute z-10 mt-1 w-full border rounded-lg shadow-lg max-h-60 overflow-auto',
                      suggestionsList: 'list-none m-0 p-0',
                      suggestion: 'cursor-pointer',
                      suggestionHighlighted: ''
                    }}
                    renderSuggestionsContainer={({ containerProps, children }) => (
                      <div 
                        {...containerProps} 
                        className={containerProps.className}
                        style={{
                          backgroundColor: 'var(--bg-color)',
                          borderColor: 'var(--border-color)',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        {children}
                      </div>
                    )}
                  />
                </div>
                <input
                  type="hidden"
                  name="medicoId"
                  value={medicoId}
                />
                {medicoError && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {medicoError}
                  </p>
                )}
                {medicoId && (
                  <div className="mt-2 flex items-center gap-2 text-sm" style={{ color: 'var(--success-text)' }}>
                    <CheckCircle size={14} />
                    <span>Médico seleccionado correctamente</span>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label 
                  className="block text-sm font-medium mb-1 transition-colors duration-300" 
                  style={{ color: 'var(--text-color)' }}
                >
                  Observaciones (opcional)
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 transition-colors duration-300"
                  style={{ 
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--bg-color)',
                    color: 'var(--text-color)'
                  }}
                  rows="3"
                  placeholder="Detalles adicionales sobre la agenda médica"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setPasoActual(2)}
                  className="flex-1 py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-all duration-300"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-color)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  Volver
                </button>
                <button
                  onClick={avanzarAResumen}
                  className="flex-1 py-2 px-4 rounded-lg text-white font-medium shadow-md hover:shadow-lg hover:brightness-110 transition-all duration-300"
                  style={{ backgroundColor: 'var(--accent-color)' }}
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          )}

          {/* Paso 4: Confirmación final */}
          {pasoActual === 4 && (
            <motion.div
              className="border rounded-lg p-6 shadow-lg transition-colors duration-300"
              style={{ 
                backgroundColor: 'var(--bg-color)', 
                borderColor: 'var(--accent-color)' 
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 
                  className="text-xl font-semibold flex items-center gap-2 transition-colors duration-300" 
                  style={{ color: 'var(--accent-color)' }}
                >
                  <CheckCircle size={20} /> Paso 4: Confirmar agenda médica
                </h2>
                <button
                  onClick={() => setPasoActual(3)}
                  className="text-sm flex items-center font-extrabold hover:opacity-80 transition-colors duration-300"
                  style={{ color: 'var(--accent-color)' }}
                >
                  <ChevronLeft size={20} className="mr-1" /> Volver
                </button>
              </div>

              <div 
                className="p-4 rounded-lg mb-6 transition-colors duration-300" 
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <h3 
                  className="font-medium mb-3 transition-colors duration-300" 
                  style={{ color: 'var(--text-color)' }}
                >
                  Revisa los detalles antes de confirmar
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span 
                      className="transition-colors duration-300" 
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Box:
                    </span>
                    <span 
                      className="font-medium break-words min-w-0 max-w-[140px] sm:max-w-xs text-right transition-colors duration-300" 
                      style={{ color: 'var(--text-color)' }}
                    >
                      Box {selectedBox} (Pasillo: {boxSeleccionadoData?.pasillo})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span 
                      className="transition-colors duration-300" 
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Médico:
                    </span>
                    <span 
                      className="font-medium break-words min-w-0 max-w-[140px] sm:max-w-xs text-right transition-colors duration-300" 
                      style={{ color: 'var(--text-color)' }}
                    >
                      {medicosDisponibles.find(m => m.idMedico === parseInt(medicoId))?.nombre}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span 
                      className="transition-colors duration-300" 
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Fecha:
                    </span>
                    <span 
                      className="font-medium transition-colors duration-300" 
                      style={{ color: 'var(--text-color)' }}
                    >
                      {fecha ? format(fecha, 'dd/MM/yyyy') : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span 
                      className="transition-colors duration-300" 
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Horario:
                    </span>
                    <span 
                      className="font-medium transition-colors duration-300" 
                      style={{ color: 'var(--text-color)' }}
                    >
                      {horaInicio} - {horaFin}
                    </span>
                  </div>
                  {observaciones && (
                    <div className="flex justify-between">
                      <span 
                        className="transition-colors duration-300" 
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Observaciones:
                      </span>
                      <span 
                        className="font-medium text-right max-w-xs transition-colors duration-300" 
                        style={{ color: 'var(--text-color)' }}
                      >
                        {observaciones}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setPasoActual(3)}
                  className="flex-1 py-3 px-4 rounded-lg font-medium hover:opacity-90 transition-all duration-300"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-color)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  Modificar
                </button>
                <button
                  onClick={realizarReserva}
                  className="flex-1 py-3 px-4 rounded-lg text-white font-medium shadow-md hover:shadow-lg hover:brightness-110 transition-all duration-300"
                  style={{ backgroundColor: 'var(--accent-color)' }}
                >
                  Confirmar agenda médica
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Panel de reservas - derecha */}
        <div className={`lg:w-80 ${!showReservas && 'hidden lg:block'}`}>
          <motion.div
            className="border rounded-lg shadow-lg overflow-hidden transition-colors duration-300"
            style={{ 
              backgroundColor: 'var(--bg-color)', 
              borderColor: 'var(--accent-color)' 
            }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header del panel de reservas */}
            <div 
              className="text-white p-4 flex justify-between items-center cursor-pointer transition-colors duration-300"
              style={{ backgroundColor: 'var(--accent-color)' }}
              onClick={() => setShowReservas(!showReservas)}
            >
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Stethoscope size={18} /> Mis agendas médicas
              </h2>
              <ChevronRight 
                size={18} 
                className={`transition-transform ${showReservas ? 'rotate-90' : '-rotate-90 lg:rotate-0'}`} 
              />
            </div>
            
            {/* Contenido del panel */}
            {showReservas && (
              <div className="p-4">
                {reservasUsuario.length > 0 ? (
                  <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
                    {reservasUsuario.map((reserva) => (
                      <motion.div
                        key={reserva.id}
                        whileHover={{ scale: 1.01 }}
                        className="border rounded-lg p-3 hover:opacity-90 transition-all duration-300"
                        style={{ 
                          borderColor: 'var(--border-color)',
                          backgroundColor: 'var(--bg-secondary)'
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div 
                              className="font-medium transition-colors duration-300" 
                              style={{ color: 'var(--accent-color)' }}
                            >
                              Box {reserva.box_id}
                            </div>
                            <div 
                              className="text-sm transition-colors duration-300" 
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {reserva.fecha ? format(reserva.fecha, 'dd/MM/yyyy') : ''} • {reserva.hora_inicio} - {reserva.hora_fin}
                            </div>
                            <div 
                              className="text-sm mt-1 transition-colors duration-300" 
                              style={{ color: 'var(--text-color)' }}
                            >
                              Dr. {reserva.medico}
                            </div>
                            {reserva.observaciones && (
                              <div 
                                className="text-xs mt-1 italic transition-colors duration-300" 
                                style={{ color: 'var(--text-muted)' }}
                              >
                                "{reserva.observaciones}"
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmarLiberarReserva(reserva.id);
                            }}
                            className="text-xs px-2 py-1 rounded hover:opacity-80 transition-all duration-300"
                            style={{ 
                              backgroundColor: 'var(--danger-bg)',
                              color: 'var(--danger-text)',
                              border: '1px solid var(--danger-border)'
                            }}
                          >
                            Liberar
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Stethoscope size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                    <p 
                      className="transition-colors duration-300" 
                      style={{ color: 'var(--text-muted)' }}
                    >
                      No tienes agendas médicas activas
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Modal de confirmación para liberar agenda */}
      <AnimatePresence>
        {showConfirmacion && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="rounded-lg p-6 w-full max-w-md transition-colors duration-300"
              style={{ backgroundColor: 'var(--bg-color)' }}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <h3 
                className="text-lg font-semibold mb-4 transition-colors duration-300" 
                style={{ color: 'var(--text-color)' }}
              >
                Confirmar liberación
              </h3>
              <p 
                className="mb-6 transition-colors duration-300" 
                style={{ color: 'var(--text-muted)' }}
              >
                ¿Estás seguro de que deseas liberar esta agenda médica?
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowConfirmacion(false);
                    setReservaALiberar(null);
                  }}
                  className="px-4 py-2 rounded-lg hover:opacity-90 transition-all duration-300"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-color)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={liberarReserva}
                  className="px-4 py-2 rounded-lg text-white hover:opacity-90 transition-colors duration-300"
                  style={{ backgroundColor: '#ef4444' }}
                >
                  Sí, liberar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notificaciones */}
      <AnimatePresence>
        {mensaje.texto && (
          <motion.div
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 transition-colors duration-300"
            style={{
              backgroundColor: mensaje.tipo === 'error' ? 'var(--error-bg)' : 
                             mensaje.tipo === 'info' ? 'var(--info-bg)' : 
                             'var(--success-bg)',
              color: mensaje.tipo === 'error' ? 'var(--error-text)' : 
                     mensaje.tipo === 'info' ? 'var(--info-text)' : 
                     'var(--success-text)',
              borderColor: mensaje.tipo === 'error' ? 'var(--danger-border)' : 
                          mensaje.tipo === 'info' ? 'var(--info-border)' : 
                          'var(--success-border)',
              border: '1px solid'
            }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
          >
            {mensaje.tipo === 'error' ? (
              <AlertCircle size={20} className="flex-shrink-0" />
            ) : mensaje.tipo === 'info' ? (
              <AlertCircle size={20} className="flex-shrink-0" />
            ) : (
              <CheckCircle size={20} className="flex-shrink-0" />
            )}
            <span className="font-medium">{mensaje.texto}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
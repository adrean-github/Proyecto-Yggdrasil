import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, CheckCircle, AlertCircle, User, ChevronRight, ChevronLeft, ClipboardList, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO, isBefore } from 'date-fns';

export default function AgendarNoMedica() {
  const navigate = useNavigate();
  const [boxId, setBoxId] = useState("");
  const [fecha, setFecha] = useState(null);
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("08:30");
  const [observaciones, setObservaciones] = useState("");
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
  const [observacionesError, setObservacionesError] = useState("");
  const [showConfirmacion, setShowConfirmacion] = useState(false);
  const [reservaALiberar, setReservaALiberar] = useState(null);


  // Función para obtener la fecha actual sin problemas de zona horaria
  const getCurrentDateWithoutTime = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  // Función para formatear fecha en formato YYYY-MM-DD sin problemas de zona horaria
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
    const hoy = getCurrentDateWithoutTime();

    // Comparar solo la parte de la fecha (sin hora)
    if (fechaSeleccionada < hoy) {
      setFechaError("No puedes seleccionar una fecha pasada");
      return false;
    }

    if (horaInicio >= horaFin) {
      setMensaje({ texto: `La hora de fin ${horaFin} debe ser mayor a la hora de inicio ${horaInicio}`, tipo: "error" });
      return false;
    }

    return true;
  };


  const buscarBoxesRecomendados = async () => {
    if (!validarFechaHora()) return;

    setLoading(true);
    try {
      const fechaFormateada = formatDateToYYYYMMDD(fecha);    

      const response = await fetch(
        `http://localhost:8000/api/boxes-recomendados/?fecha=${fechaFormateada}&hora_inicio=${horaInicio}&hora_fin=${horaFin}`
      );
      if (!response.ok) throw new Error("Error al buscar recomendaciones");
      const data = await response.json();
      setBoxesRecomendados(data);
      setPasoActual(2);
      
      if (data.length === 0) {
        setMensaje({ texto: "No hay boxes disponibles para este horario", tipo: "info" });
      }
    } catch (error) {
      setMensaje({ texto: "Error al buscar boxes recomendados", tipo: "error" });
    } finally {
      setLoading(false);
    }
  };

  const seleccionarBox = (boxId) => {
    const boxData = boxesRecomendados.find(b => b.id === boxId);
    setSelectedBox(boxId);
    setBoxSeleccionadoData(boxData);
    setPasoActual(3);
  };

  const agregarObservaciones = () => {
    setObservacionesError("");
    
    if (!observaciones.trim()) {
      setObservacionesError("Las observaciones son obligatorias");
      return;
    }
    
    setPasoActual(4);
  };

  const realizarReserva = async () => {
    try {
      const fechaFormateada = formatDateToYYYYMMDD(fecha);
      
      const response = await fetch('http://localhost:8000/api/reservar-no-medica/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          box_id: selectedBox,
          fecha: fechaFormateada, 
          horaInicioReserva: horaInicio,  
          horaFinReserva: horaFin,        
          nombreResponsable: "Nombre del responsable",
          observaciones: observaciones
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setMensaje({ texto: "Agenda creada con éxito", tipo: "success" });
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
      const response = await fetch(`http://localhost:8000/api/reservas/${reservaALiberar}/liberar/`, {
        method: 'DELETE', 
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al liberar la reserva");
      }
      
      setMensaje({ texto: "Reserva liberada con éxito", tipo: "success" });
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
      const response = await fetch('http://localhost:8000/api/mis-reservas-no-medicas/');
      const data = await response.json();
      setReservasUsuario(data);
    } catch (error) {
      console.error("Error al obtener reservas:", error);
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
    <div className="min-h-screen relative pb-20 px-4 md:px-8 bg-gray-50">
      {/* Header */}
      <div className="py-6 mb-6 border-b border-gray-200">
        <h1 className="text-center text-4xl font-bold mt-8 mb-3">Agendamiento no médico</h1>
        <p className="text-center text-gray-700">Reserva boxes para reuniones, capacitaciones u otros fines</p>

      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Panel principal - izquierda */}
        <div className="flex-1 space-y-6">
          {/* Barra de progreso */}
          <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className={`flex flex-col items-center ${pasoActual >= 1 ? 'text-[#005C48]' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${pasoActual >= 1 ? 'bg-[#005C48] text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="text-xs mt-1 text-center">Horario</span>
            </div>
            
            <ChevronRight className={`mx-1 ${pasoActual >= 2 ? 'text-[#005C48]' : 'text-gray-300'}`} />
            
            <div className={`flex flex-col items-center ${pasoActual >= 2 ? 'text-[#005C48]' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${pasoActual >= 2 ? 'bg-[#005C48] text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="text-xs mt-1 text-center">Box</span>
            </div>

            <ChevronRight className={`mx-1 ${pasoActual >= 3 ? 'text-[#005C48]' : 'text-gray-300'}`} />
            
            <div className={`flex flex-col items-center ${pasoActual >= 3 ? 'text-[#005C48]' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${pasoActual >= 3 ? 'bg-[#005C48] text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="text-xs mt-1 text-center">Resumen</span>
            </div>

            <ChevronRight className={`mx-1 ${pasoActual >= 4 ? 'text-[#005C48]' : 'text-gray-300'}`} />
            
            <div className={`flex flex-col items-center ${pasoActual >= 4 ? 'text-[#005C48]' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${pasoActual >= 4 ? 'bg-[#005C48] text-white' : 'bg-gray-200'}`}>
                4
              </div>
              <span className="text-xs mt-1 text-center">Confirmar</span>
            </div>
          </div>

          {/* Paso 1: Selección de fecha y hora */}
          {pasoActual === 1 && (
            <motion.div
              className="bg-white border border-[#005C48] rounded-lg p-6 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-semibold text-[#005C48] mb-6 flex items-center gap-2">
                <Calendar size={20} /> Paso 1: Selecciona Fecha y Horario
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Fecha *</label>
                  <DatePicker
                    selected={fecha}
                    onChange={(date) => {
                      setFecha(date);
                      setFechaError("");
                    }}
                    className={`w-full border ${fechaError ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 focus:border-[#005C48] focus:ring-2 focus:ring-[#005C48]/50`}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Seleccione fecha"
                    minDate={new Date()}
                    isClearable
                    adjustDateOnChange
                    showPopperArrow={false}
                  />
                  {fechaError && (
                    <p className="mt-1 text-sm text-red-600">{fechaError}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Hora Inicio *</label>
                  <select
                    value={horaInicio}
                    onChange={(e) => {
                      setHoraInicio(e.target.value);
                      // Reset horaFin cuando cambia horaInicio
                      const [h, m] = e.target.value.split(':').map(Number);
                      const nextValidTime = `${h.toString().padStart(2,'0')}:30`;
                      setHoraFin(nextValidTime);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-[#005C48] focus:ring-2 focus:ring-[#005C48]/50"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const hour = 8 + i;
                      return <option key={hour} value={`${hour.toString().padStart(2,'0')}:00`}>{`${hour}:00`}</option>;
                    })}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Hora Fin *</label>
                  <select
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-[#005C48] focus:ring-2 focus:ring-[#005C48]/50"
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
                    loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#005C48] hover:bg-[#4fa986] shadow-md hover:shadow-lg'
                  }`}
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
              className="bg-white border border-[#005C48] rounded-lg p-6 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-[#005C48] flex items-center gap-2">
                  <ClipboardList size={20} /> Paso 2: Selecciona un Box
                </h2>
                <button
                  onClick={() => setPasoActual(1)}
                  className="text-sm text-[#005C48] hover:text-[#4fa986] flex items-center"
                >
                  <ChevronLeft size={16} className="mr-1" /> Volver
                </button>
              </div>
              
              <p className="text-gray-600 mb-4">
                Disponibles para {horaInicio} - {horaFin} el {fecha ? format(fecha, 'dd/MM/yyyy') : ''}              </p>
              
              {/* Filtro por pasillo */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por pasillo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={pasilloFiltro}
                    onChange={(e) => setPasilloFiltro(e.target.value)}
                    placeholder="Ingresa nombre de pasillo"
                    className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-[#005C48] focus:ring-2 focus:ring-[#005C48]/50"
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
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedBox === box.id
                          ? 'border-2 border-[#005C48] bg-[#f0f9f6] shadow-md'
                          : 'border-gray-200 hover:border-[#005C48] hover:bg-[#f0f9f6]'
                      }`}
                      onClick={() => seleccionarBox(box.id)}
                    >
                      <div className="font-medium text-lg">Box {box.id}</div>
                      <div className="text-sm text-gray-600">Pasillo: {box.pasillo}</div>
                      {selectedBox === box.id && (
                        <div className="flex items-center gap-1 text-[#005C48] text-sm mt-2">
                          <CheckCircle size={14} /> Seleccionado
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <AlertCircle size={32} className="mx-auto text-gray-400 mb-2" />
                  {boxesRecomendados.length === 0 ? (
                    <>
                      <p className="text-gray-500 font-medium">No hay boxes disponibles para este horario</p>
                      <p className="text-sm text-gray-400 mt-1">Intenta con otro horario o fecha</p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-500 font-medium">No hay boxes en el pasillo {pasilloFiltro}</p>
                      <p className="text-sm text-gray-400 mt-1">Intenta con otro pasillo</p>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Paso 3: Resumen de la reserva */}
          {pasoActual === 3 && (
            <motion.div
              className="bg-white border border-[#005C48] rounded-lg p-6 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-[#005C48] flex items-center gap-2">
                  <ClipboardList size={20} /> Paso 3: Resumen de tu agenda
                </h2>
                <button
                  onClick={() => setPasoActual(2)}
                  className="text-sm text-[#005C48] hover:text-[#4fa986] flex items-center"
                >
                  <ChevronLeft size={16} className="mr-1" /> Volver
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-gray-700 mb-3">Detalles de la agenda</h3>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 ">Box seleccionado:</span>
                    <span className="font-medium break-words min-w-0 max-w-[140px] sm:max-w-xs text-right">Box {selectedBox} (Pasillo: {boxSeleccionadoData?.pasillo})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha:</span>
                    <span className="font-medium">{fecha ? format(fecha, 'dd/MM/yyyy') : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Horario:</span>
                    <span className="font-medium">{horaInicio} - {horaFin}</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones *</label>
                <textarea
                  value={observaciones}
                  onChange={(e) => {
                    setObservaciones(e.target.value);
                    setObservacionesError("");
                  }}
                  className={`w-full border ${observacionesError ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 focus:border-[#005C48] focus:ring-2 focus:ring-[#005C48]/50`}
                  rows="3"
                  placeholder="Detalles adicionales sobre la agenda (ej: Reunión de equipo, Capacitación, etc.)"
                />
                {observacionesError && (
                  <p className="mt-1 text-sm text-red-600">{observacionesError}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setPasoActual(2)}
                  className="flex-1 py-2 px-4 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition-all"
                >
                  Volver
                </button>
                <button
                  onClick={agregarObservaciones}
                  className="flex-1 py-2 px-4 rounded-lg bg-[#005C48] text-white font-medium hover:bg-[#4fa986] shadow-md hover:shadow-lg transition-all"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          )}

          {/* Paso 4: Confirmación final */}
          {pasoActual === 4 && (
            <motion.div
              className="bg-white border border-[#005C48] rounded-lg p-6 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-[#005C48] flex items-center gap-2">
                  <CheckCircle size={20} /> Paso 4: Confirmar agenda
                </h2>
                <button
                  onClick={() => setPasoActual(3)}
                  className="text-sm text-[#005C48] hover:text-[#4fa986] flex items-center"
                >
                  <ChevronLeft size={16} className="mr-1" /> Volver
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-gray-700 mb-3">Revisa los detalles antes de confirmar</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Box:</span>
                    <span className="font-medium break-words min-w-0 max-w-[140px] sm:max-w-xs text-right">Box {selectedBox} (Pasillo: {boxSeleccionadoData?.pasillo})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha:</span>
                    <span className="font-medium">{fecha ? format(fecha, 'dd/MM/yyyy') : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Horario:</span>
                    <span className="font-medium">{horaInicio} - {horaFin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Observaciones:</span>
                    <span className="font-medium text-right max-w-xs">{observaciones}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setPasoActual(3)}
                  className="flex-1 py-3 px-4 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition-all"
                >
                  Modificar
                </button>
                <button
                  onClick={realizarReserva}
                  className="flex-1 py-3 px-4 rounded-lg bg-[#005C48] text-white font-medium hover:bg-[#4fa986] shadow-md hover:shadow-lg transition-all"
                >
                  Confirmar agenda
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Panel de reservas - derecha */}
        <div className={`lg:w-80 ${!showReservas && 'hidden lg:block'}`}>
          <motion.div
            className="bg-white border border-[#005C48] rounded-lg shadow-lg overflow-hidden"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header del panel de reservas */}
            <div 
              className="bg-[#005C48] text-white p-4 flex justify-between items-center cursor-pointer"
              onClick={() => setShowReservas(!showReservas)}
            >
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <User size={18} /> Mis agendas no médicas
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
                        className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-[#005C48]">Box {reserva.box_id}</div>
                            <div className="text-sm text-gray-600">
                              {format(parseISO(reserva.fecha), 'dd/MM/yyyy')} • {reserva.hora_inicio} - {reserva.hora_fin}
                            </div>
                            {reserva.observaciones && (
                              <div className="text-xs text-gray-500 mt-1 italic">
                                "{reserva.observaciones}"
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmarLiberarReserva(reserva.id);
                            }}
                            className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
                          >
                            Liberar
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Calendar size={24} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">No tienes reservas activas</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Modal de confirmación para liberar reserva */}
      <AnimatePresence>
        {showConfirmacion && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-lg p-6 w-full max-w-md"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirmar liberación</h3>
              <p className="text-gray-600 mb-6">¿Estás seguro de que deseas liberar esta agenda?</p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowConfirmacion(false);
                    setReservaALiberar(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={liberarReserva}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
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
            className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 ${
              mensaje.tipo === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 
              mensaje.tipo === 'info' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 
              'bg-green-100 text-green-800 border border-green-200'
            }`}
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
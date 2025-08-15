import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, CheckCircle, AlertCircle, User } from "lucide-react";
import { motion } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';

export default function AgendarNoMedica() {
  const navigate = useNavigate();
  const [boxId, setBoxId] = useState("");
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("08:30");
  const [observaciones, setObservaciones] = useState("");
  const [boxesRecomendados, setBoxesRecomendados] = useState([]);
  const [reservasUsuario, setReservasUsuario] = useState([]);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [loading, setLoading] = useState(false);
  const [pasoActual, setPasoActual] = useState(1);
  const [selectedBox, setSelectedBox] = useState(null);

  const buscarBoxesRecomendados = async () => {
    if (!fecha || !horaInicio || !horaFin) {
      setMensaje({ texto: "Selecciona fecha y horario completo", tipo: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/boxes-recomendados/?fecha=${fecha}&hora_inicio=${horaInicio}&hora_fin=${horaFin}`
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

  const realizarReserva = async () => {
    if (!selectedBox) {
      setMensaje({ texto: "Selecciona un box para reservar", tipo: "error" });
      return;
    }
    try {
        const response = await fetch('http://localhost:8000/api/reservar-no-medica/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            box_id: selectedBox,
            fecha: fecha, 
            horaInicioReserva: horaInicio,  
            horaFinReserva: horaFin,        
            nombreResponsable: "Nombre del responsable",
            observaciones: observaciones
          }),
        });
      const data = await response.json();
      if (response.ok) {
        setMensaje({ texto: "Reserva realizada con éxito", tipo: "success" });
        fetchReservasUsuario();
        resetearEstado();
      } else {
        throw new Error(data.error || "Error al realizar reserva");
      }
    } catch (error) {
      setMensaje({ texto: error.message, tipo: "error" });
    }
  };


  const liberarReserva = async (id) => {
    try {

      const response = await fetch(`http://localhost:8000/api/reservas/${id}/liberar`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error("Error al liberar la reserva");
      setMensaje({ texto: "Reserva liberada con éxito", tipo: "success" });
      fetchReservasUsuario();
    } catch (error) {
      setMensaje({ texto: error.message, tipo: "error" });
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
    setObservaciones("");
    setTimeout(() => setMensaje({ texto: "", tipo: "" }), 3000);
  };

  useEffect(() => {
    fetchReservasUsuario();
  }, []);

  return (
    <div className="min-h-screen bg-white relative pb-20 px-4 md:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/*paso 1: selecc fecha y hora */}
          {pasoActual === 1 && (
            <motion.div
              className="bg-white border border-[#5FB799] rounded-lg p-6 shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-xl font-semibold text-[#5FB799] mb-4 flex items-center gap-2">
                <Calendar size={20} /> Selecciona Fecha y Horario
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha</label>
                  <DatePicker
                    selected={fecha ? new Date(fecha) : null}
                    value={fecha}
                    onChange={(date) => setFecha(date.toISOString().split('T')[0])}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:border-[#5FB799] focus:ring-1 focus:ring-[#5FB799]"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Seleccione fecha"
                    minDate={new Date()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hora Inicio</label>
                  <select
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:border-[#5FB799] focus:ring-1 focus:ring-[#5FB799]"
                  >
                    {Array.from({ length: 13 }, (_, i) => {
                      const hour = 8 + i;
                      return <option key={hour} value={`${hour.toString().padStart(2,'0')}:00`}>{`${hour}:00`}</option>;
                    })}
                  </select>
                </div>
                <div>
                <label className="block text-sm font-medium mb-1">Hora Fin</label>
                <select
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:border-[#5FB799] focus:ring-1 focus:ring-[#5FB799]"
                >
                    {Array.from({ length: 13 }, (_, i) => {
                    const hour = 8 + i;
                    const optionHora = `${hour.toString().padStart(2,'0')}:30`;

                    const [hInicio, mInicio] = horaInicio.split(':').map(Number);
                    const [hOpcion, mOpcion] = optionHora.split(':').map(Number);
                    const minutosInicio = hInicio * 60 + mInicio;
                    const minutosOpcion = hOpcion * 60 + mOpcion;

                    if (minutosOpcion <= minutosInicio) return null;

                    return (
                        <option key={optionHora} value={optionHora}>
                        {optionHora}
                        </option>
                    );
                    })}
                </select>
                </div>
              </div>
              <button
                onClick={buscarBoxesRecomendados}
                disabled={loading || !fecha}
                className={`mt-4 w-full py-2 px-4 rounded text-white font-medium ${
                  loading ? 'bg-gray-400' : 'bg-[#5FB799] hover:bg-[#4fa986]'
                }`}
              >
                {loading ? 'Buscando boxes...' : 'Buscar Boxes Disponibles'}
              </button>
            </motion.div>
          )}

          {/*paso 2: selecc de Box Recomendado */}
          {pasoActual === 2 && (
            <motion.div
              className="bg-white border border-[#5FB799] rounded-lg p-6 shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-xl font-semibold text-[#5FB799] mb-4">
                Boxes Disponibles para {horaInicio} - {horaFin} el {fecha}
              </h2>
              
              {boxesRecomendados.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {boxesRecomendados.map((box) => (
                    <div
                      key={box.id}
                      className={`border rounded p-3 cursor-pointer transition-all ${
                        selectedBox === box.id
                          ? 'border-2 border-[#5FB799] bg-[#f0f9f6] shadow-md'
                          : 'border-[#5FB799] hover:bg-[#f0f9f6]'
                      }`}
                      onClick={() => setSelectedBox(box.id)}
                    >
                      <div className="font-medium">Box {box.id}</div>
                      <div className="text-sm">Pasillo: {box.pasillo}</div>
                      {selectedBox === box.id && (
                        <div className="flex items-center gap-1 text-[#5FB799] text-sm mt-1">
                          <CheckCircle size={14} /> Seleccionado
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No hay boxes disponibles para este horario
                </div>
              )}

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Observaciones</label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:border-[#5FB799] focus:ring-1 focus:ring-[#5FB799]"
                    rows="3"
                    placeholder="Detalles adicionales (opcional)"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setPasoActual(1)}
                    className="flex-1 py-2 px-4 rounded bg-gray-200 text-gray-800 font-medium hover:bg-gray-300"
                  >
                    Volver
                  </button>
                  <button
                    onClick={realizarReserva}
                    disabled={!selectedBox}
                    className={`flex-1 py-2 px-4 rounded text-white font-medium ${
                      selectedBox ? 'bg-[#5FB799] hover:bg-[#4fa986]' : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Confirmar Reserva
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/*mis reservas*/}
        <div className="space-y-6">
          <motion.div
            className="bg-white border border-[#5FB799] rounded-lg p-6 shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-xl font-semibold text-[#5FB799] mb-4">Mis reservas no médicas</h2>
            {reservasUsuario.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {reservasUsuario.map((reserva) => (
                  <div
                    key={reserva.id}
                    className="border border-gray-200 rounded p-3 hover:bg-gray-50 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">Box {reserva.box_id}</div>
                      <div className="text-sm">{reserva.fecha}</div>
                      <div className="text-sm">{reserva.hora_inicio} - {reserva.hora_fin}</div>
                      <div className="text-sm text-gray-600">{reserva.observaciones}</div>
                    </div>
                    <button
                      onClick={async () => {
                        if (window.confirm("¿Estás seguro de que quieres liberar esta reserva?")) {
                          try {
                            const response = await fetch(`http://localhost:8000/api/reservas/${reserva.id}/liberar/`, {
                              method: 'DELETE',
                            });
                            const data = await response.json();
                            if (response.ok) {
                              setMensaje({ texto: data.mensaje, tipo: "success" });
                              fetchReservasUsuario(); // refresca la lista
                            } else {
                              setMensaje({ texto: data.error || "Error al liberar la reserva", tipo: "error" });
                            }
                          } catch (error) {
                            setMensaje({ texto: error.message, tipo: "error" });
                          } finally {
                            setTimeout(() => setMensaje({ texto: "", tipo: "" }), 3000); // desaparece notificación
                          }
                        }
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded"
                    >
                      Liberar
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No tienes reservas activas</p>
            )}
          </motion.div>
        </div>

      </div>

      {/*notificaciones:P */}
      {mensaje.texto && (
        <motion.div
          className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded shadow-lg flex items-center gap-2 ${
            mensaje.tipo === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 
            mensaje.tipo === 'info' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 
            'bg-green-100 text-green-800 border border-green-200'
          }`}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
        >
          {mensaje.tipo === 'error' ? (
            <AlertCircle size={18} className="flex-shrink-0" />
          ) : mensaje.tipo === 'info' ? (
            <AlertCircle size={18} className="flex-shrink-0" />
          ) : (
            <CheckCircle size={18} className="flex-shrink-0" />
          )}
          <span>{mensaje.texto}</span>
        </motion.div>
      )}
    </div>
  );
}
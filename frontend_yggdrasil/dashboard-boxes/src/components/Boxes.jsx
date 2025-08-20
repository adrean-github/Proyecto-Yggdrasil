import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  Clock, 
  Filter, 
  RefreshCw, 
  User, 
  Info,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";

const pasillos = ["Traumatología - Gimnasio y curaciones", "Medicina", "Pedriatría", "Salud mental",
  "Broncopulmonar - Cardiología", "Otorrinolaringología",
  "Cirugías - Urología - Gastroenterología", "Ginecología - Obstetricia",
  "Cuidados paliativos - Neurología - Oftalmología", "Gimnasio cardiovascular - Nutrición",
  "Dermatología - UNACESS", "Hematología - Infectología - Misceláneo"];

const estadosDisponibles = [
  { label: "Todos", valor: "Todos", color: "bg-blue-900", textColor: "text-white" },
  { label: "Tope", valor: "Tope", color: "bg-[#902525]", textColor: "text-white" },
  { label: "Disponible", valor: "Disponible", color: "bg-[#A8A8A8]", textColor: "text-black" },
  { label: "Ocupado", valor: "Ocupado", color: "bg-[#1B5D52]", textColor: "text-white" },
  { label: "Inhabilitado", valor: "Inhabilitado", color: "bg-[#EBB360]", textColor: "text-black" },
];

const getColor = (estado) => {
  switch (estado) {
    case "Ocupado":
      return "bg-[#1B5D52]";
    case "Disponible":
      return "bg-[#A8A8A8]";
    case "Inhabilitado":
      return "bg-[#EBB360]";
    case 'Tope':
      return "bg-[#902525]";
    default:
      return "bg-gray-200";
  }
};

const agruparEnDúos = (arr) => {
  const res = [];
  for (let i = 0; i < arr.length; i += 2) {
    res.push(arr.slice(i, i + 2));
  }
  return res;
};

export default function Boxes() {
  const [filtroPasillo, setFiltroPasillo] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split("T")[0]);
  const [filtroHora, setFiltroHora] = useState(new Date().toTimeString().slice(0, 5));
  const [boxHover, setBoxHover] = useState(null);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [boxes, setBoxes] = useState([]);
  const [boxesraw, setBoxesraw] = useState([]);
  const [enVivo, setEnVivo] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const navigate = useNavigate();

  // WebSocket para actualización en tiempo real
  useEffect(() => {
    const ws_scheme = window.location.protocol === "https:" ? "wss" : "ws";
    const ws_url = `${ws_scheme}://localhost:8000/ws/agendas/`;
    const socket = new window.WebSocket(ws_url);

    socket.onopen = () => {
      console.log("WebSocket conectado (Boxes)");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.message === "actualizacion_agenda") {
          fetchBoxes();
        }
      } catch (e) {
        console.error("Error procesando mensaje WebSocket (Boxes):", e);
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket error (Boxes):", err);
    };

    return () => {
      socket.close();
    };
  }, []);

  const fetchBoxes = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/boxes/");  
      const data = await response.json();
      setBoxes(data);
      setBoxesraw(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error al obtener los boxes:", error);
    }
  };

  useEffect(() => {
    fetchBoxes();
  }, []);

  const fetchBoxState = async (boxId, fecha, hora) => {
    try {
      const response = await fetch(`http://localhost:8000/api/estado_box/?idbox=${boxId}&fecha=${fecha}&hora=${hora}`);
      const data = await response.json();
      setBoxes((prevBoxes) =>
        prevBoxes.map((box) =>
          box.idbox === boxId ? { ...box, estadobox: data.estado } : box
        )
      );
    } catch (error) {
      console.error("Error al obtener el estado del box:", error);
    }
  }; 


  const fetchBoxStateInhabilitado = async (boxId, fecha, hora) => {
    try {
      setBoxes((prevBoxes) =>
        prevBoxes.map((box) =>
          box.idbox === boxId ? { ...box, estadobox: "Inhabilitado" } : box
        )
      );
    } catch (error) {
      console.error("Error al obtener el estado del box inhabilitado:", error);
    }
  }; 

  const handleFechaHoraChange = (fecha, hora) => {
    boxes.forEach((box) => {
      if (box.estadobox === "Inhabilitado") {
        fetchBoxStateInhabilitado(box.idbox, fecha, hora);
      } else {
        fetchBoxState(box.idbox, fecha, hora);
      }
    });
  };

  useEffect(() => {
    if (boxes.length > 0) {
      handleFechaHoraChange(filtroFecha, filtroHora);
    }
  }, [filtroFecha, filtroHora, boxesraw]);  

  const handleMouseEnter = (box, e) => {
    const timeout = setTimeout(() => {
      setBoxHover(box);
      setMousePos({ x: e.clientX, y: e.clientY });
    }, 300);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimeout);
    setBoxHover(null);
  };

  const handleMouseMove = (e) => {
    if (boxHover) {
      setMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const volverAVivo = () => {
    const ahora = new Date();
    setFiltroFecha(ahora.toLocaleDateString('sv-SE'));
    setFiltroHora(ahora.toTimeString().slice(0, 5));
    setEnVivo(true);
  };
  
  const isFuture = () => {
    const now = new Date();
    const filtroCompleto = new Date(`${filtroFecha}T${filtroHora}`);
    return filtroCompleto > now;
  };

  const handleFechaChange = (fecha) => {
    setFiltroFecha(fecha);
    if (enVivo) setEnVivo(false);
  };

  const handleHoraChange = (hora) => {
    setFiltroHora(hora);
    if (enVivo) setEnVivo(false);
  };

  const boxesFiltrados = boxes.filter((b) => {
    const coincidePasillo = filtroPasillo === "Todos" || b.pasillobox === filtroPasillo;
    const coincideEstado = filtroEstado === "Todos" || b.estadobox === filtroEstado;
    return coincidePasillo && coincideEstado;
  });

  const boxesFiltradosPorPasillo = boxes.filter((b) => {
    return (filtroPasillo === "Todos" || b.pasillobox === filtroPasillo);
  });

  const countByEstado = (estado) => boxesFiltradosPorPasillo.filter((b) => b.estadobox === estado).length;
  const pasillosMostrar = filtroPasillo === "Todos" ? pasillos : [filtroPasillo];

  const formatDateTime = (dateString, timeString) => {
    const date = new Date(dateString);
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    return `${date.toLocaleDateString('es-ES', options)} a las ${timeString}`;
  };

  return (
    <div className="min-h-screen p-4 pb-20">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-black">Panel de Boxes</h1>
            <p className="text-gray-600 text-sm mt-1">
              {enVivo ? "" : `Consultando: ${formatDateTime(filtroFecha, filtroHora)}`}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={fetchBoxes}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors text-sm"
            >
              <RefreshCw size={16} />
              Actualizar
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 bg-[#1B5D52] hover:bg-[#14463d] text-white px-3 py-2 rounded-lg transition-colors text-sm"
            >
              <Filter size={16} />
              Filtros
              {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/*filtros expandibles */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pasillo</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1B5D52] focus:border-[#1B5D52] text-sm"
                    value={filtroPasillo} 
                    onChange={(e) => setFiltroPasillo(e.target.value)}
                  >
                    <option value="Todos">Todos los pasillos</option>
                    {pasillos.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={filtroFecha} 
                      onChange={(e) => handleFechaChange(e.target.value)} 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1B5D52] focus:border-[#1B5D52] text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="time" 
                      value={filtroHora} 
                      onChange={(e) => handleHoraChange(e.target.value)} 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1B5D52] focus:border-[#1B5D52] text-sm"
                    />
                    <button
                      onClick={volverAVivo}
                      className="whitespace-nowrap bg-[#1B5D52] text-white px-3 py-2 rounded-lg hover:bg-[#14463d] transition text-sm font-medium flex items-center gap-1"
                      title="Volver al estado en vivo"
                    >
                      <Clock size={16} />
                      En vivo
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/*panel principal de boxes */}
        <div className="flex-1">
          {/*filtros de estado */}
          <div className="flex flex-wrap gap-2 mb-4">
            {estadosDisponibles.map((estado) => (
              <button
                key={estado.valor}
                onClick={() => setFiltroEstado(estado.valor)}
                className={`px-4 py-1 rounded-lg shadow-sm text-sm font-medium transition-all flex items-center gap-2
                  ${filtroEstado === estado.valor ? "ring-2 ring-offset-1 ring-gray-400 scale-105" : "opacity-90 hover:opacity-100"} 
                  ${estado.color} ${estado.textColor}`}
              >
                <div className="w-3 h-3 rounded-full bg-current opacity-70"></div>
                {estado.label} ({estado.valor === "Todos" ? boxesFiltradosPorPasillo.length : countByEstado(estado.valor)})
              </button>
            ))}
          </div>

          {/*lista de boxes */}
          <div className="overflow-y-auto max-h-[calc(100vh-220px)] pr-2">
            <AnimatePresence mode="sync">
              {agruparEnDúos(pasillosMostrar).map((grupo, idx) => (
                <motion.div
                  key={`${filtroPasillo}-${filtroEstado}-${idx}`}
                  className="flex flex-col md:flex-row gap-4 mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {grupo.map((pasillo, pasilloIdx) => {
                    const boxesPorGrupo = boxesFiltrados.filter((b) => b.pasillobox === pasillo);
                    const centrar = grupo.length === 1 && pasilloIdx === 0 ? "mx-auto" : "";
                    
                    return (
                      <div key={pasillo} className={`bg-white rounded-xl p-4 shadow-sm border border-gray-200 w-full flex flex-col ${centrar}`}>
                        <h2 className="text-md font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">{pasillo}</h2>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10 gap-2 justify-center items-center justify-items-center">
                          {boxesPorGrupo.map((box) => (
                            <motion.div
                              key={box.idbox}
                              className={`w-10 h-10 rounded-lg ${getColor(box.estadobox)} flex items-center justify-center text-sm font-bold text-white cursor-pointer relative group`}
                              onMouseEnter={(e) => handleMouseEnter(box, e)}
                              onMouseMove={handleMouseMove}
                              onMouseLeave={handleMouseLeave}
                              onClick={() => navigate(`/boxes/${box.idbox}`)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              {box.idbox}
                              <div className="absolute inset-0 rounded-lg border-2 border-white border-opacity-0 group-hover:border-opacity-100 transition-all"></div>
                            </motion.div>
                          ))}
                          
                          {boxesPorGrupo.length === 0 && (
                            <div className="col-span-full text-center py-6 text-gray-500 text-sm">
                              No hay boxes en este pasillo con los filtros seleccionados
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/*panel lateral derecho - Estadísticas */}
        <div className="w-full lg:w-80 flex flex-col gap-2">
          {/*tarjetas*/}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Info size={18} />
              Resumen de estados
            </h3>
            
            <div className="space-y-3">
              {estadosDisponibles.map((estado, i) => (
                <div
                  key={i}
                  onClick={() => setFiltroEstado(estado.valor)}
                  className={`cursor-pointer p-3 rounded-lg transition-all flex items-center justify-between
                    ${filtroEstado === estado.valor ? "ring-2 ring-offset-1 ring-gray-400" : "hover:shadow-md"} 
                    ${estado.color} ${estado.textColor}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-current"></div>
                    <span className="text-sm font-medium">{estado.label}</span>
                  </div>
                  <span className="text-lg font-bold">
                    {estado.valor === "Todos" ? boxesFiltradosPorPasillo.length : countByEstado(estado.valor)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/*médicos en línea*/}
          {!isFuture() && (
            <div
              onClick={() => navigate("/medicos")}
              className="cursor-pointer bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-gray-800 flex items-center gap-2">
                  <User size={18} />
                  Médicos en línea
                </h3>
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
              </div>
              <div className="text-3xl font-bold text-center text-gray-900 py-2">10</div>
              <div className="text-xs text-gray-800 text-center">Conectados a la ficha médica</div>
            </div>
          )}

        </div>
      </div>

      {/*tooltip al hacer hover en box*/}
      {boxHover && (
        <motion.div
          className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl max-w-xs"
          style={{ top: mousePos.y + 10, left: mousePos.x + 10 }}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
        >
          <div className="font-semibold mb-1">Box #{boxHover.idbox}</div>
          <div className="flex items-center gap-1 mb-1">
            <div className={`w-2 h-2 rounded-full ${getColor(boxHover.estadobox)}`}></div>
            Estado: {boxHover.estadobox}
          </div>
          <div>Pasillo: {boxHover.pasillobox}</div>
          <div className="mt-1 text-gray-300 text-xs">Haga clic para ver detalles</div>
        </motion.div>
      )}

      {/*footer:P*/}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#005C48] text-white text-center py-2 text-xs z-10">
        <div className="container mx-auto px-4 flex flex-col items-center sm:flex-row sm:justify-between">
          <span>Última actualización: {lastUpdated.toLocaleString('es-ES')}</span>
          <span className="hidden sm:block">Panel de Gestión de Boxes - Yggdrasil</span>
        </div>
      </footer>
    </div>
  );
}
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
import { buildApiUrl, buildWsUrl } from "../config/api";
import { useBoxesWebSocket } from "../hooks/useBoxesWebSocket";
import { useLocation } from 'react-router-dom';


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
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]); 

  // Función para manejar cambios de estado de box desde WebSocket
  const handleBoxStateChange = ({ boxId, nuevoEstado, evento, tipo }) => {
    if (tipo === 'agenda_cambio') {
      // Cambio en agenda - refrescar el estado del box afectado
      console.log(`[DEBUG] Agenda del box ${boxId} cambió: ${evento}`);
      // Para cambios de agenda, necesitamos recalcular el estado del box
      // basado en la fecha/hora actual
      if (enVivo) {
        // Solo si estamos en modo en vivo, refrescamos el estado
        const ahora = new Date();
        const fechaActual = ahora.toISOString().split("T")[0];
        const horaActual = ahora.toTimeString().slice(0, 5);
        handleFechaHoraChange(fechaActual, horaActual);
      }
    } else {
      // Cambio directo de estado del box (habilitado/inhabilitado)
      console.log(`[DEBUG] Actualizando estado del box ${boxId} a ${nuevoEstado}`);
      const boxIdNum = parseInt(boxId);
      
      // Función para actualizar de manera más robusta
      const updateBoxState = (prevBoxes) => {
        return prevBoxes.map(box => {
          if (box.idbox === boxIdNum) {
            console.log(`[DEBUG] Box ${boxIdNum} actualizado de ${box.estadobox} a ${nuevoEstado}`);
            return { ...box, estadobox: nuevoEstado };
          }
          return box;
        });
      };
      
      setBoxes(updateBoxState);
      setBoxesraw(updateBoxState);
    }
  };

  // WebSocket para cambios de estado de boxes
  useBoxesWebSocket(handleBoxStateChange);

  // WebSocket para actualización en tiempo real
  useEffect(() => {
    const ws_url = buildWsUrl("/ws/agendas/");
    const socket = new window.WebSocket(ws_url);

    socket.onopen = () => {
      console.log("WebSocket conectado (Boxes)");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.message === "actualizacion_agenda") {
          // Solo actualizar si estamos en modo "en vivo"
          if (enVivo) {
            console.log("Actualizando boxes por WebSocket (modo en vivo)");
            fetchBoxes();
          } else {
            console.log("WebSocket: actualización disponible, pero no en modo en vivo");
          }
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
  }, [enVivo]); // Agregar enVivo como dependencia

  const fetchBoxes = async () => {
    try {
      const response = await fetch(buildApiUrl("/api/boxes/"));  
      const data = await response.json();
      
      // Si ya tenemos boxes, actualizamos de manera inteligente para evitar parpadeos
      setBoxes(prevBoxes => {
        if (prevBoxes.length === 0) {
          // Primera carga, establecer directamente
          return data;
        }
        
        // Crear un mapa de los boxes existentes por ID para acceso rápido
        const existingBoxesMap = new Map(prevBoxes.map(box => [box.idbox, box]));
        
        // Actualizar boxes existentes y agregar nuevos, manteniendo el orden original
        const updatedBoxes = data.map(newBox => {
          const existingBox = existingBoxesMap.get(newBox.idbox);
          if (existingBox) {
            // Solo actualizar campos que pueden haber cambiado, manteniendo el estado actual
            return {
              ...existingBox,
              // Actualizar solo datos estructurales, NO el estado dinámico
              pasillobox: newBox.pasillobox,
              especialidad_principal: newBox.especialidad_principal,
              especialidades: newBox.especialidades,
              // Mantener el estadobox actual para evitar parpadeos
              estadobox: existingBox.estadobox,
              // Actualizar timestamps si han cambiado
              ult: newBox.ult,
              prox: newBox.prox
            };
          }
          // Box nuevo, agregarlo tal como viene
          return newBox;
        });
        
        return updatedBoxes;
      });
      
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
      const response = await fetch(buildApiUrl(`/api/estado_box/?idbox=${boxId}&fecha=${fecha}&hora=${hora}`));
      if (!response.ok) {
        // Si la respuesta no es OK, lanza un error para ser capturado por el catch
        throw new Error(`Error en la petición para el box ${boxId}: ${response.statusText}`);
      }
      const data = await response.json();
      return { boxId, estado: data.estado };
    } catch (error) {
      console.error(`Error al obtener el estado del box ${boxId}:`, error);
      // Retorna null o un objeto de error para que el lote pueda continuar
      return { boxId, estado: 'Error' }; 
    }
  };

  const handleFechaHoraChange = async (fecha, hora) => {
    const CHUNK_SIZE = 35; // Procesar de 35 en 35
    const DELAY = 20; // 20ms de espera entre lotes

    const newBoxesStates = {};

    for (let i = 0; i < boxes.length; i += CHUNK_SIZE) {
      const chunk = boxes.slice(i, i + CHUNK_SIZE);
      
      const promises = chunk.map(box => {
        if (box.estadobox === "Inhabilitado") {
          // Los inhabilitados no necesitan fetch, se resuelven localmente
          return Promise.resolve({ boxId: box.idbox, estado: "Inhabilitado" });
        }
        return fetchBoxState(box.idbox, fecha, hora);
      });

      const results = await Promise.all(promises);

      results.forEach(result => {
        if (result) {
          newBoxesStates[result.boxId] = result.estado;
        }
      });
      
      // Actualizar el estado de forma parcial y más suave
      setBoxes(prevBoxes =>
        prevBoxes.map(box => {
          const newState = newBoxesStates[box.idbox];
          if (newState && newState !== box.estadobox) {
            // Solo actualizar si el estado realmente ha cambiado
            return { ...box, estadobox: newState };
          }
          return box; // Mantener el box sin cambios si el estado es el mismo
        })
      );

      // Reducir el delay para hacer la actualización más fluida
      if (i + CHUNK_SIZE < boxes.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY));
      }
    }
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
        {/*filtros de estado*/}
        <div className="mb-4">
          {/* Para móviles */}
          <div className="block sm:hidden">
            <div className="flex flex-col gap-1.5">
              <div className="grid grid-cols-3 gap-1.5">
                {estadosDisponibles.filter((_, i) => i < 3).map((estado) => {
                  const count = estado.valor === "Todos" ? boxesFiltradosPorPasillo.length : countByEstado(estado.valor);
                  return (
                    <button
                      key={estado.valor}
                      onClick={() => setFiltroEstado(estado.valor)}
                      className={`px-2 py-1 rounded-md shadow-sm text-xs font-medium transition-all flex items-center justify-between
                        ${filtroEstado === estado.valor ? "ring-1 ring-offset-1 ring-gray-400 scale-[1.02]" : "opacity-95 hover:opacity-100"} 
                        ${estado.color} ${estado.textColor}`}
                    >
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-current opacity-80"></div>
                        <span className="truncate">{estado.label}</span>
                      </div>
                      <span className="font-bold ml-1">{count}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-center gap-1.5">
                {estadosDisponibles.filter((_, i) => i >= 3).map((estado) => {
                  const count = countByEstado(estado.valor);
                  return (
                    <button
                      key={estado.valor}
                      onClick={() => setFiltroEstado(estado.valor)}
                      className={`px-2 py-1 rounded-md shadow-sm text-xs font-medium transition-all flex items-center justify-between w-1/3 min-w-[100px]
                        ${filtroEstado === estado.valor ? "ring-1 ring-offset-1 ring-gray-400 scale-[1.02]" : "opacity-95 hover:opacity-100"} 
                        ${estado.color} ${estado.textColor}`}
                    >
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-current opacity-80"></div>
                        <span className="truncate">{estado.label}</span>
                      </div>
                      <span className="font-bold ml-1">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/*pantallas grandes*/}
          <div className="hidden sm:flex flex-wrap gap-2">
            {estadosDisponibles.map((estado) => (
              <button
                key={estado.valor}
                onClick={() => setFiltroEstado(estado.valor)}
                className={`px-3 py-1 rounded-md shadow-sm text-xs font-medium transition-all flex items-center gap-2
                  ${filtroEstado === estado.valor ? "ring-2 ring-offset-1 ring-gray-400 scale-105" : "opacity-90 hover:opacity-100"} 
                  ${estado.color} ${estado.textColor}`}
              >
                <div className="w-2 h-2 rounded-full bg-current opacity-70"></div>
                {estado.label} ({estado.valor === "Todos" ? boxesFiltradosPorPasillo.length : countByEstado(estado.valor)})
              </button>
            ))}
          </div>
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
                              onClick={() => {
                                    window.scrollTo(0, 0);
                                    navigate(`/boxes/${box.idbox}`);
                              }}
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
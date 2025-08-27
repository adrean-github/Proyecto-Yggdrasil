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
  import { useClickOutside } from "../hooks/useClickOutside";
  
  const pasillos = ["Traumatología - Gimnasio y curaciones", "Medicina", "Pedriatría", "Salud mental",
    "Broncopulmonar - Cardiología", "Otorrinolaringología",
    "Cirugías - Urología - Gastroenterología", "Ginecología - Obstetricia",
    "Cuidados paliativos - Neurología - Oftalmología", "Gimnasio cardiovascular - Nutrición",
    "Dermatología - UNACESS", "Hematología - Infectología - Misceláneo"];
  
    const estadosDisponibles = [
      { label: "Todos", valor: "Todos", color: "bg-blue-900", textColor: "text-white" },
      { label: "Tope", valor: "Tope", color: "bg-[#8B0000]", textColor: "text-white" },
      { label: "Disponible", valor: "Disponible", color: "bg-gray-300", borderColor: "border-gray-500", textColor: "text-gray-800"},
      { label: "Ocupado", valor: "Ocupado", color: "bg-[#2E8B57]", textColor: "text-white" },
      { label: "Inhabilitado", valor: "Inhabilitado", color: "bg-[#FFC245]", textColor: "text-black" },
    ];
    
    const getColorClasses = (estado) => {
      switch (estado) {
        case "Ocupado":
          return { 
            bg: "bg-[#2E8B57]",              
            hover: "hover:bg-[#246b46]",    
            text: "text-white", 
            border: "border-[#3a9c6d]"      
          };
        case "Disponible":
          return { 
            bg: "bg-gray-300",          
            hover: "hover:bg-gray-400",    
            text: "text-gray-800", 
            border: "border-gray-400"       
          };
        case "Inhabilitado":
          return { 
            bg: "bg-[#FFC245]",             
            hover: "hover:bg-[#e0a52d]", 
            text: "text-black", 
            border: "border-[#f0ad1f]"       
          };
        case "Tope":
          return { 
            bg: "bg-[#8B0000]",              
            hover: "hover:bg-[#600000]",     
            text: "text-white", 
            border: "border-[#750000]"     
          };
        default:
          return { 
            bg: "bg-gray-200", 
            hover: "hover:bg-gray-300", 
            text: "text-gray-700", 
            border: "border-gray-300" 
          };
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
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    
    // Referencia para detectar clics fuera del panel de filtros
    const filtersRef = useRef(null);
    useClickOutside(filtersRef, () => {
      if (showFilters) setShowFilters(false);
    });
  
    useEffect(() => {
      window.scrollTo(0, 0);
    }, [location.pathname]); 
  
    // Función para manejar cambios de estado de box desde WebSocket
    const handleBoxStateChange = ({ boxId, nuevoEstado, evento, tipo }) => {
      if (tipo === 'agenda_cambio') {
        console.log(`[DEBUG] Agenda del box ${boxId} cambió: ${evento}`);
        if (enVivo) {
          const ahora = new Date();
          const fechaActual = ahora.toISOString().split("T")[0];
          const horaActual = ahora.toTimeString().slice(0, 5);
          handleFechaHoraChange(fechaActual, horaActual);
        }
      } else {
        console.log(`[DEBUG] Actualizando estado del box ${boxId} a ${nuevoEstado}`);
        const boxIdNum = parseInt(boxId);
        
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
    }, [enVivo]);
  
    const fetchBoxes = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(buildApiUrl("/api/boxes/"));  
        const data = await response.json();
        
        setBoxes(prevBoxes => {
          if (prevBoxes.length === 0) {
            return data;
          }
          
          const existingBoxesMap = new Map(prevBoxes.map(box => [box.idbox, box]));
          
          const updatedBoxes = data.map(newBox => {
            const existingBox = existingBoxesMap.get(newBox.idbox);
            if (existingBox) {
              return {
                ...existingBox,
                pasillobox: newBox.pasillobox,
                especialidad_principal: newBox.especialidad_principal,
                especialidades: newBox.especialidades,
                estadobox: existingBox.estadobox,
                ult: newBox.ult,
                prox: newBox.prox
              };
            }
            return newBox;
          });
          
          return updatedBoxes;
        });
        
        setBoxesraw(data);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Error al obtener los boxes:", error);
      } finally {
        setIsLoading(false);
      }
    };
  
    useEffect(() => {
      fetchBoxes();
    }, []);
  
    const fetchBoxState = async (boxId, fecha, hora) => {
      try {
        const response = await fetch(buildApiUrl(`/api/estado_box/?idbox=${boxId}&fecha=${fecha}&hora=${hora}`));
        if (!response.ok) {
          throw new Error(`Error en la petición para el box ${boxId}: ${response.statusText}`);
        }
        const data = await response.json();
        return { boxId, estado: data.estado };
      } catch (error) {
        console.error(`Error al obtener el estado del box ${boxId}:`, error);
        return { boxId, estado: 'Error' };
      }
    };
  
    const handleFechaHoraChange = async (fecha, hora) => {
      const CHUNK_SIZE = 35;
      const DELAY = 20;
  
      const newBoxesStates = {};
  
      for (let i = 0; i < boxes.length; i += CHUNK_SIZE) {
        const chunk = boxes.slice(i, i + CHUNK_SIZE);
        
        const promises = chunk.map(box => {
          if (box.estadobox === "Inhabilitado") {
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
        
        setBoxes(prevBoxes =>
          prevBoxes.map(box => {
            const newState = newBoxesStates[box.idbox];
            if (newState && newState !== box.estadobox) {
              return { ...box, estadobox: newState };
            }
            return box;
          })
        );
  
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
      }, 200);
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
      <div className="min-h-screen p-4 pb-20 bg-gray-50">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Panel de Boxes</h1>
              <p className="text-gray-600 text-sm mt-1">
                {enVivo ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    Modo en vivo activo
                  </span>
                ) : `Consultando: ${formatDateTime(filtroFecha, filtroHora)}`}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={fetchBoxes}
                disabled={isLoading}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${isLoading 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                {isLoading ? 'Actualizando...' : 'Actualizar'}
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
  
          {/* Filtros expandibles */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-4"
                ref={filtersRef}
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
          {/* Panel principal de boxes */}
          <div className="flex-1">
            {/* Filtros de estado - Versión móvil */}
            <div className="mb-4 bg-white p-3 rounded-xl shadow-sm border border-gray-200">
              <div className="block sm:hidden">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Filtrar por estado:</h3>
                <div className="flex flex-col gap-1.5">
                  <div className="grid grid-cols-3 gap-1.5">
                    {estadosDisponibles.filter((_, i) => i < 3).map((estado) => {
                      const count = estado.valor === "Todos" ? boxesFiltradosPorPasillo.length : countByEstado(estado.valor);
                      return (
                        <button
                          key={estado.valor}
                          onClick={() => setFiltroEstado(estado.valor)}
                          className={`px-2 py-1.5 rounded-md shadow-sm text-xs font-medium transition-all flex items-center justify-between
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
                          className={`px-2 py-1.5 rounded-md shadow-sm text-xs font-medium transition-all flex items-center justify-between w-1/3 min-w-[100px]
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
              
              {/* Pantallas grandes - Filtros en línea con el texto */}
              <div className="hidden sm:block">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Filtrar por estado:</h3>
                  <div className="text-xs text-gray-500">
                    Mostrando {boxesFiltrados.length} de {boxes.length} boxes
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {estadosDisponibles.map((estado) => {
                    const count = estado.valor === "Todos" ? boxesFiltradosPorPasillo.length : countByEstado(estado.valor);
                    const isActive = filtroEstado === estado.valor;
                    
                    return (
                      <button
                        key={estado.valor}
                        onClick={() => setFiltroEstado(estado.valor)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1
                          ${isActive 
                            ? `${estado.color} ${estado.textColor} ring-1 ring-offset-1 ring-gray-400` 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        <div className="w-2 h-2 rounded-full bg-current opacity-80"></div>
                        <span>{estado.label}</span>
                        <span className="font-bold">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Lista de boxes */}
            <div className="overflow-y-auto max-h-[calc(100vh-220px)] pr-2 border-b border-gray-200 shadow-sm">
            <AnimatePresence mode="wait">
                {agruparEnDúos(pasillosMostrar).map((grupo, idx) => (
                  <motion.div
                    key={`${filtroPasillo}-${filtroEstado}-${idx}`}
                    className="flex flex-col md:flex-row gap-4 mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {grupo.map((pasillo, pasilloIdx) => {
                      const boxesPorGrupo = boxesFiltrados.filter((b) => b.pasillobox === pasillo);
                      const centrar = grupo.length === 1 && pasilloIdx === 0 ? "mx-auto" : "";
                      
                      return (
                        <div key={pasillo} className={`bg-white rounded-xl p-4 shadow-sm border border-gray-200 w-full flex flex-col ${centrar}`}>
                          <h2 className="text-md font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200 flex items-center justify-between">
                            <span>{pasillo}</span>
                            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {boxesPorGrupo.length} boxes
                            </span>
                          </h2>
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10 gap-2 justify-center items-center justify-items-center">
                            {boxesPorGrupo.map((box) => {
                              const colorClasses = getColorClasses(box.estadobox);
                              
                              return (
                                <motion.div
                                  key={box.idbox}
                                  className={`w-10 h-10 rounded-lg ${colorClasses.bg} flex items-center justify-center text-sm font-bold ${colorClasses.text} cursor-pointer relative group border ${colorClasses.border}`}
                                  onMouseEnter={(e) => handleMouseEnter(box, e)}
                                  onMouseMove={handleMouseMove}
                                  onMouseLeave={handleMouseLeave}
                                  onClick={() => {
                                    window.scrollTo(0, 0);
                                    navigate(`/boxes/${box.idbox}`);
                                  }}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  {box.idbox}
                                  <div className="absolute inset-0 rounded-lg border-2 border-white border-opacity-0 group-hover:border-opacity-100 transition-all"></div>
                                </motion.div>
                              );
                            })}
                            
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
  
          {/* Panel lateral derecho - Estadísticas */}
          <div className="w-full lg:w-80 flex flex-col gap-4">
            {/* Tarjeta de resumen */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Info size={18} />
                Resumen de estados
              </h3>
              
              <div className="space-y-3">
                {estadosDisponibles.map((estado, i) => {
                  const count = estado.valor === "Todos" ? boxesFiltradosPorPasillo.length : countByEstado(estado.valor);
                  const isActive = filtroEstado === estado.valor;
                  
                  return (
                    <div
                      key={i}
                      onClick={() => setFiltroEstado(estado.valor)}
                      className={`cursor-pointer p-3 rounded-lg transition-all flex items-center justify-between
                        ${isActive ? "ring-2 ring-offset-1 ring-gray-400 scale-[1.02]" : "hover:shadow-md"} 
                        ${estado.color} ${estado.textColor}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-current opacity-80"></div>
                        <span className="text-sm font-medium">{estado.label}</span>
                      </div>
                      <span className="text-lg font-bold">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
  
            {/* Médicos en línea */}
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
                <div className="text-xs text-gray-600 text-center">Conectados a la ficha médica</div>
              </div>
            )}
  
            {/* Última actualización */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Última actualización</h3>
              <div className="text-lg font-mono text-gray-900">
                {lastUpdated.toLocaleTimeString('es-ES')}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {lastUpdated.toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </div>
  
        {/* Tooltip al hacer hover en box */}
        {boxHover && (
          <motion.div
            className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl max-w-xs pointer-events-none"
            style={{ 
              top: mousePos.y + 15, 
              left: Math.min(mousePos.x + 10, window.innerWidth - 250) 
            }}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
          >
            <div className="font-semibold mb-1 flex items-center gap-2">
              <span>Box #{boxHover.idbox}</span>
              <div className={`w-2 h-2 rounded-full ${getColorClasses(boxHover.estadobox).bg}`}></div>
            </div>
            <div className="mb-1">Estado: {boxHover.estadobox}</div>
            <div className="mb-1">Pasillo: {boxHover.pasillobox}</div>
            {boxHover.especialidad_principal && (
              <div className="mt-1 text-gray-300 text-xs">Especialidad: {boxHover.especialidad_principal}</div>
            )}
            <div className="mt-2 text-gray-300 text-xs">Haga clic para ver detalles</div>
          </motion.div>
        )}
  
        {/* Footer */}
        <footer className="fixed bottom-0 left-0 right-0 bg-[#005C48] text-white text-center py-2 text-xs z-10">
          <div className="container mx-auto px-4 flex flex-col items-center sm:flex-row sm:justify-between">
            <span>Hospital Padre Hurtado - Sistema de Gestión de Boxes</span>
            <span>Yggdrasil © {new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>
    );
  }
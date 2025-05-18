import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const pasillos = ["Área A", "Área B", "Área C", "Área D", "Área E", "Área F", "Área G", "Área H", "Área I", "Área J", "Área K", "Área L"];
const estados = ["ocupado", "disponible", "inhabilitado"];
const especialidades = ["Pediatría", "Traumatología", "Dermatología", "Medicina General", "Cardiología"];
const motivosInhabilitacion = [
  "Reparaciones en curso",
  "Limpieza profunda",
  "Falta de personal",
  "Equipamiento dañado",
  "Revisión técnica programada"
];



const getColor = (estado) => {
  switch (estado) {
    case "Ocupado":
      return "bg-[#6EDFB5]";
    case "Disponible":
      return "bg-gray-300";
    case "Inhabilitado":
      return "bg-[#FFD36E]";
    case 'Tope':
      return "bg-[#FF4C4C]"
    default:
      return "bg-gray-200";
  }
};

const getEstadoColor = (estado) => {
  switch (estado) {
    case "Ocupado":
      return "text-[#6EDFB5]";
    case "Disponible":
      return "text-gray-500";
    case "Inhabilitado":
      return "text-[#FFD36E]";
    case 'Tope':
      return "text-[#FFD36E]"
    default:
      return "text-gray-400";
  }
};

const estadosDisponibles = [
  { label: "Todos", valor: "Todos", color: "bg-[#DB1866]" },
  { label: "Tope", valor: "Tope", color: "bg-[#FF4C4C]" },
  { label: "Disponible", valor: "Disponible", color: "bg-gray-300" },
  { label: "Ocupado", valor: "Ocupado", color: "bg-[#6EDFB5]" },
  { label: "Inhabilitado", valor: "Inhabilitado", color: "bg-[#FFD36E]" },
];

const agruparEnDúos = (arr) => {
  const res = [];
  for (let i = 0; i < arr.length; i += 2) {
    res.push(arr.slice(i, i + 2));
  }
  return res;
};



export default function Dashboard() {
  const [filtroPasillo, setFiltroPasillo] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split("T")[0]);
  const [filtroHora, setFiltroHora] = useState(new Date().toTimeString().slice(0, 5));

  const [boxHover, setBoxHover] = useState(null);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [boxes, setBoxes] = useState([]);
  const [boxesraw, setBoxesraw] = useState([]);

  const navigate = useNavigate();

  const fetchBoxes = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/boxes/");  
      const data = await response.json();
      setBoxes(data);
      setBoxesraw(data);
    } catch (error) {
      console.error("Error al obtener los boxes:", error);
    }
  };

  useEffect(() => {
    fetchBoxes();
  }, []);


  const fetchActualizacion = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/verificar_actualizacion", {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      const data = await response.json();
      return data.actualizado;
    } catch (error) {
      console.error("Error al verificar actualizaciones:", error);
      return false;
    }
  };

  useEffect(() => {
    const intervalId = setInterval(async () => {
      const hayActualizacion = await fetchActualizacion();
      const ahora = new Date();
      setFiltroFecha(ahora.toISOString().split("T")[0]);
      setFiltroHora(ahora.toTimeString().slice(0, 5));
      if (hayActualizacion) {
        console.log("Hay actualizaciones, actualizando boxes...");
        const nuevosBoxes = await fetchBoxes();
        if (nuevosBoxes) {
          setBoxes(nuevosBoxes);
        }
      } else {
        console.log("No hay actualizaciones.");
      }
    }, 3000); // Cada 3 segundos

    return () => clearInterval(intervalId);
  }, [filtroFecha, filtroHora]);

  const fetchBoxStateInhabilitado = async (boxId, fecha, hora) => {
    try {
      console.log(`Estado actualizado del box ${boxId}:`, data);
  
      setBoxes((prevBoxes) =>
        prevBoxes.map((box) =>
          box.idbox === boxId ? { ...box, estadobox: data.estado } : box
        )
      );
    } catch (error) {
      console.error("Error al obtener el estado del box:", error);
    }
  }; 

  const fetchBoxState = async (boxId, fecha, hora) => {
    try {
      const response = await fetch(`http://localhost:8000/api/estado_box/?idbox=${boxId}&fecha=${fecha}&hora=${hora}`);
      const data = await response.json();
      console.log(`Estado actualizado del box ${boxId}:`, data);
  
      setBoxes((prevBoxes) =>
        prevBoxes.map((box) =>
          box.idbox === boxId ? { ...box, estadobox: data.estado } : box
        )
      );
    } catch (error) {
      console.error("Error al obtener el estado del box:", error);
    }
  }; 
  

  const handleFechaHoraChange = (fecha, hora) => {
    boxes.forEach((box) => {
      if (box.estadobox == "Inhabilitado"){
        fetchBoxStateInhabilitado(box.idbox, fecha, hora);
  
      }else{
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
    }, 500);
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
    setFiltroFecha(ahora.toISOString().split("T")[0]);
    setFiltroHora(ahora.toTimeString().slice(0, 5));
  };
  
  const isFuture = () => {
    const now = new Date();
    const filtroCompleto = new Date(`${filtroFecha}T${filtroHora}`);
    return filtroCompleto > now;
  };

  const boxesFiltrados = boxes.filter((b) => {
    const coincidePasillo = filtroPasillo === "Todos" || b.pasillobox === filtroPasillo;
    const coincideEstado = filtroEstado === "Todos" || b.estadobox === filtroEstado;
    //const esFuturo = isFuture();
    //const visibleEnFuturo = esFuturo ? b.estadobox !== "Ocupado" : true;
    return coincidePasillo && coincideEstado; //&& visibleEnFuturo;
  });

  const boxesFiltradosPorPasillo = boxes.filter((b) => {
    const esFuturo = isFuture();
    return (filtroPasillo === "Todos" || b.pasillobox === filtroPasillo); //&& (esFuturo ? b.estadobox !== "Ocupado" : true);
  });

  const countByEstado = (estado) => boxesFiltradosPorPasillo.filter((b) => b.estadobox === estado).length;
  const lastUpdated = new Date().toLocaleString();
  const pasillosMostrar = filtroPasillo === "Todos" ? pasillos : [filtroPasillo];

  return (
    <div className="p-2">
      <div className="fixed bottom-0 left-0 w-full bg-[#4fa986] text-center border-t border-white py-2 z-10 text-m text-white shadow-sm">
        Última actualización: {lastUpdated}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-4 px-2 mb-2">
            <div className="flex items-center gap-2 text-sm">
              <label className="font-medium">Ver pasillo:</label>
              <select className="border rounded px-2 py-1 text-sm" value={filtroPasillo} onChange={(e) => setFiltroPasillo(e.target.value)}>
                <option value="Todos">Todos los pasillos</option>
                {pasillos.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <label>Fecha:</label>
              <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} className="border rounded px-2 py-1 text-sm" />
              <label>Hora:</label>
              <input type="time" value={filtroHora} onChange={(e) => setFiltroHora(e.target.value)} className="border rounded px-2 py-1 text-sm" />
              <button
              onClick={volverAVivo}
              className="bg-[#4fa986] text-white px-3 py-1 rounded hover:bg-[#3e8d72] transition text-xs font-semibold"
              title="Volver al estado en vivo"
            >
              Ver en vivo
            </button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs items-center">
              {estadosDisponibles.map((estado) => (
                <button
                  key={estado.valor}
                  onClick={() => setFiltroEstado(estado.valor)}
                  className={`px-3 py-1 rounded shadow text-white font-semibold 
                    ${estado.color} 
                    ${filtroEstado === estado.valor ? "ring-2 ring-offset-1 ring-black" : ""}`}
                >
                  {estado.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
            <AnimatePresence mode="sync">
              {agruparEnDúos(pasillosMostrar).map((grupo, idx) => (
                <motion.div
                  key={filtroPasillo + "-" + filtroEstado + "-" + idx}
                  className="flex gap-4 justify-between mb-4"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.2 }}
                >
                  {grupo.map((pasillo, pasilloIdx) => {
                    const boxesPorGrupo = boxesFiltrados.filter((b) => b.pasillobox === pasillo);
                    const centrar = grupo.length === 1 && pasilloIdx === 0 ? "mx-auto" : "";
                    return (
                      <div key={pasillo} className={`bg-white rounded-2xl p-4 shadow-md border w-full flex flex-col min-h-[220px] max-w-full justify-center ${centrar}`}>
                        <h2 className="text-sm font-semibold text-gray-700 mb-2 text-center">{pasillo}</h2>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-x-3 sm:gap-y-2 justify-center items-center justify-items-center">
                          {boxesPorGrupo.map((box) => (
                            <motion.div
                            key={box.idbox}
                            className={`w-9 h-9 md:w-10 md:h-10 rounded-lg ${getColor(box.estadobox)} flex items-center justify-center text-[11px] md:text-sm font-bold text-white leading-none`}
                            onMouseEnter={(e) => handleMouseEnter(box, e)}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            onClick={() => navigate(`/box/${box.idbox}`)}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.05, duration: 0.2 }}
                          >
                            {box.idbox}
                          </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="w-full md:w-80 flex flex-col justify-stretch gap-3">
          {[{ estado: "Todos", color: "bg-[#DB1866]", texto: "Ver todos los boxes", textoColor: "text-white" },
            { estado: "Tope", color: "bg-[#FF4C4C]", texto: "Boxes con topes", textoColor: "text-white" },
            { estado: "Disponible", color: "bg-gray-300", texto: "Boxes disponibles", textoColor: "text-gray-800" },
            { estado: "Ocupado", color: "bg-[#6EDFB5]", texto: "Boxes ocupados", textoColor: "text-white" },
            { estado: "Inhabilitado", color: "bg-[#FFD36E]", texto: "Boxes inhabilitados", textoColor: "text-white" }
          ].map((card, i) => (
            <div
              key={i}
              onClick={() => setFiltroEstado(card.estado)}
              className={`cursor-pointer ${card.color} ${card.textoColor} py-5 px-4 rounded-xl shadow-md hover:shadow-lg transition duration-300 flex flex-col justify-center items-center flex-1 text-center border border-white
                ${filtroEstado === card.estado ? "ring-2 ring-offset-1 ring-black" : ""}`}
            >
              <div className="text-4xl font-bold">
                {card.estado === "Todos" ? boxesFiltradosPorPasillo.length : countByEstado(card.estado)}
              </div>
              <div className="text-md mt-1">{card.texto}</div>
            </div>
          ))}

          {!isFuture() && (
            <div
              onClick={() => navigate("/medicos")}
              className="cursor-pointer bg-sky-100 text-blue-700 py-5 px-4 rounded-xl shadow-md hover:shadow-lg transition duration-300 flex flex-col justify-center items-center flex-1 text-center border border-blue-400"
            >
              <div className="text-4xl font-bold">{10}</div>
              <div className="text-md mt-1">Médicos en línea</div>
            </div>
          )}
        </div>
      </div>

      {boxHover && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-800 w-60"
          style={{ top: mousePos.y + 15, left: mousePos.x + 15 }}
        >
          <div className="font-semibold text-gray-900 mb-1">Box #{boxHover.idbox}</div>
          <div className="mb-1">
            <span className="font-medium">Estado:</span>{" "}
            <span className={`font-semibold`}>{boxHover.estadobox}</span>
          </div>
          <div className="mb-1">
            <span className="font-medium">Pasillo:</span> {boxHover.pasillobox}
          </div>
          <div className="text-xs text-gray-500 mt-2">Última cita: hace 20 mins</div>
        </div>
      )}
    </div>
  );
}
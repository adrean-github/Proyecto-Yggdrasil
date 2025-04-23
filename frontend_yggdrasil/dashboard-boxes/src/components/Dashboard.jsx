import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const pasillos = ["Área A", "Área B", "Área C", "Área D", "Área E", "Área F", "Área G", "Área H", "Área I", "Área J", "Área K", "Área L"];
const boxesPorPasillo = 15;

const estados = ["ocupado", "ocupado", "ocupado", "ocupado", "disponible", "disponible", "disponible", "disponible", "disponible", "inhabilitado", "inhabilitado"];
const especialidades = ["Pediatría", "Traumatología", "Dermatología", "Medicina General", "Cardiología"];
const motivosInhabilitacion = [
  "Reparaciones en curso",
  "Limpieza profunda",
  "Falta de personal",
  "Equipamiento dañado",
  "Revisión técnica programada"
];

const boxes = Array.from({ length: 180 }, (_, i) => {
  const estado = estados[Math.floor(Math.random() * estados.length)];
  const numEspecialidades = Math.floor(Math.random() * 3) + 1;
  const especialidadesAsignadas = Array.from({ length: numEspecialidades }, () =>
    especialidades[Math.floor(Math.random() * especialidades.length)]
  );
  const pasillo = pasillos[Math.floor(i / boxesPorPasillo)];
  const motivo = estado === "inhabilitado" ? motivosInhabilitacion[Math.floor(Math.random() * motivosInhabilitacion.length)] : null;
  return {
    id: i + 1,
    estado,
    pasillo,
    especialidades: [...new Set(especialidadesAsignadas)],
    motivoInhabilitacion: motivo,
  };
});


const getColor = (estado) => {
  switch (estado) {
    case "ocupado":
      return "bg-[#6EDFB5]";
    case "disponible":
      return "bg-gray-300";
    case "inhabilitado":
      return "bg-[#FFD36E]";
    default:
      return "bg-gray-200";
  }
};

const getEstadoColor = (estado) => {
  switch (estado) {
    case "ocupado":
      return "text-[#6EDFB5]";
    case "disponible":
      return "text-gray-500";
    case "inhabilitado":
      return "text-[#FFD36E]";
    default:
      return "text-gray-400";
  }
};

const estadosDisponibles = [
  { label: "Todos", valor: "Todos", color: "bg-[#DB1866]" },
  { label: "Disponible", valor: "disponible", color: "bg-gray-300" },
  { label: "Ocupado", valor: "ocupado", color: "bg-[#6EDFB5]" },
  { label: "Inhabilitado", valor: "inhabilitado", color: "bg-[#FFD36E]" },
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

  const navigate = useNavigate();

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
    const coincidePasillo = filtroPasillo === "Todos" || b.pasillo === filtroPasillo;
    const coincideEstado = filtroEstado === "Todos" || b.estado === filtroEstado;
    const esFuturo = isFuture();
    const visibleEnFuturo = esFuturo ? b.estado !== "ocupado" : true;
    return coincidePasillo && coincideEstado && visibleEnFuturo;
  });

  const boxesFiltradosPorPasillo = boxes.filter((b) => {
    const esFuturo = isFuture();
    return (filtroPasillo === "Todos" || b.pasillo === filtroPasillo) &&
           (esFuturo ? b.estado !== "ocupado" : true);
  });

  const countByEstado = (estado) => boxesFiltradosPorPasillo.filter((b) => b.estado === estado).length;
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
            <AnimatePresence mode="wait">
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
                    const boxesPorGrupo = boxesFiltrados.filter((b) => b.pasillo === pasillo);
                    const centrar = grupo.length === 1 && pasilloIdx === 0 ? "mx-auto" : "";
                    return (
                      <div key={pasillo} className={`bg-white rounded-2xl p-4 shadow-md border w-full flex flex-col min-h-[220px] max-w-full justify-center ${centrar}`}>
                        <h2 className="text-sm font-semibold text-gray-700 mb-2 text-center">{pasillo}</h2>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-x-3 sm:gap-y-2 justify-center items-center justify-items-center">
                          {boxesPorGrupo.map((box) => (
                            <motion.div
                              key={box.id}
                              className={`w-9 h-9 md:w-10 md:h-10 rounded-lg ${getColor(box.estado)} flex items-center justify-center text-[11px] md:text-sm font-bold text-white leading-none`}
                              onMouseEnter={(e) => handleMouseEnter(box, e)}
                              onMouseMove={handleMouseMove}
                              onMouseLeave={handleMouseLeave}
                              onClick={() => navigate(`/box/${box.id}`)}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 0.05, duration: 0.2 }}
                            >
                              {box.id}
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
            { estado: "disponible", color: "bg-gray-300", texto: "Boxes disponibles", textoColor: "text-gray-800" },
            { estado: "ocupado", color: "bg-[#6EDFB5]", texto: "Boxes ocupados", textoColor: "text-white" },
            { estado: "inhabilitado", color: "bg-[#FFD36E]", texto: "Boxes inhabilitados", textoColor: "text-white" }
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
          <div className="font-semibold text-gray-900 mb-1">Box #{boxHover.id}</div>
          <div className="mb-1">
            <span className="font-medium">Estado:</span>{" "}
            <span className={`font-semibold ${getEstadoColor(boxHover.estado)}`}>{boxHover.estado}</span>
          </div>
          <div className="mb-1">
            <span className="font-medium">Pasillo:</span> {boxHover.pasillo}
          </div>
          <div className="mb-1">
            <span className="font-medium">Uso para:</span>{" "}
            {boxHover.especialidades.join(", ")}
          </div>
          {boxHover.estado === "inhabilitado" && (
            <div className="mt-2 text-xs text-red-500">
              <strong>Motivo de inhabilitación:</strong> {boxHover.motivoInhabilitacion}
            </div>
          )}
          <div className="text-xs text-gray-500 mt-2">Última cita: hace 20 mins</div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
import Header from "./header";

const pasillos = ["Área A", "Área B", "Área C", "Área D", "Área E", "Área F", "Área G", "Área H", "Área I", "Área J"];
const boxesPorPasillo = 20;

const estados = [
  "ocupado", "ocupado", "ocupado", "ocupado",
  "disponible", "disponible", "disponible", "disponible", "disponible", 
  "inhabilitado", "inhabilitado"
];

const boxes = Array.from({ length: 180 }, (_, i) => {
  const estado = estados[Math.floor(Math.random() * estados.length)];
  const pasillo = pasillos[Math.floor(i / boxesPorPasillo)];
  return {
    id: i + 1,
    estado,
    pasillo,
  };
});

const getColor = (estado) => {
  switch (estado) {
    case "ocupado":
      return "bg-[#FBA297]";
    case "disponible":
      return "bg-[#79E5B6]";
    case "inhabilitado":
      return "bg-[#FFE181]";
    default:
      return "bg-gray-200";
  }
};

const estadosDisponibles = [
  { label: "Todos", valor: "Todos", color: "bg-gray-300" },
  { label: "Ocupado", valor: "ocupado", color: "bg-[#FBA297]" },
  { label: "Disponible", valor: "disponible", color: "bg-[#79E5B6]" },
  { label: "Inhabilitado", valor: "inhabilitado", color: "bg-[#FFE181]" },
];

// Agrupa en bloques de 2
const agruparEnDúos = (arr) => {
  const res = [];
  for (let i = 0; i < arr.length; i += 2) {
    res.push(arr.slice(i, i + 2));
  }
  return res;
};

export default function DashboardBoxes() {
  const [filtroPasillo, setFiltroPasillo] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  const boxesFiltrados = boxes.filter((b) => {
    const coincidePasillo = filtroPasillo === "Todos" || b.pasillo === filtroPasillo;
    const coincideEstado = filtroEstado === "Todos" || b.estado === filtroEstado;
    return coincidePasillo && coincideEstado;
  });

  const countByEstado = (estado) =>
    boxesFiltrados.filter((b) => b.estado === estado).length;

  const lastUpdated = new Date().toLocaleString();
  const pasillosMostrar = filtroPasillo === "Todos" ? pasillos : [filtroPasillo];

  return (
    <div className="min-h-screen bg-gray-100 relative pb-20">
      <Header />

      <div className="fixed bottom-0 left-0 w-full bg-[#4fa986] text-center border-t border-white py-2 z-10 text-m text-white shadow-sm">
        Última actualización: {lastUpdated}
      </div>

      <div className="p-2">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch">
          {/* Contenedor principal de la izquierda */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-4 px-2 mb-2">
              <div className="flex items-center gap-2 text-sm">
                <label className="font-medium">Ver pasillo:</label>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={filtroPasillo}
                  onChange={(e) => setFiltroPasillo(e.target.value)}
                >
                  <option value="Todos">Todos los pasillos</option>
                  {pasillos.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2 text-xs items-center">
                {estadosDisponibles.map((estado) => (
                  <button
                    key={estado.valor}
                    onClick={() => setFiltroEstado(estado.valor)}
                    className={`px-3 py-1 rounded shadow text-white font-semibold 
                      ${estado.color} 
                      ${filtroEstado === estado.valor ? "ring-2 ring-offset-1 ring-black" : ""}
                    `}
                  >
                    {estado.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grilla con scroll vertical y layout fijo */}
            <div className="overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
              {agruparEnDúos(pasillosMostrar).map((grupo, idx) => (
                <div key={idx} className="flex gap-4 justify-between mb-4">
                  {grupo.map((pasillo) => {
                    const boxesPorGrupo = boxesFiltrados.filter(
                      (b) => b.pasillo === pasillo
                    );
                    return (
                      <div
                        key={pasillo}
                        className="bg-white rounded p-2 shadow-sm border w-full flex flex-col min-h-[220px] max-w-full justify-center"
                      >
                        <h2 className="text-sm font-semibold text-gray-700 mb-1 text-center">
                          {pasillo}
                        </h2>
                        <div className="grid grid-cols-6 sm:grid-cols-8 xl:grid-cols-10 gap-x-1 gap-y-[0px] justify-center flex-grow items-center justify-items-center">
                          {boxesPorGrupo.map((box) => (
                            <div
                              key={box.id}
                              className={`w-9 h-9 md:w-10 md:h-10 rounded ${getColor(box.estado)} flex items-center justify-center text-[11px] md:text-sm font-bold text-white leading-none`}
                              >
                              {box.id}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {grupo.length < 2 &&
                    Array.from({ length: 2 - grupo.length }).map((_, i) => (
                      <div key={i} className="w-full invisible" />
                    ))}
                </div>
              ))}
            </div>
          </div>

          {/* Cards laterales */}
          <div className="w-full md:w-80 flex flex-col justify-stretch gap-2">
            <div className="bg-teal-500 text-white py-5 px-4 rounded shadow flex flex-col justify-center items-center flex-1 text-center">
              <div className="text-4xl font-bold">{countByEstado("disponible")}</div>
              <div className="text-md mt-1">Boxes disponibles</div>
            </div>
            <div className="bg-sky-500 text-white py-5 px-4 rounded shadow flex flex-col justify-center items-center flex-1 text-center">
              <div className="text-4xl font-bold">{countByEstado("ocupado")}</div>
              <div className="text-md mt-1">Boxes ocupados</div>
            </div>
            <div className="bg-blue-500 text-white py-5 px-4 rounded shadow flex flex-col justify-center items-center flex-1 text-center">
              <div className="text-4xl font-bold">{countByEstado("disponible")}</div>
              <div className="text-md mt-1">Boxes inhabilitados</div>
            </div>
            <div className="bg-[#EBDCF2] text-[#6C3483] py-5 px-4 rounded shadow flex flex-col justify-center items-center flex-1 text-center border border-[#B980C9]">
              <div className="text-4xl font-bold">{Math.floor(Math.random() * 20) + 5}</div>
              <div className="text-md mt-1">Médicos en línea</div>
            </div>
            <div className="bg-[#E4F5EE] text-[#2E7D64] py-5 px-4 rounded shadow flex flex-col justify-center items-center flex-1 text-center border border-[#5FB799]">
              <div className="text-4xl font-bold">0</div>
              <div className="text-md mt-1">Topes de horario</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

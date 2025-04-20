import React, { useState } from "react";
import Header from "./header";


const pasillos = ["Área A", "Área B", "Área C", "Área D", "Área E", "Área F", "Área G", "Área H", "Área I", "Área J"];
const boxesPorPasillo = 30;


const estados = [
  "ocupado", "ocupado", "ocupado", "ocupado",
  "disponible", "disponible", "disponible", "disponible", "disponible", 
  "inhabilitado", "inhabilitado", "inhabilitado",
  "no_apto_para_especialidad" 
];

const boxes = Array.from({ length: 280 }, (_, i) => {
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
    case "no_apto_para_especialidad":
      return "bg-purple-300";
    default:
      return "bg-gray-200";
  }
};

// Agrupa en bloques de 3
const agruparEnTernas = (arr) => {
  const res = [];
  for (let i = 0; i < arr.length; i += 3) {
    res.push(arr.slice(i, i + 3));
  }
  return res;
};

export default function DashboardBoxes() {
  const [filtroPasillo, setFiltroPasillo] = useState("Todos");

  const boxesFiltrados =
    filtroPasillo === "Todos"
      ? boxes
      : boxes.filter((b) => b.pasillo === filtroPasillo);

  const countByEstado = (estado) =>
    boxesFiltrados.filter((b) => b.estado === estado).length;

  const lastUpdated = new Date().toLocaleString();
  const pasillosMostrar = filtroPasillo === "Todos" ? pasillos : [filtroPasillo];

  return (
    <div className="min-h-screen bg-gray-100 relative pb-20">
      <Header />

      <div className="fixed bottom-0 left-0 w-full bg-white text-center border-t border-gray-300 py-2 z-10 text-sm text-gray-600 shadow-sm">
        Última actualización: {lastUpdated}
      </div>

      <div className="p-2">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch">
          {/* Contenedor principal de la izquierda */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-start gap-3 px-2 text-sm">
              <label className="font-medium">Ver:</label>
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

              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-400" />
                  Ocupado
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-400" />
                  Disponible
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-300" />
                  Inhabilitado
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-purple-300" />
                  No apto
                </div>
              </div>
            </div>

            {/* Grilla con scroll vertical y layout fijo */}
            <div className="overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
              {agruparEnTernas(pasillosMostrar).map((grupo, idx) => (
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
                        <div className="grid grid-cols-6 sm:grid-cols-8 xl:grid-cols-10 gap-1 justify-center flex-grow items-center">
                          {boxesPorGrupo.map((box) => (
                            <div
                              key={box.id}
                              className={`w-6 h-6 md:w-7 md:h-7 rounded ${getColor(
                                box.estado
                              )} flex items-center justify-center text-[9px] md:text-xs font-bold text-white shadow`}
                            >
                              {box.id}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {/* Relleno invisible si son menos de 3 */}
                  {grupo.length < 3 &&
                    Array.from({ length: 3 - grupo.length }).map((_, i) => (
                      <div key={i} className="w-full invisible" />
                    ))}
                </div>
              ))}
            </div>
          </div>

          {/* Cards laterales */}
          <div className="w-full md:w-80 flex flex-col justify-stretch gap-2">
          <div className="bg-[#E4F5EE] text-[#2E7D64] py-6 px-4 rounded shadow flex flex-col justify-center items-center flex-1 text-center border border-[#5FB799]">
              <div className="text-4xl font-bold">0</div>
              <div className="text-md mt-1">Topes de horario</div>
            </div>
            <div className="bg-teal-500 text-white py-6 px-4 rounded shadow flex flex-col justify-center items-center flex-1 text-center">
              <div className="text-4xl font-bold">{countByEstado("ocupado")}</div>
              <div className="text-md mt-1">Boxes ocupados</div>
            </div>
            <div className="bg-sky-500 text-white py-6 px-4 rounded shadow flex flex-col justify-center items-center flex-1 text-center">
              <div className="text-4xl font-bold">{countByEstado("disponible")}</div>
              <div className="text-md mt-1">Boxes disponibles</div>
            </div>
            <div className="bg-blue-500 text-white py-6 px-4 rounded shadow flex flex-col justify-center items-center flex-1 text-center">
              <div className="text-4xl font-bold">{Math.floor(Math.random() * 20) + 5}</div>
              <div className="text-md mt-1">Médicos en línea</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

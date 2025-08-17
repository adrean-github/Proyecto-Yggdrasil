import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const medicos = [
  { nombre: "Dra. Ana López", especialidad: "Cardiología" },
  { nombre: "Dr. Pedro Ruiz", especialidad: "Pediatría" },
  { nombre: "Dra. Carla Méndez", especialidad: "Dermatología" },
  { nombre: "Dr. Jorge Vidal", especialidad: "Medicina General" },
  { nombre: "Dra. Laura Espinoza", especialidad: "Neurología" },
  { nombre: "Dr. Miguel Soto", especialidad: "Traumatología" },
  { nombre: "Dr. Andrés Rojas", especialidad: "Ginecología" },
  { nombre: "Dra. Paulina Navarro", especialidad: "Medicina Interna" },
].map((m) => ({
  ...m,
  enCita: Math.random() < 0.5,
  minutosEnCita: Math.floor(Math.random() * 60)
}));

export default function MedicosOnline() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [especialidades, setEspecialidades] = useState([]);
  const [filtroEspecialidad, setFiltroEspecialidad] = useState("Todas");
  const [lastUpdated, setLastUpdated] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setLastUpdated(new Date().toLocaleString());

    //acá para extraer especialidades únicas
    const unicas = [...new Set(medicos.map((m) => m.especialidad))];
    setEspecialidades(unicas);
  }, []);

  const medicosFiltrados = medicos.filter((m) => {
    const coincideBusqueda =
      m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.especialidad.toLowerCase().includes(busqueda.toLowerCase());

    const coincideEstado =
      filtroEstado === "todos" || (filtroEstado === "enCita" ? m.enCita : !m.enCita);

    const coincideEspecialidad =
      filtroEspecialidad === "Todas" || m.especialidad === filtroEspecialidad;

    return coincideBusqueda && coincideEstado && coincideEspecialidad;
  });

  return (
    <div className="min-h-screen relative pb-20 px-4 md:px-8">

      {/*Título*/}
      <h1 className="text-4xl font-bold text-center mb-6 text-black">
        Médicos en Línea
      </h1>

      {/*buscador y filtros*/}
      <div className="flex flex-col md:flex-row items-center gap-4 justify-between mb-6">
        <div className="relative w-full md:w-1/2">
          <input
            type="text"
            placeholder="Buscar por nombre o especialidad..."
            className="w-full px-4 py-2 pr-10 rounded shadow border border-[#5FB799]  focus:outline-none focus:ring-2 focus:ring-[#5FB799]"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <Search className="absolute top-2.5 right-3 text-[#5FB799]" size={20} />
        </div>

        <select
          className="border px-3 py-2 rounded shadow text-sm focus:outline-none focus:ring-2 focus:ring-[#5FB799]"
          value={filtroEspecialidad}
          onChange={(e) => setFiltroEspecialidad(e.target.value)}
        >
          <option value="Todas">Todas las especialidades</option>
          {especialidades.map((esp) => (
            <option key={esp} value={esp}>{esp}</option>
          ))}
        </select>

        <select
          className="border px-3 py-2 rounded shadow text-sm focus:outline-none focus:ring-2 focus:ring-[#5FB799]"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        >
          <option value="todos">Todos</option>
          <option value="enCita">En cita</option>
          <option value="disponible">Disponibles</option>
        </select>
      </div>

      {/*lista de médicos*/}
      {medicosFiltrados.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {medicosFiltrados.map((medico, i) => (
            <motion.div
              key={i}
              className="bg-white p-4 rounded shadow border border-[#5FB799]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <h2 className="text-lg font-semibold text-[#5FB799]">
                {medico.nombre}
              </h2>
              <p className="text-sm text-gray-600 mb-2">
                {medico.especialidad}
              </p>
              {medico.enCita ? (
                <p className="text-sm text-red-500 font-medium">
                  En cita desde hace {medico.minutosEnCita} min
                </p>
              ) : (
                <p className="text-sm text-green-600 font-medium">Disponible</p>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 mt-10">
          No se encontraron médicos con ese criterio.
        </div>
      )}


      <div className="fixed bottom-0 left-0 w-full bg-[#4fa986] text-center border-t border-white py-2 z-10 text-m text-white shadow-sm">
        Última actualización: {lastUpdated}
      </div>
    </div>
  );
}

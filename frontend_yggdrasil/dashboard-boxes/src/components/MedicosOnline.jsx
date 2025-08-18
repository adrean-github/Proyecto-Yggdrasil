import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, ArrowLeft, Clock, User, Stethoscope, CheckCircle, XCircle } from "lucide-react";
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
  minutosEnCita: Math.floor(Math.random() * 60),
  foto: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`
}));

export default function MedicosOnline() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [especialidades, setEspecialidades] = useState([]);
  const [filtroEspecialidad, setFiltroEspecialidad] = useState("Todas");
  const [lastUpdated, setLastUpdated] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const updateTime = () => {
      setLastUpdated(new Date().toLocaleString());
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000); // Actualizar cada minuto

    // Extraer especialidades únicas
    const unicas = [...new Set(medicos.map((m) => m.especialidad))];
    setEspecialidades(unicas);

    return () => clearInterval(interval);
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
    <div className="min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
        <h1 className="text-center text-4xl font-bold mt-8 mb-3">Médicos en línea</h1>
        <p className="text-center text-gray-800">Visualiza los médicos en línea y su estado</p>
          <div className="mt-2 text-sm text-gray-600 flex items-center justify-center">
            <Clock className="w-4 h-4 mr-1" />
            Última actualización: {lastUpdated}
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white p-4 rounded-lg shadow mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Barra de búsqueda */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-800" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#005C48] focus:border-[#005C48] sm:text-sm"
                placeholder="Buscar médico o especialidad..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            {/* Filtro por especialidad */}
            <div>
              <label htmlFor="especialidad" className="sr-only">Especialidad</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Stethoscope className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="especialidad"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-[#005C48] focus:border-[#005C48] sm:text-sm"
                  value={filtroEspecialidad}
                  onChange={(e) => setFiltroEspecialidad(e.target.value)}
                >
                  <option value="Todas">Todas las especialidades</option>
                  {especialidades.map((esp) => (
                    <option key={esp} value={esp}>{esp}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filtro por estado */}
            <div>
              <label htmlFor="estado" className="sr-only">Estado</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="estado"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-[#005C48] focus:border-[#005C48] sm:text-sm"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <option value="todos">Todos los estados</option>
                  <option value="enCita">En consulta</option>
                  <option value="disponible">Disponibles</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              {medicosFiltrados.length} médico{medicosFiltrados.length !== 1 ? 's' : ''} encontrado{medicosFiltrados.length !== 1 ? 's' : ''}
            </h2>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          {medicosFiltrados.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {medicosFiltrados.map((medico, i) => (
                <motion.div
                  key={i}
                  className="bg-white overflow-hidden shadow rounded-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">{medico.nombre}</h3>
                        <p className="text-sm text-gray-500">{medico.especialidad}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      {medico.enCita ? (
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          <Clock className="w-4 h-4 mr-1" />
                          En consulta ({medico.minutosEnCita} min)
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Disponible
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="text-sm">
                      <button
                        className="text-[#005C48] hover:text-[#118154] font-medium"
                        onClick={() => console.log(`Contactar a ${medico.nombre}`)}
                      >
                        Contactar →
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <XCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No se encontraron médicos</h3>
              <p className="mt-1 text-sm text-gray-500">
                Intenta ajustar tus filtros de búsqueda
              </p>
              <div className="mt-6">
                <button
                  onClick={() => {
                    setBusqueda("");
                    setFiltroEstado("todos");
                    setFiltroEspecialidad("Todas");
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#005C48] hover:bg-[#118154] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005C48]"
                >
                  Reiniciar filtros
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
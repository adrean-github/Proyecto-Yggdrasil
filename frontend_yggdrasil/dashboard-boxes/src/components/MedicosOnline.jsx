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
    <div className="min-h-screen pb-16" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-center text-4xl font-bold mt-8 mb-3" style={{ color: 'var(--text-color)' }}>
            Médicos en línea
          </h1>
          <p className="text-center" style={{ color: 'var(--text-muted)' }}>
            Visualiza los médicos en línea y su estado
          </p>
          <div className="mt-2 text-sm flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
            <Clock className="w-4 h-4 mr-1" />
            Última actualización: {lastUpdated}
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="p-4 rounded-lg shadow mb-8" style={{ backgroundColor: 'var(--bg-color)' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Barra de búsqueda */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border rounded-md leading-5 placeholder-gray-500 focus:outline-none focus:ring-2 sm:text-sm"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-color)',
                  borderColor: 'var(--border-color)',
                  focusRingColor: 'var(--accent-color)',
                  focusBorderColor: 'var(--accent-color)'
                }}
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
                  <Stethoscope className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                </div>
                <select
                  id="especialidad"
                  className="block w-full pl-10 pr-3 py-2 border rounded-md leading-5 focus:outline-none focus:ring-2 sm:text-sm"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-color)',
                    borderColor: 'var(--border-color)',
                    focusRingColor: 'var(--accent-color)',
                    focusBorderColor: 'var(--accent-color)'
                  }}
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
                  <User className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                </div>
                <select
                  id="estado"
                  className="block w-full pl-10 pr-3 py-2 border rounded-md leading-5 focus:outline-none focus:ring-2 sm:text-sm"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-color)',
                    borderColor: 'var(--border-color)',
                    focusRingColor: 'var(--accent-color)',
                    focusBorderColor: 'var(--accent-color)'
                  }}
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
            <h2 className="text-lg font-medium" style={{ color: 'var(--text-color)' }}>
              {medicosFiltrados.length} médico{medicosFiltrados.length !== 1 ? 's' : ''} encontrado{medicosFiltrados.length !== 1 ? 's' : ''}
            </h2>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          {medicosFiltrados.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {medicosFiltrados.map((medico, i) => (
                <motion.div
                  key={i}
                  className="overflow-hidden shadow rounded-lg"
                  style={{ backgroundColor: 'var(--bg-color)' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <img
                          className="h-12 w-12 rounded-full"
                          src={medico.foto}
                          alt={medico.nombre}
                        />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg leading-6 font-medium" style={{ color: 'var(--text-color)' }}>
                          {medico.nombre}
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {medico.especialidad}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      {medico.enCita ? (
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                             style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)' }}>
                          <Clock className="w-4 h-4 mr-1" />
                          En consulta ({medico.minutosEnCita} min)
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                             style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success-text)' }}>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Disponible
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="px-4 py-4 border-t" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
                    <div className="text-sm">
                      <button
                        className="font-medium hover:opacity-75 transition-opacity"
                        style={{ color: 'var(--accent-color)' }}
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
            <div className="text-center py-12 rounded-lg shadow" style={{ backgroundColor: 'var(--bg-color)' }}>
              <XCircle className="mx-auto h-12 w-12" style={{ color: 'var(--text-muted)' }} />
              <h3 className="mt-2 text-lg font-medium" style={{ color: 'var(--text-color)' }}>
                No se encontraron médicos
              </h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                Intenta ajustar tus filtros de búsqueda
              </p>
              <div className="mt-6">
                <button
                  onClick={() => {
                    setBusqueda("");
                    setFiltroEstado("todos");
                    setFiltroEspecialidad("Todas");
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ 
                    backgroundColor: 'var(--accent-color)',
                    focusRingColor: 'var(--accent-color)'
                  }}
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
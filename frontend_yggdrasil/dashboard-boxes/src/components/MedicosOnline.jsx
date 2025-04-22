import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import Header from "../header";

const medicos = [
  { nombre: "Dra. Ana López", especialidad: "Cardiología" },
  { nombre: "Dr. Pedro Ruiz", especialidad: "Pediatría" },
  { nombre: "Dra. Carla Méndez", especialidad: "Dermatología" },
  { nombre: "Dr. Jorge Vidal", especialidad: "Medicina General" },
  { nombre: "Dra. Laura Espinoza", especialidad: "Neurología" },
  { nombre: "Dr. Miguel Soto", especialidad: "Traumatología" },
  { nombre: "Dr. Andrés Rojas", especialidad: "Ginecología" },
  { nombre: "Dra. Paulina Navarro", especialidad: "Medicina Interna" },
];

export default function MedicosOnline() {
  const [busqueda, setBusqueda] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    const now = new Date().toLocaleString();
    setLastUpdated(now);
  }, []);

  const medicosFiltrados = medicos.filter((m) =>
    m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    m.especialidad.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 relative pb-20">
      <Header />

      <div className="px-6 py-8">
        <h1 className="text-3xl font-bold text-center mb-6 text-[#5FB799]">
          Médicos en Línea
        </h1>

        <div className="max-w-md mx-auto mb-6 relative">
          <input
            type="text"
            placeholder="Buscar por nombre o especialidad..."
            className="w-full px-4 py-2 pr-10 rounded shadow border border-[#5FB799]  focus:outline-none focus:ring-2 focus:ring-[#5FB799] "
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <Search className="absolute top-2.5 right-3 text-[#5FB799] " size={20} />
        </div>

        {medicosFiltrados.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {medicosFiltrados.map((medico, i) => (
              <motion.div
                key={i}
                className="bg-white p-4 rounded shadow border border-[#5FB799] "
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <h2 className="text-lg font-semibold text-[#5FB799] ">
                  {medico.nombre}
                </h2>
                <p className="text-sm text-gray-600">{medico.especialidad}</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-10">
            No se encontraron médicos con ese criterio.
          </div>
        )}
      </div>

      {/* Última actualización */}
      <div className="fixed bottom-0 left-0 w-full bg-[#4fa986] text-center border-t border-white py-2 z-10 text-m text-white shadow-sm">
        Última actualización: {lastUpdated}
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, UserCheck, FileText } from "lucide-react";

export default function Agendas() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // Datos simulados para el dashboard
  const stats = [
    { label: "Reservas Hoy", value: 12, color: "bg-green-100", border: "border-green-400" },
    { label: "Boxes Disponibles", value: 3, color: "bg-blue-100", border: "border-blue-400" },
    { label: "Cancelaciones", value: 2, color: "bg-red-100", border: "border-red-400" },
  ];

  const handleSeleccion = (tipo) => {
    navigate(`/agendas/${tipo}`);
  };

  const agendaCards = [
    { tipo: "agendar-no-medica", title: "Agenda Médica", icon: <UserCheck size={24} />, available: 5, color: "bg-green-100", border: "border-green-400" },
    { tipo: "agendar-medica", title: "Agenda No Médica", icon: <FileText size={24} />, available: 3, color: "bg-yellow-100", border: "border-yellow-400" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-[#5FB799] mb-2"
      >
        Agendamiento General
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-gray-600 mb-6"
      >
        Selecciona el tipo de agenda que deseas reservar:
      </motion.p>

      {/* Dashboard */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-wrap gap-4 justify-center mb-6"
      >
        {stats.map((s, idx) => (
          <div
            key={idx}
            className={`flex flex-col items-center justify-center ${s.color} ${s.border} border rounded-lg p-4 w-40 shadow hover:shadow-lg transition`}
          >
            <div className="text-2xl font-bold text-[#5FB799]">{s.value}</div>
            <div className="text-sm text-gray-700">{s.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Buscador */}
      <motion.input
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        type="text"
        placeholder="Buscar por responsable..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-3 py-2 rounded border border-gray-300 focus:ring-1 focus:ring-[#5FB799] focus:border-[#5FB799] mb-6"
      />

      {/* Carrusel de Cards */}
      <motion.div
        className="flex gap-4 overflow-x-auto py-2 w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {agendaCards.map((card) => (
          <motion.div
            key={card.tipo}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex-shrink-0 cursor-pointer ${card.color} ${card.border} border rounded-lg p-6 w-60 shadow-lg flex flex-col items-center justify-between hover:shadow-2xl transition`}
            onClick={() => handleSeleccion(card.tipo)}
          >
            <div className="flex flex-col items-center gap-2">
              {card.icon}
              <div className="font-semibold text-lg text-gray-800">{card.title}</div>
              <div className="text-sm text-gray-600">Disponibles: {card.available}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Info adicional o futuras funcionalidades */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 text-center text-gray-500 max-w-lg"
      >
        Aquí podrás gestionar tus reservas de manera rápida y visual. En próximas versiones podrás ver un calendario con la disponibilidad de boxes y notificaciones de reservas pendientes.
      </motion.div>
    </div>
  );
}

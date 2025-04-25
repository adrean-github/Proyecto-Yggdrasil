import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function BoxDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(new Date());
  const [boxData, setBoxData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  
  


  useEffect(() => {

    setLastUpdated(new Date().toLocaleString());

    const fetchBoxData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/boxes/${id}/`);
        if (!response.ok) throw new Error("Error al obtener los datos del box");
        const data = await response.json();
        setBoxData(data);
      } catch (error) {
        console.error("Error al cargar datos del box:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBoxData();
  }, [id]);


  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#5FB799]">
        Cargando información del Box...
      </div>
    );
  }

  if (!boxData) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        No se pudo cargar la información del Box.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative pb-20 px-4 md:px-8">
      {/* Botón volver */}
      <div className="mt-6 mb-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-[#5FB799] font-semibold hover:underline"
        >
          <ArrowLeft size={20} />
          Volver al Dashboard
        </button>
      </div>


      {/* Título */}
      <h1 className="text-3xl font-bold text-center mb-8 text-[#5FB799]">
        Detalle del Box #{id}
      </h1>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información del box */}
        <motion.div
          className="bg-white border border-[#5FB799] rounded p-6 shadow space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-semibold text-[#5FB799] mb-4">Información General</h2>
          <p><strong>Estado actual:</strong> {boxData.estadobox}</p>
          <p><strong>Pasillo:</strong> {boxData.pasillobox}</p>
          <p><strong>Especialidad:</strong> Cardiología</p>
          <p><strong>También puede usarse para:</strong> {"(Otras especialidades)"}</p>
          <p><strong>Última agenda:</strong> {boxData.ult}</p>
          <p><strong>Próxima agenda:</strong> {boxData.prox}</p>
          <p><strong>Médico asignado:</strong> {boxData.med}</p>
        </motion.div>

        {/* Filtro de calendario */}
        <motion.div
          className="bg-white border border-[#5FB799] rounded p-6 shadow space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xl font-semibold text-[#5FB799] mb-4">Agenda del Box</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-600">Desde:</label>
              <DatePicker
                selected={fechaInicio}
                onChange={(date) => setFechaInicio(date)}
                className="w-full px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5FB799]"
                dateFormat="dd/MM/yyyy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Hasta:</label>
              <DatePicker
                selected={fechaFin}
                onChange={(date) => setFechaFin(date)}
                className="w-full px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5FB799]"
                dateFormat="dd/MM/yyyy"
              />
            </div>
            <button
              className="bg-[#5FB799] text-white py-2 px-4 rounded hover:bg-[#4fa986] transition duration-200 w-full"
              onClick={() => {
                console.log("Buscar agendas entre:", fechaInicio, "y", fechaFin);
              }}
            >
              Buscar Agendas
            </button>
          </div>

          <div className="border-t pt-4 text-center text-gray-500 text-sm">
            Aquí se mostrará el calendario de agendas.
          </div>
        </motion.div>
      </div>

      {/* Última actualización */}
      <div className="fixed bottom-0 left-0 w-full bg-[#4fa986] text-center border-t border-white py-2 z-10 text-m text-white shadow-sm">
        Última actualización: {lastUpdated}
      </div>
    </div>
  );
}

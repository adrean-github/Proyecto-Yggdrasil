import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';



export default function BoxDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(new Date());
  const [boxData, setBoxData] = useState(null);
  const [agendaboxData, setagendaBoxData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  
  


  useEffect(() => {

    setLastUpdated(new Date().toLocaleString());

    const fetchBoxData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/boxes/${id}/`);
        const agenda = await fetch(`http://localhost:8000/api/box/${id}/`);
        if (!response.ok) throw new Error("Error al obtener los datos del box");
        const data = await response.json();
        setBoxData(data);
        setagendaBoxData(agenda);
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
      {/*botón de  volver*/}
      <div className="mt-6 mb-4">
        <button
          onClick={() => navigate("/DashboardBoxes")}
          className="flex items-center gap-2 text-[#5FB799] font-semibold hover:underline"
        >
          <ArrowLeft size={20} />
          Volver al Dashboard
        </button>
      </div>




      {/*Contenido principal*/}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/*Información del box*/}
        <motion.div
          className="bg-white border border-[#5FB799] rounded p-6 shadow space-y-3 col-span-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-semibold text-[#5FB799] mb-4">Información General Box #{id}</h2>
          <p><strong>Estado actual:</strong> {boxData.estadobox}</p>
          <p><strong>Pasillo:</strong> {boxData.pasillobox}</p>
          <p><strong>Especialidad:</strong> {boxData.especialidad_principal || 'No definida'}</p>
          <p><strong>También puede usarse para:</strong> {boxData.especialidades.join(", ") || 'Ninguna'}</p>
          <p><strong>Última agenda:</strong> {boxData.ult}</p>
          <p><strong>Próxima agenda:</strong> {boxData.prox}</p>
          <p><strong>Médico asignado:</strong> {boxData.med}</p>
        </motion.div>

        {/*Filtro de calendario*/}
        <motion.div
          className="bg-white border border-[#5FB799] rounded p-6 shadow space-y-4 col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}>
          <div className="border-t">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "timeGridWeek,dayGridMonth"
              }}
              events={agendaboxData}
              locale={esLocale}
              buttonText={{
                today: 'Ver hoy',
                week: 'Semana',
                month: 'Mes'
              }}
              allDaySlot={false}
              slotMinTime="08:00:00"
              slotMaxTime="20:00:00" 
              editable={false}
              selectMirror={true}
              nowIndicator={true}
              eventTextColor="#000000"
              eventColor = '#cfe4ff'
              slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: 'short'
              }}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: 'short'
              }}
              contentHeight={300}
            />
          </div>
        </motion.div>
      </div>
              
      {/*va la leyenda de la parte de abajo de la ultima actualización*/}
      <div className="fixed bottom-0 left-0 w-full bg-[#4fa986] text-center border-t border-white py-2 z-10 text-m text-white shadow-sm">
        Última actualización: {lastUpdated}
      </div>
    </div>
  );
}

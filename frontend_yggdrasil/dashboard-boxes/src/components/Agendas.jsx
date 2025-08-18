import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import {
  CalendarDays,
  Puzzle,
  Stethoscope,
  Search,
  Download,
  Trash2,
  Edit2,
  AlertTriangle,
  Check,   
} from "lucide-react";
import { useNavigate } from 'react-router-dom';

export default function Agenda() {
  const pasillos = [
    "Traumatología - Gimnasio y curaciones",
    "Medicina",
    "Pediatría",
    "Salud mental",
    "Broncopulmonar - Cardiología",
    "Otorrinolaringología",
    "Cirugías - Urología - Gastroenterología",
    "Ginecología - Obstetricia",
    "Cuidados paliativos - Neurología - Oftalmología",
    "Gimnasio cardiovascular - Nutrición",
    "Dermatología - UNACESS",
    "Hematología - Infectología - Misceláneo",
  ];

  const [tipoAgendamiento, setTipoAgendamiento] = useState(null);
  const [vista, setVista] = useState("box");
  const [desde, setDesde] = useState(format(new Date(), "yyyy-MM-dd"));
  const [hasta, setHasta] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filtroId, setFiltroId] = useState("");
  const [filtroNombre, setFiltroNombre] = useState("");
  const [pasilloSeleccionado, setPasilloSeleccionado] = useState("");
  const [agendas, setAgendas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sugerencias, setSugerencias] = useState([]);
  const [modal, setModal] = useState({ tipo: null, data: null, mensaje: null });
  const [horasDisponibles, setHorasDisponibles] = useState({ inicio: [], fin: [] });
  const [sugerenciasMedico, setSugerenciasMedico] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [cargandoSugerencias, setCargandoSugerencias] = useState(false);
  const [errorSugerencias, setErrorSugerencias] = useState(null);
  const [boxesInhabilitados, setBoxesInhabilitados] = useState([]);
  const [filtroTopes, setFiltroTopes] = useState(false);
  const [filtroInhabilitados, setFiltroInhabilitados] = useState(false);
  const gestionRef = useRef(null);
  const navigate = useNavigate();

  // Cargar boxes inhabilitados al iniciar
  useEffect(() => {
    const fetchBoxesInhabilitados = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/boxes-inhabilitados/');
        if (res.ok) {
          const data = await res.json();
          setBoxesInhabilitados(data.map(box => box.idbox));
        }
      } catch (err) {
        console.error("Error fetching boxes inhabilitados:", err);
      }
    };
    
    fetchBoxesInhabilitados();
  }, []);

  // Autocomplete médico
  useEffect(() => {
    if (!filtroNombre.trim()) {
      setSugerencias([]);
      setErrorSugerencias(null);
      return;
    }

    if (vista !== "medico" || filtroNombre.length < 2) return;

    const fetchSugerencias = async () => {
      setCargandoSugerencias(true);
      setErrorSugerencias(null);
      
      try {
        const res = await fetch(
          `http://localhost:8000/api/medico/sugerencias/?nombre=${encodeURIComponent(
            filtroNombre
          )}`
        );
        
        if (!res.ok) throw new Error(res.statusText);
        
        const data = await res.json();
        setSugerencias(data);
      } catch (err) {
        console.error("Error fetching sugerencias:", err);
        setErrorSugerencias("No se pudieron cargar las sugerencias");
        setSugerencias([]);
      } finally {
        setCargandoSugerencias(false);
      }
    };

    const timeout = setTimeout(fetchSugerencias, 300);
    return () => clearTimeout(timeout);
  }, [filtroNombre, vista]);

  // Autocomplete para el modal de modificación
  useEffect(() => {
    if (!modal.data?.responsable || modal.data.responsable.length < 2) {
      setSugerenciasMedico([]);
      return;
    }

    const fetchSugerenciasModal = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/medico/sugerencias/?nombre=${encodeURIComponent(
            modal.data.responsable
          )}`
        );
        
        if (!res.ok) throw new Error(res.statusText);
        
        const data = await res.json();
        setSugerenciasMedico(data);
      } catch (err) {
        console.error("Error fetching sugerencias:", err);
        setSugerenciasMedico([]);
      }
    };

    const timeout = setTimeout(fetchSugerenciasModal, 300);
    return () => clearTimeout(timeout);
  }, [modal.data?.responsable]);

  const parseDateTime = (fecha, hora) => new Date(`${fecha}T${hora}:00`);

  const tieneConflicto = (agenda, todasLasAgendas) => {
    return todasLasAgendas.some(a => {
      if (a.id === agenda.id || a.box_id !== agenda.box_id || a.fecha !== agenda.fecha) {
        return false;
      }
      
      const startA = parseDateTime(agenda.fecha, agenda.hora_inicio);
      const endA = parseDateTime(agenda.fecha, agenda.hora_fin);
      const startB = parseDateTime(a.fecha, a.hora_inicio);
      const endB = parseDateTime(a.fecha, a.hora_fin);
      
      return startA < endB && startB < endA;
    });
  };

  // Obtener todos los topes en el rango de fechas
  const fetchTopes = async () => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/agendas-con-tope/?desde=${desde}&hasta=${hasta}`
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Error obteniendo topes:", err);
      return [];
    }
  };


// Para marcar topes y boxes inhabilitados
const marcarTopesYInhabilitados = async (agendasFiltradas) => {
  try {
    // Obtener todos los topes en el rango de fechas
    const resTopes = await fetch(
      `http://localhost:8000/api/agendas-con-tope/?desde=${desde}&hasta=${hasta}`
    );
    if (!resTopes.ok) throw new Error(await resTopes.text());
    const topes = await resTopes.json();

    // Crear un mapa de topes para búsqueda rápida
    const mapaTopes = {};
    topes.forEach(tope => {
      mapaTopes[tope.id] = tope.tope_con;
    });

    // Marcar las agendas con topes y boxes inhabilitados
    return agendasFiltradas.map(a => {
      const topeCon = mapaTopes[a.id] || false;
      const boxInhabilitado = boxesInhabilitados.includes(parseInt(a.box_id));
      
      return {
        ...a,
        tope: topeCon,
        boxInhabilitado
      };
    });
    
  } catch (err) {
    console.error("Error marcando topes y boxes inhabilitados:", err);
    return agendasFiltradas;
  }
};


  const validarModificacion = async (nuevaAgenda, agendas) => {
    if (!nuevaAgenda.hora_inicio || !nuevaAgenda.hora_fin) {
      return { valido: false, mensaje: "Debe completar horas de inicio y fin" };
    }
    
    const start = parseDateTime(nuevaAgenda.fecha, nuevaAgenda.hora_inicio);
    const end = parseDateTime(nuevaAgenda.fecha, nuevaAgenda.hora_fin);
    
    if (start >= end) {
      return { valido: false, mensaje: "La hora fin debe ser posterior a la hora inicio" };
    }
    
    // Verificar que el horario seleccionado esté dentro de los bloques libres
    const bloquesLibres = await generarHorasLibres(
      nuevaAgenda.fecha, 
      nuevaAgenda.box_id
    );
    
    const horarioValido = bloquesLibres.some(bloque => {
      const bloqueInicio = parseDateTime(nuevaAgenda.fecha, bloque.inicio);
      const bloqueFin = parseDateTime(nuevaAgenda.fecha, bloque.fin);
      return start >= bloqueInicio && end <= bloqueFin;
    });
    
    if (!horarioValido) {
      return { 
        valido: false, 
        mensaje: "El horario seleccionado no está disponible"
      };
    }
    
    return { valido: true };
  };
  
  // Para obtener bloques libres completos
  const generarHorasLibres = async (fecha, box_id) => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/${box_id}/bloques-libres/?fecha=${fecha}`
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return data.bloques_libres || [];
    } catch (err) {
      console.error("Error obteniendo bloques libres:", err);
      return [];
    }
  };

  const generarHorasDisponibles = async (fecha, box_id, horaInicioSeleccionada = null) => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/${box_id}/bloques-libres/?fecha=${fecha}`
      );
      
      if (!res.ok) throw new Error("Error al obtener bloques libres");
      
      const data = await res.json();
      const bloquesLibres = data.bloques_libres || [];
      
      if (!horaInicioSeleccionada) {
        const horasDisponibles = [];
        
        bloquesLibres.forEach(bloque => {
          const [inicioH, inicioM] = bloque.inicio.split(':').map(Number);
          const [finH, finM] = bloque.fin.split(':').map(Number);
          
          let h = inicioH;
          let m = inicioM;
          
          while (h < finH || (h === finH && m < finM)) {
            horasDisponibles.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
            
            m += 30;
            if (m >= 60) {
              h += 1;
              m -= 60;
            }
          }
        });
        
        return horasDisponibles;
      } else {
        // Generar horas de fin disponibles basadas en la hora de inicio seleccionada
        const [horaH, horaM] = horaInicioSeleccionada.split(':').map(Number);
        
        const horasFinDisponibles = [];
        
        bloquesLibres.forEach(bloque => {
          const [bloqueH, bloqueM] = bloque.inicio.split(':').map(Number);
          const [bloqueFinH, bloqueFinM] = bloque.fin.split(':').map(Number);
          
          // Verificar si la hora de inicio está dentro de este bloque
          if ((horaH > bloqueH || (horaH === bloqueH && horaM >= bloqueM)) &&
              (horaH < bloqueFinH || (horaH === bloqueFinH && horaM < bloqueFinM))) {
            
            // Calcular la primera hora de fin posible (30 minutos después)
            let h = horaH;
            let m = horaM + 30;
            
            if (m >= 60) {
              h += 1;
              m -= 60;
            }
            
            // Generar horas hasta el fin del bloque
            while (h < bloqueFinH || (h === bloqueFinH && m <= bloqueFinM)) {
              horasFinDisponibles.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
              
              m += 30;
              if (m >= 60) {
                h += 1;
                m -= 60;
              }
            }
          }
        });
        
        return horasFinDisponibles;
      }
    } catch (err) {
      console.error("Error generando horas disponibles:", err);
      
      // Fallback en caso de error
      const horas = [];
      const inicioDia = 8;
      const finDia = 18;
      const intervalo = 30;
      
      for (let h = inicioDia; h <= finDia; h++) {
        for (let m = 0; m < 60; m += intervalo) {
          if (h === finDia && m > 0) break;
          horas.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
      }
      
      return !horaInicioSeleccionada ? horas : horas.filter(h => {
        const [hh, mm] = h.split(':').map(Number);
        return hh > horaH || (hh === horaH && mm > horaM);
      });
    }
  };
  
  // Actualización del useEffect para manejar las horas disponibles
  useEffect(() => {
    if (modal.tipo === "editar" && modal.data) {
      const cargarHoras = async () => {
        try {
          // Cargar horas de inicio
          const horasInicio = await generarHorasDisponibles(
            modal.data.fecha, 
            modal.data.box_id
          );
          
          setHorasDisponibles(prev => ({
            ...prev,
            inicio: Array.isArray(horasInicio) ? horasInicio : []
          }));
          
          // Si hay hora de inicio seleccionada, cargar horas de fin
          if (modal.data.hora_inicio) {
            const horasFin = await generarHorasDisponibles(
              modal.data.fecha, 
              modal.data.box_id, 
              modal.data.hora_inicio
            );
            
            setHorasDisponibles(prev => ({
              ...prev,
              fin: Array.isArray(horasFin) ? horasFin : []
            }));
          }
        } catch (error) {
          console.error("Error cargando horas:", error);
          setHorasDisponibles({
            inicio: [],
            fin: []
          });
        }
      };
      
      cargarHoras();
    }
  }, [modal.data?.fecha, modal.data?.box_id, modal.data?.hora_inicio]);

  const fetchAgendas = async (manual = false) => {
    if (!desde || !hasta) {
      if (manual) {
        setModal({ tipo: "alerta", mensaje: "Debes seleccionar un rango de fechas" });
      }
      return;
    }
  
    try {
      setLoading(true);
      let url = "";

      if (vista === "todas") {
        url = `http://localhost:8000/api/todas-las-agendas/?desde=${desde}&hasta=${hasta}`;
      } else if (vista === "box") {
        if (!filtroId && manual) return setModal({ tipo: "alerta", mensaje: "Debes ingresar un ID de box" });
        url = `http://localhost:8000/api/box/${filtroId}/?desde=${desde}&hasta=${hasta}`;
      } else if (vista === "medico") {
        if (!filtroNombre && manual) return setModal({ tipo: "alerta", mensaje: "Debes ingresar el nombre del médico" });
        url = `http://localhost:8000/api/medico/?medico=${encodeURIComponent(filtroNombre)}&desde=${desde}&hasta=${hasta}`;
      } else if (vista === "pasillo") {
        if (!pasilloSeleccionado && manual) return setModal({ tipo: "alerta", mensaje: "Debes seleccionar un pasillo" });
        url = `http://localhost:8000/api/pasillo/?pasillo=${encodeURIComponent(pasilloSeleccionado)}&desde=${desde}&hasta=${hasta}`;
      }
  
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      const fetchedData = await res.json();

      const limpiarDato = (valor, defecto = "-") => {
        return valor !== null && valor !== undefined ? valor : defecto;
      };

      const agendasProcesadas = fetchedData.map(a => {
        if (vista === "todas") {
          return {
            id: limpiarDato(a.id),
            box_id: limpiarDato(a.box_id || filtroId),
            fecha: limpiarDato(a.fecha),
            hora_inicio: limpiarDato(a.hora_inicio?.slice(0, 5)),
            hora_fin: limpiarDato(a.hora_fin?.slice(0, 5)),
            tipo: limpiarDato(a.tipo),
            responsable: limpiarDato(a.responsable),
            observaciones: limpiarDato(a.observaciones)
        };
        }else if (vista === "box") {
          return {
            id: limpiarDato(a.id),
            box_id: limpiarDato(a.box_id || filtroId),
            fecha: a.start ? limpiarDato(a.start.split("T")[0]) : "-",
            hora_inicio: a.start ? limpiarDato(a.start.split("T")[1]?.slice(0, 5)) : "-",
            hora_fin: a.end ? limpiarDato(a.end.split("T")[1]?.slice(0, 5)) : "-",
            tipo: limpiarDato(a.extendedProps?.tipo || (a.esMedica ? "Médica" : "No Médica")),
            responsable: limpiarDato(a.medico),
            observaciones: limpiarDato(a.extendedProps?.observaciones)
          };
        } else if (vista === "medico") {
          return {
            id: limpiarDato(a.id),
            box_id: limpiarDato(a.box_id),
            fecha: limpiarDato(a.fecha),
            hora_inicio: limpiarDato(a.hora_inicio),
            hora_fin: limpiarDato(a.hora_fin),
            tipo: limpiarDato(a.tipo),
            responsable: limpiarDato(a.medico),
            observaciones: limpiarDato(a.observaciones)
          }; 
        } else if (vista === "pasillo") {
          return {
            id: limpiarDato(a.id),
            box_id: limpiarDato(a.box_id),
            fecha: limpiarDato(a.fecha),
            hora_inicio: limpiarDato(a.hora_inicio),
            hora_fin: limpiarDato(a.hora_fin),
            tipo: limpiarDato(a.tipo),
            responsable: limpiarDato(a.responsable),
            observaciones: limpiarDato(a.observaciones)
          };
        }
      });

      const agendasConTopes = await marcarTopesYInhabilitados(agendasProcesadas);
      
      let agendasFiltradas = agendasConTopes;
      
      if (filtroTopes) {
        agendasFiltradas = agendasFiltradas.filter(a => a.tope !== false);
      }
      
      if (filtroInhabilitados) {
        agendasFiltradas = agendasFiltradas.filter(a => a.boxInhabilitado);
      }
      
      setAgendas(agendasFiltradas);
    } catch (err) {
      console.error(err);
      setAgendas([]);
      if (manual) {
      setModal({ tipo: "alerta", mensaje: err.message });
    }    
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (!agendas.length) return;
    const fileName = `Agendas_${tipoAgendamiento || "default"}_${vista}_${desde}_a_${hasta}_${format(
      new Date(),
      "yyyyMMdd_HHmm"
    )}.xlsx`;
    const ws = XLSX.utils.json_to_sheet(agendas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agendas");
    XLSX.writeFile(wb, fileName);
  };

  const eliminarAgenda = async (id) => {
    try {
      const res = await fetch(`http://localhost:8000/api/reservas/${id}/liberar/`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setModal({ tipo: "alerta", mensaje: "Agenda eliminada correctamente" });
      fetchAgendas();
    } catch (err) {
      setModal({ tipo: "alerta", mensaje: "Error eliminando: " + err.message });
    }
  };

  const handleHoraInicioChange = async (e) => {
    const nuevaHoraInicio = e.target.value;
    const newData = { 
      ...modal.data, 
      hora_inicio: nuevaHoraInicio,
      hora_fin: "" // Resetear hora fin al cambiar inicio
    };
    
    setModal({ ...modal, data: newData, mensaje: null });
    
    // Cargar nuevas horas fin
    if (nuevaHoraInicio) {
      const horasFin = await generarHorasDisponibles(
        newData.fecha, 
        newData.box_id, 
        nuevaHoraInicio
      );
      
      setHorasDisponibles(prev => ({
        ...prev,
        fin: horasFin
      }));
    }
  };
  
  const modificarAgenda = async (e) => {
    e.preventDefault();
    
    // Validación adicional
    if (!modal.data.hora_inicio || !modal.data.hora_fin) {
      return setModal({
        ...modal,
        mensaje: "Debes seleccionar tanto hora de inicio como de fin"
      });
    }
  
    // Verificar que la hora fin sea posterior a la hora inicio
    const [horaInicioH, horaInicioM] = modal.data.hora_inicio.split(':').map(Number);
    const [horaFinH, horaFinM] = modal.data.hora_fin.split(':').map(Number);
    
    if (horaFinH < horaInicioH || (horaFinH === horaInicioH && horaFinM <= horaInicioM)) {
      return setModal({
        ...modal,
        mensaje: "La hora de fin debe ser posterior a la hora de inicio"
      });
    }
  
    try {
      const res = await fetch(
        `http://localhost:8000/api/reservas/${modal.data.id}/modificar/`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idbox: modal.data.box_id,
            fechaagenda: modal.data.fecha,
            horainicioagenda: modal.data.hora_inicio + ":00",
            horafinagenda: modal.data.hora_fin + ":00",
            nombre_responsable: modal.data.responsable,
            observaciones: modal.data.observaciones,
          }),
        }
      );
      
      if (!res.ok) throw new Error(await res.text());
      
      // Actualizar el estado y cerrar el modal
      fetchAgendas(); // Recargar las agendas
      setModal({ tipo: null, data: null, mensaje: null });
      
    } catch (err) {
      setModal({
        ...modal,
        mensaje: `Error al guardar: ${err.message}`
      });
    }
  };

  const aplicarFiltros = () => {
    let agendasFiltradas = agendas;
  
    if (filtroTopes) {
      agendasFiltradas = agendasFiltradas.filter((a) => a.tope !== false);
    }
  
    if (filtroInhabilitados) {
      agendasFiltradas = agendasFiltradas.filter((a) => a.boxInhabilitado);
    }
  
    setAgendas(agendasFiltradas);
  };

  return (
    <>
      <div className="p-8 space-y-6">
        {/* ===== Agendamiento ===== */}
        <h1 className="text-center text-4xl font-bold mt-8 mb-3">Agendamiento</h1>
        <p className="text-center text-gray-600 text-lg mb-8">Selecciona el tipo de agenda que deseas crear, sin topes de horario</p>

        <div 
          className="flex flex-col md:flex-row gap-6 "
          onMouseLeave={() => setTipoAgendamiento(null)} 
        >
          {/* Opción Médica */}
          <div
            onClick={() => navigate('/agendas/agendar-medica')}
            onMouseEnter={() => setTipoAgendamiento("medica")}
            className={`flex-1 cursor-pointer rounded-xl p-16 shadow-md transition-all bg-cover bg-center hover:scale-105`}
            style={{
              backgroundImage: "url('/medica.jpg')",
              backgroundBlendMode: "overlay",
              backgroundColor:
                tipoAgendamiento === "medica"
                  ? "rgba(95,183,153,0.85)"
                  : "rgba(0,0,0,0.65)",
            }}
          >
            <div className={`text-center ${tipoAgendamiento === "medica" ? "text-black" : "text-white"}`}>
              <Stethoscope className="w-10 h-10 mx-auto mb-3" />
              <h2 className="text-xl font-semibold">Crear agenda médica</h2>
              <p className="text-base">Consultas y procedimientos médicos</p>
            </div>
          </div>

          {/* Opción No Médica */}
          <div
            onClick={() => navigate('/agendas/agendar-no-medica')}
            onMouseEnter={() => setTipoAgendamiento("no_medica")}
            className={`flex-1 cursor-pointer rounded-xl p-16 shadow-md transition-all bg-cover bg-center hover:scale-105`}
            style={{
              backgroundImage: "url('/no_medica.jpg')",
              backgroundBlendMode: "overlay",
              backgroundColor:
                tipoAgendamiento === "no_medica"
                  ? "rgba(95,183,153,0.85)"
                  : "rgba(0,0,0,0.65)",
            }}
          >
            <div className={`text-center ${tipoAgendamiento === "no_medica" ? "text-black" : "text-white"}`}>
              <Puzzle className="w-10 h-10 mx-auto mb-3" />
              <h2 className="text-xl font-semibold">Crear agenda no médica</h2>
              <p className="text-base">Actividades y servicios no médicos</p>
            </div>
          </div>
        </div>

        {/* ===== Gestionar agendas ===== */}
        <div ref={gestionRef}>
          <h1 className="text-center text-4xl font-bold mt-12 mb-3">Gestionar agendas actuales</h1>
          <p className="text-center text-gray-600 text-lg mb-8">
            Consulta, filtra y exporta las agendas según tus criterios
          </p>
        </div>

        <div className="flex justify-center mt-6">
          <div className="relative flex bg-gray-100 rounded-2xl p-1 shadow-inner">
            {["todas", "box", "medico", "pasillo"].map((v) => (
              <button
                key={v}
                onClick={() => {
                  setVista(v);
                  if (v === "todas") fetchAgendas();
                }}
                className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                  vista === v ? "text-white" : "text-gray-600"
                } lg:px-16 lg:py-2 lg:w-auto`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
                {vista === v && (
                  <motion.div
                    layoutId="selector"
                    className="absolute inset-0 bg-[#005C48] rounded-xl z-[-1]"
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
          <div className="flex flex-wrap justify-center items-center gap-4 mt-6">


            {/* Filtros adicionales */}
            <div className="flex items-center gap-6 flex-wrap mt-4">
              {/* Mostrar solo topes */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  className={`w-5 h-5 flex items-center justify-center rounded-md border-2 transition-all ${
                    filtroTopes
                      ? "bg-[#005C48] border-[#005C48]"
                      : "border-gray-400 bg-white"
                  }`}
                >
                  {filtroTopes && <Check className="w-4 h-4 text-white" />}
                </div>
                <input
                  type="checkbox"
                  checked={filtroTopes}
                  onChange={() => {
                    setFiltroTopes(!filtroTopes);
                    aplicarFiltros();
                  }}
                  className="hidden"
                />
                <span className="text-gray-700 text-sm sm:text-base">Solo topes</span>
              </label>

              {/* Mostrar solo inhabilitados */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  className={`w-5 h-5 flex items-center justify-center rounded-md border-2 transition-all ${
                    filtroInhabilitados
                      ? "bg-orange-500 border-orange-500"
                      : "border-gray-400 bg-white"
                  }`}
                >
                  {filtroInhabilitados && <Check className="w-4 h-4 text-white" />}
                </div>
                <input
                  type="checkbox"
                  checked={filtroInhabilitados}
                  onChange={() => {
                    setFiltroInhabilitados(!filtroInhabilitados);
                    aplicarFiltros();
                  }}
                  className="hidden"
                />
                <span className="text-gray-700 text-sm sm:text-base">Solo inhabilitados</span>
              </label>
            </div>


            {vista === "box" && (
              <>
                <input 
            type="number" 
            placeholder="ID de box" 
            value={filtroId} 
            onChange={(e) => setFiltroId(e.target.value)}
            className="border rounded px-3 py-2 w-full sm:w-auto" 
                />
                
              </>
            )}
            
            {vista === "medico" && (
              <div className="relative w-full sm:w-auto">
                <input
            type="text"
            placeholder="Nombre de médico (mínimo 2 caracteres)"
            value={filtroNombre}
            onChange={(e) => {
                  setFiltroNombre(e.target.value);
                  setActiveIndex(-1);
                  if (e.target.value.length < 2) setSugerencias([]);
                }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setTimeout(() => {
                  if (!document.activeElement?.closest('.sugerencias-container')) {
                    setInputFocused(false);
                  }
                }, 200)}
                onKeyDown={(e) => {
                  if (['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
                    e.preventDefault();
                    if (e.key === 'ArrowDown') {
                      setActiveIndex((prev) => (prev + 1) % sugerencias.length);
                    } else if (e.key === 'ArrowUp') {
                      setActiveIndex((prev) => (prev - 1 + sugerencias.length) % sugerencias.length);
                    } else if (e.key === 'Enter' && sugerencias.length > 0 && activeIndex >= 0) {
                      setFiltroNombre(sugerencias[activeIndex].nombre);
                      setSugerencias([]);
                      setInputFocused(false);
                    }
                  }
                }}
                className="border rounded px-3 py-2 w-full"
              />
              
              {cargandoSugerencias && (
                <div className="absolute right-3 top-2.5">
                  <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
              
              {(inputFocused && sugerencias.length > 0) && (
                <ul className="sugerencias-container absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {sugerencias.map((medico, index) => (
                    <li
                      key={medico.id}
                      className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                        index === activeIndex ? 'bg-blue-50' : ''
                      }`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setFiltroNombre(medico.nombre);
                        setSugerencias([]);
                        setInputFocused(false);
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      {medico.nombre}
                    </li>
                  ))}
                </ul>
              )}
              
              {inputFocused && !cargandoSugerencias && sugerencias.length === 0 && filtroNombre.length >= 2 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg px-4 py-2 text-gray-500">
                  {errorSugerencias || "No se encontraron médicos"}
                </div>
              )}
            </div>
          )}
          
          {vista === "pasillo" && (
            <select 
              value={pasilloSeleccionado} 
              onChange={(e) => setPasilloSeleccionado(e.target.value)}
              className="border rounded px-3 py-2 w-full sm:w-auto"
            >
              <option value="">Selecciona un pasillo</option>
              {pasillos.map((p, i) => (
                <option key={i} value={p}>{p}</option>
              ))}
            </select>
          )}

          <input 
            type="date" 
            value={desde} 
            onChange={(e) => setDesde(e.target.value)} 
            className="border rounded px-3 py-2 w-full sm:w-auto"
          />
          
          <input 
            type="date" 
            value={hasta} 
            onChange={(e) => setHasta(e.target.value)} 
            min={desde} 
            className="border rounded px-3 py-2 w-full sm:w-auto"
          />

          <button 
            onClick={() => fetchAgendas(true)}
            disabled={loading}
            className="flex items-center gap-2 bg-[#005C48] text-white px-4 py-2 rounded-lg hover:bg-[#4fa986] transition w-full sm:w-auto"
          >
            <Search className="w-4 h-4" /> {loading ? "Cargando..." : "Buscar"}
          </button>

          {agendas.length > 0 && (
            <button 
              onClick={exportExcel} 
              className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-600 w-full sm:w-auto"
            >
              <Download className="w-4 h-4"/> Exportar a Excel
            </button>
          )}
        </div>

        {/* Tabla agendas */}
        {agendas.length > 0 ? (
          <div className="overflow-x-auto mt-4 shadow rounded-lg relative">
            <p className="text-sm text-gray-500 text-center py-2 md:hidden">
              Desliza horizontalmente para ver más columnas
            </p>
            <table className="min-w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  {["Agenda ID", "Box", "Fecha", "Hora Inicio", "Hora Fin", "Tipo", "Responsable", "Observaciones", "Acciones"].map(h => (
                    <th key={h} className="px-4 py-2 border text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agendas.map((a, i) => {
                  let rowClass = "hover:bg-gray-100 ";
                  
                  if (a.tope) {
                    rowClass += "bg-red-200 ";
                  } else if (a.boxInhabilitado) {
                    rowClass += "bg-orange-200 ";
                  } else if (i % 2 === 0) {
                    rowClass += "bg-gray-50 ";
                  } else {
                    rowClass += "bg-white ";
                  }
                  
                  return (
                    <tr key={i} className={rowClass}>
                      <td className="px-4 py-2 border">{a.id}</td>
                      <td className="px-4 py-2 border">
                        <div className="flex items-center justify-center gap-1">
                          {a.box_id}
                          {a.boxInhabilitado && (
                            <span className="text-xs text-orange-600 flex items-center">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Inhabilitado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 border">{a.fecha}</td>
                      <td className="px-4 py-2 border">{a.hora_inicio}</td>
                      <td className="px-4 py-2 border">{a.hora_fin}</td>
                      <td className="px-4 py-2 border">{a.tipo}</td>
                      <td className="px-4 py-2 border">{a.responsable}</td>
                      <td className="px-4 py-2 border">
                        {a.tope ? `Tope con agenda #${a.tope}` : 
                         a.boxInhabilitado ? "Box inhabilitado" : 
                         a.observaciones}
                      </td>
                      <td className="px-4 py-2 border text-center">
                        <button 
                          className="text-yellow-500 hover:text-yellow-600 mr-3" 
                          onClick={() => setModal({ tipo: "editar", data: a })}
                        >
                          <Edit2 className="w-5 h-5"/>
                        </button>
                        <button 
                          className="text-red-500 hover:text-red-600" 
                          onClick={() => setModal({ tipo: "eliminar", data: a })}
                        >
                          <Trash2 className="w-5 h-5"/>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4 shadow rounded-lg border border-gray-200">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  {["Agenda ID", "Box", "Fecha", "Hora Inicio", "Hora Fin", "Tipo", "Responsable", "Observaciones", "Acciones"].map(h => (
                    <th key={h} className="px-4 py-3 border text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan="9" className="px-4 py-32 text-center bg-white">
                    <div className="flex flex-col items-center justify-center">
                      <CalendarDays className="w-12 h-12 text-gray-300 mb-3" />
                      <h3 className="text-lg font-medium text-gray-500 mb-1">
                        No hay agendas buscadas
                      </h3>
                      <p className="text-gray-400">
                        Haz uso de los filtros superiores para buscar agendas
                      </p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {modal.tipo && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className={`bg-white rounded-lg p-6 shadow-lg ${modal.tipo === "editar" ? "w-full max-w-2xl" : "w-96"}`}>
              {modal.tipo === "alerta" ? (
                <>
                  <h2 className="text-xl font-bold mb-4">Aviso</h2>
                  <p className="mb-6">{modal.mensaje}</p>
                  <div className="flex justify-end">
                    <button 
                      className="px-4 py-2 bg-blue-500 text-white rounded" 
                      onClick={() => setModal({ tipo: null, data: null, mensaje: null })}
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              ) : modal.tipo === "eliminar" ? (
                <>
                  <h2 className="text-xl font-bold mb-4">Confirmar eliminación</h2>
                  <p className="mb-6">¿Seguro que quieres eliminar la agenda #{modal.data.id}?</p>
                  <div className="flex justify-end gap-3">
                    <button 
                      className="px-4 py-2 bg-gray-200 rounded" 
                      onClick={() => setModal({ tipo: null, data: null })}
                    >
                      Cancelar
                    </button>
                    <button 
                      className="px-4 py-2 bg-red-500 text-white rounded" 
                      onClick={() => eliminarAgenda(modal.data.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </>
              ) : modal.tipo === "editar" ? (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold">Modificar agenda #{modal.data.id}</h2>
                    {modal.mensaje && <p className="text-red-500 text-sm">{modal.mensaje}</p>}
                  </div>
                  
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const validacion = await validarModificacion(modal.data, agendas);
                      if (validacion.valido) {
                        modificarAgenda(e);
                      } else {
                        setModal({...modal, mensaje: validacion.mensaje});
                      }
                    }} 
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Box <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        value={modal.data.box_id}
                        onChange={async (e) => {
                          const newData = { ...modal.data, box_id: e.target.value };
                          const validacion = await validarModificacion(newData, agendas);
                          setModal({ 
                            ...modal, 
                            data: newData,
                            mensaje: validacion.valido ? null : validacion.mensaje
                          });
                          const horasInicio = await generarHorasDisponibles(newData.fecha, newData.box_id);
                          setHorasDisponibles({
                            inicio: Array.isArray(horasInicio) ? horasInicio : [],
                            fin: []
                          });
                        }}
                        className={`border rounded px-3 py-2 w-full ${
                          boxesInhabilitados.includes(parseInt(modal.data.box_id)) 
                            ? 'border-orange-500 bg-orange-50' 
                            : 'border-gray-300'
                        }`}
                        required
                      />
                      {boxesInhabilitados.includes(parseInt(modal.data.box_id)) && (
                        <p className="text-orange-600 text-sm flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Este box está actualmente inhabilitado
                        </p>
                      )}
                    </div>

                    {/* Campo Fecha */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Fecha <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        value={modal.data.fecha}
                        onChange={async (e) => {
                          const newData = { ...modal.data, fecha: e.target.value };
                          const validacion = await validarModificacion(newData, agendas);
                          setModal({ 
                            ...modal, 
                            data: newData,
                            mensaje: validacion.valido ? null : validacion.mensaje
                          });
                          const horasInicio = await generarHorasDisponibles(newData.fecha, newData.box_id);
                          setHorasDisponibles({
                            inicio: Array.isArray(horasInicio) ? horasInicio : [],
                            fin: []
                          });
                        }}
                        className="border rounded px-3 py-2 w-full"
                        required
                      />
                    </div>

                    {/* Campo Hora Inicio */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Hora inicio <span className="text-red-500">*</span></label>
                      <select
                        value={modal.data.hora_inicio}
                        onChange={handleHoraInicioChange}
                        className="border rounded px-3 py-2 w-full"
                        required
                      >
                        <option value="">Seleccione hora</option>
                        {horasDisponibles.inicio.map((hora, i) => (
                          <option key={i} value={hora}>{hora}</option>
                        ))}
                      </select>
                    </div>

                    {/* Campo Hora Fin */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Hora fin <span className="text-red-500">*</span></label>
                      <select
                        value={modal.data.hora_fin}
                        onChange={(e) => {
                          const newData = { ...modal.data, hora_fin: e.target.value };
                          setModal({ ...modal, data: newData });
                        }}
                        className="border rounded px-3 py-2 w-full"
                        disabled={!modal.data.hora_inicio || horasDisponibles.fin.length === 0}
                        required
                      >
                        <option value="">Seleccione hora</option>
                        {horasDisponibles.fin.map((hora, i) => (
                          <option key={i} value={hora}>{hora}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-2 md:col-span-2 relative">
                      <label className="block text-sm font-medium">Médico/Responsable <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input
                          type="text"
                          value={modal.data.responsable}
                          onChange={(e) => {
                            setModal({ 
                              ...modal, 
                              data: { ...modal.data, responsable: e.target.value } 
                            });
                            setMostrarSugerencias(true);
                          }}
                          onFocus={() => setMostrarSugerencias(true)}
                          onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)}
                          className="border rounded px-3 py-2 w-full"
                          required
                        />
                        {mostrarSugerencias && sugerenciasMedico.length > 0 && (
                          <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                            {sugerenciasMedico.map((medico) => (
                              <li
                                key={medico.id}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setModal({
                                    ...modal,
                                    data: { ...modal.data, responsable: medico.nombre }
                                  });
                                  setMostrarSugerencias(false);
                                }}
                              >
                                {medico.nombre}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-sm font-medium">Observaciones</label>
                      <textarea
                        value={modal.data.observaciones}
                        onChange={(e) =>
                          setModal({ ...modal, data: { ...modal.data, observaciones: e.target.value } })
                        }
                        className="border rounded px-3 py-2 w-full"
                        rows="3"
                      />
                    </div>

                    <div className="flex justify-end gap-2 md:col-span-2 pt-4">
                      <button
                        type="button"
                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
                        onClick={() => setModal({ tipo: null, data: null, mensaje: null })}
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        className="px-4 py-2 bg-blue-800 text-white rounded hover:bg-blue-900 transition"
                        disabled={!modal.data.hora_inicio || !modal.data.hora_fin || !modal.data.responsable || modal.mensaje}
                      >
                        Guardar cambios
                      </button>
                    </div>
                  </form>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
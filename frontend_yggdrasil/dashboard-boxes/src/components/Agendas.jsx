import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { buildApiUrl } from "../config/api";
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
  const [vista, setVista] = useState("todas"); 
  const [desde, setDesde] = useState(format(new Date(), "yyyy-MM-dd"));
  const [hasta, setHasta] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filtroId, setFiltroId] = useState("");
  const [filtroNombre, setFiltroNombre] = useState("");
  const [pasilloSeleccionado, setPasilloSeleccionado] = useState("");
  const [agendas, setAgendas] = useState([]);
  const [agendasSinFiltrar, setAgendasSinFiltrar] = useState([]); 
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
  const [todosLosTopes, setTodosLosTopes] = useState({});
  const motivosCache = useRef(new Map());
  const gestionRef = useRef(null);
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(150);

  // Cargar datos iniciales de forma paralela
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Ejecutar ambas llamadas en paralelo
        const [boxesResponse, agendasResponse, topesResponse] = await Promise.all([
          fetch(buildApiUrl('/api/boxes-inhabilitados/')),
          fetch(buildApiUrl(`/api/todas-las-agendas/?desde=${desde}&hasta=${hasta}`)),
          fetch(buildApiUrl(`/api/agendas-con-tope/?desde=${desde}&hasta=${hasta}`))
        ]);

        // Procesar boxes inhabilitados
        const boxesInhabilitados = [];
        if (boxesResponse.ok) {
          const boxesData = await boxesResponse.json();
          boxesInhabilitados.push(...boxesData.map(box => box.idbox));
          setBoxesInhabilitados(boxesInhabilitados);
        }

        // Procesar topes
        const mapaTopes = {};
        if (topesResponse.ok) {
          const topesData = await topesResponse.json();
          if (Array.isArray(topesData)) {
            topesData.forEach(tope => {
              if (!mapaTopes[tope.idbox]) {
                mapaTopes[tope.idbox] = [];
              }
              mapaTopes[tope.idbox].push(tope);
            });
          }
          setTodosLosTopes(mapaTopes);
        }

        // Procesar agendas
        if (agendasResponse.ok) {
          const fetchedData = await agendasResponse.json();
          
          const limpiarDato = (valor, defecto = "-") => {
            return valor !== null && valor !== undefined ? valor : defecto;
          };

          const agendasProcesadas = fetchedData.map(a => ({
            id: limpiarDato(a.id),
            box_id: limpiarDato(a.box_id),
            fecha: limpiarDato(a.fecha),
            hora_inicio: limpiarDato(a.hora_inicio?.slice(0, 5)),
            hora_fin: limpiarDato(a.hora_fin?.slice(0, 5)),
            tipo: limpiarDato(a.tipo),
            responsable: limpiarDato(a.responsable),
            observaciones: limpiarDato(a.observaciones)
          }));

          // Marcar topes e inhabilitados de forma síncrona (ya tenemos los datos)
          const agendasConTopes = await Promise.all(
            agendasProcesadas.map(async agenda => {
              const topesEnBox = mapaTopes[agenda.box_id] || [];
              const topeCon = topesEnBox.find(
                tope =>
                  tope.fechaagenda === agenda.fecha &&
                  tope.horainicioagenda < agenda.hora_fin &&
                  tope.horafinagenda > agenda.hora_inicio &&
                  tope.id !== agenda.id 
              );

              const boxInhabilitado = boxesInhabilitados.includes(parseInt(agenda.box_id));
              let motivoInhabilitacion = null;
              
              if (boxInhabilitado) {
                // Solo hacer la llamada HTTP si es necesario y de forma paralela
                try {
                  motivoInhabilitacion = await obtenerMotivoInhabilitacion(agenda.box_id);
                } catch (err) {
                  motivoInhabilitacion = "Error al obtener motivo";
                }
              }
              
              return {
                ...agenda,
                tope: topeCon ? topeCon.id : false,
                boxInhabilitado,
                motivoInhabilitacion: boxInhabilitado ? motivoInhabilitacion : null,
              };
            })
          );

          setAgendasSinFiltrar(agendasConTopes);
        }
        
      } catch (err) {
        console.error("Error loading initial data:", err);
        setAgendasSinFiltrar([]);
      } finally {
        setLoading(false);
      }
    };
    
    // Solo cargar al inicio si estamos en vista "todas"
    if (vista === "todas") {
      loadInitialData();
    }
  }, []); // Solo ejecutar una vez al montar el componente

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroTopes, filtroInhabilitados, agendas]);


  // Aplicar filtros cuando cambian los estados de los checkboxes
  useEffect(() => {
    aplicarFiltros();
  }, [filtroTopes, filtroInhabilitados, agendasSinFiltrar]);

  // Función para aplicar filtros sobre las agendas sin filtrar
  const aplicarFiltros = () => {
    let agendasFiltradas = [...agendasSinFiltrar];

    if (filtroTopes) {
      agendasFiltradas = agendasFiltradas.filter(a => a.tope !== false);
    }

    if (filtroInhabilitados) {
      agendasFiltradas = agendasFiltradas.filter(a => a.boxInhabilitado);
    }

    setAgendas(agendasFiltradas);
  };

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
          buildApiUrl(`/api/medico/sugerencias/?nombre=${encodeURIComponent(
            filtroNombre
          )}`)
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
          buildApiUrl(`/api/medico/sugerencias/?nombre=${encodeURIComponent(
            modal.data.responsable
          )}`)
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

  const fetchTodosLosTopes = async () => {
    try {
      const res = await fetch(
        buildApiUrl(`/api/agendas-con-tope/?desde=${desde}&hasta=${hasta}`)
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
  
      const mapaTopes = {};
      if (Array.isArray(data)) {
        data.forEach(tope => {
          if (!mapaTopes[tope.idbox]) {
            mapaTopes[tope.idbox] = [];
          }
          mapaTopes[tope.idbox].push(tope);
        });
      }
  
      setTodosLosTopes(mapaTopes);
      return mapaTopes;
    } catch (err) {
      console.error("Error obteniendo topes:", err);
      return {};
    }
  };

  const marcarTopesYInhabilitados = async (agendasFiltradas) => {
    try {
      const mapaTopes = await fetchTodosLosTopes();
  
      const agendasProcesadas = await Promise.all(
        agendasFiltradas.map(async agenda => {
          const topesEnBox = mapaTopes[agenda.box_id] || [];
          const topeCon = topesEnBox.find(
            tope =>
              tope.fechaagenda === agenda.fecha &&
              tope.horainicioagenda < agenda.hora_fin &&
              tope.horafinagenda > agenda.hora_inicio &&
              tope.id !== agenda.id 
          );

          const boxInhabilitado = boxesInhabilitados.includes(parseInt(agenda.box_id));
          let motivoInhabilitacion = null;
          if (boxInhabilitado) {
            motivoInhabilitacion = await obtenerMotivoInhabilitacion(agenda.box_id);
          }
          
          return {
            ...agenda,
            tope: topeCon ? topeCon.id : false,
            boxInhabilitado,
            motivoInhabilitacion: boxInhabilitado ? motivoInhabilitacion : null,
          };
        })
      );
  
      return agendasProcesadas;
    } catch (err) {
      console.error("Error marcando topes y boxes inhabilitados:", err);
      return agendasFiltradas.map(agenda => ({
        ...agenda,
        tope: false,
        boxInhabilitado: boxesInhabilitados.includes(parseInt(agenda.box_id)),
      }));
    }
  };

  const abrirModalEdicion = async (agenda) => {
    let agendaConId = { ...agenda };
    
    // Si es una agenda médica y no tenemos idmedico, lo buscamos
    if ((agenda.tipo === "Médica" || agenda.tipo === "Medica" || agenda.tipo === "médica") && 
        !agenda.idmedico && agenda.responsable && agenda.responsable.trim() !== "-") {
      
      try {
        const res = await fetch(
          buildApiUrl(`/api/medico/sugerencias/?nombre=${encodeURIComponent(agenda.responsable.trim())}`)
        );
        
        if (res.ok) {
          const medicos = await res.json();
          
          // Buscar coincidencia exacta primero
          let medicoEncontrado = medicos.find(m => 
            m.nombre.toLowerCase().trim() === agenda.responsable.toLowerCase().trim()
          );
          
          // Si no hay coincidencia exacta, buscar que contenga el nombre
          if (!medicoEncontrado) {
            medicoEncontrado = medicos.find(m => 
              m.nombre.toLowerCase().includes(agenda.responsable.toLowerCase().trim())
            );
          }
          
          if (medicoEncontrado) {
            agendaConId.idmedico = medicoEncontrado.idmedico || medicoEncontrado.id;
            console.log("ID del médico cargado al abrir modal:", agendaConId.idmedico);
          }
        }
      } catch (err) {
        console.warn("Error buscando médico al abrir modal:", err);
      }
    }
    
    setModal({ tipo: "editar", data: agendaConId });
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
    
    // 1. Validar que el box esté disponible
    const bloquesLibresBox = await generarHorasLibres(
      nuevaAgenda.fecha, 
      nuevaAgenda.box_id
    );
    
    const boxDisponible = bloquesLibresBox.some(bloque => {
      const bloqueInicio = parseDateTime(nuevaAgenda.fecha, bloque.inicio);
      const bloqueFin = parseDateTime(nuevaAgenda.fecha, bloque.fin);
      return start >= bloqueInicio && end <= bloqueFin;
    });
    
    if (!boxDisponible) {
      return { 
        valido: false, 
        mensaje: "El box no está disponible en el horario seleccionado"
      };
    }
    
    // 2. Validar que el médico esté disponible (si es agenda médica y tenemos ID de médico)
    if ((nuevaAgenda.tipo === "Médica" || nuevaAgenda.tipo === "Medica" || nuevaAgenda.tipo === "médica") && nuevaAgenda.idmedico) {
      try {
        const res = await fetch(
          buildApiUrl(`/api/medico/disponibilidad/?medico_id=${nuevaAgenda.idmedico}&fecha=${nuevaAgenda.fecha}`)
        );
        
        if (res.ok) {
          const data = await res.json();
          
          // Verificar conflictos de horario (excluyendo la agenda actual)
          const conflictos = data.agendas.filter(agenda => 
            agenda.id !== nuevaAgenda.id && // Excluir la agenda actual
            agenda.hora_inicio && agenda.hora_fin && // Asegurar que tiene horarios
            parseDateTime(nuevaAgenda.fecha, agenda.hora_inicio) < end &&
            parseDateTime(nuevaAgenda.fecha, agenda.hora_fin) > start
          );
          
          if (conflictos.length > 0) {
            const conflictosInfo = conflictos.map(c => 
              `Box ${c.box_id} (${c.hora_inicio}-${c.hora_fin})`
            ).join(', ');
            
            return { 
              valido: false, 
              mensaje: `El médico tiene ${conflictos.length} conflicto(s): ${conflictosInfo}` 
            };
          }
        }
      } catch (err) {
        console.warn("Error verificando disponibilidad médica:", err);
        // Continuar sin validación médica si hay error en la API
      }
    }
    
    return { valido: true };
  };
  
  // Para obtener bloques libres completos
  const generarHorasLibres = async (fecha, box_id) => {
    try {
      const res = await fetch(
        buildApiUrl(`/api/${box_id}/bloques-libres/?fecha=${fecha}`)
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      
      // Mapear la estructura de la API a la esperada
      return data.bloques_libres.map(bloque => ({
        inicio: bloque.hora_inicio,
        fin: bloque.hora_fin
      })) || [];
    } catch (err) {
      console.error("Error obteniendo bloques libres:", err);
      return [];
    }
  };

  const generarHorasDisponibles = async (fecha, box_id, horaInicioSeleccionada = null) => {
    try {
      const res = await fetch(
        buildApiUrl(`/api/${box_id}/bloques-libres/?fecha=${fecha}`)
      );
      
      if (!res.ok) throw new Error("Error al obtener bloques libres");
      
      const data = await res.json();
      const bloquesLibres = data.bloques_libres || [];
      
      // Validar y mapear a la estructura esperada
      const bloquesValidos = bloquesLibres
        .filter(bloque => bloque && bloque.hora_inicio && bloque.hora_fin)
        .map(bloque => ({
          inicio: bloque.hora_inicio,
          fin: bloque.hora_fin
        }));
  
      console.log("Bloques libres procesados:", bloquesValidos); // Para debug
  
      if (!horaInicioSeleccionada) {
        const horasDisponibles = [];
        
        bloquesValidos.forEach(bloque => {
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
        
        console.log("Horas inicio disponibles:", horasDisponibles); // Para debug
        return horasDisponibles;
      } else {
        // Generar horas de fin disponibles
        const [horaH, horaM] = horaInicioSeleccionada.split(':').map(Number);
        
        const horasFinDisponibles = [];
        
        bloquesValidos.forEach(bloque => {
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
        
        console.log("Horas fin disponibles:", horasFinDisponibles); // Para debug
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
      
      if (!horaInicioSeleccionada) {
        return horas;
      } else {
        const [horaH, horaM] = horaInicioSeleccionada.split(':').map(Number);
        return horas.filter(h => {
          const [hh, mm] = h.split(':').map(Number);
          return hh > horaH || (hh === horaH && mm > horaM);
        });
      }
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
        url = buildApiUrl(`/api/todas-las-agendas/?desde=${desde}&hasta=${hasta}`);
      } else if (vista === "box") {
        if (!filtroId && manual) return setModal({ tipo: "alerta", mensaje: "Debes ingresar un ID de box" });
        url = buildApiUrl(`/api/box/${filtroId}/?desde=${desde}&hasta=${hasta}`);
      } else if (vista === "medico") {
        if (!filtroNombre && manual) return setModal({ tipo: "alerta", mensaje: "Debes ingresar el nombre del médico" });
        url = buildApiUrl(`/api/medico/?medico=${encodeURIComponent(filtroNombre)}&desde=${desde}&hasta=${hasta}`);
      } else if (vista === "pasillo") {
        if (!pasilloSeleccionado && manual) return setModal({ tipo: "alerta", mensaje: "Debes seleccionar un pasillo" });
        url = buildApiUrl(`/api/pasillo/?pasillo=${encodeURIComponent(pasilloSeleccionado)}&desde=${desde}&hasta=${hasta}`);
      }
  
      const res = await fetch(url);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
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
        } else if (vista === "box") {
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
        return null;
      }).filter(Boolean);
      
      // Marcar topes e inhabilitados
      const agendasConTopes = await marcarTopesYInhabilitados(agendasProcesadas);

      // Guardar todas las agendas sin filtrar
      setAgendasSinFiltrar(agendasConTopes);
      
      // Los filtros se aplicarán automáticamente por el useEffect de aplicarFiltros()
  
    } catch (err) {
      console.error("Error fetching agendas:", err);
      setAgendasSinFiltrar([]);
      setAgendas([]);
      if (manual) {
        setModal({ tipo: "alerta", mensaje: "Error al cargar las agendas. Verifica los filtros." });
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
      const res = await fetch(buildApiUrl(`/api/reservas/${id}/liberar/`), { 
        method: "DELETE",
        headers: {
          'Accept': 'application/json', // ← Forzar respuesta JSON
        }
      });
      
      // Verificar si la respuesta es JSON
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.mensaje || 'Error eliminando reserva');
        setModal({ tipo: "alerta", mensaje: "Agenda eliminada correctamente" });
      } else {
        // Si no es JSON, obtener texto y tratar de parsear manualmente
        const text = await res.text();
        throw new Error(`Respuesta inesperada del servidor: ${text.substring(0, 100)}...`);
      }
      
      // Recargar agendas después de eliminar
      setTimeout(() => {
        fetchAgendas(true);
      }, 1000);
      
    } catch (err) {
      console.error("Error eliminando agenda:", err);
      setModal({ 
        tipo: "alerta", 
        mensaje: `Error eliminando: ${err.message || 'Error desconocido'}` 
      });
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
    
  const obtenerMotivoInhabilitacion = async (boxId) => {
    // Verificar caché primero
    if (motivosCache.current.has(boxId)) {
      return motivosCache.current.get(boxId);
    }

    try {
      const response = await fetch(buildApiUrl(`/api/boxes/${boxId}/`), {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error("Error al obtener datos del box");
      
      const boxData = await response.json();
      
      if (boxData.estadobox === 'Inhabilitado') {
        let motivo = boxData.comentario || "Sin especificar";
        
        // Intentar obtener historial solo si no hay comentario directo
        if (!boxData.comentario || boxData.comentario === "Sin especificar") {
          try {
            const historialResponse = await fetch(buildApiUrl(`/api/boxes/${boxId}/historial-modificaciones/`), {
              credentials: 'include'
            });
            
            if (historialResponse.ok) {
              const historialData = await historialResponse.json();
              const historialModificaciones = Array.isArray(historialData) ? historialData : [];
              
              const inhabilitaciones = historialModificaciones
                .filter(item => item.accion === 'INHABILITACION' && item.comentario)
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
              
              if (inhabilitaciones.length > 0) {
                motivo = inhabilitaciones[0].comentario;
              }
            }
          } catch (historialErr) {
            console.warn("No se pudo obtener historial para box", boxId, historialErr);
          }
        }
        
        // Guardar en caché
        motivosCache.current.set(boxId, motivo);
        return motivo;
      }
      
      return null; 
    } catch (error) {
      console.error("Error obteniendo motivo de inhabilitación:", error);
      const errorMsg = "Error al obtener motivo";
      motivosCache.current.set(boxId, errorMsg);
      return errorMsg;
    }
  };


  const modificarAgenda = async (e) => {
    e.preventDefault();
  
    // Validación adicional
    if (!modal.data.hora_inicio || !modal.data.hora_fin) {
      return setModal({
        ...modal,
        mensaje: "Debes seleccionar tanto hora de inicio como de fin",
      });
    }
  
    // Verificar que la hora fin sea posterior a la hora inicio
    const [horaInicioH, horaInicioM] = modal.data.hora_inicio.split(":").map(Number);
    const [horaFinH, horaFinM] = modal.data.hora_fin.split(":").map(Number);
  
    if (horaFinH < horaInicioH || (horaFinH === horaInicioH && horaFinM <= horaInicioM)) {
      return setModal({
        ...modal,
        mensaje: "La hora de fin debe ser posterior a la hora de inicio",
      });
    }
  
    try {
      const payload = {
        idbox: modal.data.box_id,
        fechaagenda: modal.data.fecha,
        horainicioagenda: modal.data.hora_inicio + ":00",
        horafinagenda: modal.data.hora_fin + ":00",
        nombre_responsable: modal.data.responsable,
        observaciones: modal.data.observaciones || "",
      };
  
      // Si no hay `idmedico`, enviamos solo el nombre del médico
      if (modal.data.idmedico) {
        payload.idmedico = modal.data.idmedico;
      }
  
      console.log("Payload enviado:", payload);
  
      const res = await fetch(
        buildApiUrl(`/api/reservas/${modal.data.id}/modificar/`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
  
      // Verificar tipo de respuesta
      const contentType = res.headers.get("content-type");
      let responseData;
  
      if (contentType && contentType.includes("application/json")) {
        responseData = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Respuesta inesperada: ${text.substring(0, 100)}...`);
      }
  
      if (!res.ok) {
        throw new Error(
          responseData.error || responseData.mensaje || "Error modificando reserva"
        );
      }
  
      setModal({ tipo: "success", mensaje: "Agenda modificada correctamente" });
  
      // Recargar agendas después de modificar
      setTimeout(() => {
        fetchAgendas(true);
        setModal({ tipo: null, data: null, mensaje: null });
      }, 1500);
    } catch (err) {
      console.error("Error modificando agenda:", err);
      setModal({
        ...modal,
        mensaje: `Error al guardar: ${err.message || "Error desconocido"}`,
      });
    }
  };

  const totalPages = Math.ceil(agendas.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const agendasPaginadas = agendas.slice(startIndex, endIndex);

  return (
    <>
      <div className="p-8 space-y-6">
        {/* ===== Agendamiento ===== */}
        <h1 className="text-center text-4xl font-bold mt-8 mb-3">Agendamiento</h1>
        <p className="text-center text-gray-600 text-lg mb-8">Selecciona el tipo de agenda que deseas crear, sin topes de horarios</p>

        <div 
          className="flex flex-col md:flex-row gap-6 "
          onMouseLeave={() => setTipoAgendamiento(null)} 
        >

          {/* Opción Médica */}
          <div
            onClick={() => navigate('/agendas/agendar-medica')}
            onMouseEnter={() => setTipoAgendamiento("medica")}
            className={`group flex-1 cursor-pointer rounded-xl p-16 shadow-md transition-all bg-cover bg-center hover:scale-105`}
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
              <h2 className="text-xl font-semibold transition-all duration-200 group-hover:text-black group-hover:text-2xl">
                Crear agenda médica
              </h2>
              <p className="text-base transition-all duration-200 group-hover:text-black group-hover:text-lg">
                Consultas y procedimientos médicos
              </p>
            </div>
          </div>

          {/* Opción No Médica */}
          <div
            onClick={() => navigate('/agendas/agendar-no-medica')}
            onMouseEnter={() => setTipoAgendamiento("no_medica")}
            className={`group flex-1 cursor-pointer rounded-xl p-16 shadow-md transition-all bg-cover bg-center hover:scale-105`}
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
              <h2 className="text-xl font-semibold transition-all duration-200 group-hover:text-black group-hover:text-2xl">
                Crear agenda no médica
              </h2>
              <p className="text-base transition-all duration-200 group-hover:text-black group-hover:text-lg">
                Actividades y servicios no médicos
              </p>
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
                  // Solo hacer fetch manual para otras vistas, "todas" ya se carga automáticamente
                  if (v !== "todas") {
                    // Limpiar datos al cambiar de vista
                    setAgendas([]);
                    setAgendasSinFiltrar([]);
                  }
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
                onChange={(e) => setFiltroTopes(e.target.checked)}
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
                onChange={(e) => setFiltroInhabilitados(e.target.checked)}
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
                          index === activeIndex ? 'bg-gray-100' : ''
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
              {agendasPaginadas.map((a, i) => {
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
                      <td 
                          className="px-4 py-2 border cursor-pointer text-[#005C48] hover:underline font-bold"
                          onClick={() => navigate(`/agendas/${a.box_id}`)}
                        >
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
                      {a.tope 
                        ? `Tope con agenda #${a.tope}` 
                        : a.boxInhabilitado 
                          ? `Inhabilitado: ${a.motivoInhabilitacion || "Sin especificar"}` 
                          : a.observaciones || "-"
                      }
                      </td>
                      <td className="px-4 py-2 border text-center">
                        <div className="flex justify-center space-x-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-100 text-blue-900 hover:bg-blue-200 transition-colors"
                            onClick={() => abrirModalEdicion(a)}
                            title="Editar agenda"
                          >
                            <Edit2 className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center justify-center w-8 h-8 rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                            onClick={() => setModal({ tipo: "eliminar", data: a })}
                            title="Eliminar agenda"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
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


        {/* Estadísticas, pag navegación */}
        {agendas.length > 0 && (
          <div className="mt-6 space-y-4">
            {/* Información y estadísticas */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <p className="text-sm text-gray-600 font-medium">
                  Mostrando <span className="text-[#005C48] font-bold">{agendas.length}</span> agendas
                </p>
                
                {/* Contadores de estados */}
                <div className="flex items-center gap-3 text-xs">
                  {filtroTopes && (
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full">
                      {agendas.filter(a => a.tope).length} con tope
                    </span>
                  )}
                  {filtroInhabilitados && (
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                      {agendas.filter(a => a.boxInhabilitado).length} inhabilitados
                    </span>
                  )}
                  {!filtroTopes && !filtroInhabilitados && (
                    <>
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full">
                        {agendas.filter(a => a.tope).length} con tope
                      </span>
                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                        {agendas.filter(a => a.boxInhabilitado).length} inhabilitados
                      </span>
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                        {agendas.filter(a => !a.tope && !a.boxInhabilitado).length} normales
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => window.scrollTo({ top: 420, behavior: 'smooth' })}
                className="flex items-center gap-1 px-4 py-2 bg-[#005C48] text-white rounded-lg hover:bg-[#004335] transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                </svg>
                Volver arriba
              </button>
            </div>

            {/* Paginación */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Filas por página:</span>
                <select 
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={150}>150</option>
                  <option value={100}>100</option>
                  <option value={50}>50</option>
                  <option value={10}>10</option>
                  <option value={1000}>1000</option>


                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  ← Anterior
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded ${
                          currentPage === pageNum
                            ? 'bg-[#005C48] text-white'
                            : 'border hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  {totalPages > 5 && (
                    <>
                      <span className="px-1">...</span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className={`w-8 h-8 rounded ${
                          currentPage === totalPages
                            ? 'bg-[#005C48] text-white'
                            : 'border hover:bg-gray-100'
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
        {modal.tipo && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className={`bg-white rounded-lg p-6 shadow-lg ${modal.tipo === "editar" ? "w-full max-w-2xl" : "w-96"}`}>
            {modal.tipo === "success" ? (
              <>
                <h2 className="text-xl font-bold mb-4">Éxito</h2>
                <p className="mb-6 text-green-600">{modal.mensaje}</p>
                <div className="flex justify-end">
                  <button 
                    className="px-4 py-2 bg-[#005C48] text-white rounded" 
                    onClick={() => setModal({ tipo: null, data: null, mensaje: null })}
                  >
                    Cerrar
                  </button>
                </div>
              </>
            ) : modal.tipo === "alerta" ? (
                <>
                  <h2 className="text-xl font-bold mb-4">Aviso</h2>
                  <p className="mb-6">{modal.mensaje}</p>
                  <div className="flex justify-end">
                    <button 
                      className="px-4 py-2 bg-[#005C48] text-white rounded" 
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
                          const newData = { ...modal.data, box_id: e.target.value, hora_inicio: "", hora_fin: "" };
                          setModal({ 
                            ...modal, 
                            data: newData,
                            mensaje: null
                          });
                          
                          // Resetear horas
                          setHorasDisponibles({
                            inicio: [],
                            fin: []
                          });
                          
                          // Cargar horas disponibles para el nuevo box
                          if (newData.fecha && newData.box_id) {
                            const horasInicio = await generarHorasDisponibles(newData.fecha, newData.box_id);
                            setHorasDisponibles({
                              inicio: Array.isArray(horasInicio) ? horasInicio : [],
                              fin: []
                            });
                          }
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
                          const newData = { ...modal.data, fecha: e.target.value, hora_inicio: "", hora_fin: "" };
                          setModal({ 
                            ...modal, 
                            data: newData,
                            mensaje: null
                          });
                          
                          // Resetear horas
                          setHorasDisponibles({
                            inicio: [],
                            fin: []
                          });
                          
                          // Cargar horas disponibles para la nueva fecha
                          if (newData.box_id && newData.fecha) {
                            const horasInicio = await generarHorasDisponibles(newData.fecha, newData.box_id);
                            setHorasDisponibles({
                              inicio: Array.isArray(horasInicio) ? horasInicio : [],
                              fin: []
                            });
                          }
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
                              data: { 
                                ...modal.data, 
                                responsable: e.target.value,
                                // Limpiar el idmedico si se está escribiendo un nuevo nombre
                                idmedico: modal.data.responsable !== e.target.value ? null : modal.data.idmedico
                              } 
                            });
                            setMostrarSugerencias(true);
                          }}
                          onFocus={() => setMostrarSugerencias(true)}
                          onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)}
                          className="border rounded px-3 py-2 w-full"
                          required
                        />
                        {mostrarSugerencias && sugerenciasMedico.length > 0 && (
                          <ul className="sugerencias-container absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                            {sugerenciasMedico.map((medico, index) => (
                              <li
                                key={medico.id}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setModal({
                                    ...modal,
                                    data: { 
                                      ...modal.data, 
                                      responsable: medico.nombre,
                                      idmedico: medico.idmedico || medico.id // Asegúrate de usar el campo correcto
                                    }
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
                        className="px-4 py-2 bg-[#005C48] text-white rounded hover:bg-green-700 transition"
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
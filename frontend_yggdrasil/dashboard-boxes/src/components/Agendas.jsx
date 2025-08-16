import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";

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

  const gestionRef = useRef(null);

  // Autocomplete médico
  useEffect(() => {
    if (vista !== "medico" || !filtroNombre) return;
    const fetchSugerencias = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/medico/sugerencias/?nombre=${encodeURIComponent(
            filtroNombre
          )}`
        );
        if (!res.ok) throw new Error("Error fetching sugerencias");
        setSugerencias(await res.json());
      } catch (err) {
        console.error("Error fetching sugerencias:", err);
      }
    };
    const timeout = setTimeout(fetchSugerencias, 300);
    return () => clearTimeout(timeout);
  }, [filtroNombre, vista]);


  const parseDateTime = (fecha, hora) => new Date(`${fecha}T${hora}:00`);

  //marca topes de horario
  const marcarTopes = (agendas) => {
    return agendas.map((a, i) => {
      let tope = false;
      for (let j = 0; j < agendas.length; j++) {
        if (i === j) continue;
        const startA = parseDateTime(a.fecha, a.hora_inicio);
        const endA = parseDateTime(a.fecha, a.hora_fin);
        const startB = parseDateTime(agendas[j].fecha, agendas[j].hora_inicio);
        const endB = parseDateTime(agendas[j].fecha, agendas[j].hora_fin);
    
        if (startA < endB && startB < endA) {
          tope = agendas[j].id;
          break;
        }
      }
      return { ...a, tope };
    });
  }
  const fetchAgendas = async () => {
    if (!desde || !hasta)
      return setModal({ tipo: "alerta", mensaje: "Debes seleccionar un rango de fechas" });

    try {
      setLoading(true);
      let url = "";

      if (vista === "box") {
        if (!filtroId) return setModal({ tipo: "alerta", mensaje: "Debes ingresar un ID de box" });
        url = `http://localhost:8000/api/box/${filtroId}/?desde=${desde}&hasta=${hasta}`;
      } else if (vista === "medico") {
        if (!filtroNombre) return setModal({ tipo: "alerta", mensaje: "Debes ingresar el nombre del médico" });
        url = `http://localhost:8000/api/medico/?medico=${encodeURIComponent(filtroNombre)}&desde=${desde}&hasta=${hasta}`;
      } else if (vista === "pasillo") {
        if (!pasilloSeleccionado) return setModal({ tipo: "alerta", mensaje: "Debes seleccionar un pasillo" });
        url = `http://localhost:8000/api/pasillo/?pasillo=${encodeURIComponent(pasilloSeleccionado)}&desde=${desde}&hasta=${hasta}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      const fetchedData = await res.json();

      const agendasProcesadas = fetchedData.map((a) => ({
        id: a.id || "-",
        box_id: a.box_id || filtroId || "-",
        fecha: a.fecha || a.start?.split("T")[0] || "-",
        hora_inicio: a.hora_inicio || a.start?.split("T")[1]?.slice(0, 5) || "-",
        hora_fin: a.hora_fin || a.end?.split("T")[1]?.slice(0, 5) || "-",
        tipo: a.tipo || a.extendedProps?.tipo || "-",
        responsable: a.responsable || a.medico || "-",
        observaciones: a.observaciones || "-",
      }));

      setAgendas(marcarTopes(agendasProcesadas));
    } catch (err) {
      console.error(err);
      setAgendas([]);
      setModal({ tipo: "alerta", mensaje: err.message });
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

  const modificarAgenda = async (e) => {
    e.preventDefault();

    const data = {
      fecha: modal.data.fecha,
      hora_inicio: modal.data.hora_inicio,
      hora_fin: modal.data.hora_fin,
      observaciones: modal.data.observaciones,
    };

    try {
      // Verificar disponibilidad antes de modificar
      const checkRes = await fetch(
        `http://localhost:8000/api/check_disponibilidad/?idbox=${modal.data.box_id}&fecha=${modal.data.fecha}&hora_inicio=${modal.data.hora_inicio}&hora_fin=${modal.data.hora_fin}&id_agenda=${modal.data.id}`
      );
      const checkData = await checkRes.json();
      if (!checkData.disponible) {
        return setModal({
          tipo: "alerta",
          mensaje: `Horario en conflicto con la agenda #${checkData.conflicto_id}`,
        });
      }

      const res = await fetch(
        `http://localhost:8000/api/reservas/${modal.data.id}/modificar/`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      setModal({ tipo: "alerta", mensaje: "Agenda modificada correctamente" });
      fetchAgendas();
    } catch (err) {
      setModal({ tipo: "alerta", mensaje: "Error modificando: " + err.message });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* ===== Agendamiento ===== */}
      <h1 className="text-center text-4xl font-bold mt-8 mb-3">Agendamiento</h1>
      <p className="text-center text-gray-600 text-lg mb-8">Selecciona el tipo de agenda que deseas crear</p>

      <div 
        className="flex flex-col md:flex-row gap-6"
        onMouseLeave={() => setTipoAgendamiento(null)} 
      >
        {/* Opción Médica */}
        <div
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
            <h2 className="text-xl font-semibold">Agendar Médica</h2>
            <p className="text-base">Consultas y procedimientos médicos</p>
          </div>
        </div>

        {/* Opción No Médica */}
        <div
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
            <h2 className="text-xl font-semibold">Agendar No Médica</h2>
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

      {/* Selector y filtros */}
      <div className="flex justify-center gap-2 mt-4 flex-wrap">
        {["box", "medico", "pasillo"].map((v) => (
          <button key={v} onClick={() => setVista(v)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    vista === v ? "bg-[#5FB799] text-white" : "bg-gray-200 hover:bg-gray-300"}`}>
            <Search className="w-4 h-4" /> {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center items-center gap-4 mt-6">
        {vista === "box" && <input type="number" placeholder="ID de box" value={filtroId} onChange={(e)=>setFiltroId(e.target.value)}
                                   className="border rounded px-3 py-2 w-full sm:w-auto" />}
        {vista === "medico" &&
          <div className="relative w-full sm:w-auto">
            <input type="text" placeholder="Nombre de médico" value={filtroNombre} onChange={(e)=>setFiltroNombre(e.target.value)}
                   className="border rounded px-3 py-2 w-full"/>
            {sugerencias.length>0 &&
              <ul className="absolute bg-white border w-full max-h-40 overflow-auto z-10">
                {sugerencias.map(s=>
                  <li key={s.id} onClick={()=>{setFiltroNombre(s.nombre); setSugerencias([])}}
                      className="px-2 py-1 hover:bg-gray-200 cursor-pointer">{s.nombre}</li>
                )}
              </ul>
            }
          </div>
        }
        {vista==="pasillo" &&
          <select value={pasilloSeleccionado} onChange={e=>setPasilloSeleccionado(e.target.value)}
                  className="border rounded px-3 py-2 w-full sm:w-auto">
            <option value="">Selecciona un pasillo</option>
            {pasillos.map((p,i)=><option key={i} value={p}>{p}</option>)}
          </select>
        }

        <input type="date" value={desde} onChange={e=>setDesde(e.target.value)} className="border rounded px-3 py-2 w-full sm:w-auto"/>
        <input type="date" value={hasta} onChange={e=>setHasta(e.target.value)} min={desde} className="border rounded px-3 py-2 w-full sm:w-auto"/>

        <button onClick={fetchAgendas} disabled={loading}
                className="flex items-center gap-2 bg-[#5FB799] text-white px-4 py-2 rounded-lg hover:bg-[#4fa986] transition w-full sm:w-auto">
          <Search className="w-4 h-4" /> {loading ? "Cargando..." : "Buscar"}
        </button>

        {agendas.length>0 &&
          <button onClick={exportExcel} className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-600 w-full sm:w-auto">
            <Download className="w-4 h-4"/> Exportar a Excel
          </button>
        }
      </div>

      {/* Tabla agendas */}
      {agendas.length>0 ? (
        <div className="overflow-x-auto mt-4 shadow rounded-lg">
          <table className="min-w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                {["Agenda ID","Box","Fecha","Hora Inicio","Hora Fin","Tipo","Responsable","Observaciones","Acciones"].map(h=>
                  <th key={h} className="px-4 py-2 border text-center">{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {agendas.map((a,i)=>(
                  <tr key={i} className={`hover:bg-gray-100 ${ a.tope ? "bg-red-200" : i % 2 === 0 ? "bg-gray-50" : "bg-white" }`}>
                  <td className="px-4 py-2 border">{a.id}</td>
                  <td className="px-4 py-2 border">{a.box_id}</td>
                  <td className="px-4 py-2 border">{a.fecha}</td>
                  <td className="px-4 py-2 border">{a.hora_inicio}</td>
                  <td className="px-4 py-2 border">{a.hora_fin}</td>
                  <td className="px-4 py-2 border">{a.tipo}</td>
                  <td className="px-4 py-2 border">{a.responsable}</td>
                  <td className="px-4 py-2 border">{a.tope ? `Tope con agenda #${a.tope}` : a.observaciones}</td>
                  <td className="px-4 py-2 border text-center">
                    <button className="text-yellow-500 hover:text-yellow-600 mr-3" onClick={()=>setModal({tipo:"editar",data:a})}>
                      <Edit2 className="w-5 h-5"/>
                    </button>
                    <button className="text-red-500 hover:text-red-600" onClick={()=>setModal({tipo:"eliminar",data:a})}>
                      <Trash2 className="w-5 h-5"/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-gray-500">No hay agendas para mostrar.</p>
      )}

      {/* Modal */}
      {modal.tipo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg w-96">
            {modal.tipo==="alerta" ? (
              <>
                <h2 className="text-xl font-bold mb-4">Aviso</h2>
                <p className="mb-6">{modal.mensaje}</p>
                <div className="flex justify-end">
                  <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={()=>setModal({tipo:null,data:null,mensaje:null})}>
                    Cerrar
                  </button>
                </div>
              </>
            ) : modal.tipo==="eliminar" ? (
              <>
                <h2 className="text-xl font-bold mb-4">Confirmar eliminación</h2>
                <p className="mb-6">¿Seguro que quieres eliminar la agenda #{modal.data.id}?</p>
                <div className="flex justify-end gap-3">
                  <button className="px-4 py-2 bg-gray-200 rounded" onClick={()=>setModal({tipo:null,data:null})}>Cancelar</button>
                  <button className="px-4 py-2 bg-red-500 text-white rounded" onClick={()=>eliminarAgenda(modal.data.id)}>Eliminar</button>
                </div>
              </>
            ) : modal.tipo==="editar" ? (
              <>
                <h2 className="text-xl font-bold mb-4">Modificar agenda #{modal.data.id}</h2>
                <form onSubmit={modificarAgenda} className="space-y-4">
                  <div>
                    <label className="block mb-1">Fecha</label>
                    <input
                      type="date"
                      value={modal.data.fecha}
                      onChange={(e) =>
                        setModal({ ...modal, data: { ...modal.data, fecha: e.target.value } })
                      }
                      className="border rounded px-3 py-2 w-full"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Hora inicio</label>
                    <input
                      type="time"
                      value={modal.data.hora_inicio}
                      onChange={(e) =>
                        setModal({ ...modal, data: { ...modal.data, hora_inicio: e.target.value } })
                      }
                      className="border rounded px-3 py-2 w-full"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Hora fin</label>
                    <input
                      type="time"
                      value={modal.data.hora_fin}
                      onChange={(e) =>
                        setModal({ ...modal, data: { ...modal.data, hora_fin: e.target.value } })
                      }
                      className="border rounded px-3 py-2 w-full"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Observaciones</label>
                    <textarea
                      value={modal.data.observaciones}
                      onChange={(e) =>
                        setModal({ ...modal, data: { ...modal.data, observaciones: e.target.value } })
                      }
                      className="border rounded px-3 py-2 w-full"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-200 rounded"
                      onClick={() => setModal({ tipo: null, data: null, mensaje: null })}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
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
  );
}

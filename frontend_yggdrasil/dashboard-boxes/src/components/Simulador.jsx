import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import useAuth from "../hooks/useAuth";

function UploadForm() {
  const [file, setFile] = useState(null);
  const [aprobados, setAprobados] = useState([]);
  const [desaprobados, setDesaprobados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };
  const handleConfirmarGuardar = async () => {
  try {
    const response = await fetch('http://localhost:8000/api/confirmar-agendas/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirm: true }), // solo un confirm simple
      credentials: 'include', // si usas cookies/sesión
    });

    if (response.ok) {
      alert("Agendas guardadas con éxito.");
      window.location.reload();
    } else {
      alert("Error al guardar agendas.");
    }
    
  } catch (error) {
    console.error(error);
    alert("Error de conexión con el servidor.");
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (!file) {
      alert("Selecciona un archivo primero.");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('archivo', file);  // "archivo" es el nombre que esperará Django

    try {
      const response = await fetch('http://localhost:8000/api/upload/', {
        method: 'POST',
        body: formData,
        credentials: 'include', // si necesitas cookies para la sesión
      });

      if (response.ok) {
        const data = await response.json();
        setAprobados(data.aprobados);
        setDesaprobados(data.desaprobados);
        alert('Archivo subido con éxito');
        console.log(data);
      } else {
        alert('Error al subir el archivo');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
      alert('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };
const renderTableWithPagination = (data) => {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  if (!data || data.length === 0) return <p className="text-gray-500">No hay datos.</p>;

  const headers = Object.keys(data[0]);
  const totalPages = Math.ceil(data.length / rowsPerPage);

  // Índices para cortar el array de datos según la página actual
  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = startIdx + rowsPerPage;
  const currentData = data.slice(startIdx, endIdx);
  const columnasMostrar = [
  { key: "id", title: "ID" },
  { 
    key: "fechaagenda", 
    title: "Fecha"
  },
  { 
    key: "horainicioagenda", 
    title: "Hora Inicio", 
    parse: (val) => val.slice(0,5) // asumiendo formato 'HH:mm:ss' y queremos 'HH:mm'
  },
  { 
    key: "horafinagenda", 
    title: "Hora Fin", 
    parse: (val) => val.slice(0,5) 
  },
  { key: "idbox", title: "ID Box" },
  { key: "idmedico", title: "ID Médico" },
];

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
          <thead className="bg-[#5FB799] text-white">
            <tr>
            {columnasMostrar.map(({ key, title }) => (
            <th key={key} className="text-left px-4 py-2 font-semibold tracking-wide">
                {title}
            </th>
            ))}
        </tr>
        </thead>
        <tbody>
        {currentData.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
            {columnasMostrar.map(({ key, parse }) => (
                <td key={key} className="px-4 py-2 border-t border-gray-200 text-gray-700">
                {parse ? parse(row[key]) : row[key]}
                </td>
            ))}
            </tr>
        ))}
        </tbody>
        </table>
      </div>

      {/* Controles de paginación */}
      <div className="flex justify-center mt-3 gap-2">
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded bg-[#5FB799] text-white disabled:bg-gray-300"
        >
          Anterior
        </button>

        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i + 1)}
            className={`px-3 py-1 rounded ${
              currentPage === i + 1 ? "bg-[#5FB799] text-white" : "bg-gray-200"
            }`}
          >
            {i + 1}
          </button>
        ))}

        <button
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded bg-[#5FB799] text-white disabled:bg-gray-300"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};

  return (
  <div className="min-h-screen bg-white relative pb-20 px-4 md:px-8">
    {/* Botón de volver */}
    <div className="flex justify-center mt-6 mb-3">
        <h1 className="center text-3xl font-semibold mb-3 text-[#5FB799]">Simulador de Agendas</h1>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Formulario */}
      <motion.div
        className="bg-white border border-[#5FB799] rounded-lg p-6 shadow space-y-4 col-span-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="file"
            accept=".csv, .xlsx"
            onChange={handleFileChange}
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5FB799]"
          />
          <button
            type="submit"
            disabled={loading}
            className={`bg-[#5FB799] text-white font-semibold py-2 rounded hover:bg-[#4a9979] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? "Subiendo..." : "Subir archivo"}
          </button>
        </form>
        <div
            className={`cursor-default bg-[#FFCF3C] text-white py-5 px-4 rounded-xl shadow-md flex flex-col justify-center items-center text-center border border-white`}
        >
            <div className="text-4xl font-bold">
            {desaprobados.length}
            </div>
            <div className="text-md mt-1">Conflictos totales</div>
        </div>
        <div
            className={`cursor-default bg-[#DB1866] text-white py-5 px-4 rounded-xl shadow-md flex flex-col justify-center items-center text-center `}
        >
            <div className="text-4xl font-bold">
            {aprobados.length}
            </div>
            <div className="text-md mt-1">Agendadas permitidas</div>
        </div>
        <button
        onClick={handleConfirmarGuardar}
        className="w-full mt-4 bg-[#5FB799] text-white font-semibold py-2 px-4 rounded hover:bg-[#4a9979] items-center text-center transition-colors  duration-200"
        >
        Guardar agendas permitidas
        </button>
      </motion.div>

      {/* Resultados */}
      <motion.div
        className="bg-white border border-[#5FB799] rounded-lg p-6 shadow space-y-6 col-span-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >

        {loading && <p className="text-gray-700">Cargando...</p>}
        {error && <p className="text-red-600">{error}</p>}

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-[#5FB799]">Conflictos</h2>
          {renderTableWithPagination(desaprobados)}
        </section>
      </motion.div>
    </div>
  </div>
);

}

export default UploadForm;
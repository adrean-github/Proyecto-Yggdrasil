import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Upload, Save, AlertTriangle, CheckCircle, Info } from "lucide-react";

function UploadForm() {
  const [file, setFile] = useState(null);
  const [aprobados, setAprobados] = useState([]);
  const [desaprobados, setDesaprobados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("conflictos");
  const [showInstructions, setShowInstructions] = useState(true);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleConfirmarGuardar = async () => {
    if (aprobados.length === 0) {
      alert("No hay agendas aprobadas para guardar.");
      return;
    }

    if (!window.confirm(`¿Estás seguro que deseas guardar ${aprobados.length} agendas?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/confirmar-agendas/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirm: true }),
        credentials: 'include',
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
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    if (!file) {
      setError("Por favor selecciona un archivo primero.");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('archivo', file);

    try {
      const response = await fetch('http://localhost:8000/api/upload/', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAprobados(data.aprobados || []);
        setDesaprobados(data.desaprobados || []);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al subir el archivo');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderTableWithPagination = (data) => {
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    if (!data || data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <Info className="w-12 h-12 mb-2" />
          <p>No hay datos para mostrar</p>
        </div>
      );
    }

    const columnasMostrar = [
      { key: "id", title: "ID" },
      { key: "fechaagenda", title: "Fecha" },
      { key: "horainicioagenda", title: "Hora Inicio", parse: (val) => val?.slice(0,5) || '' },
      { key: "horafinagenda", title: "Hora Fin", parse: (val) => val?.slice(0,5) || '' },
      { key: "idbox", title: "Box" },
      { key: "idmedico", title: "Médico" },
    ];

    const totalPages = Math.ceil(data.length / rowsPerPage);
    const startIdx = (currentPage - 1) * rowsPerPage;
    const endIdx = startIdx + rowsPerPage;
    const currentData = data.slice(startIdx, endIdx);

    return (
       <div className="space-y-4">
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={headerColor === "red-900" ? "bg-red-900" : "bg-[#005C48]"}>
              <tr>
                {columnasMostrar.map(({ key, title }) => (
                  <th 
                    key={key} 
                    className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider"
                  >
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  {columnasMostrar.map(({ key, parse }) => (
                    <td 
                      key={key} 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                    >
                      {parse ? parse(row[key]) : row[key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-gray-700">
            Mostrando <span className="font-medium">{startIdx + 1}</span> a{' '}
            <span className="font-medium">{Math.min(endIdx, data.length)}</span> de{' '}
            <span className="font-medium">{data.length}</span> registros
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>
            
            <div className="flex space-x-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    currentPage === i + 1 
                      ? "bg-[#005C48] text-white" 
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto pt-8 pb-6">
        <div className="text-center">
        <h1 className="text-center text-4xl font-bold mt-8 mb-3">Simulador de agendas</h1>
        <p className="text-center text-gray-600 text-lg mb-8">Carga y valida tus archivos de agenda para detectar conflictos</p>

        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel izquierdo - Formulario */}
        <div className="space-y-6">
          <motion.div 
            className="bg-white overflow-hidden shadow rounded-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900">Subir archivo</h2>
              
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seleccionar archivo
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-[#005C48] hover:text-[#118154] focus-within:outline-none">
                          <span>Sube un archivo</span>
                          <input 
                            type="file" 
                            accept=".csv, .xlsx" 
                            onChange={handleFileChange}
                            className="sr-only"
                          />
                        </label>
                        <p className="pl-1">o arrástralo aquí</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        Formatos soportados: CSV, XLSX (Excel)
                      </p>
                      {file && (
                        <p className="mt-2 text-sm text-gray-900">
                          <CheckCircle className="inline w-4 h-4 text-green-500 mr-1" />
                          {file.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">{error}</h3>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !file}
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#005C48] hover:bg-[#118154] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005C48] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Validar archivo
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>

          {/* Estadísticas */}
          <motion.div 
            className="bg-white overflow-hidden shadow rounded-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900">Resumen</h2>
              <dl className="mt-5 grid grid-cols-2 gap-5">
                <div className="px-4 py-5 bg-green-50 rounded-lg overflow-hidden shadow sm:p-6">
                  <dt className="text-sm font-medium text-green-800 truncate">Agendas válidas</dt>
                  <dd className="mt-1 text-3xl font-semibold text-green-900">{aprobados.length}</dd>
                </div>
                <div className="px-4 py-5 bg-red-50 rounded-lg overflow-hidden shadow sm:p-6">
                  <dt className="text-sm font-medium text-red-800 truncate">Conflictos</dt>
                  <dd className="mt-1 text-3xl font-semibold text-red-900">{desaprobados.length}</dd>
                </div>
              </dl>
            </div>
          </motion.div>

          {/* Botón de guardar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <button
              onClick={handleConfirmarGuardar}
              disabled={aprobados.length === 0 || loading}
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#005C48] hover:bg-[#118154] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005C48] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar agendas válidas
                </>
              )}
            </button>
          </motion.div>

          {/* Instrucciones */}
          {showInstructions && (
            <motion.div 
              className="bg-blue-50 rounded-lg p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-blue-900">¿Cómo usar?</h3>
                  <div className="mt-2 text-sm text-blue-800">
                    <p className="mb-2">1. Sube un archivo CSV o Excel con las agendas</p>
                    <p className="mb-2">2. El sistema validará los datos y mostrará conflictos</p>
                    <p>3. Revisa y guarda solo las agendas válidas</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowInstructions(false)}
                  className="ml-2 text-blue-500 hover:text-blue-700"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Panel derecho - Resultados */}
        <motion.div
          className="bg-white overflow-hidden shadow rounded-lg lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Resultados de validación</h2>
              <nav className="flex space-x-4">
                <button
                  onClick={() => setActiveTab("conflictos")}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === "conflictos"
                      ? "bg-red-900 text-white"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Conflictos
                </button>
                <button
                  onClick={() => setActiveTab("aprobados")}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === "aprobados"
                      ? "bg-[#005C48] text-white"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Agendas válidas
                </button>
              </nav>
            </div>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="animate-spin h-8 w-8 text-[#005C48]" />
              </div>
            ) : (
              <>
                {activeTab === "conflictos"
                  ? (
                      <>
                        <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                          <AlertTriangle className="text-red-500 mr-2" />
                          {desaprobados.length} conflictos detectados
                        </h3>
                        {renderTableWithPagination(desaprobados, "red-900")}
                      </>
                    )
                  : (
                      <>
                        <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                          <CheckCircle className="text-green-500 mr-2" />
                          {aprobados.length} agendas válidas
                        </h3>
                        {renderTableWithPagination(aprobados, "[#005C48]")}
                      </>
                    )
                }
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default UploadForm;
import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Upload, Save, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { buildApiUrl } from "../config/api";

function UploadForm() {
  const [file, setFile] = useState(null);
  const [aprobados, setAprobados] = useState([]);
  const [desaprobados, setDesaprobados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("conflictos");
  const [showInstructions, setShowInstructions] = useState(true);
  
  // Estados de paginación separados
  const [currentPageConflictos, setCurrentPageConflictos] = useState(1);
  const [currentPageAprobados, setCurrentPageAprobados] = useState(1);

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
      const response = await fetch(buildApiUrl('/api/confirmar-agendas/'), {
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
      const response = await fetch(buildApiUrl('/api/upload/'), {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAprobados(data.aprobados || []);
        setDesaprobados(data.desaprobados || []);
        // Resetear paginación cuando se cargan nuevos datos
        setCurrentPageConflictos(1);
        setCurrentPageAprobados(1);
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

  const renderTableWithPagination = (data, headerColorType = "default") => {
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    if (!data || data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8" style={{ color: 'var(--text-muted)' }}>
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

    const headerColors = {
      default: {
        bg: 'var(--accent-color, #005C48)',
        text: 'white'
      },
      error: {
        bg: 'var(--danger-bg)',
        text: 'var(--danger-text)'
      }
    };

    const headerStyle = headerColors[headerColorType] || headerColors.default;

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-lg shadow-sm" style={{ border: '1px solid var(--border-color)' }}>
          <table className="min-w-full divide-y" style={{ borderColor: 'var(--border-color)' }}>
            <thead style={{ backgroundColor: headerStyle.bg }}>
              <tr>
                {columnasMostrar.map(({ key, title }) => (
                  <th 
                    key={key} 
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: headerStyle.text }}
                  >
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {currentData.map((row, idx) => (
                <tr key={idx} style={{ 
                  backgroundColor: idx % 2 === 0 ? 'var(--bg-color)' : 'var(--bg-secondary)' 
                }}>
                  {columnasMostrar.map(({ key, parse }) => (
                    <td 
                      key={key} 
                      className="px-6 py-4 whitespace-nowrap text-sm"
                      style={{ color: 'var(--text-color)' }}
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
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Mostrando <span className="font-medium">{startIdx + 1}</span> a{' '}
            <span className="font-medium">{Math.min(endIdx, data.length)}</span> de{' '}
            <span className="font-medium">{data.length}</span> registros
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-md text-sm font-medium"
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-color)',
                color: 'var(--text-color)',
                opacity: currentPage === 1 ? 0.5 : 1
              }}
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
                      ? "text-white" 
                      : "border"
                  }`}
                  style={{
                    backgroundColor: currentPage === i + 1 
                      ? 'var(--accent-color, #005C48)' 
                      : 'var(--bg-color)',
                    borderColor: currentPage === i + 1 
                      ? 'var(--accent-color, #005C48)' 
                      : 'var(--border-color)',
                    color: currentPage === i + 1 
                      ? 'white' 
                      : 'var(--text-color)'
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-md text-sm font-medium"
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-color)',
                color: 'var(--text-color)',
                opacity: currentPage === totalPages ? 0.5 : 1
              }}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div className="max-w-7xl mx-auto pt-8 pb-6">
        <div className="text-center">
          <h1 className="text-center text-4xl font-bold mt-8 mb-3" style={{ color: 'var(--text-color)' }}>
            Simulador de agendas
          </h1>
          <p className="text-center text-lg mb-8" style={{ color: 'var(--text-muted)' }}>
            Carga y valida tus archivos de agenda para detectar conflictos
          </p>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel izquierdo - Formulario */}
        <div className="space-y-6">
          <motion.div 
            className="overflow-hidden shadow rounded-lg"
            style={{ backgroundColor: 'var(--bg-color)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium" style={{ color: 'var(--text-color)' }}>Subir archivo</h2>
              
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>
                    Seleccionar archivo
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md" 
                       style={{ borderColor: 'var(--border-color)' }}>
                    <div className="space-y-1 text-center">
                      <div className="flex text-sm" style={{ color: 'var(--text-muted)' }}>
                        <label className="relative cursor-pointer rounded-md font-medium" 
                               style={{ color: 'var(--accent-color)' }}>
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
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Formatos soportados: CSV, XLSX (Excel)
                      </p>
                      {file && (
                        <p className="mt-2 text-sm" style={{ color: 'var(--text-color)' }}>
                          <CheckCircle className="inline w-4 h-4 mr-1" style={{ color: 'var(--success-text)' }} />
                          {file.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-md p-4" style={{ backgroundColor: 'var(--danger-bg)' }}>
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-5 w-5" style={{ color: 'var(--danger-text)' }} />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium" style={{ color: 'var(--danger-text)' }}>{error}</h3>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !file}
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: 'var(--accent-color)',
                    color: 'white'
                  }}
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
            className="overflow-hidden shadow rounded-lg"
            style={{ backgroundColor: 'var(--bg-color)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium" style={{ color: 'var(--text-color)' }}>Resumen</h2>
              <dl className="mt-5 grid grid-cols-2 gap-5">
                <div className="px-4 py-5 rounded-lg overflow-hidden shadow sm:p-6" 
                     style={{ backgroundColor: 'var(--success-bg)' }}>
                  <dt className="text-sm font-medium truncate" style={{ color: 'var(--success-text)' }}>Agendas válidas</dt>
                  <dd className="mt-1 text-3xl font-semibold" style={{ color: 'var(--success-text)' }}>{aprobados.length}</dd>
                </div>
                <div className="px-4 py-5 rounded-lg overflow-hidden shadow sm:p-6" 
                     style={{ backgroundColor: 'var(--danger-bg)' }}>
                  <dt className="text-sm font-medium truncate" style={{ color: 'var(--danger-text)' }}>Conflictos</dt>
                  <dd className="mt-1 text-3xl font-semibold" style={{ color: 'var(--danger-text)' }}>{desaprobados.length}</dd>
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
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: 'var(--accent-color)',
                color: 'white'
              }}
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
              className="rounded-lg p-4"
              style={{ backgroundColor: 'var(--info-bg)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--info-text)' }}>¿Cómo usar?</h3>
                  <div className="mt-2 text-sm" style={{ color: 'var(--info-text)' }}>
                    <p className="mb-2">1. Sube un archivo CSV o Excel con las agendas</p>
                    <p className="mb-2">2. El sistema validará los datos y mostrará conflictos</p>
                    <p>3. Revisa y guarda solo las agendas válidas</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowInstructions(false)}
                  style={{ color: 'var(--info-text)' }}
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
          className="overflow-hidden shadow rounded-lg lg:col-span-2"
          style={{ backgroundColor: 'var(--bg-color)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="px-4 py-5 sm:px-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-medium text-center sm:text-left" style={{ color: 'var(--text-color)' }}>
                Resultados de validación
              </h2>
              
              {/* Contenedor de pestañas con diseño responsive */}
              <div className="flex flex-col xs:flex-row gap-2 justify-center sm:justify-end">
                <div className="flex justify-center sm:justify-end">
                  <button
                    onClick={() => setActiveTab("conflictos")}
                    className={`px-3 py-2 text-sm font-medium rounded-md w-full xs:w-auto text-center ${
                      activeTab === "conflictos" ? "text-white" : ""
                    }`}
                    style={{
                      backgroundColor: activeTab === "conflictos" 
                        ? 'var(--danger-bg)' 
                        : 'var(--bg-secondary)',
                      color: activeTab === "conflictos" 
                        ? 'var(--danger-text)' 
                        : 'var(--text-color)'
                    }}
                  >
                    Conflictos {desaprobados.length > 0 && `(${desaprobados.length})`}
                  </button>
                </div>
                <div className="flex justify-center sm:justify-end">
                  <button
                    onClick={() => setActiveTab("aprobados")}
                    className={`px-3 py-2 text-sm font-medium rounded-md w-full xs:w-auto text-center ${
                      activeTab === "aprobados" ? "text-white" : ""
                    }`}
                    style={{
                      backgroundColor: activeTab === "aprobados" 
                        ? 'var(--accent-color)' 
                        : 'var(--bg-secondary)',
                      color: activeTab === "aprobados" 
                        ? 'white' 
                        : 'var(--text-color)'
                    }}
                  >
                    Agendas válidas {aprobados.length > 0 && `(${aprobados.length})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="animate-spin h-8 w-8" style={{ color: 'var(--accent-color)' }} />
              </div>
            ) : (
              <>
                {activeTab === "conflictos"
                  ? (
                      <>
                        <h3 className="text-md font-medium mb-4 flex items-center justify-center sm:justify-start" 
                            style={{ color: 'var(--text-color)' }}>
                          <AlertTriangle className="mr-2" style={{ color: 'var(--danger-text)' }} />
                          {desaprobados.length} conflictos detectados
                        </h3>
                        {renderTableWithPagination(desaprobados, "error")}
                      </>
                    )
                  : (
                      <>
                        <h3 className="text-md font-medium mb-4 flex items-center justify-center sm:justify-start" 
                            style={{ color: 'var(--text-color)' }}>
                          <CheckCircle className="mr-2" style={{ color: 'var(--success-text)' }} />
                          {aprobados.length} agendas válidas
                        </h3>
                        {renderTableWithPagination(aprobados)}
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
import React, { useState, useEffect } from "react";
import { X, Package, Wrench, CheckCircle, AlertTriangle, Calendar, ExternalLink, Settings, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { buildApiUrl } from "../config/api";

export default function InventarioModal({ boxId, isOpen, onClose }) {
  const [inventario, setInventario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actualizandoEstado, setActualizandoEstado] = useState(null);
  const [modalEstado, setModalEstado] = useState(false);
  const [implementoSeleccionado, setImplementoSeleccionado] = useState(null);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (isOpen && boxId) {
      fetchInventario();
    }
  }, [isOpen, boxId]);

  const fetchInventario = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(buildApiUrl(`/api/inventario/${boxId}/`), {
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setInventario(result.data);
        } else {
          setError(result.error || "Error al cargar el inventario");
        }
      } else if (response.status === 404) {
        setError("No se encontró inventario para este box");
      } else {
        setError("Error al cargar el inventario");
      }
    } catch (err) {
      setError("Error de conexión al cargar el inventario");
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "No definida";
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEstadoImplemento = (implemento) => {
    if (implemento.operacional) {
      return {
        icon: CheckCircle,
        color: "var(--success-text)",
        bg: "var(--success-bg)",
        border: "var(--success-border)",
        label: "Operacional"
      };
    } else {
      return {
        icon: AlertTriangle,
        color: "var(--danger-text)", 
        bg: "var(--danger-bg)",
        border: "var(--danger-border)",
        label: "Requiere Mantenimiento"
      };
    }
  };

  const cambiarEstadoImplemento = async (nombreImplemento, nuevoEstado, observacionesPersonalizadas = '') => {
    try {
      setActualizandoEstado(nombreImplemento);
      
      const response = await fetch(buildApiUrl(`/api/inventario/${boxId}/`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: nombreImplemento,
          accion: 'actualizar_estado',
          operacional: nuevoEstado,
          observaciones: observacionesPersonalizadas || (nuevoEstado ? 'Implemento habilitado desde interfaz' : 'Implemento deshabilitado desde interfaz')
        }),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        // Actualizar el inventario local
        setInventario(prev => ({
          ...prev,
          implementos: prev.implementos.map(impl => 
            impl.nombre === nombreImplemento 
              ? { ...impl, operacional: nuevoEstado, observaciones: data.implemento.observaciones }
              : impl
          ),
          implementos_operacionales: prev.implementos_operacionales + (nuevoEstado ? 1 : -1),
          implementos_no_operacionales: prev.implementos_no_operacionales + (nuevoEstado ? -1 : 1)
        }));

        setModalEstado(false);
        setImplementoSeleccionado(null);
        setObservaciones('');
      } else {
        // Manejo mejorado de errores
        let errorMessage = 'Error al actualizar estado';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          // Si no es JSON válido, usar mensaje basado en el status
          if (response.status === 404) {
            errorMessage = 'Implemento no encontrado';
          } else if (response.status === 400) {
            errorMessage = 'Datos inválidos enviados';
          } else if (response.status === 403) {
            errorMessage = 'Sin permisos para realizar esta acción';
          } else if (response.status >= 500) {
            errorMessage = 'Error interno del servidor';
          }
        }
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setActualizandoEstado(null);
    }
  };

  const abrirModalEstado = (implemento) => {
    setImplementoSeleccionado(implemento);
    setObservaciones('');
    setModalEstado(true);
  };

  const confirmarCambioEstado = () => {
    if (implementoSeleccionado) {
      cambiarEstadoImplemento(
        implementoSeleccionado.nombre, 
        !implementoSeleccionado.operacional, 
        observaciones
      );
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
        <motion.div
          className="rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden transition-colors duration-300"
          style={{ backgroundColor: 'var(--bg-color)' }}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div 
            className="text-white p-6 flex items-center justify-between transition-colors duration-300"
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            <div className="flex items-center gap-3">
              <Package size={24} />
              <div>
                <h2 className="text-xl font-bold">Inventario - Box #{boxId}</h2>
                <p className="opacity-90 text-sm">Equipos e implementos médicos</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-black hover:bg-opacity-20 rounded-lg transition-all duration-300"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(90vh - 120px)" }}>
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div 
                  className="flex items-center gap-3 transition-colors duration-300"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Package size={20} className="animate-pulse" />
                  <span>Cargando inventario...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertTriangle 
                    size={48} 
                    className="mx-auto mb-4 transition-colors duration-300" 
                    style={{ color: 'var(--text-muted)' }}
                  />
                  <p 
                    className="mb-4 transition-colors duration-300" 
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {error}
                  </p>
                  <button
                    onClick={fetchInventario}
                    className="px-4 py-2 text-white rounded-lg hover:brightness-110 transition-all duration-300"
                    style={{ backgroundColor: 'var(--accent-color)' }}
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}

            {inventario && (
              <div className="space-y-6">
                {/* Resumen */}
                <div 
                  className="rounded-lg p-4 transition-colors duration-300"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <div 
                        className="text-2xl font-bold transition-colors duration-300"
                        style={{ color: 'var(--text-color)' }}
                      >
                        {inventario.total_implementos || 0}
                      </div>
                      <div 
                        className="text-sm transition-colors duration-300"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Total Implementos
                      </div>
                    </div>
                    <div>
                      <div 
                        className="text-2xl font-bold transition-colors duration-300"
                        style={{ color: 'var(--success-text)' }}
                      >
                        {inventario.implementos_operacionales || 0}
                      </div>
                      <div 
                        className="text-sm transition-colors duration-300"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Operacionales
                      </div>
                    </div>
                    <div>
                      <div 
                        className="text-2xl font-bold transition-colors duration-300"
                        style={{ color: 'var(--danger-text)' }}
                      >
                        {inventario.implementos_no_operacionales || 0}
                      </div>
                      <div 
                        className="text-sm transition-colors duration-300"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Mantenimiento
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lista de implementos */}
                {inventario.implementos && inventario.implementos.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {inventario.implementos.map((implemento, index) => {
                      const estado = getEstadoImplemento(implemento);
                      const IconoEstado = estado.icon;
                      const estaActualizando = actualizandoEstado === implemento.nombre;
                      
                      return (
                        <motion.div
                          key={index}
                          className="border rounded-lg p-4 transition-all duration-300"
                          style={{
                            backgroundColor: estado.bg,
                            borderColor: estado.border
                          }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 
                                className="font-semibold text-lg transition-colors duration-300"
                                style={{ color: 'var(--text-color)' }}
                              >
                                {implemento.nombre}
                              </h3>
                              <p 
                                className="text-sm transition-colors duration-300"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                {implemento.descripcion}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div 
                                className="flex items-center gap-1 transition-colors duration-300"
                                style={{ color: estado.color }}
                              >
                                <IconoEstado size={16} />
                                <span className="text-xs font-medium">{estado.label}</span>
                              </div>
                              
                              {/* Botón para cambiar estado */}
                              <button
                                onClick={() => abrirModalEstado(implemento)}
                                disabled={estaActualizando}
                                className="p-1.5 rounded-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2"
                                style={{
                                  backgroundColor: 'var(--bg-color)',
                                  color: 'var(--text-color)',
                                  borderColor: 'var(--border-color)',
                                  focusRingColor: 'var(--accent-color)'
                                }}
                                title={implemento.operacional ? "Deshabilitar implemento" : "Habilitar implemento"}
                              >
                                {estaActualizando ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Settings size={14} />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                            <div>
                              <span 
                                className="transition-colors duration-300"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                Marca:
                              </span>
                              <span 
                                className="ml-1 font-medium transition-colors duration-300"
                                style={{ color: 'var(--text-color)' }}
                              >
                                {implemento.marca || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span 
                                className="transition-colors duration-300"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                Modelo:
                              </span>
                              <span 
                                className="ml-1 font-medium transition-colors duration-300"
                                style={{ color: 'var(--text-color)' }}
                              >
                                {implemento.modelo || 'N/A'}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span 
                                className="transition-colors duration-300"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                Serie:
                              </span>
                              <span 
                                className="ml-1 font-medium text-xs transition-colors duration-300"
                                style={{ color: 'var(--text-color)' }}
                              >
                                {implemento.numero_serie || 'N/A'}
                              </span>
                            </div>
                          </div>

                          {(implemento.fecha_ultimo_mantenimiento || implemento.fecha_proximo_mantenimiento) && (
                            <div 
                              className="border-t pt-3 mt-3 transition-colors duration-300"
                              style={{ borderColor: 'var(--border-color)' }}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Wrench 
                                  size={14} 
                                  className="transition-colors duration-300" 
                                  style={{ color: 'var(--text-muted)' }}
                                />
                                <span 
                                  className="text-xs font-medium transition-colors duration-300"
                                  style={{ color: 'var(--text-color)' }}
                                >
                                  Mantenimiento
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {implemento.fecha_ultimo_mantenimiento && (
                                  <div>
                                    <span 
                                      className="transition-colors duration-300"
                                      style={{ color: 'var(--text-muted)' }}
                                    >
                                      Último:
                                    </span>
                                    <span 
                                      className="ml-1 transition-colors duration-300"
                                      style={{ color: 'var(--text-color)' }}
                                    >
                                      {formatFecha(implemento.fecha_ultimo_mantenimiento)}
                                    </span>
                                  </div>
                                )}
                                {implemento.fecha_proximo_mantenimiento && (
                                  <div>
                                    <span 
                                      className="transition-colors duration-300"
                                      style={{ color: 'var(--text-muted)' }}
                                    >
                                      Próximo:
                                    </span>
                                    <span 
                                      className="ml-1 transition-colors duration-300"
                                      style={{ color: 'var(--text-color)' }}
                                    >
                                      {formatFecha(implemento.fecha_proximo_mantenimiento)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {implemento.observaciones && (
                            <div 
                              className="mt-3 p-2 rounded text-xs transition-colors duration-300"
                              style={{ backgroundColor: 'var(--bg-color)', opacity: 0.8 }}
                            >
                              <span 
                                className="transition-colors duration-300"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                Observaciones:
                              </span>
                              <span 
                                className="ml-1 transition-colors duration-300"
                                style={{ color: 'var(--text-color)' }}
                              >
                                {implemento.observaciones}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package 
                      size={48} 
                      className="mx-auto mb-4 transition-colors duration-300" 
                      style={{ color: 'var(--text-muted)' }}
                    />
                    <p 
                      className="transition-colors duration-300"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      No hay implementos registrados en este box
                    </p>
                  </div>
                )}

                {/* Metadata */}
                {inventario.updated_at && (
                  <div 
                    className="border-t pt-4 mt-6 transition-colors duration-300"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <div 
                      className="flex items-center justify-between text-sm transition-colors duration-300"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        <span>Última actualización: {formatFecha(inventario.updated_at)}</span>
                      </div>
                      {inventario.updated_by && (
                        <span>Actualizado por: {inventario.updated_by}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal para cambio de estado */}
          <AnimatePresence>
            {modalEstado && implementoSeleccionado && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
                <motion.div
                  className="rounded-lg shadow-xl max-w-md w-full p-6"
                  style={{ backgroundColor: 'var(--bg-color)' }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <div className="mb-4">
                    <h3 
                      className="text-lg font-semibold mb-2"
                      style={{ color: 'var(--text-color)' }}
                    >
                      {implementoSeleccionado.operacional ? 'Deshabilitar' : 'Habilitar'} Implemento
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      ¿Deseas {implementoSeleccionado.operacional ? 'deshabilitar' : 'habilitar'} el implemento "{implementoSeleccionado.nombre}"?
                    </p>
                  </div>

                  <div className="mb-4">
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ color: 'var(--text-color)' }}
                    >
                      Observaciones (opcional)
                    </label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Motivo del cambio de estado..."
                      className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 transition-all duration-300"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-color)',
                        focusRingColor: 'var(--accent-color)'
                      }}
                      rows="3"
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => {
                        setModalEstado(false);
                        setImplementoSeleccionado(null);
                        setObservaciones('');
                      }}
                      className="px-4 py-2 border rounded-lg transition-all duration-300 hover:brightness-95"
                      style={{
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-color)',
                        backgroundColor: 'var(--bg-secondary)'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmarCambioEstado}
                      disabled={actualizandoEstado}
                      className="px-4 py-2 text-white rounded-lg transition-all duration-300 hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
                      style={{ 
                        backgroundColor: implementoSeleccionado.operacional ? 'var(--danger-bg)' : 'var(--success-bg)',
                        color: implementoSeleccionado.operacional ? 'var(--danger-text)' : 'var(--success-text)'
                      }}
                    >
                      {actualizandoEstado ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Actualizando...
                        </>
                      ) : (
                        <>
                          {implementoSeleccionado.operacional ? (
                            <AlertTriangle size={16} />
                          ) : (
                            <CheckCircle size={16} />
                          )}
                          {implementoSeleccionado.operacional ? 'Deshabilitar' : 'Habilitar'}
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Toast de error */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="fixed bottom-4 right-4 p-4 rounded-lg shadow-lg max-w-sm z-50 flex items-center gap-3"
                style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)' }}
                initial={{ opacity: 0, y: 50, x: 100 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: 50, x: 100 }}
              >
                <AlertTriangle size={20} />
                <div className="flex-1">
                  <p className="font-medium">Error</p>
                  <p className="text-sm opacity-90">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
                >
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
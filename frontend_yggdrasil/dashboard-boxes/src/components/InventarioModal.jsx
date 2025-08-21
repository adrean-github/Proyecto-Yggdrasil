import React, { useState, useEffect } from "react";
import { X, Package, Wrench, CheckCircle, AlertTriangle, Calendar, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { buildApiUrl } from "../config/api";

export default function InventarioModal({ boxId, isOpen, onClose }) {
  const [inventario, setInventario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        color: "text-green-600",
        bg: "bg-green-50",
        border: "border-green-200",
        label: "Operacional"
      };
    } else {
      return {
        icon: AlertTriangle,
        color: "text-red-600", 
        bg: "bg-red-50",
        border: "border-red-200",
        label: "Requiere Mantenimiento"
      };
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
        <motion.div
          className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="bg-[#1B5D52] text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package size={24} />
              <div>
                <h2 className="text-xl font-bold">Inventario - Box #{boxId}</h2>
                <p className="text-green-100 text-sm">Equipos e implementos médicos</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-green-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(90vh - 120px)" }}>
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-gray-600">
                  <Package size={20} className="animate-pulse" />
                  <span>Cargando inventario...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertTriangle size={48} className="text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">{error}</p>
                  <button
                    onClick={fetchInventario}
                    className="px-4 py-2 bg-[#1B5D52] text-white rounded-lg hover:bg-[#14463d] transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}

            {inventario && (
              <div className="space-y-6">
                {/* Resumen */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-800">
                        {inventario.total_implementos || 0}
                      </div>
                      <div className="text-sm text-gray-600">Total Implementos</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {inventario.implementos_operacionales || 0}
                      </div>
                      <div className="text-sm text-gray-600">Operacionales</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {inventario.implementos_no_operacionales || 0}
                      </div>
                      <div className="text-sm text-gray-600">Mantenimiento</div>
                    </div>
                  </div>
                </div>

                {/* Lista de implementos */}
                {inventario.implementos && inventario.implementos.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {inventario.implementos.map((implemento, index) => {
                      const estado = getEstadoImplemento(implemento);
                      const IconoEstado = estado.icon;
                      
                      return (
                        <motion.div
                          key={index}
                          className={`border rounded-lg p-4 ${estado.bg} ${estado.border}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-800 text-lg">
                                {implemento.nombre}
                              </h3>
                              <p className="text-gray-600 text-sm">
                                {implemento.descripcion}
                              </p>
                            </div>
                            <div className={`flex items-center gap-1 ${estado.color}`}>
                              <IconoEstado size={16} />
                              <span className="text-xs font-medium">{estado.label}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                            <div>
                              <span className="text-gray-500">Marca:</span>
                              <span className="ml-1 font-medium">{implemento.marca || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Modelo:</span>
                              <span className="ml-1 font-medium">{implemento.modelo || 'N/A'}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-500">Serie:</span>
                              <span className="ml-1 font-medium text-xs">
                                {implemento.numero_serie || 'N/A'}
                              </span>
                            </div>
                          </div>

                          {(implemento.fecha_ultimo_mantenimiento || implemento.fecha_proximo_mantenimiento) && (
                            <div className="border-t border-gray-200 pt-3 mt-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Wrench size={14} className="text-gray-500" />
                                <span className="text-xs font-medium text-gray-700">Mantenimiento</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {implemento.fecha_ultimo_mantenimiento && (
                                  <div>
                                    <span className="text-gray-500">Último:</span>
                                    <span className="ml-1">{formatFecha(implemento.fecha_ultimo_mantenimiento)}</span>
                                  </div>
                                )}
                                {implemento.fecha_proximo_mantenimiento && (
                                  <div>
                                    <span className="text-gray-500">Próximo:</span>
                                    <span className="ml-1">{formatFecha(implemento.fecha_proximo_mantenimiento)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {implemento.observaciones && (
                            <div className="mt-3 p-2 bg-white/50 rounded text-xs">
                              <span className="text-gray-500">Observaciones:</span>
                              <span className="ml-1">{implemento.observaciones}</span>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package size={48} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No hay implementos registrados en este box</p>
                  </div>
                )}

                {/* Metadata */}
                {inventario.updated_at && (
                  <div className="border-t border-gray-200 pt-4 mt-6">
                    <div className="flex items-center justify-between text-sm text-gray-500">
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

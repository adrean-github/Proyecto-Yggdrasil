// components/MimirResolver.jsx
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Check,
  AlertTriangle,
  Clock,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { buildApiUrl } from "../config/api";

/**
 * MimirResolver - Componente mejorado con soporte para dark mode
 * Adaptado para seguir las convenciones de colores del sistema
 */

const parseJsonSafe = async (response) => {
  const ct = response.headers.get?.("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return await response.json();
    } catch (err) {
      return null;
    }
  }
  return null;
};

const MimirResolver = ({ conflictos = [], onResolver = () => {} }) => {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [conflictoSeleccionado, setConflictoSeleccionado] = useState(null);
  const [recomendaciones, setRecomendaciones] = useState(null);
  const [recomendacionesMap, setRecomendacionesMap] = useState({});
  const [loadingMap, setLoadingMap] = useState({});
  const [globalLoading, setGlobalLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [applyingAll, setApplyingAll] = useState(false);
  const total = conflictos.length;

  useEffect(() => {
    if (!mostrarModal) {
      setConflictoSeleccionado(null);
      setRecomendaciones(null);
      setCurrentIndex(0);
    }
  }, [mostrarModal]);

  const setLoadingFor = (id, val) =>
    setLoadingMap((prev) => ({ ...prev, [id]: val }));

  const fetchRecommendationsFor = useCallback(
    async (conflicto) => {
      if (!conflicto) return null;
      const id = conflicto.id;
      
      if (recomendacionesMap[id]) {
        setConflictoSeleccionado(conflicto);
        setRecomendaciones(recomendacionesMap[id]);
        return recomendacionesMap[id];
      }

      try {
        setLoadingFor(id, true);
        const response = await fetch(buildApiUrl("/api/resolver-tope/"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            reservas: [conflicto.id, conflicto.tope],
          }),
        });

        if (!response.ok && response.status !== 204) {
          const txt = await parseJsonSafe(response);
          console.error("API resolver-tope error", response.status, txt);
          setLoadingFor(id, false);
          return null;
        }

        const data = await parseJsonSafe(response);
        setRecomendacionesMap((prev) => ({ ...prev, [id]: data }));
        setConflictoSeleccionado(conflicto);
        setRecomendaciones(data);
        return data;
      } catch (err) {
        console.error("Error fetching recommendations:", err);
        return null;
      } finally {
        setLoadingFor(id, false);
      }
    },
    [recomendacionesMap]
  );

  const resolverConflicto = async (conflicto) => {
    setGlobalLoading(true);
    await fetchRecommendationsFor(conflicto);
    setMostrarModal(true);
    setGlobalLoading(false);
  };

  const abrirResolverTodos = async () => {
    if (total === 0) return;
    setMostrarModal(true);
    setCurrentIndex(0);
    const first = conflictos[0];
    await fetchRecommendationsFor(first);
  };

  const handlePrev = async () => {
    if (currentIndex <= 0) return;
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    const conflicto = conflictos[newIndex];
    await fetchRecommendationsFor(conflicto);
  };

  const handleNext = async () => {
    if (currentIndex >= total - 1) return;
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    const conflicto = conflictos[newIndex];
    await fetchRecommendationsFor(conflicto);
  };

  const aplicarSolucion = async (
    reservaId,
    boxDestino,
    { closeOnSuccess = true, skipRefresh = false } = {}
  ) => {
    if (!boxDestino) {
      console.warn("No hay boxDestino para aplicar");
      return { ok: false, reason: "no_box" };
    }

    try {
      setGlobalLoading(true);
      const response = await fetch(buildApiUrl("/api/aplicar-solucion/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${localStorage.getItem("token") || ""}`,
        },
        credentials: "include",
        body: JSON.stringify({
          reserva_id: reservaId,
          box_destino: boxDestino,
          comentario: "Resuelto automáticamente por Mimir IA",
        }),
      });

      if (!response.ok && response.status !== 204) {
        const body = await parseJsonSafe(response);
        console.error("aplicar-solucion failed:", response.status, body);
        setGlobalLoading(false);
        return { ok: false, status: response.status, body };
      }

      const data = await parseJsonSafe(response);
      const success = data?.mensaje || response.ok || response.status === 204;

      if (success) {
        if (!skipRefresh && typeof onResolver === "function") {
          try {
            onResolver();
          } catch (e) {
            console.warn("onResolver callback failed", e);
          }
        }
        if (closeOnSuccess) {
          setMostrarModal(false);
        }
        setGlobalLoading(false);
        return { ok: true, data };
      } else {
        setGlobalLoading(false);
        return { ok: false, data };
      }
    } catch (err) {
      console.error("Error aplicando solución:", err);
      setGlobalLoading(false);
      return { ok: false, error: err };
    }
  };

  const aplicarMejorParaTodos = async () => {
    if (!conflictos || conflictos.length === 0) return;
    setApplyingAll(true);
    setGlobalLoading(true);
    const resultados = [];

    for (let i = 0; i < conflictos.length; i++) {
      const conflicto = conflictos[i];
      let rec = recomendacionesMap[conflicto.id];
      if (!rec) {
        rec = await fetchRecommendationsFor(conflicto);
      }

      const destino =
        rec?.mejores_opciones?.[0]?.box_info?.idbox ??
        rec?.opciones_emergencia?.[0]?.box_info?.idbox ??
        null;

      if (!destino) {
        resultados.push({
          id: conflicto.id,
          ok: false,
          reason: "no_recommendation",
        });
        continue;
      }

      const res = await aplicarSolucion(conflicto.id, destino, {
        closeOnSuccess: false,
        skipRefresh: true,
      });

      resultados.push({ id: conflicto.id, ...res });
    }

    if (typeof onResolver === "function") {
      try {
        onResolver();
      } catch (e) {
        console.warn("onResolver failed after applyAll", e);
      }
    }

    setApplyingAll(false);
    setGlobalLoading(false);
    setMostrarModal(false);

    console.log("Resultados aplicarMejorParaTodos:", resultados);
    return resultados;
  };

  const renderTrigger = () => {
    if (total > 1) {
      return (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={abrirResolverTodos}
          disabled={globalLoading}
          className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-all bg-gradient-to-r from-amber-400 to-orange-500 text-gray-900 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40"
          title={`Resolver todos los conflictos (${total}) con Mimir IA`}
        >
          <Sparkles className="w-4 h-4" />
          <span className="font-medium">Resolver todos</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-black/10 text-gray-900">
            {total}
          </span>
        </motion.button>
      );
    }

    return conflictos.map((conflicto) => (
      <motion.button
        key={conflicto.id}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => resolverConflicto(conflicto)}
        disabled={globalLoading || loadingMap[conflicto.id]}
        className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-amber-400 to-orange-500 text-gray-900 shadow-md shadow-amber-500/20 hover:shadow-amber-500/30"
        title="Resolver conflicto con Mimir IA"
      >
        <Sparkles className="w-3 h-3" />
        {globalLoading || loadingMap[conflicto.id] ? "Analizando..." : "Mimir"}
      </motion.button>
    ));
  };

  const renderRecommendationsContent = (rec, conflicto) => {
    if (!conflicto) {
      return (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          No hay conflicto seleccionado.
        </div>
      );
    }

    if (loadingMap[conflicto.id] && !rec) {
      return (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          <Clock className="animate-spin mx-auto mb-3 text-amber-500" />
          Analizando conflicto...
        </div>
      );
    }

    if (!rec) {
      return (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          <AlertTriangle className="mx-auto mb-3 text-amber-500" />
          No se obtuvieron recomendaciones para este conflicto.
        </div>
      );
    }

    return (
      <>
        {/* Información del conflicto */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Conflicto Detectado - Resumen
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
              <div className="text-amber-600 dark:text-amber-400 font-medium">Horario del Conflicto</div>
              <div className="text-gray-900 dark:text-gray-100 mt-1">
                {rec?.conflicto?.fecha ? new Date(rec.conflicto.fecha).toLocaleDateString() : 'N/A'}
              </div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {rec?.conflicto?.inicio} - {rec?.conflicto?.fin}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Duración: {rec?.conflicto?.duracion_horas ? `${rec.conflicto.duracion_horas}h` : 'N/A'}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
              <div className="text-amber-600 dark:text-amber-400 font-medium">Reservas Involucradas</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100 mt-1">
                {rec?.conflicto?.reservas_involucradas?.length || 0} agendas
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                IDs: {rec?.conflicto?.reservas_involucradas?.map(r => `#${r.id}`).join(', ') || 'N/A'}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
              <div className="text-amber-600 dark:text-amber-400 font-medium">Especialidades Requeridas</div>
              <div className="text-gray-900 dark:text-gray-100 mt-1">
                {rec?.conflicto?.tipos_requeridos?.principales?.join(', ') || 'N/A'}
              </div>
              {rec?.conflicto?.tipos_requeridos?.secundarios?.length > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Secundarias: {rec.conflicto.tipos_requeridos.secundarios.join(', ')}
                </div>
              )}
            </div>
          </div>

          <h4 className="font-medium text-amber-700 dark:text-amber-300 mb-3">Detalle de Agendas en Conflicto:</h4>
          <div className="space-y-3">
            {rec?.conflicto?.reservas_involucradas?.map((reserva, index) => {
              const reservaDetallada = rec.reservas_detalladas?.find(r => r.id === reserva.id);
              const medico = rec.conflicto.medicos_involucrados?.[index];
              const box = rec.conflicto.boxes_involucrados?.[index];
              
              return (
                <div key={reserva.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-amber-200 dark:border-amber-700">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-amber-800 dark:text-amber-300">Agenda #{reserva.id}</span>
                    {reservaDetallada?.error && (
                      <span className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                        Error: {reservaDetallada.error}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-amber-600 dark:text-amber-400">Médico:</span>{' '}
                      <span className="text-gray-900 dark:text-gray-100">
                        {medico?.nombre || reservaDetallada?.medico || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-amber-600 dark:text-amber-400">Box Actual:</span>{' '}
                      <span className="text-gray-900 dark:text-gray-100">
                        {box?.nombre || reservaDetallada?.box_actual || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-amber-600 dark:text-amber-400">Horario:</span>{' '}
                      <span className="text-gray-900 dark:text-gray-100">
                        {reservaDetallada?.hora_inicio || rec.conflicto.inicio} - {reservaDetallada?.hora_fin || rec.conflicto.fin}
                      </span>
                    </div>
                    <div>
                      <span className="text-amber-600 dark:text-amber-400">Paciente:</span>{' '}
                      <span className="text-gray-900 dark:text-gray-100">
                        {reservaDetallada?.paciente || 'N/A'}
                      </span>
                    </div>
                    {box?.estado && (
                      <div className="md:col-span-2">
                        <span className="text-amber-600 dark:text-amber-400">Estado Box:</span>{' '}
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          box.estado === 'Habilitado' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}>
                          {box.estado}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {rec?.conflicto?.medicos_involucrados?.length > 0 && (
            <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-700">
              <h4 className="font-medium text-amber-700 dark:text-amber-300 mb-2">Médicos Involucrados:</h4>
              <div className="flex flex-wrap gap-2">
                {rec.conflicto.medicos_involucrados.map((medico, index) => (
                  <span
                    key={medico.id}
                    className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full text-sm"
                  >
                    {medico.nombre}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recomendaciones */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Mejores opciones recomendadas
          </h3>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {rec?.mejores_opciones?.length || 0} opciones encontradas
          </div>
        </div>

        <div className="grid gap-4">
          {rec?.mejores_opciones?.map((opcion, index) => (
            <motion.div
              key={opcion.box_info.idbox}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow relative bg-white dark:bg-gray-800"
            >
              {index < 3 && (
                <div className="absolute -top-2 -right-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    index === 0 
                      ? 'bg-yellow-400 text-yellow-900' 
                      : index === 1
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                      : 'bg-amber-600 text-white'
                  }`}>
                    #{index + 1}
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        index === 0 ? 'bg-green-500' : 
                        index === 1 ? 'bg-blue-500' : 
                        'bg-amber-500'
                      }`}
                    />
                    <span>Box {opcion.box_info.idbox}</span>
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      (Score: {opcion.score_total})
                    </span>
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    {opcion.box_info.pasillo}
                  </p>
                  {/* Horario de la sugerencia */}
                  <div className="flex items-center gap-1 mt-2 text-sm text-gray-700 dark:text-gray-300">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {rec?.conflicto?.fecha ? new Date(rec.conflicto.fecha).toLocaleDateString() : 'N/A'} • 
                      {rec?.conflicto?.inicio} - {rec?.conflicto?.fin}
                    </span>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium self-start sm:self-center ${
                    opcion.box_info.estado === "Habilitado" 
                      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700" 
                      : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700"
                  } border`}
                >
                  {opcion.box_info.estado}
                </span>
              </div>

              <div className="mb-3">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Especialidades:
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {opcion.box_info.tipos?.map((tipo) => (
                    <span
                      key={tipo.tipo}
                      className={`px-2 py-1 rounded-full text-xs ${
                        tipo.principal
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      {tipo.tipo} {tipo.principal && "⭐"}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Evaluación:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {opcion.criterios?.slice(0, 4).map((criterio, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-xs">
                      <span className="text-gray-600 dark:text-gray-300">
                        {criterio.criterio}:
                      </span>
                      <div className="flex items-center">
                        <span className="font-medium text-green-600 dark:text-green-400 ml-2">
                          +{criterio.puntos}
                        </span>
                        <span className="text-gray-400 dark:text-gray-500 text-xs ml-2 hidden sm:block">
                          {criterio.detalle}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => aplicarSolucion(conflicto.id, opcion.box_info.idbox)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 relative disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={globalLoading}
              >
                <Check className="w-4 h-4" />
                {globalLoading ? "Aplicando..." : "Seleccionar esta solución"}
                {index === 0 && (
                  <span className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
                    MEJOR OPCIÓN
                  </span>
                )}
              </button>
            </motion.div>
          ))}
        </div>

        {rec?.opciones_emergencia?.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Opciones de emergencia
            </h4>
            <div className="grid gap-2">
              {rec.opciones_emergencia.map((opcion) => (
                <div
                  key={opcion.box_info.idbox}
                  className="border border-amber-200 dark:border-amber-700 rounded-lg p-3 bg-amber-50 dark:bg-amber-900/20"
                >
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    <strong>Box {opcion.box_info.idbox}</strong> - {opcion.box_info.pasillo}
                    <span className="text-amber-600 dark:text-amber-400"> (Score: {opcion.score_total})</span>
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-600 dark:text-gray-300">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {rec?.conflicto?.fecha ? new Date(rec.conflicto.fecha).toLocaleDateString() : 'N/A'} • 
                      {rec?.conflicto?.inicio} - {rec?.conflicto?.fin}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {opcion.box_info.tipos?.slice(0, 3).map((tipo) => (
                      <span
                        key={tipo.tipo}
                        className="px-2 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300"
                      >
                        {tipo.tipo}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {rec?.estadisticas && (
          <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Estadísticas de Búsqueda</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-gray-600 dark:text-gray-400">Total boxes evaluados:</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">{rec.estadisticas.total_boxes_evaluados}</div>
              
              <div className="text-gray-600 dark:text-gray-400">Boxes habilitados:</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">{rec.estadisticas.boxes_habilitados}</div>
              
              <div className="text-gray-600 dark:text-gray-400">Mejor score encontrado:</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">{rec.estadisticas.mejor_score}</div>
              
              <div className="text-gray-600 dark:text-gray-400">Score promedio:</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">{rec.estadisticas.score_promedio}</div>
            </div>
          </div>
        )}
      </>
    );
  };

  const currentConflicto = conflictos[currentIndex];
  const currentRec = currentConflicto ? recomendacionesMap[currentConflicto.id] || recomendaciones : recomendaciones;

  return (
    <>
      {renderTrigger()}

      <AnimatePresence>
        {mostrarModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-36 overflow-auto"
            aria-modal="true"
            role="dialog"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900 mx-4"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 flex items-start justify-between bg-gradient-to-r from-amber-400 to-orange-500 text-gray-900">
                <div className="flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>Mimir - Solución inteligente de topes</span>
                  </h2>
                  <p className="text-xs sm:text-sm opacity-90 mt-1">
                    Recomendaciones inteligentes para resolver topes y optimizar agendas
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 ml-2">
                  {total > 1 && (
                    <div className="text-sm mr-1 sm:mr-2 whitespace-nowrap text-gray-900/80">
                      {currentIndex + 1} / {total}
                    </div>
                  )}
                  <button
                    onClick={() => setMostrarModal(false)}
                    className="p-1 sm:p-2 rounded-lg hover:bg-black/10 transition-all"
                    aria-label="Cerrar"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh]">
                {total > 1 && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                        aria-label="Anterior conflicto"
                      >
                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button
                        onClick={handleNext}
                        disabled={currentIndex >= total - 1}
                        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                        aria-label="Siguiente conflicto"
                      >
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <div className="text-sm hidden xs:block text-gray-500 dark:text-gray-400">
                        Navega entre conflictos
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={aplicarMejorParaTodos}
                        disabled={applyingAll || globalLoading}
                        className="px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-amber-400 to-orange-500 text-gray-900 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Aplicar la mejor solución para todos los conflictos"
                      >
                        <Sparkles className="w-4 h-4 inline-block mr-1" />
                        {applyingAll ? "Aplicando..." : "Aplicar a todos"}
                      </button>
                    </div>
                  </div>
                )}

                <div>{renderRecommendationsContent(currentRec, currentConflicto)}</div>
              </div>

              {/* Footer */}
              <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                <p className="text-xs sm:text-sm text-center text-gray-600 dark:text-gray-400">
                  Mimir... tu herramienta inteligente que analiza carga horaria, preferencias médicas y compatibilidad de especialidades
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MimirResolver;
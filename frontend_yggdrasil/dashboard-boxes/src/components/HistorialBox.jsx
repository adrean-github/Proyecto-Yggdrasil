import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  History,
  Filter,
  Download,
  Printer,
  Search,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Settings,
  RefreshCw,
  X,
  ChevronUp,
  FileStack
} from "lucide-react";
import { motion } from "framer-motion";
import { buildApiUrl } from "../config/api";
import { useLocation } from 'react-router-dom';

export default function HistorialBox() {
  const location = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]); 

  const [showScrollButton, setShowScrollButton] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredHistorial, setFilteredHistorial] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    accion: "",
    fechaDesde: "",
    fechaHasta: ""
  });
  const [stats, setStats] = useState({
    total: 0,
    inhabilitaciones: 0,
    habilitaciones: 0,
    modificaciones: 0
  });

  useEffect(() => {
    fetchHistorial();
  }, [id]);

  // Mostrar/ocultar botón de scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollButton(window.scrollY > 400);
    };
  
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchHistorial = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(`/api/boxes/${id}/historial-modificaciones/`), {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const historialData = Array.isArray(data) ? data : [];
        setHistorial(historialData);
        setFilteredHistorial(historialData);
        calculateStats(historialData);
      } else {
        setHistorial([]);
        setFilteredHistorial([]);
      }
    } catch (error) {
      console.error('Error fetching historial:', error);
      setHistorial([]);
      setFilteredHistorial([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const inhabilitaciones = data.filter(item => item.accion === 'INHABILITACION').length;
    const habilitaciones = data.filter(item => item.accion === 'HABILITACION').length;
    const modificaciones = data.filter(item => item.accion === 'MODIFICACION').length;
    
    setStats({
      total: data.length,
      inhabilitaciones,
      habilitaciones,
      modificaciones
    });
  };

  const applyFilters = () => {
    let filtered = historial;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.usuario?.toLowerCase().includes(searchLower) ||
        item.comentario?.toLowerCase().includes(searchLower) ||
        item.campo_modificado?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.accion) {
      filtered = filtered.filter(item => item.accion === filters.accion);
    }

    if (filters.fechaDesde) {
      filtered = filtered.filter(item => new Date(item.fecha) >= new Date(filters.fechaDesde));
    }

    if (filters.fechaHasta) {
      const hasta = new Date(filters.fechaHasta);
      hasta.setHours(23, 59, 59);
      filtered = filtered.filter(item => new Date(item.fecha) <= hasta);
    }

    setFilteredHistorial(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [filters, historial]);

  const formatAccion = (accion) => {
    const acciones = {
      'CREACION': 'Creación',
      'MODIFICACION': 'Modificación',
      'INHABILITACION': 'Inhabilitación',
      'HABILITACION': 'Habilitación',
      'ELIMINACION': 'Eliminación'
    };
    return acciones[accion] || accion;
  };

  const getAccionColor = (accion) => {
    const colores = {
      'INHABILITACION': 'bg-orange-200 text-yellow-800 border-orange-400 dark:bg-orange-800 dark:text-orange-200 dark:border-orange-600',
      'HABILITACION': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-800 dark:text-green-200 dark:border-green-600',
      'MODIFICACION': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-800 dark:text-blue-200 dark:border-blue-600',
      'CREACION': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-800 dark:text-purple-200 dark:border-purple-600',
      'ELIMINACION': 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
    };
    return colores[accion] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600';
  };

  const getAccionIcon = (accion) => {
    const iconos = {
      'INHABILITACION': <XCircle className="w-4 h-4" />,
      'HABILITACION': <CheckCircle className="w-4 h-4" />,
      'MODIFICACION': <Settings className="w-4 h-4" />,
      'CREACION': <AlertCircle className="w-4 h-4" />,
      'ELIMINACION': <X className="w-4 h-4" />
    };
    return iconos[accion] || <History className="w-4 h-4" />;
  };

  const exportToCSV = () => {
    const headers = ['Fecha', 'Usuario', 'Acción', 'Campo Modificado', 'Valor Anterior', 'Valor Nuevo', 'Comentario', 'IP'];
    const csvData = filteredHistorial.map(item => [
      new Date(item.fecha).toLocaleString('es-ES'),
      item.usuario || 'N/A',
      formatAccion(item.accion),
      item.campo_modificado || 'N/A',
      item.valor_anterior || 'N/A',
      item.valor_nuevo || 'N/A',
      item.comentario || 'N/A',
      item.ip_address || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historial_box_${id}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printHistorial = () => {
    const printContent = document.getElementById('historial-content');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Historial Box ${id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Historial de Modificaciones - Box ${id}</h1>
            <p>Generado el ${new Date().toLocaleString('es-ES')}</p>
          </div>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 mx-auto mb-4" style={{ color: 'var(--accent-color)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/boxes/${id}`)}
            className="flex items-center gap-2 font-medium transition-colors"
            style={{ color: 'var(--accent-color)' }}
          >
            <ArrowLeft size={20} />
            Volver al Box
          </button>
          <div className="w-px h-6" style={{ backgroundColor: 'var(--border-color)' }}></div>
        </div>
      </div>

      {/* Título y subtítulo centrados */}
      <div className="flex flex-col items-center space-y-2 mb-8">
        <h1 className="text-center text-4xl font-bold mt-4" style={{ color: 'var(--text-color)' }}>
          Historial de Modificaciones
        </h1>
        <p className="text-center text-lg" style={{ color: 'var(--text-muted)' }}>
          Visualiza el historial de estados y modificaciones del box seleccionado
        </p>
        <span className="px-4 py-2 rounded-full text-sm font-semibold mt-2"
          style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-color)' }}>
          Box #{id}
        </span>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          className="rounded-xl p-4 shadow-sm border"
          style={{
            backgroundColor: 'var(--bg-color)',
            borderColor: 'var(--border-color)'
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total registros</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-color)' }}>{stats.total}</p>
            </div>
            <div className="p-3 rounded-full" style={{ backgroundColor: 'var(--info-bg)' }}>
              <FileStack size={20} style={{ color: 'var(--info-text)' }} /> 
            </div>
          </div>
        </motion.div>

        <motion.div
          className="rounded-xl p-4 shadow-sm border"
          style={{
            backgroundColor: 'var(--bg-color)',
            borderColor: 'var(--border-color)'
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Inhabilitaciones</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--historial-box-inhab, #d07315)' }}>{stats.inhabilitaciones}</p>
            </div>
            <div className="p-3 rounded-full" style={{ backgroundColor: 'var(--warning-bg)' }}>
              <XCircle size={20} style={{ color: 'var(--warning-text)' }} />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="rounded-xl p-4 shadow-sm border"
          style={{
            backgroundColor: 'var(--bg-color)',
            borderColor: 'var(--border-color)'
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Habilitaciones</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--historial-box-hab, #246b46)' }}>{stats.habilitaciones}</p>
            </div>
            <div className="p-3 rounded-full" style={{ backgroundColor: 'var(--success-bg)' }}>
              <CheckCircle size={20} style={{ color: 'var(--success-text)' }} />
            </div>
          </div>
        </motion.div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success-text)' }}
          >
            <Download size={18} />
            Exportar CSV
          </button>
          <button
            onClick={printHistorial}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info-text)' }}
          >
            <Printer size={18} />
            Imprimir
          </button>
        </div>
      </div>

      {/* Filtros */}
      <motion.div
        className="rounded-xl p-6 shadow-sm border mb-6"
        style={{
          backgroundColor: 'var(--bg-color)',
          borderColor: 'var(--border-color)'
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Filter size={20} style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-color)' }}>Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Usuario, comentario..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:border-transparent"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-color)',
                  border: '1px solid var(--border-color)'
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>Acción</label>
            <select
              value={filters.accion}
              onChange={(e) => setFilters(prev => ({ ...prev, accion: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:border-transparent"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-color)',
                border: '1px solid var(--border-color)'
              }}
            >
              <option value="">Todas las acciones</option>
              <option value="INHABILITACION">Inhabilitación</option>
              <option value="HABILITACION">Habilitación</option>
              <option value="MODIFICACION">Modificación</option>
              <option value="CREACION">Creación</option>
              <option value="ELIMINACION">Eliminación</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>Desde</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2" size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="date"
                value={filters.fechaDesde}
                onChange={(e) => setFilters(prev => ({ ...prev, fechaDesde: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:border-transparent"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-color)',
                  border: '1px solid var(--border-color)'
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>Hasta</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2" size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="date"
                value={filters.fechaHasta}
                onChange={(e) => setFilters(prev => ({ ...prev, fechaHasta: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:border-transparent"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-color)',
                  border: '1px solid var(--border-color)'
                }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabla de historial */}
      <motion.div
        id="historial-content"
        className="rounded-xl shadow-sm border overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-color)',
          borderColor: 'var(--border-color)'
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {filteredHistorial.length === 0 ? (
          <div className="p-8 text-center">
            <History className="mx-auto mb-4" size={48} style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-color)' }}>
              {historial.length === 0 ? 'No hay registros de modificaciones' : 'No se encontraron resultados'}
            </h3>
            <p style={{ color: 'var(--text-muted)' }}>
              {historial.length === 0
                ? 'Aún no se han realizado modificaciones en este box.'
                : 'Intenta ajustar los filtros de búsqueda.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Fecha y Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Acción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Comentario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>IP</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ color: 'var(--border-color)' }}>
                {filteredHistorial.map((item, index) => (
                  <tr key={index} className="transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm" style={{ color: 'var(--text-color)' }}>
                        {item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : 'N/A'}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {item.fecha ? new Date(item.fecha).toLocaleTimeString('es-ES') : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User size={16} style={{ color: 'var(--text-muted)' }} />
                        <span className="text-sm" style={{ color: 'var(--text-color)' }}>{item.usuario || 'Sistema'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getAccionColor(item.accion)}`}>
                        {getAccionIcon(item.accion)}
                        {formatAccion(item.accion)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm max-w-xs">
                        {item.comentario ? (
                          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-color)' }}>
                            {item.comentario}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Sin comentario</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
                        {item.ip_address || 'N/A'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Paginación (si hay muchos resultados) */}
      {filteredHistorial.length > 0 && (
        <div className="mt-6 flex justify-between items-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Mostrando {filteredHistorial.length} de {historial.length} registros
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-color)' }}
            >
              ↑ Volver arriba
            </button>
          </div>
        </div>
      )}

      {/* Botón flotante para subir */}
      {showScrollButton && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            const isMobile = window.innerWidth < 640; 
            window.scrollTo({ top: isMobile ? 740 : 420, behavior: 'smooth' });
          }}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--accent-color)', color: '#fff' }}
          aria-label="Volver arriba"
        >
          <ChevronUp className="w-6 h-6" />
        </motion.button>
      )}
    </div>
  );
}
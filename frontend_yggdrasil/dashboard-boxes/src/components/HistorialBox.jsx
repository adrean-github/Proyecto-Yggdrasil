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
  FileStack
} from "lucide-react";
import { motion } from "framer-motion";

export default function HistorialBox() {
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

  const fetchHistorial = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/boxes/${id}/historial-modificaciones/`, {
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
      'INHABILITACION': 'bg-orange-200 text-yellow-800 border-orange-400',
      'HABILITACION': 'bg-green-100 text-green-800 border-green-200',
      'MODIFICACION': 'bg-blue-100 text-blue-800 border-blue-200',
      'CREACION': 'bg-purple-100 text-purple-800 border-purple-200',
      'ELIMINACION': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colores[accion] || 'bg-gray-100 text-gray-800 border-gray-200';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 text-[#1B5D52] mx-auto mb-4" />
          <p className="text-gray-600">Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/boxes/${id}`)}
            className="flex items-center gap-2 text-[#1B5D52] font-medium hover:text-[#14463d] transition-colors"
          >
            <ArrowLeft size={20} />
            Volver al Box
          </button>
          <div className="w-px h-6 bg-gray-300"></div>
          <div className="flex items-center gap-2">
            <h1 className="text-4xl font-bold text-gray-800">Historial de Modificaciones</h1>
          </div>
          <span className="bg-green-100 text-[#1B5D52] px-4 py-2 rounded-full text-sm font-semibold">
            Box #{id}
          </span>
        </div>

      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total registros</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <FileStack className="text-blue-900" size={20}/> 
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inhabilitaciones</p>
              <p className="text-2xl font-bold text-orange-400">{stats.inhabilitaciones}</p>
            </div>
            <div className="bg-orange-200 p-3 rounded-full">
              <XCircle className="text-yellow-800" size={20} />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Habilitaciones</p>
              <p className="text-2xl font-bold text-[#005C48]">{stats.habilitaciones}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="text-[green-800]" size={20} />
            </div>
          </div>
        </motion.div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-100 text-[#005C48] rounded-lg hover:bg-green-200 transition-colors"
          >
            <Download size={18} />
            Exportar CSV
          </button>
          <button
            onClick={printHistorial}
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-900 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <Printer size={18} />
            Imprimir
          </button>
        </div>
      </div>

      {/* Filtros */}
      <motion.div
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Filter className="text-gray-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-800">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Usuario, comentario..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B5D52] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Acción</label>
            <select
              value={filters.accion}
              onChange={(e) => setFilters(prev => ({ ...prev, accion: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B5D52] focus:border-transparent"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Desde</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="date"
                value={filters.fechaDesde}
                onChange={(e) => setFilters(prev => ({ ...prev, fechaDesde: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B5D52] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="date"
                value={filters.fechaHasta}
                onChange={(e) => setFilters(prev => ({ ...prev, fechaHasta: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B5D52] focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabla de historial */}
      <motion.div
        id="historial-content"
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {filteredHistorial.length === 0 ? (
          <div className="p-8 text-center">
            <History className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {historial.length === 0 ? 'No hay registros de modificaciones' : 'No se encontraron resultados'}
            </h3>
            <p className="text-gray-500">
              {historial.length === 0
                ? 'Aún no se han realizado modificaciones en este box.'
                : 'Intenta ajustar los filtros de búsqueda.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha y Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comentario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHistorial.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.fecha ? new Date(item.fecha).toLocaleTimeString('es-ES') : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="text-gray-400" size={16} />
                        <span className="text-sm text-gray-900">{item.usuario || 'Sistema'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getAccionColor(item.accion)}`}>
                        {getAccionIcon(item.accion)}
                        {formatAccion(item.accion)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {item.comentario ? (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            {item.comentario}
                          </div>
                        ) : (
                          <span className="text-gray-400">Sin comentario</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 font-mono">
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
          <p className="text-sm text-gray-600">
            Mostrando {filteredHistorial.length} de {historial.length} registros
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ↑ Volver arriba
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
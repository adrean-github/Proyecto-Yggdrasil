import React, { useState, useEffect } from "react";
import { buildApiUrl } from "../config/api";
import { useBoxesWebSocket } from "../hooks/useBoxesWebSocket";
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  CircularProgress,
  Button,
  Alert,
  MenuItem,
  FormControl,
  Select,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Label,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { ArrowLeft, Download, Filter, RefreshCw} from "lucide-react"; 
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from 'html2canvas';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('week');
  const navigate = useNavigate();
  const [especialidadFilter, setEspecialidadFilter] = useState('top10');
  const [filteredEspecialidades, setFilteredEspecialidades] = useState([]);
  
  // Función para manejar cambios de estado de box desde WebSocket
  const handleBoxStateChange = ({ boxId, nuevoEstado, evento, tipo }) => {
    console.log(`[DEBUG Dashboard] Box ${boxId} cambió:`, { nuevoEstado, evento, tipo });
    // En el dashboard, cuando cambia el estado de un box o sus agendas, 
    // podrías querer refrescar las estadísticas
    // Por ahora, solo loggeamos el cambio
    if (tipo === 'agenda_cambio') {
      console.log(`[DEBUG Dashboard] Agenda del box ${boxId} ${evento}`);
      // Opcionalmente, podrías refrescar las estadísticas aquí
    }
  };

  // WebSocket para cambios de estado de boxes
  useBoxesWebSocket(handleBoxStateChange);
  
  //obtener estadísticas del dashboard
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(buildApiUrl(`/api/dashboard-stats/?range=${timeRange}`));
        if (!response.ok) throw new Error('Error al cargar datos');
        const data = await response.json();
        
        const transformedData = {
          ...data,
          evolucion_semana: data.evolucion_semana?.map(item => ({
            day: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][item.dia_semana - 1],
            value: item.total
          })) || [],
          
          uso_especialidades: data.especialidades_stats
            ?.map(item => ({
              name: item.nombre,
              value: item.total_reservas,
              boxes: item.boxes,
              es_principal: item.es_principal
            }))
            .sort((a, b) => b.value - a.value) || [],
          
          ocupacion_turnos: [
            { name: "AM", value: data.ocupacion_am },
            { name: "PM", value: data.ocupacion_pm }
          ],
          
          box_mas_usado: {
            id: data.box_mas_utilizado?.idbox || 0,
            reservas: data.box_mas_utilizado?.total || 0
          },
          box_menos_usado: {
            id: data.box_menos_utilizado?.idbox || 0,
            reservas: data.box_menos_utilizado?.total || 0
          },
          
          tiempo_atencion: [
            { name: "Médicas", value: data.tiempo_medico || 0 },
            { name: "No Médicas", value: data.tiempo_no_medico || 0 }
          ]
        };
        
        setStats(transformedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [timeRange]);

  //filtrar especialidades según selección
  useEffect(() => {
    if (stats?.uso_especialidades) {
      const sorted = [...stats.uso_especialidades].sort((a, b) => b.value - a.value);
  
      let filtered;
      switch (especialidadFilter) {
        case 'top10':
          filtered = sorted.slice(0, 10);
          break;
        case 'bottom10':
          filtered = sorted.slice(-10).reverse();
          break;
        case 'all':
          filtered = sorted;
          break;
        default:
          filtered = sorted;
      }
  
      setFilteredEspecialidades(filtered);
    }
  }, [stats?.uso_especialidades, especialidadFilter]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 mx-auto mb-4" style={{ color: 'var(--accent-color)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Cargando estadisticas del dashboard...</p>
        </div>
      </div>
    );
  }

  //descargar reporte en diferentes formatos
  const handleDownloadReport = async (format) => {
    if (!stats) return;
  
    if (format === "Excel") {
      const workbook = XLSX.utils.book_new();
      
      //hoja de resumen
      XLSX.utils.book_append_sheet(workbook, 
        XLSX.utils.json_to_sheet([
          { "Métrica": "Porcentaje de ocupación", "Valor": `${stats.porcentaje_ocupacion}%` },
          { "Métrica": "Horas muertas", "Valor": `${stats.horas_muertas} hrs` },
          { "Métrica": "Box más usado", "Valor": `${stats.box_mas_usado.id} (${stats.box_mas_usado.reservas} reservas)` },
          { "Métrica": "Box menos usado", "Valor": `${stats.box_menos_usado.id} (${stats.box_menos_usado.reservas} reservas)` },
        ]), "Resumen");
      
      //hojas de datos
      const sheets = [
        { data: stats.ocupacion_turnos, name: "Ocupación Turnos", cols: ["Turno", "Reservas"] },
        { data: stats.uso_especialidades, name: "Especialidades", cols: ["Especialidad", "Total reservas", "Boxes", "Especialidad principal"] },
        { data: stats.tipo_reservas, name: "Tipo Reservas", cols: ["Tipo", "Cantidad"] },
        { data: stats.tiempo_atencion, name: "Tiempo Atención", cols: ["Tipo", "Tiempo promedio (min)"] },
        { data: stats.evolucion_semana, name: "Evolución Semanal", cols: ["Día", "Reservas"] }
      ];
      
      sheets.forEach(sheet => {
        XLSX.utils.book_append_sheet(workbook, 
          XLSX.utils.json_to_sheet(sheet.data.map(item => 
            Object.fromEntries(sheet.cols.map((col, i) => [col, Object.values(item)[i]]))
          )), sheet.name);
      });
  
      XLSX.writeFile(workbook, `Reporte_Gestion_${new Date().toISOString().split('T')[0]}.xlsx`);
    } 
    else if (format === "PDF") {
      try {
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4"
        });
    
        // Configuración de colores
        const primaryColor = [0, 92, 72];      
        const secondaryColor = [100, 116, 139];  
        const accentColor = [220, 38, 38];       
        const whiteColor = [255, 255, 255];      
    
        // 1. Portada
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(...primaryColor);
        doc.text("Reporte de Gestión de Agendamiento", 105, 30, { align: "center" });
    
        doc.setFont("helvetica", "normal");
        doc.setFontSize(16);
        doc.setTextColor(...secondaryColor);
        doc.text(`Período: ${getPeriodLabel(timeRange)}`, 105, 40, { align: "center" });
    
        doc.setFontSize(12);
        doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 105, 50, { align: "center" });
    
        // 2. Resumen ejecutivo
        doc.addPage();
        doc.setFontSize(18);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Resumen Ejecutivo", 15, 20);
    
        autoTable(doc, {  
          startY: 25,
          headStyles: {
            fillColor: primaryColor,
            textColor: whiteColor,
            fontStyle: 'bold'
          },
          body: [
            ["Ocupación total", `${stats.porcentaje_ocupacion}%`],
            ["Horas muertas", `${stats.horas_muertas} hrs`],
            ["Box más usado", `#${stats.box_mas_usado.id} (${stats.box_mas_usado.reservas} reservas)`],
            ["Box menos usado", `#${stats.box_menos_usado.id} (${stats.box_menos_usado.reservas} reservas)`]
          ],
          columns: [
            { header: "Métrica", dataKey: 0 },
            { header: "Valor", dataKey: 1 }
          ],
          styles: {
            cellPadding: 3,
            fontSize: 10,
            textColor: [30, 41, 59],
            font: "helvetica"
          },
          columnStyles: {
            0: { cellWidth: 90, fontStyle: 'bold' },
            1: { cellWidth: 90 }
          },
          margin: { left: 15, right: 15 }
        });
    
        // 3. Sección de Especialidades (Tabla + Gráfico)
        doc.addPage();
        doc.setFontSize(18);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Reservas por Especialidad", 15, 20);
        console.log("Especialidades:", stats.ocupacion_turnos);
        // Tabla de datos de especialidades
        autoTable(doc, {
          startY: 30,
          headStyles: {
            fillColor: primaryColor,
            textColor: whiteColor,
            fontStyle: 'bold'
          },
          body: stats.uso_especialidades.map(esp => [
            esp.name,
            esp.value,
            esp.boxes,
            esp.es_principal ? "Sí" : "No"
          ]),
          columns: [
            { header: "Especialidad", dataKey: 0 },
            { header: "Total Reservas", dataKey: 1 },
            { header: "Boxes Usados", dataKey: 2 },
            { header: "Especialidad Principal", dataKey: 3 }
          ],
          styles: {
            cellPadding: 3,
            fontSize: 9,
            textColor: [30, 41, 59],
            font: "helvetica"
          },
          margin: { left: 15, right: 15 }
        });
    
    
        // 4. Sección de Evolución Semanal (Tabla + Gráfico)
        doc.addPage();
        doc.setFontSize(18);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Evolución Semanal", 15, 20);
    
        // Tabla de datos de evolución semanal
        autoTable(doc, {
          startY: 30,
          headStyles: {
            fillColor: primaryColor,
            textColor: whiteColor,
            fontStyle: 'bold'
          },
          body: stats.evolucion_semana.map(dia => [
            dia.day,
            dia.value
          ]),
          columns: [
            { header: "Día", dataKey: 0 },
            { header: "Total Reservas", dataKey: 1 }
          ],
          styles: {
            cellPadding: 3,
            fontSize: 9,
            textColor: [30, 41, 59],
            font: "helvetica"
          },
          margin: { left: 15, right: 15 }
        });
    
        // Gráfico de evolución semanal
        const evolucionElement = document.getElementById("chart-evolucion-semanal");
        if (evolucionElement) {
          const currentY = doc.lastAutoTable.finalY +10;
          
          try {
            const canvas = await html2canvas(evolucionElement, {
              scale: 2,
              backgroundColor: '#FFFFFF'
            });
            const imgData = canvas.toDataURL("image/png");
            const pageWidth = doc.internal.pageSize.getWidth();
            const imgWidth = pageWidth - 80;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            doc.addImage(imgData, 'PNG', 15, currentY, imgWidth, imgHeight);
          } catch (error) {
            console.error("Error al capturar gráfico de evolución semanal:", error);
          }
        }
    
        // 5. Sección de Tipos de Reserva (Tabla + Gráfico)
        doc.addPage();
        doc.setFontSize(18);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Tipos de Reserva", 15, 20);
    
        // Tabla de tipos de reserva
        autoTable(doc, {
          startY: 30,
          headStyles: {
            fillColor: primaryColor,
            textColor: whiteColor,
            fontStyle: 'bold'
          },
          body: stats.tipo_reservas.map(tipo => [
            tipo.name,
            tipo.value
          ]),
          columns: [
            { header: "Tipo de Reserva", dataKey: 0 },
            { header: "Cantidad", dataKey: 1 }
          ],
          styles: {
            cellPadding: 3,
            fontSize: 9,
            textColor: [30, 41, 59],
            font: "helvetica"
          },
          margin: { left: 15, right: 15 }
        });
    
        // Gráfico de tipos de reserva
        const tiposElement = document.getElementById("chart-tipo-de-reservas");
        if (tiposElement) {
          const currentY = doc.lastAutoTable.finalY + 10;
          
          try {
            const canvas = await html2canvas(tiposElement, {
              scale: 2,
              backgroundColor: '#FFFFFF'
            });
            const imgData = canvas.toDataURL("image/png");
            const pageWidth = doc.internal.pageSize.getWidth();
            const imgWidth = pageWidth - 50;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            doc.addImage(imgData, 'PNG', 15, currentY, imgWidth, imgHeight);
          } catch (error) {
            console.error("Error al capturar gráfico de tipos de reserva:", error);
          }
        }
    
        // 6. Sección de Ocupación por Turno (Tabla + Gráfico)
        doc.addPage();
        doc.setFontSize(18);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Ocupación por Turno", 15, 20);
    
        // Tabla de ocupación por turno
        autoTable(doc, {
          startY: 30,
          headStyles: {
            fillColor: primaryColor,
            textColor: whiteColor,
            fontStyle: 'bold'
          },
          body: stats.ocupacion_turnos.map(turno => [
            turno.name,
            turno.value
          ]),
          columns: [
            { header: "Turno", dataKey: 0 },
            { header: "Reservas", dataKey: 1 }
          ],
          styles: {
            cellPadding: 3,
            fontSize: 9,
            textColor: [30, 41, 59],
            font: "helvetica"
          },
          margin: { left: 15, right: 15 }
        });
    
        // Gráfico de ocupación por turno
        const turnosElement = document.getElementById("chart-ocupacion-por-turno");
        if (turnosElement) {
          const currentY = doc.lastAutoTable.finalY + 10;
          
          try {
            const canvas = await html2canvas(turnosElement, {
              scale: 2,
              backgroundColor: '#FFFFFF'
            });
            const imgData = canvas.toDataURL("image/png");
            const pageWidth = doc.internal.pageSize.getWidth();
            const imgWidth = pageWidth - 45;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            doc.addImage(imgData, 'PNG', 15, currentY, imgWidth, imgHeight);
          } catch (error) {
            console.error("Error al capturar gráfico de ocupación por turno:", error);
          }
        }
    
        // 7. Sección de Tiempos de Atención (Solo tabla)
        doc.addPage();
        doc.setFontSize(18);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Tiempos de Atención", 15, 20);
    
        autoTable(doc, {
          startY: 30,
          headStyles: {
            fillColor: primaryColor,
            textColor: whiteColor,
            fontStyle: 'bold'
          },
          body: stats.tiempo_atencion.map(item => [
            item.name,
            item.value
          ]),
          columns: [
            { header: "Tipo", dataKey: 0 },
            { header: "Tiempo promedio (min)", dataKey: 1 }
          ],
          styles: {
            cellPadding: 3,
            fontSize: 9,
            textColor: [30, 41, 59],
            font: "helvetica"
          },
          margin: { left: 15, right: 15 }
        });
    
        // 8. Notas finales
        doc.addPage();
        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Notas Técnicas", 15, 20);
    
        doc.setFontSize(10);
        doc.setTextColor(...secondaryColor);
        doc.setFont("helvetica", "normal");
        const notes = [
          "• Datos generados automáticamente por el sistema de agendamiento",
          "• Las métricas se calculan en base a los datos disponibles en el período seleccionado",
          "• Para consultas o correcciones contacte al área de Informática",
          `• Generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`
        ];
        
        notes.forEach((note, i) => doc.text(note, 20, 30 + (i * 6)));
    
        // 9. Guardar el PDF
        const fileName = `Reporte_Agendamiento_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    
      } catch (error) {
        console.error("Error al generar PDF:", error);
        alert("Error al generar el PDF. Consulte la consola para detalles.");
      }
    }
  };
  
  const getPeriodLabel = (range) => {
    const labels = {
      'day': 'Día actual',
      'week': 'Semana actual',
      'month': 'Mes actual',
      'year': 'Año actual'
    };
    return labels[range] || 'Período actual';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress sx={{ color: 'var(--accent-color)' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
          sx={{ 
            backgroundColor: 'var(--accent-color)', 
            '&:hover': { backgroundColor: 'var(--accent-hover)' },
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: '8px',
            px: 3,
            py: 1
          }}
        >
          Reintentar
        </Button>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">No hay datos disponibles</Alert>
      </Box>
    );
  }

  const COLORS = ['var(--accent-color)', '#DB9500', '#FF8042', '#0088FE', '#00C49F'];

  return (
    <Box sx={{ p: 3, minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
      {/* Header Section */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 4,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Typography variant="h4" sx={{ 
          color: 'var(--text-color)', 
          fontWeight: 'bold', 
          fontSize: '1.8rem',
          letterSpacing: '-0.5px',
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
        }}>
          Dashboard de Gestión
        </Typography>

        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <FormControl size="small" sx={{ 
            minWidth: 180,
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--bg-color)',
              '&:hover fieldset': {
                borderColor: 'var(--accent-color)'
              }
            }
          }}>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              startAdornment={<Filter size={18} style={{ marginRight: 8, color: 'var(--text-muted)' }} />}
              sx={{ 
                color: 'var(--text-color)',
                fontWeight: 500,
                '& .MuiSelect-icon': {
                  color: 'var(--text-muted)'
                }
              }}
            >
              <MenuItem value="day">Día actual</MenuItem>
              <MenuItem value="week">Semana actual</MenuItem>
              <MenuItem value="month">Mes actual</MenuItem>
              <MenuItem value="year">Año actual</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<Download size={18} />}
              onClick={() => handleDownloadReport("PDF")}
              sx={{ 
                backgroundColor: 'var(--accent-color)', 
                '&:hover': { backgroundColor: 'var(--accent-hover)' },
                borderRadius: '8px',
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: 500,
                boxShadow: '0 2px 4px rgba(95, 183, 153, 0.2)',
                transition: 'all 0.3s ease'
              }}
            >
              Exportar PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download size={18} />}
              onClick={() => handleDownloadReport("Excel")}
              sx={{ 
                borderColor: 'var(--accent-color)',
                color: 'var(--accent-color)',
                backgroundColor: 'var(--bg-color)',
                '&:hover': { 
                  backgroundColor: 'var(--accent-bg)',
                  borderColor: 'var(--accent-hover)'
                },
                borderRadius: '8px',
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: 500,
                transition: 'all 0.3s ease'
              }}
            >
              Exportar Excel
            </Button>
          </Box>
        </Box>
      </Box>

      {/*grid principal del dashboard*/}
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: { 
          xs: '1fr', 
          sm: 'repeat(2, 1fr)', 
          md: 'repeat(4, 1fr)' 
          },
          gridTemplateRows: {
          xs: 'repeat(8, auto)',
          sm: 'repeat(8, minmax(100px, auto))', 
          md: 'repeat(5, auto)'
          },
          gap: 3,
          '& > div': { 
          minWidth: 0,
          minHeight: { xs: 'auto', sm: '150px' }
          }
        }}>
          {/*Cards de métricas*/}
          <MetricCard 
            title={
          <>
            <span style={{
              fontWeight: 800,
              fontSize: '1.1rem',
              color: 'var(--accent-color)',
            }}>OCUPACIÓN TOTAL</span>
          </>
            }
            value={
          <span style={{
            fontWeight: 900,
            fontSize: '2.3rem',
            color: 'var(--accent-color)',
            letterSpacing: '-1px',
            textShadow: '0 2px 8px var(--accent-bg)'
          }}>{stats.porcentaje_ocupacion}%</span>
            }
            description={
          <span style={{
            fontWeight: 500,
            color: 'var(--text-color)',
            fontSize: '0.95rem'
          }}>Porcentaje de tiempo utilizado</span>
            }
            color="var(--accent-color)"
            sx={{ 
          gridColumn: { xs: '1', sm: '1', md: '1' },
          gridRow: { xs: '1', sm: '1', md: '1' },
          height: { xs: '100%', sm: '100%', md: '100%' },
          background: 'linear-gradient(90deg, var(--accent-bg) 0%, var(--bg-secondary) 100%)',
          '& .MuiCardContent-root': { py: 1 },
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 10px 20px rgba(0, 92, 72, 0.13)'
          }
            }}
          />
          <MetricCard 
            title={
              <>
                <span style={{
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  color: 'var(--warning-color)',
                }}>HORAS MUERTAS</span>
              </>
            }
            value={
              <span style={{
                fontWeight: 900,
                fontSize: '2.3rem',
                color: 'var(--warning-color)',
                letterSpacing: '-1px',
                textShadow: '0 2px 8px var(--warning-bg)'
              }}>{stats.horas_muertas}</span>
            }
            description={
              <span style={{
                fontWeight: 500,
                color: 'var(--text-color)',
                fontSize: '0.95rem'
              }}>Tiempo entre reservas no utilizado</span>
            }
            color="var(--warning-color)"
            sx={{
              gridColumn: { xs: '1', sm: '2', md: '2' },
              gridRow: { xs: '2', sm: '1', md: '1' },
              height: { xs: '100%', sm: '100%', md: '100%' },
              background: 'linear-gradient(90deg, var(--warning-bg) 0%, var(--bg-secondary) 100%)',
              '& .MuiCardContent-root': { py: 1 },
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 10px 20px rgba(219, 149, 0, 0.13)'
              }
            }}
          />

          <MetricCard 
            title={
              <>
                <span style={{
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  color: 'var(--error-color)',
                }}>BOX MÁS USADO</span>
              </>
            }
            value={
              <span style={{
                fontWeight: 900,
                fontSize: '2.3rem',
                color: 'var(--error-color)',
                letterSpacing: '-1px',
                textShadow: '0 2px 8px var(--error-bg)'
              }}>{stats.box_mas_usado.id}</span>
            }
            description={
              <span style={{
                fontWeight: 500,
                color: 'var(--text-color)',
                fontSize: '0.95rem'
              }}>{stats.box_mas_usado.reservas} reservas</span>
            }
            color="var(--error-color)"
            sx={{ 
              gridColumn: { xs: '1', sm: '1', md: '3' },
              gridRow: { xs: '3', sm: '2', md: '1' },
              height: { xs: '100%', sm: '100%', md: '100%' },
              background: 'linear-gradient(90deg, var(--error-bg) 0%, var(--bg-secondary) 100%)',
              '& .MuiCardContent-root': { py: 1 },
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 10px 20px rgba(255, 128, 66, 0.13)'
              }
            }}
          />

          <MetricCard 
            title={
              <>
                <span style={{
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  color: 'var(--info-color)',
                }}>BOX MENOS USADO</span>
              </>
            }
            value={
              <span style={{
                fontWeight: 900,
                fontSize: '2.3rem',
                color: 'var(--info-color)',
                letterSpacing: '-1px',
                textShadow: '0 2px 8px var(--info-bg)'
              }}>{stats.box_menos_usado.id}</span>
            }
            description={
              <span style={{
                fontWeight: 500,
                color: 'var(--text-color)',
                fontSize: '0.95rem'
              }}>{stats.box_menos_usado.reservas} reservas</span>
            }
            color="var(--info-color)"
            sx={{ 
              gridColumn: { xs: '1', sm: '2', md: '4' },
              gridRow: { xs: '4', sm: '2', md: '1' },
              height: { xs: '100%', sm: '100%', md: '100%' },
              background: 'linear-gradient(90deg, var(--info-bg) 0%, var(--bg-secondary) 100%)',
              '& .MuiCardContent-root': { py: 1 },
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 10px 20px rgba(0, 136, 254, 0.13)'
              }
            }}
          />

          {/*gráfico de evolución semanal */}
        <Box id="chart-evolucion-semanal" sx={{ 
          gridColumn: { xs: '1', sm: '1 / 3', md: '1 / 3' },
          gridRow: { xs: '5', sm: '3 / span 2', md: '2 / 4' },
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 10px 20px rgba(0,0,0,0.05)'
          }
        }}>
          <ChartCard title="Evolución Semanal de Reservas">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={stats.evolucion_semana} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: 'var(--text-muted)' }}
                  axisLine={{ stroke: 'var(--border-color)' }}
                />
                <YAxis 
                  domain={['dataMin - 5', 'dataMax + 10']} 
                  tick={{ fill: 'var(--text-muted)' }}
                  axisLine={{ stroke: 'var(--border-color)' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    color: 'var(--text-color)'
                  }}
                  formatter={(value, name) => {
                    if (name === 'Reservas') return [`${value} reservas`, 'Total del día'];
                    if (name === 'Promedio semanal') return [`${Math.round(value)} reservas`, 'Línea de promedio'];
                    if (name === 'Tendencia') return [`${value} reservas`, 'Línea de tendencia'];
                  }}
                  labelFormatter={(label) => `Día: ${label}`}
                />
                <Legend 
                  wrapperStyle={{
                    paddingTop: '20px'
                  }}
                />
                <Bar dataKey="value" name="Reservas" radius={[4, 4, 0, 0]}>
                  {stats.evolucion_semana.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.value > (stats.total_reservas/7) ? 'var(--accent-color)' : '#DB9500'} 
                      stroke="var(--bg-color)"
                      strokeWidth={1}
                    />
                  ))}
                </Bar>
                <Line 
                  type="monotone" 
                  dataKey={() => stats.total_reservas/7} 
                  stroke="#ff0000"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  name="Promedio semanal"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#00a6ffff" 
                  strokeWidth={2}
                  name="Tendencia"
                  dot={{ fill: '#00d8ff', strokeWidth: 2, r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-around', 
              mt: 1, 
              pt: 1, 
              borderTop: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: 1
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ 
                  width: 12, 
                  height: 12, 
                  bgcolor: 'var(--accent-color)', 
                  mr: 1, 
                  borderRadius: '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }} />
                <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Día sobre promedio</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ 
                  width: 12, 
                  height: 12, 
                  bgcolor: '#DB9500', 
                  mr: 1, 
                  borderRadius: '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }} />
                <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Día bajo promedio</Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ 
              color: 'var(--text-muted)',
              mt: 1, 
              textAlign: 'center',
              fontStyle: 'italic'
            }}>
              Promedio semanal: {Math.round(stats.total_reservas/7)} reservas/día
            </Typography>
          </ChartCard>
        </Box>

        {/*tabla de especialidades*/}
        <Box id="tabla-especialidades" sx={{ 
          gridColumn: { xs: '1', sm: '1 / 3', md: '3 / 5' },
          gridRow: { xs: '6', sm: '5 / span 2', md: '2 / 4' },
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 10px 20px rgba(0,0,0,0.05)'
          }
        }}>
          <ChartCard title="Reservas por Especialidad">
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              mb: 2,
              flexWrap: 'wrap',
              gap: 1
            }}>
              <FormControl size="small" sx={{ 
                minWidth: 120,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'var(--bg-color)',
                  '& fieldset': {
                    borderColor: 'var(--border-color)'
                  },
                  '&:hover fieldset': {
                    borderColor: 'var(--accent-color)'
                  }
                }
              }}>
                <Select
                  value={especialidadFilter}
                  onChange={(e) => setEspecialidadFilter(e.target.value)}
                  sx={{ 
                    color: 'var(--text-color)',
                    '& .MuiSelect-icon': {
                      color: 'var(--text-muted)'
                    }
                  }}
                >
                  <MenuItem value="top10" sx={{ color: 'var(--text-color)', backgroundColor: 'var(--bg-color)' }}>Top 10 Especialidades</MenuItem>
                  <MenuItem value="bottom10" sx={{ color: 'var(--text-color)', backgroundColor: 'var(--bg-color)' }}>Últimas 10 Especialidades</MenuItem>
                  <MenuItem value="all" sx={{ color: 'var(--text-color)', backgroundColor: 'var(--bg-color)' }}>Todas las Especialidades</MenuItem>
                </Select>
              </FormControl>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ 
                    width: 12, 
                    height: 12, 
                    bgcolor: 'var(--accent-color)', 
                    mr: 1, 
                    borderRadius: '2px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }} />
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Principal</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ 
                    width: 12, 
                    height: 12, 
                    bgcolor: '#DB9500', 
                    mr: 1, 
                    borderRadius: '2px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }} />
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Secundaria</Typography>
                </Box>
              </Box>
              <p className="text-sm text-center py-2 md:hidden" style={{ color: 'var(--text-muted)' }}>
                Desliza horizontalmente para ver más columnas
              </p>
            </Box>

            <Box sx={{ 
              height: 250, 
              overflow: 'auto', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05) inset',
              backgroundColor: 'var(--bg-color)'
            }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ 
                      fontWeight: 'bold', 
                      bgcolor: 'var(--bg-tertiary)',
                      color: 'var(--text-color)',
                      borderBottom: '1px solid var(--border-color)'
                    }}>#</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold', 
                      bgcolor: 'var(--bg-tertiary)',
                      color: 'var(--text-color)',
                      borderBottom: '1px solid var(--border-color)'
                    }}>Especialidad</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold', 
                      bgcolor: 'var(--bg-tertiary)',
                      color: 'var(--text-color)',
                      borderBottom: '1px solid var(--border-color)'
                    }} align="right">Reservas</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold', 
                      bgcolor: 'var(--bg-tertiary)',
                      color: 'var(--text-color)',
                      borderBottom: '1px solid var(--border-color)'
                    }} align="right">Boxes</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold', 
                      bgcolor: 'var(--bg-tertiary)',
                      color: 'var(--text-color)',
                      borderBottom: '1px solid var(--border-color)'
                    }} align="center">Tipo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEspecialidades.map((especialidad, index) => (
                    <TableRow 
                      key={index} 
                      sx={{ 
                        '&:nth-of-type(odd)': { backgroundColor: 'var(--bg-tertiary)' },
                        '&:hover': { backgroundColor: 'var(--bg-table-alternative)' },
                        backgroundColor: 'var(--bg-table-alternative-ii)'
                      }}
                    >
                      <TableCell sx={{ 
                        borderBottom: '1px solid var(--border-color)',
                        color: 'var(--text-color)'
                      }}>{index + 1}</TableCell>
                      <TableCell sx={{ 
                        borderBottom: '1px solid var(--border-color)',
                        color: 'var(--text-color)'
                      }}>{especialidad.name}</TableCell>
                      <TableCell sx={{ 
                        borderBottom: '1px solid var(--border-color)',
                        color: 'var(--text-color)'
                      }} align="right">{especialidad.value.toLocaleString()}</TableCell>
                      <TableCell sx={{ 
                        borderBottom: '1px solid var(--border-color)',
                        color: 'var(--text-color)'
                      }} align="right">{especialidad.boxes}</TableCell>
                      <TableCell sx={{ 
                        borderBottom: '1px solid var(--border-color)',
                        color: 'var(--text-color)'
                      }} align="center">
                        <Box sx={{ 
                          display: 'inline-block',
                          width: 12, 
                          height: 12, 
                          bgcolor: especialidad.es_principal ? 'var(--accent-color)' : '#DB9500',
                          borderRadius: '2px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Typography variant="caption" sx={{ 
              color: 'var(--text-muted)',
              mt: 1, 
              display: 'block',
              fontStyle: 'italic'
            }}>
              Mostrando {filteredEspecialidades.length} de {stats?.uso_especialidades?.length || 0} especialidades
            </Typography>
          </ChartCard>
        </Box>

        {/*gráfico de tipo de reservas*/}
        <Box id="chart-tipo-de-reservas" sx={{ 
          gridColumn: { xs: '1', sm: '1 / 3', md: '1' },
          gridRow: { xs: '7', sm: '7', md: '4 / 6' },
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 10px 20px rgba(0,0,0,0.05)'
          }
        }}>
          <ChartCard title="Distribución por Tipo de Reserva">
            <Box sx={{ mt: 5 }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.tipo_reservas}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}  
                    outerRadius={80}  
                    paddingAngle={2} 
                    dataKey="value"
                    label={({ value }) => `${value}`}  
                    labelLine={false}
                  >
                    {stats.tipo_reservas.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        stroke="var(--bg-color)"  
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [
                      `${value} reservas`,
                      `${(value / stats.total_reservas * 100).toFixed(1)}% del total`
                    ]}
                    contentStyle={{
                      borderRadius: '8px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-color)',
                      color: 'var(--text-color)'
                    }}
                  />
                  <Legend 
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ 
                      paddingTop: '10px',
                      color: 'var(--text-muted)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>

            <Box sx={{ 
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 2,
              mt: 1,
              p: 1,
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <Typography variant="h6" sx={{ color: 'var(--text-color)', fontWeight: '500' }}>
                Total: <strong>{stats.total_reservas}</strong> reservas
              </Typography>
            </Box>
          </ChartCard>
        </Box>

        {/*cards de tiempo promedio*/}
        <MetricCard 
          title="Tiempo Médico Promedio"
          value={`${stats.tiempo_medico?.toFixed(1) || '0'} min`}
          description="Por atención médica"
          color="var(--accent-color)"
          sx={{ 
            gridColumn: { xs: '1', sm: '1', md: '2' },
            gridRow: { xs: '8', sm: '8', md: '4' },
            backgroundColor: 'var(--bg-color)',
            borderLeft: '4px solid var(--accent-color)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 10px 20px rgba(27, 93, 82, 0.1)'
            }
          }}
        />
        
        <MetricCard 
          title="Tiempo No Médico Promedio"
          value={`${stats.tiempo_no_medico?.toFixed(1) || '0'} min`}
          description="Por atención no médica"
          color="#DB9500"
          sx={{ 
            gridColumn: { xs: '1', sm: '2', md: '2' },
            gridRow: { xs: '9', sm: '8', md: '5' },
            backgroundColor: 'var(--bg-color)',
            borderLeft: '4px solid #DB9500',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 10px 20px rgba(219, 149, 0, 0.1)'
            }
          }}
        />

        {/*gráfico de ocupación por turnos*/}
        <Box id="chart-ocupacion-por-turno" sx={{ 
          gridColumn: { xs: '1', sm: '1 / 3', md: '3 / 5' },
          gridRow: { xs: '10 / 12', sm: '9 / span 2', md: '4 / 6' },
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 10px 20px rgba(0,0,0,0.05)'
          }
        }}>
          <ChartCard title="Ocupación por Turno">
            <Box sx={{ 
              mb: 2, 
              p: 1, 
              backgroundColor: 'var(--bg-tertiary)', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)' 
            }}>
              <Typography variant="body2" sx={{ 
                color: 'var(--text-color)', 
                textAlign: 'center', 
                fontStyle: 'italic' 
              }}>
                Porcentaje de ocupación de boxes en cada turno (AM/PM)
              </Typography>
            </Box>
            
            <ResponsiveContainer width="100%" height={200}>
              <BarChart layout="vertical" data={stats.ocupacion_turnos} margin={{ top: 10, left: 30, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                <XAxis 
                  type="number" 
                  domain={[0, 100]} 
                  tick={{ fill: 'var(--text-muted)' }}
                  axisLine={{ stroke: 'var(--border-color)' }}
                >
                  <Label 
                    value="Porcentaje de ocupación (%)" 
                    position="insideBottom" 
                    offset={-5} 
                    style={{ fill: 'var(--text-muted)', fontSize: '0.8rem' }}
                  />
                </XAxis>
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fill: 'var(--text-muted)' }}
                  axisLine={{ stroke: 'var(--border-color)' }}
                />
                <Tooltip 
                  formatter={(value) => [`${value}% de ocupación`, 'Porcentaje']}
                  labelFormatter={(label) => `Turno: ${label}`}
                  contentStyle={{
                    backgroundColor: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    color: 'var(--text-color)'
                  }}
                />
                <Bar dataKey="value" name="Ocupación" animationDuration={1500}>
                  {stats.ocupacion_turnos.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      radius={[0, 4, 4, 0]}
                      stroke="var(--bg-color)"
                    />
                  ))}
                </Bar>
                <Legend 
                  wrapperStyle={{
                    paddingTop: '10px',
                    fontSize: '0.8rem'
                  }}
                  formatter={(value) => <span style={{ color: 'var(--text-muted)' }}>{value}</span>}
                />
              </BarChart>
            </ResponsiveContainer>

            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: 2, 
              mt: 2,
              flexWrap: 'wrap'
            }}>
              {stats.ocupacion_turnos.map((turno, index) => (
                <Box key={index} sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  p: 1,
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: '4px',
                  border: `1px solid ${COLORS[index % COLORS.length]}`
                }}>
                  <Box sx={{ 
                    width: 12, 
                    height: 12, 
                    bgcolor: COLORS[index % COLORS.length], 
                    mr: 1,
                    borderRadius: '2px'
                  }} />
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                    {turno.name}: <strong>{turno.value}%</strong>
                  </Typography>
                </Box>
              ))}
            </Box>
          </ChartCard>
        </Box>
      </Box>
    </Box>
  );
};

//componente para métricas individuales
const MetricCard = ({ title, value, description, color, sx }) => (
  <Card 
    elevation={2} 
    sx={{ 
      height: '100%', 
      borderRadius: '12px',
      borderLeft: `4px solid ${color}`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-color)',
      ...sx 
    }}
  >
    <CardContent sx={{ 
      textAlign: 'center',
      p: 2,
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      '&:last-child': {
        pb: 2
      }
    }}>
      <Typography 
        variant="subtitle1" 
        sx={{ 
          color: 'var(--text-muted)',
          fontWeight: 500,
          fontSize: '0.875rem',
          mb: 1.5 
        }}
      >
        {title}
      </Typography>
      <Typography 
        variant="h3" 
        sx={{ 
          color, 
          fontWeight: 'bold', 
          mb: 1.5, 
          fontSize: '2.5rem',
          lineHeight: 1.2
        }}
      >
        {value}
      </Typography>
      <Typography 
        variant="body2" 
        sx={{
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          opacity: 0.8,
          mt: 1 
        }}
      >
        {description}
      </Typography>
    </CardContent>
  </Card>
);

//componente para contenedores de gráficos
const ChartCard = ({ title, children }) => (
  <Card 
    elevation={2} 
    sx={{ 
      height: '100%',
      borderRadius: '12px',
      borderTop: '4px solid var(--accent-color)',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-color)'
    }}
  >
    <CardContent sx={{ 
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      p: 3,
      '&:last-child': {
        pb: 3
      }
    }}>
      <Typography 
        variant="subtitle1" 
        sx={{ 
          color: 'var(--accent-color)', 
          fontWeight: 'bold', 
          mb: 2,
          fontSize: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <Box sx={{ 
          width: '4px', 
          height: '20px', 
          bgcolor: 'var(--accent-color)',
          borderRadius: '2px'
        }} />
        {title}
      </Typography>
      <Box sx={{ flex: 1 }}>
        {children}
      </Box>
    </CardContent>
  </Card>
);

export default DashboardPage;
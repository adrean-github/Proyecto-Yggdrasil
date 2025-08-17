import React, { useState, useEffect } from "react";
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
import { ArrowLeft, Download, Filter } from "lucide-react"; 
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
  
  //obtener estadísticas del dashboard
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/dashboard-stats/?range=${timeRange}`);
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
        <CircularProgress sx={{ color: '#005C48' }} />
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
            backgroundColor: '#005C48', 
            '&:hover': { backgroundColor: '#4a9d7a' },
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

  const COLORS = ['#005C48', '#DB9500', '#FF8042', '#0088FE', '#00C49F'];

  return (
    <Box sx={{ p: 3, minHeight: '100vh', backgroundColor: '#f8fafc' }}>
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
          color: '#1e293b', 
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
              borderColor: '#e2e8f0',
              '&:hover fieldset': {
                borderColor: '#005C48'
              }
            }
          }}>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              startAdornment={<Filter size={18} style={{ marginRight: 8, color: '#64748b' }} />}
              sx={{ 
                color: '#1e293b',
                fontWeight: 500,
                '& .MuiSelect-icon': {
                  color: '#64748b'
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
                backgroundColor: '#005C48', 
                '&:hover': { backgroundColor: '#4a9d7a' },
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
                borderColor: '#005C48',
                color: '#005C48',
                '&:hover': { 
                  backgroundColor: 'rgba(95, 183, 153, 0.08)',
                  borderColor: '#4a9d7a'
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
          title="Ocupación total"
          value={`${stats.porcentaje_ocupacion}%`}
          description="Porcentaje de tiempo utilizado"
          color="#005C48"
          sx={{ 
            gridColumn: { xs: '1', sm: '1', md: '1' },
            gridRow: { xs: '1', sm: '1', md: '1' },
            height: { xs: '100%', sm: '100%', md: '100%' },
            '& .MuiCardContent-root': { py: 1 },
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 10px 20px rgba(0, 92, 72, 0.1)'
            }
          }}
        />

        <MetricCard 
          title="Horas muertas"
          value={`${stats.horas_muertas}`}
          description="Tiempo entre reservas no utilizado"
          color="#DB9500"
          sx={{
            gridColumn: { xs: '1', sm: '2', md: '2' },
            gridRow: { xs: '2', sm: '1', md: '1' },
            height: { xs: '100%', sm: '100%', md: '100%' },
            '& .MuiCardContent-root': { py: 1 },
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 10px 20px rgba(219, 149, 0, 0.1)'
            }
          }}
        />

        <MetricCard 
          title="Box más usado"
          value={stats.box_mas_usado.id}
          description={`${stats.box_mas_usado.reservas} reservas`}
          color="#FF8042"
          sx={{ 
            gridColumn: { xs: '1', sm: '1', md: '3' },
            gridRow: { xs: '3', sm: '2', md: '1' },
            height: { xs: '100%', sm: '100%', md: '100%' },
            '& .MuiCardContent-root': { py: 1 },
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 10px 20px rgba(255, 128, 66, 0.1)'
            }
           }}
        />

        <MetricCard 
          title="Box menos usado"
          value={stats.box_menos_usado.id}
          description={`${stats.box_menos_usado.reservas} reservas`}
          color="#0088FE"
          sx={{ 
            gridColumn: { xs: '1', sm: '2', md: '4' },
            gridRow: { xs: '4', sm: '2', md: '1' },
            height: { xs: '100%', sm: '100%', md: '100%' },
            '& .MuiCardContent-root': { py: 1 },
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 10px 20px rgba(0, 136, 254, 0.1)'
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
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis 
                  domain={['dataMin - 5', 'dataMax + 10']} 
                  tick={{ fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
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
                      fill={entry.value > (stats.total_reservas/7) ? '#005C48' : '#DB9500'} 
                      stroke="#ffffff"
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
                  stroke="#00d8ff" 
                  strokeWidth={2}
                  name="Tendencia"
                  dot={{ fill: '#00aeff', strokeWidth: 2, r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-around', 
              mt: 1, 
              pt: 1, 
              borderTop: '1px solid #f1f5f9',
              flexWrap: 'wrap',
              gap: 1
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ 
                  width: 12, 
                  height: 12, 
                  bgcolor: '#005C48', 
                  mr: 1, 
                  borderRadius: '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }} />
                <Typography variant="caption" sx={{ color: '#64748b' }}>Día sobre promedio</Typography>
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
                <Typography variant="caption" sx={{ color: '#64748b' }}>Día bajo promedio</Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ 
              mt: 1, 
              textAlign: 'center',
              fontStyle: 'italic'
            }}>
              Promedio semanal: {Math.round(stats.total_reservas/7)} reservas/día
            </Typography>
          </ChartCard>
        </Box>

        {/*tabla de especialidads*/}
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
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={especialidadFilter}
                  onChange={(e) => setEspecialidadFilter(e.target.value)}
                  sx={{ 
                    color: '#005C48',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#e2e8f0'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#005C48'
                    }
                  }}
                >
                  <MenuItem value="top10">Top 10 Especialidades</MenuItem>
                  <MenuItem value="bottom10">Últimas 10 Especialidades</MenuItem>
                  <MenuItem value="all">Todas las Especialidades</MenuItem>
                </Select>
              </FormControl>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ 
                    width: 12, 
                    height: 12, 
                    bgcolor: '#005C48', 
                    mr: 1, 
                    borderRadius: '2px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }} />
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Principal</Typography>
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
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Secundaria</Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ 
              height: 250, 
              overflow: 'auto', 
              border: '1px solid #f1f5f9', 
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05) inset'
            }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ 
                      fontWeight: 'bold', 
                      bgcolor: '#f8fafc',
                      color: '#1e293b',
                      borderBottom: '1px solid #e2e8f0'
                    }}>#</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold', 
                      bgcolor: '#f8fafc',
                      color: '#1e293b',
                      borderBottom: '1px solid #e2e8f0'
                    }}>Especialidad</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold', 
                      bgcolor: '#f8fafc',
                      color: '#1e293b',
                      borderBottom: '1px solid #e2e8f0'
                    }} align="right">Reservas</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold', 
                      bgcolor: '#f8fafc',
                      color: '#1e293b',
                      borderBottom: '1px solid #e2e8f0'
                    }} align="right">Boxes</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold', 
                      bgcolor: '#f8fafc',
                      color: '#1e293b',
                      borderBottom: '1px solid #e2e8f0'
                    }} align="center">Tipo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEspecialidades.map((especialidad, index) => (
                    <TableRow 
                      key={index} 
                      sx={{ 
                        '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                        '&:hover': { backgroundColor: '#f1f5f9' }
                      }}
                    >
                      <TableCell sx={{ borderBottom: '1px solid #f1f5f9' }}>{index + 1}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #f1f5f9' }}>{especialidad.name}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #f1f5f9' }} align="right">{especialidad.value.toLocaleString()}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #f1f5f9' }} align="right">{especialidad.boxes}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #f1f5f9' }} align="center">
                        <Box sx={{ 
                          display: 'inline-block',
                          width: 12, 
                          height: 12, 
                          bgcolor: especialidad.es_principal ? '#005C48' : '#DB9500',
                          borderRadius: '2px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ 
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
                        stroke="#fff"  
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
                      border: 'none',
                      backgroundColor: '#ffffff'
                    }}
                  />
                  <Legend 
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ 
                      paddingTop: '10px',
                      color: '#64748b'
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
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #f1f5f9'
            }}>
              <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: '500' }}>
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
          color="#005C48"
          sx={{ 
            gridColumn: { xs: '1', sm: '1', md: '2' },
            gridRow: { xs: '8', sm: '8', md: '4' },
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 10px 20px rgba(0, 92, 72, 0.1)'
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
            <Box sx={{ mb: 2, p: 1, backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'center', fontStyle: 'italic' }}>
                Porcentaje de ocupación de boxes en cada turno (AM/PM)
              </Typography>
            </Box>
            
            <ResponsiveContainer width="100%" height={200}>
              <BarChart layout="vertical" data={stats.ocupacion_turnos} margin={{ top: 10, left: 30, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis 
                  type="number" 
                  domain={[0, 100]} 
                  tick={{ fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                >
                  <Label 
                    value="Porcentaje de ocupación (%)" 
                    position="insideBottom" 
                    offset={-5} 
                    style={{ fill: '#64748b', fontSize: '0.8rem' }}
                  />
                </XAxis>
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <Tooltip 
                  formatter={(value) => [`${value}% de ocupación`, 'Porcentaje']}
                  labelFormatter={(label) => `Turno: ${label}`}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar dataKey="value" name="Ocupación" animationDuration={1500}>
                  {stats.ocupacion_turnos.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      radius={[0, 4, 4, 0]}
                      stroke="#FFFFFF"
                    />
                  ))}
                </Bar>
                <Legend 
                  wrapperStyle={{
                    paddingTop: '10px',
                    fontSize: '0.8rem'
                  }}
                  formatter={(value) => <span style={{ color: '#64748b' }}>{value}</span>}
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
                  backgroundColor: '#f8fafc',
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
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
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
        color="text.secondary" 
        gutterBottom
        sx={{ 
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
        color="text.secondary"
        sx={{
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
      borderTop: '4px solid #005C48',
      display: 'flex',
      flexDirection: 'column'
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
          color: '#005C48', 
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
          bgcolor: '#005C48',
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
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
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const primaryColor = [95, 183, 153];
      
      //portada
      doc.setFontSize(22);
      doc.text("Reporte de Gestión de Agendamiento", 105, 30, { align: "center" });
      doc.setFontSize(16);
      doc.text(`Período: ${getPeriodLabel(timeRange)}`, 105, 40, { align: "center" });
      doc.setFontSize(12);
      doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 105, 50, { align: "center" });
      
      //resumen ejecutivo
      doc.addPage();
      doc.setFontSize(18);
      doc.text("Resumen Ejecutivo", 15, 20);
      
      autoTable(doc, {
        startY: 25,
        columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 90 } },
        body: [
          ["Ocupación total", `${stats.porcentaje_ocupacion}%`],
          ["Horas muertas", `${stats.horas_muertas} hrs`],
          ["Box más usado", `${stats.box_mas_usado.id} (${stats.box_mas_usado.reservas} reservas)`],
          ["Box menos usado", `${stats.box_menos_usado.id} (${stats.box_menos_usado.reservas} reservas)`]
        ],
        margin: { left: 15, right: 15 },
        styles: { 
          cellPadding: 5,
          fontStyle: 'bold',
          textColor: primaryColor
        }
      });
  
      //capturar gráficos del dashboard
      const chartElements = [
        { id: "chart-evolucion-semanal", title: "Evolución Semanal" },
        { id: "tabla-especialidades", title: "Reservas por Especialidad" },
        { id: "chart-tipo-de-reservas", title: "Tipo de Reservas" },
        { id: "chart-ocupacion-por-turno", title: "Ocupación por Turno" }
      ];
  
      for (const chart of chartElements) {
        const element = document.getElementById(chart.id);
        if (element) {
          const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#FFFFFF' });
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = 180;
          const imgHeight = canvas.height * imgWidth / canvas.width;
          
          if (doc.internal.getCurrentPageInfo().pageNumber > 1 && 
              (doc.lastAutoTable?.finalY || 0) + imgHeight > 250) {
            doc.addPage();
          }
          
          doc.setFontSize(14);
          doc.text(chart.title, 15, (doc.lastAutoTable?.finalY || 30) + 10);
          doc.addImage(imgData, 'PNG', 15, (doc.lastAutoTable?.finalY || 30) + 15, imgWidth, imgHeight);
        }
      }
  
      //notas finales
      doc.addPage();
      doc.setFontSize(12);
      doc.text("Notas:", 15, 20);
      doc.text("- Los porcentajes de ocupación se calculan en base a la capacidad total de boxes", 15, 30);
      doc.text("- Las horas muertas representan tiempo entre reservas donde los boxes no fueron utilizados", 15, 35);
      doc.text("- Datos generados automáticamente por el sistema de gestión", 15, 40);
  
      doc.save(`Reporte_Gestion_${new Date().toISOString().split('T')[0]}.pdf`);
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
        <CircularProgress sx={{ color: '#5FB799' }} />
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
          sx={{ backgroundColor: '#5FB799', '&:hover': { backgroundColor: '#4a9d7a' } }}
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

  const COLORS = ['#5FB799', '#FFBB28', '#FF8042', '#0088FE', '#00C49F'];

  return (
    <Box sx={{ p: 3, backgroundColor: 'white', minHeight: '100vh' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Button
          onClick={() => navigate("/DashboardBoxes")}
          startIcon={<ArrowLeft size={20} />}
          sx={{ color: '#5FB799', fontWeight: 'bold' }}
        >
          Volver al Dashboard
        </Button>

        <Typography variant="h4" sx={{ color: '#5FB799', fontWeight: 'bold', mx: 'auto' }}>
          Dashboard de Gestión
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', ml: 'auto' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              startAdornment={<Filter size={18} style={{ marginRight: 8 }} />}
              sx={{ color: '#5FB799' }}
            >
              <MenuItem value="day">Día actual</MenuItem>
              <MenuItem value="week">Semana actual</MenuItem>
              <MenuItem value="month">Mes actual</MenuItem>
              <MenuItem value="year">Año actual</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<Download size={18} />}
            onClick={() => handleDownloadReport("PDF")}
            sx={{ backgroundColor: '#5FB799', '&:hover': { backgroundColor: '#4a9d7a' } }}
          >
            PDF
          </Button>
          <Button
            variant="contained"
            startIcon={<Download size={18} />}
            onClick={() => handleDownloadReport("Excel")}
            sx={{ backgroundColor: '#5FB799', '&:hover': { backgroundColor: '#4a9d7a' } }}
          >
            Excel
          </Button>
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
          color="#5FB799"
          sx={{ 
            gridColumn: { xs: '1', sm: '1', md: '1' },
            gridRow: { xs: '1', sm: '1', md: '1' } ,
            height: { xs: '100%', sm: '100%', md: '100%' },
            '& .MuiCardContent-root': { py: 1 } 
          }}
        />

        <MetricCard 
          title="Horas muertas"
          value={`${stats.horas_muertas}`}
          description="Tiempo entre reservas no utilizado"
          color="#FFBB28"
          sx={{
            gridColumn: { xs: '1', sm: '2', md: '2' },
            gridRow: { xs: '2', sm: '1', md: '1' } ,
            height: { xs: '100%', sm: '100%', md: '100%' },
            '& .MuiCardContent-root': { py: 1 }
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
            '& .MuiCardContent-root': { py: 1 }
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
            '& .MuiCardContent-root': { py: 1 }
           }}
        />

        {/*gráfico de evolución semanal */}
        <Box id="chart-evolucion-semanal" sx={{ 
        gridColumn: { xs: '1', sm: '1 / 3', md: '1 / 3' },
        gridRow: { xs: '5', sm: '3 / span 2', md: '2 / 4' }
        }}>
          <ChartCard title="Evolución Semanal de Reservas">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={stats.evolucion_semana} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={['dataMin - 5', 'dataMax + 10']} />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'Reservas') return [`${value} reservas`, 'Total del día'];
                    if (name === 'Promedio semanal') return [`${Math.round(value)} reservas`, 'Línea de promedio'];
                    if (name === 'Tendencia') return [`${value} reservas`, 'Línea de tendencia'];
                  }}
                  labelFormatter={(label) => `Día: ${label}`}
                />
                <Legend />
                <Bar dataKey="value" name="Reservas" fill="#5FB799" radius={[4, 4, 0, 0]}>
                  {stats.evolucion_semana.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value > (stats.total_reservas/7) ? '#5FB799' : '#FFBB28'} />
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
            <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 1, pt: 1, borderTop: '1px solid #eee' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#5FB799', mr: 1, borderRadius: '2px' }} />
                <Typography variant="caption">Día sobre promedio</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#FFBB28', mr: 1, borderRadius: '2px' }} />
                <Typography variant="caption">Día bajo promedio</Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              Promedio semanal: {Math.round(stats.total_reservas/7)} reservas/día
            </Typography>
          </ChartCard>
        </Box>

        {/*tabla de especialidads*/}
        <Box id="tabla-especialidades" sx={{ 
        gridColumn: { xs: '1', sm: '1 / 3', md: '3 / 5' },
        gridRow: { xs: '6', sm: '5 / span 2', md: '2 / 4' }
        }}>
          <ChartCard title="Reservas por Especialidad">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={especialidadFilter}
                  onChange={(e) => setEspecialidadFilter(e.target.value)}
                  sx={{ color: '#5FB799' }}
                >
                  <MenuItem value="top10">Top 10 Especialidades</MenuItem>
                  <MenuItem value="bottom10">Últimas 10 Especialidades</MenuItem>
                  <MenuItem value="all">Todas las Especialidades</MenuItem>
                </Select>
              </FormControl>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: '#5FB799', mr: 1, borderRadius: '2px' }} />
                  <Typography variant="caption">Principal</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: '#FFBB28', mr: 1, borderRadius: '2px' }} />
                  <Typography variant="caption">Secundaria</Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ height: 250, overflow: 'auto', border: '1px solid #eee', borderRadius: '4px' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Especialidad</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }} align="right">Reservas</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }} align="right">Boxes</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }} align="center">Tipo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEspecialidades.map((especialidad, index) => (
                    <TableRow key={index} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{especialidad.name}</TableCell>
                      <TableCell align="right">{especialidad.value.toLocaleString()}</TableCell>
                      <TableCell align="right">{especialidad.boxes}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ 
                          display: 'inline-block',
                          width: 12, 
                          height: 12, 
                          bgcolor: especialidad.es_principal ? '#5FB799' : '#FFBB28',
                          borderRadius: '2px'
                        }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Mostrando {filteredEspecialidades.length} de {stats?.uso_especialidades?.length || 0} especialidades
            </Typography>
          </ChartCard>
        </Box>

        {/*gráfico de tipo de reservas*/}
        <Box id="chart-tipo-de-reservas" sx={{ 
        gridColumn: { xs: '1', sm: '1 / 3', md: '1' },
        gridRow: { xs: '7', sm: '7', md: '4 / 6' }
        }}>
        <ChartCard title="Distribución por Tipo de Reserva">
            <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                data={stats.tipo_reservas}
                cx="50%"
                cy="50%"
                innerRadius={70}  
                outerRadius={90}  
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
                    border: 'none'
                }}
                />
                <Legend 
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{ paddingTop: '20px' }}
                />
            </PieChart>
            </ResponsiveContainer>

            <Box sx={{ 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2,
            mt: 1
            }}>
            <Typography variant="h6" sx={{ color: 'text.primary' }}>
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
          color="#5FB799"
          sx={{ 
            gridColumn: { xs: '1', sm: '1', md: '2' },
            gridRow: { xs: '8', sm: '8', md: '4' }
          }}
        />

        <MetricCard 
          title="Tiempo No Médico Promedio"
          value={`${stats.tiempo_no_medico?.toFixed(1) || '0'} min`}
          description="Por atención no médica"
          color="#FFBB28"
          sx={{ 
            gridColumn: { xs: '1', sm: '2', md: '2' },
            gridRow: { xs: '9', sm: '8', md: '5' }
          }}
        />

        {/*gráfico de ocupación por turnos*/}
        <Box id="chart-ocupacion-por-turno" sx={{ 
        gridColumn: { xs: '1', sm: '1 / 3', md: '3 / 5' },
        gridRow: { xs: '10 / 12', sm: '9 / span 2', md: '4 / 6' }
        }}>
          <ChartCard title="Ocupación por Turno">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart layout="vertical" data={stats.ocupacion_turnos} margin={{ left: 30, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" />
                <Tooltip formatter={(value) => [`${value} reservas`]} />
                <Bar dataKey="value" name="reservas" animationDuration={1500}>
                  {stats.ocupacion_turnos.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} radius={[0, 4, 4, 0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Box>
      </Box>
    </Box>
  );
};

//componente para métricas individuales
const MetricCard = ({ title, value, description, color, sx }) => (
  <Card elevation={2} sx={{ height: '100%', ...sx }}>
    <CardContent sx={{ textAlign: 'center' }}>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h3" sx={{ color, fontWeight: 'bold', mb: 1 }}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </CardContent>
  </Card>
);

//componente para contenedores de gráficos
const ChartCard = ({ title, children }) => (
  <Card elevation={2} sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="subtitle1" sx={{ color: '#5FB799', fontWeight: 'bold', mb: 2 }}>
        {title}
      </Typography>
      {children}
    </CardContent>
  </Card>
);

export default DashboardPage;
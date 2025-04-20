import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

const COLORS = ["#f87171", "#4ade80", "#facc15", "#c084fc"];

export default function BoxCharts({ boxes }) {
  const estados = ["ocupado", "disponible", "inhabilitado", "no_apto"];
  const pasillos = [...new Set(boxes.map((b) => b.pasillo))];

  // Para el gráfico de barras por estado general
  const dataEstados = estados.map((estado) => ({
    name: estado.charAt(0).toUpperCase() + estado.slice(1),
    value: boxes.filter((b) => b.estado === estado).length,
  }));

  // Datos para gráfico Radar: cada pasillo con cantidad por estado
  const dataRadar = pasillos.map((pasillo) => {
    const grupo = boxes.filter((b) => b.pasillo === pasillo);
    const valores = {
      name: pasillo,
    };
    estados.forEach((estado) => {
      valores[estado] = grupo.filter((b) => b.estado === estado).length;
    });
    return valores;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Gráfico 1: Estados generales (BarChart) */}
      <div className="bg-white p-6 rounded-2xl shadow-lg w-full lg:w-1/2">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Resumen visual de estados
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dataEstados} barSize={40}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fill: "#4B5563", fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#5AD6A4" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico 2: Radar de estados por pasillo */}
      <div className="bg-white p-6 rounded-2xl shadow-lg w-full lg:w-1/2">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Distribución de estados por pasillo (Radar)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart outerRadius={100} data={dataRadar}>
            <PolarGrid />
            <PolarAngleAxis dataKey="name" />
            <PolarRadiusAxis angle={30} domain={[0, 30]} />
            {estados.map((estado, index) => (
              <Radar
                key={estado}
                name={estado.charAt(0).toUpperCase() + estado.slice(1)}
                dataKey={estado}
                stroke={COLORS[index]}
                fill={COLORS[index]}
                fillOpacity={0.4}
              />
            ))}
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

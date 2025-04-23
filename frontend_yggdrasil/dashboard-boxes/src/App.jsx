import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./header";
import Dashboard from "./components/Dashboard";
import MedicosOnline from "./components/MedicosOnline";
import BoxDetalle from "./components/BoxDetalle";
export default function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/medicos" element={<MedicosOnline />} />
        <Route path="/box/:id" element={<BoxDetalle />} />
      </Routes>
    </Router>
  );
}

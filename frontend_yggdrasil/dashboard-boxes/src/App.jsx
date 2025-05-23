import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Header from "./header";
import Dashboard from "./components/Dashboard";
import MedicosOnline from "./components/MedicosOnline";
import BoxDetalle from "./components/BoxDetalle";
import Login from "./components/Login";
import ReservaNoMedica from "./components/ReservaNoMedica";
import PrivateRoute from "./components/privateroute";
import Simulador from "./components/Simulador";

function LayoutWithHeader({ children }) {
  const location = useLocation();
  const hideHeaderPaths = ["/login"];
  return (
    <>
      {!hideHeaderPaths.includes(location.pathname) && <Header />}
      {children}
    </>
  );
}

export default function App() {
  return (
    <Router>
      <LayoutWithHeader>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/DashboardBoxes"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/medicos"
            element={
              <PrivateRoute>
                <MedicosOnline />
              </PrivateRoute>
            }
          />
          <Route
            path="/simulador"
            element={
              <PrivateRoute>
                <Simulador />
              </PrivateRoute>
            }
          />
          <Route
            path="/box/:id"
            element={
              <PrivateRoute>
                <BoxDetalle />
              </PrivateRoute>
            }
          />
          <Route
            path="/reserva-no-medica"
            element={
              <PrivateRoute>
                <ReservaNoMedica />
              </PrivateRoute>
            }
          />
        </Routes>
      </LayoutWithHeader>
    </Router>
  );
}

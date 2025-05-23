import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Header from "./header";
import Dashboard from "./components/Dashboard";
import MedicosOnline from "./components/MedicosOnline";
import BoxDetalle from "./components/BoxDetalle";
import Login from "./components/Login";
import PrivateRoute from "./components/privateroute"

// Componente auxiliar para condicionar el header
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
            path="/"
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
            path="/box/:id"
            element={
              <PrivateRoute>
                <BoxDetalle />
              </PrivateRoute>
            }
          />
        </Routes>
      </LayoutWithHeader>
    </Router>
  );
}

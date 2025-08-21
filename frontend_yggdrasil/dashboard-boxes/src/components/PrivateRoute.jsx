import React from "react";
import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function PrivateRoute({ children }) {
  const { user, checking } = useAuth();

  if (checking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px'
      }}>
        Cargando aplicación...
      </div>
    );
  }

  // DEMO MODE: Permite acceso libre para presentación
  return children;
  
  // Código original comentado para demo:
  // if (user?.username || user?.roles?.length > 0) {
  //   return children;
  // }
  // return <Navigate to="/login" replace />;
}
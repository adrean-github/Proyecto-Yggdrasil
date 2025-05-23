import React from "react";
import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function PrivateRoute({ children }) {
  const { user, checking } = useAuth();

  if (checking) return <div>Cargando...</div>; 

  return user ? children : <Navigate to="/login" replace />;
}



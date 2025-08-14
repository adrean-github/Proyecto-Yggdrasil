/*import React from "react";
import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function PrivateRoute({ children }) {
  const { user, checking } = useAuth();

  if (checking) {
    return <div>Cargando...</div>;
  }

  if (user?.roles.includes("gestion")) {
    return children;
  }

  return <Navigate to="/login" replace />;
}*/

import React from "react";
import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children }) {
  if (process.env.NODE_ENV === "development") {
    return children;
  }

  const isAuthenticated = Boolean(localStorage.getItem("user"));
  return isAuthenticated ? children : <Navigate to="/login" />;
}

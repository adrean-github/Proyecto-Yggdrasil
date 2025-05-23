import React from "react";
import useAuth from "../hooks/useAuth";

export default function ReservaNoMedica() {
  const { user, checking } = useAuth();

  if (checking) return <div>Cargando...</div>;

  if (!user) return <div>No autorizado</div>;

  return (
    <div className="p-6">
      <h1>Reserva No Médica</h1>
      <p>Bienvenido, {user.username}.</p>
      <p>Este es el espacio exclusivo para Jefes de Pasillo.</p>
    </div>
  );
}

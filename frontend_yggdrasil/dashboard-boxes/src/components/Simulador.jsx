import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import useAuth from "../hooks/useAuth";

function UploadForm() {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Selecciona un archivo primero.");
      return;
    }

    const formData = new FormData();
    formData.append('archivo', file);  // "archivo" es el nombre que esperará Django

    try {
      const response = await fetch('http://localhost:8000/api/upload/', {
        method: 'POST',
        body: formData,
        credentials: 'include', // si necesitas cookies para la sesión
      });

      if (response.ok) {
        const data = await response.json();
        alert('Archivo subido con éxito');
        console.log(data);
      } else {
        alert('Error al subir el archivo');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión con el servidor');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="file" accept=".csv, .xlsx" onChange={handleFileChange} />
      <button type="submit">Subir archivo</button>
    </form>
  );
}

export default UploadForm;
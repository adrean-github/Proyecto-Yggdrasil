import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8000/api/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      if (response.ok) {
        const userRes = await fetch('http://localhost:8000/api/user/', {
          credentials: 'include',
        });

        if (userRes.ok) {
          const user = await userRes.json();
          console.log("Usuario obtenido:", user);

          const roles = Array.isArray(user.roles) ? user.roles : [];

          if (roles.includes('gestion')) {
            navigate('/DashboardBoxes');
          } else if (roles.includes('jefe_pasillo')) {
            navigate('/reserva-no-medica');
          } else {
            alert('No tienes permisos asignados para acceder a ninguna página.');
          }
        } else {
          alert('No se pudo obtener la información del usuario.');
        }
      } else {
        alert('Credenciales inválidas');
      }
    } catch (err) {
      console.error(err);
      alert('Error en el servidor');
    }
  };

  return (
    <div className="login-container">
      <div className="left-panel">
        <h2>HOLA,</h2>
        <h1>¡BIENVENIDO!</h1>
      </div>
      <div className="right-panel">
        <form onSubmit={handleSubmit} className="login-form">
          <img src="/Logo_HospitalPadreHurtado.png" alt="Hospital Padre Hurtado" className="logo" />
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Iniciar sesión</button>
          <a href="#" className="forgot">¿Olvidaste tu contraseña?</a>
        </form>
      </div>
    </div>
  );
}

export default Login;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
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
            setError('No tienes permisos para acceder al sistema. Contacta al administrador.');
          }
        } else {
          setError('Error al cargar tu información de usuario');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || 'Usuario o contraseña incorrectos');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión. Por favor intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="left-panel">
        <div className="welcome-container">
          <div className="welcome-content">
            <h2>HOLA,</h2>
            <h1>¡BIENVENIDO!</h1>
            <div className="system-description">
              <p>Sistema de Gestión de Boxes Hospitalarios - Yggdrasil</p>
              <p>Plataforma integral para lorem ipsun lorem ipsun lorem ipsun</p>
            </div>
          </div>
        </div>
      </div>

      <div className="right-panel">
        <div className="login-form-container">
          <form onSubmit={handleSubmit} className="login-form">
            <img 
              src="/Logo_HospitalPadreHurtado.png" 
              alt="Hospital Padre Hurtado" 
              className="logo" 
            />
            
            <div className="form-group">
              <label htmlFor="username">Usuario</label>
              <input
                id="username"
                type="text"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className={error ? 'error-input' : ''}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={error ? 'error-input' : ''}
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <button 
              type="submit" 
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="spinner"></span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
            
            <a href="#" className="forgot-password">
              ¿Olvidaste tu contraseña?
            </a>
          </form>

          <div className="developer-info">
          <img src="/developer-logo.png" alt="Logo Empresa Desarrolladora" className="developer-logo"  />
            <div className="developer-text">
              <p>Sistema desarrollado por <strong>Elytra</strong></p>
              <p>Equipo: Adrean Torres, Ariel Van Kilsdonk</p>
              <p>2025</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
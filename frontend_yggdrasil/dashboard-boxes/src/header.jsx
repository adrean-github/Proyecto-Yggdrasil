import { useState, useEffect } from "react";
import { Menu, X, ChevronRight, Home, Settings, Type } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import useAuth from "./hooks/useAuth";
import { buildApiUrl } from "./config/api";
import { useClickOutside } from './hooks/useClickOutside'; 
import { useRef } from "react";



// Componente para las migas de pan 
function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter(Boolean);
  
  return (
    <nav
      className="mt-3 px-4 py-1 rounded-xl shadow-sm"
      style={{
        backgroundColor: 'var(--bg-secondary, #f9fafb)',
        color: 'var(--text-color, #374151)'
      }}
      aria-label="Breadcrumb"
    >
      <ol className="flex flex-wrap items-center text-sm gap-1">
        {/* Home */}
        <li className="flex items-center">
          <Link
            to="/"
            className="flex items-center gap-1 transition-colors hover:opacity-75"
            style={{ color: 'var(--accent-color, #005C48)' }}
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </li>

        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;

          return (
            <li key={to} className="flex items-center">
              {/* Separador */}
              <ChevronRight
                className="w-4 h-4 mx-2"
                style={{ color: 'var(--text-muted, #6b7280)' }}
              />

              {isLast ? (
                <span
                  className="px-2 py-1 rounded-md font-medium"
                  style={{
                    backgroundColor: 'var(--accent-bg, rgba(0, 92, 72, 0.1))',
                    color: 'var(--accent-color, #005C48)'
                  }}
                >
                  {decodeURIComponent(value)}
                </span>
              ) : (
                <Link
                  to={to}
                  className="px-2 py-1 rounded-md transition-colors hover:opacity-75"
                  style={{ color: 'var(--text-muted, #6b7280)' }}
                >
                  {decodeURIComponent(value)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Hook personalizado para manejar las preferencias del usuario
function useUserPreferences() {
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fontSize');
      return saved || 'normal';
    }
    return 'normal';
  });
  
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      return saved === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fontSize', fontSize);
      document.documentElement.setAttribute('data-font-size', fontSize);
    }
  }, [fontSize]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', darkMode.toString());
      if (darkMode) {
        document.documentElement.classList.add('dark');
        // Variables CSS para modo oscuro
        document.documentElement.style.setProperty('--bg-color', '#111827');
        document.documentElement.style.setProperty('--bg-secondary', '#1f2937');
        document.documentElement.style.setProperty('--text-color', '#f3f4f6');
        document.documentElement.style.setProperty('--text-muted', '#9ca3af');
        document.documentElement.style.setProperty('--accent-color', '#4ECDC4');
        document.documentElement.style.setProperty('--accent-hover', '#81F7E5');
        document.documentElement.style.setProperty('--accent-bg', 'rgba(78, 205, 196, 0.2)');
        document.documentElement.style.setProperty('--border-color', '#374151');
        document.documentElement.style.setProperty('--hover-bg', '#374151');
      } else {
        document.documentElement.classList.remove('dark');
        // Variables CSS para modo claro
        document.documentElement.style.setProperty('--bg-color', '#ffffff');
        document.documentElement.style.setProperty('--bg-secondary', '#f9fafb');
        document.documentElement.style.setProperty('--text-color', '#111827');
        document.documentElement.style.setProperty('--text-muted', '#6b7280');
        document.documentElement.style.setProperty('--accent-color', '#005C48');
        document.documentElement.style.setProperty('--accent-hover', '#009B77');
        document.documentElement.style.setProperty('--accent-bg', 'rgba(0, 92, 72, 0.1)');
        document.documentElement.style.setProperty('--border-color', '#d1d5db');
        document.documentElement.style.setProperty('--hover-bg', '#f3f4f6');
      }
    }
  }, [darkMode]);

  return { fontSize, setFontSize, darkMode, setDarkMode };
}

// Componente para el menú de personalización (más discreto)
function PersonalizationMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { fontSize, setFontSize, darkMode, setDarkMode } = useUserPreferences();
  const menuRef = useRef(null);

  useClickOutside(menuRef, () => {
    if (isOpen) setIsOpen(false);
  });

  const fontSizes = [
    { id: 'small', label: 'Pequeño' },
    { id: 'normal', label: 'Normal' },
    { id: 'large', label: 'Grande' },
    { id: 'x-large', label: 'Muy Grande' }
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full transition-all opacity-70 hover:opacity-100"
        style={{
          backgroundColor: 'transparent',
          color: 'var(--text-muted, #6b7280)'
        }}
        aria-label="Opciones de personalización"
        title="Personalización"
      >
        <Settings size={16} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 z-20 divide-y rounded-lg shadow-lg w-64 overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-color, #ffffff)',
            borderColor: 'var(--border-color, #d1d5db)',
            border: '1px solid',
            color: 'var(--text-color, #111827)'
          }}
        >
          <div className="px-4 py-3 text-sm">
            <div className="font-medium mb-2">Personalización</div>
            
            {/* Selector de modo oscuro */}
            <div className="flex items-center justify-between mb-3">
              <span>Modo oscuro</span>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{
                  backgroundColor: darkMode ? 'var(--accent-color, #4ECDC4)' : '#d1d5db'
                }}
              >
                <span 
                  className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  style={{
                    transform: darkMode ? 'translateX(1.5rem)' : 'translateX(0.25rem)'
                  }}
                />
              </button>
            </div>
            
            {/* Selector de tamaño de fuente */}
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2">
                <Type size={16} />
                <span>Tamaño de fuente</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {fontSizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setFontSize(size.id)}
                    className="px-3 py-2 text-xs rounded-md transition-colors"
                    style={{
                      backgroundColor: fontSize === size.id 
                        ? 'var(--accent-color, #005C48)' 
                        : 'var(--hover-bg, #f3f4f6)',
                      color: fontSize === size.id 
                        ? '#ffffff' 
                        : 'var(--text-color, #111827)'
                    }}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [userMenuAbierto, setUserMenuAbierto] = useState(false);
  const { user, checking } = useAuth();
  const { darkMode } = useUserPreferences();

  const handleLogout = async () => {
    await fetch(buildApiUrl("/api/logout/"), {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/login";
  };

  return (
    <header
      className="shadow-md px-6 py-4"
      style={{
        backgroundColor: 'var(--bg-color, #ffffff)',
        color: 'var(--text-color, #111827)',
        boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
        position: "sticky",
        top: 0,
        zIndex: 1000
      }}
    >
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img
            src="/Logo_HospitalPadreHurtado.png"
            alt="Hospital Logo"
            className="h-10"
          />
        </div>

        {/* Contenedor para elementos del lado derecho */}
        <div className="flex items-center gap-4">
          {/* Botón menú móvil */}
          <button
            className="md:hidden"
            onClick={() => setMenuAbierto(!menuAbierto)}
            style={{ color: 'var(--accent-color, #005C48)' }}
          >
            {menuAbierto ? <X size={28} /> : <Menu size={28} />}
          </button>

          {/* Menú escritorio */}
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex gap-4 text-sm">
              <Link 
                to="/" 
                className="font-semibold transition-colors hover:opacity-75"
                style={{ color: 'var(--accent-color, #005C48)' }}
              >
                Home
              </Link>
              <Link 
                to="/boxes" 
                className="font-semibold transition-colors hover:opacity-75"
                style={{ color: 'var(--accent-color, #005C48)' }}
              >
                Boxes
              </Link>
              <Link 
                to="/agendas" 
                className="font-semibold transition-colors hover:opacity-75"
                style={{ color: 'var(--accent-color, #005C48)' }}
              >
                Agendas
              </Link>
              <Link 
                to="/dashboard-stats" 
                className="font-semibold transition-colors hover:opacity-75"
                style={{ color: 'var(--accent-color, #005C48)' }}
              >
                Dashboard
              </Link>
              <Link 
                to="/medicos" 
                className="font-semibold transition-colors hover:opacity-75"
                style={{ color: 'var(--accent-color, #005C48)' }}
              >
                Médicos
              </Link>
              <Link 
                to="/simulador" 
                className="font-semibold transition-colors hover:opacity-75"
                style={{ color: 'var(--accent-color, #005C48)' }}
              >
                Simulador
              </Link>
            </nav>

            {/* Usuario logueado con menú desplegable */}
            {!checking && user && (
              <div className="relative">
                <img
                  onClick={() => setUserMenuAbierto(!userMenuAbierto)}
                  className="w-10 h-10 rounded-full cursor-pointer"
                  style={{ 
                    border: '2px solid var(--border-color, #d1d5db)' 
                  }}
                  src={user.avatar || "/gatoloco.jpg"}
                  alt={user.name || "Maura Reyes"}
                  onError={(e) => { e.target.src = "/gatoloco.jpg"; }}
                />
                {userMenuAbierto && (
                  <div
                    className="absolute right-0 mt-2 z-10 divide-y rounded-lg shadow-sm w-44"
                    style={{
                      backgroundColor: 'var(--bg-color, #ffffff)',
                      borderColor: 'var(--border-color, #d1d5db)',
                      border: '1px solid',
                      color: 'var(--text-color, #111827)'
                    }}
                  >
                    <div className="px-4 py-3 text-sm">
                      <div>{user.name || "Maura Reyes"}</div>
                      <div 
                        className="font-medium truncate"
                        style={{ color: 'var(--text-muted, #6b7280)' }}
                      >
                        {user.email || ""}
                      </div>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm transition-colors"
                        style={{
                          color: '#dc2626'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                        }}
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!checking && !user && (
              <Link 
                to="/login" 
                className="font-semibold transition-colors hover:opacity-75"
                style={{ color: 'var(--accent-color, #005C48)' }}
              >
                Iniciar sesión
              </Link>
            )}

            {/* Menú de personalización (discreto, al final) */}
            <PersonalizationMenu />
          </div>
        </div>
      </div>

      {/* Menú móvil */}
      {menuAbierto && (
        <div className="md:hidden mt-4 space-y-4">
          <nav 
            className="flex flex-col gap-2 text-sm"
            style={{ color: 'var(--accent-color, #005C48)' }}
          >
            <Link to="/" className="font-semibold">Home</Link>
            <Link to="/boxes" className="font-semibold">Boxes</Link>
            <Link to="/agendas" className="font-semibold">Agendas</Link>
            <Link to="/dashboard-stats" className="font-semibold">Dashboard</Link>
            <Link to="/medicos" className="font-semibold">Médicos</Link>
            <Link to="/simulador" className="font-semibold">Simulador</Link>

            {/* Menú de personalización en móvil */}
            <div 
              className="pt-2 border-t"
              style={{ borderColor: 'var(--border-color, #d1d5db)' }}
            >
              <div className="font-medium mb-2">Personalización</div>
              
              {/* Selector de modo oscuro móvil */}
              <div className="flex items-center justify-between mb-3">
                <span>Modo oscuro</span>
                <button
                  onClick={() => {
                    const { darkMode, setDarkMode } = useUserPreferences();
                    setDarkMode(!darkMode);
                  }}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  style={{
                    backgroundColor: darkMode ? 'var(--accent-color, #4ECDC4)' : '#d1d5db'
                  }}
                >
                  <span 
                    className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                    style={{
                      transform: darkMode ? 'translateX(1.5rem)' : 'translateX(0.25rem)'
                    }}
                  />
                </button>
              </div>
              
              {/* Selector de tamaño de fuente móvil */}
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Type size={16} />
                  <span>Tamaño de fuente</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['small', 'normal', 'large', 'x-large'].map((size) => {
                    const currentFontSize = localStorage.getItem('fontSize') || 'normal';
                    return (
                      <button
                        key={size}
                        onClick={() => {
                          const { setFontSize } = useUserPreferences();
                          setFontSize(size);
                        }}
                        className="px-3 py-2 text-xs rounded-md transition-colors"
                        style={{
                          backgroundColor: currentFontSize === size
                            ? 'var(--accent-color, #005C48)' 
                            : 'var(--hover-bg, #f3f4f6)',
                          color: currentFontSize === size
                            ? '#ffffff' 
                            : 'var(--text-color, #111827)'
                        }}
                      >
                        {size === 'small' ? 'Pequeño' : 
                         size === 'normal' ? 'Normal' : 
                         size === 'large' ? 'Grande' : 'Muy Grande'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {!checking && user && (
              <>
                <div 
                  className="flex items-center gap-4 pt-2 border-t"
                  style={{ borderColor: 'var(--border-color, #d1d5db)' }}
                >
                  <div 
                    className="relative w-10 h-10 overflow-hidden rounded-full"
                    style={{ backgroundColor: 'var(--hover-bg, #f3f4f6)' }}
                  >
                    <img
                      className="w-full h-full object-cover"
                      src={user.avatar || "/gatoloco.jpg"}
                      alt={user.name || "Usuario"}
                      onError={(e) => { e.target.src = "/gatoloco.jpg"; }}
                    />
                  </div>
                  <div className="font-medium">
                    <div>{user.name || "Usuario"}</div>
                    <div 
                      className="text-sm"
                      style={{ color: 'var(--text-muted, #6b7280)' }}
                    >
                      {user.joined
                        ? `Miembro desde ${new Date(user.joined).toLocaleDateString()}`
                        : ""}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="mt-2 px-4 py-2 text-sm rounded transition-colors"
                  style={{
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    color: '#dc2626'
                  }}
                >
                  Cerrar sesión
                </button>
              </>
            )}

            {!checking && !user && (
              <Link to="/login" className="font-semibold">Iniciar sesión</Link>
            )}
          </nav>
        </div>
      )}

      {/* Migas de pan */}
      <Breadcrumbs />
    </header>
  );
}
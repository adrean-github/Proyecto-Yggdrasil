import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import useAuth from "./hooks/useAuth";

function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter(Boolean);

  return (
    <nav className="text-sm text-gray-500 mt-2" aria-label="Breadcrumb">
      <ol className="list-reset flex flex-wrap">
        <li>
          <Link to="/" className="text-[#005C48] hover:underline">Home</Link>
        </li>
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;
          return (
            <li key={to} className="flex items-center">
              <span className="mx-2">/</span>
              {isLast ? (
                <span className="text-gray-700">{decodeURIComponent(value)}</span>
              ) : (
                <Link to={to} className="text-[#005C48] hover:underline">
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

export default function Header() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [userMenuAbierto, setUserMenuAbierto] = useState(false);
  const { user, checking } = useAuth();

  const handleLogout = async () => {
    await fetch("http://localhost:8000/api/logout/", {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/login";
  };

  return (
    <header
      className="bg-white shadow-md px-6 py-4"
      style={{
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

        {/* Botón menú móvil */}
        <button
          className="md:hidden text-[#005C48]"
          onClick={() => setMenuAbierto(!menuAbierto)}
        >
          {menuAbierto ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* Menú escritorio */}
        <div className="hidden md:flex items-center gap-4">
          <nav className="flex gap-4 text-sm text-[#005C48]">
            <Link to="/" className="hover:text-[#005C48] font-semibold">Home</Link>
            <Link to="/dashboard-stats" className="hover:text-[#005C48] font-semibold">Dashboard</Link>
            <Link to="/boxes" className="hover:text-[#005C48] font-semibold">Boxes</Link>
            <Link to="/medicos" className="hover:text-[#005C48] font-semibold">Médicos</Link>
            <Link to="/agendas" className="hover:text-[#005C48] font-semibold">Agendas</Link>
            <Link to="/simulador" className="hover:text-[#005C48] font-semibold">Simulador</Link>
          </nav>

          {/* Usuario logueado con menú desplegable */}
          {!checking && user && (
            <div className="relative">
              <img
                onClick={() => setUserMenuAbierto(!userMenuAbierto)}
                className="w-10 h-10 rounded-full cursor-pointer ring-2 ring-gray-300"
                src={user.avatar || "/gatoloco.jpg"}
                alt={user.name || "Maura Reyes"}
                onError={(e) => { e.target.src = "/gatoloco.jpg"; }}
              />
              {userMenuAbierto && (
                <div className="absolute right-0 mt-2 z-10 bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-44">
                  <div className="px-4 py-3 text-sm text-gray-900">
                    <div>{user.name || "Maura Reyes"}</div>
                    <div className="font-medium truncate">{user.email || ""}</div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-100 hover:text-red-600"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!checking && !user && (
            <Link to="/login" className="hover:text-[#005C48] font-semibold">Iniciar sesión</Link>
          )}
        </div>
      </div>

      {/* Menú móvil */}
      {menuAbierto && (
        <div className="md:hidden mt-4 space-y-4">
          <nav className="flex flex-col gap-2 text-sm text-[#005C48]">
            <Link to="/" className="hover:text-[#005C48] font-semibold">Home</Link>
            <Link to="/dashboard-stats" className="hover:text-[#005C48] font-semibold">Dashboard</Link>
            <Link to="/boxes" className="hover:text-[#005C48] font-semibold">Boxes</Link>
            <Link to="/agendas" className="hover:text-[#005C48] font-semibold">Agendas</Link>
            <Link to="/medicos" className="hover:text-[#005C48] font-semibold">Médicos</Link>
            <Link to="/simulador" className="hover:text-[#005C48] font-semibold">Simulador</Link>

            {!checking && user && (
              <>
                <div className="flex items-center gap-4">
                  <div className="relative w-10 h-10 overflow-hidden bg-gray-100 rounded-full">
                    <img
                      className="w-full h-full object-cover"
                      src={user.avatar || "/default-avatar.png"}
                      alt={user.name || "Usuario"}
                      onError={(e) => { e.target.src = "/default-avatar.png"; }}
                    />
                  </div>
                  <div className="font-medium">
                    <div>{user.name || "Usuario"}</div>
                    <div className="text-sm text-gray-500">
                      {user.joined
                        ? `Miembro desde ${new Date(user.joined).toLocaleDateString()}`
                        : ""}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="mt-2 px-4 py-2 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                >
                  Cerrar sesión
                </button>
              </>
            )}

            {!checking && !user && (
              <Link to="/login" className="hover:text-[#005C48] font-semibold">Iniciar sesión</Link>
            )}
          </nav>
        </div>
      )}

      {/* Migas de pan */}
      <Breadcrumbs />
    </header>
  );
}

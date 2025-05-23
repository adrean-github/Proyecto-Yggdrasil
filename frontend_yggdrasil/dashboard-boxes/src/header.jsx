import { useState } from "react";
import { Menu, X } from "lucide-react";
import useAuth from "./hooks/useAuth"; 

export default function Header() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { user, checking } = useAuth();

  const handleLogout = async () => {
    await fetch("http://localhost:8000/api/logout/", {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/login";
  };

  return (
    <header className="bg-white shadow-md px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/Logo_HospitalPadreHurtado.png"
            alt="Hospital Logo"
            className="h-10"
          />
        </div>

        <button
          className="md:hidden text-[#5FB799]"
          onClick={() => setMenuAbierto(!menuAbierto)}
        >
          {menuAbierto ? <X size={28} /> : <Menu size={28} />}
        </button>

        <div className="hidden md:flex items-center gap-4">
          <nav className="flex gap-4 text-sm text-[#5FB799]">
            <a href="/DashboardBoxes" className="hover:text-green-900 font-semibold">Home</a>
            <a href="/DashboardBoxes" className="hover:text-green-900 font-semibold">Dashboard de actualidad</a>
            <a href="#" className="hover:text-green-900 font-semibold">Boxes</a>
            <a href="#" className="hover:text-green-900 font-semibold">Agendas</a>
            <a href="#" className="hover:text-green-900 font-semibold">Notificaciones</a>
            <a href="#" className="hover:text-green-900 font-semibold">Solicitudes</a>
            <a href="/simulador" className="hover:text-green-900 font-semibold">Simular agendas</a>
            {!checking && (
              user ? (
                <div className="relative">
                  <button
                    onClick={() => setMenuAbierto(prev => !prev)}
                    className="hover:text-green-900 font-semibold focus:outline-none"
                  >
                    Sesión ▾
                  </button>
                  {menuAbierto && (
                    <div className="absolute right-0 mt-2 bg-white border rounded shadow-lg z-50">
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-100 hover:text-red-600"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <a href="/login" className="hover:text-green-900 font-semibold">Iniciar sesión</a>
              )
            )}
          </nav>
        </div>
      </div>

      {menuAbierto && (
        <div className="md:hidden mt-4 space-y-4">
          <nav className="flex flex-col gap-2 text-sm text-[#5FB799]">
            <a href="/" className="hover:text-green-900 font-semibold">Home</a>
            <a href="/" className="hover:text-green-900 font-semibold">Dashboard de actualidad</a>
            <a href="#" className="hover:text-green-900 font-semibold">Boxes</a>
            <a href="#" className="hover:text-green-900 font-semibold">Agendas</a>
            <a href="#" className="hover:text-green-900 font-semibold">Notificaciones</a>
            <a href="#" className="hover:text-green-900 font-semibold">Solicitudes</a>
            {!checking && (
              user ? (
                <div className="relative">
                  <button
                    onClick={() => setMenuAbierto(prev => !prev)}
                    className="hover:text-green-900 font-semibold focus:outline-none"
                  >
                    Sesión ▾
                  </button>
                  {menuAbierto && (
                    <div className="absolute right-0 mt-2 bg-white border rounded shadow-lg z-50">
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-100 hover:text-red-600"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <a href="/login" className="hover:text-green-900 font-semibold">Iniciar sesión</a>
              )
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Header() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <header className="bg-white shadow-md px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img
            src="/Logo_HospitalPadreHurtado.png"
            alt="Hospital Logo"
            className="h-10"
          />
        </div>

        {/* Botón hamburguesa (solo visible en móviles) */}
        <button
          className="md:hidden text-[#5FB799]"
          onClick={() => setMenuAbierto(!menuAbierto)}
        >
          {menuAbierto ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* Botón y navegación en pantallas medianas y grandes */}
        <div className="hidden md:flex items-center gap-4">
          {/*
            <button className="w-full bg-[#5FB799] text-white px-4 py-2 rounded-full text-sm hover:bg-[#4fa986] font-semibold">
            Crear Agenda
            </button>*/
          }
          <nav className="flex gap-4 text-sm text-[#5FB799]">
            <a href="/" className="hover:text-green-900 font-semibold">Home</a>
            <a href="/" className="hover:text-green-900 font-semibold">Dashboard de actualidad</a>
            <a href="#" className="hover:text-green-900 font-semibold">Boxes</a>
            <a href="#" className="hover:text-green-900 font-semibold">Agendas</a>
            <a href="#" className="hover:text-green-900 font-semibold">Notificaciones</a>
            <a href="#" className="hover:text-green-900 font-semibold">Solicitudes</a>
            <a href="#" className="hover:text-green-900 font-semibold">Sesión</a>
          </nav>
        </div>
      </div>

      {/* Menú desplegable en móviles */}
      {menuAbierto && (
        <div className="md:hidden mt-4 space-y-4">
          {/*
          <button className="w-full bg-[#5FB799] text-white px-4 py-2 rounded-full text-sm hover:bg-[#4fa986] font-semibold">
          Crear Agenda
          </button>*/
          }

          <nav className="flex flex-col gap-2 text-sm text-[#5FB799]">
            <a href="/" className="hover:text-green-900 font-semibold">Home</a>
            <a href="/" className="hover:text-green-900 font-semibold">Dashboard de actualidad</a>
            <a href="#" className="hover:text-green-900 font-semibold">Boxes</a>
            <a href="#" className="hover:text-green-900 font-semibold">Agendas</a>
            <a href="#" className="hover:text-green-900 font-semibold">Notificaciones</a>
            <a href="#" className="hover:text-green-900 font-semibold">Solicitudes</a>
            <a href="#" className="hover:text-green-900 font-semibold">Sesión</a>
          </nav>
        </div>
      )}
    </header>
  );
}

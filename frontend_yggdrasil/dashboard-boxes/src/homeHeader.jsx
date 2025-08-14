import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function HomeHeader() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <header
      className="bg-white shadow-md px-6 py-4 sticky top-0 z-50"
      style={{ boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.08)" }}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/*Logo*/}
        <div className="flex items-center gap-2">
          <img
            src="/Logo_HospitalPadreHurtado.png"
            alt="Hospital Logo"
            className="h-10"
          />

        </div>

        {/*Menú hamburguesa móvil*/}
        <button
          className="md:hidden text-gray-700"
          onClick={() => setMenuAbierto(!menuAbierto)}
        >
          {menuAbierto ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/*Nav desktop*/}
        <nav className="hidden md:flex items-center gap-4">
            <a
                href="/login"
                className="text-sm font-semibold text-white bg-[#005C48] hover:bg-[#00403A] px-4 py-2 rounded-full transition"
            >
                Iniciar sesión
            </a>
        </nav>

      </div>

      {/* Navegación móvil */}
      {menuAbierto && (
        <div className="md:hidden mt-4">
            <nav className="flex flex-col gap-2 text-sm">
            <a
                href="/login"
                className="font-semibold text-white bg-green-500 hover:bg-[#005C48] px-4 py-2 rounded-full transition text-center"
            >
                Iniciar sesión
            </a>
            </nav>
        </div>
      )}
    </header>
  );
}


  

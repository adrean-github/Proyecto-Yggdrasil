import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function HomeHeader() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/Logo_HospitalPadreHurtado.png"
            alt="Hospital Padre Hurtado"
            className="h-10"
          />
        </div>

        <button
          className="md:hidden text-gray-600 hover:text-gray-900 transition"
          onClick={() => setMenuAbierto(!menuAbierto)}
        >
          {menuAbierto ? <X size={28} /> : <Menu size={28} />}
        </button>

        <nav className="hidden md:flex items-center gap-4">
          <a
            href="/login"
            className="text-sm font-semibold text-white bg-[#005C48] hover:bg-[#00403A] px-5 py-2 rounded-full transition shadow-sm"
          >
            Iniciar sesión
          </a>
        </nav>
      </div>

      {/* Nav móvil */}
      {menuAbierto && (
        <div className="md:hidden border-t border-gray-100 bg-white shadow-sm">
          <nav className="flex flex-col p-4 gap-3">
            <a
              href="/login"
              className="font-semibold text-white bg-[#005C48] hover:bg-[#00403A] px-5 py-2 rounded-full transition text-center shadow-sm"
            >
              Iniciar sesión
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

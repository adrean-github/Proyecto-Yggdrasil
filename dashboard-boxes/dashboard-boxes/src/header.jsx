// src/Header.jsx
export default function Header() {
    return (
      <header className="flex items-center justify-between bg-white shadow-md px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src="\Logo_HospitalPadreHurtado.png" alt="Hospital Logo" className="h-10" />
        </div>
  
        {/* Navegación y botón al mismo lado */}
        <div className="flex items-center gap-4">  
          <button className="bg-[#5FB799] text-white px-4 py-2 rounded-full text-sm hover:bg-[#4fa986]">
            Crear Agenda
          </button>
          <nav className="flex gap-4 text-sm text-[#5FB799]">
            <a href="#" className="hover:text-green-900">Home</a>
            <a href="#" className="hover:text-green-900">Boxes</a>
            <a href="#" className="hover:text-green-900">Agendas</a>
            <a href="#" className="hover:text-green-900">Citas</a>
            <a href="#" className="hover:text-green-900">Notificaciones</a>
            <a href="#" className="hover:text-green-900">Solicitudes</a>
            <a href="#" className="hover:text-green-900">Sesión</a>
          </nav>

        </div>
      </header>
    );
  }
  
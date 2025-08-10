import React, { useEffect, useRef, useState } from 'react';

const Homepage = () => {
  const serviciosRef = useRef(null);
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    const handleWheel = (e) => {
      if (scrolling) return;

      if (e.deltaY > 0) {
        setScrolling(true);
        serviciosRef.current?.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => setScrolling(false), 1000);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [scrolling]);

  return (
    <div className="overflow-x-hidden bg-gray-50 min-h-screen scroll-smooth">
      {/*Sección 1*/}
      <section
        className="relative flex flex-col justify-center items-center text-center min-h-screen py-20 sm:py-24 lg:pt-32 xl:pb-10"
        style={{
          backgroundImage: 'url("/hospital por fuera.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-black opacity-50"></div>

        <div className="relative z-10 px-4 max-w-3xl mx-auto text-white">
          <p className="inline-flex px-4 py-2 text-base border border-white rounded-full font-pj">
            Sistema de gestión de boxes hospitalarios
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl font-pj">
            Bienvenido a Yggdrasil
          </h1>
          <p className="max-w-xl mx-auto mt-6 text-base leading-7 font-inter">
            Plataforma interna para gestionar y visualizar la disponibilidad de boxes de atención médica en el Hospital Padre Hurtado.
          </p>
          <div className="relative inline-flex mt-10 group justify-center">

            <div className="absolute transition-all duration-1000 opacity-70 -inset-px bg-gradient-to-r from-green-400 via-green-500 to-green-600 rounded-xl blur-lg group-hover:opacity-100 group-hover:-inset-1 group-hover:duration-200 animate-tilt"></div>
            <a
                href="/login"
                className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-green-900 transition-all duration-200 bg-white font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
                Comenzar ahora
            </a>
          </div>
        </div>
      </section>

    {/*Sección 2*/}
    <section id="servicios" ref={serviciosRef} className="pt-28 pb-32 bg-gray-100 min-h-screen">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center font-pj">
        Un lugar donde puedes...
        </h2>

        {/*CARDS*/}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
            {
            title: "Visualizar Boxes",
            desc: "Consulta la disponibilidad y estado en tiempo real de boxes, visualiza topes de horario y toma decisiones al momento.",
            link: "/DashboardBoxes",
            image: "/box.png"
            },
            {
            title: "Reportes de uso",
            desc: "Accede, crea y descarga reportes estadísticos de uso y ocupación de boxes.",
            link: "/dashboard-stats",
            image: "/estadisticas.png"
            },
            {
            title: "Reservas No Médicas",
            desc: "Como personal administrador o jefe de pasillo, puedes reservar boxes para actividades de uso no médico, sin topes de horario.",
            link: "/reserva-no-medica",
            image: "/reserva.jpg"
            },
            {
            title: "Simulador de Flujos",
            desc: "Carga archivos de Excel o .csv para proyectar escenarios de uso de boxes, evitando errores de planificación.",
            link: "/simulador",
            image: "/simulador.jpg"
            },
        ].map((card, idx) => (
            <div
            key={idx}
            className="group relative w-full h-96 bg-gray-900 text-white rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:z-10 hover:scale-105 hover:shadow-2xl hover:rotate-0 transform rotate-[-2deg]"
            style={{
                backgroundImage: `url(${card.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
            >
            <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity group-hover:bg-opacity-30"></div>
            <div className="absolute bottom-0 p-6 z-10">
                <h3 className="text-2xl font-bold">{card.title}</h3>
                <p className="mt-2 text-sm text-gray-100">{card.desc}</p>
                <a
                href={card.link}
                className="inline-block mt-4 px-4 py-2 bg-white text-gray-900 font-semibold rounded-lg text-sm hover:bg-gray-100 transition"
                >
                Acceder
                </a>
            </div>
            </div>
        ))}
        </div>
    </div>
    </section>

      
    {/* FOOTER */}
    <footer className="bg-green-900 text-white pt-12 pb-20 mt-16">
    <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm">
        <p>© {new Date().getFullYear()} Yggdrasil · Hospital Padre Hurtado</p>
        <div className="mt-4 sm:mt-0 space-x-4">
            <a href="/login" className="hover:text-white">Login</a>
            <a href="/contacto" className="hover:text-white">Contacto</a>
        </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-200">
        Desarrollado con ❤️ por Elytra
        </div>
    </div>
    </footer>


    </div>
  );
};

export default Homepage;

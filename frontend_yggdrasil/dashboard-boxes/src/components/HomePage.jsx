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
            Sistema de gestión hospitalaria
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl font-pj">
            Bienvenido a Yggdrasil
          </h1>
          <p className="max-w-xl mx-auto mt-6 text-base leading-7 font-inter">
            Plataforma interna para gestionar y visualizar la disponibilidad de boxes de atención médica en el Hospital Padre Hurtado.
          </p>
          <div className="relative inline-flex mt-10 group justify-center">
            {/* Aura / Glow animado */}
            <div className="absolute transition-all duration-1000 opacity-70 -inset-px bg-gradient-to-r from-green-400 via-green-500 to-green-600 rounded-xl blur-lg group-hover:opacity-100 group-hover:-inset-1 group-hover:duration-200 animate-tilt"></div>

            {/* Botón visible */}
            <a
                href="/login"
                className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-green-900 transition-all duration-200 bg-white font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
                Iniciar sesión
            </a>
          </div>
        </div>
      </section>

      {/*Sección Servicios*/}
      <section
        id="servicios"
        ref={serviciosRef}
        className="pt-28 pb-16 bg-gray-100 min-h-screen"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/*Título*/}
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center font-pj">
            Servicios principales
          </h2>

          {/*cards*/}
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-6 bg-white shadow-md rounded-xl hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Visualizar Boxes</h3>
              <p className="text-gray-600">Consulta disponibilidad y estado en tiempo real.</p>
              <a href="/DashboardBoxes" className="mt-4 inline-block text-blue-600 hover:underline">
                Ir al panel
              </a>
            </div>

            <div className="p-6 bg-white shadow-md rounded-xl hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Médicos Online</h3>
              <p className="text-gray-600">Ver médicos actualmente conectados y activos.</p>
              <a href="/medicos" className="mt-4 inline-block text-blue-600 hover:underline">
                Ver médicos
              </a>
            </div>

            <div className="p-6 bg-white shadow-md rounded-xl hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Reservas No Médicas</h3>
              <p className="text-gray-600">Administra salas y espacios fuera de atención médica directa.</p>
              <a href="/reserva-no-medica" className="mt-4 inline-block text-blue-600 hover:underline">
                Gestionar reservas
              </a>
            </div>

            <div className="p-6 bg-white shadow-md rounded-xl hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Simulador de Flujos</h3>
              <p className="text-gray-600">Proyecta escenarios de uso de boxes por área clínica.</p>
              <a href="/simulador" className="mt-4 inline-block text-blue-600 hover:underline">
                Simular
              </a>
            </div>
          </div>

          {/*call to action*/}
          <div className="mt-16 text-center">
            <p className="text-gray-700 max-w-xl mx-auto text-lg font-inter">
              ¿Quieres saber más sobre cómo optimizar la gestión hospitalaria? Contacta a nuestro equipo para una demo personalizada.
            </p>
            <a
              href="/contacto"
              className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Contactar ahora
            </a>
          </div>
        </div>
      </section>

      {/*img hospital*/}
      <section className="py-16">
        <div className="max-w-5xl mx-auto">
          <img
            src="https://www.redsalud.cl/sites/default/files/styles/blog_full/public/blog/img-hospitalpadrehurtado_0.jpg"
            alt="Hospital Padre Hurtado"
            className="rounded-xl shadow-lg w-full object-cover"
          />
        </div>
      </section>
    </div>
  );
};

export default Homepage;

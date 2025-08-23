import React, { useEffect, useRef, useState } from 'react';

const Homepage = () => {
  const serviciosRef = useRef(null);
  const yggdrasilRef = useRef(null);
  const topRef = useRef(null);

  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    const handleWheel = (e) => {
      if (scrolling) return;
      const scrollThreshold = 30;
      if (Math.abs(e.deltaY) < scrollThreshold) return;
  
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
  
      setScrolling(true);

      if (e.deltaY > 0) {
        if (window.scrollY < serviciosRef.current.offsetTop - 50) {
          serviciosRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else if (window.scrollY < yggdrasilRef.current.offsetTop - 50) {
          yggdrasilRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        if (window.scrollY > yggdrasilRef.current.offsetTop - 50) {
          serviciosRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else if (window.scrollY > topRef.current.offsetTop + 50) {
          topRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }

      setTimeout(() => setScrolling(false), 600);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [scrolling]);

  const cards = [
    {
      title: "Visualizar Boxes",
      desc: "Consulta la disponibilidad y estado en tiempo real de boxes, visualiza topes de horario y toma decisiones al momento.",
      link: "/boxes",
      image: "/box.png"
    },
    {
      title: "Reportes de uso",
      desc: "Accede, crea y descarga reportes estadísticos de uso y ocupación de boxes.",
      link: "/dashboard-stats",
      image: "/estadisticas.png"
    },
    {
      title: "Agendamiento de boxes",
      desc: "Como personal de gestión o jefe de pasillo, puedes reservar boxes para actividades de uso médico o no médico, sin topes de horario.",
      link: "/agendas",
      image: "/res_no_med.png"
    },
    {
      title: "Simulador de Agendas",
      desc: "Carga archivos de Excel o .csv para proyectar escenarios de uso de boxes, evitando errores de planificación.",
      link: "/simulador",
      image: "/sim_agendas.png"
    },
  ];

  return (
    <div className="overflow-x-hidden bg-gray-50 min-h-screen scroll-smooth">
      {/*sección 1*/}
      <section
        ref={topRef}
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

      {/*sección 2*/}
      <section
        id="servicios"
        ref={serviciosRef}
        className="pt-28 pb-32 bg-gray-100 min-h-screen"
      >
        <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center font-pj max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          Un sitio donde puedes...
        </h2>
        <p className="text-sm text-gray-500 text-center py-2 md:hidden">
                Pulsa para desplegar opciones
        </p>
        <div className="accordion-container flex flex-wrap sm:flex-nowrap w-full max-w-full h-[32rem] shadow-xl select-none">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className={`
                relative cursor-pointer flex-grow transition-all duration-500 ease-in-out delay-75
                flex-[1]
                hover:flex-[5]
                bg-cover bg-center
                group
              `}
              style={{ backgroundImage: `url(${card.image})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none"></div>

              <div
                className="absolute bottom-0 left-0 right-0 p-8 z-10 bg-gradient-to-t from-black/90 via-black/80 to-transparent flex flex-col justify-end h-54 transition-opacity duration-500 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
              >
                <div className="flex flex-col gap-1 w-full mb-2">
                  <h3 className="text-2xl font-bold text-white drop-shadow-lg leading-tight">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-50 drop-shadow-md leading-snug">
                    {card.desc}
                  </p>
                </div>
                <a
                  href={card.link}
                  className="inline-block mt-2 px-14 py-2 bg-white/90 text-gray-900 font-semibold rounded-lg text-sm hover:bg-white transition self-start"
                >
                  Acceder
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/*secc 3*/}
      <section
        ref={yggdrasilRef}
        className="pt-24 pb-28 bg-gray-100 min-h-screen"
        style={{
          backgroundImage: 'url("/yggdrasil_tree.png")',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right center',
          backgroundSize: 'contain'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <h2 className="text-5xl font-bold text-gray-900 mb-12 text-center font-pj tracking-tight">
              ¿Por qué <span className="text-[#005C48]">"Yggdrasil"</span>?
            </h2>

            <p className="text-xl text-gray-800 leading-loose text-justify bg-white/60 backdrop-blur-md p-4 rounded-2xl shadow-lg border-l-4 border-[#005C48] transition-all duration-500 hover:shadow-xl">
              Inspirado en <span className="font-semibold text-[#005C48]">Yggdrasil</span>, el legendario árbol de la vida de la mitología nórdica, 
              nuestro sistema es el tronco que une cada box, agenda y profesional en un organismo vivo.  
              <br /><br />
              Tal como las raíces y ramas sostienen y alimentan el árbol, <span className="italic">Yggdrasil conecta las áreas del hospital</span>, 
              para fortalecer la coordinación, aumentar la eficiencia y garantizar la trazabilidad de cada atención. 
              Más que un sistema, es un puente entre tecnología y cuidado humano.
              <br /><br />
              Con Yggdrasil, cada box es un <span className="font-bold text-[#005C48]">nodo vital</span> en la red de salud, conectando información y recursos para una atención más integral.
            </p>
          </div>

          <div className="flex-1 flex justify-center">
          </div>
        </div>
      </section>
    </div>
  );
};

export default Homepage;

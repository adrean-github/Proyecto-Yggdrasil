import threading
import time
from datetime import datetime, timedelta
from .conexion_BDD import ConexionBDD
from .agenda_adapter import AgendaAdapter
from .actualizador_datos import ActualizadorDatos
from .event_listener import VistaActualizableDisp

def iniciar_flujo_actualizacion():
    def run():
        vista = VistaActualizableDisp()
        actualizador = ActualizadorDatos()
        actualizador.agregar_observador(vista)
        adapter = AgendaAdapter()
        conexion = ConexionBDD()
        dt = datetime.now().strftime('%Y-%m-%dT%H:%M:00')
        while True:
            print("Ejecutando flujo de actualización...", dt)
            try:
                dt1 = datetime.now()
                datos_crudos = conexion.obtener_datos_cliente(dt)
                agenda_boxes = adapter.adaptar_datos(datos_crudos)
                actualizador.actualizar(agenda_boxes)
                print("Flujo completado con éxito.\n")
                dt = dt1.strftime('%Y-%m-%dT%H:%M:%S')
            except Exception as e:
                print("Error durante la ejecución:", e)
            time.sleep(100)  # Esperar 5 minutos

    hilo = threading.Thread(target=run, daemon=True)
    hilo.start()

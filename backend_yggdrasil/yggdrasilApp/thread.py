import threading
import time
from datetime import datetime, timedelta
from .modulos.conexion_BDD import ConexionBDD
from .modulos.agenda_adapter import AgendaAdapter
from .modulos.actualizador_datos import ActualizadorDatos
 

hilo_actualizacion = None

def iniciar_flujo_actualizacion():
    global hilo_actualizacion
    if hilo_actualizacion is not None and hilo_actualizacion.is_alive():
        print("El hilo de actualización ya está corriendo")
        return
    
    def run():
        actualizador = ActualizadorDatos()
        adapter = AgendaAdapter()
        conexion = ConexionBDD()
        dt = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
        
        ejecucion_numero = 0
        
        while True:
            ejecucion_numero += 1
            print(f"🔄 [Ejecución #{ejecucion_numero}] Flujo de actualización desde: {dt}")
            
            try:
                # ⭐ CAPTURAR TIMESTAMP ANTES DE LA CONSULTA para evitar condiciones de carrera
                dt_inicio_consulta = datetime.now()
                
                print(f"📡 Consultando API desde: {dt}")
                datos_crudos = conexion.obtener_datos_cliente(dt)
                
                if datos_crudos:
                    
                    agenda_boxes = adapter.adaptar_datos(datos_crudos)
                    actualizador.actualizar(agenda_boxes)
                else:
                    print(f"ℹ️ [Ejecución #{ejecucion_numero}] No hay nuevos datos para procesar")
                
                # ⭐ ACTUALIZAR TIMESTAMP SOLO DESPUÉS DE PROCESAR EXITOSAMENTE
                # Agregar 1 segundo para evitar procesar el mismo registro dos veces
                dt_siguiente = dt_inicio_consulta + timedelta(seconds=1)
                dt = dt_siguiente.strftime('%Y-%m-%dT%H:%M:%S')
                print(f"✅ [Ejecución #{ejecucion_numero}] Flujo completado. Próxima consulta desde: {dt}\n")
                
            except Exception as e:
                print(f"❌ [Ejecución #{ejecucion_numero}] Error durante la ejecución: {e}")
                # En caso de error, no actualizar el timestamp para reintentarlo
                
            time.sleep(3) 

    hilo_actualizacion  = threading.Thread(target=run, daemon=True)
    hilo_actualizacion.start()

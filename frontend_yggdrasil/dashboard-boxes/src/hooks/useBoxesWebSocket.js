import { useEffect, useRef } from 'react';
import { buildWsUrl } from '../config/api';

export const useBoxesWebSocket = (onBoxStateChange) => {
  const socketRef = useRef(null);

  useEffect(() => {
    // Crear conexión WebSocket para boxes
    const ws_url = buildWsUrl("/ws/boxes/");
    console.log('[DEBUG] Intentando conectar WebSocket de Boxes a:', ws_url);
    const socket = new window.WebSocket(ws_url);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket de Boxes conectado exitosamente");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[DEBUG] Mensaje WebSocket de Boxes recibido:', data);
        
        if (data.type === "actualizacion_estado_box") {
          // Llamar al callback que pasó el componente
          if (onBoxStateChange) {
            onBoxStateChange({
              boxId: data.box_id,
              nuevoEstado: data.nuevo_estado
            });
          }
        }
      } catch (e) {
        console.error("Error procesando mensaje WebSocket de Boxes:", e);
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket de Boxes error:", err);
    };

    socket.onclose = (event) => {
      console.log("WebSocket de Boxes desconectado. Código:", event.code, "Razón:", event.reason);
    };

    // Cleanup cuando el componente se desmonta
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [onBoxStateChange]);

  return socketRef.current;
};

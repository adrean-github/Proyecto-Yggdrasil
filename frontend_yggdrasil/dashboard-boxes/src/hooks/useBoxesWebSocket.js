import { useEffect, useRef } from 'react';
import { buildWsUrl } from '../config/api';

export const useBoxesWebSocket = (onBoxStateChange) => {
  const socketRef = useRef(null);
  const timeoutRef = useRef(null);

  const debouncedCallback = (data) => {
    // Cancelar timeout anterior si existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Crear nuevo timeout para evitar llamadas demasiado frecuentes
    timeoutRef.current = setTimeout(() => {
      if (onBoxStateChange) {
        onBoxStateChange(data);
      }
    }, 100); // 100ms de debounce
  };

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
          // Usar callback con debounce para cambios de estado
          debouncedCallback({
            boxId: data.box_id,
            nuevoEstado: data.nuevo_estado
          });
        } else if (data.type === "actualizacion_agenda_box") {
          // Cambio en agenda que afecta el estado del box
          debouncedCallback({
            boxId: data.box_id,
            evento: data.evento,
            tipo: 'agenda_cambio'
          });
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
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [onBoxStateChange]);

  return socketRef.current;
};

// hooks/useClickOutside.js
import { useEffect } from 'react';

export const useClickOutside = (ref, handler, excludeRefs = []) => {
  useEffect(() => {
    const listener = (event) => {
      // No hacer nada si se hizo clic en el elemento ref o sus descendientes
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      
      // No hacer nada si se hizo clic en alguno de los elementos excluidos
      for (const excludeRef of excludeRefs) {
        if (excludeRef.current && excludeRef.current.contains(event.target)) {
          return;
        }
      }
      
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, excludeRefs]);
};
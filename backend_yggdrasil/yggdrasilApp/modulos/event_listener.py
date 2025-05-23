class EventListener():
    def actualizar(self):
        raise NotImplementedError("Debe implementar el método actualizar")


class VistaActualizableDisp(EventListener):
    _instancia = None

    def __new__(cls, *args, **kwargs):
        if not cls._instancia:
            cls._instancia = super(VistaActualizableDisp, cls).__new__(cls)
            cls._instancia._actualizado = False
        return cls._instancia

    @property
    def actualizado(self):
        return self._actualizado
    
    @actualizado.setter
    def actualizado(self, valor):
        if isinstance(valor, bool):
            self._actualizado = valor
        else:
            raise ValueError("Debe ser booleano")
        
    def actualizar(self):
        print("[VISTA] ¡Actualización recibida!")
        self._actualizado = True

    def resetear(self):
        self._actualizado = False
class Observable:
    def __init__(self):
        self._observadores = []

    def agregar_observador(self, observador):
        self._observadores.append(observador)
        print("[Observable] Observador agregado:", observador)

    def eliminar_observador(self, observador):
        self._observadores.remove(observador)

    def notificar_observadores(self):
        print(f"[Observable] Notificando a {len(self._observadores)} observadores...")
        for observador in self._observadores:
            observador.actualizar()
            print(f"[Observable] Notificando a {observador}")
            

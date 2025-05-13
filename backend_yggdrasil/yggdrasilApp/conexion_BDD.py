import requests


class ConexionBDD:
    def __init__(self, api_url="http://localhost:8000/api/modificados-desde/"):
        self.api_url = api_url 

    def obtener_datos_cliente(self, fecha_hora_str):
        try:
            response = requests.get(f"{self.api_url}{fecha_hora_str}/")

            if response.status_code == 200:
                return response.json()  
            else:
                print(f"Error en la API: {response.status_code}")
                return []
        except requests.exceptions.RequestException as e:
            print(f"Error al hacer la solicitud: {e}")
            return []


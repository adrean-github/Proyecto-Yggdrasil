import requests


class ConexionBDD:
    def __init__(self, api_url="http://localhost:8000/api/modificados-desde/"):
        self.api_url = api_url 
        # ⭐ Cache para detectar respuestas duplicadas
        self._ultima_respuesta_hash = None

    def obtener_datos_cliente(self, fecha_hora_str):
        try:
            url_completa = f"{self.api_url}{fecha_hora_str}/"
            print(f"🌐 Consultando: {url_completa}")
            
            response = requests.get(url_completa)

            if response.status_code == 200:
                datos = response.json()
                
                # ⭐ DETECTAR RESPUESTAS DUPLICADAS
                datos_str = str(sorted(datos, key=lambda x: x.get('id', 0)))
                datos_hash = hash(datos_str)
                
                if self._ultima_respuesta_hash == datos_hash:
                    print("⚠️ ADVERTENCIA: La API está retornando exactamente los mismos datos que la consulta anterior!")
                    print(f"📊 Datos duplicados: {len(datos)} registros idénticos")
                    return datos  # Retornar anyway, pero con advertencia
                
                self._ultima_respuesta_hash = datos_hash
                
                if datos:
                    print(f"✅ API respondió con {len(datos)} registros únicos")
                    # Mostrar algunos IDs para debug
                    ids = [str(d.get('id', 'N/A')) for d in datos[:5]]
                    print(f"🆔 Primeros IDs: {', '.join(ids)}")
                else:
                    print("ℹ️ API respondió con lista vacía")
                
                return datos
            else:
                print(f"❌ Error en la API: {response.status_code}")
                return []
        except requests.exceptions.RequestException as e:
            print(f"🔗 Error al hacer la solicitud: {e}")
            return []


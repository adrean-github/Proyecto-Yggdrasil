import random
from datetime import datetime, timedelta
import mysql.connector

# --- CONFIGURACIÓN ---
db_config = {
    "host": "localhost",
    "user": "root",
    "password": "123456",
    "database": "yggdrasil2"
}

start_date = datetime(2025, 8, 1)
end_date = datetime(2025, 8, 31)
min_hora = 9  
max_hora = 20 
registros_por_dia = 5  

conn = mysql.connector.connect(**db_config)
cursor = conn.cursor()

cursor.execute("SELECT idMedico FROM medico")
medicos = [row[0] for row in cursor.fetchall()]

cursor.execute("SELECT idBox FROM box")
boxes = [row[0] for row in cursor.fetchall()]

delta_days = (end_date - start_date).days + 1
for day_offset in range(delta_days):
    fecha = start_date + timedelta(days=day_offset)
    
    for box in boxes:
        n_agendas = random.randint(3 , registros_por_dia)  
        
        horas_usadas = []
        for _ in range(n_agendas):
            while True:
                hora_inicio = random.randint(min_hora, max_hora-1)
                if hora_inicio not in horas_usadas:
                    horas_usadas.append(hora_inicio)
                    break
            hora_inicio_str = f"{hora_inicio:02}:00:00"
            
            duracion = random.randint(1 , 2) 
            hora_fin = min(hora_inicio + duracion, max_hora)
            hora_fin_str = f"{hora_fin:02}:00:00"
            
            medico = random.choice(medicos)  
            
            #Insert para agendabox
            sql_agenda = """
            INSERT INTO agendabox (fechaAgenda, horaInicioAgenda, idBox, idMedico, horaFinAgenda, Habilitada)
            VALUES (%s, %s, %s, %s, %s, 1)
            """
            cursor.execute(sql_agenda, (fecha.strftime("%Y-%m-%d"), hora_inicio_str, box, medico, hora_fin_str))
            
            #Insert para atenamb
            sql_atenamb = """
            INSERT INTO atenamb (idMedico, idBox, fecha, horaInicio, horaFin)
            VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(sql_atenamb, (medico, str(box), fecha.strftime("%Y-%m-%d"), hora_inicio_str, hora_fin_str))

conn.commit()
cursor.close()
conn.close()

print("¡Datos de agendas generados correctamente!")

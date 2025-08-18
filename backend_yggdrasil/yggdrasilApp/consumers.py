import json
from channels.generic.websocket import AsyncWebsocketConsumer


class AgendaConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Unirse al grupo 'agendas'
        await self.channel_layer.group_add('agendas', self.channel_name)
        await self.accept()
        await self.send(text_data=json.dumps({
            'message': 'WebSocket conectado correctamente.'
        }))

    async def disconnect(self, close_code):
        # Salir del grupo 'agendas'
        await self.channel_layer.group_discard('agendas', self.channel_name)

    async def receive(self, text_data):
        # Aquí puedes manejar mensajes recibidos del frontend
        await self.send(text_data=json.dumps({
            'message': 'Mensaje recibido',
            'data': text_data
        }))

    # Handler para mensajes enviados al grupo
    async def agenda_update(self, event):
        # Reenviar el mensaje a los clientes conectados
        await self.send(text_data=json.dumps({
            'message': event.get('message', 'actualizacion_agenda')
        }))

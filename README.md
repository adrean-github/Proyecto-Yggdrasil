# Proyecto Yggdrasil
 Este es el repositorio ofcial de la empresa Elytra para el Proyecto Yggdrasil

1. activar venv 
.venv\scripts\activate
2. correr backend
daphne -b 0.0.0.0 -p 8000 yggdrasil_backend.asgi:application
3. correr frontend
npm run dev

4. correr los tunnels
cloudflared tunnel --url http://localhost:8000
cloudflared tunnel --url http://localhost:5173

5. pegar las nuevas urls en api.js, settings y vite.config
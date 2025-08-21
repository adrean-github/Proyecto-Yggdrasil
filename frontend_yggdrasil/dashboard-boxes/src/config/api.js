// Configuración simple de la API
// Cambia estas URLs según necesites:

// Para desarrollo local:
export const API_BASE_URL = 'http://localhost:8000';
export const WS_BASE_URL = 'ws://localhost:8000';

// Para Cloudflare Tunnel (cambia por tu URL real):
//export const API_BASE_URL = 'https://ui-epic-charts-adopt.trycloudflare.com';
//export const WS_BASE_URL = 'wss://ui-epic-charts-adopt.trycloudflare.com';

// Helper functions para construir URLs
export const buildApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
};

export const buildWsUrl = (endpoint) => {
  return `${WS_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
};

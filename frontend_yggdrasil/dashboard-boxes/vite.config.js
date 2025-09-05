import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'ahead-handed-vacation-attempts.trycloudflare.com', // cloudfared frontend
      '.trycloudflare.com', // Todos los subdominios de trycloudflare.com
      '.ngrok.io',          // Por si también usas ngrok
    ],
  },
});

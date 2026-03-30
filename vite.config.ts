import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/api/eleven': {
        target: 'https://api.elevenlabs.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/eleven/, ''),
      },
      '/api/ghl': {
        target: 'https://services.leadconnectorhq.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ghl/, ''),
      },
      '/api/jobs': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/logs': { target: 'http://localhost:3001', changeOrigin: true },
      '/health':   { target: 'http://localhost:3001', changeOrigin: true },
      '/entregables': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});

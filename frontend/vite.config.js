import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 800,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'https://freelance-backend-4ocv.onrender.com',
      '/uploads': 'https://freelance-backend-4ocv.onrender.com',
    },
  },
});

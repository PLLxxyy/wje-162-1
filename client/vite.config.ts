import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.VITE_PORT) || 5182,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.VITE_API_PORT || 3212}`,
        changeOrigin: true,
      },
    },
  },
});

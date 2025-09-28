// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, '.'), // frontend is the root for Vite
  build: {
    outDir: resolve(__dirname, './Dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, './index.html'),
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // Force Emotion + MUI styled engine to resolve from frontend/node_modules
      '@emotion/styled': resolve(__dirname, './node_modules/@emotion/styled'),
      '@emotion/react': resolve(__dirname, './node_modules/@emotion/react'),
      '@mui/styled-engine': resolve(__dirname, './node_modules/@mui/styled-engine'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: true,
    fs: {
      allow: [
        resolve(__dirname, '.'),   // frontend
        resolve(__dirname, '..'),  // project root (g:/frontdeskapp)
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

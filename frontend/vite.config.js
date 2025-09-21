import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.', // main directory
  build: {
    outDir: resolve(__dirname, './Dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, './index.html'),
      // removed 'graphql' from externalization — bundle will include only what's needed
      // external: [] // no externals needed for typical frontend bundles
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0', // bind to all interfaces so LAN devices can access the dev server
    port: 3000,
    open: true,
    // Proxy GraphQL requests to your backend (adjust target if your backend uses a different host/port)
    proxy: {
      '/graphql': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      // Optionally proxy other API paths, e.g.:
      // '/api': {
      //   target: 'http://localhost:5000',
      //   changeOrigin: true,
      //   secure: false,
      // }
    },
  },
});

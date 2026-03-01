import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const FRONTEND_PORTS = new Set(['3000', '5173', '5174', '8081']);

function resolveProxyTarget(rawBase) {
  const fallback = 'http://127.0.0.1:5000';
  const candidate = (rawBase || '').trim();
  if (!candidate) return fallback;

  try {
    const parsed = new URL(candidate);
    if (FRONTEND_PORTS.has(parsed.port || '')) {
      return fallback;
    }
    return parsed.origin;
  } catch {
    return fallback;
  }
}

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = resolveProxyTarget(env.VITE_API_BASE_URL);

  return {
    plugins: [react()],
    base: '/',
    optimizeDeps: {
      include: ['xlsx', 'jspdf', 'jspdf-autotable'],
    },
    ssr: {
      noExternal: ['xlsx', 'jspdf', 'jspdf-autotable'],
    },
    server: {
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
        },
        '/media': {
          target: apiBaseUrl,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 8081,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
        },
        '/media': {
          target: apiBaseUrl,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  };
});

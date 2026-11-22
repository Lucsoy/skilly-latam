import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: false,
    // Proxy para redirigir las peticiones /api al backend PHP en XAMPP.
    // La carpeta "backend" del proyecto debe copiarse a htdocs/skilly-api en XAMPP.
    // SKILLY_API_PROXY permite apuntar a otro servidor (p. ej. php -S en pruebas E2E).
    proxy: {
      '/api': {
        target: process.env.SKILLY_API_PROXY ?? 'http://localhost/skilly-api',
        changeOrigin: true,
        rewrite: (path) => path, // mantiene /api/... tal cual
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Dependencias de terceros en paquetes propios (INC-22): el navegador las guarda en
        // caché entre versiones y el código de Skilly queda bajo 500 kB.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-formularios': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-fechas': ['date-fns', 'date-fns-tz'],
          'vendor-iconos': ['lucide-react'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/services/**', 'src/modules/agenda/estadoReserva.ts', 'src/modules/auth/sesionStore.ts'],
      reporter: ['text-summary', 'json-summary', 'html'],
    },
  },
});

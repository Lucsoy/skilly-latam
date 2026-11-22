import { defineConfig } from 'vitest/config';

/**
 * Pruebas de integración contra la API PHP + MySQL reales.
 * Se ejecutan con `npm run test:integracion` y necesitan la API levantada
 * (XAMPP o `php -S`, ver docs/03_entorno/GUIA_INSTALACION.md).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integracion/**/*.test.ts'],
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});

/**
 * Configuracion global de Skilly.
 *
 * La aplicación usa la API REST de PHP (XAMPP) por defecto.
 * Para volver a la demo con mocks, define VITE_USE_API=false en el entorno.
 *
 * En desarrollo la URL de la API se resuelve a través del proxy de Vite (vite.config.ts).
 * Variables disponibles: ver .env.example.
 */

/** true = API PHP + MySQL | false = mocks (solo para pruebas/demos sin backend) */
export const USE_API = import.meta.env.MODE !== 'test' && import.meta.env.VITE_USE_API !== 'false';

/**
 * URL base de la API. En desarrollo el proxy de Vite redirige /api a XAMPP (localhost:80).
 * Para servir la compilación (dist/) desde otro lugar, define VITE_API_URL al compilar,
 * por ejemplo VITE_API_URL=http://localhost/skilly-api/api (ver GUIA_INSTALACION.md §10).
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL || '/api';

/** Zona horaria del negocio: la misma que usa la API (backend/config/config.php). */
export const ZONA_HORARIA_NEGOCIO = 'America/Santiago';

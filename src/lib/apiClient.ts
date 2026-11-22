/**
 * Cliente HTTP para comunicarse con la API REST de PHP (XAMPP).
 *
 * Traduce los codigos HTTP a los ErrorServicio que el resto del frontend
 * ya espera, asi que el cambio de mocks a API es transparente.
 */
import { fromZonedTime } from 'date-fns-tz';
import { API_BASE_URL, ZONA_HORARIA_NEGOCIO } from '@/config';
import { ErrorServicio, type CodigoError } from '@/services/errores';

// ── Mapeo de HTTP status a codigo de error de Skilly ────────────────────
const HTTP_A_CODIGO: Record<number, CodigoError> = {
  400: 'validacion',
  401: 'no_autorizado',
  403: 'no_autorizado',
  404: 'no_encontrado',
  409: 'conflicto',
  410: 'expirado',
  422: 'validacion',
  429: 'demasiados_intentos',
};

// ── Fechas de la API ────────────────────────────────────────────────────
// La API entrega fechas "AAAA-MM-DD HH:MM:SS" en la hora del negocio (America/Santiago,
// sin zona). Se convierten aquí a instantes ISO 8601 en UTC: así el resto de la app las
// interpreta igual en cualquier navegador y zona horaria (antes `new Date` las tomaba en
// la zona del equipo y Safari no las aceptaba).
const FECHA_API = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export function fechaApiAInstante(valor: string): string {
  return fromZonedTime(valor.replace(' ', 'T'), ZONA_HORARIA_NEGOCIO).toISOString();
}

function revivirFechas(_clave: string, valor: unknown): unknown {
  return typeof valor === 'string' && FECHA_API.test(valor) ? fechaApiAInstante(valor) : valor;
}

// ── Token de sesion ─────────────────────────────────────────────────────
let _token: string | null = null;

export function setApiToken(token: string | null): void {
  _token = token;
}

export function getApiToken(): string | null {
  return _token;
}

// ── Funciones de peticion ───────────────────────────────────────────────

interface OpcionesPeticion {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  /** 'blob' para descargar archivos en vez de leer JSON. */
  respuesta?: 'json' | 'blob';
}

async function peticion<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const { metodo = 'GET', body, params, respuesta = 'json' } = opciones;
  const esFormulario = typeof FormData !== 'undefined' && body instanceof FormData;

  // Construir URL con query params
  let url = `${API_BASE_URL}${ruta}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  // Con FormData el navegador pone el Content-Type (multipart con su boundary).
  const headers: Record<string, string> = esFormulario ? {} : { 'Content-Type': 'application/json' };

  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }

  try {
    const response = await fetch(url, {
      method: metodo,
      headers,
      body: body === undefined ? undefined : esFormulario ? (body as FormData) : JSON.stringify(body),
    });

    if (respuesta === 'blob' && response.ok) {
      return (await response.blob()) as T;
    }

    // Sin contenido (204)
    if (response.status === 204) {
      return undefined as T;
    }

    const texto = await response.text();
    const data = texto ? JSON.parse(texto, revivirFechas) : null;

    if (!response.ok) {
      const codigo: CodigoError = HTTP_A_CODIGO[response.status] ?? data?.codigo ?? 'red';
      const mensaje = data?.mensaje ?? 'Error inesperado del servidor.';
      throw new ErrorServicio(codigo, mensaje);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ErrorServicio) throw error;
    throw new ErrorServicio('red', 'No se pudo conectar con el servidor. Verifica que XAMPP este corriendo.');
  }
}

// ── Metodos publicos ────────────────────────────────────────────────────

export const api = {
  get<T>(ruta: string, params?: Record<string, string | number | undefined>): Promise<T> {
    return peticion<T>(ruta, { metodo: 'GET', params });
  },

  post<T>(ruta: string, body?: unknown): Promise<T> {
    return peticion<T>(ruta, { metodo: 'POST', body });
  },

  put<T>(ruta: string, body?: unknown): Promise<T> {
    return peticion<T>(ruta, { metodo: 'PUT', body });
  },

  patch<T>(ruta: string, body?: unknown): Promise<T> {
    return peticion<T>(ruta, { metodo: 'PATCH', body });
  },

  delete<T>(ruta: string, params?: Record<string, string | number | undefined>): Promise<T> {
    return peticion<T>(ruta, { metodo: 'DELETE', params });
  },

  /** Envía un formulario con archivos (multipart/form-data). */
  subir<T>(ruta: string, formulario: FormData): Promise<T> {
    return peticion<T>(ruta, { metodo: 'POST', body: formulario });
  },

  /** Descarga un archivo protegido (con el token de sesión) como Blob. */
  descargar(ruta: string, params?: Record<string, string | number | undefined>): Promise<Blob> {
    return peticion<Blob>(ruta, { metodo: 'GET', params, respuesta: 'blob' });
  },
};

/**
 * Utilidades para las pruebas de integración contra la API PHP real.
 *
 * La URL se toma de SKILLY_API_URL. Ejemplos:
 *   Linux/CI (php -S):   http://127.0.0.1:8080/api
 *   Windows con XAMPP:   http://localhost/skilly-api/api
 *
 * Requiere una base de datos recién importada desde database/skilly.sql
 * (con la cuenta fundadora inicial). Las pruebas crean sus propios datos con
 * correos únicos por ejecución.
 */
export const API = process.env.SKILLY_API_URL ?? 'http://127.0.0.1:8080/api';
export const FUNDADORA = {
  email: process.env.SKILLY_FUNDADORA_EMAIL ?? 'fundadora@skilly.cl',
  contrasena: process.env.SKILLY_FUNDADORA_CLAVE ?? 'Skilly#Fundadora2026',
  /** La API exige cambiar la contraseña inicial antes de operar: las pruebas usan esta. */
  nueva: process.env.SKILLY_FUNDADORA_CLAVE_NUEVA ?? 'FundadoraPruebas2026',
};
/** Sufijo único para no chocar con datos de ejecuciones anteriores. */
export const RUN = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

export interface Respuesta<T = any> {
  status: number;
  data: T;
  headers: Headers;
}

export async function req<T = any>(
  metodo: string,
  ruta: string,
  opciones: { token?: string; body?: unknown; form?: FormData; origen?: string } = {},
): Promise<Respuesta<T>> {
  const headers: Record<string, string> = {};
  if (opciones.token) headers.Authorization = `Bearer ${opciones.token}`;
  if (opciones.origen) headers.Origin = opciones.origen;
  let body: BodyInit | undefined;
  if (opciones.form) body = opciones.form;
  else if (opciones.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opciones.body);
  }
  const r = await fetch(`${API}${ruta}`, { method: metodo, headers, body });
  const texto = await r.text();
  let data: any = texto;
  try {
    data = texto ? JSON.parse(texto) : null;
  } catch {
    /* respuesta binaria o texto plano */
  }
  return { status: r.status, data, headers: r.headers };
}

/** Calcula el dígito verificador de un RUT chileno (módulo 11). */
export function rutValido(cuerpo: number): string {
  let suma = 0;
  let mult = 2;
  for (const d of String(cuerpo).split('').reverse()) {
    suma += Number(d) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const r = 11 - (suma % 11);
  const dv = r === 11 ? '0' : r === 10 ? 'K' : String(r);
  return `${cuerpo}-${dv}`;
}

export async function login(email: string, contrasena: string): Promise<string> {
  const r = await req('POST', '/auth/login', { body: { email, contrasena } });
  if (r.status !== 200) throw new Error(`login ${email} → ${r.status} ${JSON.stringify(r.data)}`);
  return r.data.token as string;
}

/**
 * Sesión de la fundadora con la contraseña ya cambiada. En una base recién importada la
 * cambia una vez (la API bloquea la contraseña inicial); si ya se cambió, solo ingresa.
 */
export async function loginFundadora(): Promise<string> {
  const conNueva = await req('POST', '/auth/login', { body: { email: FUNDADORA.email, contrasena: FUNDADORA.nueva } });
  if (conNueva.status === 200) return conNueva.data.token as string;
  const token = await login(FUNDADORA.email, FUNDADORA.contrasena);
  const c = await req('POST', '/auth/contrasena', { token, body: { actual: FUNDADORA.contrasena, nueva: FUNDADORA.nueva } });
  if (c.status !== 200) throw new Error(`cambio de contraseña inicial → ${c.status} ${JSON.stringify(c.data)}`);
  return token;
}

export function pdfMinimo(): Blob {
  return new Blob(['%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n'], { type: 'application/pdf' });
}

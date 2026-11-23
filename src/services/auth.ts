import type { Organizacion, PerfilPrivadoProfesional, Profesional, Sesion, TamanoOrganizacion } from '@/types';
import { almacen, persistir } from '@/mocks/almacen';
import type { CuentaMock } from '@/mocks/organizaciones';
import { idLocal, latencia } from '@/lib/tiempo';
import { formatearRut, limpiarRut } from '@/lib/rut';
import { normalizarLinkedin } from '@/lib/validadores';
import { ErrorServicio } from './errores';
import { establecerSesion, sesionActual } from './sesionActual';
import { configuracionSincrona } from './configuracion';
import { api, setApiToken } from '@/lib/apiClient';
import { USE_API } from '@/config';

/**
 * Autenticación. Hay tres roles: 'organizacion' (empresas que buscan un
 * profesional), 'profesional' (quien ofrece sus servicios) y 'administrador'
 * (equipo de Skilly).
 *
 * Backend esperado:
 *   POST /api/auth/login/            { email, contrasena }        → Sesion
 *   POST /api/auth/logout/                                        → 204
 *   POST /api/organizaciones/        DatosRegistroOrganizacion    → Sesion
 *   POST /api/profesionales/         DatosRegistroProfesional     → Sesion
 *   GET  /api/auth/sesion/                                        → Sesion (renovación)
 */

export interface CredencialesIngreso {
  email: string;
  contrasena: string;
}

export interface DatosRegistroOrganizacion {
  razonSocial: string;
  rut: string;
  giro: string;
  tamano: TamanoOrganizacion;
  nombreContacto: string;
  emailContacto: string;
  contrasena: string;
  /** Aceptación explícita de la política de datos: la API rechaza el registro sin ella. */
  consentimiento: true;
  /** Fecha en que se marcó (solo modo demostración; la API registra su propia fecha). */
  consentimientoAceptadoEn: string;
}

/** Registro en dos etapas: esta es la etapa 1 (cuenta). El perfil se completa después. */
export interface DatosRegistroProfesional {
  nombreCompleto: string;
  email: string;
  contrasena: string;
  /** Id de la categoría principal del árbol de Skilly. */
  areaPrincipal: string;
  /** Opcional: el profesional puede agregarlo después desde "Mi perfil". */
  linkedin?: string;
  /** Aceptación explícita de la política de datos: la API rechaza el registro sin ella. */
  consentimiento: true;
  /** Fecha en que se marcó (solo modo demostración; la API registra su propia fecha). */
  consentimientoAceptadoEn: string;
}

function crearSesion(cuenta: CuentaMock): Sesion {
  const organizacion =
    cuenta.rol === 'organizacion' ? (almacen.organizaciones.find((o) => o.id === cuenta.organizacionId) ?? null) : null;
  if (cuenta.rol === 'organizacion' && !organizacion) {
    throw new ErrorServicio('no_encontrado', 'No encontramos la organización asociada a esta cuenta.');
  }
  const profesional =
    cuenta.rol === 'profesional' ? (almacen.profesionales.find((p) => p.id === cuenta.profesionalId) ?? null) : null;
  if (cuenta.rol === 'profesional' && !profesional) {
    throw new ErrorServicio('no_encontrado', 'No encontramos el perfil asociado a esta cuenta.');
  }
  const sesion: Sesion = {
    token: `mock-token-${cuenta.id}`,
    usuario: { id: cuenta.id, nombre: cuenta.nombre, email: cuenta.email, rol: cuenta.rol },
    organizacion,
    profesional,
  };
  establecerSesion(sesion);
  return sesion;
}

export async function iniciarSesion(credenciales: CredencialesIngreso): Promise<Sesion> {
  if (USE_API) {
    const sesion = await api.post<Sesion>('/auth/login/', { email: credenciales.email.trim().toLowerCase(), contrasena: credenciales.contrasena });
    establecerSesion(sesion);
    return sesion;
  }
  await latencia();
  const email = credenciales.email.trim().toLowerCase();
  const cuenta = almacen.cuentas.find((c) => c.email === email);
  if (!cuenta || cuenta.contrasena !== credenciales.contrasena) {
    throw new ErrorServicio('credenciales_invalidas', 'El correo o la contraseña no coinciden. Revísalos e inténtalo otra vez.');
  }
  return crearSesion(cuenta);
}

export async function registrarOrganizacion(datos: DatosRegistroOrganizacion): Promise<Sesion> {
  if (USE_API) {
    const sesion = await api.post<Sesion>('/organizaciones/', datos);
    establecerSesion(sesion);
    return sesion;
  }
  await latencia();
  const email = datos.emailContacto.trim().toLowerCase();
  if (almacen.cuentas.some((c) => c.email === email)) {
    throw new ErrorServicio('conflicto', 'Ya existe una cuenta con ese correo. ¿Quieres iniciar sesión?');
  }
  const rutLimpio = limpiarRut(datos.rut);
  if (almacen.organizaciones.some((o) => limpiarRut(o.rut) === rutLimpio)) {
    throw new ErrorServicio('conflicto', 'Ese RUT ya está registrado en Skilly. Si es tu organización, inicia sesión.');
  }
  const ahora = new Date().toISOString();
  const organizacion: Organizacion = {
    id: idLocal('org'),
    razonSocial: datos.razonSocial.trim(),
    rut: formatearRut(datos.rut),
    giro: datos.giro.trim(),
    tamano: datos.tamano,
    nombreContacto: datos.nombreContacto.trim(),
    emailContacto: email,
    consentimiento: {
      aceptado: true,
      fecha: datos.consentimientoAceptadoEn,
      version: configuracionSincrona().versionPoliticaDatos,
    },
    creadaEn: ahora,
  };
  const cuenta: CuentaMock = {
    id: idLocal('cta'),
    email,
    contrasena: datos.contrasena,
    rol: 'organizacion',
    nombre: organizacion.nombreContacto,
    organizacionId: organizacion.id,
  };
  almacen.organizaciones.push(organizacion);
  almacen.cuentas.push(cuenta);
  persistir();
  return crearSesion(cuenta);
}

/** Separa "Camila Rojas Fuentes" en nombre ("Camila") y apellidos ("Rojas Fuentes"). */
function separarNombre(nombreCompleto: string): { nombre: string; apellido: string } {
  const partes = nombreCompleto.trim().split(/\s+/);
  return { nombre: partes[0] ?? '', apellido: partes.slice(1).join(' ') };
}

export async function registrarProfesional(datos: DatosRegistroProfesional): Promise<Sesion> {
  if (USE_API) {
    const sesion = await api.post<Sesion>('/profesionales/', datos);
    establecerSesion(sesion);
    return sesion;
  }
  await latencia();
  const email = datos.email.trim().toLowerCase();
  if (almacen.cuentas.some((c) => c.email === email)) {
    throw new ErrorServicio('conflicto', 'Ya existe una cuenta con ese correo. ¿Quieres iniciar sesión?');
  }
  const linkedin = normalizarLinkedin(datos.linkedin ?? '') || undefined;
  if (linkedin && almacen.profesionales.some((p) => p.linkedin?.toLowerCase() === linkedin.toLowerCase())) {
    throw new ErrorServicio('conflicto', 'Ese perfil de LinkedIn ya está asociado a otra cuenta en Skilly.');
  }
  const ahora = new Date().toISOString();
  const { nombre, apellido } = separarNombre(datos.nombreCompleto);

  // La ficha pública parte vacía: se completa en la etapa 2 desde "Mi perfil".
  const profesional: Profesional = {
    id: idLocal('prof'),
    nombre,
    apellido,
    titulo: '',
    ciudad: '',
    presentacion: '',
    formacion: [],
    experiencia: [],
    habilidades: [],
    linkedin,
    validadoPorSkilly: false,
    insignias: [],
    fechaIngreso: ahora,
  };
  const perfilPrivado: PerfilPrivadoProfesional = {
    profesionalId: profesional.id,
    email,
    areaPrincipal: datos.areaPrincipal,
    estadoValidacion: 'perfil_incompleto',
    documentos: [],
    consentimiento: {
      aceptado: true,
      fecha: datos.consentimientoAceptadoEn,
      version: configuracionSincrona().versionPoliticaDatos,
    },
  };
  const cuenta: CuentaMock = {
    id: idLocal('cta'),
    email,
    contrasena: datos.contrasena,
    rol: 'profesional',
    nombre: `${nombre} ${apellido}`.trim(),
    profesionalId: profesional.id,
  };
  almacen.profesionales.push(profesional);
  almacen.perfilesProfesionales.push(perfilPrivado);
  almacen.cuentas.push(cuenta);
  persistir();
  return crearSesion(cuenta);
}

/**
 * Cambia la contraseña de la cuenta en sesión (cualquier rol).
 * Backend: POST /api/auth/contrasena  { actual, nueva } → { ok: true }
 */
export async function cambiarContrasena(actual: string, nueva: string): Promise<void> {
  if (nueva.length < 8 || !/[A-Za-z]/.test(nueva) || !/\d/.test(nueva)) {
    throw new ErrorServicio('validacion', 'La nueva contraseña debe tener al menos 8 caracteres, con letras y números.');
  }
  if (actual === nueva) throw new ErrorServicio('validacion', 'La nueva contraseña debe ser distinta de la actual.');
  if (USE_API) {
    await api.post('/auth/contrasena', { actual, nueva });
    return;
  }
  await latencia();
  const id = sesionActual()?.usuario.id;
  const cuenta = almacen.cuentas.find((c) => c.id === id);
  if (!cuenta) throw new ErrorServicio('no_autorizado', 'Tu sesión terminó. Vuelve a ingresar para continuar.');
  if (cuenta.contrasena !== actual) throw new ErrorServicio('credenciales_invalidas', 'La contraseña actual no es correcta.');
  cuenta.contrasena = nueva;
  persistir();
}

export async function cerrarSesion(): Promise<void> {
  if (USE_API) {
    try { await api.post('/auth/logout/'); } finally { establecerSesion(null); }
    return;
  }
  await latencia();
  establecerSesion(null);
}

/** Restaura la sesión guardada en el cliente (equivale a validar el token contra el backend). */
export async function restaurarSesion(token: string): Promise<Sesion | null> {
  if (USE_API) {
    try {
      // El argumento es el token persistido por el store, no un identificador de cuenta.
      setApiToken(token);
      const sesion = await api.get<Sesion>('/auth/sesion/');
      establecerSesion(sesion);
      return sesion;
    } catch { establecerSesion(null); return null; }
  }
  const cuenta = almacen.cuentas.find((c) => `mock-token-${c.id}` === token);
  if (!cuenta) return null;
  try {
    return crearSesion(cuenta);
  } catch {
    return null;
  }
}

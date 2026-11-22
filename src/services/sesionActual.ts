import type { Actor, Organizacion, Profesional, Sesion } from '@/types';
import { ErrorServicio } from './errores';
import { setApiToken } from '@/lib/apiClient';

/**
 * Sesión activa a nivel de la capa de servicios.
 *
 * En producción esto será el token que el cliente HTTP enviará en la cabecera
 * Authorization; el backend deducirá el rol, la organización y el actor desde
 * él. Aquí lo mantenemos en memoria para que las funciones mock puedan aplicar
 * permisos y registrar quién hizo cada acción en el historial de trazabilidad.
 */
let sesionActiva: Sesion | null = null;

export function establecerSesion(sesion: Sesion | null): void {
  sesionActiva = sesion;
  setApiToken(sesion?.token ?? null);
}

export function sesionActual(): Sesion | null {
  return sesionActiva;
}

export function organizacionEnSesion(): Organizacion {
  if (!sesionActiva) {
    throw new ErrorServicio('no_autorizado', 'Tu sesión terminó. Vuelve a ingresar para continuar.');
  }
  if (!sesionActiva.organizacion) {
    throw new ErrorServicio('no_autorizado', 'Esta acción es solo para cuentas de organizaciones.');
  }
  return sesionActiva.organizacion;
}

export function organizacionEnSesionOpcional(): Organizacion | null {
  return sesionActiva?.organizacion ?? null;
}

/** Id del profesional en sesión. Lanza si quien opera no es un profesional. */
export function profesionalIdEnSesion(): string {
  if (!sesionActiva) {
    throw new ErrorServicio('no_autorizado', 'Tu sesión terminó. Vuelve a ingresar para continuar.');
  }
  if (sesionActiva.usuario.rol !== 'profesional' || !sesionActiva.profesional) {
    throw new ErrorServicio('no_autorizado', 'Esta acción es solo para cuentas de profesionales.');
  }
  return sesionActiva.profesional.id;
}

export function esAdministrador(): boolean {
  return sesionActiva?.usuario.rol === 'administrador' || sesionActiva?.usuario.rol === 'fundador';
}

export function esFundador(): boolean {
  return sesionActiva?.usuario.rol === 'fundador';
}

export function requiereFundador(): void {
  if (!sesionActiva) {
    throw new ErrorServicio('no_autorizado', 'Tu sesión terminó. Vuelve a ingresar para continuar.');
  }
  if (!esFundador()) {
    throw new ErrorServicio('no_autorizado', 'Esta acción requiere permisos de fundador de Skilly.');
  }
}

export function requiereAdministrador(): void {
  if (!sesionActiva) {
    throw new ErrorServicio('no_autorizado', 'Tu sesión terminó. Vuelve a ingresar para continuar.');
  }
  if (!esAdministrador()) {
    throw new ErrorServicio('no_autorizado', 'Esta acción es solo para el equipo de Skilly.');
  }
}

export function actorActual(): Actor {
  if (sesionActiva?.usuario.rol === 'administrador' || sesionActiva?.usuario.rol === 'fundador') {
    return { tipo: 'skilly', nombre: `${sesionActiva.usuario.nombre} (Skilly)` };
  }
  if (sesionActiva?.usuario.rol === 'profesional') {
    const p: Profesional | null = sesionActiva.profesional;
    return { tipo: 'profesional', nombre: p ? `${p.nombre} ${p.apellido}` : sesionActiva.usuario.nombre };
  }
  const org = organizacionEnSesion();
  return { tipo: 'organizacion', nombre: `${sesionActiva?.usuario.nombre ?? org.nombreContacto} (${org.razonSocial})` };
}

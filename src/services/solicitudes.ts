import type { Reserva } from '@/types';
import { almacen, clonar, persistir } from '@/mocks/almacen';
import { latencia } from '@/lib/tiempo';
import { ErrorServicio } from './errores';
import { requiereAdministrador, actorActual, organizacionEnSesion, profesionalIdEnSesion, esFundador, sesionActual } from './sesionActual';
import { transicionar } from '@/modules/agenda/estadoReserva';
import { liberarBloque } from './reservas';
import { profesionales } from '@/mocks/profesionales';
import { servicios } from '@/mocks/servicios';
import { USE_API } from '@/config';
import { api } from '@/lib/apiClient';

export interface AdministradorDisponible {
  id: string;
  nombre: string;
}

export function listarAdministradoresDisponibles(): AdministradorDisponible[] {
  return almacen.cuentas
    .filter((c) => c.rol === 'administrador' || c.rol === 'fundador')
    .map((c) => ({ id: c.id, nombre: c.nombre }));
}

export async function listarAdministradoresParaAsignar(): Promise<AdministradorDisponible[]> {
  if (USE_API) return api.get<AdministradorDisponible[]>('/admin/', { accion: 'administradores-disponibles' });
  return listarAdministradoresDisponibles();
}

/** Compatibilidad con pantallas antiguas: se actualiza desde el almacén actual. */
export const ADMINISTRADORES: AdministradorDisponible[] = listarAdministradoresDisponibles();

function guardar(reserva: Reserva): Reserva {
  const indice = almacen.reservas.findIndex((r) => r.id === reserva.id);
  if (indice < 0) throw new ErrorServicio('no_encontrado', 'No encontramos la solicitud.');
  almacen.reservas[indice] = reserva;
  persistir();
  return clonar(reserva);
}

function buscar(id: string): Reserva {
  const reserva = almacen.reservas.find((r) => r.id === id);
  if (!reserva) throw new ErrorServicio('no_encontrado', 'No encontramos la solicitud.');
  return reserva;
}

function nombreProfesional(id: string) {
  const p = profesionales.find((x) => x.id === id);
  return p ? `${p.nombre} ${p.apellido}` : id;
}

export async function listarSolicitudesAdmin(): Promise<Array<{ reserva: Reserva; organizacion: string; profesional: string; servicio: string }>> {
  if (USE_API) { requiereAdministrador(); return api.get<Array<{ reserva: Reserva; organizacion: string; profesional: string; servicio: string }>>('/admin/', { accion: 'solicitudes' }); }

  await latencia();
  requiereAdministrador();
  const actual = sesionActual();
  const esFundadorActual = esFundador();
  const idActual = actual?.usuario.id;
  return clonar(almacen.reservas)
    .filter((r) => ['SOLICITADA', 'APROBADA_ADMIN', 'PENDIENTE_PAGO'].includes(r.estado))
    .filter((r) => esFundadorActual || !r.administradorAsignadoId || r.administradorAsignadoId === idActual)
    .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
    .map((reserva) => ({
      reserva,
      organizacion: almacen.organizaciones.find((o) => o.id === reserva.organizacionId)?.razonSocial ?? reserva.organizacionId,
      profesional: nombreProfesional(reserva.profesionalId),
      servicio: servicios.find((s) => s.id === reserva.servicioId)?.titulo ?? reserva.servicioId,
    }));
}

export async function asignarAdministrador(reservaId: string, administradorId: string): Promise<Reserva> {
  if (USE_API) { requiereAdministrador(); return api.post<Reserva>(`/reservas/?id=${encodeURIComponent(reservaId)}&accion=asignar-administrador`, { administradorId }); }

  await latencia();
  requiereAdministrador();
  const reserva = buscar(reservaId);
  if (!['SOLICITADA'].includes(reserva.estado)) throw new ErrorServicio('conflicto', 'Solo puedes derivar solicitudes que aún no han sido aceptadas por administración.');
  const actual = sesionActual();
  if (!esFundador() && reserva.administradorAsignadoId && reserva.administradorAsignadoId !== actual?.usuario.id) {
    throw new ErrorServicio('no_autorizado', 'Esta solicitud ya está asignada a otro administrador.');
  }
  const admin = listarAdministradoresDisponibles().find((a) => a.id === administradorId);
  if (!admin) throw new ErrorServicio('no_encontrado', 'Ese administrador no existe.');
  reserva.administradorAsignadoId = admin.id;
  reserva.administradorAsignadoNombre = admin.nombre;
  persistir();
  return clonar(reserva);
}

export async function aprobarSolicitudAdmin(reservaId: string): Promise<Reserva> {
  if (USE_API) { requiereAdministrador(); return api.post<Reserva>(`/reservas/?id=${encodeURIComponent(reservaId)}&accion=aprobar-admin`, {}); }

  await latencia();
  requiereAdministrador();
  const reserva = buscar(reservaId);
  if (reserva.estado !== 'SOLICITADA') throw new ErrorServicio('conflicto', 'Esta solicitud ya fue revisada por administración.');
  const actual = sesionActual();
  if (!reserva.administradorAsignadoId) throw new ErrorServicio('conflicto', 'Primero debes asignar la solicitud a un administrador.');
  if (!esFundador() && reserva.administradorAsignadoId !== actual?.usuario.id) throw new ErrorServicio('no_autorizado', 'Solo el administrador asignado puede aceptar esta solicitud.');
  const admin = listarAdministradoresDisponibles().find((a) => a.id === reserva.administradorAsignadoId)!;
  const actualizada = transicionar(reserva, 'APROBADA_ADMIN', { tipo: 'skilly', nombre: admin.nombre }, {
    motivo: 'Solicitud aceptada por administración.',
    detalle: `La solicitud fue derivada al profesional ${nombreProfesional(reserva.profesionalId)}.`,
  });
  actualizada.administradorAsignadoId = admin.id;
  actualizada.administradorAsignadoNombre = admin.nombre;
  actualizada.administradorDecidioEn = new Date().toISOString();
  return guardar(actualizada);
}

export async function rechazarSolicitudAdmin(reservaId: string, motivo: string): Promise<Reserva> {
  if (USE_API) { requiereAdministrador(); return api.post<Reserva>(`/reservas/?id=${encodeURIComponent(reservaId)}&accion=rechazar-admin`, { motivo }); }

  await latencia();
  requiereAdministrador();
  const reserva = buscar(reservaId);
  if (reserva.estado !== 'SOLICITADA') throw new ErrorServicio('conflicto', 'Esta solicitud ya fue revisada por administración.');
  const actual = sesionActual();
  if (!reserva.administradorAsignadoId) throw new ErrorServicio('conflicto', 'Primero debes asignar la solicitud a un administrador.');
  if (!esFundador() && reserva.administradorAsignadoId !== actual?.usuario.id) throw new ErrorServicio('no_autorizado', 'Solo el administrador asignado puede rechazar esta solicitud.');
  const admin = listarAdministradoresDisponibles().find((a) => a.id === reserva.administradorAsignadoId)!;
  const actualizada = transicionar(reserva, 'RECHAZADA', { tipo: 'skilly', nombre: admin.nombre }, {
    motivo: motivo.trim() || 'Solicitud rechazada por administración.',
  });
  actualizada.administradorAsignadoId = admin.id;
  actualizada.administradorAsignadoNombre = admin.nombre;
  actualizada.administradorDecidioEn = new Date().toISOString();
  return guardar(actualizada);
}

export async function listarSolicitudesProfesional(): Promise<Reserva[]> {
  if (USE_API) return api.get<Reserva[]>('/reservas/', { accion: 'solicitudes-profesional' });

  await latencia();
  const profesionalId = profesionalIdEnSesion();
  // Igual que la API: todo lo que administración ya derivó al profesional.
  return clonar(
    almacen.reservas
      .filter((r) => r.profesionalId === profesionalId && r.estado !== 'SOLICITADA')
      .filter((r) => !(r.estado === 'RECHAZADA' && !r.profesionalDecidioEn))
      .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn)),
  );
}

export async function obtenerSolicitudProfesional(id: string): Promise<Reserva> {
  if (USE_API) return api.get<Reserva>('/reservas/', { id });

  await latencia();
  const profesionalId = profesionalIdEnSesion();
  const reserva = buscar(id);
  if (reserva.profesionalId !== profesionalId) throw new ErrorServicio('no_encontrado', 'No encontramos esta solicitud para tu cuenta.');
  return clonar(reserva);
}

export async function aceptarTrabajoProfesional(id: string): Promise<Reserva> {
  if (USE_API) return api.post<Reserva>(`/reservas/?id=${encodeURIComponent(id)}&accion=aceptar-profesional`, {});

  await latencia();
  const usuario = actorActual();
  const profesionalId = profesionalIdEnSesion();
  const reserva = buscar(id);
  if (reserva.profesionalId !== profesionalId) throw new ErrorServicio('no_encontrado', 'No encontramos esta solicitud para tu cuenta.');
  if (reserva.estado !== 'APROBADA_ADMIN') throw new ErrorServicio('conflicto', 'Esta solicitud ya no está pendiente de respuesta.');
  const actualizada = transicionar(reserva, 'PENDIENTE_PAGO', { tipo: 'profesional', nombre: usuario.nombre }, {
    motivo: 'El profesional aceptó realizar el trabajo.',
  });
  actualizada.profesionalDecidioEn = new Date().toISOString();
  return guardar(actualizada);
}

export async function rechazarTrabajoProfesional(id: string, motivo: string): Promise<Reserva> {
  if (USE_API) return api.post<Reserva>(`/reservas/?id=${encodeURIComponent(id)}&accion=rechazar-profesional`, { motivo });

  await latencia();
  const usuario = actorActual();
  const profesionalId = profesionalIdEnSesion();
  const reserva = buscar(id);
  if (reserva.profesionalId !== profesionalId) throw new ErrorServicio('no_encontrado', 'No encontramos esta solicitud para tu cuenta.');
  if (reserva.estado !== 'APROBADA_ADMIN') throw new ErrorServicio('conflicto', 'Esta solicitud ya no está pendiente de respuesta.');
  const actualizada = transicionar(reserva, 'RECHAZADA', { tipo: 'profesional', nombre: usuario.nombre }, {
    motivo: motivo.trim() || 'El profesional rechazó la solicitud.',
  });
  actualizada.profesionalDecidioEn = new Date().toISOString();
  return guardar(actualizada);
}

export async function pagarSolicitud(id: string): Promise<Reserva> {
  if (USE_API) return api.post<Reserva>(`/reservas/?id=${encodeURIComponent(id)}&accion=pagar`, {});

  await latencia();
  const organizacion = organizacionEnSesion();
  const reserva = buscar(id);
  if (reserva.organizacionId !== organizacion.id) throw new ErrorServicio('no_encontrado', 'No encontramos esta solicitud entre tus servicios.');
  if (reserva.estado !== 'PENDIENTE_PAGO') throw new ErrorServicio('conflicto', 'El pago no está disponible para esta solicitud.');
  const actualizada = transicionar(reserva, 'CONFIRMADA', { tipo: 'organizacion', nombre: organizacion.nombreContacto }, {
    motivo: 'Pago simulado confirmado por la organización.',
  });
  actualizada.estadoPago = 'confirmado';
  actualizada.pagoConfirmadoEn = new Date().toISOString();
  return guardar(actualizada);
}

/** Reserva del profesional en sesión (modo demo), con control de pertenencia. */
function reservaDelProfesional(id: string): Reserva {
  const reserva = buscar(id);
  if (reserva.profesionalId !== profesionalIdEnSesion()) {
    throw new ErrorServicio('no_encontrado', 'No encontramos esta solicitud para tu cuenta.');
  }
  return reserva;
}

/** CONFIRMADA → EN_CURSO: el profesional comienza el trabajo. */
export async function iniciarTrabajo(id: string): Promise<Reserva> {
  if (USE_API) return api.post<Reserva>(`/reservas/?id=${encodeURIComponent(id)}&accion=marcar-en-curso`, {});
  await latencia();
  const reserva = reservaDelProfesional(id);
  if (reserva.estado !== 'CONFIRMADA') throw new ErrorServicio('conflicto', 'Solo una contratación confirmada puede pasar a estar en curso.');
  return guardar(transicionar(reserva, 'EN_CURSO', actorActual(), { motivo: 'Trabajo iniciado.' }));
}

/** EN_CURSO → ENTREGADA: el profesional declara entregado el trabajo; la organización debe dar conformidad. */
export async function marcarEntregado(id: string): Promise<Reserva> {
  if (USE_API) return api.post<Reserva>(`/reservas/?id=${encodeURIComponent(id)}&accion=marcar-entregada`, {});
  await latencia();
  const reserva = reservaDelProfesional(id);
  if (reserva.estado !== 'EN_CURSO') throw new ErrorServicio('conflicto', 'Solo un trabajo en curso puede marcarse como entregado.');
  return guardar(transicionar(reserva, 'ENTREGADA', actorActual(), { motivo: 'El profesional marcó el trabajo como entregado.' }));
}

/**
 * Respuesta del profesional a un cambio de fecha (REAGENDADA → CONFIRMADA).
 * aceptar: la reserva pasa al horario propuesto y el original vuelve a ofrecerse.
 * rechazar: se mantiene el horario original y el propuesto vuelve a ofrecerse.
 */
export async function responderReagendamiento(id: string, decision: 'aceptar' | 'rechazar', motivo = ''): Promise<Reserva> {
  if (USE_API) return api.post<Reserva>(`/reservas/?id=${encodeURIComponent(id)}&accion=responder-reagendamiento`, { decision, motivo });
  await latencia();
  const reserva = reservaDelProfesional(id);
  const propuesto = reserva.reagendamientoPropuesto;
  if (reserva.estado !== 'REAGENDADA' || !propuesto) throw new ErrorServicio('conflicto', 'Esta contratación no tiene un cambio de fecha pendiente.');
  const actualizada = transicionar(reserva, 'CONFIRMADA', actorActual(), {
    motivo: decision === 'aceptar' ? 'El profesional aceptó la nueva fecha.' : motivo.trim() || 'El profesional no puede en la fecha propuesta; se mantiene la original.',
  });
  if (decision === 'aceptar') {
    liberarBloque(reserva.profesionalId, reserva.inicio, reserva.fin);
    actualizada.inicio = propuesto.inicio;
    actualizada.fin = propuesto.fin;
  } else {
    liberarBloque(reserva.profesionalId, propuesto.inicio, propuesto.fin);
  }
  actualizada.reagendamientoPropuesto = undefined;
  return guardar(actualizada);
}

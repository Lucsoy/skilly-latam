import type { Actor, EstadoReserva, EventoHistorial, Reserva } from '@/types';

/**
 * Máquina de estados de la reserva (contratación). Es la misma que aplica la API
 * en backend/api/reservas/index.php; aquí se usa en el modo demostración y para
 * decidir qué acciones mostrar en cada pantalla.
 *
 *   SOLICITADA → APROBADA_ADMIN → PENDIENTE_PAGO → CONFIRMADA → EN_CURSO → ENTREGADA → EVALUADA
 *        │              │               │              ↕
 *        │              │               │          REAGENDADA  (cambio de fecha pendiente del profesional)
 *        └──────────────┴───────────────┴──→ RECHAZADA / CANCELADA
 *
 * Módulo puro: sin React ni servicios. Toda transición pasa por `transicionar`,
 * que valida el cambio y agrega el evento al historial de trazabilidad.
 */

export const TRANSICIONES: Record<EstadoReserva, readonly EstadoReserva[]> = {
  SOLICITADA: ['APROBADA_ADMIN', 'RECHAZADA', 'CANCELADA'],
  APROBADA_ADMIN: ['PENDIENTE_PAGO', 'RECHAZADA', 'CANCELADA'],
  PENDIENTE_PAGO: ['CONFIRMADA', 'RECHAZADA', 'CANCELADA'],
  CONFIRMADA: ['EN_CURSO', 'CANCELADA', 'REAGENDADA'],
  EN_CURSO: ['ENTREGADA'],
  ENTREGADA: ['EVALUADA'],
  EVALUADA: [],
  RECHAZADA: [],
  CANCELADA: [],
  // El profesional acepta o rechaza el cambio de fecha: en ambos casos vuelve a CONFIRMADA.
  REAGENDADA: ['CONFIRMADA', 'CANCELADA'],
};

export const ESTADOS_FINALES: readonly EstadoReserva[] = ['EVALUADA', 'RECHAZADA', 'CANCELADA'];

/** Acciones que la organización puede ejecutar por sí misma. */
export type AccionOrganizacion =
  | 'cancelar'
  | 'solicitar_reagendamiento'
  | 'confirmar_conformidad'
  | 'evaluar';

/** Estados desde los que la organización puede cancelar (igual que la API). */
export const ESTADOS_CANCELABLES: readonly EstadoReserva[] = [
  'SOLICITADA',
  'APROBADA_ADMIN',
  'PENDIENTE_PAGO',
  'CONFIRMADA',
  'REAGENDADA',
];

/** Estados en que está habilitado el chat de coordinación (igual que la API). */
export const ESTADOS_CHAT: readonly EstadoReserva[] = ['CONFIRMADA', 'REAGENDADA', 'EN_CURSO', 'ENTREGADA'];

/** Acciones que el profesional puede ejecutar sobre una contratación. */
export type AccionProfesional =
  | 'responder_solicitud'
  | 'responder_reagendamiento'
  | 'iniciar_trabajo'
  | 'marcar_entregado'
  | 'evaluar_organizacion';

export type GrupoReserva = 'proximos' | 'en_curso' | 'finalizados';

export class ErrorTransicion extends Error {
  constructor(
    public readonly desde: EstadoReserva,
    public readonly hacia: EstadoReserva,
  ) {
    super(`No se puede pasar de ${desde} a ${hacia}`);
    this.name = 'ErrorTransicion';
  }
}

export function puedeTransicionar(desde: EstadoReserva, hacia: EstadoReserva): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

export function esEstadoFinal(estado: EstadoReserva): boolean {
  return ESTADOS_FINALES.includes(estado);
}

export function grupoDeEstado(estado: EstadoReserva): GrupoReserva {
  switch (estado) {
    case 'SOLICITADA':
    case 'APROBADA_ADMIN':
    case 'PENDIENTE_PAGO':
    case 'CONFIRMADA':
    case 'REAGENDADA':
      return 'proximos';
    case 'EN_CURSO':
      return 'en_curso';
    case 'ENTREGADA':
    case 'EVALUADA':
    case 'RECHAZADA':
    case 'CANCELADA':
      return 'finalizados';
  }
}

/**
 * Acciones disponibles para la organización según el estado actual.
 * - cancelar: antes de que comience el trabajo (ver ESTADOS_CANCELABLES).
 * - solicitar_reagendamiento: desde CONFIRMADA (requiere aceptación del profesional).
 * - confirmar_conformidad: desde ENTREGADA, una sola vez.
 * - evaluar: desde ENTREGADA con conformidad confirmada.
 */
export function accionesDisponibles(reserva: Pick<Reserva, 'estado' | 'conformidadConfirmada'>): AccionOrganizacion[] {
  const acciones: AccionOrganizacion[] = [];
  if (ESTADOS_CANCELABLES.includes(reserva.estado)) acciones.push('cancelar');
  if (reserva.estado === 'CONFIRMADA') acciones.push('solicitar_reagendamiento');
  if (reserva.estado === 'ENTREGADA' && !reserva.conformidadConfirmada) acciones.push('confirmar_conformidad');
  if (reserva.estado === 'ENTREGADA' && reserva.conformidadConfirmada) acciones.push('evaluar');
  return acciones;
}

/**
 * Acciones disponibles para el profesional según el estado actual.
 * `yaEvaluo` indica si el profesional ya envió su evaluación de la organización.
 */
export function accionesProfesional(
  reserva: Pick<Reserva, 'estado' | 'conformidadConfirmada'>,
  yaEvaluo = false,
): AccionProfesional[] {
  switch (reserva.estado) {
    case 'APROBADA_ADMIN':
      return ['responder_solicitud'];
    case 'REAGENDADA':
      return ['responder_reagendamiento'];
    case 'CONFIRMADA':
      return ['iniciar_trabajo'];
    case 'EN_CURSO':
      return ['marcar_entregado'];
    case 'ENTREGADA':
    case 'EVALUADA':
      return reserva.conformidadConfirmada && !yaEvaluo ? ['evaluar_organizacion'] : [];
    default:
      return [];
  }
}

export interface OpcionesTransicion {
  motivo?: string;
  detalle?: string;
  fecha?: Date;
  idEvento?: string;
}

/**
 * Devuelve una copia de la reserva en el nuevo estado, con el evento agregado
 * al historial. Lanza ErrorTransicion si el cambio no está permitido.
 */
export function transicionar(
  reserva: Reserva,
  hacia: EstadoReserva,
  actor: Actor,
  opciones: OpcionesTransicion = {},
): Reserva {
  if (!puedeTransicionar(reserva.estado, hacia)) {
    throw new ErrorTransicion(reserva.estado, hacia);
  }
  const fecha = (opciones.fecha ?? new Date()).toISOString();
  const evento: EventoHistorial = {
    id: opciones.idEvento ?? `${reserva.id}-h${reserva.historial.length + 1}`,
    fecha,
    actor,
    estadoAnterior: reserva.estado,
    estadoNuevo: hacia,
    motivo: opciones.motivo,
    detalle: opciones.detalle,
  };
  return {
    ...reserva,
    estado: hacia,
    historial: [...reserva.historial, evento],
  };
}

/**
 * Registra un evento que no cambia el estado (ej. confirmación de conformidad).
 * Mantiene la trazabilidad completa sin alterar la máquina.
 */
export function registrarEvento(
  reserva: Reserva,
  actor: Actor,
  opciones: OpcionesTransicion = {},
): Reserva {
  const fecha = (opciones.fecha ?? new Date()).toISOString();
  const evento: EventoHistorial = {
    id: opciones.idEvento ?? `${reserva.id}-h${reserva.historial.length + 1}`,
    fecha,
    actor,
    estadoAnterior: reserva.estado,
    estadoNuevo: reserva.estado,
    motivo: opciones.motivo,
    detalle: opciones.detalle,
  };
  return { ...reserva, historial: [...reserva.historial, evento] };
}

export const ETIQUETA_ESTADO: Record<EstadoReserva, string> = {
  SOLICITADA: 'Solicitada',
  CONFIRMADA: 'Confirmada',
  EN_CURSO: 'En curso',
  ENTREGADA: 'Entregada',
  EVALUADA: 'Evaluada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
  REAGENDADA: 'Reagendamiento pendiente',
  APROBADA_ADMIN: 'Aprobada por administración',
  PENDIENTE_PAGO: 'Pago pendiente',
};

/** Explicación breve, en tono cercano, de qué significa cada estado para la organización. */
export const DESCRIPCION_ESTADO: Record<EstadoReserva, string> = {
  SOLICITADA: 'Tu solicitud fue enviada a administración. La estamos revisando antes de contactar al profesional.',
  APROBADA_ADMIN: 'Administración aprobó tu solicitud. Ahora el profesional debe confirmar que puede realizar el trabajo.',
  PENDIENTE_PAGO: 'El profesional aceptó el trabajo. Puedes completar el pago para confirmar la contratación.',
  CONFIRMADA: 'El profesional aceptó. Ya tienen fecha y hora.',
  EN_CURSO: 'El servicio está en desarrollo.',
  ENTREGADA: 'El profesional entregó el trabajo. Revísalo y confirma si quedó conforme.',
  EVALUADA: 'Servicio cerrado y evaluado. Gracias por tu opinión.',
  RECHAZADA: 'El profesional no pudo tomar esta solicitud. Puedes buscar otra fecha u otro profesional.',
  CANCELADA: 'Esta reserva fue cancelada.',
  REAGENDADA: 'Pediste cambiar la fecha. El profesional debe aceptarla; mientras tanto se mantiene el horario original.',
};

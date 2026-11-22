import type { Modalidad, Reserva } from '@/types';
import { almacen, clonar, persistir } from '@/mocks/almacen';
import { idLocal, latencia } from '@/lib/tiempo';
import { calcularCancelacion, calcularDesglose, type ResultadoCancelacion } from '@/lib/precios';
import { formatearCLP } from '@/lib/formato';
import { registrarEvento, transicionar, ErrorTransicion } from '@/modules/agenda/estadoReserva';
import { ErrorServicio } from './errores';
import { actorActual, organizacionEnSesion, profesionalIdEnSesion } from './sesionActual';
import { configuracionSincrona } from './configuracion';
import { bloqueSincrono } from './disponibilidad';
import { servicioSincrono } from './catalogo';
import { USE_API } from '@/config';
import { api } from '@/lib/apiClient';

/**
 * Reservas de la organización.
 *
 * Backend esperado:
 *   GET   /api/reservas/                                → Reserva[]  (solo las de la organización autenticada)
 *   GET   /api/reservas/{id}/                           → Reserva
 *   POST  /api/reservas/                                DatosNuevaReserva → Reserva (estado SOLICITADA)
 *   POST  /api/reservas/{id}/cancelar/                  { motivo } → Reserva
 *   POST  /api/reservas/?id={id}&accion=reagendar       { bloqueId, motivo } → Reserva (estado REAGENDADA)
 *   POST  /api/reservas/{id}/conformidad/               → Reserva
 *   GET   /api/reservas/{id}/simular-cancelacion/       → ResultadoCancelacion
 *
 * PAGO: en esta etapa es SIMULADO (accion=pagar en solicitudes.ts). No se cobra nada.
 * PUNTO DE INTEGRACIÓN DE PAGO REAL (fuera del alcance académico):
 *   Al crear la reserva, el backend devolverá estadoPago = 'pendiente_confirmacion'.
 *   La confirmación del pago llegará por webhook de la pasarela al backend, que
 *   actualizará estadoPago y notificará. La interfaz solo muestra el estado.
 */

export interface DatosNuevaReserva {
  retencionId: string;
  bloqueId: string;
  servicioId: string;
  modalidad: Modalidad;
  mensaje?: string;
  /** Aceptación explícita de las condiciones; el backend registra fecha, hora y usuario. */
  aceptaCondiciones: true;
  /** Valores mostrados a la organización antes de aceptar. */
  condiciones: { precio: number; porcentaje: number; version: string };
}

function reservaDeOrganizacion(id: string): Reserva {
  const organizacion = organizacionEnSesion();
  const reserva = almacen.reservas.find((r) => r.id === id && r.organizacionId === organizacion.id);
  if (!reserva) {
    throw new ErrorServicio('no_encontrado', 'No encontramos esa reserva entre tus servicios.');
  }
  return reserva;
}

function guardarReserva(actualizada: Reserva): Reserva {
  const indice = almacen.reservas.findIndex((r) => r.id === actualizada.id);
  if (indice >= 0) almacen.reservas[indice] = actualizada;
  else almacen.reservas.push(actualizada);
  persistir();
  return clonar(actualizada);
}

/** Devuelve un horario al catálogo del profesional si todavía no pasó (modo demo). */
export function liberarBloque(profesionalId: string, inicio: string, fin: string): void {
  if (new Date(inicio) <= new Date()) return;
  if (almacen.disponibilidad.some((b) => b.profesionalId === profesionalId && b.inicio === inicio)) return;
  almacen.disponibilidad.push({ id: idLocal('blq'), profesionalId, inicio, fin });
}

function siguienteCodigo(): string {
  const ano = new Date().getFullYear();
  const numeros = almacen.reservas
    .map((r) => Number(r.codigo.split('-')[2] ?? 0))
    .filter((n) => !Number.isNaN(n));
  const siguiente = (numeros.length ? Math.max(...numeros) : 0) + 1;
  return `SK-${ano}-${String(siguiente).padStart(4, '0')}`;
}

export async function listarReservas(): Promise<Reserva[]> {
  if (USE_API) return api.get<Reserva[]>('/reservas/');
  await latencia();
  const organizacion = organizacionEnSesion();
  return clonar(
    almacen.reservas
      .filter((r) => r.organizacionId === organizacion.id)
      .sort((a, b) => a.inicio.localeCompare(b.inicio)),
  );
}

export async function obtenerReserva(id: string): Promise<Reserva> {
  if (USE_API) return api.get<Reserva>('/reservas/', { id });
  await latencia();
  return clonar(reservaDeOrganizacion(id));
}

/**
 * Confirma el horario retenido con las condiciones que vio la organización.
 * @param datos Identificadores de la retención y del servicio, modalidad y aceptación.
 * @returns La reserva creada con su código y desglose económico.
 * @throws ErrorServicio si la solicitud se rechaza, por ejemplo por condiciones vencidas.
 */
export async function crearReserva(datos: DatosNuevaReserva): Promise<Reserva> {
  if (USE_API) return api.post<Reserva>('/reservas/', datos);
  await latencia();
  const organizacion = organizacionEnSesion();
  if (datos.aceptaCondiciones !== true) throw new ErrorServicio('validacion', 'Debes aceptar las condiciones para continuar.');
  const ahora = new Date();

  const retencion = almacen.retenciones.find((r) => r.id === datos.retencionId && r.organizacionId === organizacion.id);
  if (!retencion || new Date(retencion.expiraEn) <= ahora) {
    throw new ErrorServicio('expirado', 'Se acabó el tiempo para completar esta reserva y el horario volvió a quedar libre. Elige un horario de nuevo.');
  }
  if (retencion.bloqueId !== datos.bloqueId || retencion.servicioId !== datos.servicioId) {
    throw new ErrorServicio('validacion', 'Los datos de la reserva no coinciden con el horario retenido.');
  }

  const bloque = bloqueSincrono(datos.bloqueId);
  const servicio = servicioSincrono(datos.servicioId);
  if (!bloque || !servicio) {
    throw new ErrorServicio('no_encontrado', 'El horario o el servicio ya no están disponibles.');
  }
  if (!servicio.modalidades.includes(datos.modalidad)) {
    throw new ErrorServicio('validacion', 'Ese servicio no se ofrece en la modalidad elegida.');
  }

  const config = configuracionSincrona();
  if (!datos.condiciones || datos.condiciones.precio !== servicio.precio
    || datos.condiciones.porcentaje !== config.comisionPorcentaje || datos.condiciones.version !== config.versionCondiciones) {
    throw new ErrorServicio('conflicto', 'Las condiciones cambiaron. Revisa los valores y vuelve a confirmar.');
  }
  const desglose = calcularDesglose(servicio.precio, config.comisionPorcentaje);
  const actor = actorActual();
  const id = idLocal('res');

  const base: Reserva = {
    id,
    codigo: siguienteCodigo(),
    organizacionId: organizacion.id,
    profesionalId: servicio.profesionalId,
    servicioId: servicio.id,
    inicio: bloque.inicio,
    fin: bloque.fin,
    modalidad: datos.modalidad,
    mensaje: datos.mensaje?.trim() || undefined,
    ...desglose,
    // Estado inicial: se sobreescribe con la primera transición registrada abajo.
    estado: 'SOLICITADA',
    estadoPago: 'pendiente_confirmacion',
    conformidadConfirmada: false,
    aceptacionCondiciones: { fecha: ahora.toISOString(), usuario: actor.nombre, version: config.versionCondiciones },
    creadaEn: ahora.toISOString(),
    historial: [
      {
        id: `${id}-h1`,
        fecha: ahora.toISOString(),
        actor,
        estadoAnterior: null,
        estadoNuevo: 'SOLICITADA',
        motivo: 'Reserva creada por la organización',
      },
    ],
  };

  // El bloque deja de estar disponible y la retención se consume.
  almacen.disponibilidad = almacen.disponibilidad.filter((b) => b.id !== bloque.id);
  almacen.retenciones = almacen.retenciones.filter((r) => r.id !== retencion.id);
  return guardarReserva(base);
}


/** Lista las reservas de la cuenta profesional autenticada (o del actor activo). */
export async function listarReservasProfesional(): Promise<Reserva[]> {
  if (USE_API) return api.get<Reserva[]>('/reservas/', { accion: 'solicitudes-profesional' });
  await latencia();
  const id = profesionalIdEnSesion();
  return clonar(almacen.reservas.filter((r) => r.profesionalId === id).sort((a, b) => b.creadaEn.localeCompare(a.creadaEn)));
}

/** Muestra la consecuencia de cancelar antes de que la organización confirme. */
export async function simularCancelacion(id: string): Promise<ResultadoCancelacion> {
  if (USE_API) return api.get<ResultadoCancelacion>('/reservas/', { id, accion: 'simular-cancelacion' });
  await latencia();
  const reserva = reservaDeOrganizacion(id);
  return calcularCancelacion(reserva.inicio, reserva.total, configuracionSincrona().politicaCancelacion, new Date(), reserva.estadoPago === 'confirmado');
}

export async function cancelarReserva(id: string, motivo: string): Promise<Reserva> {
  if (USE_API) return api.post<Reserva>(`/reservas/?id=${encodeURIComponent(id)}&accion=cancelar`, { motivo });
  await latencia();
  const reserva = reservaDeOrganizacion(id);
  const pagado = reserva.estadoPago === 'confirmado';
  const resultado = calcularCancelacion(reserva.inicio, reserva.total, configuracionSincrona().politicaCancelacion, new Date(), pagado);
  const detalle = !pagado
    ? 'Cancelada antes del pago: no hubo cobro.'
    : resultado.retencionPorcentaje === 0
      ? 'Cancelación sin costo.'
      : `Cancelación con ${Math.floor(resultado.horasAntelacion)} horas de antelación: se retiene el ${resultado.retencionPorcentaje} % del total (${formatearCLP(resultado.montoRetenido)}).`;

  try {
    const actualizada = transicionar(reserva, 'CANCELADA', actorActual(), { motivo: motivo.trim(), detalle });
    actualizada.estadoPago = !pagado ? 'sin_cobro' : resultado.montoRetenido > 0 ? 'retenido_parcial' : 'reembolsado';
    // Los horarios vuelven a estar disponibles para otras organizaciones.
    liberarBloque(actualizada.profesionalId, actualizada.inicio, actualizada.fin);
    if (actualizada.reagendamientoPropuesto) {
      liberarBloque(actualizada.profesionalId, actualizada.reagendamientoPropuesto.inicio, actualizada.reagendamientoPropuesto.fin);
      actualizada.reagendamientoPropuesto = undefined;
    }
    return guardarReserva(actualizada);
  } catch (error) {
    if (error instanceof ErrorTransicion) {
      throw new ErrorServicio('transicion_invalida', 'Esta reserva ya no se puede cancelar desde su estado actual.');
    }
    throw error;
  }
}

export async function solicitarReagendamiento(id: string, bloqueId: string, motivo: string): Promise<Reserva> {
  if (USE_API) return api.post<Reserva>(`/reservas/?id=${encodeURIComponent(id)}&accion=reagendar`, { bloqueId, motivo });
  await latencia();
  const reserva = reservaDeOrganizacion(id);
  const bloque = bloqueSincrono(bloqueId);
  if (!bloque || bloque.profesionalId !== reserva.profesionalId) {
    throw new ErrorServicio('no_encontrado', 'Ese horario ya no está disponible. Elige otro, por favor.');
  }
  try {
    const actualizada = transicionar(reserva, 'REAGENDADA', actorActual(), {
      motivo: motivo.trim(),
      detalle: 'Pendiente de aceptación por parte del profesional.',
    });
    actualizada.reagendamientoPropuesto = {
      inicio: bloque.inicio,
      fin: bloque.fin,
      solicitadoEn: new Date().toISOString(),
    };
    // El horario propuesto deja de ofrecerse mientras el profesional decide.
    almacen.disponibilidad = almacen.disponibilidad.filter((b) => b.id !== bloque.id);
    return guardarReserva(actualizada);
  } catch (error) {
    if (error instanceof ErrorTransicion) {
      throw new ErrorServicio('transicion_invalida', 'Solo puedes pedir un cambio de fecha en reservas confirmadas.');
    }
    throw error;
  }
}

export async function confirmarConformidad(id: string): Promise<Reserva> {
  if (USE_API) return api.post<Reserva>(`/reservas/?id=${encodeURIComponent(id)}&accion=conformidad`, {});
  await latencia();
  const reserva = reservaDeOrganizacion(id);
  if (reserva.estado !== 'ENTREGADA') {
    throw new ErrorServicio('transicion_invalida', 'Solo puedes confirmar conformidad cuando el servicio está entregado.');
  }
  if (reserva.conformidadConfirmada) {
    throw new ErrorServicio('conflicto', 'Ya confirmaste la conformidad de este servicio.');
  }
  const ahora = new Date();
  const actualizada = registrarEvento(reserva, actorActual(), {
    fecha: ahora,
    motivo: 'Conformidad confirmada por la organización',
  });
  actualizada.conformidadConfirmada = true;
  actualizada.conformidadFecha = ahora.toISOString();
  return guardarReserva(actualizada);
}

/** Uso interno de evaluaciones.ts para cerrar el ciclo ENTREGADA → EVALUADA. */
export function marcarEvaluadaSincrono(id: string): Reserva {
  const reserva = reservaDeOrganizacion(id);
  const actualizada = transicionar(reserva, 'EVALUADA', actorActual(), {
    motivo: 'Evaluación enviada por la organización',
  });
  return guardarReserva(actualizada);
}

import type { Evaluacion, NivelEvaluacion } from '@/types';
import { almacen, clonar, persistir } from '@/mocks/almacen';
import { idLocal, latencia } from '@/lib/tiempo';
import { addDays } from 'date-fns';
import { ErrorServicio } from './errores';
import { organizacionEnSesion, profesionalIdEnSesion, sesionActual } from './sesionActual';
import { configuracionSincrona } from './configuracion';
import { marcarEvaluadaSincrono } from './reservas';
import { USE_API } from '@/config';
import { api } from '@/lib/apiClient';

/**
 * Evaluación bidireccional y ciega.
 *
 * API (backend/api/evaluaciones/index.php):
 *   POST /api/evaluaciones/                               DatosEvaluacion → Evaluacion
 *   GET  /api/evaluaciones/?accion=estado&reserva_id=…    → EstadoEvaluacionReserva
 *
 * La organización evalúa al profesional y el profesional evalúa a la
 * organización; ambas usan las mismas tres dimensiones.
 *
 * Reglas que el backend debe garantizar:
 *   - Solo se acepta si la reserva está ENTREGADA con conformidad confirmada.
 *   - Ninguna evaluación se publica hasta que ambas partes envíen la suya o
 *     pasen `diasPublicacionAutomatica` días desde la primera.
 *   - Los comentarios pasan por revisión de Skilly antes de publicarse.
 */

export interface DatosEvaluacion {
  reservaId: string;
  calidad: NivelEvaluacion;
  plazos: NivelEvaluacion;
  comunicacion: NivelEvaluacion;
  comentario?: string;
}

export interface EstadoEvaluacionReserva {
  propia: Evaluacion | null;
  /** La evaluación del profesional solo se entrega si ya está publicada. */
  delProfesional: Evaluacion | null;
  /** Evaluación de la otra parte (para cualquier rol), solo si ya está publicada. */
  contraparte?: Evaluacion | null;
  ambasEnviadas: boolean;
  /** Fecha en que se publicará automáticamente si la otra parte no evalúa. */
  publicacionAutomaticaEn: string | null;
}

export async function enviarEvaluacion(datos: DatosEvaluacion): Promise<Evaluacion> {
  if (USE_API) return api.post<Evaluacion>('/evaluaciones/', datos);
  await latencia();
  const autor = sesionActual()?.usuario.rol === 'profesional' ? 'profesional' : 'organizacion';
  const reserva =
    autor === 'organizacion'
      ? almacen.reservas.find((r) => r.id === datos.reservaId && r.organizacionId === organizacionEnSesion().id)
      : almacen.reservas.find((r) => r.id === datos.reservaId && r.profesionalId === profesionalIdEnSesion());
  if (!reserva) {
    throw new ErrorServicio('no_encontrado', 'No encontramos esa contratación entre las tuyas.');
  }
  if (!['ENTREGADA', 'EVALUADA'].includes(reserva.estado) || !reserva.conformidadConfirmada) {
    throw new ErrorServicio('transicion_invalida', 'Podrás evaluar cuando el servicio esté entregado y la organización haya confirmado su conformidad.');
  }
  if (almacen.evaluaciones.some((e) => e.reservaId === reserva.id && e.autor === autor)) {
    throw new ErrorServicio('conflicto', 'Ya enviaste tu evaluación para este servicio.');
  }
  const maximo = configuracionSincrona().reputacion.maxCaracteresComentario;
  const comentario = datos.comentario?.trim() || undefined;
  if (comentario && comentario.length > maximo) {
    throw new ErrorServicio('validacion', `El comentario puede tener hasta ${maximo} caracteres.`);
  }

  const evaluacion: Evaluacion = {
    id: idLocal('eval'),
    reservaId: reserva.id,
    profesionalId: reserva.profesionalId,
    organizacionId: reserva.organizacionId,
    autor,
    calidad: datos.calidad,
    plazos: datos.plazos,
    comunicacion: datos.comunicacion,
    comentario,
    fecha: new Date().toISOString(),
    publicada: false,
    estadoComentario: comentario ? 'en_revision' : 'sin_comentario',
  };
  almacen.evaluaciones.push(evaluacion);
  // Evaluación ciega: cuando ambas partes evaluaron, las dos se publican.
  const deLaReserva = almacen.evaluaciones.filter((e) => e.reservaId === reserva.id);
  if (deLaReserva.length >= 2) deLaReserva.forEach((e) => (e.publicada = true));
  persistir();
  if (autor === 'organizacion') marcarEvaluadaSincrono(reserva.id);
  return clonar(evaluacion);
}

export async function obtenerEstadoEvaluacion(reservaId: string): Promise<EstadoEvaluacionReserva> {
  if (USE_API) return api.get<EstadoEvaluacionReserva>('/evaluaciones/', { accion: 'estado', reserva_id: reservaId });
  await latencia();
  const autor = sesionActual()?.usuario.rol === 'profesional' ? 'profesional' : 'organizacion';
  const propia = almacen.evaluaciones.find((e) => e.reservaId === reservaId && e.autor === autor);
  const otra = almacen.evaluaciones.find((e) => e.reservaId === reservaId && e.autor !== autor);
  const dias = configuracionSincrona().reputacion.diasPublicacionAutomatica;
  const contraparte = otra?.publicada ? clonar(otra) : null;
  return {
    propia: propia ? clonar(propia) : null,
    delProfesional: autor === 'organizacion' ? contraparte : null,
    contraparte,
    ambasEnviadas: Boolean(propia && otra),
    publicacionAutomaticaEn: propia && !propia.publicada ? addDays(new Date(propia.fecha), dias).toISOString() : null,
  };
}

import type { BloqueDisponible, RetencionBloque } from '@/types';
import { almacen, persistir } from '@/mocks/almacen';
import { idLocal, latencia } from '@/lib/tiempo';
import { addMinutes } from 'date-fns';
import { ErrorServicio } from './errores';
import { organizacionEnSesion, organizacionEnSesionOpcional } from './sesionActual';
import { configuracionSincrona } from './configuracion';
import { USE_API } from '@/config';
import { api } from '@/lib/apiClient';

/**
 * Disponibilidad y retención temporal de bloques (API: backend/api/disponibilidad/index.php).
 *
 *   GET    /api/disponibilidad/?profesional_id=&desde=&hasta=[&servicio_id= | &minutos=]
 *          → BloqueDisponible[] (solo horas de inicio con tiempo libre suficiente para la
 *            duración del servicio o de la contratación; `fin` = inicio + duración)
 *   POST   /api/disponibilidad/?accion=retener   { bloqueId, servicioId } → RetencionBloque (409 si está tomado)
 *   DELETE /api/disponibilidad/?accion=retener&id=                       → { ok: true }
 *   GET    /api/disponibilidad/?accion=retencion&id=                      → RetencionBloque (410 si expiró)
 *
 * El backend garantiza la exclusión mutua de los bloques (bloqueo de filas en una
 * transacción); la interfaz solo muestra la cuenta regresiva y reacciona a la expiración.
 */

function purgarRetencionesVencidas(ahora: Date): void {
  const vigentes = almacen.retenciones.filter((r) => new Date(r.expiraEn) > ahora);
  if (vigentes.length !== almacen.retenciones.length) {
    almacen.retenciones = vigentes;
    persistir();
  }
}

function bloquesRetenidos(ahora: Date, excluirOrganizacionId?: string): Set<string> {
  return new Set(
    almacen.retenciones
      .filter((r) => new Date(r.expiraEn) > ahora && r.organizacionId !== excluirOrganizacionId)
      .map((r) => r.bloqueId),
  );
}

export interface RangoFechas {
  desde: string;
  hasta: string;
  /** Servicio a agendar: la API ofrece solo inicios con tiempo libre para su duración. */
  servicioId?: string;
  /** Duración en minutos (reagendar una contratación existente con su misma duración). */
  minutos?: number;
}

/** Devuelve SOLO bloques libres. Los ocupados o retenidos por otros no aparecen. */
export async function listarBloquesDisponibles(
  profesionalId: string,
  rango: RangoFechas,
): Promise<BloqueDisponible[]> {
  if (USE_API)
    return api.get<BloqueDisponible[]>('/disponibilidad/', {
      profesional_id: profesionalId,
      desde: rango.desde,
      hasta: rango.hasta,
      servicio_id: rango.servicioId,
      minutos: rango.servicioId ? undefined : rango.minutos,
    });
  await latencia();
  const ahora = new Date();
  purgarRetencionesVencidas(ahora);
  // El bloque que la propia organización tiene retenido sigue apareciendo para ella.
  const retenidos = bloquesRetenidos(ahora, organizacionEnSesionOpcional()?.id);
  const desde = new Date(rango.desde);
  const hasta = new Date(rango.hasta);
  return almacen.disponibilidad
    .filter((b) => b.profesionalId === profesionalId)
    .filter((b) => {
      const inicio = new Date(b.inicio);
      return inicio > ahora && inicio >= desde && inicio <= hasta && !retenidos.has(b.id);
    })
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
}

export async function retenerBloque(bloqueId: string, servicioId: string): Promise<RetencionBloque> {
  if (USE_API) return api.post<RetencionBloque>('/disponibilidad/?accion=retener', { bloqueId, servicioId });
  await latencia();
  const organizacion = organizacionEnSesion();
  const ahora = new Date();
  purgarRetencionesVencidas(ahora);

  const bloque = almacen.disponibilidad.find((b) => b.id === bloqueId);
  if (!bloque || new Date(bloque.inicio) <= ahora) {
    throw new ErrorServicio('no_encontrado', 'Ese horario ya no está disponible. Elige otro, por favor.');
  }
  if (bloquesRetenidos(ahora, organizacion.id).has(bloqueId)) {
    throw new ErrorServicio('conflicto', 'Alguien más está reservando ese horario justo ahora. Elige otro o inténtalo en unos minutos.');
  }

  // Una organización mantiene una sola retención activa a la vez.
  almacen.retenciones = almacen.retenciones.filter((r) => r.organizacionId !== organizacion.id);

  const retencion: RetencionBloque = {
    id: idLocal('ret'),
    bloqueId,
    servicioId,
    organizacionId: organizacion.id,
    expiraEn: addMinutes(ahora, configuracionSincrona().retencionBloqueMinutos).toISOString(),
  };
  almacen.retenciones.push(retencion);
  persistir();
  return retencion;
}

export async function liberarRetencion(retencionId: string): Promise<void> {
  if (USE_API) { await api.delete('/disponibilidad/', { accion: 'retener', id: retencionId }); return; }
  await latencia();
  almacen.retenciones = almacen.retenciones.filter((r) => r.id !== retencionId);
  persistir();
}

/** Verifica que la retención siga vigente. Lanza 'expirado' si venció. */
export async function obtenerRetencion(retencionId: string): Promise<RetencionBloque> {
  if (USE_API) return api.get<RetencionBloque>('/disponibilidad/', { accion: 'retencion', id: retencionId });
  await latencia();
  const retencion = almacen.retenciones.find((r) => r.id === retencionId);
  if (!retencion || new Date(retencion.expiraEn) <= new Date()) {
    throw new ErrorServicio('expirado', 'Se acabó el tiempo para completar esta reserva y el horario volvió a quedar libre. Puedes elegirlo de nuevo si sigue disponible.');
  }
  return retencion;
}

/** Uso interno de reservas.ts. */
export function bloqueSincrono(bloqueId: string): BloqueDisponible | undefined {
  return almacen.disponibilidad.find((b) => b.id === bloqueId);
}

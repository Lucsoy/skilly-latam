import type { Profesional, Reputacion } from '@/types';
import { nombresOtrasOrganizaciones } from '@/mocks/organizaciones';
import { almacen } from '@/mocks/almacen';
import { latencia } from '@/lib/tiempo';
import { calcularReputacion } from '@/lib/reputacion';
import { ErrorServicio } from './errores';
import { configuracionSincrona } from './configuracion';
import { USE_API } from '@/config';
import { api } from '@/lib/apiClient';

/**
 * Backend esperado:
 *   GET /api/profesionales/{id}/             → Profesional
 *   GET /api/profesionales/{id}/reputacion/  → Reputacion (calculada en servidor)
 */

export async function obtenerProfesional(id: string): Promise<Profesional> {
  if (USE_API) return api.get<Profesional>('/profesionales/', { id });
  await latencia();
  const profesional = almacen.profesionales.find((p) => p.id === id);
  if (!profesional) {
    throw new ErrorServicio('no_encontrado', 'No encontramos a este profesional. Puede que ya no esté disponible en Skilly.');
  }
  return profesional;
}

export async function obtenerReputacion(profesionalId: string): Promise<Reputacion> {
  if (USE_API) return api.get<Reputacion>('/evaluaciones/', { accion: 'reputacion', profesional_id: profesionalId });
  await latencia();
  return reputacionSincrona(profesionalId);
}

/** Uso interno del catálogo para no esperar una latencia por tarjeta. */
export function reputacionSincrona(profesionalId: string): Reputacion {
  return calcularReputacion(
    profesionalId,
    almacen.evaluaciones,
    configuracionSincrona().reputacion,
    nombresOtrasOrganizaciones,
  );
}

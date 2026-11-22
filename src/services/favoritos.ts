import { almacen, persistir } from '@/mocks/almacen';
import { latencia } from '@/lib/tiempo';
import { organizacionEnSesion } from './sesionActual';
import { USE_API } from '@/config';
import { api } from '@/lib/apiClient';

/**
 * Backend esperado:
 *   GET    /api/favoritos/                 → string[] (ids de servicio)
 *   POST   /api/favoritos/{servicio_id}/   → 201
 *   DELETE /api/favoritos/{servicio_id}/   → 204
 */

export async function listarFavoritos(): Promise<string[]> {
  if (USE_API) return api.get<string[]>('/favoritos/');
  await latencia();
  const organizacion = organizacionEnSesion();
  return [...(almacen.favoritos[organizacion.id] ?? [])];
}

export async function alternarFavorito(servicioId: string): Promise<{ esFavorito: boolean; favoritos: string[] }> {
  if (USE_API) {
    const actuales = await api.get<string[]>('/favoritos/');
    const eraFavorito = actuales.includes(servicioId);
    const respuesta = eraFavorito
      ? await api.delete<{ok:boolean; favoritos:string[]}>('/favoritos/', { servicio_id: servicioId })
      : await api.post<{ok:boolean; favoritos:string[]}>('/favoritos/', { servicioId });
    return { esFavorito: !eraFavorito, favoritos: respuesta.favoritos };
  }
  await latencia();
  const organizacion = organizacionEnSesion();
  const actuales = almacen.favoritos[organizacion.id] ?? [];
  const esFavorito = !actuales.includes(servicioId);
  almacen.favoritos[organizacion.id] = esFavorito
    ? [...actuales, servicioId]
    : actuales.filter((id) => id !== servicioId);
  persistir();
  return { esFavorito, favoritos: [...(almacen.favoritos[organizacion.id] ?? [])] };
}

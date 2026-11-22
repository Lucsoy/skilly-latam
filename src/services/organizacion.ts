import type { Organizacion } from '@/types';
import { almacen, clonar, persistir } from '@/mocks/almacen';
import { latencia } from '@/lib/tiempo';
import { ErrorServicio } from './errores';
import { establecerSesion, organizacionEnSesion, sesionActual } from './sesionActual';
import { USE_API } from '@/config';
import { api } from '@/lib/apiClient';

/**
 * Backend esperado:
 *   GET   /api/organizaciones/me/   → Organizacion
 *   PATCH /api/organizaciones/me/   DatosActualizacionOrganizacion → Organizacion
 */

export type DatosActualizacionOrganizacion = Partial<
  Pick<
    Organizacion,
    'razonSocial' | 'giro' | 'tamano' | 'nombreContacto' | 'emailContacto' | 'telefono' | 'sitioWeb' | 'descripcion' | 'direccion'
  >
>;

export async function obtenerMiOrganizacion(): Promise<Organizacion> {
  if (USE_API) {
    const organizacion = await api.get<Organizacion>('/organizaciones/', { accion: 'me' });
    const sesion = sesionActual(); if (sesion) establecerSesion({ ...sesion, organizacion });
    return organizacion;
  }
  await latencia();
  return clonar(organizacionEnSesion());
}

export async function actualizarMiOrganizacion(datos: DatosActualizacionOrganizacion): Promise<Organizacion> {
  if (USE_API) {
    const actualizada = await api.put<Organizacion>('/organizaciones/', datos);
    const sesion = sesionActual(); if (sesion) establecerSesion({ ...sesion, organizacion: actualizada });
    return actualizada;
  }
  await latencia();
  const actual = organizacionEnSesion();
  const indice = almacen.organizaciones.findIndex((o) => o.id === actual.id);
  if (indice < 0) {
    throw new ErrorServicio('no_encontrado', 'No encontramos tu organización.');
  }
  const actualizada: Organizacion = { ...actual, ...datos };
  almacen.organizaciones[indice] = actualizada;
  if (datos.emailContacto) {
    const cuenta = almacen.cuentas.find((c) => c.organizacionId === actual.id);
    if (cuenta) cuenta.email = datos.emailContacto.trim().toLowerCase();
  }
  persistir();
  const sesion = sesionActual();
  if (sesion) establecerSesion({ ...sesion, organizacion: actualizada });
  return clonar(actualizada);
}

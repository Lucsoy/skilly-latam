import type { ConfiguracionPlataforma } from '@/types';
import { almacen, clonar, persistir } from '@/mocks/almacen';
import { latencia } from '@/lib/tiempo';
import { ErrorServicio } from './errores';
import { requiereFundador } from './sesionActual';
import { USE_API } from '@/config';
import { api } from '@/lib/apiClient';

/**
 * Configuración de plataforma (comisión, política de cancelación, reglas de
 * reputación). Fuente única de verdad para todo cálculo de la interfaz.
 *
 * Backend esperado:
 *   GET   /api/configuracion/   → ConfiguracionPlataforma
 *   PUT   /api/configuracion/   (solo administración) → ConfiguracionPlataforma
 */

let configuracionCache: ConfiguracionPlataforma = almacen.configuracion;

export async function obtenerConfiguracion(): Promise<ConfiguracionPlataforma> {
  if (USE_API) { configuracionCache = await api.get<ConfiguracionPlataforma>('/configuracion/'); return configuracionCache; }
  await latencia();
  configuracionCache = clonar(almacen.configuracion); return configuracionCache;
}

/**
 * Acceso síncrono para módulos internos de la capa de servicios (cálculo de
 * montos al crear reservas). En producción la configuración se cargará al
 * iniciar la app y quedará en caché.
 */
export function configuracionSincrona(): ConfiguracionPlataforma {
  return USE_API ? configuracionCache : almacen.configuracion;
}

export type DatosActualizacionConfiguracion = Pick<ConfiguracionPlataforma, 'comisionPorcentaje' | 'comisionProfesionalPorcentaje' | 'comisionOrganizacionPorcentaje' | 'politicaCancelacion' | 'retencionBloqueMinutos' | 'reputacion' | 'versionCondiciones' | 'versionPoliticaDatos'>;

export async function actualizarConfiguracion(datos: DatosActualizacionConfiguracion): Promise<ConfiguracionPlataforma> {
  if (USE_API) { requiereFundador(); configuracionCache = await api.put<ConfiguracionPlataforma>('/configuracion/', datos); return configuracionCache; }
  await latencia();
  requiereFundador();
  if (datos.comisionPorcentaje < 0 || datos.comisionPorcentaje > 50) {
    throw new ErrorServicio('validacion', 'La comisión debe estar entre 0 % y 50 %.');
  }
  const tramos = [...datos.politicaCancelacion].sort((a, b) => b.desdeHoras - a.desdeHoras);
  if (tramos.length === 0 || tramos.some((t) => t.retencionPorcentaje < 0 || t.retencionPorcentaje > 100)) {
    throw new ErrorServicio('validacion', 'Cada tramo debe retener entre 0 % y 100 %.');
  }
  if (datos.comisionProfesionalPorcentaje < 0 || datos.comisionProfesionalPorcentaje > 50 || datos.comisionOrganizacionPorcentaje < 0 || datos.comisionOrganizacionPorcentaje > 50) {
    throw new ErrorServicio('validacion', 'Las comisiones por actor deben estar entre 0 % y 50 %.');
  }
  if (datos.retencionBloqueMinutos < 0 || datos.retencionBloqueMinutos > 120) {
    throw new ErrorServicio('validacion', 'La retención del bloque debe estar entre 0 y 120 minutos.');
  }
  if (datos.reputacion.minimoEvaluaciones < 0 || datos.reputacion.ventanaMaxEvaluaciones < 1 || datos.reputacion.ventanaMeses < 1 || datos.reputacion.diasPublicacionAutomatica < 0 || datos.reputacion.maxCaracteresComentario < 1) {
    throw new ErrorServicio('validacion', 'Revisa los parámetros de reputación.');
  }
  almacen.configuracion = {
    ...almacen.configuracion,
    comisionPorcentaje: datos.comisionPorcentaje,
    comisionProfesionalPorcentaje: datos.comisionProfesionalPorcentaje,
    comisionOrganizacionPorcentaje: datos.comisionOrganizacionPorcentaje,
    politicaCancelacion: tramos,
    retencionBloqueMinutos: datos.retencionBloqueMinutos,
    reputacion: { ...datos.reputacion },
    versionCondiciones: datos.versionCondiciones.trim(),
    versionPoliticaDatos: datos.versionPoliticaDatos.trim(),
  };
  persistir();
  configuracionCache = clonar(almacen.configuracion);
  return clonar(almacen.configuracion);
}

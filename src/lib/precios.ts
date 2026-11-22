import type { TramoCancelacion } from '@/types';
import { horasHasta } from './tiempo';

export interface Desglose {
  precio: number;
  comisionPorcentaje: number;
  comision: number;
  total: number;
}

/** Calcula comisión y total. El porcentaje siempre viene de la configuración. */
export function calcularDesglose(precio: number, comisionPorcentaje: number): Desglose {
  const comision = Math.round((precio * comisionPorcentaje) / 100);
  return { precio, comisionPorcentaje, comision, total: precio + comision };
}

export interface ResultadoCancelacion {
  tramo: TramoCancelacion;
  horasAntelacion: number;
  retencionPorcentaje: number;
  montoRetenido: number;
  montoDevuelto: number;
  /** false si la organización todavía no pagaba: no hay nada que retener ni devolver (A-12). */
  pagado: boolean;
}

/**
 * Aplica la política de cancelación sobre el total pagado por la organización.
 * Los tramos deben venir ordenados de mayor a menor antelación.
 */
export function calcularCancelacion(
  inicioISO: string,
  total: number,
  politica: TramoCancelacion[],
  ahora: Date = new Date(),
  pagado = true,
): ResultadoCancelacion {
  const horasAntelacion = Math.max(0, horasHasta(inicioISO, ahora));
  const tramo =
    politica.find((t) => horasAntelacion >= t.desdeHoras) ?? politica[politica.length - 1];
  if (!tramo) {
    throw new Error('La política de cancelación no tiene tramos configurados');
  }
  const montoRetenido = pagado ? Math.round((total * tramo.retencionPorcentaje) / 100) : 0;
  return {
    tramo,
    horasAntelacion,
    retencionPorcentaje: tramo.retencionPorcentaje,
    montoRetenido,
    montoDevuelto: pagado ? total - montoRetenido : 0,
    pagado,
  };
}

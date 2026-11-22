import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { addDays, addMinutes, set, startOfDay } from 'date-fns';
import { ZONA_HORARIA } from './formato';

/** Espera simulada para la capa de servicios mock (300 a 600 ms). */
export function latencia(): Promise<void> {
  const ms = 300 + Math.floor(Math.random() * 300);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Crea una fecha a partir de una hora local de Santiago y devuelve un ISO en UTC. */
export function fechaSantiago(
  base: Date,
  diasDesdeBase: number,
  hora: number,
  minuto = 0,
): string {
  const local = toZonedTime(base, ZONA_HORARIA);
  const dia = addDays(startOfDay(local), diasDesdeBase);
  const conHora = set(dia, { hours: hora, minutes: minuto, seconds: 0, milliseconds: 0 });
  return fromZonedTime(conHora, ZONA_HORARIA).toISOString();
}

export function sumarMinutosISO(iso: string, minutos: number): string {
  return addMinutes(new Date(iso), minutos).toISOString();
}

/** Clave "yyyy-MM-dd" de un instante, según la zona horaria de Santiago. */
export function claveDiaSantiago(iso: string | Date): string {
  const local = toZonedTime(iso, ZONA_HORARIA);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, '0');
  const d = String(local.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function horasHasta(iso: string, desde: Date = new Date()): number {
  return (new Date(iso).getTime() - desde.getTime()) / 3_600_000;
}

let contador = 0;
/** Identificador corto para datos creados en cliente durante la etapa mock. */
export function idLocal(prefijo: string): string {
  contador += 1;
  return `${prefijo}_${Date.now().toString(36)}${contador.toString(36)}`;
}

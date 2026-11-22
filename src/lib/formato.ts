import { differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';

import { ZONA_HORARIA_NEGOCIO } from '@/config';

/** Zona horaria del negocio (misma que la API). */
export const ZONA_HORARIA = ZONA_HORARIA_NEGOCIO;

const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

/** $1.250.000 */
export function formatearCLP(monto: number): string {
  return formatoCLP.format(Math.round(monto));
}

/** 15-09-2026 */
export function formatearFechaCorta(fecha: string | Date): string {
  return formatInTimeZone(fecha, ZONA_HORARIA, 'dd-MM-yyyy');
}

/** 10:00 */
export function formatearHora(fecha: string | Date): string {
  return formatInTimeZone(fecha, ZONA_HORARIA, 'HH:mm');
}

/** martes 15 de septiembre */
export function formatearFechaLarga(fecha: string | Date): string {
  return formatInTimeZone(fecha, ZONA_HORARIA, "EEEE d 'de' MMMM", { locale: es });
}

/** martes 15 de septiembre de 2026 */
export function formatearFechaLargaConAno(fecha: string | Date): string {
  return formatInTimeZone(fecha, ZONA_HORARIA, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
}

/** martes 15 de septiembre, 10:00–11:00 */
export function formatearRangoBloque(inicio: string | Date, fin: string | Date): string {
  return `${formatearFechaLarga(inicio)}, ${formatearHora(inicio)}–${formatearHora(fin)}`;
}

/** 15-09-2026 10:00 */
export function formatearFechaHora(fecha: string | Date): string {
  return formatInTimeZone(fecha, ZONA_HORARIA, 'dd-MM-yyyy HH:mm');
}

/** 15-09-2026 10:03:41, útil para historial de trazabilidad. */
export function formatearFechaHoraExacta(fecha: string | Date): string {
  return formatInTimeZone(fecha, ZONA_HORARIA, 'dd-MM-yyyy HH:mm:ss');
}

/** "1 h 30 min" a partir de dos fechas. */
export function formatearDuracion(inicio: string | Date, fin: string | Date): string {
  const minutos = differenceInMinutes(new Date(fin), new Date(inicio));
  return formatearMinutos(minutos);
}

export function formatearMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export const ETIQUETA_MODALIDAD: Record<'remoto' | 'presencial' | 'hibrido', string> = {
  remoto: 'Remoto',
  presencial: 'Presencial',
  hibrido: 'Híbrido',
};

export const ETIQUETA_TAMANO: Record<string, string> = {
  '1-10': '1 a 10 personas',
  '11-50': '11 a 50 personas',
  '51-200': '51 a 200 personas',
  '201-500': '201 a 500 personas',
  '500+': 'Más de 500 personas',
};

/** Devuelve las iniciales de un nombre y apellido, ej. "Camila Rojas" -> "CR". */
export function iniciales(nombre: string, apellido?: string): string {
  const partes = [nombre, apellido].filter(Boolean).join(' ').trim().split(/\s+/);
  const primera = partes[0]?.[0] ?? '';
  const segunda = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '';
  return (primera + segunda).toUpperCase();
}

/** Primera letra en mayúscula, el resto intacto: "viernes 11" -> "Viernes 11". */
export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Pluralización simple en español. */
export function plural(cantidad: number, singular: string, pluralForma: string): string {
  return cantidad === 1 ? `${cantidad} ${singular}` : `${cantidad} ${pluralForma}`;
}

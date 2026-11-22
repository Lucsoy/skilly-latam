import type { BloqueDisponible } from '@/types';
import { fechaSantiago, sumarMinutosISO } from '@/lib/tiempo';

/**
 * Disponibilidad generada de forma relativa a la fecha actual para que la demo
 * siempre tenga bloques futuros. Cada perfil de disponibilidad representa un
 * caso que queremos probar en la interfaz:
 *   - "amplia":   varios bloques casi todos los días hábiles.
 *   - "media":    dos o tres bloques por semana.
 *   - "escasa":   uno o dos bloques en las próximas dos semanas.
 *   - "tardia":   nada en las próximas dos semanas, bloques desde la tercera.
 */
type PerfilDisponibilidad = 'amplia' | 'media' | 'escasa' | 'tardia';

const perfilPorProfesional: Record<string, PerfilDisponibilidad> = {
  'prof-01': 'amplia',
  'prof-02': 'media',
  'prof-03': 'amplia',
  'prof-04': 'media',
  'prof-05': 'amplia',
  'prof-06': 'media',
  'prof-07': 'amplia',
  'prof-08': 'escasa',
  'prof-09': 'amplia',
  'prof-10': 'escasa',
  'prof-11': 'media',
  'prof-12': 'tardia',
};

/** Duración estándar de un bloque agendable en la agenda mock. */
const DURACION_BLOQUE_MIN = 60;

const HORAS_AMPLIA = [9, 10, 11, 12, 15, 16, 17];
const HORAS_MEDIA = [10, 15];
const HORAS_ESCASA = [11];

function esDiaHabil(base: Date, offset: number): boolean {
  const iso = fechaSantiago(base, offset, 12);
  const dia = new Date(iso).getUTCDay();
  // Se usa una hora del mediodía para que el día de la semana no cambie por la zona horaria.
  return dia !== 0 && dia !== 6;
}

function generarBloques(profesionalId: string, perfil: PerfilDisponibilidad, base: Date): BloqueDisponible[] {
  const bloques: BloqueDisponible[] = [];
  const HORIZONTE_DIAS = 60;

  for (let offset = 1; offset <= HORIZONTE_DIAS; offset++) {
    if (!esDiaHabil(base, offset)) continue;
    const semana = Math.floor((offset - 1) / 7);
    const diaSemanaIndice = offset % 7;

    let horas: number[] = [];
    switch (perfil) {
      case 'amplia':
        // Deja algunos días sin bloques para que el calendario no sea uniforme.
        horas = offset % 5 === 0 ? [] : HORAS_AMPLIA.filter((_, i) => (i + offset) % 3 !== 0);
        break;
      case 'media':
        horas = diaSemanaIndice % 3 === 1 ? HORAS_MEDIA : [];
        break;
      case 'escasa':
        horas = offset === 4 || offset === 11 || offset === 25 ? HORAS_ESCASA : [];
        break;
      case 'tardia':
        horas = semana >= 2 && diaSemanaIndice % 2 === 0 ? HORAS_MEDIA : [];
        break;
    }

    for (const hora of horas) {
      const inicio = fechaSantiago(base, offset, hora);
      bloques.push({
        id: `blq-${profesionalId}-${offset}-${hora}`,
        profesionalId,
        inicio,
        fin: sumarMinutosISO(inicio, DURACION_BLOQUE_MIN),
      });
    }
  }
  return bloques;
}

export function generarDisponibilidadInicial(base: Date = new Date()): BloqueDisponible[] {
  return Object.entries(perfilPorProfesional).flatMap(([id, perfil]) => generarBloques(id, perfil, base));
}

import { subMonths } from 'date-fns';
import type {
  ConfiguracionPlataforma,
  DimensionEvaluacion,
  Evaluacion,
  NivelEvaluacion,
  Reputacion,
  ResumenDimension,
} from '@/types';

export const ETIQUETA_NIVEL: Record<NivelEvaluacion, string> = {
  4: 'Superó lo esperado',
  3: 'Cumplió',
  2: 'Cumplió parcialmente',
  1: 'No cumplió',
};

export const ETIQUETA_DIMENSION: Record<DimensionEvaluacion, string> = {
  calidad: 'Calidad del trabajo',
  plazos: 'Cumplimiento de plazos',
  comunicacion: 'Comunicación',
};

export const DIMENSIONES: DimensionEvaluacion[] = ['calidad', 'plazos', 'comunicacion'];

function resumirDimension(dimension: DimensionEvaluacion, evaluaciones: Evaluacion[]): ResumenDimension {
  const conteo: Record<NivelEvaluacion, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const e of evaluaciones) conteo[e[dimension]] += 1;
  let nivelPredominante: NivelEvaluacion = 3;
  let mayor = -1;
  // En caso de empate gana el nivel más alto, para no castigar por redondeo.
  for (const nivel of [4, 3, 2, 1] as NivelEvaluacion[]) {
    if (conteo[nivel] > mayor) {
      mayor = conteo[nivel];
      nivelPredominante = nivel;
    }
  }
  return {
    dimension,
    conteo,
    total: evaluaciones.length,
    nivelPredominante,
    cumplioOSupero: conteo[3] + conteo[4],
  };
}

/**
 * Calcula la reputación de un profesional sin promedios globales.
 * - Solo considera evaluaciones publicadas hechas por organizaciones.
 * - Ventana móvil: últimas N evaluaciones dentro de los últimos M meses.
 * - Bajo el umbral mínimo, no se entregan indicadores (esNuevo = true).
 */
export function calcularReputacion(
  profesionalId: string,
  evaluaciones: Evaluacion[],
  config: ConfiguracionPlataforma['reputacion'],
  nombresOrganizaciones: Record<string, string> = {},
  ahora: Date = new Date(),
): Reputacion {
  const historicas = evaluaciones
    .filter((e) => e.profesionalId === profesionalId && e.publicada && e.autor === 'organizacion')
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const limite = subMonths(ahora, config.ventanaMeses);
  const enVentana = historicas
    .filter((e) => new Date(e.fecha) >= limite)
    .slice(0, config.ventanaMaxEvaluaciones);

  const esNuevo = historicas.length < config.minimoEvaluaciones;
  const puedeMostrar = !esNuevo && enVentana.length >= config.minimoEvaluaciones;

  const comentariosPublicos = enVentana
    .filter((e) => e.comentario && e.estadoComentario === 'aprobado')
    .map((e) => ({
      comentario: e.comentario as string,
      fecha: e.fecha,
      organizacion: nombresOrganizaciones[e.organizacionId] ?? 'Organización cliente',
    }));

  return {
    profesionalId,
    totalConsideradas: enVentana.length,
    totalHistoricas: historicas.length,
    esNuevo,
    dimensiones: puedeMostrar ? DIMENSIONES.map((d) => resumirDimension(d, enVentana)) : null,
    comentariosPublicos: puedeMostrar ? comentariosPublicos : [],
  };
}

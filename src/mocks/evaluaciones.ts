import type { Evaluacion, NivelEvaluacion } from '@/types';
import { subDays, subMonths } from 'date-fns';

/**
 * Evaluaciones publicadas recibidas por cada profesional.
 * Formato compacto: [calidad, plazos, comunicación, meses de antigüedad, organización autora, comentario?]
 *
 * Profesionales nuevos (menos de 3 evaluaciones): prof-07 (1), prof-08 (0), prof-09 (2), prof-11 (0).
 * prof-01 tiene 15 evaluaciones, varias con más de 12 meses, para probar la ventana móvil.
 */
type Fila = [NivelEvaluacion, NivelEvaluacion, NivelEvaluacion, number, string, string?];

const filas: Record<string, Fila[]> = {
  'prof-01': [
    [4, 4, 4, 0.5, 'org-03', 'Camila entendió el cargo mejor que nosotros. La terna fue impecable.'],
    [4, 3, 4, 1, 'org-05'],
    [3, 4, 4, 1.5, 'org-02', 'Muy ordenada y comunicativa durante todo el proceso.'],
    [4, 4, 3, 2, 'org-08'],
    [3, 3, 4, 3, 'org-04'],
    [4, 4, 4, 4, 'org-06', 'Nos ahorró semanas de entrevistas.'],
    [4, 3, 3, 5, 'org-07'],
    [3, 4, 4, 6, 'org-03'],
    [4, 4, 4, 8, 'org-05'],
    [2, 3, 4, 9, 'org-02', 'El primer candidato no calzó, pero lo resolvió rápido con un reemplazo.'],
    [4, 4, 4, 11, 'org-08'],
    [3, 3, 3, 14, 'org-04'],
    [4, 4, 4, 16, 'org-06'],
    [4, 4, 4, 19, 'org-07'],
    [3, 4, 4, 23, 'org-03'],
  ],
  'prof-02': [
    [4, 3, 4, 1, 'org-03', 'Las bandas quedaron claras y las jefaturas por fin entienden cómo se define un sueldo.'],
    [4, 4, 3, 2, 'org-05'],
    [3, 3, 4, 3, 'org-08'],
    [4, 4, 4, 5, 'org-06'],
    [3, 2, 3, 6, 'org-02', 'Se atrasó una semana con la entrega final, aunque avisó con tiempo.'],
    [4, 4, 4, 8, 'org-07'],
    [4, 3, 4, 10, 'org-04'],
    [3, 4, 4, 13, 'org-03'],
    [4, 4, 4, 15, 'org-05'],
  ],
  'prof-03': [
    [4, 4, 4, 0.3, 'org-04', 'Por primera vez entiendo mi balance. Explica todo con paciencia.'],
    [4, 4, 4, 1, 'org-06'],
    [3, 4, 4, 2, 'org-05'],
    [4, 4, 3, 3, 'org-02'],
    [4, 4, 4, 4, 'org-07', 'Cero multas del SII desde que trabajamos con ella.'],
    [3, 3, 4, 5, 'org-08'],
    [4, 4, 4, 7, 'org-03'],
    [4, 4, 4, 8, 'org-04'],
    [4, 3, 4, 10, 'org-06'],
    [3, 4, 3, 11, 'org-05'],
    [4, 4, 4, 13, 'org-02'],
    [4, 4, 4, 17, 'org-07'],
  ],
  'prof-04': [
    [4, 4, 4, 1, 'org-02', 'Nos acompañó en una fiscalización complicada y salió todo bien.'],
    [3, 4, 4, 2, 'org-05'],
    [4, 4, 3, 4, 'org-03'],
    [4, 3, 4, 5, 'org-08'],
    [4, 4, 4, 7, 'org-06'],
    [3, 4, 4, 9, 'org-04'],
    [4, 4, 4, 11, 'org-07'],
  ],
  'prof-05': [
    [4, 4, 4, 0.5, 'org-08', 'El diagnóstico fue honesto y las prioridades, accionables. Ya vemos cambios.'],
    [4, 3, 4, 1.5, 'org-03'],
    [4, 4, 4, 2, 'org-05'],
    [3, 4, 4, 3, 'org-02'],
    [4, 4, 4, 5, 'org-07', 'Los talleres fueron lo mejor. La gente participó de verdad.'],
    [4, 4, 3, 6, 'org-06'],
    [3, 3, 4, 8, 'org-04'],
    [4, 4, 4, 9, 'org-08'],
    [4, 4, 4, 11, 'org-03'],
    [4, 3, 4, 14, 'org-05'],
    [3, 4, 4, 18, 'org-02'],
  ],
  'prof-06': [
    [4, 4, 3, 1, 'org-05', 'El onboarding que armó lo seguimos usando sin él, que era justo la idea.'],
    [3, 4, 4, 3, 'org-03'],
    [4, 4, 4, 4, 'org-08'],
    [4, 3, 3, 6, 'org-02'],
    [3, 4, 4, 9, 'org-07'],
  ],
  'prof-07': [[4, 4, 4, 0.5, 'org-08', 'Encontró a nuestra diseñadora de producto en 9 días.']],
  'prof-08': [],
  'prof-09': [
    [4, 4, 4, 1, 'org-04', 'Contratamos 15 personas para la temporada sin caos.'],
    [3, 4, 4, 3, 'org-06'],
  ],
  'prof-10': [
    [4, 4, 3, 2, 'org-06', 'Las jefaturas salieron con herramientas concretas. Recomendado.'],
    [3, 3, 3, 5, 'org-03'],
    [4, 4, 4, 8, 'org-05'],
    [3, 4, 3, 12.5, 'org-02'],
  ],
  'prof-11': [],
  'prof-12': [
    [4, 4, 4, 1, 'org-08', 'Con su flujo de caja levantamos la ronda. Muy claro para explicar a inversionistas.'],
    [4, 3, 4, 3, 'org-05'],
    [3, 4, 4, 4, 'org-03'],
    [4, 4, 4, 7, 'org-07'],
    [4, 4, 3, 10, 'org-02'],
    [3, 4, 4, 15, 'org-06'],
  ],
};

export function generarEvaluacionesIniciales(ahora: Date = new Date()): Evaluacion[] {
  const resultado: Evaluacion[] = [];
  for (const [profesionalId, lista] of Object.entries(filas)) {
    lista.forEach((fila, i) => {
      const [calidad, plazos, comunicacion, meses, organizacionId, comentario] = fila;
      const fecha = subDays(subMonths(ahora, Math.floor(meses)), Math.round((meses % 1) * 30));
      resultado.push({
        id: `eval-${profesionalId}-${i + 1}`,
        reservaId: `res-hist-${profesionalId}-${i + 1}`,
        profesionalId,
        organizacionId,
        autor: 'organizacion',
        calidad,
        plazos,
        comunicacion,
        comentario,
        fecha: fecha.toISOString(),
        publicada: true,
        estadoComentario: comentario ? 'aprobado' : 'sin_comentario',
      });
    });
  }

  // Evaluación de la reserva res-07 (EVALUADA) hecha por la organización de prueba.
  // Ambas partes evaluaron, por lo que está publicada.
  resultado.push({
    id: 'eval-res-07-org',
    reservaId: 'res-07',
    profesionalId: 'prof-01',
    organizacionId: 'org-01',
    autor: 'organizacion',
    calidad: 4,
    plazos: 4,
    comunicacion: 4,
    comentario: 'Camila nos ayudó a contratar a nuestra Head of Customer Success en tres semanas. Muy recomendable.',
    fecha: subDays(ahora, 5).toISOString(),
    publicada: true,
    estadoComentario: 'aprobado',
  });
  resultado.push({
    id: 'eval-res-07-prof',
    reservaId: 'res-07',
    profesionalId: 'prof-01',
    organizacionId: 'org-01',
    autor: 'profesional',
    calidad: 4,
    plazos: 4,
    comunicacion: 4,
    fecha: subDays(ahora, 4).toISOString(),
    publicada: true,
    estadoComentario: 'sin_comentario',
  });

  // Comentarios pendientes de revisión por Skilly (aparecen en el panel de administración).
  resultado.push({
    id: 'eval-revision-1',
    reservaId: 'res-hist-prof-05-90',
    profesionalId: 'prof-05',
    organizacionId: 'org-06',
    autor: 'organizacion',
    calidad: 4,
    plazos: 4,
    comunicacion: 4,
    comentario: 'Javiera se ganó al equipo desde el primer taller. Ojalá la hubiéramos contratado antes.',
    fecha: subDays(ahora, 1).toISOString(),
    publicada: true,
    estadoComentario: 'en_revision',
  });
  resultado.push({
    id: 'eval-revision-2',
    reservaId: 'res-hist-prof-02-90',
    profesionalId: 'prof-02',
    organizacionId: 'org-04',
    autor: 'organizacion',
    calidad: 2,
    plazos: 1,
    comunicacion: 2,
    comentario: 'Un desastre, no lo recomiendo a nadie. Ni siquiera contestó el teléfono (dejo su número personal acá: +56 9 5555 5555).',
    fecha: subDays(ahora, 2).toISOString(),
    publicada: true,
    estadoComentario: 'en_revision',
  });

  return resultado;
}

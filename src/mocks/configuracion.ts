import type { ConfiguracionPlataforma } from '@/types';

/**
 * Valores mock de configuración de plataforma. En producción vendrán del
 * backend (GET /api/configuracion/) y serán administrados por Skilly.
 * Ningún cálculo de la interfaz debe usar estos números directamente:
 * siempre pasan por services/configuracion.ts.
 */
export const configuracionMock: ConfiguracionPlataforma = {
  comisionPorcentaje: 15,
  // Comisión dividida en partes iguales entre profesional y organización.
  comisionProfesionalPorcentaje: 5,
  comisionOrganizacionPorcentaje: 5,
  politicaCancelacion: [
    { desdeHoras: 48, retencionPorcentaje: 0, etiqueta: 'Más de 48 horas antes' },
    { desdeHoras: 24, retencionPorcentaje: 25, etiqueta: 'Entre 24 y 48 horas antes' },
    { desdeHoras: 0, retencionPorcentaje: 50, etiqueta: 'Menos de 24 horas antes o ausencia' },
  ],
  retencionBloqueMinutos: 10,
  reputacion: {
    minimoEvaluaciones: 3,
    ventanaMaxEvaluaciones: 10,
    ventanaMeses: 12,
    diasPublicacionAutomatica: 7,
    maxCaracteresComentario: 500,
  },
  versionCondiciones: '2026-01',
  versionPoliticaDatos: '2026-01',
};

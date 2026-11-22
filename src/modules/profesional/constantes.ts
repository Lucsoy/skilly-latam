import type { EstadoValidacion } from '@/types';

/**
 * Áreas principales que el profesional elige al registrarse. Cada una
 * corresponde a una categoría del árbol que administra Skilly (mocks/categorias).
 */
export const AREAS_PROFESIONAL: Array<{ valor: string; etiqueta: string }> = [
  { valor: 'reclutamiento', etiqueta: 'Reclutamiento' },
  { valor: 'cultura', etiqueta: 'Cultura y clima' },
  { valor: 'compensaciones', etiqueta: 'Compensaciones' },
  { valor: 'capacitacion', etiqueta: 'Capacitación' },
  { valor: 'administracion', etiqueta: 'Administración de personal' },
  { valor: 'finanzas', etiqueta: 'Finanzas y contabilidad' },
];

export const ETIQUETA_VALIDACION: Record<EstadoValidacion, string> = {
  perfil_incompleto: 'Perfil incompleto',
  en_revision: 'En revisión',
  validado: 'Validado por Skilly',
};

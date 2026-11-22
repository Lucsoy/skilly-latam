import type { Modalidad } from '@/types';
import type { FiltroDisponibilidad, FiltrosBusqueda, OrdenCatalogo } from '@/services/catalogo';

/**
 * Los filtros viven en la barra de direcciones. Así la búsqueda se puede
 * compartir por correo con una jefatura, el botón "atrás" funciona como se
 * espera y recargar no pierde lo que la persona eligió.
 */

export type ClaveRangoPrecio = 'cualquiera' | 'hasta-200' | '200-500' | '500-800' | 'sobre-800';

export const RANGOS_PRECIO: Array<{ clave: ClaveRangoPrecio; etiqueta: string; min?: number; max?: number }> = [
  { clave: 'cualquiera', etiqueta: 'Cualquier precio' },
  { clave: 'hasta-200', etiqueta: 'Hasta $200.000', max: 200_000 },
  { clave: '200-500', etiqueta: '$200.000 a $500.000', min: 200_000, max: 500_000 },
  { clave: '500-800', etiqueta: '$500.000 a $800.000', min: 500_000, max: 800_000 },
  { clave: 'sobre-800', etiqueta: 'Más de $800.000', min: 800_000 },
];

export const OPCIONES_DISPONIBILIDAD: Array<{ valor: FiltroDisponibilidad; etiqueta: string }> = [
  { valor: 'cualquiera', etiqueta: 'Cualquier fecha' },
  { valor: 'esta_semana', etiqueta: 'Esta semana' },
  { valor: 'dos_semanas', etiqueta: 'Próximas dos semanas' },
];

export const OPCIONES_ORDEN: Array<{ valor: OrdenCatalogo; etiqueta: string }> = [
  { valor: 'relevancia', etiqueta: 'Relevancia' },
  { valor: 'precio_asc', etiqueta: 'Precio: de menor a mayor' },
  { valor: 'precio_desc', etiqueta: 'Precio: de mayor a menor' },
];

const MODALIDADES_VALIDAS: Modalidad[] = ['remoto', 'presencial', 'hibrido'];

export interface FiltrosUi {
  texto: string;
  categoriaId: string;
  subcategoriaId: string;
  modalidades: Modalidad[];
  rangoPrecio: ClaveRangoPrecio;
  disponibilidad: FiltroDisponibilidad;
  orden: OrdenCatalogo;
}

export const FILTROS_VACIOS: FiltrosUi = {
  texto: '',
  categoriaId: '',
  subcategoriaId: '',
  modalidades: [],
  rangoPrecio: 'cualquiera',
  disponibilidad: 'cualquiera',
  orden: 'relevancia',
};

export function leerFiltros(params: URLSearchParams): FiltrosUi {
  const modalidades = (params.get('mod') ?? '')
    .split(',')
    .filter((m): m is Modalidad => MODALIDADES_VALIDAS.includes(m as Modalidad));
  const rango = params.get('precio') as ClaveRangoPrecio | null;
  const disp = params.get('disp') as FiltroDisponibilidad | null;
  const orden = params.get('orden') as OrdenCatalogo | null;

  return {
    texto: params.get('q') ?? '',
    categoriaId: params.get('cat') ?? '',
    subcategoriaId: params.get('sub') ?? '',
    modalidades,
    rangoPrecio: RANGOS_PRECIO.some((r) => r.clave === rango) ? (rango as ClaveRangoPrecio) : 'cualquiera',
    disponibilidad: OPCIONES_DISPONIBILIDAD.some((d) => d.valor === disp) ? (disp as FiltroDisponibilidad) : 'cualquiera',
    orden: OPCIONES_ORDEN.some((o) => o.valor === orden) ? (orden as OrdenCatalogo) : 'relevancia',
  };
}

export function escribirFiltros(filtros: FiltrosUi): URLSearchParams {
  const params = new URLSearchParams();
  if (filtros.texto.trim()) params.set('q', filtros.texto.trim());
  if (filtros.categoriaId) params.set('cat', filtros.categoriaId);
  if (filtros.subcategoriaId) params.set('sub', filtros.subcategoriaId);
  if (filtros.modalidades.length) params.set('mod', filtros.modalidades.join(','));
  if (filtros.rangoPrecio !== 'cualquiera') params.set('precio', filtros.rangoPrecio);
  if (filtros.disponibilidad !== 'cualquiera') params.set('disp', filtros.disponibilidad);
  if (filtros.orden !== 'relevancia') params.set('orden', filtros.orden);
  return params;
}

/** Traduce los filtros de la interfaz a los parámetros que espera el servicio. */
export function aFiltrosBusqueda(filtros: FiltrosUi): FiltrosBusqueda {
  const rango = RANGOS_PRECIO.find((r) => r.clave === filtros.rangoPrecio);
  return {
    texto: filtros.texto.trim() || undefined,
    categoriaId: filtros.categoriaId || undefined,
    subcategoriaId: filtros.subcategoriaId || undefined,
    modalidades: filtros.modalidades.length ? filtros.modalidades : undefined,
    precioMin: rango?.min,
    precioMax: rango?.max,
    disponibilidad: filtros.disponibilidad,
    orden: filtros.orden,
  };
}

/** Cuenta filtros activos, sin contar el texto ni el orden. */
export function contarFiltrosActivos(filtros: FiltrosUi): number {
  let total = 0;
  if (filtros.categoriaId) total += 1;
  if (filtros.subcategoriaId) total += 1;
  if (filtros.modalidades.length) total += 1;
  if (filtros.rangoPrecio !== 'cualquiera') total += 1;
  if (filtros.disponibilidad !== 'cualquiera') total += 1;
  return total;
}

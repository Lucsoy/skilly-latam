import type { Categoria, Modalidad, Profesional, Reputacion, Servicio, Subcategoria } from '@/types';
import { categorias } from '@/mocks/categorias';
import { almacen } from '@/mocks/almacen';
import { latencia } from '@/lib/tiempo';
import { intercalarNuevos } from '@/lib/intercalar';
import { normalizar, raiz, tokenizar } from '@/lib/texto';
import { addDays } from 'date-fns';
import { ErrorServicio } from './errores';
import { reputacionSincrona } from './profesionales';
import { USE_API } from '@/config';
import { api } from '@/lib/apiClient';

/**
 * Backend esperado:
 *   GET /api/categorias/                          → Categoria[]
 *   GET /api/servicios/?texto=&categoria=&subcategoria=&modalidad=&precio_min=&precio_max=&disponibilidad=&orden=
 *                                                 → { items: ServicioEnCatalogo[], total }
 *   GET /api/servicios/{id}/                      → ServicioDetalle
 *   GET /api/profesionales/{id}/servicios/        → Servicio[]
 */

export type OrdenCatalogo = 'relevancia' | 'precio_asc' | 'precio_desc';
export type FiltroDisponibilidad = 'esta_semana' | 'dos_semanas' | 'cualquiera';

export interface FiltrosBusqueda {
  texto?: string;
  categoriaId?: string;
  subcategoriaId?: string;
  modalidades?: Modalidad[];
  precioMin?: number;
  precioMax?: number;
  disponibilidad?: FiltroDisponibilidad;
  orden?: OrdenCatalogo;
}

export interface ServicioEnCatalogo {
  servicio: Servicio;
  profesional: Profesional;
  categoria: Categoria;
  subcategoria: Subcategoria;
  reputacion: Reputacion;
  /** ISO del próximo bloque libre, o null si no tiene disponibilidad en los próximos 60 días. */
  proximoBloque: string | null;
}

export interface ResultadoBusqueda {
  items: ServicioEnCatalogo[];
  total: number;
}

export interface ServicioDetalle extends ServicioEnCatalogo {
  otrosServiciosDelProfesional: Servicio[];
}

export async function listarCategorias(): Promise<Categoria[]> {
  if (USE_API) return api.get<Categoria[]>('/categorias/');
  await latencia();
  return categorias;
}

function proximoBloqueDe(profesionalId: string, ahora: Date): string | null {
  const retenidos = new Set(
    almacen.retenciones.filter((r) => new Date(r.expiraEn) > ahora).map((r) => r.bloqueId),
  );
  const bloques = almacen.disponibilidad
    .filter((b) => b.profesionalId === profesionalId && new Date(b.inicio) > ahora && !retenidos.has(b.id))
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  return bloques[0]?.inicio ?? null;
}

function armarItem(servicio: Servicio, ahora: Date): ServicioEnCatalogo | null {
  const profesional = almacen.profesionales.find((p) => p.id === servicio.profesionalId);
  const categoria = categorias.find((c) => c.id === servicio.categoriaId);
  const subcategoria = categoria?.subcategorias.find((s) => s.id === servicio.subcategoriaId);
  if (!profesional || !categoria || !subcategoria) return null;
  return {
    servicio,
    profesional,
    categoria,
    subcategoria,
    reputacion: reputacionSincrona(profesional.id),
    proximoBloque: proximoBloqueDe(profesional.id, ahora),
  };
}

function puntajeRelevancia(item: ServicioEnCatalogo, terminos: string[]): number {
  if (terminos.length === 0) return 0;
  const campos: Array<[string, number]> = [
    [item.servicio.titulo, 4],
    [item.servicio.etiquetas.join(' '), 3],
    [item.subcategoria.nombre, 2],
    [item.categoria.nombre, 2],
    [item.servicio.descripcion, 1],
    [item.profesional.titulo, 1],
    [item.profesional.habilidades.join(' '), 1],
  ];
  let puntaje = 0;
  for (const termino of terminos) {
    const r = raiz(termino);
    for (const [texto, peso] of campos) {
      const n = normalizar(texto);
      if (n.includes(termino)) puntaje += peso * 2;
      else if (r.length >= 4 && n.includes(r)) puntaje += peso;
    }
  }
  return puntaje;
}

export async function buscarServicios(filtros: FiltrosBusqueda = {}): Promise<ResultadoBusqueda> {
  if (USE_API) return api.get<ResultadoBusqueda>('/servicios/', { texto: filtros.texto, categoria: filtros.categoriaId, subcategoria: filtros.subcategoriaId, modalidad: filtros.modalidades?.join(','), precio_min: filtros.precioMin, precio_max: filtros.precioMax, disponibilidad: filtros.disponibilidad, orden: filtros.orden });
  await latencia();
  const ahora = new Date();
  const terminos = tokenizar(filtros.texto ?? '');

  let items = almacen.servicios
    .filter((s) => s.publicado !== false)
    .map((s) => armarItem(s, ahora))
    .filter((i): i is ServicioEnCatalogo => i !== null);

  if (filtros.categoriaId) items = items.filter((i) => i.servicio.categoriaId === filtros.categoriaId);
  if (filtros.subcategoriaId) items = items.filter((i) => i.servicio.subcategoriaId === filtros.subcategoriaId);
  if (filtros.modalidades && filtros.modalidades.length > 0) {
    const set = new Set(filtros.modalidades);
    items = items.filter((i) => i.servicio.modalidades.some((m) => set.has(m)));
  }
  if (filtros.precioMin !== undefined) items = items.filter((i) => i.servicio.precio >= (filtros.precioMin as number));
  if (filtros.precioMax !== undefined) items = items.filter((i) => i.servicio.precio <= (filtros.precioMax as number));
  if (filtros.disponibilidad && filtros.disponibilidad !== 'cualquiera') {
    const limite = addDays(ahora, filtros.disponibilidad === 'esta_semana' ? 7 : 14);
    items = items.filter((i) => i.proximoBloque !== null && new Date(i.proximoBloque) <= limite);
  }

  const puntajes = new Map<string, number>();
  if (terminos.length > 0) {
    for (const i of items) puntajes.set(i.servicio.id, puntajeRelevancia(i, terminos));
    // Se descarta lo que apenas roza la búsqueda: si algo calza mucho mejor,
    // mostrar coincidencias débiles solo agrega ruido a la lista.
    const mejor = Math.max(0, ...puntajes.values());
    const minimo = Math.max(1, mejor * 0.3);
    items = items.filter((i) => (puntajes.get(i.servicio.id) ?? 0) >= minimo);
  }

  const orden = filtros.orden ?? 'relevancia';
  switch (orden) {
    case 'precio_asc':
      items.sort((a, b) => a.servicio.precio - b.servicio.precio);
      break;
    case 'precio_desc':
      items.sort((a, b) => b.servicio.precio - a.servicio.precio);
      break;
    case 'relevancia':
    default:
      items.sort((a, b) => {
        const diferencia = (puntajes.get(b.servicio.id) ?? 0) - (puntajes.get(a.servicio.id) ?? 0);
        if (diferencia !== 0) return diferencia;
        // Sin texto de búsqueda: los profesionales validados primero, luego por proximidad de disponibilidad.
        const validado = Number(b.profesional.validadoPorSkilly) - Number(a.profesional.validadoPorSkilly);
        if (validado !== 0) return validado;
        return (a.proximoBloque ?? '9').localeCompare(b.proximoBloque ?? '9');
      });
  }

  // Regla de visibilidad: en relevancia los profesionales nuevos se
  // intercalan con los que tienen historial. En orden por precio se respeta el
  // precio, que es un criterio objetivo elegido por la organización.
  if (orden === 'relevancia') {
    items = intercalarNuevos(items, (i) => i.reputacion.esNuevo, 2);
  }

  return { items, total: items.length };
}

export async function obtenerServicio(id: string): Promise<ServicioDetalle> {
  if (USE_API) return api.get<ServicioDetalle>('/servicios/', { id });
  await latencia();
  const servicio = almacen.servicios.find((s) => s.id === id);
  const item = servicio && servicio.publicado !== false ? armarItem(servicio, new Date()) : null;
  if (!servicio || !item) {
    throw new ErrorServicio('no_encontrado', 'Este servicio ya no está publicado. Te invitamos a buscar otras opciones.');
  }
  return {
    ...item,
    otrosServiciosDelProfesional: almacen.servicios.filter((s) => s.profesionalId === servicio.profesionalId && s.id !== id && s.publicado !== false),
  };
}

export async function listarServiciosDeProfesional(profesionalId: string): Promise<Servicio[]> {
  if (USE_API) return api.get<Servicio[]>('/servicios/', { accion: 'de-profesional', profesional_id: profesionalId });
  await latencia();
  return almacen.servicios.filter((s) => s.profesionalId === profesionalId && s.publicado !== false);
}

/** Uso interno de otros servicios; no simula latencia. */
export function servicioSincrono(id: string): Servicio | undefined {
  return almacen.servicios.find((s) => s.id === id);
}

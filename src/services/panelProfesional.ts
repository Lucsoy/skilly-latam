import type { DocumentoRespaldo, PerfilPrivadoProfesional, Profesional, Servicio, TipoDocumento } from '@/types';
import { almacen, clonar, persistir } from '@/mocks/almacen';
import { idLocal, latencia } from '@/lib/tiempo';
import { ErrorServicio } from './errores';
import { profesionalIdEnSesion } from './sesionActual';
import { categorias } from '@/mocks/categorias';
import { fechaSantiago, sumarMinutosISO } from '@/lib/tiempo';
import { USE_API } from '@/config';
import { api } from '@/lib/apiClient';

export interface MiCuentaProfesional {
  profesional: Profesional;
  privado: PerfilPrivadoProfesional;
}

export interface DatosPerfilProfesional {
  titulo: string;
  ciudad: string;
  presentacion: string;
  formacion: string[];
  habilidades: string[];
  experiencia: Profesional['experiencia'];
  linkedin?: string;
  portafolio?: string;
}

export interface DatosServicioProfesional {
  categoriaId: string;
  subcategoriaId: string;
  titulo: string;
  descripcion: string;
  entregables: string[];
  duracionEstimada: string;
  duracionSesionMinutos: number;
  modalidades: Servicio['modalidades'];
  precio: number;
  etiquetas: string[];
  publicado: boolean;
}

export interface HorarioSemanal {
  dia: number;
  activo: boolean;
  desde: string;
  hasta: string;
}

export interface BloqueoDisponibilidad {
  id: string;
  fecha: string;
  desde: string;
  hasta: string;
  motivo?: string;
}

const CLAVE_HORARIOS = 'skilly.profesional.horarios.v1';
const CLAVE_BLOQUEOS = 'skilly.profesional.bloqueos.v1';

const HORARIOS_DEFAULT: HorarioSemanal[] = [
  { dia: 1, activo: true, desde: '09:00', hasta: '18:00' },
  { dia: 2, activo: true, desde: '09:00', hasta: '18:00' },
  { dia: 3, activo: true, desde: '09:00', hasta: '18:00' },
  { dia: 4, activo: true, desde: '09:00', hasta: '18:00' },
  { dia: 5, activo: true, desde: '09:00', hasta: '16:00' },
  { dia: 6, activo: false, desde: '10:00', hasta: '14:00' },
  { dia: 0, activo: false, desde: '10:00', hasta: '14:00' },
];

function leerPorProfesional<T>(clave: string, profesionalId: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(clave);
    const todos = raw ? (JSON.parse(raw) as Record<string, T>) : {};
    return todos[profesionalId] ?? fallback;
  } catch {
    return fallback;
  }
}

function guardarPorProfesional<T>(clave: string, profesionalId: string, valor: T): void {
  try {
    const raw = localStorage.getItem(clave);
    const todos = raw ? (JSON.parse(raw) as Record<string, T>) : {};
    todos[profesionalId] = valor;
    localStorage.setItem(clave, JSON.stringify(todos));
  } catch {
    // La demo sigue funcionando en memoria.
  }
}

export async function obtenerMiCuenta(): Promise<MiCuentaProfesional> {
  if (USE_API) return api.get<MiCuentaProfesional>('/profesionales/', { accion: 'mi-cuenta' });
  await latencia();
  const id = profesionalIdEnSesion();
  const profesional = almacen.profesionales.find((p) => p.id === id);
  const privado = almacen.perfilesProfesionales.find((p) => p.profesionalId === id);
  if (!profesional || !privado) {
    throw new ErrorServicio('no_encontrado', 'No encontramos tu perfil. Vuelve a ingresar o escríbenos a hola@skilly.cl.');
  }
  return { profesional: clonar(profesional), privado: clonar(privado) };
}

export async function actualizarMiPerfil(datos: DatosPerfilProfesional): Promise<MiCuentaProfesional> {
  if (USE_API) return api.put<MiCuentaProfesional>('/profesionales/?accion=mi-perfil', datos);
  await latencia();
  const id = profesionalIdEnSesion();
  const profesional = almacen.profesionales.find((p) => p.id === id);
  const privado = almacen.perfilesProfesionales.find((p) => p.profesionalId === id);
  if (!profesional || !privado) throw new ErrorServicio('no_encontrado', 'No encontramos tu perfil.');

  if (!datos.titulo.trim() || !datos.ciudad.trim() || datos.presentacion.trim().length < 40) {
    throw new ErrorServicio('validacion', 'Completa cargo, ciudad y una presentación de al menos 40 caracteres.');
  }
  if (datos.formacion.filter(Boolean).length === 0) throw new ErrorServicio('validacion', 'Agrega al menos una formación.');
  if (datos.habilidades.filter(Boolean).length === 0) throw new ErrorServicio('validacion', 'Agrega al menos una habilidad.');

  Object.assign(profesional, {
    titulo: datos.titulo.trim(),
    ciudad: datos.ciudad.trim(),
    presentacion: datos.presentacion.trim(),
    formacion: datos.formacion.map((x) => x.trim()).filter(Boolean),
    habilidades: datos.habilidades.map((x) => x.trim()).filter(Boolean),
    experiencia: datos.experiencia.map((x) => ({ ...x, cargo: x.cargo.trim(), organizacion: x.organizacion.trim(), periodo: x.periodo.trim() })).filter((x) => x.cargo && x.organizacion),
    linkedin: datos.linkedin?.trim() || undefined,
    portafolio: datos.portafolio?.trim() || undefined,
  });

  if (privado.estadoValidacion === 'perfil_incompleto') privado.estadoValidacion = 'en_revision';
  persistir();
  return { profesional: clonar(profesional), privado: clonar(privado) };
}

export async function solicitarValidacion(): Promise<PerfilPrivadoProfesional> {
  if (USE_API) return api.post<PerfilPrivadoProfesional>('/profesionales/?accion=validar', {});
  await latencia();
  const id = profesionalIdEnSesion();
  const profesional = almacen.profesionales.find((p) => p.id === id);
  const privado = almacen.perfilesProfesionales.find((p) => p.profesionalId === id);
  if (!profesional || !privado) throw new ErrorServicio('no_encontrado', 'No encontramos tu perfil.');
  if (!profesional.titulo || !profesional.ciudad || !profesional.presentacion || !profesional.formacion.length || !profesional.habilidades.length) {
    throw new ErrorServicio('validacion', 'Completa tu información profesional antes de enviarla a revisión.');
  }
  privado.estadoValidacion = 'en_revision';
  persistir();
  return clonar(privado);
}

/** Formatos y tamaño que acepta el servidor para los documentos de respaldo. */
export const EXTENSIONES_DOCUMENTO = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
export const TAMANO_MAXIMO_DOCUMENTO = 5 * 1024 * 1024;

/**
 * Sube un documento de respaldo (el archivo real, no solo su nombre).
 * Backend: POST /api/profesionales/?accion=documento  multipart { tipo, archivo } → DocumentoRespaldo
 */
export async function agregarDocumento(archivo: File, tipo: TipoDocumento): Promise<DocumentoRespaldo> {
  const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
  if (!EXTENSIONES_DOCUMENTO.includes(extension)) {
    throw new ErrorServicio('validacion', 'Formato no permitido. Sube un PDF, Word (.doc/.docx) o imagen JPG/PNG.');
  }
  if (archivo.size > TAMANO_MAXIMO_DOCUMENTO) {
    throw new ErrorServicio('validacion', 'El archivo supera el tamaño máximo de 5 MB.');
  }
  if (USE_API) {
    const formulario = new FormData();
    formulario.append('tipo', tipo);
    formulario.append('archivo', archivo);
    return api.subir<DocumentoRespaldo>('/profesionales/?accion=documento', formulario);
  }
  await latencia();
  const id = profesionalIdEnSesion();
  const privado = almacen.perfilesProfesionales.find((p) => p.profesionalId === id);
  if (!privado) throw new ErrorServicio('no_encontrado', 'No encontramos tu perfil.');
  // En modo demo (sin backend) solo se registran los datos del archivo.
  const documento: DocumentoRespaldo = {
    id: idLocal('doc'),
    tipo,
    nombreArchivo: archivo.name,
    tamanoBytes: archivo.size,
    subidoEn: new Date().toISOString(),
    estado: 'pendiente_revision',
    tieneArchivo: false,
  };
  privado.documentos.push(documento);
  persistir();
  return clonar(documento);
}

/**
 * Abre un documento de respaldo en una pestaña nueva. Lo usan el propio
 * profesional y el equipo de Skilly; el backend valida los permisos.
 * Backend: GET /api/profesionales/?accion=documento-archivo&id={id} → archivo
 */
export async function abrirDocumento(documentoId: string): Promise<void> {
  if (!USE_API) {
    throw new ErrorServicio('no_encontrado', 'En el modo demostración los archivos no se guardan, solo sus datos.');
  }
  // Se abre la pestaña antes de la descarga para que el navegador no la bloquee.
  const ventana = window.open('', '_blank');
  try {
    const archivo = await api.descargar('/profesionales/', { accion: 'documento-archivo', id: documentoId });
    const url = URL.createObjectURL(archivo);
    if (ventana) ventana.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    ventana?.close();
    throw error;
  }
}

export async function listarMisServicios(): Promise<Servicio[]> {
  if (USE_API) return api.get<Servicio[]>('/servicios/', { accion: 'mis-servicios' });
  await latencia();
  const id = profesionalIdEnSesion();
  return clonar(almacen.servicios.filter((s) => s.profesionalId === id).sort((a, b) => a.titulo.localeCompare(b.titulo)));
}

/** Solo los profesionales validados por Skilly pueden mostrar servicios en el catálogo. */
function exigirPerfilValidado(profesionalId: string): void {
  const privado = almacen.perfilesProfesionales.find((p) => p.profesionalId === profesionalId);
  if (privado?.estadoValidacion !== 'validado') {
    throw new ErrorServicio('conflicto', 'Podrás publicar servicios cuando Skilly valide tu perfil. Mientras tanto puedes guardarlos como pausados.');
  }
}

function validarServicio(datos: DatosServicioProfesional): void {
  const categoria = categorias.find((c) => c.id === datos.categoriaId);
  const subcategoria = categoria?.subcategorias.find((s) => s.id === datos.subcategoriaId);
  if (!USE_API && (!categoria || !subcategoria)) throw new ErrorServicio('validacion', 'Selecciona una categoría y subcategoría válidas.');
  if (datos.titulo.trim().length < 8) throw new ErrorServicio('validacion', 'El título debe ser más descriptivo.');
  if (datos.descripcion.trim().length < 30) throw new ErrorServicio('validacion', 'La descripción debe tener al menos 30 caracteres.');
  if (datos.entregables.filter(Boolean).length === 0) throw new ErrorServicio('validacion', 'Agrega al menos un entregable.');
  if (!Number.isFinite(datos.precio) || datos.precio <= 0) throw new ErrorServicio('validacion', 'El precio debe ser mayor que cero.');
  if (!datos.modalidades.length) throw new ErrorServicio('validacion', 'Selecciona al menos una modalidad.');
}

export async function crearServicio(datos: DatosServicioProfesional): Promise<Servicio> {
  if (USE_API) return api.post<Servicio>('/servicios/', datos);
  await latencia();
  const id = profesionalIdEnSesion();
  validarServicio(datos);
  if (datos.publicado) exigirPerfilValidado(id);
  const servicio: Servicio = {
    id: idLocal('srv'),
    profesionalId: id,
    categoriaId: datos.categoriaId,
    subcategoriaId: datos.subcategoriaId,
    titulo: datos.titulo.trim(),
    descripcion: datos.descripcion.trim(),
    entregables: datos.entregables.map((x) => x.trim()).filter(Boolean),
    duracionEstimada: datos.duracionEstimada.trim() || 'A coordinar',
    duracionSesionMinutos: datos.duracionSesionMinutos,
    modalidades: datos.modalidades,
    precio: Math.round(datos.precio),
    etiquetas: datos.etiquetas.map((x) => x.trim()).filter(Boolean),
    publicado: datos.publicado,
  };
  almacen.servicios.push(servicio);
  persistir();
  return clonar(servicio);
}

export async function actualizarServicio(id: string, datos: DatosServicioProfesional): Promise<Servicio> {
  if (USE_API) return api.put<Servicio>(`/servicios/?id=${encodeURIComponent(id)}`, datos);
  await latencia();
  const profesionalId = profesionalIdEnSesion();
  const servicio = almacen.servicios.find((s) => s.id === id && s.profesionalId === profesionalId);
  if (!servicio) throw new ErrorServicio('no_encontrado', 'No encontramos ese servicio en tu cuenta.');
  validarServicio(datos);
  if (datos.publicado && servicio.publicado === false) exigirPerfilValidado(profesionalId);
  // Una revisión aprobada deja de valer si el servicio cambia: puede volver a pedirla.
  if (servicio.revision?.estado === 'aprobada') servicio.revision = null;
  Object.assign(servicio, {
    categoriaId: datos.categoriaId,
    subcategoriaId: datos.subcategoriaId,
    titulo: datos.titulo.trim(),
    descripcion: datos.descripcion.trim(),
    entregables: datos.entregables.map((x) => x.trim()).filter(Boolean),
    duracionEstimada: datos.duracionEstimada.trim() || 'A coordinar',
    duracionSesionMinutos: datos.duracionSesionMinutos,
    modalidades: datos.modalidades,
    precio: Math.round(datos.precio),
    etiquetas: datos.etiquetas.map((x) => x.trim()).filter(Boolean),
    publicado: datos.publicado,
  });
  persistir();
  return clonar(servicio);
}

export async function cambiarPublicacionServicio(id: string, publicado: boolean): Promise<Servicio> {
  if (USE_API) return api.put<Servicio>(`/servicios/?id=${encodeURIComponent(id)}&accion=publicacion`, { publicado });
  await latencia();
  const profesionalId = profesionalIdEnSesion();
  const servicio = almacen.servicios.find((s) => s.id === id && s.profesionalId === profesionalId);
  if (!servicio) throw new ErrorServicio('no_encontrado', 'No encontramos ese servicio en tu cuenta.');
  if (publicado) exigirPerfilValidado(profesionalId);
  servicio.publicado = publicado;
  persistir();
  return clonar(servicio);
}

export async function eliminarServicio(id: string): Promise<void> {
  if (USE_API) { await api.delete('/servicios/', { id }); return; }
  await latencia();
  const profesionalId = profesionalIdEnSesion();
  const existe = almacen.servicios.some((s) => s.id === id && s.profesionalId === profesionalId);
  if (!existe) throw new ErrorServicio('no_encontrado', 'No encontramos ese servicio en tu cuenta.');
  const tieneReservas = almacen.reservas.some((r) => r.servicioId === id && !['RECHAZADA', 'CANCELADA', 'EVALUADA'].includes(r.estado));
  if (tieneReservas) throw new ErrorServicio('conflicto', 'No puedes eliminar un servicio con contrataciones activas. Puedes pausarlo.');
  almacen.servicios = almacen.servicios.filter((s) => s.id !== id);
  persistir();
}

/**
 * El profesional pide al equipo de Skilly que revise un servicio.
 * Backend: POST /api/servicios/?accion=solicitar-revision&id={id}  { mensaje? } → Servicio
 */
export async function solicitarRevisionServicio(id: string, mensaje?: string): Promise<Servicio> {
  const texto = mensaje?.trim() ?? '';
  if (texto.length > 500) throw new ErrorServicio('validacion', 'El mensaje no puede superar los 500 caracteres.');
  if (USE_API) return api.post<Servicio>(`/servicios/?accion=solicitar-revision&id=${encodeURIComponent(id)}`, { mensaje: texto });
  await latencia();
  const profesionalId = profesionalIdEnSesion();
  const servicio = almacen.servicios.find((s) => s.id === id && s.profesionalId === profesionalId);
  if (!servicio) throw new ErrorServicio('no_encontrado', 'No encontramos ese servicio en tu cuenta.');
  if (servicio.revision?.estado === 'pendiente') {
    throw new ErrorServicio('conflicto', 'Ya enviaste este servicio a revisión. El equipo de Skilly te responderá pronto.');
  }
  servicio.revision = {
    id: idLocal('rev'),
    estado: 'pendiente',
    mensaje: texto || null,
    solicitadaEn: new Date().toISOString(),
    resueltaEn: null,
    comentarioAdmin: null,
    revisadoPor: null,
  };
  persistir();
  return clonar(servicio);
}

export async function obtenerHorariosSemanales(): Promise<HorarioSemanal[]> {
  if (USE_API) return api.get<HorarioSemanal[]>('/disponibilidad/', { accion: 'horarios' });
  await latencia();
  const id = profesionalIdEnSesion();
  return clonar(leerPorProfesional(CLAVE_HORARIOS, id, HORARIOS_DEFAULT));
}

export async function guardarHorariosSemanales(horarios: HorarioSemanal[]): Promise<HorarioSemanal[]> {
  if (USE_API) return api.put<HorarioSemanal[]>('/disponibilidad/?accion=horarios', { horarios });
  await latencia();
  const id = profesionalIdEnSesion();
  const normalizados = horarios.map((h) => ({ ...h, desde: h.desde, hasta: h.hasta }));
  guardarPorProfesional(CLAVE_HORARIOS, id, normalizados);
  regenerarBloquesDesdeHorario(id, normalizados);
  return clonar(normalizados);
}

export async function listarBloqueosDisponibilidad(): Promise<BloqueoDisponibilidad[]> {
  if (USE_API) return api.get<BloqueoDisponibilidad[]>('/disponibilidad/', { accion: 'bloqueos' });
  await latencia();
  return clonar(leerPorProfesional(CLAVE_BLOQUEOS, profesionalIdEnSesion(), []));
}

export async function agregarBloqueoDisponibilidad(datos: Omit<BloqueoDisponibilidad, 'id'>): Promise<BloqueoDisponibilidad> {
  if (USE_API) return api.post<BloqueoDisponibilidad>('/disponibilidad/?accion=bloqueos', datos);
  await latencia();
  const idProfesional = profesionalIdEnSesion();
  const bloqueos = leerPorProfesional<BloqueoDisponibilidad[]>(CLAVE_BLOQUEOS, idProfesional, []);
  const bloqueo = { ...datos, id: idLocal('bloq') };
  bloqueos.push(bloqueo);
  guardarPorProfesional(CLAVE_BLOQUEOS, idProfesional, bloqueos);
  regenerarBloquesDesdeHorario(idProfesional, leerPorProfesional(CLAVE_HORARIOS, idProfesional, HORARIOS_DEFAULT));
  return clonar(bloqueo);
}

export async function eliminarBloqueoDisponibilidad(id: string): Promise<void> {
  if (USE_API) { await api.delete('/disponibilidad/', { accion: 'bloqueos', id }); return; }
  await latencia();
  const profesionalId = profesionalIdEnSesion();
  const bloqueos = leerPorProfesional<BloqueoDisponibilidad[]>(CLAVE_BLOQUEOS, profesionalId, []);
  guardarPorProfesional(CLAVE_BLOQUEOS, profesionalId, bloqueos.filter((b) => b.id !== id));
  regenerarBloquesDesdeHorario(profesionalId, leerPorProfesional(CLAVE_HORARIOS, profesionalId, HORARIOS_DEFAULT));
}

function minutos(hora: string): number {
  const [h = 0, m = 0] = hora.split(':').map(Number);
  return h * 60 + m;
}

function regenerarBloquesDesdeHorario(profesionalId: string, horarios: HorarioSemanal[]): void {
  const ahora = new Date();
  const bloqueos = leerPorProfesional<BloqueoDisponibilidad[]>(CLAVE_BLOQUEOS, profesionalId, []);
  const reservasFuturas = almacen.reservas.filter((r) => r.profesionalId === profesionalId && new Date(r.inicio) > ahora && !['RECHAZADA', 'CANCELADA'].includes(r.estado));
  const nuevos: typeof almacen.disponibilidad = [];
  const horariosPorDia = new Map(horarios.map((h) => [h.dia, h]));
  for (let offset = 1; offset <= 60; offset++) {
    const mediodia = new Date(fechaSantiago(ahora, offset, 12));
    const dia = mediodia.getUTCDay();
    const horario = horariosPorDia.get(dia);
    if (!horario?.activo) continue;
    const inicioMin = minutos(horario.desde);
    const finMin = minutos(horario.hasta);
    for (let m = inicioMin; m + 60 <= finMin; m += 60) {
      const hora = Math.floor(m / 60);
      const minuto = m % 60;
      const iso = fechaSantiago(ahora, offset, hora, minuto);
      const fin = sumarMinutosISO(iso, 60);
      const ocupado = reservasFuturas.some((r) => new Date(iso) < new Date(r.fin) && new Date(fin) > new Date(r.inicio));
      const bloqueado = bloqueos.some((b) => b.fecha === iso.slice(0, 10) && m < minutos(b.hasta) && m + 60 > minutos(b.desde));
      if (!ocupado && !bloqueado) nuevos.push({ id: `blq-${profesionalId}-${offset}-${m}`, profesionalId, inicio: iso, fin });
    }
  }
  const otros = almacen.disponibilidad.filter((b) => b.profesionalId !== profesionalId);
  almacen.disponibilidad = [...otros, ...nuevos];
  persistir();
}


import type { CuentaMock } from '@/mocks/organizaciones';
import type { DocumentoRespaldo, EstadoReserva, EstadoValidacion, Evaluacion, Organizacion, PerfilPrivadoProfesional, Profesional, Reserva, Rol, Servicio } from '@/types';
import { almacen, clonar, persistir } from '@/mocks/almacen';
import { nombresOtrasOrganizaciones } from '@/mocks/organizaciones';
import { latencia } from '@/lib/tiempo';
import { ErrorServicio } from './errores';
import { requiereAdministrador, requiereFundador, sesionActual } from './sesionActual';
import { reputacionSincrona } from './profesionales';
import { USE_API } from '@/config';
import { api } from '@/lib/apiClient';

/**
 * Panel de administración de Skilly. Solo accesible con rol 'administrador'.
 *
 * Backend esperado (prefijo /api/admin/, permisos de staff):
 *   GET   /api/admin/resumen/                       → ResumenAdmin
 *   GET   /api/admin/reservas/                      → ReservaAdmin[]  (todas las organizaciones)
 *   GET   /api/admin/profesionales/                 → ProfesionalAdmin[]
 *   GET   /api/admin/organizaciones/                → Organizacion[]
 *   GET   /api/admin/comentarios/?estado=en_revision → ComentarioEnRevision[]
 *   POST  /api/admin/comentarios/{id}/moderar/      { decision: 'aprobar' | 'rechazar' } → Evaluacion
 *   PATCH /api/configuracion/                       → ver services/configuracion.ts
 */

export interface ReservaAdmin {
  reserva: Reserva;
  organizacion: string;
  profesional: string;
  servicio: string;
}

export interface ProfesionalAdmin {
  profesional: Profesional;
  servicios: Servicio[];
  totalEvaluaciones: number;
  esNuevo: boolean;
  reservasActivas: number;
  /** Estado de la validación del perfil (privado, solo para Skilly). */
  estadoValidacion?: EstadoValidacion | null;
}

export interface ComentarioEnRevision {
  evaluacion: Evaluacion;
  organizacion: string;
  profesional: string;
}

export interface AdministradorAdmin {
  id: string;
  nombre: string;
  email: string;
  rol: Extract<Rol, 'administrador' | 'fundador'>;
}

export interface NuevoAdministrador {
  nombre: string;
  email: string;
  contrasena: string;
  rol: Extract<Rol, 'administrador' | 'fundador'>;
}

export async function listarAdministradoresAdmin(): Promise<AdministradorAdmin[]> {
  if (USE_API) { requiereFundador(); return api.get<AdministradorAdmin[]>('/admin/', { accion: 'administradores' }); }

  await latencia();
  requiereFundador();
  return clonar(almacen.cuentas.filter((c) => c.rol === 'administrador' || c.rol === 'fundador').map((c) => ({
    id: c.id, nombre: c.nombre, email: c.email, rol: c.rol as 'administrador' | 'fundador',
  })));
}

export async function crearAdministradorAdmin(datos: NuevoAdministrador): Promise<AdministradorAdmin> {
  if (USE_API) { requiereFundador(); return api.post<AdministradorAdmin>('/admin/?accion=administradores', datos); }

  await latencia();
  requiereFundador();
  const email = datos.email.trim().toLowerCase();
  if (almacen.cuentas.some((c) => c.email === email)) throw new ErrorServicio('conflicto', 'Ya existe una cuenta con ese correo.');
  const cuenta: CuentaMock = {
    id: `cta-admin-${Date.now()}`, email, contrasena: datos.contrasena, rol: datos.rol, nombre: datos.nombre.trim(),
  };
  almacen.cuentas.push(cuenta);
  persistir();
  return { id: cuenta.id, nombre: cuenta.nombre, email: cuenta.email, rol: cuenta.rol as 'administrador' | 'fundador' };
}

export async function eliminarAdministradorAdmin(id: string): Promise<void> {
  if (USE_API) { requiereFundador(); await api.delete('/admin/', { accion: 'administradores', id }); return; }

  await latencia();
  requiereFundador();
  const cuenta = almacen.cuentas.find((c) => c.id === id);
  if (!cuenta || (cuenta.rol !== 'administrador' && cuenta.rol !== 'fundador')) throw new ErrorServicio('no_encontrado', 'No encontramos esa cuenta administrativa.');
  if (cuenta.rol === 'fundador') {
    const fundadores = almacen.cuentas.filter((c) => c.rol === 'fundador');
    if (fundadores.length <= 1) throw new ErrorServicio('conflicto', 'Debe existir al menos una cuenta fundadora activa.');
  }
  const actual = sesionActual();
  if (actual?.usuario.id === id) throw new ErrorServicio('conflicto', 'No puedes eliminar la cuenta con la que estás conectado.');
  almacen.cuentas.splice(almacen.cuentas.findIndex((c) => c.id === id), 1);
  persistir();
}

export interface ResumenAdmin {
  organizaciones: number;
  profesionales: number;
  profesionalesNuevos: number;
  servicios: number;
  reservasPorEstado: Record<string, number>;
  comentariosEnRevision: number;
  proximas24h: number;
}

function nombreOrganizacion(id: string): string {
  return almacen.organizaciones.find((o) => o.id === id)?.razonSocial ?? nombresOtrasOrganizaciones[id] ?? id;
}

function nombreProfesional(id: string): string {
  const p = almacen.profesionales.find((x) => x.id === id);
  return p ? `${p.nombre} ${p.apellido}` : id;
}

export async function obtenerResumen(): Promise<ResumenAdmin> {
  if (USE_API) { requiereAdministrador(); return api.get<ResumenAdmin>('/admin/', { accion: 'resumen' }); }

  await latencia();
  requiereAdministrador();
  const ahora = Date.now();
  const en24h = ahora + 24 * 3_600_000;
  const reservasPorEstado: Record<string, number> = {};
  for (const r of almacen.reservas) reservasPorEstado[r.estado] = (reservasPorEstado[r.estado] ?? 0) + 1;
  const nuevos = almacen.profesionales.filter((p) => reputacionSincrona(p.id).esNuevo).length;
  return {
    organizaciones: almacen.organizaciones.length,
    profesionales: almacen.profesionales.length,
    profesionalesNuevos: nuevos,
    servicios: almacen.servicios.length,
    reservasPorEstado,
    comentariosEnRevision: almacen.evaluaciones.filter((e) => e.estadoComentario === 'en_revision').length,
    proximas24h: almacen.reservas.filter((r) => {
      const t = new Date(r.inicio).getTime();
      return (r.estado === 'CONFIRMADA' || r.estado === 'SOLICITADA') && t > ahora && t <= en24h;
    }).length,
  };
}

export async function listarReservasAdmin(): Promise<ReservaAdmin[]> {
  if (USE_API) { requiereAdministrador(); return api.get<ReservaAdmin[]>('/admin/', { accion: 'reservas' }); }

  await latencia();
  requiereAdministrador();
  return clonar(almacen.reservas)
    .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
    .map((reserva) => ({
      reserva,
      organizacion: nombreOrganizacion(reserva.organizacionId),
      profesional: nombreProfesional(reserva.profesionalId),
      servicio: almacen.servicios.find((s) => s.id === reserva.servicioId)?.titulo ?? reserva.servicioId,
    }));
}

export async function listarProfesionalesAdmin(): Promise<ProfesionalAdmin[]> {
  if (USE_API) { requiereAdministrador(); return api.get<ProfesionalAdmin[]>('/admin/', { accion: 'profesionales' }); }

  await latencia();
  requiereAdministrador();
  return almacen.profesionales.map((profesional) => {
    const rep = reputacionSincrona(profesional.id);
    return {
      profesional,
      servicios: almacen.servicios.filter((s) => s.profesionalId === profesional.id),
      totalEvaluaciones: rep.totalHistoricas,
      esNuevo: rep.esNuevo,
      reservasActivas: almacen.reservas.filter(
        (r) => r.profesionalId === profesional.id && ['SOLICITADA', 'CONFIRMADA', 'EN_CURSO', 'REAGENDADA'].includes(r.estado),
      ).length,
      estadoValidacion: almacen.perfilesProfesionales.find((p) => p.profesionalId === profesional.id)?.estadoValidacion ?? null,
    };
  });
}

/** Ficha completa de un profesional para el equipo de Skilly. */
export interface DetalleProfesionalAdmin extends ProfesionalAdmin {
  privado: PerfilPrivadoProfesional | null;
  emailCuenta: string | null;
  reservasPorEstado: Partial<Record<EstadoReserva, number>>;
  /** Suma del precio (sin comisión) de los trabajos entregados o evaluados. */
  montoFinalizado: number;
}

export async function obtenerDetalleProfesionalAdmin(id: string): Promise<DetalleProfesionalAdmin> {
  if (USE_API) { requiereAdministrador(); return api.get<DetalleProfesionalAdmin>('/admin/', { accion: 'profesional-detalle', id }); }

  await latencia();
  requiereAdministrador();
  const profesional = almacen.profesionales.find((p) => p.id === id);
  if (!profesional) throw new ErrorServicio('no_encontrado', 'No encontramos al profesional.');
  const rep = reputacionSincrona(id);
  const reservas = almacen.reservas.filter((r) => r.profesionalId === id);
  const reservasPorEstado: Partial<Record<EstadoReserva, number>> = {};
  for (const r of reservas) reservasPorEstado[r.estado] = (reservasPorEstado[r.estado] ?? 0) + 1;
  const privado = almacen.perfilesProfesionales.find((p) => p.profesionalId === id) ?? null;
  return clonar({
    profesional,
    privado,
    estadoValidacion: privado?.estadoValidacion ?? null,
    emailCuenta: almacen.cuentas.find((c) => c.profesionalId === id)?.email ?? null,
    servicios: almacen.servicios.filter((s) => s.profesionalId === id).sort((a, b) => a.titulo.localeCompare(b.titulo)),
    totalEvaluaciones: rep.totalHistoricas,
    esNuevo: rep.esNuevo,
    reservasActivas: reservas.filter((r) => ['SOLICITADA', 'CONFIRMADA', 'EN_CURSO', 'REAGENDADA'].includes(r.estado)).length,
    reservasPorEstado,
    montoFinalizado: reservas.filter((r) => r.estado === 'ENTREGADA' || r.estado === 'EVALUADA').reduce((t, r) => t + r.precio, 0),
  });
}

/**
 * Responde una solicitud de revisión de servicio.
 * Backend: POST /api/admin/?accion=resolver-revision&id={servicioId}  { decision, comentario? } → Servicio
 */
export async function resolverRevisionServicio(servicioId: string, decision: 'aprobar' | 'observar', comentario?: string): Promise<Servicio> {
  const texto = comentario?.trim() ?? '';
  if (decision === 'observar' && texto.length < 10) {
    throw new ErrorServicio('validacion', 'Explica al profesional qué debe corregir (al menos 10 caracteres).');
  }
  if (USE_API) {
    requiereAdministrador();
    return api.post<Servicio>(`/admin/?accion=resolver-revision&id=${encodeURIComponent(servicioId)}`, { decision, comentario: texto });
  }

  await latencia();
  requiereAdministrador();
  const servicio = almacen.servicios.find((s) => s.id === servicioId);
  if (!servicio?.revision) throw new ErrorServicio('no_encontrado', 'Este servicio no tiene solicitudes de revisión.');
  if (servicio.revision.estado !== 'pendiente') throw new ErrorServicio('conflicto', 'Esa solicitud ya fue revisada.');
  servicio.revision = {
    ...servicio.revision,
    estado: decision === 'aprobar' ? 'aprobada' : 'observada',
    resueltaEn: new Date().toISOString(),
    comentarioAdmin: texto || null,
    revisadoPor: sesionActual()?.usuario.nombre ?? 'Equipo Skilly',
  };
  persistir();
  return clonar(servicio);
}

/**
 * Aprueba o rechaza un documento de respaldo.
 * Backend: POST /api/admin/?accion=documento-estado&id={documentoId}  { estado } → PerfilPrivadoProfesional
 */
export async function cambiarEstadoDocumentoAdmin(
  documentoId: string,
  estado: Extract<DocumentoRespaldo['estado'], 'aprobado' | 'rechazado'>,
): Promise<PerfilPrivadoProfesional> {
  if (USE_API) {
    requiereAdministrador();
    return api.post<PerfilPrivadoProfesional>(`/admin/?accion=documento-estado&id=${encodeURIComponent(documentoId)}`, { estado });
  }
  await latencia();
  requiereAdministrador();
  const privado = almacen.perfilesProfesionales.find((p) => p.documentos.some((d) => d.id === documentoId));
  const documento = privado?.documentos.find((d) => d.id === documentoId);
  if (!privado || !documento) throw new ErrorServicio('no_encontrado', 'No encontramos ese documento.');
  documento.estado = estado;
  persistir();
  return clonar(privado);
}

/**
 * Valida el perfil de un profesional ("Validado por Skilly") o lo devuelve con observaciones.
 * Backend: POST /api/admin/?accion=validar-profesional&id={profesionalId}  { decision, comentario? }
 */
export async function resolverValidacionProfesional(
  profesionalId: string,
  decision: 'validar' | 'devolver',
  comentario?: string,
): Promise<{ profesional: Profesional; privado: PerfilPrivadoProfesional }> {
  const texto = comentario?.trim() ?? '';
  if (decision === 'devolver' && texto.length < 10) {
    throw new ErrorServicio('validacion', 'Explica al profesional qué debe completar o corregir (al menos 10 caracteres).');
  }
  if (USE_API) {
    requiereAdministrador();
    return api.post(`/admin/?accion=validar-profesional&id=${encodeURIComponent(profesionalId)}`, { decision, comentario: texto });
  }
  await latencia();
  requiereAdministrador();
  const profesional = almacen.profesionales.find((p) => p.id === profesionalId);
  const privado = almacen.perfilesProfesionales.find((p) => p.profesionalId === profesionalId);
  if (!profesional || !privado) throw new ErrorServicio('no_encontrado', 'No encontramos al profesional.');
  if (decision === 'validar') {
    if (!privado.documentos.some((d) => d.estado === 'aprobado')) {
      throw new ErrorServicio('validacion', 'Aprueba al menos un documento de respaldo antes de validar el perfil.');
    }
    privado.estadoValidacion = 'validado';
    privado.validadoEn = new Date().toISOString();
    privado.comentarioValidacion = texto || null;
    profesional.validadoPorSkilly = true;
  } else {
    privado.estadoValidacion = 'perfil_incompleto';
    privado.validadoEn = undefined;
    privado.comentarioValidacion = texto;
    profesional.validadoPorSkilly = false;
  }
  persistir();
  return clonar({ profesional, privado });
}

export async function listarServiciosAdmin(): Promise<Servicio[]> {
  if (USE_API) { requiereAdministrador(); return api.get<Servicio[]>('/admin/', { accion: 'servicios' }); }

  await latencia();
  requiereAdministrador();
  return clonar(almacen.servicios);
}

export async function listarOrganizacionesAdmin(): Promise<Organizacion[]> {
  if (USE_API) { requiereAdministrador(); return api.get<Organizacion[]>('/admin/', { accion: 'organizaciones' }); }

  await latencia();
  requiereAdministrador();
  return clonar(almacen.organizaciones);
}

export async function listarComentariosEnRevision(): Promise<ComentarioEnRevision[]> {
  if (USE_API) { requiereAdministrador(); return api.get<ComentarioEnRevision[]>('/evaluaciones/', { accion: 'moderacion' }); }

  await latencia();
  requiereAdministrador();
  return almacen.evaluaciones
    .filter((e) => e.estadoComentario === 'en_revision')
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((evaluacion) => ({
      evaluacion: clonar(evaluacion),
      organizacion: nombreOrganizacion(evaluacion.organizacionId),
      profesional: nombreProfesional(evaluacion.profesionalId),
    }));
}

export async function moderarComentario(evaluacionId: string, decision: 'aprobar' | 'rechazar'): Promise<Evaluacion> {
  if (USE_API) { requiereAdministrador(); return api.post<Evaluacion>(`/evaluaciones/?accion=moderar&id=${encodeURIComponent(evaluacionId)}`, { decision }); }

  await latencia();
  requiereAdministrador();
  const evaluacion = almacen.evaluaciones.find((e) => e.id === evaluacionId);
  if (!evaluacion) throw new ErrorServicio('no_encontrado', 'No encontramos esa evaluación.');
  if (evaluacion.estadoComentario !== 'en_revision') {
    throw new ErrorServicio('conflicto', 'Ese comentario ya fue revisado.');
  }
  evaluacion.estadoComentario = decision === 'aprobar' ? 'aprobado' : 'rechazado';
  persistir();
  return clonar(evaluacion);
}

/** Operaciones destructivas reservadas exclusivamente a cuentas fundadoras. */
export async function eliminarOrganizacionFundador(id: string): Promise<void> {
  if (USE_API) { requiereFundador(); await api.delete('/admin/', { accion: 'organizacion', id }); return; }

  await latencia();
  requiereFundador();
  const orgIndex = almacen.organizaciones.findIndex((o) => o.id === id);
  if (orgIndex < 0) throw new ErrorServicio('no_encontrado', 'No encontramos la organización.');
  almacen.organizaciones.splice(orgIndex, 1);
  for (let i = almacen.cuentas.length - 1; i >= 0; i--) { const cuenta = almacen.cuentas[i]; if (cuenta?.organizacionId === id) almacen.cuentas.splice(i, 1); }
  for (let i = almacen.favoritos[id]?.length ?? 0; i >= 0; i--) { /* la clave se elimina abajo */ }
  delete almacen.favoritos[id];
  for (let i = almacen.reservas.length - 1; i >= 0; i--) { const reserva = almacen.reservas[i]; if (reserva?.organizacionId === id) almacen.reservas.splice(i, 1); }
  for (let i = almacen.evaluaciones.length - 1; i >= 0; i--) { const evaluacion = almacen.evaluaciones[i]; if (evaluacion?.organizacionId === id) almacen.evaluaciones.splice(i, 1); }
  persistir();
}

export async function eliminarProfesionalFundador(id: string): Promise<void> {
  if (USE_API) { requiereFundador(); await api.delete('/admin/', { accion: 'profesional', id }); return; }

  await latencia();
  requiereFundador();
  const indice = almacen.profesionales.findIndex((p) => p.id === id);
  if (indice < 0) throw new ErrorServicio('no_encontrado', 'No encontramos al profesional.');
  almacen.profesionales.splice(indice, 1);
  for (let i = almacen.cuentas.length - 1; i >= 0; i--) { const cuenta = almacen.cuentas[i]; if (cuenta?.profesionalId === id) almacen.cuentas.splice(i, 1); }
  for (let i = almacen.perfilesProfesionales.length - 1; i >= 0; i--) { const perfil = almacen.perfilesProfesionales[i]; if (perfil?.profesionalId === id) almacen.perfilesProfesionales.splice(i, 1); }
  for (let i = almacen.servicios.length - 1; i >= 0; i--) { const servicio = almacen.servicios[i]; if (servicio?.profesionalId === id) almacen.servicios.splice(i, 1); }
  for (let i = almacen.disponibilidad.length - 1; i >= 0; i--) { const bloque = almacen.disponibilidad[i]; if (bloque?.profesionalId === id) almacen.disponibilidad.splice(i, 1); }
  for (let i = almacen.reservas.length - 1; i >= 0; i--) { const reserva = almacen.reservas[i]; if (reserva?.profesionalId === id) almacen.reservas.splice(i, 1); }
  for (let i = almacen.evaluaciones.length - 1; i >= 0; i--) { const evaluacion = almacen.evaluaciones[i]; if (evaluacion?.profesionalId === id) almacen.evaluaciones.splice(i, 1); }
  persistir();
}

// Las contrataciones no se eliminan (T-02/A-11): la API responde 409 y la interfaz ya no
// ofrece esa acción. Se cierran cancelándolas o rechazándolas y quedan en el historial.

export async function eliminarServicioFundador(id: string): Promise<void> {
  if (USE_API) { requiereFundador(); await api.delete('/admin/', { accion: 'servicio', id }); return; }

  await latencia();
  requiereFundador();
  const indice = almacen.servicios.findIndex((s) => s.id === id);
  if (indice < 0) throw new ErrorServicio('no_encontrado', 'No encontramos el servicio.');
  almacen.servicios.splice(indice, 1);
  for (let i = almacen.reservas.length - 1; i >= 0; i--) { const reserva = almacen.reservas[i]; if (reserva?.servicioId === id) almacen.reservas.splice(i, 1); }
  for (let i = almacen.retenciones.length - 1; i >= 0; i--) { const retencion = almacen.retenciones[i]; if (retencion?.servicioId === id) almacen.retenciones.splice(i, 1); }
  persistir();
}

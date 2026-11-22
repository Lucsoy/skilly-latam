/**
 * Tipos de dominio de Skilly.
 *
 * Estos tipos reflejan la forma que tendrán los recursos de la API REST de
 * Django. Cuando se conecte el backend, los serializers deben producir
 * exactamente estas estructuras (fechas en ISO 8601 con zona horaria).
 */

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export type Modalidad = 'remoto' | 'presencial' | 'hibrido';

export interface Subcategoria {
  id: string;
  categoriaId: string;
  nombre: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion: string;
  subcategorias: Subcategoria[];
}

/** Insignias de validación que Skilly otorga a un profesional. */
export type Insignia =
  | 'identidad_verificada'
  | 'titulo_verificado'
  | 'entrevista_skilly'
  | 'referencias_verificadas';

export interface ExperienciaLaboral {
  cargo: string;
  organizacion: string;
  periodo: string;
}

export interface Profesional {
  id: string;
  nombre: string;
  apellido: string;
  /** Título profesional o rol con el que se presenta. */
  titulo: string;
  ciudad: string;
  presentacion: string;
  formacion: string[];
  experiencia: ExperienciaLaboral[];
  habilidades: string[];
  linkedin?: string;
  portafolio?: string;
  validadoPorSkilly: boolean;
  insignias: Insignia[];
  /** Fecha ISO en que se incorporó a Skilly. */
  fechaIngreso: string;
}

// ---------------------------------------------------------------------------
// Datos privados del profesional (nunca se entregan a organizaciones)
// ---------------------------------------------------------------------------

/**
 * - perfil_incompleto: creó su cuenta (etapa 1) pero no ha completado el perfil.
 * - en_revision: completó el perfil y Skilly está revisando sus antecedentes.
 * - validado: Skilly revisó currículum, credenciales, LinkedIn y lo entrevistó.
 */
export type EstadoValidacion = 'perfil_incompleto' | 'en_revision' | 'validado';

export type TipoDocumento = 'curriculum' | 'certificado' | 'titulo';

export interface DocumentoRespaldo {
  id: string;
  tipo: TipoDocumento;
  nombreArchivo: string;
  tamanoBytes: number;
  subidoEn: string;
  estado: 'pendiente_revision' | 'aprobado' | 'rechazado';
  /** true si el archivo real está guardado en el servidor y se puede descargar. */
  tieneArchivo?: boolean;
}

/**
 * Lo que solo ven el propio profesional y el equipo de Skilly. Vive separado de
 * `Profesional` (ficha pública) para que ningún endpoint del catálogo pueda
 * filtrarlo por error.
 */
export interface PerfilPrivadoProfesional {
  profesionalId: string;
  email: string;
  /** Id de la categoría del árbol de Skilly. */
  areaPrincipal: string;
  estadoValidacion: EstadoValidacion;
  validadoEn?: string;
  documentos: DocumentoRespaldo[];
  /** Observación del equipo de Skilly al validar o devolver el perfil. */
  comentarioValidacion?: string | null;
  consentimiento: ConsentimientoDatos;
}

export interface Servicio {
  id: string;
  profesionalId: string;
  categoriaId: string;
  subcategoriaId: string;
  titulo: string;
  descripcion: string;
  entregables: string[];
  /** Texto libre, ej. "2 a 3 semanas". */
  duracionEstimada: string;
  /** Duración de cada sesión agendable, en minutos. */
  duracionSesionMinutos: number;
  modalidades: Modalidad[];
  /** Precio en pesos chilenos, sin comisión de plataforma. */
  precio: number;
  /** Palabras clave que ayudan a la búsqueda por necesidad. */
  etiquetas: string[];
  /** Si es false, el servicio queda guardado como borrador/pausado y no aparece en el catálogo. */
  publicado?: boolean;
  /** Última solicitud de revisión que el profesional envió a Skilly para este servicio. */
  revision?: RevisionServicio | null;
}

/**
 * Ciclo de revisión de un servicio:
 * - pendiente: el profesional la solicitó y espera respuesta del equipo de Skilly.
 * - aprobada: un administrador revisó el servicio y lo dio por bueno.
 * - observada: un administrador dejó observaciones que el profesional debe corregir.
 */
export type EstadoRevisionServicio = 'pendiente' | 'aprobada' | 'observada';

export interface RevisionServicio {
  id: string;
  estado: EstadoRevisionServicio;
  /** Mensaje opcional del profesional al pedir la revisión. */
  mensaje?: string | null;
  solicitadaEn: string;
  resueltaEn?: string | null;
  /** Comentario del administrador al aprobar u observar. */
  comentarioAdmin?: string | null;
  revisadoPor?: string | null;
}

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------

export interface BloqueDisponible {
  id: string;
  profesionalId: string;
  /** ISO 8601 con zona horaria. */
  inicio: string;
  fin: string;
}

/** Retención temporal de un bloque mientras la organización completa el flujo. */
export interface RetencionBloque {
  id: string;
  bloqueId: string;
  servicioId: string;
  organizacionId: string;
  /** ISO 8601. Al superarse, el bloque vuelve a estar disponible. */
  expiraEn: string;
}

// ---------------------------------------------------------------------------
// Reserva y trazabilidad
// ---------------------------------------------------------------------------

export type EstadoReserva =
  | 'SOLICITADA'
  | 'APROBADA_ADMIN'
  | 'PENDIENTE_PAGO'
  | 'CONFIRMADA'
  | 'EN_CURSO'
  | 'ENTREGADA'
  | 'EVALUADA'
  | 'RECHAZADA'
  | 'CANCELADA'
  | 'REAGENDADA';

export type TipoActor = 'organizacion' | 'profesional' | 'skilly' | 'sistema';

export interface Actor {
  tipo: TipoActor;
  nombre: string;
}

export interface EventoHistorial {
  id: string;
  fecha: string;
  actor: Actor;
  estadoAnterior: EstadoReserva | null;
  estadoNuevo: EstadoReserva;
  motivo?: string;
  /** Detalle adicional, ej. monto retenido en una cancelación. */
  detalle?: string;
}

/** sin_cobro: cancelada antes de pagar, no hubo cobro ni reembolso (A-12). */
export type EstadoPago = 'pendiente_confirmacion' | 'confirmado' | 'reembolsado' | 'retenido_parcial' | 'sin_cobro';

export interface AceptacionCondiciones {
  fecha: string;
  usuario: string;
  /** Versión del texto de condiciones aceptado. */
  version: string;
}

export interface Reserva {
  id: string;
  /** Código corto legible, ej. SK-2026-0041. */
  codigo: string;
  organizacionId: string;
  profesionalId: string;
  servicioId: string;
  inicio: string;
  fin: string;
  modalidad: Modalidad;
  mensaje?: string;
  precio: number;
  comisionPorcentaje: number;
  comision: number;
  total: number;
  estado: EstadoReserva;
  estadoPago: EstadoPago;
  conformidadConfirmada: boolean;
  conformidadFecha?: string;
  aceptacionCondiciones?: AceptacionCondiciones;
  /** Nueva fecha propuesta cuando hay una solicitud de reagendamiento pendiente. */
  reagendamientoPropuesto?: { inicio: string; fin: string; solicitadoEn: string };
  creadaEn: string;
  historial: EventoHistorial[];
  /** Datos de gestión interna de la solicitud antes de la contratación. */
  administradorAsignadoId?: string;
  administradorAsignadoNombre?: string;
  administradorDecidioEn?: string;
  profesionalDecidioEn?: string;
  pagoConfirmadoEn?: string;
}


// ---------------------------------------------------------------------------
// Organización
// ---------------------------------------------------------------------------

export type TamanoOrganizacion = '1-10' | '11-50' | '51-200' | '201-500' | '500+';

export interface ConsentimientoDatos {
  aceptado: boolean;
  fecha: string;
  version: string;
}

export interface Organizacion {
  id: string;
  razonSocial: string;
  rut: string;
  giro: string;
  tamano: TamanoOrganizacion;
  nombreContacto: string;
  emailContacto: string;
  telefono?: string;
  sitioWeb?: string;
  descripcion?: string;
  direccion?: string;
  consentimiento: ConsentimientoDatos;
  creadaEn: string;
}

// ---------------------------------------------------------------------------
// Reputación (sin estrellas, sin promedio global)
// ---------------------------------------------------------------------------

/** 4 = superó lo esperado, 3 = cumplió, 2 = cumplió parcialmente, 1 = no cumplió. */
export type NivelEvaluacion = 1 | 2 | 3 | 4;

export type DimensionEvaluacion = 'calidad' | 'plazos' | 'comunicacion';

export interface Evaluacion {
  id: string;
  reservaId: string;
  profesionalId: string;
  organizacionId: string;
  autor: 'organizacion' | 'profesional';
  calidad: NivelEvaluacion;
  plazos: NivelEvaluacion;
  comunicacion: NivelEvaluacion;
  comentario?: string;
  fecha: string;
  publicada: boolean;
  /** Los comentarios pasan por revisión de Skilly antes de mostrarse. */
  estadoComentario: 'sin_comentario' | 'en_revision' | 'aprobado' | 'rechazado';
}

/** Distribución de respuestas para una dimensión, dentro de la ventana móvil. */
export interface ResumenDimension {
  dimension: DimensionEvaluacion;
  conteo: Record<NivelEvaluacion, number>;
  total: number;
  /** Nivel más frecuente. */
  nivelPredominante: NivelEvaluacion;
  /** Cantidad de evaluaciones con nivel 3 o 4. */
  cumplioOSupero: number;
}

export interface Reputacion {
  profesionalId: string;
  /** Evaluaciones publicadas consideradas en la ventana móvil. */
  totalConsideradas: number;
  /** Evaluaciones publicadas históricas. */
  totalHistoricas: number;
  /** true si aún no alcanza el umbral mínimo para mostrar indicadores. */
  esNuevo: boolean;
  dimensiones: ResumenDimension[] | null;
  comentariosPublicos: Array<{ comentario: string; fecha: string; organizacion: string }>;
}

// ---------------------------------------------------------------------------
// Configuración de plataforma
// ---------------------------------------------------------------------------

export interface TramoCancelacion {
  /** Antelación mínima en horas para que aplique este tramo. */
  desdeHoras: number;
  /** Porcentaje del precio que se retiene (0 a 100). */
  retencionPorcentaje: number;
  etiqueta: string;
}

export interface ConfiguracionPlataforma {
  /** Porcentaje de comisión de plataforma sobre el precio del servicio. */
  comisionPorcentaje: number;
  /** Parte de la comisión que se descuenta al profesional sobre el monto bruto. */
  comisionProfesionalPorcentaje: number;
  /** Parte de la comisión que paga la organización sobre el monto bruto. */
  comisionOrganizacionPorcentaje: number;
  /** Tramos ordenados de mayor a menor antelación. */
  politicaCancelacion: TramoCancelacion[];
  retencionBloqueMinutos: number;
  reputacion: {
    minimoEvaluaciones: number;
    ventanaMaxEvaluaciones: number;
    ventanaMeses: number;
    diasPublicacionAutomatica: number;
    maxCaracteresComentario: number;
  };
  versionCondiciones: string;
  versionPoliticaDatos: string;
}

// ---------------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------------

export type Rol = 'organizacion' | 'profesional' | 'administrador' | 'fundador';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  /** true mientras la cuenta use la contraseña inicial de instalación. */
  debeCambiarContrasena?: boolean;
}

export interface Sesion {
  token: string;
  usuario: Usuario;
  /** Solo presente cuando el rol es 'organizacion'. */
  organizacion: Organizacion | null;
  /** Solo presente cuando el rol es 'profesional'. Ficha pública. */
  profesional: Profesional | null;
}

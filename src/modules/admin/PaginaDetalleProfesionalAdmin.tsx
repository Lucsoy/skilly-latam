import { useState, type ReactNode } from 'react';
import { hrefSeguro } from '@/lib/enlaces';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Briefcase, CheckCircle2, ExternalLink, FileText, GraduationCap, Layers, MessageSquareWarning, UserRound } from 'lucide-react';
import type { DocumentoRespaldo, EstadoReserva, Servicio } from '@/types';
import { cambiarEstadoDocumentoAdmin, obtenerDetalleProfesionalAdmin, resolverRevisionServicio, resolverValidacionProfesional } from '@/services/admin';
import { abrirDocumento } from '@/services/panelProfesional';
import { listarCategorias } from '@/services/catalogo';
import { mensajeParaUsuario } from '@/services/errores';
import { useRecurso } from '@/lib/useRecurso';
import { ETIQUETA_MODALIDAD, formatearCLP, formatearFechaCorta, formatearFechaHora } from '@/lib/formato';
import { ETIQUETA_ESTADO } from '@/modules/agenda/estadoReserva';
import { AREAS_PROFESIONAL, ETIQUETA_VALIDACION } from '@/modules/profesional/constantes';
import { ETIQUETA_INSIGNIA } from '@/components/reputacion/BloqueReputacion';
import { Alerta, Avatar, Boton, CampoTextarea, Esqueleto, EstadoError, Insignia, Tarjeta } from '@/components/ui';

const ETIQUETA_DOCUMENTO: Record<DocumentoRespaldo['tipo'], string> = {
  curriculum: 'Currículum',
  titulo: 'Título profesional',
  certificado: 'Certificado / respaldo',
};

const ETIQUETA_ESTADO_DOCUMENTO: Record<DocumentoRespaldo['estado'], string> = {
  pendiente_revision: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

function formatearBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Seccion({ titulo, icono, children, accion }: { titulo: string; icono: ReactNode; children: ReactNode; accion?: ReactNode }) {
  return (
    <Tarjeta className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <span className="text-primario-700">{icono}</span>
          {titulo}
        </h2>
        {accion}
      </div>
      {children}
    </Tarjeta>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-tinta-tenue">{etiqueta}</dt>
      <dd className="mt-0.5 break-words text-sm">{children || <span className="text-tinta-tenue">—</span>}</dd>
    </div>
  );
}

function EnlaceExterno({ url }: { url?: string | null }) {
  const href = hrefSeguro(url);
  if (!url || !href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="break-all text-primario-700 underline-offset-2 hover:underline">
      {url}
    </a>
  );
}

export function PaginaDetalleProfesionalAdmin() {
  const { id = '' } = useParams();
  const detalle = useRecurso(() => obtenerDetalleProfesionalAdmin(id), [id]);
  const categorias = useRecurso(listarCategorias, []);
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [procesando, setProcesando] = useState<string | null>(null);
  const [errorRevision, setErrorRevision] = useState<{ servicioId: string; mensaje: string } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [comentarioValidacion, setComentarioValidacion] = useState('');
  const [procesandoPerfil, setProcesandoPerfil] = useState<string | null>(null);
  const [mensajePerfil, setMensajePerfil] = useState<{ tono: 'exito' | 'peligro'; texto: string } | null>(null);

  if (detalle.error) return <EstadoError mensaje={detalle.error} reintentar={detalle.recargar} />;
  if (detalle.cargando || !detalle.datos) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <Esqueleto className="h-32 w-full rounded-2xl" />
        <Esqueleto className="h-48 w-full rounded-2xl" />
        <Esqueleto className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const d = detalle.datos;
  const p = d.profesional;
  const privado = d.privado;
  const area = AREAS_PROFESIONAL.find((a) => a.valor === privado?.areaPrincipal)?.etiqueta ?? privado?.areaPrincipal;
  const pendientes = d.servicios.filter((s) => s.revision?.estado === 'pendiente').length;
  const estadosReserva = Object.entries(d.reservasPorEstado) as Array<[EstadoReserva, number]>;
  const totalReservas = estadosReserva.reduce((t, [, n]) => t + n, 0);

  const nombreCategoria = (s: Servicio) => {
    const c = categorias.datos?.find((x) => x.id === s.categoriaId);
    const sub = c?.subcategorias.find((x) => x.id === s.subcategoriaId);
    return [c?.nombre ?? s.categoriaId, sub?.nombre ?? s.subcategoriaId].join(' · ');
  };

  const resolver = async (servicio: Servicio, decision: 'aprobar' | 'observar') => {
    setErrorRevision(null);
    setAviso(null);
    setProcesando(servicio.id);
    try {
      const actualizado = await resolverRevisionServicio(servicio.id, decision, comentarios[servicio.id]);
      detalle.establecer({
        ...d,
        servicios: d.servicios.map((s) => (s.id === actualizado.id ? { ...s, revision: actualizado.revision } : s)),
      });
      setComentarios((c) => ({ ...c, [servicio.id]: '' }));
      setAviso(decision === 'aprobar' ? `Aprobaste la revisión de "${servicio.titulo}".` : `Enviaste observaciones sobre "${servicio.titulo}" al profesional.`);
    } catch (e) {
      setErrorRevision({ servicioId: servicio.id, mensaje: mensajeParaUsuario(e) });
    } finally {
      setProcesando(null);
    }
  };

  const verDocumento = async (documentoId: string) => {
    setMensajePerfil(null);
    try {
      await abrirDocumento(documentoId);
    } catch (e) {
      setMensajePerfil({ tono: 'peligro', texto: mensajeParaUsuario(e) });
    }
  };

  const decidirDocumento = async (documentoId: string, estado: 'aprobado' | 'rechazado') => {
    setMensajePerfil(null);
    setProcesandoPerfil(documentoId);
    try {
      const nuevoPrivado = await cambiarEstadoDocumentoAdmin(documentoId, estado);
      detalle.establecer({ ...d, privado: nuevoPrivado });
    } catch (e) {
      setMensajePerfil({ tono: 'peligro', texto: mensajeParaUsuario(e) });
    } finally {
      setProcesandoPerfil(null);
    }
  };

  const decidirValidacion = async (decision: 'validar' | 'devolver') => {
    setMensajePerfil(null);
    setProcesandoPerfil(decision);
    try {
      const r = await resolverValidacionProfesional(p.id, decision, comentarioValidacion);
      detalle.establecer({ ...d, profesional: r.profesional, privado: r.privado, estadoValidacion: r.privado.estadoValidacion });
      setComentarioValidacion('');
      setMensajePerfil({
        tono: 'exito',
        texto: decision === 'validar' ? 'Perfil validado. Ya puede publicar sus servicios.' : 'Perfil devuelto con tus observaciones.',
      });
    } catch (e) {
      setMensajePerfil({ tono: 'peligro', texto: mensajeParaUsuario(e) });
    } finally {
      setProcesandoPerfil(null);
    }
  };

  const documentosAprobados = privado?.documentos.filter((doc) => doc.estado === 'aprobado').length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <Link to="/admin/profesionales" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primario-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a profesionales
      </Link>

      {/* Cabecera */}
      <Tarjeta className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar nombre={p.nombre} apellido={p.apellido} tamano="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{p.nombre} {p.apellido}</h1>
          <p className="text-sm text-tinta-suave">{p.titulo || 'Sin cargo informado'}</p>
          <p className="text-xs text-tinta-tenue">{p.ciudad || 'Sin ciudad'} · ingresó el {formatearFechaCorta(p.fechaIngreso)} · ID {p.id}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {!privado && (p.validadoPorSkilly ? <Insignia tono="exito">Validado</Insignia> : <Insignia tono="aviso">Sin validar</Insignia>)}
            {privado && <Insignia tono={privado.estadoValidacion === 'validado' ? 'exito' : privado.estadoValidacion === 'en_revision' ? 'aviso' : 'neutro'}>{ETIQUETA_VALIDACION[privado.estadoValidacion]}</Insignia>}
            {d.esNuevo && <Insignia tono="primario">Profesional nuevo</Insignia>}
            {pendientes > 0 && <Insignia tono="info">{pendientes === 1 ? '1 revisión pendiente' : `${pendientes} revisiones pendientes`}</Insignia>}
            {p.insignias.map((i) => <Insignia key={i} tono="neutro">{ETIQUETA_INSIGNIA[i]}</Insignia>)}
          </div>
        </div>
      </Tarjeta>

      {mensajePerfil && (
        <Alerta tono={mensajePerfil.tono} accion={<Boton variante="fantasma" tamano="sm" onClick={() => setMensajePerfil(null)}>Cerrar</Boton>}>
          {mensajePerfil.texto}
        </Alerta>
      )}

      {/* Validación del perfil */}
      {privado && (
        <Seccion titulo="Validación del perfil" icono={<BadgeCheck className="h-5 w-5" />}>
          {privado.estadoValidacion === 'validado' ? (
            <p className="text-sm">
              Perfil <strong>validado por Skilly</strong>{privado.validadoEn ? ` el ${formatearFechaCorta(privado.validadoEn)}` : ''}.
              {privado.comentarioValidacion && <span className="mt-1 block text-tinta-suave">“{privado.comentarioValidacion}”</span>}
            </p>
          ) : (
            <>
              <p className="text-sm text-tinta-suave">
                {privado.estadoValidacion === 'en_revision'
                  ? 'El profesional envió su perfil a revisión. Revisa sus antecedentes y documentos.'
                  : 'El perfil todavía está incompleto, pero puedes revisarlo igual.'}{' '}
                Para validarlo debe tener al menos un documento aprobado (tiene {documentosAprobados}).
              </p>
              {privado.comentarioValidacion && (
                <p className="text-sm">Última observación enviada: <span className="text-tinta-suave">“{privado.comentarioValidacion}”</span></p>
              )}
              <CampoTextarea
                etiqueta="Comentario para el profesional"
                nota="Obligatorio si lo devuelves"
                value={comentarioValidacion}
                valorActual={comentarioValidacion}
                maximo={500}
                onChange={(e) => setComentarioValidacion(e.target.value)}
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Boton variante="secundario" tamano="sm" cargando={procesandoPerfil === 'devolver'} onClick={() => void decidirValidacion('devolver')}>
                  Devolver con observaciones
                </Boton>
                <Boton tamano="sm" cargando={procesandoPerfil === 'validar'} disabled={documentosAprobados === 0} onClick={() => void decidirValidacion('validar')} icono={<BadgeCheck className="h-4 w-4" />}>
                  Validar perfil
                </Boton>
              </div>
            </>
          )}
        </Seccion>
      )}

      {/* Actividad */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { etiqueta: 'Servicios', valor: d.servicios.length },
          { etiqueta: 'Evaluaciones', valor: d.totalEvaluaciones },
          { etiqueta: 'Reservas activas', valor: d.reservasActivas },
          { etiqueta: 'Trabajos entregados', valor: formatearCLP(d.montoFinalizado) },
        ].map((c) => (
          <Tarjeta key={c.etiqueta} relleno="sm">
            <dt className="text-xs text-tinta-tenue">{c.etiqueta}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{c.valor}</dd>
          </Tarjeta>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Seccion titulo="Cuenta y datos privados" icono={<UserRound className="h-5 w-5" />}>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Dato etiqueta="Correo de la cuenta">{d.emailCuenta}</Dato>
            <Dato etiqueta="Correo del perfil">{privado?.email}</Dato>
            <Dato etiqueta="Área principal">{area}</Dato>
            <Dato etiqueta="Validación">{privado ? ETIQUETA_VALIDACION[privado.estadoValidacion] : null}{privado?.validadoEn ? ` · ${formatearFechaCorta(privado.validadoEn)}` : ''}</Dato>
            <Dato etiqueta="LinkedIn"><EnlaceExterno url={p.linkedin} /></Dato>
            <Dato etiqueta="Portafolio"><EnlaceExterno url={p.portafolio} /></Dato>
            <Dato etiqueta="Consentimiento de datos">
              {privado?.consentimiento.aceptado
                ? `Aceptado${privado.consentimiento.fecha ? ` el ${formatearFechaCorta(privado.consentimiento.fecha)}` : ''} (v. ${privado.consentimiento.version})`
                : privado ? 'No aceptado' : null}
            </Dato>
          </dl>
        </Seccion>

        <Seccion titulo="Documentos de respaldo" icono={<FileText className="h-5 w-5" />}>
          {privado?.documentos.length ? (
            <ul className="flex flex-col gap-2">
              {privado.documentos.map((doc) => (
                <li key={doc.id} className="flex flex-col gap-2 rounded-xl border border-borde px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{doc.nombreArchivo}</p>
                      <p className="text-xs text-tinta-tenue">{ETIQUETA_DOCUMENTO[doc.tipo]} · {formatearBytes(doc.tamanoBytes)} · {formatearFechaCorta(doc.subidoEn)}</p>
                    </div>
                    <Insignia tono={doc.estado === 'aprobado' ? 'exito' : doc.estado === 'rechazado' ? 'peligro' : 'aviso'}>{ETIQUETA_ESTADO_DOCUMENTO[doc.estado]}</Insignia>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {doc.tieneArchivo && (
                      <Boton variante="fantasma" tamano="sm" onClick={() => void verDocumento(doc.id)} icono={<ExternalLink className="h-4 w-4" />}>Ver archivo</Boton>
                    )}
                    {doc.estado !== 'aprobado' && (
                      <Boton variante="secundario" tamano="sm" cargando={procesandoPerfil === doc.id} onClick={() => void decidirDocumento(doc.id, 'aprobado')}>Aprobar</Boton>
                    )}
                    {doc.estado !== 'rechazado' && (
                      <Boton variante="fantasma" tamano="sm" cargando={procesandoPerfil === doc.id} onClick={() => void decidirDocumento(doc.id, 'rechazado')}>Rechazar</Boton>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-tinta-tenue">El profesional no ha subido documentos.</p>
          )}
        </Seccion>
      </div>

      <Seccion titulo="Perfil profesional" icono={<GraduationCap className="h-5 w-5" />}>
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-tinta-tenue">Presentación</h3>
          <p className="mt-1 whitespace-pre-line text-sm">{p.presentacion || <span className="text-tinta-tenue">Sin presentación.</span>}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-tinta-tenue">Formación</h3>
            {p.formacion.length ? <ul className="mt-1 list-disc pl-5 text-sm">{p.formacion.map((f) => <li key={f}>{f}</li>)}</ul> : <p className="mt-1 text-sm text-tinta-tenue">Sin información.</p>}
          </div>
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-tinta-tenue">Experiencia</h3>
            {p.experiencia.length ? (
              <ul className="mt-1 flex flex-col gap-2 text-sm">
                {p.experiencia.map((e, i) => (
                  <li key={`${e.cargo}-${i}`}>
                    <p className="font-medium">{e.cargo}</p>
                    <p className="text-xs text-tinta-suave">{e.organizacion}{e.periodo ? ` · ${e.periodo}` : ''}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-1 text-sm text-tinta-tenue">Sin información.</p>}
          </div>
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-tinta-tenue">Habilidades</h3>
            {p.habilidades.length ? (
              <ul className="mt-1 flex flex-wrap gap-1">{p.habilidades.map((h) => <li key={h}><Insignia tono="neutro">{h}</Insignia></li>)}</ul>
            ) : <p className="mt-1 text-sm text-tinta-tenue">Sin información.</p>}
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Reservas" icono={<Briefcase className="h-5 w-5" />}>
        {totalReservas === 0 ? (
          <p className="text-sm text-tinta-tenue">Todavía no tiene reservas.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {estadosReserva.map(([estado, n]) => (
              <li key={estado} className="rounded-full bg-crema px-3 py-1 text-xs">
                {ETIQUETA_ESTADO[estado] ?? estado}: <span className="font-semibold tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      {/* Servicios con su revisión */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Layers className="h-5 w-5 text-primario-700" /> Servicios ({d.servicios.length})
        </h2>
        {aviso && <Alerta tono="exito" accion={<Boton variante="fantasma" tamano="sm" onClick={() => setAviso(null)}>Cerrar</Boton>}>{aviso}</Alerta>}
        {d.servicios.length === 0 ? (
          <Tarjeta><p className="text-sm text-tinta-tenue">Este profesional todavía no ha creado servicios.</p></Tarjeta>
        ) : (
          d.servicios.map((s) => {
            const publicado = s.publicado !== false;
            const rev = s.revision;
            return (
              <Tarjeta key={s.id} className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Insignia tono={publicado ? 'exito' : 'neutro'}>{publicado ? 'Publicado' : 'Pausado'}</Insignia>
                      {rev && <Insignia tono={rev.estado === 'aprobada' ? 'exito' : rev.estado === 'observada' ? 'aviso' : 'info'}>{rev.estado === 'aprobada' ? 'Revisión aprobada' : rev.estado === 'observada' ? 'Con observaciones' : 'Revisión pendiente'}</Insignia>}
                      <span className="text-xs text-tinta-tenue">{nombreCategoria(s)}</span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold">{s.titulo}</h3>
                    <p className="mt-1 whitespace-pre-line text-sm text-tinta-suave">{s.descripcion}</p>
                  </div>
                  <p className="shrink-0 text-lg font-semibold">{formatearCLP(s.precio)}</p>
                </div>

                <dl className="grid gap-4 sm:grid-cols-3">
                  <Dato etiqueta="Duración estimada">{s.duracionEstimada}</Dato>
                  <Dato etiqueta="Duración por sesión">{s.duracionSesionMinutos} min</Dato>
                  <Dato etiqueta="Modalidades">{s.modalidades.map((m) => ETIQUETA_MODALIDAD[m]).join(', ')}</Dato>
                </dl>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="text-xs text-tinta-tenue">Entregables</h4>
                    {s.entregables?.length ? <ul className="mt-1 list-disc pl-5 text-sm">{s.entregables.map((e) => <li key={e}>{e}</li>)}</ul> : <p className="mt-1 text-sm text-tinta-tenue">—</p>}
                  </div>
                  <div>
                    <h4 className="text-xs text-tinta-tenue">Etiquetas</h4>
                    {s.etiquetas?.length ? <ul className="mt-1 flex flex-wrap gap-1">{s.etiquetas.map((e) => <li key={e}><Insignia tono="neutro">{e}</Insignia></li>)}</ul> : <p className="mt-1 text-sm text-tinta-tenue">—</p>}
                  </div>
                </div>

                {rev && (
                  <div className="flex flex-col gap-3 rounded-xl border border-borde bg-crema/60 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {rev.estado === 'pendiente' ? <MessageSquareWarning className="h-4 w-4 text-info-600" /> : <CheckCircle2 className="h-4 w-4 text-exito-700" />}
                      Solicitud de revisión · {formatearFechaHora(rev.solicitadaEn)}
                    </div>
                    <p className="text-sm text-tinta-suave">
                      {rev.mensaje ? <>Mensaje del profesional: “{rev.mensaje}”</> : 'El profesional no dejó mensaje.'}
                    </p>

                    {rev.estado === 'pendiente' ? (
                      <>
                        <CampoTextarea
                          etiqueta="Comentario para el profesional"
                          nota="Obligatorio si hay observaciones"
                          value={comentarios[s.id] ?? ''}
                          valorActual={comentarios[s.id] ?? ''}
                          maximo={500}
                          onChange={(e) => setComentarios((c) => ({ ...c, [s.id]: e.target.value }))}
                        />
                        {errorRevision?.servicioId === s.id && <Alerta tono="peligro">{errorRevision.mensaje}</Alerta>}
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                          <Boton variante="secundario" tamano="sm" cargando={procesando === s.id} onClick={() => void resolver(s, 'observar')}>Enviar observaciones</Boton>
                          <Boton tamano="sm" cargando={procesando === s.id} onClick={() => void resolver(s, 'aprobar')}>Aprobar servicio</Boton>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm">
                        <span className="font-medium">{rev.estado === 'aprobada' ? 'Aprobada' : 'Observada'}</span>
                        {' por '}{rev.revisadoPor ?? 'Equipo Skilly'}{rev.resueltaEn ? ` el ${formatearFechaHora(rev.resueltaEn)}` : ''}
                        {rev.comentarioAdmin && <span className="mt-1 block text-tinta-suave">“{rev.comentarioAdmin}”</span>}
                      </p>
                    )}
                  </div>
                )}
              </Tarjeta>
            );
          })
        )}
      </section>
    </div>
  );
}

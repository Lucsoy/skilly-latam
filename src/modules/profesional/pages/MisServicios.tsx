import { useState } from 'react';
import { Edit3, Eye, EyeOff, Plus, SendHorizontal, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { RevisionServicio, Servicio } from '@/types';
import { useRecurso } from '@/lib/useRecurso';
import { cambiarPublicacionServicio, eliminarServicio, listarMisServicios, obtenerMiCuenta, solicitarRevisionServicio } from '@/services/panelProfesional';
import { listarCategorias } from '@/services/catalogo';
import { mensajeParaUsuario } from '@/services/errores';
import { formatearCLP, formatearFechaHora } from '@/lib/formato';
import { Alerta, Boton, BotonEnlace, CampoTextarea, Dialogo, EstadoError, EstadoVacio, Insignia, Tarjeta } from '@/components/ui';

const MAXIMO_MENSAJE = 500;

/** Estado de la última revisión pedida a Skilly, tal como lo ve el profesional. */
function AvisoRevision({ revision }: { revision: RevisionServicio }) {
  if (revision.estado === 'pendiente') {
    return (
      <Alerta tono="info" titulo="Revisión solicitada">
        La enviaste el {formatearFechaHora(revision.solicitadaEn)}. El equipo de Skilly revisará el servicio y te dejará su respuesta acá.
      </Alerta>
    );
  }
  if (revision.estado === 'observada') {
    return (
      <Alerta tono="aviso" titulo="Skilly dejó observaciones">
        <p>{revision.comentarioAdmin}</p>
        <p className="mt-1 text-xs text-tinta-tenue">
          {revision.revisadoPor ?? 'Equipo Skilly'}{revision.resueltaEn ? ` · ${formatearFechaHora(revision.resueltaEn)}` : ''}. Corrige el servicio y vuelve a solicitar la revisión.
        </p>
      </Alerta>
    );
  }
  return (
    <Alerta tono="exito" titulo="Servicio revisado y aprobado por Skilly">
      {revision.comentarioAdmin && <p>{revision.comentarioAdmin}</p>}
      <p className="mt-1 text-xs text-tinta-tenue">
        {revision.revisadoPor ?? 'Equipo Skilly'}{revision.resueltaEn ? ` · ${formatearFechaHora(revision.resueltaEn)}` : ''}
      </p>
    </Alerta>
  );
}

export function MisServicios() {
  const cuenta = useRecurso(obtenerMiCuenta, []);
  const validado = cuenta.datos?.privado.estadoValidacion === 'validado';
  const servicios = useRecurso(listarMisServicios, []);
  const categoriasRecurso = useRecurso(listarCategorias, []);
  const categorias = categoriasRecurso.datos ?? [];
  const navegar = useNavigate();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargandoId, setCargandoId] = useState<string | null>(null);
  const [servicioARevisar, setServicioARevisar] = useState<Servicio | null>(null);
  const [mensajeRevision, setMensajeRevision] = useState('');
  const [errorRevision, setErrorRevision] = useState<string | null>(null);
  const [enviandoRevision, setEnviandoRevision] = useState(false);
  const [servicioAEliminar, setServicioAEliminar] = useState<Servicio | null>(null);

  if (servicios.error) return <EstadoError mensaje={servicios.error} reintentar={servicios.recargar} />;
  if (categoriasRecurso.error) return <EstadoError mensaje={categoriasRecurso.error} reintentar={categoriasRecurso.recargar} />;
  if (servicios.cargando || !servicios.datos || categoriasRecurso.cargando || !categoriasRecurso.datos) return <div className="flex flex-col gap-3"><div className="h-40 animate-pulse rounded-2xl bg-crema"/><div className="h-40 animate-pulse rounded-2xl bg-crema"/></div>;

  const cambiarEstado = async (id: string, publicado: boolean) => {
    setCargandoId(id); setMensaje(null);
    try { await cambiarPublicacionServicio(id, publicado); await servicios.recargar(); setMensaje(publicado ? 'El servicio volvió a estar visible en el catálogo.' : 'El servicio quedó pausado y ya no recibirá nuevas solicitudes.'); }
    catch (e) { setMensaje(mensajeParaUsuario(e)); }
    finally { setCargandoId(null); }
  };

  const eliminar = async () => {
    if (!servicioAEliminar) return;
    const id = servicioAEliminar.id;
    setCargandoId(id); setMensaje(null);
    try { await eliminarServicio(id); await servicios.recargar(); setMensaje('Servicio eliminado.'); }
    catch (e) { setMensaje(mensajeParaUsuario(e)); }
    finally { setCargandoId(null); setServicioAEliminar(null); }
  };

  const abrirRevision = (servicio: Servicio) => {
    setServicioARevisar(servicio);
    setMensajeRevision('');
    setErrorRevision(null);
  };

  const cerrarRevision = () => {
    if (enviandoRevision) return;
    setServicioARevisar(null);
  };

  const enviarRevision = async () => {
    if (!servicioARevisar) return;
    setEnviandoRevision(true); setErrorRevision(null);
    try {
      const actualizado = await solicitarRevisionServicio(servicioARevisar.id, mensajeRevision);
      servicios.establecer((servicios.datos ?? []).map(s => (s.id === actualizado.id ? actualizado : s)));
      setServicioARevisar(null);
      setMensaje(`Enviamos "${actualizado.titulo}" a revisión. Te avisaremos acá cuando el equipo de Skilly responda.`);
    } catch (e) {
      setErrorRevision(mensajeParaUsuario(e));
    } finally {
      setEnviandoRevision(false);
    }
  };

  return <div className="flex flex-col gap-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-primario-700">Lo que ofreces en Skilly</p><h1 className="text-2xl font-semibold tracking-tight">Mis servicios</h1><p className="mt-1 text-sm text-tinta-suave">Crea, edita, pausa o retira tus servicios del catálogo. Cuando un servicio esté listo, solicita que el equipo de Skilly lo revise.</p></div><BotonEnlace to="/profesional/servicios/nuevo" icono={<Plus className="h-4 w-4" />}>Nuevo servicio</BotonEnlace></header>
    {mensaje && <Alerta tono="info">{mensaje}</Alerta>}
    {cuenta.datos && !validado && <Alerta tono="aviso" titulo="Tu perfil aún no está validado">Puedes preparar tus servicios, pero quedarán pausados: podrás publicarlos cuando el equipo de Skilly valide tu perfil.</Alerta>}
    {servicios.datos.length === 0 ? <EstadoVacio titulo="Todavía no tienes servicios" descripcion="Publica tu primera oferta para comenzar a aparecer en el catálogo." accion={<BotonEnlace to="/profesional/servicios/nuevo" icono={<Plus className="h-4 w-4" />}>Crear servicio</BotonEnlace>} /> : <div className="grid gap-4">{servicios.datos.map(s => {
      const categoria = categorias.find(c=>c.id===s.categoriaId);
      const sub = categoria?.subcategorias.find(x=>x.id===s.subcategoriaId);
      const publicado = s.publicado!==false;
      const revisionPendiente = s.revision?.estado === 'pendiente';
      return <Tarjeta key={s.id} className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Insignia tono={publicado?'exito':'neutro'}>{publicado?'Publicado':'Pausado'}</Insignia>{s.revision && <Insignia tono={s.revision.estado==='aprobada'?'exito':s.revision.estado==='observada'?'aviso':'info'}>{s.revision.estado==='aprobada'?'Revisado por Skilly':s.revision.estado==='observada'?'Con observaciones':'En revisión'}</Insignia>}<span className="text-xs text-tinta-tenue">{categoria?.nombre} · {sub?.nombre}</span></div><h2 className="mt-2 text-lg font-semibold">{s.titulo}</h2><p className="mt-1 max-w-2xl text-sm text-tinta-suave">{s.descripcion}</p></div><p className="shrink-0 text-lg font-semibold">{formatearCLP(s.precio)}</p></div>
        <div className="flex flex-wrap gap-2 text-xs text-tinta-suave"><span className="rounded-full bg-crema px-3 py-1">{s.duracionEstimada}</span><span className="rounded-full bg-crema px-3 py-1">{s.duracionSesionMinutos} min por sesión</span>{s.modalidades.map(m=><span key={m} className="rounded-full bg-crema px-3 py-1">{m}</span>)}</div>
        {s.revision && <AvisoRevision revision={s.revision} />}
        <div className="flex flex-col gap-2 border-t border-borde pt-4 sm:flex-row sm:justify-end">
          <Boton variante="secundario" tamano="sm" disabled={revisionPendiente} onClick={()=>abrirRevision(s)} icono={<SendHorizontal className="h-4 w-4" />}>{revisionPendiente ? 'Revisión solicitada' : s.revision ? 'Solicitar nueva revisión' : 'Solicitar revisión'}</Boton>
          <Boton variante="secundario" tamano="sm" onClick={()=>navegar(`/profesional/servicios/${s.id}`)} icono={<Edit3 className="h-4 w-4" />}>Editar</Boton>
          <Boton variante="secundario" tamano="sm" cargando={cargandoId===s.id} disabled={!publicado && !validado} title={!publicado && !validado ? 'Disponible cuando Skilly valide tu perfil' : undefined} onClick={()=>void cambiarEstado(s.id,!publicado)} icono={publicado?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}>{publicado?'Pausar':'Publicar'}</Boton>
          <Boton variante="peligro" tamano="sm" cargando={cargandoId===s.id} onClick={()=>setServicioAEliminar(s)} icono={<Trash2 className="h-4 w-4"/>}>Eliminar</Boton>
        </div>
      </Tarjeta>;
    })}</div>}

    <Dialogo
      abierto={servicioAEliminar !== null}
      titulo="¿Eliminar este servicio?"
      onCerrar={() => { if (!cargandoId) setServicioAEliminar(null); }}
      textoConfirmar="Eliminar definitivamente"
      textoCancelar="Cancelar"
      varianteConfirmar="peligro"
      onConfirmar={() => void eliminar()}
      confirmando={cargandoId !== null}
    >
      Vas a eliminar <strong className="text-tinta">{servicioAEliminar?.titulo}</strong>. Si tiene contrataciones activas no se podrá eliminar; en ese caso puedes pausarlo.
    </Dialogo>

    <Dialogo
      abierto={servicioARevisar !== null}
      titulo="Solicitar revisión a Skilly"
      onCerrar={cerrarRevision}
      textoConfirmar="Enviar solicitud"
      textoCancelar="Cancelar"
      onConfirmar={() => void enviarRevision()}
      confirmando={enviandoRevision}
    >
      <div className="flex flex-col gap-4">
        <p>
          Un administrador de Skilly revisará <strong className="text-tinta">{servicioARevisar?.titulo}</strong>: descripción, entregables, precio y modalidades. Te dejará su respuesta en esta pantalla.
        </p>
        <CampoTextarea
          etiqueta="Mensaje para el equipo de Skilly"
          nota="Opcional"
          ayuda="Por ejemplo, qué cambiaste desde la última revisión o qué te gustaría que miraran."
          value={mensajeRevision}
          valorActual={mensajeRevision}
          maximo={MAXIMO_MENSAJE}
          onChange={e => setMensajeRevision(e.target.value)}
        />
        {errorRevision && <Alerta tono="peligro">{errorRevision}</Alerta>}
      </div>
    </Dialogo>
  </div>;
}

import { useState } from 'react';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { useRecurso } from '@/lib/useRecurso';
import { listarSolicitudesProfesional } from '@/services/solicitudes';
import { formatearCLP, formatearRangoBloque } from '@/lib/formato';
import { EstadoVacio, EstadoError, Insignia, Tarjeta, BotonEnlace, Pestanas, Alerta } from '@/components/ui';
import { ETIQUETA_ESTADO } from '@/modules/agenda/estadoReserva';

export function MisSolicitudes() {
  const solicitudes = useRecurso(() => listarSolicitudesProfesional(), []);
  const [filtro,setFiltro]=useState<'todas'|'pendientes'|'aceptadas'|'cerradas'>('pendientes');
  if (solicitudes.error) return <EstadoError mensaje={solicitudes.error} reintentar={solicitudes.recargar} />;
  if (solicitudes.cargando) return <div className="flex flex-col gap-3"><div className="h-32 animate-pulse rounded-2xl bg-crema" /><div className="h-32 animate-pulse rounded-2xl bg-crema" /></div>;
  const lista=solicitudes.datos??[];
  const pendientes=lista.filter(r=>r.estado==='APROBADA_ADMIN'||r.estado==='REAGENDADA');
  const aceptadas=lista.filter(r=>['PENDIENTE_PAGO','CONFIRMADA','EN_CURSO','ENTREGADA','EVALUADA'].includes(r.estado));
  const requiereDecision=(e:string)=>e==='APROBADA_ADMIN'||e==='REAGENDADA';
  const cerradas=lista.filter(r=>['RECHAZADA','CANCELADA'].includes(r.estado));
  const visible=filtro==='pendientes'?pendientes:filtro==='aceptadas'?aceptadas:filtro==='cerradas'?cerradas:lista;
  return <div className="flex flex-col gap-6"><header><p className="text-sm font-medium text-primario-700">Trabajos que llegan desde Skilly</p><h1 className="text-2xl font-semibold tracking-tight">Solicitudes</h1><p className="mt-1.5 text-sm text-tinta-suave">Revisa el alcance y decide qué trabajos quieres aceptar.</p></header>{pendientes.length>0&&<Alerta tono="aviso" titulo="Tienes solicitudes esperando respuesta">Estas solicitudes ya fueron revisadas por administración y necesitan tu decisión.</Alerta>}<Pestanas pestanas={[{valor:'pendientes',etiqueta:'Por responder',cantidad:pendientes.length},{valor:'aceptadas',etiqueta:'Aceptadas',cantidad:aceptadas.length},{valor:'cerradas',etiqueta:'Cerradas',cantidad:cerradas.length},{valor:'todas',etiqueta:'Todas',cantidad:lista.length}]} activa={filtro} onCambiar={setFiltro} etiquetaGrupo="Estado de solicitudes"/>{!visible.length?<EstadoVacio titulo={filtro==='pendientes'?'No tienes trabajos pendientes':'No hay solicitudes en esta categoría'} descripcion="Cuando administración derive un trabajo para ti aparecerá aquí."/>:<ul className="flex flex-col gap-3">{visible.map(r=><li key={r.id}><Tarjeta className="flex flex-col gap-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-tinta-tenue">{r.codigo}</span><Insignia tono={requiereDecision(r.estado)?'aviso':r.estado==='RECHAZADA'?'peligro':r.estado==='CONFIRMADA'?'exito':'info'}>{ETIQUETA_ESTADO[r.estado]}</Insignia></div><h2 className="mt-2 font-semibold">Solicitud de servicio</h2><p className="mt-1 text-sm text-tinta-suave">{formatearRangoBloque(r.inicio,r.fin)} · {formatearCLP(r.precio)}</p></div><div className="flex items-center gap-2 text-xs text-tinta-tenue">{requiereDecision(r.estado)?<Clock3 className="h-4 w-4"/>:r.estado==='RECHAZADA'?<XCircle className="h-4 w-4"/>:<CheckCircle2 className="h-4 w-4"/>}{requiereDecision(r.estado)?'Requiere tu decisión':'Historial de la contratación'}</div></div><div className="flex justify-end"><BotonEnlace to={`/profesional/solicitudes/${r.id}`}>Ver detalle</BotonEnlace></div></Tarjeta></li>)}</ul>}</div>;
}

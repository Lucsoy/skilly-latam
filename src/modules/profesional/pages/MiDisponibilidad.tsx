import { useEffect, useState } from 'react';
import { CalendarDays, Clock3, Plus, Trash2 } from 'lucide-react';
import { useRecurso } from '@/lib/useRecurso';
import { agregarBloqueoDisponibilidad, eliminarBloqueoDisponibilidad, guardarHorariosSemanales, listarBloqueosDisponibilidad, obtenerHorariosSemanales, type HorarioSemanal } from '@/services/panelProfesional';
import { mensajeParaUsuario } from '@/services/errores';
import { Alerta, Boton, CampoTexto, EstadoError, Esqueleto, Tarjeta } from '@/components/ui';

const DIAS = [{dia:1,nombre:'Lunes'},{dia:2,nombre:'Martes'},{dia:3,nombre:'Miércoles'},{dia:4,nombre:'Jueves'},{dia:5,nombre:'Viernes'},{dia:6,nombre:'Sábado'},{dia:0,nombre:'Domingo'}];

export function MiDisponibilidad() {
  const horarios = useRecurso(obtenerHorariosSemanales, []);
  const bloqueos = useRecurso(listarBloqueosDisponibilidad, []);
  const [horarioLocal, setHorarioLocal] = useState<HorarioSemanal[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [nuevoBloqueo, setNuevoBloqueo] = useState({ fecha: '', desde: '09:00', hasta: '18:00', motivo: '' });

  useEffect(() => { if (horarios.datos) setHorarioLocal(horarios.datos); }, [horarios.datos]);
  if (horarios.error) return <EstadoError mensaje={horarios.error} reintentar={horarios.recargar} />;
  if (bloqueos.error) return <EstadoError mensaje={bloqueos.error} reintentar={bloqueos.recargar} />;
  if (horarios.cargando || !horarios.datos || bloqueos.cargando || !bloqueos.datos) return <Esqueleto className="h-[600px] w-full rounded-2xl" />;

  const cambiar = (dia: number, cambios: Partial<HorarioSemanal>) => {
    setHorarioLocal((actual) => actual.map((h) => h.dia === dia ? { ...h, ...cambios } : h));
  };
  const guardar = async () => {
    setGuardando(true); setMensaje(null);
    try { await guardarHorariosSemanales(horarioLocal); await horarios.recargar(); setMensaje('Tu horario semanal fue actualizado. Los bloques futuros del calendario se regeneraron.'); }
    catch (e) { setMensaje(mensajeParaUsuario(e)); }
    finally { setGuardando(false); }
  };
  const agregar = async () => {
    if (!nuevoBloqueo.fecha || nuevoBloqueo.desde >= nuevoBloqueo.hasta) { setMensaje('Revisa la fecha y el rango horario del bloqueo.'); return; }
    setGuardando(true); setMensaje(null);
    try { await agregarBloqueoDisponibilidad(nuevoBloqueo); await bloqueos.recargar(); setNuevoBloqueo({ fecha: '', desde: '09:00', hasta: '18:00', motivo: '' }); setMensaje('Bloqueo agregado. Ese horario dejará de aparecer disponible.'); }
    catch (e) { setMensaje(mensajeParaUsuario(e)); }
    finally { setGuardando(false); }
  };
  const eliminar = async (id: string) => {
    setGuardando(true);
    try { await eliminarBloqueoDisponibilidad(id); await bloqueos.recargar(); }
    catch (e) { setMensaje(mensajeParaUsuario(e)); }
    finally { setGuardando(false); }
  };

  return <div className="flex flex-col gap-6">
    <header><p className="text-sm font-medium text-primario-700">Cuándo pueden contratarte</p><h1 className="text-2xl font-semibold tracking-tight">Disponibilidad</h1><p className="mt-1 text-sm text-tinta-suave">Define tus horas habituales y bloquea fechas puntuales. Solo los horarios disponibles aparecen para las organizaciones.</p></header>
    {mensaje && <Alerta tono="info">{mensaje}</Alerta>}
    <Tarjeta><div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-primario-700"/><div><h2 className="font-semibold">Horario semanal</h2><p className="text-sm text-tinta-suave">Puedes cambiarlo cuando quieras.</p></div></div>
      <div className="mt-5 flex flex-col gap-3">{DIAS.map(d => { const h = horarioLocal.find(x => x.dia === d.dia) ?? { dia: d.dia, activo: false, desde: '09:00', hasta: '18:00' }; return <div key={d.dia} className="grid items-center gap-3 rounded-xl border border-borde p-3 sm:grid-cols-[130px_100px_1fr_1fr]"><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={h.activo} onChange={e=>cambiar(d.dia,{activo:e.target.checked})} className="h-4 w-4 rounded border-borde-fuerte text-primario-600"/>{d.nombre}</label><span className="text-xs text-tinta-tenue">{h.activo?'Disponible':'No disponible'}</span><CampoTexto etiqueta="Desde" type="time" value={h.desde} disabled={!h.activo} onChange={e=>cambiar(d.dia,{desde:e.target.value})}/><CampoTexto etiqueta="Hasta" type="time" value={h.hasta} disabled={!h.activo} onChange={e=>cambiar(d.dia,{hasta:e.target.value})}/></div>; })}</div>
      <div className="mt-5 flex justify-end"><Boton cargando={guardando} onClick={()=>void guardar()}>Guardar horario</Boton></div>
    </Tarjeta>
    <Tarjeta><div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-primario-700"/><div><h2 className="font-semibold">Bloqueos puntuales</h2><p className="text-sm text-tinta-suave">Vacaciones, reuniones o cualquier momento en que no quieras recibir reservas.</p></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-4"><CampoTexto etiqueta="Fecha" type="date" value={nuevoBloqueo.fecha} onChange={e=>setNuevoBloqueo({...nuevoBloqueo,fecha:e.target.value})}/><CampoTexto etiqueta="Desde" type="time" value={nuevoBloqueo.desde} onChange={e=>setNuevoBloqueo({...nuevoBloqueo,desde:e.target.value})}/><CampoTexto etiqueta="Hasta" type="time" value={nuevoBloqueo.hasta} onChange={e=>setNuevoBloqueo({...nuevoBloqueo,hasta:e.target.value})}/><CampoTexto etiqueta="Motivo" value={nuevoBloqueo.motivo} onChange={e=>setNuevoBloqueo({...nuevoBloqueo,motivo:e.target.value})} placeholder="Vacaciones"/></div>
      <div className="mt-4 flex justify-end"><Boton variante="secundario" cargando={guardando} onClick={()=>void agregar()} icono={<Plus className="h-4 w-4"/>}>Agregar bloqueo</Boton></div>
      <ul className="mt-5 flex flex-col gap-2">{bloqueos.datos.length ? bloqueos.datos.sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(b=><li key={b.id} className="flex flex-col gap-2 rounded-xl border border-borde px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><span className="font-medium">{b.fecha}</span><span className="ml-2 text-tinta-suave">{b.desde}–{b.hasta}</span>{b.motivo&&<span className="ml-2 text-tinta-tenue">· {b.motivo}</span>}</div><Boton variante="fantasma" tamano="sm" onClick={()=>void eliminar(b.id)} icono={<Trash2 className="h-4 w-4"/>}>Quitar</Boton></li>) : <li className="text-sm text-tinta-tenue">No tienes bloqueos puntuales.</li>}</ul>
    </Tarjeta>
  </div>;
}

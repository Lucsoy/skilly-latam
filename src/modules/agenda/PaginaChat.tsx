import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useRecurso } from '@/lib/useRecurso';
import { enviarMensajeChat, listarMensajesChat } from '@/services/chat';
import { mensajeParaUsuario } from '@/services/errores';
import { Boton, CampoTextarea, EstadoError, Esqueleto, Tarjeta } from '@/components/ui';
import { formatearFechaHora } from '@/lib/formato';
import { useSesion } from '@/modules/auth/sesionStore';

export function PaginaChat() {
  const { reservaId = '' } = useParams();
  const mensajes = useRecurso(() => listarMensajesChat(reservaId), [reservaId]);
  const nombre = useSesion(s => s.usuario?.nombre ?? '');
  const esProfesional = useSesion(s => s.usuario?.rol === 'profesional');
  const volver = esProfesional ? `/profesional/solicitudes/${reservaId}` : `/mis-servicios/${reservaId}`;
  const [texto,setTexto]=useState(''); const [error,setError]=useState<string|null>(null); const [enviando,setEnviando]=useState(false);
  if(mensajes.error)return <EstadoError titulo="Chat no disponible" mensaje={mensajes.error} reintentar={mensajes.recargar}/>;
  if(mensajes.cargando||!mensajes.datos)return <Esqueleto className="h-96 w-full rounded-2xl"/>;
  const enviar=async(e:FormEvent)=>{e.preventDefault();if(!texto.trim())return;setEnviando(true);setError(null);try{await enviarMensajeChat(reservaId,texto);setTexto('');mensajes.recargar();}catch(err){setError(mensajeParaUsuario(err));}finally{setEnviando(false);}};
  return <div className="mx-auto flex max-w-2xl flex-col gap-5"><header><p className="text-sm font-medium text-primario-700">Chat de coordinación</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Conversación de la contratación</h1><p className="mt-1 text-sm text-tinta-suave">Este espacio ayuda a dejar registrada la coordinación entre empresa y profesional.</p></header>{error&&<div className="rounded-xl bg-peligro-50 px-4 py-3 text-sm">{error}</div>}<Tarjeta className="flex min-h-[420px] flex-col"><div className="flex-1 space-y-3">{!mensajes.datos.length&&<p className="rounded-xl bg-crema px-4 py-3 text-sm text-tinta-suave">Todavía no hay mensajes. Puedes iniciar la coordinación.</p>}{mensajes.datos.map(m=><div key={m.id} className={`flex ${m.autorNombre===nombre?'justify-end':'justify-start'}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${m.autorNombre===nombre?'bg-primario-700 text-white':'bg-crema text-tinta'}`}><p className="text-xs opacity-70">{m.autorNombre}</p><p className="mt-1 whitespace-pre-wrap">{m.texto}</p><p className="mt-1 text-[11px] opacity-60">{formatearFechaHora(m.enviadoEn)}</p></div></div>)}</div><form onSubmit={enviar} className="mt-5 border-t border-borde pt-4"><CampoTextarea etiqueta="Escribe un mensaje" value={texto} onChange={e=>setTexto(e.target.value.slice(0,1000))} rows={3} maximo={1000} valorActual={texto}/><Boton className="mt-3" cargando={enviando}>Enviar mensaje</Boton></form></Tarjeta><Link to={volver} className="text-sm font-medium text-primario-700 underline">Volver a la contratación</Link></div>;
}

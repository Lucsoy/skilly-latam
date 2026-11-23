import type { Reserva } from '@/types';
import { almacen, clonar } from '@/mocks/almacen';
import { latencia } from '@/lib/tiempo';
import { ErrorServicio } from './errores';
import { organizacionEnSesion, profesionalIdEnSesion, sesionActual } from './sesionActual';
import { USE_API } from '@/config';
import { ESTADOS_CHAT } from '@/modules/agenda/estadoReserva';
import { api } from '@/lib/apiClient';

export interface MensajeChat {
  id: string;
  reservaId: string;
  autorRol: 'organizacion' | 'profesional';
  autorNombre: string;
  texto: string;
  enviadoEn: string;
}

const CLAVE = 'skilly.chat.v1';

function cargar(): MensajeChat[] {
  try { return JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as MensajeChat[]; } catch { return []; }
}
function guardar(lista: MensajeChat[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    throw new ErrorServicio('red', 'No se pudo guardar el mensaje en este navegador. Revisa el espacio disponible y vuelve a intentarlo.');
  }
}

function reservaAutorizada(id: string): Reserva {
  const r = almacen.reservas.find(x => x.id === id);
  if (!r) throw new ErrorServicio('no_encontrado', 'No encontramos esta contratación.');
  const sesion = sesionActual();
  if (!sesion) throw new ErrorServicio('no_autorizado', 'Tu sesión terminó.');
  const autorizado = sesion.usuario.rol === 'organizacion'
    ? r.organizacionId === organizacionEnSesion().id
    : sesion.usuario.rol === 'profesional' && r.profesionalId === profesionalIdEnSesion();
  if (!autorizado) throw new ErrorServicio('no_autorizado', 'No puedes acceder al chat de esta contratación.');
  if (!ESTADOS_CHAT.includes(r.estado)) throw new ErrorServicio('conflicto', 'El chat está disponible desde que la contratación se confirma hasta su entrega.');
  return r;
}

export async function listarMensajesChat(reservaId: string): Promise<MensajeChat[]> {
  if (USE_API) return api.get<MensajeChat[]>('/chat/', { reserva_id: reservaId });
  await latencia(); reservaAutorizada(reservaId);
  return clonar(cargar().filter(m => m.reservaId === reservaId).sort((a,b)=>a.enviadoEn.localeCompare(b.enviadoEn)));
}

export async function enviarMensajeChat(reservaId: string, texto: string): Promise<MensajeChat> {
  if (USE_API) return api.post<MensajeChat>('/chat/', { reservaId, texto });
  await latencia(); reservaAutorizada(reservaId);
  const sesion = sesionActual()!;
  const mensaje: MensajeChat = {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    reservaId,
    autorRol: sesion.usuario.rol === 'profesional' ? 'profesional' : 'organizacion',
    autorNombre: sesion.usuario.nombre,
    texto: texto.trim(),
    enviadoEn: new Date().toISOString(),
  };
  if (!mensaje.texto) throw new ErrorServicio('validacion', 'Escribe un mensaje antes de enviarlo.');
  const lista = cargar(); lista.push(mensaje); guardar(lista); return clonar(mensaje);
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cerrarSesion, iniciarSesion, restaurarSesion } from './auth';
import { enviarMensajeChat, listarMensajesChat } from './chat';

describe('chat de una reserva confirmada en demostración', () => {
  const mensajes = new Map<string, string>();
  const storage = {
    getItem: (key: string) => mensajes.get(key) ?? null,
    setItem: (key: string, value: string) => mensajes.set(key, value),
  };
  beforeEach(() => {
    mensajes.clear();
    vi.stubGlobal('localStorage', storage);
  });
  afterEach(async () => {
    await cerrarSesion();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('conserva el mensaje al restaurar la sesión y lo asocia a su reserva', async () => {
    const sesion = await iniciarSesion({ email: 'contacto@bloom.cl', contrasena: 'skilly2026' });
    const enviado = await enviarMensajeChat('res-02', '  Confirmamos el horario.  ');
    await cerrarSesion();
    await restaurarSesion(sesion.token);
    expect(enviado.texto).toBe('Confirmamos el horario.');
    expect(await listarMensajesChat('res-02')).toEqual([enviado]);
    expect(await listarMensajesChat('res-03')).toEqual([]);
  });

  it('informa cuando el navegador no puede guardar el mensaje', async () => {
    await iniciarSesion({ email: 'contacto@bloom.cl', contrasena: 'skilly2026' });
    vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new Error('Sin espacio'); });
    await expect(enviarMensajeChat('res-02', 'Hola')).rejects.toMatchObject({ codigo: 'red' });
    expect(await listarMensajesChat('res-02')).toEqual([]);
  });
});

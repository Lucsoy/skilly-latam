import { beforeEach, describe, expect, it } from 'vitest';
import { reiniciarAlmacen } from '@/mocks/almacen';
import { cerrarSesion, iniciarSesion } from './auth';
import { listarMisServicios, solicitarRevisionServicio } from './panelProfesional';
import { listarProfesionalesAdmin, obtenerDetalleProfesionalAdmin, resolverRevisionServicio } from './admin';

const PROFESIONAL = { email: 'camila.rojas@ejemplo.cl', contrasena: 'camila2026' };
const ADMIN = { email: 'admin@skilly.cl', contrasena: 'admin2026' };

describe('solicitud de revisión de servicios', () => {
  beforeEach(async () => {
    reiniciarAlmacen();
    await cerrarSesion();
  });

  it('el profesional la solicita y el administrador la ve y la aprueba', async () => {
    const sesion = await iniciarSesion(PROFESIONAL);
    const [servicio] = await listarMisServicios();
    expect(servicio).toBeDefined();

    const enviado = await solicitarRevisionServicio(servicio!.id, 'Actualicé los entregables');
    expect(enviado.revision).toMatchObject({ estado: 'pendiente', mensaje: 'Actualicé los entregables' });
    await expect(solicitarRevisionServicio(servicio!.id)).rejects.toMatchObject({ codigo: 'conflicto' });

    await iniciarSesion(ADMIN);
    const lista = await listarProfesionalesAdmin();
    const fila = lista.find((x) => x.profesional.id === sesion.profesional!.id);
    expect(fila?.servicios.find((s) => s.id === servicio!.id)?.revision?.estado).toBe('pendiente');

    const detalle = await obtenerDetalleProfesionalAdmin(sesion.profesional!.id);
    expect(detalle.privado?.email).toBe(PROFESIONAL.email);
    expect(detalle.emailCuenta).toBe(PROFESIONAL.email);
    expect(detalle.servicios.length).toBe(fila?.servicios.length);

    await expect(resolverRevisionServicio(servicio!.id, 'observar', 'corto')).rejects.toMatchObject({ codigo: 'validacion' });
    const aprobado = await resolverRevisionServicio(servicio!.id, 'aprobar', 'Todo en orden');
    expect(aprobado.revision).toMatchObject({ estado: 'aprobada', comentarioAdmin: 'Todo en orden' });
    await expect(resolverRevisionServicio(servicio!.id, 'aprobar')).rejects.toMatchObject({ codigo: 'conflicto' });

    await iniciarSesion(PROFESIONAL);
    const despues = (await listarMisServicios()).find((s) => s.id === servicio!.id);
    expect(despues?.revision?.estado).toBe('aprobada');
    // Tras una resolución puede volver a solicitar revisión.
    expect((await solicitarRevisionServicio(servicio!.id)).revision?.estado).toBe('pendiente');
  }, 30_000);

  it('una organización no puede ver la ficha completa', async () => {
    await iniciarSesion({ email: 'contacto@bloom.cl', contrasena: 'skilly2026' });
    await expect(obtenerDetalleProfesionalAdmin('prof-01')).rejects.toMatchObject({ codigo: 'no_autorizado' });
  });
});

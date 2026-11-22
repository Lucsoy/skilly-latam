import { beforeEach, describe, expect, it } from 'vitest';
import { reiniciarAlmacen } from '@/mocks/almacen';
import { cerrarSesion, iniciarSesion, registrarProfesional } from './auth';
import { obtenerMiCuenta } from './panelProfesional';
import { actorActual } from './sesionActual';
import { buscarServicios } from './catalogo';

describe('cuentas de profesionales', () => {
  beforeEach(async () => {
    reiniciarAlmacen();
    await cerrarSesion();
  });

  it('registra la etapa 1 con consentimiento versionado y perfil incompleto', async () => {
    const aceptado = '2026-09-24T13:00:00.000Z';
    const sesion = await registrarProfesional({
      nombreCompleto: 'Josefa Pérez Lagos',
      email: 'Josefa@Ejemplo.cl',
      contrasena: 'clave1234',
      areaPrincipal: 'finanzas',
      linkedin: 'linkedin.com/in/josefa-perez',
      consentimiento: true,
      consentimientoAceptadoEn: aceptado,
    });
    expect(sesion.usuario.rol).toBe('profesional');
    expect(sesion.profesional?.nombre).toBe('Josefa');
    expect(sesion.profesional?.apellido).toBe('Pérez Lagos');
    expect(sesion.profesional?.linkedin).toBe('https://linkedin.com/in/josefa-perez');
    expect(sesion.profesional?.validadoPorSkilly).toBe(false);

    const { privado } = await obtenerMiCuenta();
    expect(privado.email).toBe('josefa@ejemplo.cl');
    expect(privado.estadoValidacion).toBe('perfil_incompleto');
    expect(privado.consentimiento).toEqual({ aceptado: true, fecha: aceptado, version: '2026-01' });
    expect(actorActual()).toEqual({ tipo: 'profesional', nombre: 'Josefa Pérez Lagos' });
  });

  it('permite registrarse sin LinkedIn', async () => {
    const sesion = await registrarProfesional({
      nombreCompleto: 'Tomás Silva Rojas',
      email: 'tomas.silva@ejemplo.cl',
      contrasena: 'clave1234',
      areaPrincipal: 'finanzas',
      consentimiento: true,
      consentimientoAceptadoEn: new Date().toISOString(),
    });
    expect(sesion.usuario.rol).toBe('profesional');
    expect(sesion.profesional?.linkedin).toBeUndefined();
  });

  it('rechaza un correo ya registrado', async () => {
    await expect(
      registrarProfesional({
        nombreCompleto: 'Otra Camila',
        email: 'camila.rojas@ejemplo.cl',
        contrasena: 'clave1234',
        areaPrincipal: 'reclutamiento',
        linkedin: 'linkedin.com/in/otra-camila',
        consentimiento: true,
        consentimientoAceptadoEn: new Date().toISOString(),
      }),
    ).rejects.toMatchObject({ codigo: 'conflicto' });
  });

  it('las cuentas de prueba ingresan con su ficha y su estado', async () => {
    await iniciarSesion({ email: 'camila.rojas@ejemplo.cl', contrasena: 'camila2026' });
    expect((await obtenerMiCuenta()).privado.estadoValidacion).toBe('validado');

    await iniciarSesion({ email: 'valentina.munoz@ejemplo.cl', contrasena: 'valentina2026' });
    const valentina = await obtenerMiCuenta();
    expect(valentina.profesional.id).toBe('prof-13');
    expect(valentina.privado.estadoValidacion).toBe('perfil_incompleto');
  });

  it('una organización no puede leer datos privados de profesionales', async () => {
    await iniciarSesion({ email: 'contacto@bloom.cl', contrasena: 'skilly2026' });
    await expect(obtenerMiCuenta()).rejects.toMatchObject({ codigo: 'no_autorizado' });
  });

  it('el catálogo sigue mostrando los servicios, sin profesionales sin servicios', async () => {
    const { items } = await buscarServicios();
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((i) => i.profesional.id === 'prof-13')).toBe(false);
  });
});

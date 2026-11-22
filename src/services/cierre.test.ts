import { beforeEach, describe, expect, it } from 'vitest';
import { reiniciarAlmacen } from '@/mocks/almacen';
import { cambiarContrasena, cerrarSesion, iniciarSesion } from './auth';
import { actualizarServicio, agregarDocumento, cambiarPublicacionServicio, crearServicio, listarMisServicios, obtenerMiCuenta, solicitarRevisionServicio, type DatosServicioProfesional } from './panelProfesional';
import { cambiarEstadoDocumentoAdmin, listarProfesionalesAdmin, resolverRevisionServicio, resolverValidacionProfesional } from './admin';
import { confirmarConformidad, obtenerReserva } from './reservas';
import { enviarEvaluacion, obtenerEstadoEvaluacion } from './evaluaciones';

const ORG = { email: 'contacto@bloom.cl', contrasena: 'skilly2026' };
const ADMIN = { email: 'admin@skilly.cl', contrasena: 'admin2026' };
const CAMILA = { email: 'camila.rojas@ejemplo.cl', contrasena: 'camila2026' };
const VALENTINA = { email: 'valentina.munoz@ejemplo.cl', contrasena: 'valentina2026' };

const servicioBase: DatosServicioProfesional = {
  categoriaId: 'reclutamiento',
  subcategoriaId: 'busqueda-perfiles',
  titulo: 'Asesoría de prueba para el cierre',
  descripcion: 'Un servicio de prueba con una descripción suficientemente larga.',
  entregables: ['Informe final'],
  duracionEstimada: '1 semana',
  duracionSesionMinutos: 60,
  modalidades: ['remoto'],
  precio: 100000,
  etiquetas: ['prueba'],
  publicado: false,
};

describe('cierre del proyecto', () => {
  beforeEach(async () => {
    reiniciarAlmacen();
    await cerrarSesion();
  });

  it('la organización confirma conformidad y evalúa; la reserva queda EVALUADA', async () => {
    await iniciarSesion(ORG);
    await expect(enviarEvaluacion({ reservaId: 'res-05', calidad: 4, plazos: 4, comunicacion: 3 })).rejects.toMatchObject({ codigo: 'transicion_invalida' });
    const conforme = await confirmarConformidad('res-05');
    expect(conforme.conformidadConfirmada).toBe(true);
    const evaluacion = await enviarEvaluacion({ reservaId: 'res-05', calidad: 4, plazos: 3, comunicacion: 4, comentario: 'Muy buen trabajo' });
    expect(evaluacion.estadoComentario).toBe('en_revision');
    expect((await obtenerReserva('res-05')).estado).toBe('EVALUADA');
    expect((await obtenerEstadoEvaluacion('res-05')).propia?.id).toBe(evaluacion.id);
  }, 30_000);

  it('un profesional sin validar no puede publicar, y el admin lo valida tras aprobar un documento', async () => {
    const sesion = await iniciarSesion(VALENTINA);
    const profId = sesion.profesional!.id;
    await expect(crearServicio({ ...servicioBase, publicado: true })).rejects.toMatchObject({ codigo: 'conflicto' });
    const pausado = await crearServicio(servicioBase);
    await expect(cambiarPublicacionServicio(pausado.id, true)).rejects.toMatchObject({ codigo: 'conflicto' });
    await expect(agregarDocumento(new File(['x'], 'virus.exe'), 'curriculum')).rejects.toMatchObject({ codigo: 'validacion' });
    const doc = await agregarDocumento(new File(['%PDF-1.4'], 'CV.pdf', { type: 'application/pdf' }), 'curriculum');

    await iniciarSesion(ADMIN);
    await expect(resolverValidacionProfesional(profId, 'validar')).rejects.toMatchObject({ codigo: 'validacion' });
    await cambiarEstadoDocumentoAdmin(doc.id, 'aprobado');
    const r = await resolverValidacionProfesional(profId, 'validar', 'Antecedentes en orden');
    expect(r.privado.estadoValidacion).toBe('validado');
    expect(r.profesional.validadoPorSkilly).toBe(true);
    expect((await listarProfesionalesAdmin()).find((p) => p.profesional.id === profId)?.estadoValidacion).toBe('validado');

    await iniciarSesion(VALENTINA);
    expect((await cambiarPublicacionServicio(pausado.id, true)).publicado).toBe(true);
  }, 30_000);

  it('devolver un perfil exige comentario y el profesional lo ve', async () => {
    await iniciarSesion(ADMIN);
    await expect(resolverValidacionProfesional('prof-13', 'devolver', 'corto')).rejects.toMatchObject({ codigo: 'validacion' });
    await resolverValidacionProfesional('prof-13', 'devolver', 'Falta subir tu título profesional.');
    await iniciarSesion(VALENTINA);
    expect((await obtenerMiCuenta()).privado.comentarioValidacion).toBe('Falta subir tu título profesional.');
  }, 30_000);

  it('editar un servicio aprobado invalida su revisión', async () => {
    await iniciarSesion(CAMILA);
    const [servicio] = await listarMisServicios();
    await solicitarRevisionServicio(servicio!.id);
    await iniciarSesion(ADMIN);
    await resolverRevisionServicio(servicio!.id, 'aprobar');
    await iniciarSesion(CAMILA);
    const { id, profesionalId: _p, revision: _r, ...resto } = (await listarMisServicios()).find((s) => s.id === servicio!.id)!;
    const editado = await actualizarServicio(id, { ...resto, publicado: resto.publicado !== false, precio: resto.precio + 1000 });
    expect(editado.revision).toBeNull();
  }, 30_000);

  it('cambia la contraseña y la antigua deja de servir', async () => {
    await iniciarSesion(ORG);
    await expect(cambiarContrasena('incorrecta', 'NuevaClave2026')).rejects.toMatchObject({ codigo: 'credenciales_invalidas' });
    await expect(cambiarContrasena(ORG.contrasena, 'corta')).rejects.toMatchObject({ codigo: 'validacion' });
    await cambiarContrasena(ORG.contrasena, 'NuevaClave2026');
    await cerrarSesion();
    await expect(iniciarSesion(ORG)).rejects.toBeDefined();
    expect((await iniciarSesion({ email: ORG.email, contrasena: 'NuevaClave2026' })).usuario.email).toBe(ORG.email);
  }, 30_000);
});

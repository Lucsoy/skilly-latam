/**
 * Pruebas de integración y de seguridad de la API de Skilly LATAM contra
 * PHP + MariaDB reales. Cada prueba lleva el ID del caso del plan de pruebas
 * (docs/04_pruebas). Se ejecutan en orden: los bloques comparten estado para
 * reproducir el ciclo completo de contratación entre los cuatro roles.
 *
 *   npm run test:integracion        (ver docs/03_entorno/GUIA_INSTALACION.md)
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { FUNDADORA, RUN, login, loginFundadora, pdfMinimo, req, rutValido } from './helpers';

const ctx: Record<string, any> = {};
const ORG = {
  razonSocial: `Organización Prueba ${RUN}`,
  rut: rutValido(70000000 + (Date.now() % 9000000)),
  giro: 'Servicios de consultoría',
  tamano: '11-50',
  nombreContacto: 'Paula Contacto',
  emailContacto: `org.${RUN}@ejemplo.test`,
  contrasena: 'Organiza2026',
  consentimiento: true,
};
const ORG2 = { ...ORG, razonSocial: `Otra Org ${RUN}`, rut: rutValido(60000000 + (Date.now() % 9000000)), emailContacto: `org2.${RUN}@ejemplo.test` };
const PROF = {
  nombreCompleto: 'Camila Prueba Rojas',
  email: `prof.${RUN}@ejemplo.test`,
  contrasena: 'Profesional2026',
  areaPrincipal: 'reclutamiento',
  consentimiento: true,
};
const PROF2 = { ...PROF, nombreCompleto: 'Diego Otro Soto', email: `prof2.${RUN}@ejemplo.test` };
const PERFIL = {
  titulo: 'Psicóloga laboral',
  ciudad: 'Santiago',
  presentacion: 'Más de diez años acompañando procesos de selección y desarrollo organizacional en pymes.',
  formacion: ['Psicología, Universidad de Chile'],
  experiencia: [{ cargo: 'Consultora', organizacion: 'Independiente', periodo: '2016 - hoy' }],
  habilidades: ['Selección', 'Entrevistas por competencias'],
};
const SERVICIO = {
  categoriaId: 'reclutamiento',
  subcategoriaId: 'busqueda-perfiles',
  titulo: `Selección de analista ${RUN}`,
  descripcion: 'Proceso completo de búsqueda, evaluación y terna final para un cargo de analista.',
  entregables: ['Terna final', 'Informe psicolaboral'],
  duracionEstimada: '3 semanas',
  duracionSesionMinutos: 60,
  modalidades: ['remoto', 'hibrido'],
  precio: 350000,
  etiquetas: ['selección', 'pyme'],
};

describe('Autenticación y registro', () => {
  it('CP-INT-AUT-01 inicio de sesión de la fundadora devuelve token y rol', async () => {
    const r = await req('POST', '/auth/login', { body: { email: FUNDADORA.email, contrasena: FUNDADORA.contrasena } });
    expect(r.status).toBe(200);
    expect(r.data.token).toMatch(/^[a-f0-9]{64}$/);
    expect(r.data.usuario.rol).toBe('fundador');
    expect(r.data.usuario).not.toHaveProperty('contrasena');
    ctx.fundadoraInicial = r.data.token;
  });
  it('CP-SEG-23 con la contraseña inicial publicada solo se puede ver la sesión y cambiarla (T-07)', async () => {
    const t = ctx.fundadoraInicial;
    try {
      const sesion = await req('GET', '/auth/sesion', { token: t });
      expect(sesion.status).toBe(200);
      expect(sesion.data.usuario.debeCambiarContrasena).toBe(true);
      const bloqueado = await req('GET', '/admin/?accion=resumen', { token: t });
      expect(bloqueado.status).toBe(403);
      expect(bloqueado.data.codigo).toBe('cambiar_contrasena');
      expect((await req('PUT', '/configuracion/', { token: t, body: {} })).status).toBe(403);
      const cambio = await req('POST', '/auth/contrasena', { token: t, body: { actual: FUNDADORA.contrasena, nueva: FUNDADORA.nueva } });
      expect(cambio.status).toBe(200);
      expect((await req('GET', '/admin/?accion=resumen', { token: t })).status).toBe(200);
    } finally {
      // Aunque esta prueba falle (p. ej. contra una versión anterior), las demás siguen
      // con la sesión de la fundadora ya cambiada y no fallan en cascada.
      ctx.fundadora = await loginFundadora();
    }
  });

  it('CP-INT-AUT-02 contraseña incorrecta → 401 sin revelar si el correo existe', async () => {
    const r = await req('POST', '/auth/login', { body: { email: FUNDADORA.email, contrasena: 'incorrecta1' } });
    expect(r.status).toBe(401);
    expect(r.data.mensaje).toBe('El correo o la contraseña no coinciden.');
  });

  it('CP-SEG-01 inyección SQL en el correo no autentica', async () => {
    const r = await req('POST', '/auth/login', { body: { email: "' OR '1'='1' -- ", contrasena: "' OR '1'='1" } });
    expect(r.status).toBe(401);
  });

  it('CP-INT-AUT-03 registro de organización crea cuenta y sesión', async () => {
    const r = await req('POST', '/organizaciones/', { body: ORG });
    expect(r.status).toBe(201);
    expect(r.data.usuario.rol).toBe('organizacion');
    expect(r.data.organizacion.razonSocial).toBe(ORG.razonSocial);
    ctx.org = r.data.token;
    ctx.orgId = r.data.organizacion.id;
    const r2 = await req('POST', '/organizaciones/', { body: ORG2 });
    expect(r2.status).toBe(201);
    ctx.org2 = r2.data.token;
  });

  it('CP-INT-AUT-04 correo duplicado → 409', async () => {
    const r = await req('POST', '/organizaciones/', { body: { ...ORG, rut: rutValido(50000001) } });
    expect(r.status).toBe(409);
  });

  it('CP-INT-AUT-05 RUT ya registrado con otro formato (puntos) → 409', async () => {
    const [cuerpo, dv] = ORG.rut.split('-');
    const conPuntos = `${cuerpo.slice(0, 2)}.${cuerpo.slice(2, 5)}.${cuerpo.slice(5)}-${dv}`;
    const r = await req('POST', '/organizaciones/', { body: { ...ORG, rut: conPuntos, emailContacto: `dup.${RUN}@ejemplo.test` } });
    expect(r.status).toBe(409);
  });

  it('CP-VAL-01 RUT con dígito verificador incorrecto → 400', async () => {
    const malo = ORG.rut.replace(/-.$/, (m) => (m === '-1' ? '-2' : '-1'));
    const r = await req('POST', '/organizaciones/', { body: { ...ORG, rut: malo, emailContacto: `rut.${RUN}@ejemplo.test` } });
    expect(r.status).toBe(400);
  });

  it('CP-VAL-02 correo con formato inválido en registro de organización → 400', async () => {
    const r = await req('POST', '/organizaciones/', { body: { ...ORG, rut: rutValido(40000002), emailContacto: 'no-es-correo' } });
    expect(r.status).toBe(400);
  });

  it('CP-VAL-03 contraseña sin números (política) → 400', async () => {
    const r = await req('POST', '/organizaciones/', {
      body: { ...ORG, rut: rutValido(40000003), emailContacto: `debil.${RUN}@ejemplo.test`, contrasena: 'solamenteletras' },
    });
    expect(r.status).toBe(400);
  });

  it('CP-INT-AUT-06 registro de profesional en estado perfil_incompleto', async () => {
    const r = await req('POST', '/profesionales/', { body: PROF });
    expect(r.status).toBe(201);
    expect(r.data.usuario.rol).toBe('profesional');
    ctx.prof = r.data.token;
    ctx.profId = r.data.profesional.id;
    const r2 = await req('POST', '/profesionales/', { body: PROF2 });
    expect(r2.status).toBe(201);
    ctx.prof2 = r2.data.token;
    ctx.prof2Id = r2.data.profesional.id;
  });

  it('CP-SEG-02 token inválido o ausente → 401', async () => {
    expect((await req('GET', '/auth/sesion', { token: 'a'.repeat(64) })).status).toBe(401);
    expect((await req('GET', '/auth/sesion')).status).toBe(401);
  });

  it('CP-SEG-03 límite de intentos: el 6.º intento fallido devuelve 429', async () => {
    const email = `bloqueo.${RUN}@ejemplo.test`;
    for (let i = 0; i < 5; i++) {
      expect((await req('POST', '/auth/login', { body: { email, contrasena: 'x' } })).status).toBe(401);
    }
    const r = await req('POST', '/auth/login', { body: { email, contrasena: 'x' } });
    expect(r.status).toBe(429);
    expect(r.data.codigo).toBe('demasiados_intentos');
  });

  it('CP-SEG-04 cierre de sesión revoca el token en el servidor', async () => {
    const t = await login(PROF2.email, PROF2.contrasena);
    expect((await req('POST', '/auth/logout', { token: t })).status).toBe(200);
    expect((await req('GET', '/auth/sesion', { token: t })).status).toBe(401);
  });

  it('CP-SEG-05 cambiar contraseña cierra las otras sesiones de la cuenta', async () => {
    const otra = await login(PROF2.email, PROF2.contrasena);
    const r = await req('POST', '/auth/contrasena', { token: ctx.prof2, body: { actual: PROF2.contrasena, nueva: 'NuevaClave2026' } });
    expect(r.status).toBe(200);
    expect((await req('GET', '/auth/sesion', { token: otra })).status).toBe(401);
    expect((await req('GET', '/auth/sesion', { token: ctx.prof2 })).status).toBe(200);
  });
});

describe('Roles y control de acceso', () => {
  it('CP-SEG-06 una organización no accede al panel de administración (403)', async () => {
    expect((await req('GET', '/admin/?accion=resumen', { token: ctx.org })).status).toBe(403);
  });
  it('CP-SEG-07 un profesional no puede cambiar la configuración de comisiones (403)', async () => {
    expect((await req('PUT', '/configuracion/', { token: ctx.prof, body: {} })).status).toBe(403);
  });
  it('CP-SEG-08 un administrador (no fundador) no puede crear administradores (403)', async () => {
    const email = `admin.${RUN}@ejemplo.test`;
    const c = await req('POST', '/admin/?accion=administradores', {
      token: ctx.fundadora,
      body: { nombre: 'Admin Prueba', email, contrasena: 'Administra2026', rol: 'administrador' },
    });
    expect(c.status).toBe(201);
    ctx.adminId = c.data.id;
    ctx.admin = await login(email, 'Administra2026');
    const r = await req('POST', '/admin/?accion=administradores', {
      token: ctx.admin,
      body: { nombre: 'X', email: `x.${RUN}@ejemplo.test`, contrasena: 'Administra2026', rol: 'fundador' },
    });
    expect(r.status).toBe(403);
  });
  it('CP-SEG-09 una organización no puede usar favoritos con token de profesional (403)', async () => {
    expect((await req('GET', '/favoritos/', { token: ctx.prof })).status).toBe(403);
  });
});

describe('Perfil profesional, documentos y validación', () => {
  it('CP-INT-PRO-01 perfil incompleto se rechaza (presentación < 40)', async () => {
    const r = await req('PUT', '/profesionales/?accion=mi-perfil', { token: ctx.prof, body: { ...PERFIL, presentacion: 'corta' } });
    expect(r.status).toBe(400);
  });
  it('CP-INT-PRO-02 perfil completo pasa a en_revision', async () => {
    const r = await req('PUT', '/profesionales/?accion=mi-perfil', { token: ctx.prof, body: PERFIL });
    expect(r.status).toBe(200);
    expect(r.data.privado.estadoValidacion).toBe('en_revision');
  });
  it('CP-SEG-10 subida de un script PHP renombrado a .pdf se rechaza', async () => {
    const f = new FormData();
    f.append('tipo', 'curriculum');
    f.append('archivo', new Blob(['<?php system($_GET["c"]); ?>'], { type: 'application/pdf' }), 'cv.pdf');
    const r = await req('POST', '/profesionales/?accion=documento', { token: ctx.prof, form: f });
    expect(r.status).toBe(400);
  });
  it('CP-SEG-11 extensión no permitida (.php) se rechaza', async () => {
    const f = new FormData();
    f.append('tipo', 'curriculum');
    f.append('archivo', pdfMinimo(), 'shell.php');
    expect((await req('POST', '/profesionales/?accion=documento', { token: ctx.prof, form: f })).status).toBe(400);
  });
  it('CP-LIM-01 archivo de más de 5 MB se rechaza', async () => {
    const f = new FormData();
    f.append('tipo', 'curriculum');
    const grande = new Uint8Array(5 * 1024 * 1024 + 10);
    grande.set(new TextEncoder().encode('%PDF-1.4\n'));
    f.append('archivo', new Blob([grande], { type: 'application/pdf' }), 'grande.pdf');
    expect((await req('POST', '/profesionales/?accion=documento', { token: ctx.prof, form: f })).status).toBe(400);
  });
  it('CP-INT-PRO-03 subida de PDF válido queda pendiente de revisión', async () => {
    const f = new FormData();
    f.append('tipo', 'curriculum');
    f.append('archivo', pdfMinimo(), 'curriculum.pdf');
    const r = await req('POST', '/profesionales/?accion=documento', { token: ctx.prof, form: f });
    expect(r.status).toBe(201);
    expect(r.data.estado).toBe('pendiente_revision');
    ctx.docId = r.data.id;
  });
  it('CP-SEG-12 otro profesional no puede descargar el documento (IDOR → 403)', async () => {
    const t = await login(PROF2.email, 'NuevaClave2026');
    ctx.prof2 = t;
    expect((await req('GET', `/profesionales/?accion=documento-archivo&id=${ctx.docId}`, { token: t })).status).toBe(403);
  });
  it('CP-SEG-13 el dueño descarga su documento con cabecera nosniff', async () => {
    const r = await req('GET', `/profesionales/?accion=documento-archivo&id=${ctx.docId}`, { token: ctx.prof });
    expect(r.status).toBe(200);
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('content-type')).toContain('application/pdf');
  });
  it('CP-INT-PRO-04 no puede publicar servicios antes de ser validado (409)', async () => {
    const r = await req('POST', '/servicios/', { token: ctx.prof, body: { ...SERVICIO, publicado: true } });
    expect(r.status).toBe(409);
  });
  it('CP-INT-PRO-05 puede guardar el servicio como pausado', async () => {
    const r = await req('POST', '/servicios/', { token: ctx.prof, body: { ...SERVICIO, publicado: false } });
    expect(r.status).toBe(201);
    ctx.servicioId = r.data.id;
  });
  it('CP-INT-ADM-01 validar perfil sin documentos aprobados → 400', async () => {
    const r = await req('POST', `/admin/?accion=validar-profesional&id=${ctx.profId}`, { token: ctx.fundadora, body: { decision: 'validar' } });
    expect(r.status).toBe(400);
  });
  it('CP-INT-ADM-02 administración aprueba documento y valida el perfil', async () => {
    const d = await req('POST', `/admin/?accion=documento-estado&id=${ctx.docId}`, { token: ctx.admin, body: { estado: 'aprobado' } });
    expect(d.status).toBe(200);
    const v = await req('POST', `/admin/?accion=validar-profesional&id=${ctx.profId}`, { token: ctx.admin, body: { decision: 'validar' } });
    expect(v.status).toBe(200);
    expect(v.data.privado.estadoValidacion).toBe('validado');
    expect(v.data.profesional.validadoPorSkilly).toBe(true);
  });
  it('CP-INT-PRO-06 solicitud de revisión del servicio y aprobación por Skilly', async () => {
    const s = await req('POST', `/servicios/?id=${ctx.servicioId}&accion=solicitar-revision`, { token: ctx.prof, body: { mensaje: 'Listo' } });
    expect(s.status).toBe(201);
    expect(s.data.revision.estado).toBe('pendiente');
    const dup = await req('POST', `/servicios/?id=${ctx.servicioId}&accion=solicitar-revision`, { token: ctx.prof, body: {} });
    expect(dup.status).toBe(409);
    const a = await req('POST', `/admin/?accion=resolver-revision&id=${ctx.servicioId}`, { token: ctx.admin, body: { decision: 'aprobar' } });
    expect(a.status).toBe(200);
    expect(a.data.revision.estado).toBe('aprobada');
  });
  it('CP-INT-PRO-07 publicar servicio tras la validación', async () => {
    const r = await req('PUT', `/servicios/?id=${ctx.servicioId}&accion=publicacion`, { token: ctx.prof, body: { publicado: true } });
    expect(r.status).toBe(200);
    expect(r.data.publicado).toBe(true);
  });
  it('CP-SEG-14 otro profesional no puede editar el servicio ajeno (404)', async () => {
    const r = await req('PUT', `/servicios/?id=${ctx.servicioId}`, { token: ctx.prof2, body: { ...SERVICIO, publicado: false } });
    expect(r.status).toBe(404);
  });
  it('CP-INT-DIS-01 horario semanal genera bloques disponibles', async () => {
    const horarios = [0, 1, 2, 3, 4, 5, 6].map((dia) => ({ dia, activo: true, desde: '09:00', hasta: '13:00' }));
    const r = await req('PUT', '/disponibilidad/?accion=horarios', { token: ctx.prof, body: { horarios } });
    expect(r.status).toBe(200);
    const b = await req('GET', `/disponibilidad/?profesional_id=${ctx.profId}`);
    expect(b.status).toBe(200);
    expect(b.data.length).toBeGreaterThan(20);
    ctx.bloques = b.data;
  });
  it('CP-LIM-02 horario con inicio posterior al término → 400', async () => {
    const r = await req('PUT', '/disponibilidad/?accion=horarios', {
      token: ctx.prof,
      body: { horarios: [{ dia: 1, activo: true, desde: '18:00', hasta: '09:00' }] },
    });
    expect(r.status).toBe(400);
  });
});

describe('Catálogo, búsqueda y favoritos', () => {
  it('CP-INT-CAT-01 el servicio publicado aparece en el catálogo público', async () => {
    const r = await req('GET', '/servicios/');
    expect(r.status).toBe(200);
    expect(r.data.items.some((x: any) => x.servicio.id === ctx.servicioId)).toBe(true);
  });
  it('CP-INT-CAT-02 filtro por categoría y texto', async () => {
    const r = await req('GET', `/servicios/?categoria=reclutamiento&texto=${encodeURIComponent(RUN)}`);
    expect(r.status).toBe(200);
    expect(r.data.items.map((x: any) => x.servicio.id)).toEqual([ctx.servicioId]);
  });
  it('CP-INT-CAT-03 filtro por modalidad (INC-02)', async () => {
    const r = await req('GET', `/servicios/?modalidad=hibrido&texto=${encodeURIComponent(RUN)}`);
    expect(r.status).toBe(200);
    expect(r.data.items).toHaveLength(1);
    const r2 = await req('GET', `/servicios/?modalidad=presencial&texto=${encodeURIComponent(RUN)}`);
    expect(r2.status).toBe(200);
    expect(r2.data.items).toHaveLength(0);
  });
  it('CP-LIM-03 rango de precio en el límite exacto incluye el servicio', async () => {
    const r = await req('GET', `/servicios/?precio_min=350000&precio_max=350000&texto=${encodeURIComponent(RUN)}`);
    expect(r.data.items).toHaveLength(1);
    const r2 = await req('GET', `/servicios/?precio_min=350001&texto=${encodeURIComponent(RUN)}`);
    expect(r2.data.items).toHaveLength(0);
  });
  it('CP-SEG-15 inyección SQL en el texto de búsqueda se trata como literal', async () => {
    const r = await req('GET', `/servicios/?texto=${encodeURIComponent("%' OR 1=1 -- ")}`);
    expect(r.status).toBe(200);
    expect(r.data.items).toHaveLength(0);
  });
  it('CP-INT-CAT-04 ficha del servicio con profesional, categoría y reputación', async () => {
    const r = await req('GET', `/servicios/${ctx.servicioId}`);
    expect(r.status).toBe(200);
    expect(r.data.profesional.id).toBe(ctx.profId);
    expect(r.data.categoria.id).toBe('reclutamiento');
    expect(r.data.reputacion.esNuevo).toBe(true);
    expect(r.data.proximoBloque).not.toBeNull();
  });
  it('CP-INT-CAT-05 favoritos: agregar, listar y quitar', async () => {
    const a = await req('POST', '/favoritos/', { token: ctx.org, body: { servicioId: ctx.servicioId } });
    expect(a.status).toBe(201);
    expect(a.data.favoritos).toContain(ctx.servicioId);
    const b = await req('DELETE', `/favoritos/?servicio_id=${ctx.servicioId}`, { token: ctx.org });
    expect(b.data.favoritos).not.toContain(ctx.servicioId);
  });
});

describe('Ciclo completo de contratación', () => {
  it('CP-INT-RES-01 retención de bloque e impedimento de doble retención', async () => {
    const anterior = await req('POST', '/disponibilidad/?accion=retener', {
      token: ctx.org, body: { bloqueId: ctx.bloques[2].id, servicioId: ctx.servicioId },
    });
    expect(anterior.status).toBe(201);
    const bloque = ctx.bloques[3];
    const r = await req('POST', '/disponibilidad/?accion=retener', { token: ctx.org, body: { bloqueId: bloque.id, servicioId: ctx.servicioId } });
    expect(r.status).toBe(201);
    ctx.retencion = r.data;
    await req('DELETE', `/disponibilidad/?accion=retener&id=${anterior.data.id}`, { token: ctx.org });
    expect((await req('GET', `/disponibilidad/?accion=retencion&id=${r.data.id}`, { token: ctx.org })).status).toBe(200);
    const otra = await req('POST', '/disponibilidad/?accion=retener', { token: ctx.org2, body: { bloqueId: bloque.id, servicioId: ctx.servicioId } });
    expect(otra.status).toBe(409);
  });
  it('CP-INT-RES-02 crear reserva sin aceptar condiciones → 400', async () => {
    const solicitud = { retencionId: ctx.retencion.id, condiciones: ctx.retencion.condiciones,
      bloqueId: ctx.retencion.bloqueId, servicioId: ctx.servicioId, modalidad: 'remoto' };
    for (const aceptaCondiciones of [false, 'false', null]) {
      const r = await req('POST', '/reservas/', { token: ctx.org, body: { ...solicitud, aceptaCondiciones } });
      expect(r.status).toBe(400);
    }
    const anterior = { ...solicitud.condiciones, precio: solicitud.condiciones.precio + 1 };
    const cambio = await req('POST', '/reservas/', {
      token: ctx.org, body: { ...solicitud, aceptaCondiciones: true, condiciones: anterior },
    });
    expect(cambio.status).toBe(409);
  });
  it('CP-INT-RES-03 modalidad no ofrecida → 400', async () => {
    const r = await req('POST', '/reservas/', {
      token: ctx.org,
      body: { retencionId: ctx.retencion.id, condiciones: ctx.retencion.condiciones, bloqueId: ctx.retencion.bloqueId, servicioId: ctx.servicioId, modalidad: 'presencial', aceptaCondiciones: true },
    });
    expect(r.status).toBe(400);
  });
  it('CP-INT-RES-04 la organización crea la reserva (SOLICITADA, comisión calculada)', async () => {
    const r = await req('POST', '/reservas/', {
      token: ctx.org,
      body: { retencionId: ctx.retencion.id, condiciones: ctx.retencion.condiciones, bloqueId: ctx.retencion.bloqueId, servicioId: ctx.servicioId, modalidad: 'remoto', mensaje: 'Necesitamos un analista contable', aceptaCondiciones: true },
    });
    expect(r.status).toBe(201);
    expect(r.data.estado).toBe('SOLICITADA');
    expect(r.data.total).toBe(r.data.precio + r.data.comision);
    expect(r.data.codigo).toMatch(/^SK-\d{4}-\d{4}$/);
    ctx.reservaId = r.data.id;
    ctx.inicioOriginal = r.data.inicio;
  });
  it('CP-SEG-16 otra organización no puede ver la reserva ajena (IDOR → 403)', async () => {
    expect((await req('GET', `/reservas/${ctx.reservaId}`, { token: ctx.org2 })).status).toBe(403);
    expect((await req('GET', `/reservas/${ctx.reservaId}`, { token: ctx.prof2 })).status).toBe(403);
  });
  it('CP-INT-RES-05 aprobar sin asignar administrador → 409', async () => {
    expect((await req('POST', `/reservas/?id=${ctx.reservaId}&accion=aprobar-admin`, { token: ctx.admin, body: {} })).status).toBe(409);
  });
  it('CP-INT-RES-06 administración asigna y aprueba la solicitud', async () => {
    const a = await req('POST', `/reservas/?id=${ctx.reservaId}&accion=asignar-administrador`, { token: ctx.admin, body: { administradorId: ctx.adminId } });
    expect(a.status).toBe(200);
    const b = await req('POST', `/reservas/?id=${ctx.reservaId}&accion=aprobar-admin`, { token: ctx.admin, body: {} });
    expect(b.status).toBe(200);
    expect(b.data.estado).toBe('APROBADA_ADMIN');
  });
  it('CP-INT-RES-07 la organización no puede pagar antes de que acepte el profesional (409)', async () => {
    expect((await req('POST', `/reservas/?id=${ctx.reservaId}&accion=pagar`, { token: ctx.org, body: {} })).status).toBe(409);
  });
  it('CP-INT-RES-08 el profesional acepta (PENDIENTE_PAGO) y la organización paga (pago simulado → CONFIRMADA)', async () => {
    const a = await req('POST', `/reservas/?id=${ctx.reservaId}&accion=aceptar-profesional`, { token: ctx.prof, body: {} });
    expect(a.data.estado).toBe('PENDIENTE_PAGO');
    const p = await req('POST', `/reservas/?id=${ctx.reservaId}&accion=pagar`, { token: ctx.org, body: {} });
    expect(p.status).toBe(200);
    expect(p.data.estado).toBe('CONFIRMADA');
    expect(p.data.estadoPago).toBe('confirmado');
  });
  it('CP-INT-CHA-01 chat de coordinación entre las partes; contenido HTML se guarda literal', async () => {
    const xss = '<img src=x onerror=alert(1)>';
    const m = await req('POST', '/chat/', { token: ctx.org, body: { reservaId: ctx.reservaId, texto: xss } });
    expect(m.status).toBe(201);
    const l = await req('GET', `/chat/?reserva_id=${ctx.reservaId}`, { token: ctx.prof });
    expect(l.status).toBe(200);
    expect(l.data.at(-1).texto).toBe(xss);
    expect(l.headers.get('content-type')).toContain('application/json');
  });
  it('CP-SEG-17 un tercero no puede leer el chat (403)', async () => {
    expect((await req('GET', `/chat/?reserva_id=${ctx.reservaId}`, { token: ctx.org2 })).status).toBe(403);
  });
  it('CP-LIM-04 mensaje de chat de más de 5000 caracteres → 400', async () => {
    expect((await req('POST', '/chat/', { token: ctx.org, body: { reservaId: ctx.reservaId, texto: 'a'.repeat(5001) } })).status).toBe(400);
  });
  it('CP-INT-REA-01 la organización solicita reagendar (REAGENDADA con propuesta)', async () => {
    const nuevo = ctx.bloques[10];
    const r = await req('POST', `/reservas/?id=${ctx.reservaId}&accion=reagendar`, { token: ctx.org, body: { bloqueId: nuevo.id, motivo: 'Cambio de agenda' } });
    expect(r.status).toBe(200);
    expect(r.data.estado).toBe('REAGENDADA');
    expect(r.data.reagendamientoPropuesto.inicio).toBe(nuevo.inicio);
    ctx.nuevoInicio = nuevo.inicio;
  });
  it('CP-INT-REA-02 el profesional acepta la nueva fecha (vuelve a CONFIRMADA con el nuevo horario)', async () => {
    const r = await req('POST', `/reservas/?id=${ctx.reservaId}&accion=responder-reagendamiento`, { token: ctx.prof, body: { decision: 'aceptar' } });
    expect(r.status).toBe(200);
    expect(r.data.estado).toBe('CONFIRMADA');
    expect(r.data.inicio).toBe(ctx.nuevoInicio);
    expect(r.data.reagendamientoPropuesto).toBeNull();
    // El horario original vuelve a quedar disponible para otras organizaciones.
    const b = await req('GET', `/disponibilidad/?profesional_id=${ctx.profId}`);
    expect(b.data.some((x: any) => x.inicio === ctx.inicioOriginal)).toBe(true);
  });
  it('CP-INT-RES-09 el profesional marca el trabajo en curso y luego entregado', async () => {
    const c = await req('POST', `/reservas/?id=${ctx.reservaId}&accion=marcar-en-curso`, { token: ctx.prof, body: {} });
    expect(c.data.estado).toBe('EN_CURSO');
    const chat = await req('GET', `/chat/?reserva_id=${ctx.reservaId}`, { token: ctx.org });
    expect(chat.status).toBe(200);
    const e = await req('POST', `/reservas/?id=${ctx.reservaId}&accion=marcar-entregada`, { token: ctx.prof, body: {} });
    expect(e.data.estado).toBe('ENTREGADA');
  });
  it('CP-INT-RES-10 la organización no puede marcar entregada (403)', async () => {
    expect((await req('POST', `/reservas/?id=${ctx.reservaId}&accion=marcar-entregada`, { token: ctx.org, body: {} })).status).toBe(403);
  });
  it('CP-INT-EVA-01 no se puede evaluar sin conformidad (409)', async () => {
    const r = await req('POST', '/evaluaciones/', { token: ctx.org, body: { reservaId: ctx.reservaId, calidad: 4, plazos: 4, comunicacion: 4 } });
    expect(r.status).toBe(409);
  });
  it('CP-INT-RES-11 la organización confirma conformidad (solo una vez)', async () => {
    const r = await req('POST', `/reservas/?id=${ctx.reservaId}&accion=conformidad`, { token: ctx.org, body: {} });
    expect(r.data.conformidadConfirmada).toBe(true);
    expect((await req('POST', `/reservas/?id=${ctx.reservaId}&accion=conformidad`, { token: ctx.org, body: {} })).status).toBe(409);
  });
  it('CP-LIM-05 nivel de evaluación fuera de rango (5) → 400', async () => {
    const r = await req('POST', '/evaluaciones/', { token: ctx.org, body: { reservaId: ctx.reservaId, calidad: 5, plazos: 4, comunicacion: 4 } });
    expect(r.status).toBe(400);
  });
  it('CP-INT-EVA-02 la organización evalúa: reserva EVALUADA y evaluación oculta (ciega)', async () => {
    const r = await req('POST', '/evaluaciones/', {
      token: ctx.org,
      body: { reservaId: ctx.reservaId, calidad: 4, plazos: 3, comunicacion: 4, comentario: 'Excelente proceso, muy ordenado.' },
    });
    expect(r.status).toBe(201);
    expect(r.data.publicada).toBe(false);
    expect(r.data.estadoComentario).toBe('en_revision');
    const res = await req('GET', `/reservas/${ctx.reservaId}`, { token: ctx.org });
    expect(res.data.estado).toBe('EVALUADA');
    expect((await req('POST', '/evaluaciones/', { token: ctx.org, body: { reservaId: ctx.reservaId, calidad: 4, plazos: 4, comunicacion: 4 } })).status).toBe(409);
  });
  it('CP-INT-EVA-03 el profesional evalúa a la organización y ambas se publican', async () => {
    const r = await req('POST', '/evaluaciones/', { token: ctx.prof, body: { reservaId: ctx.reservaId, calidad: 4, plazos: 4, comunicacion: 3 } });
    expect(r.status).toBe(201);
    expect(r.data.publicada).toBe(true);
    const e = await req('GET', `/evaluaciones/?accion=estado&reserva_id=${ctx.reservaId}`, { token: ctx.org });
    expect(e.data.ambasEnviadas).toBe(true);
  });
  it('CP-SEG-18 comentario aún en moderación no se expone públicamente (INC-04)', async () => {
    const r = await req('GET', `/evaluaciones/?profesional_id=${ctx.profId}`);
    expect(r.status).toBe(200);
    expect(r.data.every((e: any) => e.autor === 'organizacion')).toBe(true);
    expect(r.data.some((e: any) => e.comentario === 'Excelente proceso, muy ordenado.')).toBe(false);
  });
  it('CP-INT-EVA-04 moderación aprueba el comentario', async () => {
    const lista = await req('GET', '/evaluaciones/?accion=moderacion', { token: ctx.admin });
    const item = lista.data.find((x: any) => x.evaluacion.reservaId === ctx.reservaId);
    expect(item).toBeTruthy();
    const m = await req('POST', `/evaluaciones/?accion=moderar&id=${item.evaluacion.id}`, { token: ctx.admin, body: { decision: 'aprobar' } });
    expect(m.data.estadoComentario).toBe('aprobado');
  });
});

describe('Cancelación y publicación automática', () => {
  // Antes esta prueba esperaba 'reembolsado' para una solicitud que nunca se pagó (A-12):
  // validaba el defecto. Una cancelación sin pago previo queda 'sin_cobro'.
  it('CP-INT-CAN-01 simulación y cancelación con más de 48 h antes de pagar: sin cobro y bloque liberado', async () => {
    const b = await req('GET', `/disponibilidad/?profesional_id=${ctx.profId}`);
    const bloque = b.data.at(-1);
    const ret = await req('POST', '/disponibilidad/?accion=retener', { token: ctx.org2, body: { bloqueId: bloque.id, servicioId: ctx.servicioId } });
    const res = await req('POST', '/reservas/', {
      token: ctx.org2,
      body: { retencionId: ret.data.id, condiciones: ret.data.condiciones, bloqueId: bloque.id, servicioId: ctx.servicioId, modalidad: 'hibrido', aceptaCondiciones: true },
    });
    expect(res.status).toBe(201);
    ctx.reserva2 = res.data.id;
    const sim = await req('GET', `/reservas/?id=${ctx.reserva2}&accion=simular-cancelacion`, { token: ctx.org2 });
    expect(sim.data.retencionPorcentaje).toBe(0);
    expect(sim.data.pagado).toBe(false);
    const c = await req('POST', `/reservas/?id=${ctx.reserva2}&accion=cancelar`, { token: ctx.org2, body: { motivo: 'Ya no lo necesitamos' } });
    expect(c.data.estado).toBe('CANCELADA');
    expect(c.data.estadoPago).toBe('sin_cobro');
    const b2 = await req('GET', `/disponibilidad/?profesional_id=${ctx.profId}`);
    expect(b2.data.some((x: any) => x.inicio === bloque.inicio)).toBe(true);
    expect((await req('POST', `/reservas/?id=${ctx.reserva2}&accion=cancelar`, { token: ctx.org2, body: {} })).status).toBe(409);
  });
  it('CP-INT-EVA-05 publicación automática cuando vence el plazo y solo una parte evaluó (INC-05)', async () => {
    // Se usa un plazo de 0 días para no esperar 7 días reales; luego se restaura.
    const cfg = await req('GET', '/configuracion/');
    const original = cfg.data;
    const cambio = await req('PUT', '/configuracion/', {
      token: ctx.fundadora,
      body: { ...original, reputacion: { ...original.reputacion, diasPublicacionAutomatica: 0 } },
    });
    expect(cambio.status).toBe(200);
    // Nueva reserva completa en la que solo la organización evalúa.
    const b = await req('GET', `/disponibilidad/?profesional_id=${ctx.profId}`);
    const bloque = b.data[1];
    const ret = await req('POST', '/disponibilidad/?accion=retener', { token: ctx.org, body: { bloqueId: bloque.id, servicioId: ctx.servicioId } });
    const res = await req('POST', '/reservas/', {
      token: ctx.org,
      body: { retencionId: ret.data.id, condiciones: ret.data.condiciones, bloqueId: bloque.id, servicioId: ctx.servicioId, modalidad: 'remoto', aceptaCondiciones: true },
    });
    const id = res.data.id;
    ctx.reserva3 = id;
    await req('POST', `/reservas/?id=${id}&accion=asignar-administrador`, { token: ctx.fundadora, body: { administradorId: ctx.adminId } });
    await req('POST', `/reservas/?id=${id}&accion=aprobar-admin`, { token: ctx.fundadora, body: {} });
    await req('POST', `/reservas/?id=${id}&accion=aceptar-profesional`, { token: ctx.prof, body: {} });
    await req('POST', `/reservas/?id=${id}&accion=pagar`, { token: ctx.org, body: {} });
    await req('POST', `/reservas/?id=${id}&accion=marcar-en-curso`, { token: ctx.prof, body: {} });
    await req('POST', `/reservas/?id=${id}&accion=marcar-entregada`, { token: ctx.prof, body: {} });
    await req('POST', `/reservas/?id=${id}&accion=conformidad`, { token: ctx.org, body: {} });
    const ev = await req('POST', '/evaluaciones/', { token: ctx.org, body: { reservaId: id, calidad: 3, plazos: 3, comunicacion: 3 } });
    expect(ev.status).toBe(201);
    const rep = await req('GET', `/evaluaciones/?accion=reputacion&profesional_id=${ctx.profId}`);
    expect(rep.data.totalHistoricas).toBe(2);
    await req('PUT', '/configuracion/', { token: ctx.fundadora, body: original });
  });
});

describe('Integridad referencial e historial', () => {
  it('CP-INT-INT-01 no se puede eliminar un servicio con historial de contrataciones (INC-03)', async () => {
    await req('PUT', `/servicios/?id=${ctx.servicioId}&accion=publicacion`, { token: ctx.prof, body: { publicado: false } });
    const r = await req('DELETE', `/servicios/${ctx.servicioId}`, { token: ctx.prof });
    expect(r.status).toBe(409);
    const res = await req('GET', `/reservas/${ctx.reservaId}`, { token: ctx.org });
    expect(res.status).toBe(200);
    expect(res.data.historial.length).toBeGreaterThanOrEqual(8);
  });
  it('CP-INT-INT-02 la fundadora no puede borrar un profesional con contrataciones (409) y sus documentos siguen disponibles', async () => {
    const r = await req('DELETE', `/profesionales/${ctx.profId}`, { token: ctx.fundadora });
    expect(r.status).toBe(409);
    const d = await req('GET', `/profesionales/?accion=documento-archivo&id=${ctx.docId}`, { token: ctx.fundadora });
    expect(d.status).toBe(200);
  });
  it('CP-INT-INT-03 un profesional sin historial sí puede eliminarse junto con su cuenta', async () => {
    const r = await req('DELETE', `/profesionales/${ctx.prof2Id}`, { token: ctx.fundadora });
    expect(r.status).toBe(200);
    expect((await req('POST', '/auth/login', { body: { email: PROF2.email, contrasena: 'NuevaClave2026' } })).status).toBe(401);
  });
});

describe('Cabeceras y configuración de seguridad', () => {
  it('CP-SEG-19 CORS: origen permitido recibe Access-Control-Allow-Origin; origen ajeno no', async () => {
    const ok = await req('GET', '/categorias/', { origen: 'http://localhost:5173' });
    expect(ok.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    const malo = await req('GET', '/categorias/', { origen: 'https://sitio-malicioso.example' });
    expect(malo.headers.get('access-control-allow-origin')).toBeNull();
  });
  it('CP-SEG-20 respuestas de la API con cabeceras de endurecimiento (INC-15)', async () => {
    const r = await req('GET', '/categorias/');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('x-frame-options')).toBe('DENY');
    expect(r.headers.get('cache-control')).toContain('no-store');
  });
  it('CP-SEG-21 la respuesta de sesión nunca incluye el hash de la contraseña', async () => {
    const r = await req('GET', '/auth/sesion', { token: ctx.org });
    expect(JSON.stringify(r.data)).not.toMatch(/\$2y\$/);
  });
  it('CP-SEG-22 errores internos no exponen detalles de la base de datos', async () => {
    const r = await req('GET', '/reservas/?id=no-existe', { token: ctx.org });
    expect(r.status).toBe(404);
    expect(JSON.stringify(r.data)).not.toMatch(/SQLSTATE|PDO|mysql/i);
  });
});

describe('Perfil de organización, panel de administración e ingresos', () => {
  it('CP-INT-ORG-01 la organización edita su perfil; correo inválido o ajeno se rechaza', async () => {
    const ok = await req('PUT', '/organizaciones/?accion=me', { token: ctx.org, body: { telefono: '+56 9 1234 5678', descripcion: 'Pyme de servicios contables.' } });
    expect(ok.status).toBe(200);
    expect(ok.data.telefono).toBe('+56 9 1234 5678');
    expect((await req('PUT', '/organizaciones/?accion=me', { token: ctx.org, body: { emailContacto: 'sin-arroba' } })).status).toBe(400);
    expect((await req('PUT', '/organizaciones/?accion=me', { token: ctx.org, body: { emailContacto: ORG2.emailContacto } })).status).toBe(409);
    expect((await req('PUT', '/organizaciones/?accion=me', { token: ctx.org, body: { razonSocial: '   ' } })).status).toBe(400);
  });
  it('CP-INT-ADM-03 el panel de administración resume y lista la operación con nombres', async () => {
    const res = await req('GET', '/admin/?accion=resumen', { token: ctx.admin });
    expect(res.status).toBe(200);
    expect(res.data.reservasPorEstado.EVALUADA).toBeGreaterThanOrEqual(2);
    expect(res.data.reservasPorEstado.CANCELADA).toBeGreaterThanOrEqual(1);
    const lista = await req('GET', '/admin/?accion=reservas', { token: ctx.admin });
    const fila = lista.data.find((x: any) => x.reserva.id === ctx.reservaId);
    expect(fila.organizacion).toBe(ORG.razonSocial);
    expect(fila.servicio).toBe(SERVICIO.titulo);
    expect(fila.reserva.historial.length).toBeGreaterThanOrEqual(8);
    const det = await req('GET', `/admin/?accion=profesional-detalle&id=${ctx.profId}`, { token: ctx.admin });
    expect(det.data.montoFinalizado).toBe(700000);
    expect((await req('GET', '/admin/?accion=organizaciones', { token: ctx.admin })).data.length).toBeGreaterThanOrEqual(2);
  });
  it('CP-INT-ING-01 el profesional obtiene sus contrataciones pagadas para calcular ingresos', async () => {
    const r = await req('GET', '/reservas/?accion=solicitudes-profesional', { token: ctx.prof });
    expect(r.status).toBe(200);
    const pagadas = r.data.filter((x: any) => x.estadoPago === 'confirmado');
    expect(pagadas.map((x: any) => x.id)).toEqual(expect.arrayContaining([ctx.reservaId, ctx.reserva3]));
    expect(pagadas.reduce((s: number, x: any) => s + x.precio, 0)).toBe(700000);
    // Una solicitud cancelada ANTES de que administración la derive nunca llegó al profesional.
    expect(r.data.some((x: any) => x.id === ctx.reserva2)).toBe(false);
    expect((await req('GET', '/reservas/?accion=solicitudes-profesional', { token: ctx.org })).status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Regresión de la auditoría final (T-xx: auditoría propia; A-xx: auditoría externa).
// Cada caso falla con el código anterior a la corrección y pasa con el corregido.
// ---------------------------------------------------------------------------
describe('Correcciones de la auditoría final', () => {
  const R = `reg${RUN}`;
  const reg: Record<string, any> = {};
  let n = 0;
  const nuevaOrg = async (extra: Record<string, unknown> = {}) => {
    n += 1;
    return req('POST', '/organizaciones/', {
      body: {
        razonSocial: `Org regresión ${n} ${R}`, rut: rutValido(31000000 + n * 7919 + (Date.now() % 100000)), giro: 'Consultoría',
        tamano: '1-10', nombreContacto: 'Contacto Regresión', emailContacto: `org${n}.${R}@ejemplo.test`, contrasena: 'Organiza2026',
        consentimiento: true, ...extra,
      },
    });
  };
  /** Profesional validado con un servicio publicado de `minutos` y agenda 09:00-13:00 todos los días. */
  const profesionalConServicio = async (minutos: number) => {
    n += 1;
    const p = await req('POST', '/profesionales/', {
      body: { nombreCompleto: `Regresion Prueba ${n}`, email: `prof${n}.${R}@ejemplo.test`, contrasena: 'Profesional2026', areaPrincipal: 'reclutamiento', consentimiento: true },
    });
    const token = p.data.token;
    const id = p.data.profesional.id;
    await req('PUT', '/profesionales/?accion=mi-perfil', { token, body: PERFIL });
    const f = new FormData();
    f.append('tipo', 'curriculum');
    f.append('archivo', pdfMinimo(), 'cv.pdf');
    const doc = await req('POST', '/profesionales/?accion=documento', { token, form: f });
    await req('POST', `/admin/?accion=documento-estado&id=${doc.data.id}`, { token: ctx.fundadora, body: { estado: 'aprobado' } });
    await req('POST', `/admin/?accion=validar-profesional&id=${id}`, { token: ctx.fundadora, body: { decision: 'validar' } });
    const s = await req('POST', '/servicios/', {
      token, body: { ...SERVICIO, titulo: `Servicio ${minutos} min ${n} ${R}`, duracionSesionMinutos: minutos, publicado: true },
    });
    const horarios = [0, 1, 2, 3, 4, 5, 6].map((dia) => ({ dia, activo: true, desde: '09:00', hasta: '13:00' }));
    await req('PUT', '/disponibilidad/?accion=horarios', { token, body: { horarios } });
    return { token, id, servicioId: s.data.id };
  };
  const reservar = async (org: string, servicioId: string, bloqueId: string) => {
    const ret = await req('POST', '/disponibilidad/?accion=retener', { token: org, body: { bloqueId, servicioId } });
    if (ret.status !== 201) return ret;
    return req('POST', '/reservas/', {
      token: org, body: { retencionId: ret.data.id, condiciones: ret.data.condiciones, bloqueId, servicioId, modalidad: 'remoto', aceptaCondiciones: true },
    });
  };
  const derivarYAceptar = async (id: string, prof: string) => {
    await req('POST', `/reservas/?id=${id}&accion=asignar-administrador`, { token: ctx.fundadora, body: { administradorId: reg.fundadoraId } });
    await req('POST', `/reservas/?id=${id}&accion=aprobar-admin`, { token: ctx.fundadora, body: {} });
    return req('POST', `/reservas/?id=${id}&accion=aceptar-profesional`, { token: prof, body: {} });
  };
  const disponibles = async (profId: string, servicioId?: string) =>
    (await req('GET', `/disponibilidad/?profesional_id=${profId}${servicioId ? `&servicio_id=${servicioId}` : ''}`)).data as any[];

  beforeAll(async () => {
    reg.fundadoraId = (await req('GET', '/auth/sesion', { token: ctx.fundadora })).data.usuario.id;
    reg.org = (await nuevaOrg()).data.token;
    reg.org2 = (await nuevaOrg()).data.token;
    reg.p60 = await profesionalConServicio(60);
    reg.p120 = await profesionalConServicio(120);
  });

  it('CP-REG-01 consentimiento: omitido, false o "false" → 400; aceptado → fecha y versión del servidor (T-06, A-04)', async () => {
    for (const valor of [undefined, false, 'false', 1]) {
      const r = await nuevaOrg({ consentimiento: valor });
      expect(r.status).toBe(400);
    }
    const p = await req('POST', '/profesionales/', {
      body: { nombreCompleto: 'Sin Consentimiento Nadie', email: `sincons.${R}@ejemplo.test`, contrasena: 'Profesional2026', areaPrincipal: 'x' },
    });
    expect(p.status).toBe(400);
    const ok = await nuevaOrg({ consentimientoAceptadoEn: '2001-01-01T00:00:00Z' });
    expect(ok.status).toBe(201);
    const fecha = new Date(ok.data.organizacion.consentimiento.fecha.replace(' ', 'T') + 'Z');
    expect(fecha.getUTCFullYear()).toBe(new Date().getUTCFullYear());
    const cfg = await req('GET', '/configuracion/');
    expect(ok.data.organizacion.consentimiento.version).toBe(cfg.data.versionPoliticaDatos);
  });

  it('CP-REG-02 textos más largos que la columna → 400, no 500 (T-04)', async () => {
    const largo = await req('POST', '/profesionales/', {
      body: { nombreCompleto: `${'A'.repeat(150)} ${'B'.repeat(150)}`, email: `largo.${R}@ejemplo.test`, contrasena: 'Profesional2026', areaPrincipal: 'x', consentimiento: true },
    });
    expect(largo.status).toBe(400);
    expect((await nuevaOrg({ razonSocial: 'X'.repeat(400) })).status).toBe(400);
    const perfil = await req('PUT', '/profesionales/?accion=mi-perfil', { token: reg.p60.token, body: { ...PERFIL, titulo: 'T'.repeat(300) } });
    expect(perfil.status).toBe(400);
  });

  it('CP-REG-03 enlaces: "javascript:" se rechaza y "linkedin.com/in/x" se guarda como https (T-05)', async () => {
    const malo = await req('PUT', '/profesionales/?accion=mi-perfil', { token: reg.p60.token, body: { ...PERFIL, linkedin: 'javascript:alert(1)' } });
    expect(malo.status).toBe(400);
    const sitio = await req('PUT', '/organizaciones/?accion=me', { token: reg.org, body: { sitioWeb: 'javascript:alert(1)' } });
    expect(sitio.status).toBe(400);
    const okSitio = await req('PUT', '/organizaciones/?accion=me', { token: reg.org, body: { sitioWeb: 'mi-empresa.cl' } });
    expect(okSitio.data.sitioWeb).toBe('https://mi-empresa.cl');
  });

  it('CP-REG-04 RUT con espacios no permite duplicar una organización (T-10)', async () => {
    const base = rutValido(32000000 + (Date.now() % 900000));
    const [cuerpo, dv] = base.split('-');
    const a = await nuevaOrg({ rut: `${cuerpo.slice(0, 2)} ${cuerpo.slice(2, 5)} ${cuerpo.slice(5)}-${dv}` });
    expect(a.status).toBe(201);
    expect(a.data.organizacion.rut).toBe(base);
    expect((await nuevaOrg({ rut: base })).status).toBe(409);
  });

  it('CP-REG-05 horas imposibles en la agenda → 400 (A-07)', async () => {
    for (const [desde, hasta] of [['24:00', '25:00'], ['09:00', '99:99'], ['9:00', '10:00']]) {
      const r = await req('PUT', '/disponibilidad/?accion=horarios', { token: reg.p60.token, body: { horarios: [{ dia: 1, activo: true, desde, hasta }] } });
      expect(r.status).toBe(400);
    }
    const b = await req('POST', '/disponibilidad/?accion=bloqueos', { token: reg.p60.token, body: { fecha: '2030-01-07', desde: '10:00', hasta: '24:30' } });
    expect(b.status).toBe(400);
  });

  it('CP-REG-06 un servicio de 120 minutos ocupa dos bloques y solo se ofrecen inicios con tiempo suficiente (A-02)', async () => {
    const libres = await disponibles(reg.p120.id, reg.p120.servicioId);
    expect(libres.length).toBeGreaterThan(0);
    // Con agenda 09:00-13:00 una sesión de 2 horas puede empezar a las 9, 10 u 11, nunca a las 12.
    expect(libres.every((b) => !b.inicio.endsWith('12:00:00'))).toBe(true);
    expect(libres[0].fin.slice(11, 16)).toBe(`${String(Number(libres[0].inicio.slice(11, 13)) + 2).padStart(2, '0')}:00`);
    const bloque = libres.find((b) => b.inicio.endsWith('10:00:00'));
    const res = await reservar(reg.org, reg.p120.servicioId, bloque.id);
    expect(res.status).toBe(201);
    expect(res.data.fin.slice(11, 16)).toBe('12:00');
    reg.res120 = res.data;
    const dia = bloque.inicio.slice(0, 10);
    const sueltos = (await disponibles(reg.p120.id)).filter((b) => b.inicio.startsWith(dia)).map((b) => b.inicio.slice(11, 16));
    expect(sueltos).not.toContain('10:00');
    expect(sueltos).not.toContain('11:00');
    // Otra organización no puede tomar la segunda hora de esa sesión con un servicio de 60 min del mismo profesional.
    const otro = await req('POST', '/servicios/', {
      token: reg.p120.token, body: { ...SERVICIO, titulo: `Breve ${R}`, duracionSesionMinutos: 60, publicado: true },
    });
    const alas11 = (await disponibles(reg.p120.id, otro.data.id)).find((b) => b.inicio === `${dia} 11:00:00`);
    expect(alas11).toBeUndefined();
  });

  it('CP-REG-07 rechazar una solicitud devuelve sus horarios al catálogo de inmediato (A-06)', async () => {
    const id = reg.res120.id;
    const fecha = reg.res120.inicio.slice(0, 10);
    const bloqueo = await req('POST', '/disponibilidad/?accion=bloqueos', {
      token: reg.p120.token, body: { fecha, desde: '10:00', hasta: '11:00' },
    });
    expect(bloqueo.status).toBe(201);
    await req('POST', `/reservas/?id=${id}&accion=asignar-administrador`, { token: ctx.fundadora, body: { administradorId: reg.fundadoraId } });
    const r = await req('POST', `/reservas/?id=${id}&accion=rechazar-admin`, { token: ctx.fundadora, body: { motivo: 'Prueba de liberación' } });
    expect(r.data.estado).toBe('RECHAZADA');
    const dia = reg.res120.inicio.slice(0, 10);
    const sueltos = (await disponibles(reg.p120.id)).filter((b) => b.inicio.startsWith(dia)).map((b) => b.inicio.slice(11, 16));
    expect(sueltos).not.toContain('10:00');
    expect(sueltos).toContain('11:00');
  });

  it('CP-REG-08 dos reservas simultáneas obtienen códigos distintos y correlativos (T-01, A-05)', async () => {
    const libres = await disponibles(reg.p60.id, reg.p60.servicioId);
    const [a, b] = await Promise.all([
      reservar(reg.org, reg.p60.servicioId, libres[2].id),
      reservar(reg.org2, reg.p60.servicioId, libres[3].id),
    ]);
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(a.data.codigo).not.toBe(b.data.codigo);
    const numeros = [a.data.codigo, b.data.codigo].map((c: string) => Number(c.slice(-4))).sort((x, y) => x - y);
    expect(numeros[1] - numeros[0]).toBe(1);
    reg.resA = a.data;
    reg.resB = b.data;
  });

  it('CP-REG-09 una contratación no se puede borrar y las altas siguientes no se bloquean (T-01, T-02, A-11)', async () => {
    expect((await req('DELETE', `/reservas/${reg.resA.id}`, { token: ctx.fundadora })).status).toBe(409);
    expect((await req('DELETE', `/admin/?accion=reserva&id=${reg.resA.id}`, { token: ctx.fundadora })).status).toBe(409);
    const libres = await disponibles(reg.p60.id, reg.p60.servicioId);
    const c = await reservar(reg.org, reg.p60.servicioId, libres[5].id);
    expect(c.status).toBe(201);
    expect(Number(c.data.codigo.slice(-4))).toBeGreaterThan(Number(reg.resB.codigo.slice(-4)));
    expect((await req('GET', `/reservas/${reg.resA.id}`, { token: reg.org })).data.historial.length).toBeGreaterThanOrEqual(1);
  });

  it('CP-REG-10 cancelar antes de pagar no registra reembolso ni retención (A-12)', async () => {
    const sim = await req('GET', `/reservas/?id=${reg.resA.id}&accion=simular-cancelacion`, { token: reg.org });
    expect(sim.data.pagado).toBe(false);
    expect(sim.data.montoRetenido).toBe(0);
    expect(sim.data.montoDevuelto).toBe(0);
    const c = await req('POST', `/reservas/?id=${reg.resA.id}&accion=cancelar`, { token: reg.org, body: { motivo: 'Ya no se necesita' } });
    expect(c.data.estado).toBe('CANCELADA');
    expect(c.data.estadoPago).toBe('sin_cobro');
  });

  it('CP-REG-11 la antelación para la política de cancelación usa la hora real (T-03)', async () => {
    await derivarYAceptar(reg.resB.id, reg.p60.token);
    await req('POST', `/reservas/?id=${reg.resB.id}&accion=pagar`, { token: reg.org2, body: {} });
    const sim = await req('GET', `/reservas/?id=${reg.resB.id}&accion=simular-cancelacion`, { token: reg.org2 });
    expect(sim.data.pagado).toBe(true);
    // Hora de inicio interpretada en America/Santiago, sea cual sea la zona de este equipo.
    const inicio = reg.resB.inicio as string;
    const comoUTC = Date.parse(inicio.replace(' ', 'T') + 'Z');
    const desfase = (() => {
      const partes = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', timeZoneName: 'longOffset' }).formatToParts(new Date(comoUTC));
      const m = /GMT([+-])(\d{2}):(\d{2})/.exec(partes.find((p) => p.type === 'timeZoneName')!.value);
      return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
    })();
    const reales = (comoUTC - desfase * 60000 - Date.now()) / 3600000;
    expect(Math.abs(sim.data.horasAntelacion - reales)).toBeLessThan(0.1);
  });

  it('CP-REG-12 cancelar e iniciar al mismo tiempo: solo una operación gana (A-05)', async () => {
    const [cancelar, iniciar] = await Promise.all([
      req('POST', `/reservas/?id=${reg.resB.id}&accion=cancelar`, { token: reg.org2, body: {} }),
      req('POST', `/reservas/?id=${reg.resB.id}&accion=marcar-en-curso`, { token: reg.p60.token, body: {} }),
    ]);
    const exitos = [cancelar.status, iniciar.status].filter((x) => x === 200).length;
    expect(exitos).toBe(1);
    const final = await req('GET', `/reservas/${reg.resB.id}`, { token: reg.org2 });
    const cambios = final.data.historial.filter((h: any) => ['CANCELADA', 'EN_CURSO'].includes(h.estadoNuevo));
    expect(cambios.length).toBe(1);
    reg.resBFinal = final.data;
  });

  it('CP-REG-13 evaluación ciega también por GET ?reserva_id (A-01)', async () => {
    // Contratación completa hasta la conformidad.
    const libres = await disponibles(reg.p60.id, reg.p60.servicioId);
    const r = await reservar(reg.org, reg.p60.servicioId, libres[8].id);
    const id = r.data.id;
    await derivarYAceptar(id, reg.p60.token);
    await req('POST', `/reservas/?id=${id}&accion=pagar`, { token: reg.org, body: {} });
    await req('POST', `/reservas/?id=${id}&accion=marcar-en-curso`, { token: reg.p60.token, body: {} });
    await req('POST', `/reservas/?id=${id}&accion=marcar-entregada`, { token: reg.p60.token, body: {} });
    await req('POST', `/reservas/?id=${id}&accion=conformidad`, { token: reg.org, body: {} });
    const ev = await req('POST', '/evaluaciones/', { token: reg.org, body: { reservaId: id, calidad: 2, plazos: 3, comunicacion: 4, comentario: 'Comentario privado aún' } });
    expect(ev.status).toBe(201);
    const vistaProf = await req('GET', `/evaluaciones/?reserva_id=${id}`, { token: reg.p60.token });
    expect(vistaProf.status).toBe(200);
    expect(vistaProf.data).toEqual([]);
    const vistaOrg = await req('GET', `/evaluaciones/?reserva_id=${id}`, { token: reg.org });
    expect(vistaOrg.data.length).toBe(1);
    await req('POST', '/evaluaciones/', { token: reg.p60.token, body: { reservaId: id, calidad: 4, plazos: 4, comunicacion: 4 } });
    const tras = await req('GET', `/evaluaciones/?reserva_id=${id}`, { token: reg.p60.token });
    expect(tras.data.length).toBe(2);
    const deOrg = tras.data.find((e: any) => e.autor === 'organizacion');
    expect(deOrg.calidad).toBe(2);
    expect(deOrg.comentario).toBeNull(); // publicado, pero el comentario sigue en moderación
    expect((await req('GET', `/evaluaciones/?reserva_id=${id}`, { token: ctx.fundadora })).data.length).toBe(2);
  });

  it('CP-REG-14 si Skilly devuelve el perfil, sus servicios dejan de ofrecerse y contratarse (A-03)', async () => {
    const p = await profesionalConServicio(60);
    const libres = await disponibles(p.id, p.servicioId);
    const dev = await req('POST', `/admin/?accion=validar-profesional&id=${p.id}`, { token: ctx.fundadora, body: { decision: 'devolver', comentario: 'Falta respaldo del título profesional.' } });
    expect(dev.status).toBe(200);
    const cat = await req('GET', `/servicios/?texto=${encodeURIComponent(`Servicio 60 min`)}`);
    expect(cat.data.items.some((x: any) => x.servicio.id === p.servicioId)).toBe(false);
    expect((await req('GET', `/servicios/${p.servicioId}`)).status).toBe(404);
    expect((await req('GET', `/servicios/?accion=de-profesional&profesional_id=${p.id}`)).data).toEqual([]);
    expect(await disponibles(p.id, p.servicioId)).toEqual([]);
    const intento = await req('POST', '/disponibilidad/?accion=retener', { token: reg.org, body: { bloqueId: libres[0].id, servicioId: p.servicioId } });
    expect(intento.status).toBe(400);
    const editar = await req('PUT', `/servicios/${p.servicioId}`, { token: p.token, body: { ...SERVICIO, titulo: `Editado ${R}`, publicado: true } });
    expect(editar.status).toBe(409);
    expect((await req('GET', `/profesionales/${p.id}`)).status).toBe(404);
    expect((await req('GET', `/profesionales/${p.id}`, { token: ctx.fundadora })).status).toBe(200);
  });

  it('CP-REG-15 cambiar credenciales de un perfil validado lo devuelve a revisión (T-08)', async () => {
    const p = await profesionalConServicio(60);
    const sinCambio = await req('PUT', '/profesionales/?accion=mi-perfil', { token: p.token, body: { ...PERFIL, ciudad: 'Valparaíso' } });
    expect(sinCambio.data.privado.estadoValidacion).toBe('validado');
    const conCambio = await req('PUT', '/profesionales/?accion=mi-perfil', { token: p.token, body: { ...PERFIL, ciudad: 'Valparaíso', formacion: ['Doctorado inventado'] } });
    expect(conCambio.data.privado.estadoValidacion).toBe('en_revision');
    expect(conCambio.data.profesional.validadoPorSkilly).toBe(false);
    expect((await req('GET', `/servicios/${p.servicioId}`)).status).toBe(404);
  });

  it('CP-REG-16 la retención informa su vencimiento en ISO 8601 con desfase horario (A-07)', async () => {
    const libres = await disponibles(reg.p60.id, reg.p60.servicioId);
    const ret = await req('POST', '/disponibilidad/?accion=retener', { token: reg.org2, body: { bloqueId: libres[10].id, servicioId: reg.p60.servicioId } });
    expect(ret.status).toBe(201);
    expect(ret.data.expiraEn).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    const minutos = (Date.parse(ret.data.expiraEn) - Date.now()) / 60000;
    expect(minutos).toBeGreaterThan(8);
    expect(minutos).toBeLessThanOrEqual(10.1);
    expect((await req('DELETE', `/disponibilidad/?accion=retener&id=${ret.data.id}`, { token: reg.org2 })).status).toBe(200);
  });
});

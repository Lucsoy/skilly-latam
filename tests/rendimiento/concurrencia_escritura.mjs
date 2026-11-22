/**
 * Estrés de ESCRITURA (A-08): N organizaciones retienen y reservan al mismo tiempo horarios
 * distintos del mismo profesional, y otras N compiten por UN mismo horario.
 * Comprueba: 0 errores 500, códigos SK únicos y correlativos, y un solo ganador por horario.
 *
 *   node tests/rendimiento/concurrencia_escritura.mjs [N]
 * Requiere la API levantada (SKILLY_API_URL) y una base recién importada o ya usada por
 * las pruebas de integración (usa la clave nueva de la fundadora si ya se cambió).
 */
const API = process.env.SKILLY_API_URL ?? 'http://127.0.0.1:8080/api';
const N = Number(process.argv[2] ?? 12);
const RUN = Date.now().toString(36);
const FUND = { email: 'fundadora@skilly.cl', inicial: 'Skilly#Fundadora2026', nueva: process.env.SKILLY_FUNDADORA_CLAVE_NUEVA ?? 'FundadoraPruebas2026' };

async function req(m, ruta, { token, body, form } = {}) {
  const h = {};
  if (token) h.Authorization = `Bearer ${token}`;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const r = await fetch(API + ruta, { method: m, headers: h, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  const t = await r.text();
  let data = t;
  try { data = JSON.parse(t); } catch {}
  return { status: r.status, data };
}
function rut(c) { let s = 0, m = 2; for (const d of String(c).split('').reverse()) { s += +d * m; m = m === 7 ? 2 : m + 1; } const r = 11 - (s % 11); return `${c}-${r === 11 ? 0 : r === 10 ? 'K' : r}`; }
async function fundadora() {
  let r = await req('POST', '/auth/login', { body: { email: FUND.email, contrasena: FUND.nueva } });
  if (r.status === 200) return r.data;
  r = await req('POST', '/auth/login', { body: { email: FUND.email, contrasena: FUND.inicial } });
  await req('POST', '/auth/contrasena', { token: r.data.token, body: { actual: FUND.inicial, nueva: FUND.nueva } });
  return r.data;
}

const f = await fundadora();
const p = await req('POST', '/profesionales/', { body: { nombreCompleto: 'Estres Escritura Uno', email: `estres.${RUN}@ejemplo.test`, contrasena: 'Profesional2026', areaPrincipal: 'x', consentimiento: true } });
const prof = p.data.token, profId = p.data.profesional.id;
await req('PUT', '/profesionales/?accion=mi-perfil', { token: prof, body: { titulo: 'Consultora', ciudad: 'Santiago', presentacion: 'Presentación suficientemente larga para validar el perfil profesional.', formacion: ['X'], experiencia: [], habilidades: ['Y'] } });
const fd = new FormData(); fd.append('tipo', 'curriculum'); fd.append('archivo', new Blob(['%PDF-1.4\n%%EOF\n'], { type: 'application/pdf' }), 'cv.pdf');
const doc = await req('POST', '/profesionales/?accion=documento', { token: prof, form: fd });
await req('POST', `/admin/?accion=documento-estado&id=${doc.data.id}`, { token: f.token, body: { estado: 'aprobado' } });
await req('POST', `/admin/?accion=validar-profesional&id=${profId}`, { token: f.token, body: { decision: 'validar' } });
const s = await req('POST', '/servicios/', { token: prof, body: { categoriaId: 'reclutamiento', subcategoriaId: 'busqueda-perfiles', titulo: `Estrés ${RUN}`, descripcion: 'Servicio para la prueba de concurrencia de escritura en reservas.', entregables: ['x'], duracionEstimada: '1 semana', duracionSesionMinutos: 60, modalidades: ['remoto'], precio: 100000, etiquetas: [], publicado: true } });
await req('PUT', '/disponibilidad/?accion=horarios', { token: prof, body: { horarios: [0, 1, 2, 3, 4, 5, 6].map((dia) => ({ dia, activo: true, desde: '08:00', hasta: '20:00' })) } });
const bloques = (await req('GET', `/disponibilidad/?profesional_id=${profId}&servicio_id=${s.data.id}`)).data;
const orgs = await Promise.all(Array.from({ length: 2 * N }, (_, i) => req('POST', '/organizaciones/', { body: { razonSocial: `Estrés ${i} ${RUN}`, rut: rut(40000000 + i * 104729 + (Date.now() % 50000)), giro: 'g', tamano: '1-10', nombreContacto: 'c', emailContacto: `e${i}.${RUN}@ejemplo.test`, contrasena: 'Organiza2026', consentimiento: true } })));
const tokens = orgs.map((o) => o.data.token);

const reservar = async (token, bloque) => {
  const ret = await req('POST', '/disponibilidad/?accion=retener', { token, body: { bloqueId: bloque.id, servicioId: s.data.id } });
  if (ret.status !== 201) return ret;
  return req('POST', '/reservas/', { token, body: { retencionId: ret.data.id, condiciones: ret.data.condiciones, bloqueId: bloque.id, servicioId: s.data.id, modalidad: 'remoto', aceptaCondiciones: true } });
};
const t0 = Date.now();
const distintos = await Promise.all(tokens.slice(0, N).map((t, i) => reservar(t, bloques[i])));
const mismo = await Promise.all(tokens.slice(N).map((t) => reservar(t, bloques[N + 1])));
const ms = Date.now() - t0;
const codigos = distintos.filter((r) => r.status === 201).map((r) => r.data.codigo);
const nums = codigos.map((c) => Number(c.slice(-4))).sort((a, b) => a - b);
const resultado = {
  fecha: new Date().toISOString(),
  clientes: 2 * N,
  duracionMs: ms,
  horariosDistintos: { aprobadas: codigos.length, de: N, estados: [...new Set(distintos.map((r) => r.status))], codigosUnicos: new Set(codigos).size === codigos.length, correlativos: nums.every((v, i) => i === 0 || v === nums[i - 1] + 1) },
  mismoHorario: { ganadores: mismo.filter((r) => r.status === 201).length, estados: mismo.map((r) => r.status).sort() },
  errores500: [...distintos, ...mismo].filter((r) => r.status >= 500).length,
};
console.log(JSON.stringify(resultado, null, 2));
const ok = resultado.errores500 === 0 && resultado.horariosDistintos.aprobadas === N && resultado.horariosDistintos.codigosUnicos && resultado.horariosDistintos.correlativos && resultado.mismoHorario.ganadores === 1;
console.log(ok ? 'CONCURRENCIA DE ESCRITURA: APROBADA' : 'CONCURRENCIA DE ESCRITURA: FALLIDA');
process.exit(ok ? 0 : 1);

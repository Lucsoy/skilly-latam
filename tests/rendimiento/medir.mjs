/**
 * Prueba de rendimiento y carga de la API de Skilly.
 *
 * Uso:
 *   node tests/rendimiento/medir.mjs --api http://127.0.0.1:8080/api \
 *        --email fundadora@skilly.cl --clave 'Skilly#Fundadora2026' \
 *        [--secuencial 30] [--concurrencia 10] [--total 200] [--consultas] [--salida resultado.json]
 *
 * Mide, para cada endpoint:
 *   - latencia secuencial (p50, p95, máx) con N peticiones;
 *   - carga concurrente: C clientes simultáneos hasta completar T peticiones
 *     (rendimiento en peticiones/s, p95 y tasa de error);
 *   - opcionalmente, cantidad de sentencias SQL por petición (requiere el
 *     cliente `mariadb`/`mysql` en el PATH y acceso como root sin contraseña).
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, v, i, arr) => {
    if (v.startsWith('--')) acc.push([v.slice(2), arr[i + 1]?.startsWith('--') || arr[i + 1] === undefined ? 'true' : arr[i + 1]]);
    return acc;
  }, []),
);
const API = args.api ?? 'http://127.0.0.1:8080/api';
const SEC = Number(args.secuencial ?? 30);
const CONC = Number(args.concurrencia ?? 10);
const TOTAL = Number(args.total ?? 200);

async function login(email, contrasena) {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, contrasena }),
  });
  if (!r.ok) throw new Error(`Login falló (${r.status}): ${await r.text()}`);
  return (await r.json()).token;
}

function percentil(valores, p) {
  const v = [...valores].sort((a, b) => a - b);
  return v[Math.min(v.length - 1, Math.ceil((p / 100) * v.length) - 1)];
}

function preguntasSQL() {
  try {
    const salida = execFileSync('mariadb', ['-uroot', '-N', '-e', "SHOW GLOBAL STATUS LIKE 'Questions'"]).toString();
    return Number(salida.trim().split(/\s+/)[1]);
  } catch {
    return null;
  }
}

async function unaPeticion(url, token) {
  const t0 = performance.now();
  const r = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const cuerpo = await r.text();
  return { ms: performance.now() - t0, ok: r.ok, status: r.status, bytes: cuerpo.length };
}

async function medir(nombre, ruta, token) {
  const url = `${API}${ruta}`;
  await unaPeticion(url, token); // calentamiento
  let consultas = null;
  if (args.consultas) {
    const antes = preguntasSQL();
    await unaPeticion(url, token);
    const despues = preguntasSQL();
    if (antes !== null && despues !== null) consultas = despues - antes - 1;
  }
  const sec = [];
  for (let i = 0; i < SEC; i++) sec.push(await unaPeticion(url, token));
  const lat = sec.map((x) => x.ms);

  const conc = [];
  let enviadas = 0;
  const t0 = performance.now();
  await Promise.all(
    Array.from({ length: CONC }, async () => {
      while (enviadas < TOTAL) {
        enviadas++;
        conc.push(await unaPeticion(url, token));
      }
    }),
  );
  const duracion = (performance.now() - t0) / 1000;
  const latC = conc.map((x) => x.ms);
  return {
    endpoint: nombre,
    ruta,
    consultasSQLPorPeticion: consultas,
    bytesRespuesta: sec[0]?.bytes ?? 0,
    secuencial: {
      peticiones: SEC,
      p50ms: +percentil(lat, 50).toFixed(1),
      p95ms: +percentil(lat, 95).toFixed(1),
      maxms: +Math.max(...lat).toFixed(1),
      errores: sec.filter((x) => !x.ok).length,
    },
    concurrente: {
      clientes: CONC,
      peticiones: conc.length,
      peticionesPorSegundo: +(conc.length / duracion).toFixed(1),
      p95ms: +percentil(latC, 95).toFixed(1),
      tasaError: +((conc.filter((x) => !x.ok).length / conc.length) * 100).toFixed(2),
    },
  };
}

const token = await login(args.email ?? 'fundadora@skilly.cl', args.clave ?? 'Skilly#Fundadora2026');
const casos = [
  ['Catálogo público (sin filtros)', '/servicios/', null],
  ['Catálogo filtrado (categoría + modalidad + texto)', '/servicios/?categoria=reclutamiento&modalidad=remoto,hibrido&texto=sint', null],
  ['Admin: todas las reservas', '/admin/?accion=reservas', token],
  ['Admin: listado de reservas (endpoint reservas)', '/reservas/?accion=admin-listado', token],
  ['Reputación de un profesional', '/evaluaciones/?accion=reputacion&profesional_id=perf-prof-1', null],
];
const resultados = [];
for (const [nombre, ruta, tk] of casos) {
  const r = await medir(nombre, ruta, tk);
  resultados.push(r);
  console.log(
    `${nombre.padEnd(52)} SQL=${String(r.consultasSQLPorPeticion ?? '-').padStart(5)}  p50=${String(r.secuencial.p50ms).padStart(7)}ms  p95=${String(r.secuencial.p95ms).padStart(7)}ms  conc ${r.concurrente.peticionesPorSegundo} req/s p95=${r.concurrente.p95ms}ms err=${r.concurrente.tasaError}%`,
  );
}
const informe = { fecha: new Date().toISOString(), api: API, parametros: { SEC, CONC, TOTAL }, resultados };
if (args.salida) writeFileSync(args.salida, JSON.stringify(informe, null, 2));

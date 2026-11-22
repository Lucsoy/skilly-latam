/**
 * Genera un volumen de datos SINTÉTICOS para pruebas de rendimiento y carga.
 * Uso:  node tests/rendimiento/semilla.mjs 30 > /tmp/semilla.sql
 *       (30 = cantidad de profesionales; cada uno publica 4 servicios)
 *
 * Todos los registros llevan el prefijo "perf-" para distinguirlos de datos
 * reales y poder borrarlos con:  DELETE FROM cuentas WHERE id LIKE 'perf-%'; ...
 * NO ejecutar en una base con información productiva.
 */
const N = Number(process.argv[2] ?? 30);
const HASH = '$2y$10$LLj/KBVTpsTGcfh7s3c5G.Ql5x7vFVLYXHha85iOYzKIN6KECjM1.'; // "Prueba#2026"
const CATS = [
  ['reclutamiento', 'busqueda-perfiles'],
  ['cultura', 'clima'],
  ['compensaciones', 'bandas'],
  ['capacitacion', 'onboarding'],
  ['administracion', 'contratos'],
  ['finanzas', 'contabilidad'],
];
const MOD = ['remoto', 'presencial', 'hibrido'];
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const out = [];
const pad = (n) => String(n).padStart(2, '0');
const fecha = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

out.push('USE skilly_db;', 'SET FOREIGN_KEY_CHECKS=1;');
const orgs = [];
for (let o = 1; o <= 10; o++) {
  const id = `perf-org-${o}`;
  orgs.push(id);
  out.push(
    `INSERT INTO organizaciones (id,razon_social,rut,giro,tamano,nombre_contacto,email_contacto,consentimiento_aceptado) VALUES (${q(id)},${q('Organización sintética ' + o)},${q(`7600000${o}-${o % 10}`)},'Servicios','11-50',${q('Contacto ' + o)},${q(`perf.org${o}@ejemplo.test`)},1);`,
    `INSERT INTO cuentas (id,email,contrasena,rol,nombre,organizacion_id) VALUES (${q('perf-cta-org-' + o)},${q(`perf.org${o}@ejemplo.test`)},${q(HASH)},'organizacion',${q('Contacto ' + o)},${q(id)});`,
  );
}
let reservas = 0;
const base = new Date();
base.setMinutes(0, 0, 0);
for (let p = 1; p <= N; p++) {
  const pid = `perf-prof-${p}`;
  out.push(
    `INSERT INTO profesionales (id,nombre,apellido,titulo,ciudad,presentacion,validado_por_skilly) VALUES (${q(pid)},${q('Nombre' + p)},${q('Apellido' + p)},'Consultora en personas','Santiago',${q('Presentación sintética para pruebas de rendimiento del profesional ' + p + '.')},1);`,
    `INSERT INTO perfiles_profesionales (profesional_id,email,area_principal,estado_validacion,consentimiento_aceptado) VALUES (${q(pid)},${q(`perf.prof${p}@ejemplo.test`)},'reclutamiento','validado',1);`,
    `INSERT INTO cuentas (id,email,contrasena,rol,nombre,profesional_id) VALUES (${q('perf-cta-prof-' + p)},${q(`perf.prof${p}@ejemplo.test`)},${q(HASH)},'profesional',${q('Nombre' + p + ' Apellido' + p)},${q(pid)});`,
    `INSERT INTO profesional_formacion (profesional_id,descripcion) VALUES (${q(pid)},'Psicología laboral');`,
    `INSERT INTO profesional_habilidades (profesional_id,habilidad) VALUES (${q(pid)},'Selección'),(${q(pid)},'Clima laboral');`,
  );
  for (let s = 1; s <= 4; s++) {
    const sid = `perf-srv-${p}-${s}`;
    const [cat, sub] = CATS[(p + s) % CATS.length];
    out.push(
      `INSERT INTO servicios (id,profesional_id,categoria_id,subcategoria_id,titulo,descripcion,duracion_estimada,duracion_sesion_minutos,precio,publicado) VALUES (${q(sid)},${q(pid)},${q(cat)},${q(sub)},${q(`Servicio sintético ${p}-${s} de ${cat}`)},${q('Descripción sintética suficientemente larga para cumplir la validación de treinta caracteres.')},'2 semanas',60,${100000 + ((p * 7919 + s * 104729) % 900000)},1);`,
      `INSERT INTO servicio_entregables (servicio_id,entregable) VALUES (${q(sid)},'Informe final'),(${q(sid)},'Reunión de cierre');`,
      `INSERT INTO servicio_modalidades (servicio_id,modalidad) VALUES (${q(sid)},${q(MOD[s % 3])});`,
      `INSERT INTO servicio_etiquetas (servicio_id,etiqueta) VALUES (${q(sid)},'pyme'),(${q(sid)},${q(cat)});`,
    );
  }
  // 40 bloques futuros por profesional (días hábiles, 9:00-13:00)
  for (let d = 1, n = 0; n < 40; d++) {
    const dia = new Date(base.getTime() + d * 86400000);
    if (dia.getDay() === 0 || dia.getDay() === 6) continue;
    for (let h = 9; h < 13 && n < 40; h++, n++) {
      const ini = new Date(dia);
      ini.setHours(h, 0, 0, 0);
      const fin = new Date(ini.getTime() + 3600000);
      out.push(
        `INSERT INTO bloques_disponibles (id,profesional_id,inicio,fin) VALUES (${q(`perf-blq-${p}-${n}`)},${q(pid)},${q(fecha(ini))},${q(fecha(fin))});`,
      );
    }
  }
  // 10 reservas EVALUADAS pasadas por profesional, con historial y evaluación publicada
  for (let r = 1; r <= 10; r++) {
    reservas++;
    const rid = `perf-res-${p}-${r}`;
    const org = orgs[(p + r) % orgs.length];
    const ini = new Date(base.getTime() - (r * 3 + 1) * 86400000);
    const fin = new Date(ini.getTime() + 3600000);
    const sid = `perf-srv-${p}-${(r % 4) + 1}`;
    out.push(
      `INSERT INTO reservas (id,codigo,organizacion_id,profesional_id,servicio_id,inicio,fin,modalidad,precio,comision_porcentaje,comision,total,estado,estado_pago,conformidad_confirmada,creada_en) VALUES (${q(rid)},${q(`PF-${String(reservas).padStart(6, '0')}`)},${q(org)},${q(pid)},${q(sid)},${q(fecha(ini))},${q(fecha(fin))},${q(MOD[((r % 4) + 1) % 3])},200000,15.00,30000,230000,'EVALUADA','confirmado',1,${q(fecha(new Date(ini.getTime() - 5 * 86400000)))});`,
    );
    ['SOLICITADA', 'CONFIRMADA', 'EVALUADA'].forEach((e, i) =>
      out.push(
        `INSERT INTO historial_reservas (id,reserva_id,fecha,actor_tipo,actor_nombre,estado_anterior,estado_nuevo) VALUES (${q(`perf-h-${p}-${r}-${i}`)},${q(rid)},${q(fecha(new Date(ini.getTime() - (3 - i) * 86400000)))},'sistema','Semilla',${i ? q(['SOLICITADA', 'CONFIRMADA'][i - 1]) : 'NULL'},${q(e)});`,
      ),
    );
    out.push(
      `INSERT INTO evaluaciones (id,reserva_id,profesional_id,organizacion_id,autor,calidad,plazos,comunicacion,comentario,fecha,publicada,estado_comentario) VALUES (${q(`perf-ev-${p}-${r}`)},${q(rid)},${q(pid)},${q(org)},'organizacion',${(r % 4) + 1},${((r + 1) % 4) + 1},4,${r % 2 ? q('Muy buen trabajo') : 'NULL'},${q(fecha(fin))},1,${r % 2 ? "'aprobado'" : "'sin_comentario'"});`,
    );
  }
}
console.log(out.join('\n'));
console.error(`Semilla: ${N} profesionales, ${N * 4} servicios, ${N * 40} bloques, ${reservas} reservas.`);

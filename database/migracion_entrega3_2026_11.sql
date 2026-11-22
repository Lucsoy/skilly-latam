-- ============================================================================
-- Migración Evaluación 3 (noviembre 2026) — esquema 2026.11-E3
--
-- Para bases skilly_db creadas con una versión anterior de skilly.sql.
-- Orden: (1) si la base es anterior a nov-2026, ejecutar primero
--        migracion_cierre_2026_11.sql; (2) ejecutar este archivo UNA vez.
-- Si importas skilly.sql desde cero, NO hace falta.
--
-- NO borra información de negocio. Solo elimina registros que ya eran
-- inválidos y que impedirían crear las nuevas restricciones:
--   * favoritos de organizaciones que ya no existen;
--   * bloques de disponibilidad duplicados (mismo profesional y hora) sin retención;
--   * filas repetidas de modalidad/insignia/tramo (se conserva la primera).
-- Antes de ejecutar, RESPALDA la base (phpMyAdmin → Exportar) y revisa las
-- consultas de diagnóstico del paso 0: todas deberían devolver 0.
--
-- Requiere MariaDB 10.4+ (XAMPP) por el uso de IF [NOT] EXISTS en ALTER TABLE.
-- Es re-ejecutable: cada sentencia comprueba si el cambio ya está aplicado.
-- ============================================================================

USE skilly_db;

-- 0. Diagnóstico (solo lectura). Si alguna devuelve > 0 en las dos últimas,
--    corrige esos datos a mano antes de continuar: el CHECK fallaría.
SELECT COUNT(*) AS evaluaciones_duplicadas FROM (
  SELECT reserva_id, autor FROM evaluaciones GROUP BY reserva_id, autor HAVING COUNT(*) > 1) d;
SELECT COUNT(*) AS ruts_duplicados_normalizados FROM (
  SELECT UPPER(REPLACE(REPLACE(rut, '.', ''), '-', '')) r FROM organizaciones GROUP BY r HAVING COUNT(*) > 1) d;
SELECT COUNT(*) AS reservas_montos_inconsistentes FROM reservas WHERE total <> precio + comision OR fin <= inicio;

-- 1. Limpieza de registros inválidos (ver encabezado)
DELETE f FROM favoritos f LEFT JOIN organizaciones o ON o.id = f.usuario_id WHERE o.id IS NULL;
UPDATE reservas r LEFT JOIN cuentas c ON c.id = r.administrador_asignado_id
  SET r.administrador_asignado_id = NULL
  WHERE r.administrador_asignado_id IS NOT NULL AND c.id IS NULL;
DELETE b FROM bloques_disponibles b
  JOIN bloques_disponibles b2 ON b2.profesional_id = b.profesional_id AND b2.inicio = b.inicio AND b2.id < b.id
  WHERE NOT EXISTS (SELECT 1 FROM retenciones r WHERE r.bloque_id = b.id);
DELETE m FROM servicio_modalidades m
  JOIN servicio_modalidades m2 ON m2.servicio_id = m.servicio_id AND m2.modalidad = m.modalidad AND m2.id < m.id;
DELETE i FROM profesional_insignias i
  JOIN profesional_insignias i2 ON i2.profesional_id = i.profesional_id AND i2.insignia = i.insignia AND i2.id < i.id;
DELETE t FROM tramos_cancelacion t
  JOIN tramos_cancelacion t2 ON t2.desde_horas = t.desde_horas AND t2.id < t.id;

-- 2. Columnas nuevas
-- RUT normalizado (columna generada): unicidad real sin importar puntos o guion.
ALTER TABLE organizaciones
  ADD COLUMN IF NOT EXISTS rut_normalizado VARCHAR(12)
    GENERATED ALWAYS AS (UPPER(REPLACE(REPLACE(rut, '.', ''), '-', ''))) STORED AFTER rut;
-- Secuencia para ordenar eventos del historial ocurridos en el mismo segundo.
ALTER TABLE historial_reservas
  ADD COLUMN IF NOT EXISTS secuencia BIGINT UNSIGNED NOT NULL AUTO_INCREMENT AFTER id,
  ADD UNIQUE INDEX IF NOT EXISTS uq_historial_secuencia (secuencia);
-- Renumera los eventos existentes en orden cronológico (dos pasadas para no chocar con la unicidad).
UPDATE historial_reservas SET secuencia = secuencia + 1000000000;
SET @n := 0;
UPDATE historial_reservas SET secuencia = (@n := @n + 1) ORDER BY fecha, id;
ALTER TABLE historial_reservas AUTO_INCREMENT = 1;

-- 3. Claves foráneas: se reemplazan las generadas automáticamente (<tabla>_ibfk_N)
--    por FK con nombre y con la política ON DELETE definitiva.
ALTER TABLE bloqueos_disponibilidad DROP FOREIGN KEY IF EXISTS bloqueos_disponibilidad_ibfk_1;
ALTER TABLE bloques_disponibles DROP FOREIGN KEY IF EXISTS bloques_disponibles_ibfk_1;
ALTER TABLE cuentas DROP FOREIGN KEY IF EXISTS cuentas_ibfk_1;
ALTER TABLE cuentas DROP FOREIGN KEY IF EXISTS cuentas_ibfk_2;
ALTER TABLE documentos_respaldo DROP FOREIGN KEY IF EXISTS documentos_respaldo_ibfk_1;
ALTER TABLE evaluaciones DROP FOREIGN KEY IF EXISTS evaluaciones_ibfk_1;
ALTER TABLE evaluaciones DROP FOREIGN KEY IF EXISTS evaluaciones_ibfk_2;
ALTER TABLE evaluaciones DROP FOREIGN KEY IF EXISTS evaluaciones_ibfk_3;
ALTER TABLE favoritos DROP FOREIGN KEY IF EXISTS favoritos_ibfk_1;
ALTER TABLE historial_reservas DROP FOREIGN KEY IF EXISTS historial_reservas_ibfk_1;
ALTER TABLE horarios_semanales DROP FOREIGN KEY IF EXISTS horarios_semanales_ibfk_1;
ALTER TABLE mensajes_chat DROP FOREIGN KEY IF EXISTS mensajes_chat_ibfk_1;
ALTER TABLE mensajes_chat DROP FOREIGN KEY IF EXISTS mensajes_chat_ibfk_2;
ALTER TABLE perfiles_profesionales DROP FOREIGN KEY IF EXISTS perfiles_profesionales_ibfk_1;
ALTER TABLE profesional_experiencia DROP FOREIGN KEY IF EXISTS profesional_experiencia_ibfk_1;
ALTER TABLE profesional_formacion DROP FOREIGN KEY IF EXISTS profesional_formacion_ibfk_1;
ALTER TABLE profesional_habilidades DROP FOREIGN KEY IF EXISTS profesional_habilidades_ibfk_1;
ALTER TABLE profesional_insignias DROP FOREIGN KEY IF EXISTS profesional_insignias_ibfk_1;
ALTER TABLE reservas DROP FOREIGN KEY IF EXISTS reservas_ibfk_1;
ALTER TABLE reservas DROP FOREIGN KEY IF EXISTS reservas_ibfk_2;
ALTER TABLE reservas DROP FOREIGN KEY IF EXISTS reservas_ibfk_3;
ALTER TABLE retenciones DROP FOREIGN KEY IF EXISTS retenciones_ibfk_1;
ALTER TABLE retenciones DROP FOREIGN KEY IF EXISTS retenciones_ibfk_2;
ALTER TABLE retenciones DROP FOREIGN KEY IF EXISTS retenciones_ibfk_3;
ALTER TABLE servicios DROP FOREIGN KEY IF EXISTS servicios_ibfk_1;
ALTER TABLE servicios DROP FOREIGN KEY IF EXISTS servicios_ibfk_2;
ALTER TABLE servicios DROP FOREIGN KEY IF EXISTS servicios_ibfk_3;
ALTER TABLE servicio_entregables DROP FOREIGN KEY IF EXISTS servicio_entregables_ibfk_1;
ALTER TABLE servicio_etiquetas DROP FOREIGN KEY IF EXISTS servicio_etiquetas_ibfk_1;
ALTER TABLE servicio_modalidades DROP FOREIGN KEY IF EXISTS servicio_modalidades_ibfk_1;
ALTER TABLE sesiones_autenticacion DROP FOREIGN KEY IF EXISTS sesiones_autenticacion_ibfk_1;
ALTER TABLE solicitudes_revision_servicio DROP FOREIGN KEY IF EXISTS solicitudes_revision_servicio_ibfk_1;
ALTER TABLE solicitudes_revision_servicio DROP FOREIGN KEY IF EXISTS solicitudes_revision_servicio_ibfk_2;
ALTER TABLE subcategorias DROP FOREIGN KEY IF EXISTS subcategorias_ibfk_1;
ALTER TABLE bloqueos_disponibilidad ADD CONSTRAINT fk_bloqueos_profesional FOREIGN KEY IF NOT EXISTS (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE bloques_disponibles ADD CONSTRAINT fk_bloques_profesional FOREIGN KEY IF NOT EXISTS (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE cuentas ADD CONSTRAINT fk_cuentas_organizacion FOREIGN KEY IF NOT EXISTS (organizacion_id) REFERENCES organizaciones(id) ON DELETE SET NULL;
ALTER TABLE cuentas ADD CONSTRAINT fk_cuentas_profesional FOREIGN KEY IF NOT EXISTS (profesional_id) REFERENCES profesionales(id) ON DELETE SET NULL;
ALTER TABLE documentos_respaldo ADD CONSTRAINT fk_documentos_profesional FOREIGN KEY IF NOT EXISTS (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE evaluaciones ADD CONSTRAINT fk_evaluaciones_organizacion FOREIGN KEY IF NOT EXISTS (organizacion_id) REFERENCES organizaciones(id) ON DELETE CASCADE;
ALTER TABLE evaluaciones ADD CONSTRAINT fk_evaluaciones_profesional FOREIGN KEY IF NOT EXISTS (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE evaluaciones ADD CONSTRAINT fk_evaluaciones_reserva FOREIGN KEY IF NOT EXISTS (reserva_id) REFERENCES reservas(id) ON DELETE CASCADE;
ALTER TABLE favoritos ADD CONSTRAINT fk_favoritos_organizacion FOREIGN KEY IF NOT EXISTS (usuario_id) REFERENCES organizaciones(id) ON DELETE CASCADE;
ALTER TABLE favoritos ADD CONSTRAINT fk_favoritos_servicio FOREIGN KEY IF NOT EXISTS (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE;
ALTER TABLE historial_reservas ADD CONSTRAINT fk_historial_reserva FOREIGN KEY IF NOT EXISTS (reserva_id) REFERENCES reservas(id) ON DELETE CASCADE;
ALTER TABLE horarios_semanales ADD CONSTRAINT fk_horarios_profesional FOREIGN KEY IF NOT EXISTS (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE mensajes_chat ADD CONSTRAINT fk_mensajes_cuenta FOREIGN KEY IF NOT EXISTS (cuenta_id) REFERENCES cuentas(id) ON DELETE CASCADE;
ALTER TABLE mensajes_chat ADD CONSTRAINT fk_mensajes_reserva FOREIGN KEY IF NOT EXISTS (reserva_id) REFERENCES reservas(id) ON DELETE CASCADE;
ALTER TABLE perfiles_profesionales ADD CONSTRAINT fk_perfil_profesional FOREIGN KEY IF NOT EXISTS (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE profesional_experiencia ADD CONSTRAINT fk_experiencia_profesional FOREIGN KEY IF NOT EXISTS (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE profesional_formacion ADD CONSTRAINT fk_formacion_profesional FOREIGN KEY IF NOT EXISTS (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE profesional_habilidades ADD CONSTRAINT fk_habilidades_profesional FOREIGN KEY IF NOT EXISTS (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE profesional_insignias ADD CONSTRAINT fk_insignias_profesional FOREIGN KEY IF NOT EXISTS (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE reservas ADD CONSTRAINT fk_reservas_administrador FOREIGN KEY IF NOT EXISTS (administrador_asignado_id) REFERENCES cuentas(id) ON DELETE SET NULL;
ALTER TABLE reservas ADD CONSTRAINT fk_reservas_organizacion FOREIGN KEY IF NOT EXISTS (organizacion_id) REFERENCES organizaciones(id) ON DELETE RESTRICT;
ALTER TABLE reservas ADD CONSTRAINT fk_reservas_profesional FOREIGN KEY IF NOT EXISTS (profesional_id) REFERENCES profesionales(id) ON DELETE RESTRICT;
ALTER TABLE reservas ADD CONSTRAINT fk_reservas_servicio FOREIGN KEY IF NOT EXISTS (servicio_id) REFERENCES servicios(id) ON DELETE RESTRICT;
ALTER TABLE retenciones ADD CONSTRAINT fk_retenciones_bloque FOREIGN KEY IF NOT EXISTS (bloque_id) REFERENCES bloques_disponibles(id) ON DELETE CASCADE;
ALTER TABLE retenciones ADD CONSTRAINT fk_retenciones_organizacion FOREIGN KEY IF NOT EXISTS (organizacion_id) REFERENCES organizaciones(id) ON DELETE CASCADE;
ALTER TABLE retenciones ADD CONSTRAINT fk_retenciones_servicio FOREIGN KEY IF NOT EXISTS (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE;
ALTER TABLE servicios ADD CONSTRAINT fk_servicios_categoria FOREIGN KEY IF NOT EXISTS (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE servicios ADD CONSTRAINT fk_servicios_profesional FOREIGN KEY IF NOT EXISTS (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE servicios ADD CONSTRAINT fk_servicios_subcategoria FOREIGN KEY IF NOT EXISTS (subcategoria_id) REFERENCES subcategorias(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE servicio_entregables ADD CONSTRAINT fk_entregables_servicio FOREIGN KEY IF NOT EXISTS (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE;
ALTER TABLE servicio_etiquetas ADD CONSTRAINT fk_etiquetas_servicio FOREIGN KEY IF NOT EXISTS (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE;
ALTER TABLE servicio_modalidades ADD CONSTRAINT fk_modalidades_servicio FOREIGN KEY IF NOT EXISTS (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE;
ALTER TABLE sesiones_autenticacion ADD CONSTRAINT fk_sesiones_cuenta FOREIGN KEY IF NOT EXISTS (cuenta_id) REFERENCES cuentas(id) ON DELETE CASCADE;
ALTER TABLE solicitudes_revision_servicio ADD CONSTRAINT fk_revision_profesional FOREIGN KEY IF NOT EXISTS (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE solicitudes_revision_servicio ADD CONSTRAINT fk_revision_servicio FOREIGN KEY IF NOT EXISTS (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE;
ALTER TABLE subcategorias ADD CONSTRAINT fk_subcategorias_categoria FOREIGN KEY IF NOT EXISTS (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Índices y restricciones de unicidad
ALTER TABLE bloqueos_disponibilidad ADD INDEX IF NOT EXISTS idx_bloqueos_profesional_fecha (profesional_id,fecha);
ALTER TABLE bloques_disponibles ADD UNIQUE INDEX IF NOT EXISTS uq_bloque_profesional_inicio (profesional_id,inicio);
ALTER TABLE cuentas ADD INDEX IF NOT EXISTS idx_cuentas_rol (rol);
ALTER TABLE cuentas ADD UNIQUE INDEX IF NOT EXISTS uq_cuentas_email (email);
ALTER TABLE documentos_respaldo ADD INDEX IF NOT EXISTS idx_documentos_profesional (profesional_id,estado);
ALTER TABLE evaluaciones ADD INDEX IF NOT EXISTS idx_evaluaciones_moderacion (estado_comentario,fecha);
ALTER TABLE evaluaciones ADD INDEX IF NOT EXISTS idx_evaluaciones_publicacion (publicada,fecha);
ALTER TABLE evaluaciones ADD INDEX IF NOT EXISTS idx_evaluaciones_reputacion (profesional_id,publicada,autor,fecha);
ALTER TABLE evaluaciones ADD UNIQUE INDEX IF NOT EXISTS uq_evaluacion_reserva_autor (reserva_id,autor);
ALTER TABLE favoritos ADD UNIQUE INDEX IF NOT EXISTS uq_favorito (usuario_id,servicio_id);
ALTER TABLE historial_reservas ADD INDEX IF NOT EXISTS idx_historial_reserva (reserva_id,fecha,secuencia);
ALTER TABLE historial_reservas ADD UNIQUE INDEX IF NOT EXISTS uq_historial_secuencia (secuencia);
ALTER TABLE intentos_login ADD INDEX IF NOT EXISTS idx_intentos_email (email,fecha);
ALTER TABLE intentos_login ADD INDEX IF NOT EXISTS idx_intentos_ip (ip,fecha);
ALTER TABLE mensajes_chat ADD INDEX IF NOT EXISTS idx_mensajes_reserva (reserva_id,enviado_en);
ALTER TABLE organizaciones ADD INDEX IF NOT EXISTS idx_organizaciones_creada (creada_en);
ALTER TABLE organizaciones ADD UNIQUE INDEX IF NOT EXISTS uq_organizaciones_rut (rut);
ALTER TABLE organizaciones ADD UNIQUE INDEX IF NOT EXISTS uq_organizaciones_rut_normalizado (rut_normalizado);
ALTER TABLE perfiles_profesionales ADD INDEX IF NOT EXISTS idx_perfiles_estado (estado_validacion);
ALTER TABLE profesionales ADD INDEX IF NOT EXISTS idx_profesionales_ingreso (fecha_ingreso);
ALTER TABLE profesionales ADD INDEX IF NOT EXISTS idx_profesionales_linkedin (linkedin);
ALTER TABLE profesional_insignias ADD UNIQUE INDEX IF NOT EXISTS uq_insignias_profesional (profesional_id,insignia);
ALTER TABLE reservas ADD INDEX IF NOT EXISTS idx_reservas_estado (estado,creada_en);
ALTER TABLE reservas ADD INDEX IF NOT EXISTS idx_reservas_organizacion (organizacion_id,inicio);
ALTER TABLE reservas ADD INDEX IF NOT EXISTS idx_reservas_profesional (profesional_id,estado);
ALTER TABLE reservas ADD INDEX IF NOT EXISTS idx_reservas_servicio (servicio_id,estado);
ALTER TABLE reservas ADD UNIQUE INDEX IF NOT EXISTS uq_reservas_codigo (codigo);
ALTER TABLE retenciones ADD INDEX IF NOT EXISTS idx_retenciones_bloque (bloque_id,expira_en);
ALTER TABLE retenciones ADD INDEX IF NOT EXISTS idx_retenciones_organizacion (organizacion_id);
ALTER TABLE servicios ADD INDEX IF NOT EXISTS idx_servicios_catalogo (publicado,categoria_id,subcategoria_id);
ALTER TABLE servicios ADD INDEX IF NOT EXISTS idx_servicios_precio (publicado,precio);
ALTER TABLE servicios ADD INDEX IF NOT EXISTS idx_servicios_profesional (profesional_id,publicado);
ALTER TABLE servicio_etiquetas ADD INDEX IF NOT EXISTS idx_etiquetas_etiqueta (etiqueta);
ALTER TABLE servicio_modalidades ADD INDEX IF NOT EXISTS idx_modalidades_modalidad (modalidad,servicio_id);
ALTER TABLE servicio_modalidades ADD UNIQUE INDEX IF NOT EXISTS uq_modalidad_servicio (servicio_id,modalidad);
ALTER TABLE sesiones_autenticacion ADD INDEX IF NOT EXISTS idx_sesion_cuenta (cuenta_id);
ALTER TABLE sesiones_autenticacion ADD INDEX IF NOT EXISTS idx_sesion_expira (expira_en);
ALTER TABLE solicitudes_revision_servicio ADD INDEX IF NOT EXISTS idx_revision_estado (estado);
ALTER TABLE solicitudes_revision_servicio ADD INDEX IF NOT EXISTS idx_revision_servicio (servicio_id,solicitada_en);
ALTER TABLE tramos_cancelacion ADD UNIQUE INDEX IF NOT EXISTS uq_tramos_desde (desde_horas);

-- 5. Restricciones CHECK con nombre. Las antiguas de evaluaciones estaban escritas a
--    nivel de columna; se redefinen las columnas sin ellas y se agregan con nombre.
ALTER TABLE evaluaciones
  MODIFY calidad TINYINT NOT NULL,
  MODIFY plazos TINYINT NOT NULL,
  MODIFY comunicacion TINYINT NOT NULL;
ALTER TABLE bloqueos_disponibilidad ADD CONSTRAINT IF NOT EXISTS chk_bloqueos_rango CHECK (`desde` < `hasta`);
ALTER TABLE bloques_disponibles ADD CONSTRAINT IF NOT EXISTS chk_bloques_rango CHECK (`fin` > `inicio`);
ALTER TABLE configuracion_plataforma ADD CONSTRAINT IF NOT EXISTS chk_configuracion_comisiones CHECK (`comision_porcentaje` between 0 and 50 and `comision_profesional_porcentaje` between 0 and 50 and `comision_organizacion_porcentaje` between 0 and 50);
ALTER TABLE configuracion_plataforma ADD CONSTRAINT IF NOT EXISTS chk_configuracion_reputacion CHECK (`reputacion_minimo_evaluaciones` >= 0 and `reputacion_ventana_max` > 0 and `reputacion_ventana_meses` > 0 and `reputacion_dias_publicacion` >= 0 and `reputacion_max_caracteres` > 0);
ALTER TABLE configuracion_plataforma ADD CONSTRAINT IF NOT EXISTS chk_configuracion_unica CHECK (`id` = 1);
ALTER TABLE documentos_respaldo ADD CONSTRAINT IF NOT EXISTS chk_documentos_tamano CHECK (`tamano_bytes` >= 0);
ALTER TABLE evaluaciones ADD CONSTRAINT IF NOT EXISTS chk_evaluaciones_calidad CHECK (`calidad` between 1 and 4);
ALTER TABLE evaluaciones ADD CONSTRAINT IF NOT EXISTS chk_evaluaciones_comunicacion CHECK (`comunicacion` between 1 and 4);
ALTER TABLE evaluaciones ADD CONSTRAINT IF NOT EXISTS chk_evaluaciones_plazos CHECK (`plazos` between 1 and 4);
ALTER TABLE historial_reservas ADD CONSTRAINT IF NOT EXISTS chk_historial_estado CHECK (`estado_nuevo` in ('SOLICITADA','APROBADA_ADMIN','PENDIENTE_PAGO','CONFIRMADA','EN_CURSO','ENTREGADA','EVALUADA','RECHAZADA','CANCELADA','REAGENDADA'));
ALTER TABLE horarios_semanales ADD CONSTRAINT IF NOT EXISTS chk_horarios_dia CHECK (`dia` between 0 and 6);
ALTER TABLE horarios_semanales ADD CONSTRAINT IF NOT EXISTS chk_horarios_rango CHECK (`desde` < `hasta`);
ALTER TABLE mensajes_chat ADD CONSTRAINT IF NOT EXISTS chk_mensajes_largo CHECK (char_length(`texto`) between 1 and 5000);
ALTER TABLE reservas ADD CONSTRAINT IF NOT EXISTS chk_reservas_montos CHECK (`precio` >= 0 and `comision` >= 0 and `total` = `precio` + `comision`);
ALTER TABLE reservas ADD CONSTRAINT IF NOT EXISTS chk_reservas_rango CHECK (`fin` > `inicio`);
ALTER TABLE reservas ADD CONSTRAINT IF NOT EXISTS chk_reservas_reagenda CHECK (`reagendamiento_inicio` is null or `reagendamiento_fin` > `reagendamiento_inicio`);
ALTER TABLE servicios ADD CONSTRAINT IF NOT EXISTS chk_servicios_duracion CHECK (`duracion_sesion_minutos` > 0);
ALTER TABLE servicios ADD CONSTRAINT IF NOT EXISTS chk_servicios_precio CHECK (`precio` > 0);
ALTER TABLE tramos_cancelacion ADD CONSTRAINT IF NOT EXISTS chk_tramos_valores CHECK (`desde_horas` >= 0 and `retencion_porcentaje` between 0 and 100);

-- 6. Comprobación final: versión del esquema aplicada
SELECT 'Migración 2026.11-E3 aplicada' AS resultado,
  (SELECT COUNT(*) FROM information_schema.referential_constraints WHERE constraint_schema = DATABASE()) AS claves_foraneas,
  (SELECT COUNT(*) FROM information_schema.check_constraints WHERE constraint_schema = DATABASE()) AS restricciones_check;

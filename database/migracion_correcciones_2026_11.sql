-- ============================================================================
-- Migración de correcciones de la auditoría final (noviembre 2026) — esquema 2026.11-E3.1
--
-- Para bases skilly_db que ya tienen el esquema 2026.11-E3 (migracion_entrega3_2026_11.sql).
-- Si importas skilly.sql desde cero, NO hace falta. Es re-ejecutable.
-- Antes de ejecutar, RESPALDA la base (phpMyAdmin → Exportar).
--
-- Cambios:
--   1. Tabla contadores_reserva: código SK-AAAA-NNNN correlativo sin repeticiones (T-01).
--      Se inicializa con el número más alto ya usado en cada año.
--   2. Historial, chat y evaluaciones con ON DELETE RESTRICT hacia reservas: una
--      contratación no se puede borrar ni siquiera directamente (T-02 / A-11).
--   3. Nuevo estado de pago 'sin_cobro' para cancelaciones antes de pagar (A-12).
--   4. rut_normalizado también quita espacios (T-10).
--   5. Tildes y eñes en categorías, subcategorías y tramos (T-12).
--
-- Paso 0 (diagnóstico, debe devolver 0 filas): RUT que quedarían duplicados al quitar espacios.
--   SELECT UPPER(REPLACE(REPLACE(REPLACE(rut,'.',''),'-',''),' ','')) r, COUNT(*) FROM organizaciones GROUP BY r HAVING COUNT(*) > 1;
-- ============================================================================
SET NAMES utf8mb4;
USE skilly_db;

-- 1. Contador de códigos de reserva
CREATE TABLE IF NOT EXISTS contadores_reserva (
  anio   SMALLINT NOT NULL,
  ultimo INT      NOT NULL DEFAULT 0,
  CONSTRAINT pk_contadores_reserva PRIMARY KEY (anio),
  CONSTRAINT chk_contadores_ultimo CHECK (ultimo >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO contadores_reserva (anio, ultimo)
  SELECT CAST(SUBSTRING(codigo, 4, 4) AS UNSIGNED) AS anio, MAX(CAST(SUBSTRING(codigo, 9) AS UNSIGNED)) AS ultimo
  FROM reservas
  WHERE codigo REGEXP '^SK-[0-9]{4}-[0-9]+$'
  GROUP BY anio
ON DUPLICATE KEY UPDATE ultimo = GREATEST(ultimo, VALUES(ultimo));

-- 2. Las contrataciones no se pueden borrar: RESTRICT desde historial, chat y evaluaciones
ALTER TABLE historial_reservas DROP FOREIGN KEY IF EXISTS fk_historial_reserva;
ALTER TABLE historial_reservas ADD CONSTRAINT fk_historial_reserva FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE RESTRICT;
ALTER TABLE mensajes_chat DROP FOREIGN KEY IF EXISTS fk_mensajes_reserva;
ALTER TABLE mensajes_chat ADD CONSTRAINT fk_mensajes_reserva FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE RESTRICT;
ALTER TABLE evaluaciones DROP FOREIGN KEY IF EXISTS fk_evaluaciones_reserva;
ALTER TABLE evaluaciones ADD CONSTRAINT fk_evaluaciones_reserva FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE RESTRICT;

-- 3. Estado de pago para cancelaciones antes de pagar
ALTER TABLE reservas MODIFY estado_pago ENUM('pendiente_confirmacion','confirmado','reembolsado','retenido_parcial','sin_cobro') NOT NULL DEFAULT 'pendiente_confirmacion';
-- Cancelaciones anteriores que nunca se pagaron quedaron marcadas como reembolso: se corrigen.
UPDATE reservas SET estado_pago = 'sin_cobro'
  WHERE estado = 'CANCELADA' AND pago_confirmado_en IS NULL AND estado_pago IN ('reembolsado', 'retenido_parcial');

-- 4. RUT normalizado sin espacios
ALTER TABLE organizaciones DROP INDEX IF EXISTS uq_organizaciones_rut_normalizado;
ALTER TABLE organizaciones MODIFY rut_normalizado VARCHAR(12) GENERATED ALWAYS AS (UPPER(REPLACE(REPLACE(REPLACE(rut, '.', ''), '-', ''), ' ', ''))) STORED;
ALTER TABLE organizaciones ADD CONSTRAINT uq_organizaciones_rut_normalizado UNIQUE (rut_normalizado);

-- 5. Ortografía de los datos iniciales
UPDATE categorias SET nombre = 'Reclutamiento y selección' WHERE id = 'reclutamiento';
UPDATE categorias SET descripcion = 'Mide y mejora cómo se siente trabajar en tu organización.' WHERE id = 'cultura';
UPDATE categorias SET nombre = 'Capacitación y desarrollo', descripcion = 'Onboarding, planes de formación y evaluación de desempeño.' WHERE id = 'capacitacion';
UPDATE categorias SET nombre = 'Administración de personal', descripcion = 'Contratos, remuneraciones y cumplimiento laboral al día.' WHERE id = 'administracion';
UPDATE subcategorias SET nombre = 'Búsqueda y selección de perfiles' WHERE id = 'busqueda-perfiles';
UPDATE subcategorias SET nombre = 'Búsqueda de cargos directivos' WHERE id = 'cargos-directivos';
UPDATE subcategorias SET nombre = 'Diagnóstico de clima' WHERE id = 'clima';
UPDATE subcategorias SET nombre = 'Definición de cultura y valores' WHERE id = 'valores';
UPDATE subcategorias SET nombre = 'Diseño de beneficios' WHERE id = 'beneficios';
UPDATE subcategorias SET nombre = 'Descripción y valoración de cargos' WHERE id = 'valoracion-cargos';
UPDATE subcategorias SET nombre = 'Onboarding e inducción' WHERE id = 'onboarding';
UPDATE subcategorias SET nombre = 'Planes de capacitación' WHERE id = 'planes';
UPDATE subcategorias SET nombre = 'Gestión SENCE' WHERE id = 'sence';
UPDATE subcategorias SET nombre = 'Evaluación de desempeño' WHERE id = 'desempeno';
UPDATE subcategorias SET nombre = 'Contratos y documentación laboral' WHERE id = 'contratos';
UPDATE subcategorias SET nombre = 'Asesoría tributaria' WHERE id = 'tributaria';
UPDATE tramos_cancelacion SET etiqueta = 'Más de 48 horas antes' WHERE desde_horas = 48 AND etiqueta = 'Mas de 48 horas antes';

SELECT 'Migración 2026.11-E3.1 aplicada' AS resultado,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'skilly_db' AND table_type = 'BASE TABLE') AS tablas,
       (SELECT COUNT(*) FROM reservas) AS reservas_conservadas;

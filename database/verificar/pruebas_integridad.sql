-- ============================================================================
-- Pruebas de integridad de la base (CP-BD-05 … CP-BD-14)
-- Ejecutar SOLO sobre una base de PRUEBA con la semilla de rendimiento cargada
-- (tests/rendimiento/semilla.mjs). Cada sentencia debe FALLAR con el error
-- indicado; todo ocurre dentro de una transacción que se revierte al final.
-- Uso: mysql -u root --force skilly_db < database/verificar/pruebas_integridad.sql
-- ============================================================================
USE skilly_db;
START TRANSACTION;
SELECT 'CP-BD-05 CHECK nivel de evaluación fuera de 1..4 → error 4025 esperado' AS caso;
UPDATE evaluaciones SET calidad = 5 WHERE id = 'perf-ev-1-1';
SELECT 'CP-BD-06 CHECK bloque con fin anterior al inicio → error 4025 esperado' AS caso;
INSERT INTO bloques_disponibles (id, profesional_id, inicio, fin) VALUES ('x1', 'perf-prof-1', '2030-01-01 10:00:00', '2030-01-01 09:00:00');
SELECT 'CP-BD-07 CHECK total distinto de precio + comisión → error 4025 esperado' AS caso;
UPDATE reservas SET total = total + 1 WHERE id = 'perf-res-1-1';
SELECT 'CP-BD-08 UNIQUE una evaluación por parte y reserva → error 1062 esperado' AS caso;
INSERT INTO evaluaciones (id, reserva_id, profesional_id, organizacion_id, autor, calidad, plazos, comunicacion)
  SELECT 'dup', reserva_id, profesional_id, organizacion_id, autor, 3, 3, 3 FROM evaluaciones WHERE id = 'perf-ev-1-1';
SELECT 'CP-BD-09 FK RESTRICT: borrar servicio con contrataciones → error 1451 esperado' AS caso;
DELETE FROM servicios WHERE id = 'perf-srv-1-2';
SELECT 'CP-BD-10 FK RESTRICT: borrar profesional con contrataciones → error 1451 esperado' AS caso;
DELETE FROM profesionales WHERE id = 'perf-prof-1';
SELECT 'CP-BD-11 FK favoritos → organización inexistente → error 1452 esperado' AS caso;
INSERT INTO favoritos (usuario_id, servicio_id) VALUES ('org-que-no-existe', 'perf-srv-1-1');
SELECT 'CP-BD-12 UNIQUE RUT normalizado: mismo RUT con puntos → error 1062 esperado' AS caso;
INSERT INTO organizaciones (id, razon_social, rut, giro, tamano, nombre_contacto, email_contacto)
  SELECT 'dup-rut', 'Duplicada', CONCAT(SUBSTRING(rut, 1, 2), '.', SUBSTRING(rut, 3, 3), '.', SUBSTRING(rut, 6)), 'x', '1-10', 'x', 'x@x.cl'
  FROM organizaciones WHERE id = 'perf-org-2';
SELECT 'CP-BD-13 FK RESTRICT: borrar una contratación con historial → error 1451 esperado' AS caso;
DELETE FROM reservas WHERE id = 'perf-res-1-1';
SELECT 'CP-BD-14 UNIQUE RUT normalizado: mismo RUT con espacios → error 1062 esperado' AS caso;
INSERT INTO organizaciones (id, razon_social, rut, giro, tamano, nombre_contacto, email_contacto)
  SELECT 'dup-rut-esp', 'Duplicada', CONCAT(SUBSTRING(rut, 1, 2), ' ', SUBSTRING(rut, 3)), 'x', '1-10', 'x', 'y@x.cl'
  FROM organizaciones WHERE id = 'perf-org-2';
ROLLBACK;
SELECT 'Fin: transacción revertida, la base queda igual' AS resultado;

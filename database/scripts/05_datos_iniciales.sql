-- ============================================================================
-- Skilly LATAM — 05. Datos iniciales (paso 6 de 6)
-- Configuración, tramos de cancelación, categorías y cuenta fundadora. Idempotente.
-- Esquema 2026.11-E3.1. Orden y advertencias: database/README.md
-- ============================================================================

SET NAMES utf8mb4;
USE skilly_db;

-- ---------------------------------------------------------------------------

INSERT INTO configuracion_plataforma (id) VALUES (1)
  ON DUPLICATE KEY UPDATE id = 1;

INSERT INTO tramos_cancelacion (desde_horas, retencion_porcentaje, etiqueta) VALUES
  (48, 0,  'Más de 48 horas antes'),
  (24, 25, 'Entre 24 y 48 horas antes'),
  (0,  50, 'Menos de 24 horas antes o ausencia')
ON DUPLICATE KEY UPDATE desde_horas = desde_horas;

INSERT INTO categorias (id, nombre, descripcion) VALUES
  ('reclutamiento',   'Reclutamiento y selección',   'Encuentra e incorpora a las personas correctas.'),
  ('cultura',         'Cultura y clima',             'Mide y mejora cómo se siente trabajar en tu organización.'),
  ('compensaciones',  'Compensaciones y beneficios', 'Estructuras salariales justas y beneficios que retienen.'),
  ('capacitacion',    'Capacitación y desarrollo',   'Onboarding, planes de formación y evaluación de desempeño.'),
  ('administracion',  'Administración de personal',  'Contratos, remuneraciones y cumplimiento laboral al día.'),
  ('finanzas',        'Finanzas y contabilidad',     'Contabilidad, impuestos y control de caja sin sorpresas.')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion);

INSERT INTO subcategorias (id, categoria_id, nombre) VALUES
  ('busqueda-perfiles',  'reclutamiento',  'Búsqueda y selección de perfiles'),
  ('cargos-directivos',  'reclutamiento',  'Búsqueda de cargos directivos'),
  ('procesos-masivos',   'reclutamiento',  'Procesos masivos'),
  ('marca-empleadora',   'reclutamiento',  'Marca empleadora'),
  ('clima',              'cultura',        'Diagnóstico de clima'),
  ('valores',            'cultura',        'Definición de cultura y valores'),
  ('liderazgo',          'cultura',        'Desarrollo de liderazgo'),
  ('bandas',             'compensaciones', 'Bandas salariales'),
  ('beneficios',         'compensaciones', 'Diseño de beneficios'),
  ('valoracion-cargos',  'compensaciones', 'Descripción y valoración de cargos'),
  ('onboarding',         'capacitacion',   'Onboarding e inducción'),
  ('planes',             'capacitacion',   'Planes de capacitación'),
  ('sence',              'capacitacion',   'Gestión SENCE'),
  ('desempeno',          'capacitacion',   'Evaluación de desempeño'),
  ('contratos',          'administracion', 'Contratos y documentación laboral'),
  ('remuneraciones',     'administracion', 'Remuneraciones y Previred'),
  ('desvinculaciones',   'administracion', 'Desvinculaciones y finiquitos'),
  ('normativa',          'administracion', 'Cumplimiento normativo'),
  ('contabilidad',       'finanzas',       'Contabilidad mensual'),
  ('tributaria',         'finanzas',       'Asesoría tributaria'),
  ('flujo-caja',         'finanzas',       'Flujo de caja y presupuesto')
ON DUPLICATE KEY UPDATE categoria_id = VALUES(categoria_id), nombre = VALUES(nombre);

-- Cuenta fundadora inicial (solo su hash bcrypt queda en la base).
--   Correo:     fundadora@skilly.cl
--   Contraseña: la indicada en SETUP_XAMPP.md. CÁMBIALA al instalar:
--               menú de la cuenta → "Mi cuenta" → "Cambiar contraseña".
INSERT INTO cuentas (id, email, contrasena, rol, nombre)
SELECT 'admin-01', 'fundadora@skilly.cl', '$2y$10$CmwcKFLzDGwsyZlYoxhepelzciwIqKRuEsNiPLbmAY4jACBb5/w1i', 'fundador', 'Fundadora Skilly'
WHERE NOT EXISTS (SELECT 1 FROM cuentas WHERE id = 'admin-01' OR email IN ('fundadora@skilly.cl', 'admin@skilly.cl'));

-- ============================================================================
-- Migración de cierre (noviembre 2026)
-- Ejecutar UNA vez en phpMyAdmin si la base skilly_db ya estaba creada con una
-- versión anterior de skilly.sql. Si importas skilly.sql desde cero, NO hace falta.
-- Requiere MariaDB (la que trae XAMPP) por el uso de "ADD COLUMN IF NOT EXISTS".
-- ============================================================================

USE skilly_db;

-- 1. Solicitudes de revisión de servicios
CREATE TABLE IF NOT EXISTS solicitudes_revision_servicio (
  id               VARCHAR(50)  PRIMARY KEY,
  servicio_id      VARCHAR(50)  NOT NULL,
  profesional_id   VARCHAR(50)  NOT NULL,
  estado           ENUM('pendiente','aprobada','observada') NOT NULL DEFAULT 'pendiente',
  mensaje          TEXT         DEFAULT NULL,
  solicitada_en    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resuelta_en      DATETIME     DEFAULT NULL,
  comentario_admin TEXT         DEFAULT NULL,
  revisado_por     VARCHAR(150) DEFAULT NULL,
  INDEX idx_revision_servicio (servicio_id, solicitada_en),
  INDEX idx_revision_estado (estado),
  FOREIGN KEY (servicio_id)    REFERENCES servicios(id)     ON DELETE CASCADE,
  FOREIGN KEY (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2. Fecha de última edición del servicio (para invalidar revisiones aprobadas)
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS actualizado_en DATETIME DEFAULT NULL;

-- 3. Archivos reales de los documentos de respaldo
ALTER TABLE documentos_respaldo ADD COLUMN IF NOT EXISTS ruta_archivo VARCHAR(255) DEFAULT NULL;
ALTER TABLE documentos_respaldo ADD COLUMN IF NOT EXISTS tipo_mime    VARCHAR(100) DEFAULT NULL;

-- 4. Comentario del administrador al devolver un perfil
ALTER TABLE perfiles_profesionales ADD COLUMN IF NOT EXISTS comentario_validacion TEXT DEFAULT NULL;

-- 5. Límite de intentos de inicio de sesión
CREATE TABLE IF NOT EXISTS intentos_login (
  id        INT          AUTO_INCREMENT PRIMARY KEY,
  email     VARCHAR(255) NOT NULL,
  ip        VARCHAR(45)  NOT NULL,
  fecha     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_intentos_email (email, fecha),
  INDEX idx_intentos_ip (ip, fecha)
) ENGINE=InnoDB;

-- 6. Cuentas huérfanas: profesionales borrados que dejaron su cuenta sin ficha
DELETE FROM cuentas WHERE rol = 'profesional' AND profesional_id IS NULL;

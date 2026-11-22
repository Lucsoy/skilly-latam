-- ============================================================================
-- Skilly LATAM — 02. Claves primarias (paso 3 de 6)
-- Incluye AUTO_INCREMENT, que en MySQL exige que la columna ya sea clave.
-- Esquema 2026.11-E3.1. Orden y advertencias: database/README.md
-- ============================================================================

SET NAMES utf8mb4;
USE skilly_db;

ALTER TABLE categorias ADD CONSTRAINT pk_categorias PRIMARY KEY (id);
ALTER TABLE subcategorias ADD CONSTRAINT pk_subcategorias PRIMARY KEY (id);
ALTER TABLE organizaciones ADD CONSTRAINT pk_organizaciones PRIMARY KEY (id);
ALTER TABLE profesionales ADD CONSTRAINT pk_profesionales PRIMARY KEY (id);
ALTER TABLE profesional_formacion ADD CONSTRAINT pk_profesional_formacion PRIMARY KEY (id);
ALTER TABLE profesional_experiencia ADD CONSTRAINT pk_profesional_experiencia PRIMARY KEY (id);
ALTER TABLE profesional_habilidades ADD CONSTRAINT pk_profesional_habilidades PRIMARY KEY (id);
ALTER TABLE profesional_insignias ADD CONSTRAINT pk_profesional_insignias PRIMARY KEY (id);
ALTER TABLE perfiles_profesionales ADD CONSTRAINT pk_perfiles_profesionales PRIMARY KEY (profesional_id);
ALTER TABLE documentos_respaldo ADD CONSTRAINT pk_documentos_respaldo PRIMARY KEY (id);
ALTER TABLE cuentas ADD CONSTRAINT pk_cuentas PRIMARY KEY (id);
ALTER TABLE sesiones_autenticacion ADD CONSTRAINT pk_sesiones PRIMARY KEY (token_hash);
ALTER TABLE intentos_login ADD CONSTRAINT pk_intentos_login PRIMARY KEY (id);
ALTER TABLE servicios ADD CONSTRAINT pk_servicios PRIMARY KEY (id);
ALTER TABLE servicio_entregables ADD CONSTRAINT pk_servicio_entregables PRIMARY KEY (id);
ALTER TABLE servicio_modalidades ADD CONSTRAINT pk_servicio_modalidades PRIMARY KEY (id);
ALTER TABLE servicio_etiquetas ADD CONSTRAINT pk_servicio_etiquetas PRIMARY KEY (id);
ALTER TABLE solicitudes_revision_servicio ADD CONSTRAINT pk_solicitudes_revision PRIMARY KEY (id);
ALTER TABLE bloques_disponibles ADD CONSTRAINT pk_bloques_disponibles PRIMARY KEY (id);
ALTER TABLE horarios_semanales ADD CONSTRAINT pk_horarios_semanales PRIMARY KEY (profesional_id, dia);
ALTER TABLE bloqueos_disponibilidad ADD CONSTRAINT pk_bloqueos_disponibilidad PRIMARY KEY (id);
ALTER TABLE retenciones ADD CONSTRAINT pk_retenciones PRIMARY KEY (id);
ALTER TABLE reservas ADD CONSTRAINT pk_reservas PRIMARY KEY (id);
ALTER TABLE contadores_reserva ADD CONSTRAINT pk_contadores_reserva PRIMARY KEY (anio);
ALTER TABLE historial_reservas ADD CONSTRAINT pk_historial_reservas PRIMARY KEY (id);
ALTER TABLE historial_reservas ADD CONSTRAINT uq_historial_secuencia UNIQUE (secuencia);
ALTER TABLE mensajes_chat ADD CONSTRAINT pk_mensajes_chat PRIMARY KEY (id);
ALTER TABLE evaluaciones ADD CONSTRAINT pk_evaluaciones PRIMARY KEY (id);
ALTER TABLE favoritos ADD CONSTRAINT pk_favoritos PRIMARY KEY (id);
ALTER TABLE configuracion_plataforma ADD CONSTRAINT pk_configuracion PRIMARY KEY (id);
ALTER TABLE tramos_cancelacion ADD CONSTRAINT pk_tramos_cancelacion PRIMARY KEY (id);
ALTER TABLE profesional_formacion MODIFY id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE profesional_experiencia MODIFY id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE profesional_habilidades MODIFY id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE profesional_insignias MODIFY id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE intentos_login MODIFY id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE servicio_entregables MODIFY id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE servicio_modalidades MODIFY id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE servicio_etiquetas MODIFY id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE historial_reservas MODIFY secuencia BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;
ALTER TABLE favoritos MODIFY id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE tramos_cancelacion MODIFY id INT NOT NULL AUTO_INCREMENT;

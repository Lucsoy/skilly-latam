-- ============================================================================
-- Skilly LATAM — 04. Índices, unicidad y restricciones CHECK (paso 5 de 6)
-- Índices compuestos justificados en docs/02_base_datos/NORMALIZACION_OPTIMIZACION.md
-- Esquema 2026.11-E3.1. Orden y advertencias: database/README.md
-- ============================================================================

SET NAMES utf8mb4;
USE skilly_db;

ALTER TABLE organizaciones ADD CONSTRAINT uq_organizaciones_rut UNIQUE (rut);
ALTER TABLE organizaciones ADD CONSTRAINT uq_organizaciones_rut_normalizado UNIQUE (rut_normalizado);
ALTER TABLE organizaciones ADD INDEX idx_organizaciones_creada (creada_en);
ALTER TABLE profesionales ADD INDEX idx_profesionales_linkedin (linkedin);
ALTER TABLE profesionales ADD INDEX idx_profesionales_ingreso (fecha_ingreso);
ALTER TABLE profesional_insignias ADD CONSTRAINT uq_insignias_profesional UNIQUE (profesional_id, insignia);
ALTER TABLE perfiles_profesionales ADD INDEX idx_perfiles_estado (estado_validacion);
ALTER TABLE documentos_respaldo ADD CONSTRAINT chk_documentos_tamano CHECK (tamano_bytes >= 0);
ALTER TABLE documentos_respaldo ADD INDEX idx_documentos_profesional (profesional_id, estado);
ALTER TABLE cuentas ADD CONSTRAINT uq_cuentas_email UNIQUE (email);
ALTER TABLE cuentas ADD INDEX idx_cuentas_rol (rol);
ALTER TABLE sesiones_autenticacion ADD INDEX idx_sesion_cuenta (cuenta_id);
ALTER TABLE sesiones_autenticacion ADD INDEX idx_sesion_expira (expira_en);
ALTER TABLE intentos_login ADD INDEX idx_intentos_email (email, fecha);
ALTER TABLE intentos_login ADD INDEX idx_intentos_ip (ip, fecha);
ALTER TABLE servicios ADD CONSTRAINT chk_servicios_precio CHECK (precio > 0);
ALTER TABLE servicios ADD CONSTRAINT chk_servicios_duracion CHECK (duracion_sesion_minutos > 0);
ALTER TABLE servicios ADD INDEX idx_servicios_catalogo (publicado, categoria_id, subcategoria_id);
ALTER TABLE servicios ADD INDEX idx_servicios_precio (publicado, precio);
ALTER TABLE servicios ADD INDEX idx_servicios_profesional (profesional_id, publicado);
ALTER TABLE servicio_modalidades ADD CONSTRAINT uq_modalidad_servicio UNIQUE (servicio_id, modalidad);
ALTER TABLE servicio_modalidades ADD INDEX idx_modalidades_modalidad (modalidad, servicio_id);
ALTER TABLE servicio_etiquetas ADD INDEX idx_etiquetas_etiqueta (etiqueta);
ALTER TABLE solicitudes_revision_servicio ADD INDEX idx_revision_servicio (servicio_id, solicitada_en);
ALTER TABLE solicitudes_revision_servicio ADD INDEX idx_revision_estado (estado);
ALTER TABLE bloques_disponibles ADD CONSTRAINT uq_bloque_profesional_inicio UNIQUE (profesional_id, inicio);
ALTER TABLE bloques_disponibles ADD CONSTRAINT chk_bloques_rango CHECK (fin > inicio);
ALTER TABLE horarios_semanales ADD CONSTRAINT chk_horarios_dia CHECK (dia BETWEEN 0 AND 6);
ALTER TABLE horarios_semanales ADD CONSTRAINT chk_horarios_rango CHECK (desde < hasta);
ALTER TABLE bloqueos_disponibilidad ADD CONSTRAINT chk_bloqueos_rango CHECK (desde < hasta);
ALTER TABLE bloqueos_disponibilidad ADD INDEX idx_bloqueos_profesional_fecha (profesional_id, fecha);
ALTER TABLE retenciones ADD INDEX idx_retenciones_bloque (bloque_id, expira_en);
ALTER TABLE retenciones ADD INDEX idx_retenciones_organizacion (organizacion_id);
ALTER TABLE reservas ADD CONSTRAINT uq_reservas_codigo UNIQUE (codigo);
ALTER TABLE reservas ADD CONSTRAINT chk_reservas_rango CHECK (fin > inicio);
ALTER TABLE reservas ADD CONSTRAINT chk_reservas_montos CHECK (precio >= 0 AND comision >= 0 AND total = precio + comision);
ALTER TABLE reservas ADD CONSTRAINT chk_reservas_reagenda CHECK (reagendamiento_inicio IS NULL OR reagendamiento_fin > reagendamiento_inicio);
ALTER TABLE reservas ADD INDEX idx_reservas_organizacion (organizacion_id, inicio);
ALTER TABLE reservas ADD INDEX idx_reservas_profesional (profesional_id, estado);
ALTER TABLE reservas ADD INDEX idx_reservas_estado (estado, creada_en);
ALTER TABLE reservas ADD INDEX idx_reservas_servicio (servicio_id, estado);
ALTER TABLE historial_reservas ADD CONSTRAINT chk_historial_estado CHECK (estado_nuevo IN ('SOLICITADA','APROBADA_ADMIN','PENDIENTE_PAGO','CONFIRMADA','EN_CURSO','ENTREGADA','EVALUADA','RECHAZADA','CANCELADA','REAGENDADA'));
ALTER TABLE historial_reservas ADD INDEX idx_historial_reserva (reserva_id, fecha, secuencia);
ALTER TABLE mensajes_chat ADD CONSTRAINT chk_mensajes_largo CHECK (CHAR_LENGTH(texto) BETWEEN 1 AND 5000);
ALTER TABLE mensajes_chat ADD INDEX idx_mensajes_reserva (reserva_id, enviado_en);
ALTER TABLE evaluaciones ADD CONSTRAINT uq_evaluacion_reserva_autor UNIQUE (reserva_id, autor);
ALTER TABLE evaluaciones ADD CONSTRAINT chk_evaluaciones_calidad CHECK (calidad BETWEEN 1 AND 4);
ALTER TABLE evaluaciones ADD CONSTRAINT chk_evaluaciones_plazos CHECK (plazos BETWEEN 1 AND 4);
ALTER TABLE evaluaciones ADD CONSTRAINT chk_evaluaciones_comunicacion CHECK (comunicacion BETWEEN 1 AND 4);
ALTER TABLE evaluaciones ADD INDEX idx_evaluaciones_reputacion (profesional_id, publicada, autor, fecha);
ALTER TABLE evaluaciones ADD INDEX idx_evaluaciones_moderacion (estado_comentario, fecha);
ALTER TABLE evaluaciones ADD INDEX idx_evaluaciones_publicacion (publicada, fecha);
ALTER TABLE favoritos ADD CONSTRAINT uq_favorito UNIQUE (usuario_id, servicio_id);
ALTER TABLE configuracion_plataforma ADD CONSTRAINT chk_configuracion_unica CHECK (id = 1);
ALTER TABLE configuracion_plataforma ADD CONSTRAINT chk_configuracion_comisiones CHECK (comision_porcentaje BETWEEN 0 AND 50 AND comision_profesional_porcentaje BETWEEN 0 AND 50 AND comision_organizacion_porcentaje BETWEEN 0 AND 50);
ALTER TABLE configuracion_plataforma ADD CONSTRAINT chk_configuracion_reputacion CHECK (reputacion_minimo_evaluaciones >= 0 AND reputacion_ventana_max > 0 AND reputacion_ventana_meses > 0 AND reputacion_dias_publicacion >= 0 AND reputacion_max_caracteres > 0);
ALTER TABLE tramos_cancelacion ADD CONSTRAINT uq_tramos_desde UNIQUE (desde_horas);
ALTER TABLE tramos_cancelacion ADD CONSTRAINT chk_tramos_valores CHECK (desde_horas >= 0 AND retencion_porcentaje BETWEEN 0 AND 100);
ALTER TABLE contadores_reserva ADD CONSTRAINT chk_contadores_ultimo CHECK (ultimo >= 0);

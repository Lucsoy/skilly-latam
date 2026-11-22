-- ============================================================================
-- Skilly LATAM — 03. Claves foráneas (paso 4 de 6)
-- Requiere 01 y 02. RESTRICT protege el historial de contrataciones.
-- Esquema 2026.11-E3.1. Orden y advertencias: database/README.md
-- ============================================================================

SET NAMES utf8mb4;
USE skilly_db;

ALTER TABLE subcategorias ADD CONSTRAINT fk_subcategorias_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE profesional_formacion ADD CONSTRAINT fk_formacion_profesional FOREIGN KEY (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE profesional_experiencia ADD CONSTRAINT fk_experiencia_profesional FOREIGN KEY (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE profesional_habilidades ADD CONSTRAINT fk_habilidades_profesional FOREIGN KEY (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE profesional_insignias ADD CONSTRAINT fk_insignias_profesional FOREIGN KEY (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE perfiles_profesionales ADD CONSTRAINT fk_perfil_profesional FOREIGN KEY (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE documentos_respaldo ADD CONSTRAINT fk_documentos_profesional FOREIGN KEY (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE cuentas ADD CONSTRAINT fk_cuentas_organizacion FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE SET NULL;
ALTER TABLE cuentas ADD CONSTRAINT fk_cuentas_profesional FOREIGN KEY (profesional_id) REFERENCES profesionales(id) ON DELETE SET NULL;
ALTER TABLE sesiones_autenticacion ADD CONSTRAINT fk_sesiones_cuenta FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE CASCADE;
ALTER TABLE servicios ADD CONSTRAINT fk_servicios_profesional FOREIGN KEY (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE servicios ADD CONSTRAINT fk_servicios_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE servicios ADD CONSTRAINT fk_servicios_subcategoria FOREIGN KEY (subcategoria_id) REFERENCES subcategorias(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE servicio_entregables ADD CONSTRAINT fk_entregables_servicio FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE;
ALTER TABLE servicio_modalidades ADD CONSTRAINT fk_modalidades_servicio FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE;
ALTER TABLE servicio_etiquetas ADD CONSTRAINT fk_etiquetas_servicio FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE;
ALTER TABLE solicitudes_revision_servicio ADD CONSTRAINT fk_revision_servicio FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE;
ALTER TABLE solicitudes_revision_servicio ADD CONSTRAINT fk_revision_profesional FOREIGN KEY (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE bloques_disponibles ADD CONSTRAINT fk_bloques_profesional FOREIGN KEY (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE horarios_semanales ADD CONSTRAINT fk_horarios_profesional FOREIGN KEY (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE bloqueos_disponibilidad ADD CONSTRAINT fk_bloqueos_profesional FOREIGN KEY (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE retenciones ADD CONSTRAINT fk_retenciones_bloque FOREIGN KEY (bloque_id) REFERENCES bloques_disponibles(id) ON DELETE CASCADE;
ALTER TABLE retenciones ADD CONSTRAINT fk_retenciones_servicio FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE;
ALTER TABLE retenciones ADD CONSTRAINT fk_retenciones_organizacion FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE CASCADE;
ALTER TABLE reservas ADD CONSTRAINT fk_reservas_organizacion FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE RESTRICT;
ALTER TABLE reservas ADD CONSTRAINT fk_reservas_profesional FOREIGN KEY (profesional_id) REFERENCES profesionales(id) ON DELETE RESTRICT;
ALTER TABLE reservas ADD CONSTRAINT fk_reservas_servicio FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE RESTRICT;
ALTER TABLE reservas ADD CONSTRAINT fk_reservas_administrador FOREIGN KEY (administrador_asignado_id) REFERENCES cuentas(id) ON DELETE SET NULL;
ALTER TABLE historial_reservas ADD CONSTRAINT fk_historial_reserva FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE RESTRICT;
ALTER TABLE mensajes_chat ADD CONSTRAINT fk_mensajes_reserva FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE RESTRICT;
ALTER TABLE mensajes_chat ADD CONSTRAINT fk_mensajes_cuenta FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE CASCADE;
ALTER TABLE evaluaciones ADD CONSTRAINT fk_evaluaciones_reserva FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE RESTRICT;
ALTER TABLE evaluaciones ADD CONSTRAINT fk_evaluaciones_profesional FOREIGN KEY (profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE;
ALTER TABLE evaluaciones ADD CONSTRAINT fk_evaluaciones_organizacion FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE CASCADE;
ALTER TABLE favoritos ADD CONSTRAINT fk_favoritos_organizacion FOREIGN KEY (usuario_id) REFERENCES organizaciones(id) ON DELETE CASCADE;
ALTER TABLE favoritos ADD CONSTRAINT fk_favoritos_servicio FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE;

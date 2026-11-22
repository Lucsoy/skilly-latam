-- !!! ADVERTENCIA — SCRIPT DESTRUCTIVO !!!
-- Elimina TODAS las claves foráneas de skilly_db (los datos quedan sin integridad referencial).
-- Ejecútalo SOLO sobre una base de pruebas o después de exportar un respaldo.
-- No forma parte de la instalación normal.

USE skilly_db;

ALTER TABLE subcategorias DROP FOREIGN KEY IF EXISTS fk_subcategorias_categoria;
ALTER TABLE profesional_formacion DROP FOREIGN KEY IF EXISTS fk_formacion_profesional;
ALTER TABLE profesional_experiencia DROP FOREIGN KEY IF EXISTS fk_experiencia_profesional;
ALTER TABLE profesional_habilidades DROP FOREIGN KEY IF EXISTS fk_habilidades_profesional;
ALTER TABLE profesional_insignias DROP FOREIGN KEY IF EXISTS fk_insignias_profesional;
ALTER TABLE perfiles_profesionales DROP FOREIGN KEY IF EXISTS fk_perfil_profesional;
ALTER TABLE documentos_respaldo DROP FOREIGN KEY IF EXISTS fk_documentos_profesional;
ALTER TABLE cuentas DROP FOREIGN KEY IF EXISTS fk_cuentas_organizacion;
ALTER TABLE cuentas DROP FOREIGN KEY IF EXISTS fk_cuentas_profesional;
ALTER TABLE sesiones_autenticacion DROP FOREIGN KEY IF EXISTS fk_sesiones_cuenta;
ALTER TABLE servicios DROP FOREIGN KEY IF EXISTS fk_servicios_profesional;
ALTER TABLE servicios DROP FOREIGN KEY IF EXISTS fk_servicios_categoria;
ALTER TABLE servicios DROP FOREIGN KEY IF EXISTS fk_servicios_subcategoria;
ALTER TABLE servicio_entregables DROP FOREIGN KEY IF EXISTS fk_entregables_servicio;
ALTER TABLE servicio_modalidades DROP FOREIGN KEY IF EXISTS fk_modalidades_servicio;
ALTER TABLE servicio_etiquetas DROP FOREIGN KEY IF EXISTS fk_etiquetas_servicio;
ALTER TABLE solicitudes_revision_servicio DROP FOREIGN KEY IF EXISTS fk_revision_servicio;
ALTER TABLE solicitudes_revision_servicio DROP FOREIGN KEY IF EXISTS fk_revision_profesional;
ALTER TABLE bloques_disponibles DROP FOREIGN KEY IF EXISTS fk_bloques_profesional;
ALTER TABLE horarios_semanales DROP FOREIGN KEY IF EXISTS fk_horarios_profesional;
ALTER TABLE bloqueos_disponibilidad DROP FOREIGN KEY IF EXISTS fk_bloqueos_profesional;
ALTER TABLE retenciones DROP FOREIGN KEY IF EXISTS fk_retenciones_bloque;
ALTER TABLE retenciones DROP FOREIGN KEY IF EXISTS fk_retenciones_servicio;
ALTER TABLE retenciones DROP FOREIGN KEY IF EXISTS fk_retenciones_organizacion;
ALTER TABLE reservas DROP FOREIGN KEY IF EXISTS fk_reservas_organizacion;
ALTER TABLE reservas DROP FOREIGN KEY IF EXISTS fk_reservas_profesional;
ALTER TABLE reservas DROP FOREIGN KEY IF EXISTS fk_reservas_servicio;
ALTER TABLE reservas DROP FOREIGN KEY IF EXISTS fk_reservas_administrador;
ALTER TABLE historial_reservas DROP FOREIGN KEY IF EXISTS fk_historial_reserva;
ALTER TABLE mensajes_chat DROP FOREIGN KEY IF EXISTS fk_mensajes_reserva;
ALTER TABLE mensajes_chat DROP FOREIGN KEY IF EXISTS fk_mensajes_cuenta;
ALTER TABLE evaluaciones DROP FOREIGN KEY IF EXISTS fk_evaluaciones_reserva;
ALTER TABLE evaluaciones DROP FOREIGN KEY IF EXISTS fk_evaluaciones_profesional;
ALTER TABLE evaluaciones DROP FOREIGN KEY IF EXISTS fk_evaluaciones_organizacion;
ALTER TABLE favoritos DROP FOREIGN KEY IF EXISTS fk_favoritos_organizacion;
ALTER TABLE favoritos DROP FOREIGN KEY IF EXISTS fk_favoritos_servicio;

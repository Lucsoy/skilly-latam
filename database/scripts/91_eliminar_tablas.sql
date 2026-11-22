-- !!! ADVERTENCIA — SCRIPT DESTRUCTIVO !!!
-- ELIMINA TODAS LAS TABLAS Y SUS DATOS de skilly_db. Ejecutar 90 antes, o se usa FOREIGN_KEY_CHECKS=0.
-- Ejecútalo SOLO sobre una base de pruebas o después de exportar un respaldo.
-- No forma parte de la instalación normal.

USE skilly_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS tramos_cancelacion;
DROP TABLE IF EXISTS configuracion_plataforma;
DROP TABLE IF EXISTS favoritos;
DROP TABLE IF EXISTS evaluaciones;
DROP TABLE IF EXISTS mensajes_chat;
DROP TABLE IF EXISTS historial_reservas;
DROP TABLE IF EXISTS contadores_reserva;
DROP TABLE IF EXISTS reservas;
DROP TABLE IF EXISTS retenciones;
DROP TABLE IF EXISTS bloqueos_disponibilidad;
DROP TABLE IF EXISTS horarios_semanales;
DROP TABLE IF EXISTS bloques_disponibles;
DROP TABLE IF EXISTS solicitudes_revision_servicio;
DROP TABLE IF EXISTS servicio_etiquetas;
DROP TABLE IF EXISTS servicio_modalidades;
DROP TABLE IF EXISTS servicio_entregables;
DROP TABLE IF EXISTS servicios;
DROP TABLE IF EXISTS intentos_login;
DROP TABLE IF EXISTS sesiones_autenticacion;
DROP TABLE IF EXISTS cuentas;
DROP TABLE IF EXISTS documentos_respaldo;
DROP TABLE IF EXISTS perfiles_profesionales;
DROP TABLE IF EXISTS profesional_insignias;
DROP TABLE IF EXISTS profesional_habilidades;
DROP TABLE IF EXISTS profesional_experiencia;
DROP TABLE IF EXISTS profesional_formacion;
DROP TABLE IF EXISTS profesionales;
DROP TABLE IF EXISTS organizaciones;
DROP TABLE IF EXISTS subcategorias;
DROP TABLE IF EXISTS categorias;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- Skilly LATAM — Esquema completo de base de datos (MySQL 8 / MariaDB 10.4+)
-- Versión de esquema: 2026.11-E3.1 (Evaluación 3, con correcciones de la auditoría final)
--
-- Uso: importar en phpMyAdmin (XAMPP) o ejecutar con el cliente mysql:
--     mysql -u root < database/skilly.sql
--
-- Es IDEMPOTENTE: usa CREATE TABLE IF NOT EXISTS y no borra datos. Si la base
-- ya existía con una versión anterior, ejecutar además:
--     database/migracion_cierre_2026_11.sql      (solo si es anterior a nov-2026)
--     database/migracion_entrega3_2026_11.sql    (cambios de esta entrega)
--
-- El mismo modelo físico está separado por responsabilidad en database/scripts/
-- (tablas, claves primarias, claves foráneas, índices, datos y scripts de
-- eliminación). Ver database/README.md para el orden de ejecución.
--
-- Convenciones:
--   * PK de entidades de negocio: VARCHAR(50) con prefijo legible ("res-…").
--   * PK de tablas de detalle multivaluado: INT AUTO_INCREMENT.
--   * FK con nombre explícito fk_<tabla>_<referencia>.
--   * ON DELETE RESTRICT donde borrar dejaría sin historial a una contratación;
--     CASCADE solo en datos dependientes que no tienen sentido sin su padre.
-- ============================================================================

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS skilly_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE skilly_db;

-- ---------------------------------------------------------------------------
-- Catálogo: categorías y subcategorías
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categorias (
  id          VARCHAR(50)  NOT NULL,
  nombre      VARCHAR(150) NOT NULL,
  descripcion TEXT         NOT NULL,
  CONSTRAINT pk_categorias PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subcategorias (
  id           VARCHAR(50)  NOT NULL,
  categoria_id VARCHAR(50)  NOT NULL,
  nombre       VARCHAR(150) NOT NULL,
  CONSTRAINT pk_subcategorias PRIMARY KEY (id),
  CONSTRAINT fk_subcategorias_categoria FOREIGN KEY (categoria_id)
    REFERENCES categorias(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Organizaciones (clientes)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS organizaciones (
  id                      VARCHAR(50)  NOT NULL,
  razon_social            VARCHAR(255) NOT NULL,
  rut                     VARCHAR(20)  NOT NULL,
  -- RUT sin puntos ni guion y con K mayúscula: garantiza unicidad sin importar el formato escrito.
  rut_normalizado         VARCHAR(12)  GENERATED ALWAYS AS (UPPER(REPLACE(REPLACE(REPLACE(rut, '.', ''), '-', ''), ' ', ''))) STORED,
  giro                    VARCHAR(255) NOT NULL,
  tamano                  ENUM('1-10','11-50','51-200','201-500','500+') NOT NULL,
  nombre_contacto         VARCHAR(255) NOT NULL,
  email_contacto          VARCHAR(255) NOT NULL,
  telefono                VARCHAR(50)  DEFAULT NULL,
  sitio_web               VARCHAR(255) DEFAULT NULL,
  descripcion             TEXT         DEFAULT NULL,
  direccion               VARCHAR(255) DEFAULT NULL,
  consentimiento_aceptado TINYINT(1)   NOT NULL DEFAULT 0,
  consentimiento_fecha    DATETIME     DEFAULT NULL,
  consentimiento_version  VARCHAR(20)  DEFAULT NULL,
  creada_en               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_organizaciones PRIMARY KEY (id),
  CONSTRAINT uq_organizaciones_rut UNIQUE (rut),
  CONSTRAINT uq_organizaciones_rut_normalizado UNIQUE (rut_normalizado),
  INDEX idx_organizaciones_creada (creada_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Profesionales: ficha pública y datos multivaluados
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profesionales (
  id                  VARCHAR(50)  NOT NULL,
  nombre              VARCHAR(100) NOT NULL,
  apellido            VARCHAR(100) NOT NULL,
  titulo              VARCHAR(255) NOT NULL DEFAULT '',
  ciudad              VARCHAR(100) NOT NULL DEFAULT '',
  presentacion        TEXT         NOT NULL,
  linkedin            VARCHAR(255) DEFAULT NULL,
  portafolio          VARCHAR(255) DEFAULT NULL,
  validado_por_skilly TINYINT(1)   NOT NULL DEFAULT 0,
  fecha_ingreso       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_profesionales PRIMARY KEY (id),
  INDEX idx_profesionales_linkedin (linkedin),
  INDEX idx_profesionales_ingreso (fecha_ingreso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profesional_formacion (
  id              INT          NOT NULL AUTO_INCREMENT,
  profesional_id  VARCHAR(50)  NOT NULL,
  descripcion     VARCHAR(255) NOT NULL,
  CONSTRAINT pk_profesional_formacion PRIMARY KEY (id),
  CONSTRAINT fk_formacion_profesional FOREIGN KEY (profesional_id)
    REFERENCES profesionales(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profesional_experiencia (
  id              INT          NOT NULL AUTO_INCREMENT,
  profesional_id  VARCHAR(50)  NOT NULL,
  cargo           VARCHAR(255) NOT NULL,
  organizacion    VARCHAR(255) NOT NULL,
  periodo         VARCHAR(100) NOT NULL,
  CONSTRAINT pk_profesional_experiencia PRIMARY KEY (id),
  CONSTRAINT fk_experiencia_profesional FOREIGN KEY (profesional_id)
    REFERENCES profesionales(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profesional_habilidades (
  id              INT          NOT NULL AUTO_INCREMENT,
  profesional_id  VARCHAR(50)  NOT NULL,
  habilidad       VARCHAR(100) NOT NULL,
  CONSTRAINT pk_profesional_habilidades PRIMARY KEY (id),
  CONSTRAINT fk_habilidades_profesional FOREIGN KEY (profesional_id)
    REFERENCES profesionales(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profesional_insignias (
  id              INT          NOT NULL AUTO_INCREMENT,
  profesional_id  VARCHAR(50)  NOT NULL,
  insignia        ENUM('identidad_verificada','titulo_verificado','entrevista_skilly','referencias_verificadas') NOT NULL,
  CONSTRAINT pk_profesional_insignias PRIMARY KEY (id),
  CONSTRAINT uq_insignias_profesional UNIQUE (profesional_id, insignia),
  CONSTRAINT fk_insignias_profesional FOREIGN KEY (profesional_id)
    REFERENCES profesionales(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos privados del profesional (relación 1:1 con profesionales).
CREATE TABLE IF NOT EXISTS perfiles_profesionales (
  profesional_id          VARCHAR(50)  NOT NULL,
  email                   VARCHAR(255) NOT NULL,
  area_principal          VARCHAR(50)  NOT NULL,
  estado_validacion       ENUM('perfil_incompleto','en_revision','validado') NOT NULL DEFAULT 'perfil_incompleto',
  validado_en             DATETIME     DEFAULT NULL,
  comentario_validacion   TEXT         DEFAULT NULL,
  consentimiento_aceptado TINYINT(1)   NOT NULL DEFAULT 0,
  consentimiento_fecha    DATETIME     DEFAULT NULL,
  consentimiento_version  VARCHAR(20)  DEFAULT NULL,
  CONSTRAINT pk_perfiles_profesionales PRIMARY KEY (profesional_id),
  CONSTRAINT fk_perfil_profesional FOREIGN KEY (profesional_id)
    REFERENCES profesionales(id) ON DELETE CASCADE,
  INDEX idx_perfiles_estado (estado_validacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS documentos_respaldo (
  id              VARCHAR(50)  NOT NULL,
  profesional_id  VARCHAR(50)  NOT NULL,
  tipo            ENUM('curriculum','certificado','titulo') NOT NULL,
  nombre_archivo  VARCHAR(255) NOT NULL,
  tamano_bytes    INT          NOT NULL,
  subido_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado          ENUM('pendiente_revision','aprobado','rechazado') NOT NULL DEFAULT 'pendiente_revision',
  ruta_archivo    VARCHAR(255) DEFAULT NULL,
  tipo_mime       VARCHAR(100) DEFAULT NULL,
  CONSTRAINT pk_documentos_respaldo PRIMARY KEY (id),
  CONSTRAINT fk_documentos_profesional FOREIGN KEY (profesional_id)
    REFERENCES profesionales(id) ON DELETE CASCADE,
  CONSTRAINT chk_documentos_tamano CHECK (tamano_bytes >= 0),
  INDEX idx_documentos_profesional (profesional_id, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Cuentas de acceso, sesiones y control de fuerza bruta
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cuentas (
  id              VARCHAR(50)  NOT NULL,
  email           VARCHAR(255) NOT NULL,
  contrasena      VARCHAR(255) NOT NULL COMMENT 'Hash bcrypt (password_hash). Nunca texto plano.',
  rol             ENUM('organizacion','profesional','administrador','fundador') NOT NULL,
  nombre          VARCHAR(255) NOT NULL,
  organizacion_id VARCHAR(50)  DEFAULT NULL,
  profesional_id  VARCHAR(50)  DEFAULT NULL,
  CONSTRAINT pk_cuentas PRIMARY KEY (id),
  CONSTRAINT uq_cuentas_email UNIQUE (email),
  CONSTRAINT fk_cuentas_organizacion FOREIGN KEY (organizacion_id)
    REFERENCES organizaciones(id) ON DELETE SET NULL,
  CONSTRAINT fk_cuentas_profesional FOREIGN KEY (profesional_id)
    REFERENCES profesionales(id) ON DELETE SET NULL,
  INDEX idx_cuentas_rol (rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sesiones autenticadas. Se guarda el hash SHA-256 del token, nunca el token.
CREATE TABLE IF NOT EXISTS sesiones_autenticacion (
  token_hash CHAR(64)    NOT NULL,
  cuenta_id  VARCHAR(50) NOT NULL,
  creada_en  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_en  DATETIME    NOT NULL,
  CONSTRAINT pk_sesiones PRIMARY KEY (token_hash),
  CONSTRAINT fk_sesiones_cuenta FOREIGN KEY (cuenta_id)
    REFERENCES cuentas(id) ON DELETE CASCADE,
  INDEX idx_sesion_cuenta (cuenta_id),
  INDEX idx_sesion_expira (expira_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Intentos fallidos de inicio de sesión (límite anti fuerza bruta).
CREATE TABLE IF NOT EXISTS intentos_login (
  id    INT          NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  ip    VARCHAR(45)  NOT NULL,
  fecha DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_intentos_login PRIMARY KEY (id),
  INDEX idx_intentos_email (email, fecha),
  INDEX idx_intentos_ip (ip, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Servicios publicados por profesionales
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS servicios (
  id                      VARCHAR(50)  NOT NULL,
  profesional_id          VARCHAR(50)  NOT NULL,
  categoria_id            VARCHAR(50)  NOT NULL,
  subcategoria_id         VARCHAR(50)  NOT NULL,
  titulo                  VARCHAR(255) NOT NULL,
  descripcion             TEXT         NOT NULL,
  duracion_estimada       VARCHAR(100) NOT NULL,
  duracion_sesion_minutos INT          NOT NULL DEFAULT 60,
  precio                  INT          NOT NULL COMMENT 'CLP, sin decimales',
  publicado               TINYINT(1)   NOT NULL DEFAULT 1,
  actualizado_en          DATETIME     DEFAULT NULL,
  CONSTRAINT pk_servicios PRIMARY KEY (id),
  CONSTRAINT fk_servicios_profesional FOREIGN KEY (profesional_id)
    REFERENCES profesionales(id) ON DELETE CASCADE,
  CONSTRAINT fk_servicios_categoria FOREIGN KEY (categoria_id)
    REFERENCES categorias(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_servicios_subcategoria FOREIGN KEY (subcategoria_id)
    REFERENCES subcategorias(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_servicios_precio CHECK (precio > 0),
  CONSTRAINT chk_servicios_duracion CHECK (duracion_sesion_minutos > 0),
  INDEX idx_servicios_catalogo (publicado, categoria_id, subcategoria_id),
  INDEX idx_servicios_precio (publicado, precio),
  INDEX idx_servicios_profesional (profesional_id, publicado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS servicio_entregables (
  id          INT          NOT NULL AUTO_INCREMENT,
  servicio_id VARCHAR(50)  NOT NULL,
  entregable  VARCHAR(255) NOT NULL,
  CONSTRAINT pk_servicio_entregables PRIMARY KEY (id),
  CONSTRAINT fk_entregables_servicio FOREIGN KEY (servicio_id)
    REFERENCES servicios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS servicio_modalidades (
  id          INT         NOT NULL AUTO_INCREMENT,
  servicio_id VARCHAR(50) NOT NULL,
  modalidad   ENUM('remoto','presencial','hibrido') NOT NULL,
  CONSTRAINT pk_servicio_modalidades PRIMARY KEY (id),
  CONSTRAINT uq_modalidad_servicio UNIQUE (servicio_id, modalidad),
  CONSTRAINT fk_modalidades_servicio FOREIGN KEY (servicio_id)
    REFERENCES servicios(id) ON DELETE CASCADE,
  INDEX idx_modalidades_modalidad (modalidad, servicio_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS servicio_etiquetas (
  id          INT          NOT NULL AUTO_INCREMENT,
  servicio_id VARCHAR(50)  NOT NULL,
  etiqueta    VARCHAR(100) NOT NULL,
  CONSTRAINT pk_servicio_etiquetas PRIMARY KEY (id),
  CONSTRAINT fk_etiquetas_servicio FOREIGN KEY (servicio_id)
    REFERENCES servicios(id) ON DELETE CASCADE,
  INDEX idx_etiquetas_etiqueta (etiqueta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Solicitudes de revisión que el profesional envía desde "Mis servicios".
-- Se guarda el historial; la vigente es la más reciente por servicio.
CREATE TABLE IF NOT EXISTS solicitudes_revision_servicio (
  id               VARCHAR(50)  NOT NULL,
  servicio_id      VARCHAR(50)  NOT NULL,
  profesional_id   VARCHAR(50)  NOT NULL,
  estado           ENUM('pendiente','aprobada','observada') NOT NULL DEFAULT 'pendiente',
  mensaje          TEXT         DEFAULT NULL,
  solicitada_en    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resuelta_en      DATETIME     DEFAULT NULL,
  comentario_admin TEXT         DEFAULT NULL,
  revisado_por     VARCHAR(150) DEFAULT NULL,
  CONSTRAINT pk_solicitudes_revision PRIMARY KEY (id),
  CONSTRAINT fk_revision_servicio FOREIGN KEY (servicio_id)
    REFERENCES servicios(id) ON DELETE CASCADE,
  CONSTRAINT fk_revision_profesional FOREIGN KEY (profesional_id)
    REFERENCES profesionales(id) ON DELETE CASCADE,
  INDEX idx_revision_servicio (servicio_id, solicitada_en),
  INDEX idx_revision_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Disponibilidad
-- ---------------------------------------------------------------------------

-- Bloques de una hora que la organización puede reservar (se regeneran
-- desde horarios_semanales y bloqueos_disponibilidad).
CREATE TABLE IF NOT EXISTS bloques_disponibles (
  id              VARCHAR(50) NOT NULL,
  profesional_id  VARCHAR(50) NOT NULL,
  inicio          DATETIME    NOT NULL,
  fin             DATETIME    NOT NULL,
  CONSTRAINT pk_bloques_disponibles PRIMARY KEY (id),
  CONSTRAINT uq_bloque_profesional_inicio UNIQUE (profesional_id, inicio),
  CONSTRAINT fk_bloques_profesional FOREIGN KEY (profesional_id)
    REFERENCES profesionales(id) ON DELETE CASCADE,
  CONSTRAINT chk_bloques_rango CHECK (fin > inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS horarios_semanales (
  profesional_id VARCHAR(50) NOT NULL,
  dia            TINYINT     NOT NULL COMMENT '0 = domingo … 6 = sábado',
  activo         TINYINT(1)  NOT NULL DEFAULT 0,
  desde          TIME        NOT NULL,
  hasta          TIME        NOT NULL,
  CONSTRAINT pk_horarios_semanales PRIMARY KEY (profesional_id, dia),
  CONSTRAINT fk_horarios_profesional FOREIGN KEY (profesional_id)
    REFERENCES profesionales(id) ON DELETE CASCADE,
  CONSTRAINT chk_horarios_dia CHECK (dia BETWEEN 0 AND 6),
  CONSTRAINT chk_horarios_rango CHECK (desde < hasta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bloqueos_disponibilidad (
  id             VARCHAR(50)  NOT NULL,
  profesional_id VARCHAR(50)  NOT NULL,
  fecha          DATE         NOT NULL,
  desde          TIME         NOT NULL,
  hasta          TIME         NOT NULL,
  motivo         VARCHAR(255) DEFAULT NULL,
  CONSTRAINT pk_bloqueos_disponibilidad PRIMARY KEY (id),
  CONSTRAINT fk_bloqueos_profesional FOREIGN KEY (profesional_id)
    REFERENCES profesionales(id) ON DELETE CASCADE,
  CONSTRAINT chk_bloqueos_rango CHECK (desde < hasta),
  INDEX idx_bloqueos_profesional_fecha (profesional_id, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Retención temporal (10 min por defecto) de un bloque mientras la
-- organización completa la reserva; evita que dos clientes tomen el mismo horario.
CREATE TABLE IF NOT EXISTS retenciones (
  id              VARCHAR(50) NOT NULL,
  bloque_id       VARCHAR(50) NOT NULL,
  servicio_id     VARCHAR(50) NOT NULL,
  organizacion_id VARCHAR(50) NOT NULL,
  expira_en       DATETIME    NOT NULL,
  CONSTRAINT pk_retenciones PRIMARY KEY (id),
  CONSTRAINT fk_retenciones_bloque FOREIGN KEY (bloque_id)
    REFERENCES bloques_disponibles(id) ON DELETE CASCADE,
  CONSTRAINT fk_retenciones_servicio FOREIGN KEY (servicio_id)
    REFERENCES servicios(id) ON DELETE CASCADE,
  CONSTRAINT fk_retenciones_organizacion FOREIGN KEY (organizacion_id)
    REFERENCES organizaciones(id) ON DELETE CASCADE,
  INDEX idx_retenciones_bloque (bloque_id, expira_en),
  INDEX idx_retenciones_organizacion (organizacion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Contrataciones (reservas), historial y chat
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reservas (
  id                            VARCHAR(50)  NOT NULL,
  codigo                        VARCHAR(20)  NOT NULL,
  organizacion_id               VARCHAR(50)  NOT NULL,
  profesional_id                VARCHAR(50)  NOT NULL,
  servicio_id                   VARCHAR(50)  NOT NULL,
  inicio                        DATETIME     NOT NULL,
  fin                           DATETIME     NOT NULL,
  modalidad                     ENUM('remoto','presencial','hibrido') NOT NULL,
  mensaje                       TEXT         DEFAULT NULL,
  -- Montos congelados al contratar (si luego cambia el precio o la comisión,
  -- la contratación conserva lo que la organización aceptó).
  precio                        INT          NOT NULL,
  comision_porcentaje           DECIMAL(5,2) NOT NULL,
  comision                      INT          NOT NULL,
  total                         INT          NOT NULL,
  estado                        ENUM('SOLICITADA','APROBADA_ADMIN','PENDIENTE_PAGO','CONFIRMADA','EN_CURSO','ENTREGADA','EVALUADA','RECHAZADA','CANCELADA','REAGENDADA') NOT NULL DEFAULT 'SOLICITADA',
  estado_pago                   ENUM('pendiente_confirmacion','confirmado','reembolsado','retenido_parcial','sin_cobro') NOT NULL DEFAULT 'pendiente_confirmacion',
  conformidad_confirmada        TINYINT(1)   NOT NULL DEFAULT 0,
  conformidad_fecha             DATETIME     DEFAULT NULL,
  aceptacion_fecha              DATETIME     DEFAULT NULL,
  aceptacion_usuario            VARCHAR(255) DEFAULT NULL,
  aceptacion_version            VARCHAR(20)  DEFAULT NULL,
  reagendamiento_inicio         DATETIME     DEFAULT NULL,
  reagendamiento_fin            DATETIME     DEFAULT NULL,
  reagendamiento_solicitado     DATETIME     DEFAULT NULL,
  administrador_asignado_id     VARCHAR(50)  DEFAULT NULL,
  administrador_asignado_nombre VARCHAR(255) DEFAULT NULL,
  administrador_decidio_en      DATETIME     DEFAULT NULL,
  profesional_decidio_en        DATETIME     DEFAULT NULL,
  pago_confirmado_en            DATETIME     DEFAULT NULL,
  creada_en                     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_reservas PRIMARY KEY (id),
  CONSTRAINT uq_reservas_codigo UNIQUE (codigo),
  CONSTRAINT fk_reservas_organizacion FOREIGN KEY (organizacion_id)
    REFERENCES organizaciones(id) ON DELETE RESTRICT,
  CONSTRAINT fk_reservas_profesional FOREIGN KEY (profesional_id)
    REFERENCES profesionales(id) ON DELETE RESTRICT,
  CONSTRAINT fk_reservas_servicio FOREIGN KEY (servicio_id)
    REFERENCES servicios(id) ON DELETE RESTRICT,
  CONSTRAINT fk_reservas_administrador FOREIGN KEY (administrador_asignado_id)
    REFERENCES cuentas(id) ON DELETE SET NULL,
  CONSTRAINT chk_reservas_rango CHECK (fin > inicio),
  CONSTRAINT chk_reservas_montos CHECK (precio >= 0 AND comision >= 0 AND total = precio + comision),
  CONSTRAINT chk_reservas_reagenda CHECK (reagendamiento_inicio IS NULL OR reagendamiento_fin > reagendamiento_inicio),
  INDEX idx_reservas_organizacion (organizacion_id, inicio),
  INDEX idx_reservas_profesional (profesional_id, estado),
  INDEX idx_reservas_estado (estado, creada_en),
  INDEX idx_reservas_servicio (servicio_id, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contador correlativo por año del código visible SK-AAAA-NNNN. Se incrementa dentro de la
-- transacción que crea la reserva (bloqueo de fila): sin números repetidos ni carreras.
CREATE TABLE IF NOT EXISTS contadores_reserva (
  anio   SMALLINT NOT NULL,
  ultimo INT      NOT NULL DEFAULT 0,
  CONSTRAINT pk_contadores_reserva PRIMARY KEY (anio),
  CONSTRAINT chk_contadores_ultimo CHECK (ultimo >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS historial_reservas (
  id              VARCHAR(50)     NOT NULL,
  -- Orden estable de eventos ocurridos en el mismo segundo.
  secuencia       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reserva_id      VARCHAR(50)     NOT NULL,
  fecha           DATETIME        NOT NULL,
  actor_tipo      ENUM('organizacion','profesional','skilly','sistema') NOT NULL,
  actor_nombre    VARCHAR(255)    NOT NULL,
  estado_anterior VARCHAR(20)     DEFAULT NULL,
  estado_nuevo    VARCHAR(20)     NOT NULL,
  motivo          TEXT            DEFAULT NULL,
  detalle         TEXT            DEFAULT NULL,
  CONSTRAINT pk_historial_reservas PRIMARY KEY (id),
  CONSTRAINT uq_historial_secuencia UNIQUE (secuencia),
  CONSTRAINT fk_historial_reserva FOREIGN KEY (reserva_id)
    REFERENCES reservas(id) ON DELETE RESTRICT,
  CONSTRAINT chk_historial_estado CHECK (estado_nuevo IN ('SOLICITADA','APROBADA_ADMIN','PENDIENTE_PAGO','CONFIRMADA','EN_CURSO','ENTREGADA','EVALUADA','RECHAZADA','CANCELADA','REAGENDADA')),
  INDEX idx_historial_reserva (reserva_id, fecha, secuencia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mensajes_chat (
  id           VARCHAR(80)  NOT NULL,
  reserva_id   VARCHAR(50)  NOT NULL,
  cuenta_id    VARCHAR(50)  NOT NULL,
  autor_rol    ENUM('organizacion','profesional') NOT NULL,
  autor_nombre VARCHAR(255) NOT NULL,
  texto        TEXT         NOT NULL,
  enviado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_mensajes_chat PRIMARY KEY (id),
  CONSTRAINT fk_mensajes_reserva FOREIGN KEY (reserva_id)
    REFERENCES reservas(id) ON DELETE RESTRICT,
  CONSTRAINT fk_mensajes_cuenta FOREIGN KEY (cuenta_id)
    REFERENCES cuentas(id) ON DELETE CASCADE,
  CONSTRAINT chk_mensajes_largo CHECK (CHAR_LENGTH(texto) BETWEEN 1 AND 5000),
  INDEX idx_mensajes_reserva (reserva_id, enviado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Evaluaciones (bidireccionales y ciegas)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS evaluaciones (
  id                VARCHAR(50) NOT NULL,
  reserva_id        VARCHAR(50) NOT NULL,
  profesional_id    VARCHAR(50) NOT NULL,
  organizacion_id   VARCHAR(50) NOT NULL,
  autor             ENUM('organizacion','profesional') NOT NULL,
  calidad           TINYINT     NOT NULL,
  plazos            TINYINT     NOT NULL,
  comunicacion      TINYINT     NOT NULL,
  comentario        TEXT        DEFAULT NULL,
  fecha             DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  publicada         TINYINT(1)  NOT NULL DEFAULT 0,
  estado_comentario ENUM('sin_comentario','en_revision','aprobado','rechazado') NOT NULL DEFAULT 'sin_comentario',
  CONSTRAINT pk_evaluaciones PRIMARY KEY (id),
  -- Cada parte evalúa una sola vez cada contratación.
  CONSTRAINT uq_evaluacion_reserva_autor UNIQUE (reserva_id, autor),
  CONSTRAINT fk_evaluaciones_reserva FOREIGN KEY (reserva_id)
    REFERENCES reservas(id) ON DELETE RESTRICT,
  CONSTRAINT fk_evaluaciones_profesional FOREIGN KEY (profesional_id)
    REFERENCES profesionales(id) ON DELETE CASCADE,
  CONSTRAINT fk_evaluaciones_organizacion FOREIGN KEY (organizacion_id)
    REFERENCES organizaciones(id) ON DELETE CASCADE,
  CONSTRAINT chk_evaluaciones_calidad CHECK (calidad BETWEEN 1 AND 4),
  CONSTRAINT chk_evaluaciones_plazos CHECK (plazos BETWEEN 1 AND 4),
  CONSTRAINT chk_evaluaciones_comunicacion CHECK (comunicacion BETWEEN 1 AND 4),
  INDEX idx_evaluaciones_reputacion (profesional_id, publicada, autor, fecha),
  INDEX idx_evaluaciones_moderacion (estado_comentario, fecha),
  INDEX idx_evaluaciones_publicacion (publicada, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Favoritos de la organización
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS favoritos (
  id          INT         NOT NULL AUTO_INCREMENT,
  usuario_id  VARCHAR(50) NOT NULL COMMENT 'ID de la organización dueña del favorito',
  servicio_id VARCHAR(50) NOT NULL,
  CONSTRAINT pk_favoritos PRIMARY KEY (id),
  CONSTRAINT uq_favorito UNIQUE (usuario_id, servicio_id),
  CONSTRAINT fk_favoritos_organizacion FOREIGN KEY (usuario_id)
    REFERENCES organizaciones(id) ON DELETE CASCADE,
  CONSTRAINT fk_favoritos_servicio FOREIGN KEY (servicio_id)
    REFERENCES servicios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Configuración de la plataforma (una sola fila, id = 1)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS configuracion_plataforma (
  id                               INT          NOT NULL DEFAULT 1,
  comision_porcentaje              DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  comision_profesional_porcentaje  DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  comision_organizacion_porcentaje DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  retencion_bloque_minutos         INT          NOT NULL DEFAULT 10,
  reputacion_minimo_evaluaciones   INT          NOT NULL DEFAULT 3,
  reputacion_ventana_max           INT          NOT NULL DEFAULT 10,
  reputacion_ventana_meses         INT          NOT NULL DEFAULT 12,
  reputacion_dias_publicacion      INT          NOT NULL DEFAULT 7,
  reputacion_max_caracteres        INT          NOT NULL DEFAULT 500,
  version_condiciones              VARCHAR(20)  NOT NULL DEFAULT '2026-01',
  version_politica_datos           VARCHAR(20)  NOT NULL DEFAULT '2026-01',
  CONSTRAINT pk_configuracion PRIMARY KEY (id),
  CONSTRAINT chk_configuracion_unica CHECK (id = 1),
  CONSTRAINT chk_configuracion_comisiones CHECK (comision_porcentaje BETWEEN 0 AND 50 AND comision_profesional_porcentaje BETWEEN 0 AND 50 AND comision_organizacion_porcentaje BETWEEN 0 AND 50),
  CONSTRAINT chk_configuracion_reputacion CHECK (reputacion_minimo_evaluaciones >= 0 AND reputacion_ventana_max > 0 AND reputacion_ventana_meses > 0 AND reputacion_dias_publicacion >= 0 AND reputacion_max_caracteres > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tramos_cancelacion (
  id                   INT          NOT NULL AUTO_INCREMENT,
  desde_horas          INT          NOT NULL,
  retencion_porcentaje INT          NOT NULL,
  etiqueta             VARCHAR(100) NOT NULL,
  CONSTRAINT pk_tramos_cancelacion PRIMARY KEY (id),
  CONSTRAINT uq_tramos_desde UNIQUE (desde_horas),
  CONSTRAINT chk_tramos_valores CHECK (desde_horas >= 0 AND retencion_porcentaje BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Datos iniciales (idempotentes)
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

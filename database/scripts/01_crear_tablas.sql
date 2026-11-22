-- ============================================================================
-- Skilly LATAM — 01. Creación de tablas (paso 2 de 6)
-- Solo columnas, tipos, nulabilidad y valores por defecto. Las claves y restricciones van en 02-04.
-- Esquema 2026.11-E3.1. Orden y advertencias: database/README.md
-- ============================================================================

SET NAMES utf8mb4;
USE skilly_db;

CREATE TABLE IF NOT EXISTS categorias (
  id          VARCHAR(50)  NOT NULL,
  nombre      VARCHAR(150) NOT NULL,
  descripcion TEXT         NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subcategorias (
  id           VARCHAR(50)  NOT NULL,
  categoria_id VARCHAR(50)  NOT NULL,
  nombre       VARCHAR(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  creada_en               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  fecha_ingreso       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profesional_formacion (
  id              INT          NOT NULL,
  profesional_id  VARCHAR(50)  NOT NULL,
  descripcion     VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profesional_experiencia (
  id              INT          NOT NULL,
  profesional_id  VARCHAR(50)  NOT NULL,
  cargo           VARCHAR(255) NOT NULL,
  organizacion    VARCHAR(255) NOT NULL,
  periodo         VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profesional_habilidades (
  id              INT          NOT NULL,
  profesional_id  VARCHAR(50)  NOT NULL,
  habilidad       VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profesional_insignias (
  id              INT          NOT NULL,
  profesional_id  VARCHAR(50)  NOT NULL,
  insignia        ENUM('identidad_verificada','titulo_verificado','entrevista_skilly','referencias_verificadas') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS perfiles_profesionales (
  profesional_id          VARCHAR(50)  NOT NULL,
  email                   VARCHAR(255) NOT NULL,
  area_principal          VARCHAR(50)  NOT NULL,
  estado_validacion       ENUM('perfil_incompleto','en_revision','validado') NOT NULL DEFAULT 'perfil_incompleto',
  validado_en             DATETIME     DEFAULT NULL,
  comentario_validacion   TEXT         DEFAULT NULL,
  consentimiento_aceptado TINYINT(1)   NOT NULL DEFAULT 0,
  consentimiento_fecha    DATETIME     DEFAULT NULL,
  consentimiento_version  VARCHAR(20)  DEFAULT NULL
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
  tipo_mime       VARCHAR(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cuentas (
  id              VARCHAR(50)  NOT NULL,
  email           VARCHAR(255) NOT NULL,
  contrasena      VARCHAR(255) NOT NULL COMMENT 'Hash bcrypt (password_hash). Nunca texto plano.',
  rol             ENUM('organizacion','profesional','administrador','fundador') NOT NULL,
  nombre          VARCHAR(255) NOT NULL,
  organizacion_id VARCHAR(50)  DEFAULT NULL,
  profesional_id  VARCHAR(50)  DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sesiones_autenticacion (
  token_hash CHAR(64)    NOT NULL,
  cuenta_id  VARCHAR(50) NOT NULL,
  creada_en  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_en  DATETIME    NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS intentos_login (
  id    INT          NOT NULL,
  email VARCHAR(255) NOT NULL,
  ip    VARCHAR(45)  NOT NULL,
  fecha DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  actualizado_en          DATETIME     DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS servicio_entregables (
  id          INT          NOT NULL,
  servicio_id VARCHAR(50)  NOT NULL,
  entregable  VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS servicio_modalidades (
  id          INT         NOT NULL,
  servicio_id VARCHAR(50) NOT NULL,
  modalidad   ENUM('remoto','presencial','hibrido') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS servicio_etiquetas (
  id          INT          NOT NULL,
  servicio_id VARCHAR(50)  NOT NULL,
  etiqueta    VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS solicitudes_revision_servicio (
  id               VARCHAR(50)  NOT NULL,
  servicio_id      VARCHAR(50)  NOT NULL,
  profesional_id   VARCHAR(50)  NOT NULL,
  estado           ENUM('pendiente','aprobada','observada') NOT NULL DEFAULT 'pendiente',
  mensaje          TEXT         DEFAULT NULL,
  solicitada_en    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resuelta_en      DATETIME     DEFAULT NULL,
  comentario_admin TEXT         DEFAULT NULL,
  revisado_por     VARCHAR(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bloques_disponibles (
  id              VARCHAR(50) NOT NULL,
  profesional_id  VARCHAR(50) NOT NULL,
  inicio          DATETIME    NOT NULL,
  fin             DATETIME    NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS horarios_semanales (
  profesional_id VARCHAR(50) NOT NULL,
  dia            TINYINT     NOT NULL COMMENT '0 = domingo … 6 = sábado',
  activo         TINYINT(1)  NOT NULL DEFAULT 0,
  desde          TIME        NOT NULL,
  hasta          TIME        NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bloqueos_disponibilidad (
  id             VARCHAR(50)  NOT NULL,
  profesional_id VARCHAR(50)  NOT NULL,
  fecha          DATE         NOT NULL,
  desde          TIME         NOT NULL,
  hasta          TIME         NOT NULL,
  motivo         VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS retenciones (
  id              VARCHAR(50) NOT NULL,
  bloque_id       VARCHAR(50) NOT NULL,
  servicio_id     VARCHAR(50) NOT NULL,
  organizacion_id VARCHAR(50) NOT NULL,
  expira_en       DATETIME    NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  -- Montos congelados al contratar (si luego cambia el precio o la comisión
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
  creada_en                     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contador correlativo por año del código visible SK-AAAA-NNNN.
CREATE TABLE IF NOT EXISTS contadores_reserva (
  anio   SMALLINT NOT NULL,
  ultimo INT      NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS historial_reservas (
  id              VARCHAR(50)     NOT NULL,
  -- Orden estable de eventos ocurridos en el mismo segundo.
  secuencia       BIGINT UNSIGNED NOT NULL,
  reserva_id      VARCHAR(50)     NOT NULL,
  fecha           DATETIME        NOT NULL,
  actor_tipo      ENUM('organizacion','profesional','skilly','sistema') NOT NULL,
  actor_nombre    VARCHAR(255)    NOT NULL,
  estado_anterior VARCHAR(20)     DEFAULT NULL,
  estado_nuevo    VARCHAR(20)     NOT NULL,
  motivo          TEXT            DEFAULT NULL,
  detalle         TEXT            DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mensajes_chat (
  id           VARCHAR(80)  NOT NULL,
  reserva_id   VARCHAR(50)  NOT NULL,
  cuenta_id    VARCHAR(50)  NOT NULL,
  autor_rol    ENUM('organizacion','profesional') NOT NULL,
  autor_nombre VARCHAR(255) NOT NULL,
  texto        TEXT         NOT NULL,
  enviado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  estado_comentario ENUM('sin_comentario','en_revision','aprobado','rechazado') NOT NULL DEFAULT 'sin_comentario'
  -- Cada parte evalúa una sola vez cada contratación.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS favoritos (
  id          INT         NOT NULL,
  usuario_id  VARCHAR(50) NOT NULL COMMENT 'ID de la organización dueña del favorito',
  servicio_id VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  version_politica_datos           VARCHAR(20)  NOT NULL DEFAULT '2026-01'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tramos_cancelacion (
  id                   INT          NOT NULL,
  desde_horas          INT          NOT NULL,
  retencion_porcentaje INT          NOT NULL,
  etiqueta             VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

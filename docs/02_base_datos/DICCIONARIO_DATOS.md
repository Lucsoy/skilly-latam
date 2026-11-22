# Diccionario de datos — skilly_db (esquema 2026.11-E3.1)

> Generado desde `information_schema` de la base importada con `database/skilly.sql` (`database/verificar/generar_diccionario.py`). Versión editable con filtros: `Diccionario_de_Datos.xlsx`.

Abreviaturas: PK clave primaria · FK clave foránea · UQ única · Nulo = admite NULL.

## `categorias`

**Área:** Catálogo. Áreas de servicio de Personas y Back Office (reclutamiento, cultura, etc.).

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador legible (slug), p. ej. "reclutamiento" | VARCHAR | 50 | No | PK |  |  |  | PRIMARY |
| nombre | Nombre visible | VARCHAR | 150 | No |  |  |  |  |  |
| descripcion | Descripción | TEXT | 65535 | No |  |  |  |  |  |

## `subcategorias`

**Área:** Catálogo. Especialidades dentro de cada categoría.

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador legible (slug) | VARCHAR | 50 | No | PK |  |  |  | PRIMARY |
| categoria_id | Categoría a la que pertenece | VARCHAR | 50 | No | FK |  |  | categorias.id (fk_subcategorias_categoria; ON DELETE RESTRICT; ON UPDATE CASCADE) | fk_subcategorias_categoria |
| nombre | Nombre visible | VARCHAR | 150 | No |  |  |  |  |  |

## `organizaciones`

**Área:** Clientes. Pymes que contratan servicios. Incluye consentimiento de datos versionado.

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | VARCHAR | 50 | No | PK |  |  |  | PRIMARY |
| razon_social | Razón social legal | VARCHAR | 255 | No |  |  |  |  |  |
| rut | RUT tal como lo escribió la organización | VARCHAR | 20 | No | UQ |  |  |  | uq_organizaciones_rut |
| rut_normalizado | RUT sin puntos, guion ni espacios y con K mayúscula (columna generada) para garantizar unicidad | VARCHAR | 12 | Sí | UQ | NULL | Generada: ucase(replace(replace(replace(rut,'.',''),'-',''),' ','')) |  | uq_organizaciones_rut_normalizado |
| giro | Giro comercial | VARCHAR | 255 | No |  |  |  |  |  |
| tamano | Rango de cantidad de trabajadores | ENUM |  | No |  |  | Valores: 1-10,11-50,51-200,201-500,500+ |  |  |
| nombre_contacto | Persona de contacto | VARCHAR | 255 | No |  |  |  |  |  |
| email_contacto | Correo de contacto (sincronizado con cuentas.email) | VARCHAR | 255 | No |  |  |  |  |  |
| telefono | Teléfono de contacto | VARCHAR | 50 | Sí |  | NULL |  |  |  |
| sitio_web | Sitio web | VARCHAR | 255 | Sí |  | NULL |  |  |  |
| descripcion | Descripción | TEXT | 65535 | Sí |  | NULL |  |  |  |
| direccion | Dirección | VARCHAR | 255 | Sí |  | NULL |  |  |  |
| consentimiento_aceptado | 1 si aceptó la política de datos | TINYINT | 1 | No |  | 0 |  |  |  |
| consentimiento_fecha | Fecha y hora de la aceptación | DATETIME |  | Sí |  | NULL |  |  |  |
| consentimiento_version | Versión de la política aceptada | VARCHAR | 20 | Sí |  | NULL |  |  |  |
| creada_en | Fecha de creación | DATETIME |  | No |  | current_timestamp() |  |  | idx_organizaciones_creada |

## `profesionales`

**Área:** Profesionales. Ficha pública del profesional independiente.

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | VARCHAR | 50 | No | PK |  |  |  | PRIMARY |
| nombre | Nombre visible | VARCHAR | 100 | No |  |  |  |  |  |
| apellido | Apellido(s) | VARCHAR | 100 | No |  |  |  |  |  |
| titulo | Título o cargo profesional | VARCHAR | 255 | No |  | '' |  |  |  |
| ciudad | Ciudad | VARCHAR | 100 | No |  | '' |  |  |  |
| presentacion | Presentación pública (mín. 40 caracteres para validar) | TEXT | 65535 | No |  |  |  |  |  |
| linkedin | Perfil de LinkedIn | VARCHAR | 255 | Sí |  | NULL |  |  | idx_profesionales_linkedin |
| portafolio | Enlace a portafolio | VARCHAR | 255 | Sí |  | NULL |  |  |  |
| validado_por_skilly | 1 si Skilly validó el perfil (se mantiene en la misma transacción que estado_validacion) | TINYINT | 1 | No |  | 0 |  |  |  |
| fecha_ingreso | Fecha de registro | DATETIME |  | No |  | current_timestamp() |  |  | idx_profesionales_ingreso |

## `profesional_formacion`

**Área:** Profesionales. Formación académica (atributo multivaluado de profesionales, 1FN).

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | INT | 11 | No | PK |  | AUTO_INCREMENT |  | PRIMARY |
| profesional_id | Profesional al que pertenece | VARCHAR | 50 | No | FK |  |  | profesionales.id (fk_formacion_profesional; ON DELETE CASCADE) | fk_formacion_profesional |
| descripcion | Descripción | VARCHAR | 255 | No |  |  |  |  |  |

## `profesional_experiencia`

**Área:** Profesionales. Experiencia laboral (multivaluado, 1FN).

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | INT | 11 | No | PK |  | AUTO_INCREMENT |  | PRIMARY |
| profesional_id | Profesional al que pertenece | VARCHAR | 50 | No | FK |  |  | profesionales.id (fk_experiencia_profesional; ON DELETE CASCADE) | fk_experiencia_profesional |
| cargo | Cargo desempeñado | VARCHAR | 255 | No |  |  |  |  |  |
| organizacion | Organización donde trabajó | VARCHAR | 255 | No |  |  |  |  |  |
| periodo | Período (texto libre, p. ej. 2019-2023) | VARCHAR | 100 | No |  |  |  |  |  |

## `profesional_habilidades`

**Área:** Profesionales. Habilidades declaradas (multivaluado, 1FN).

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | INT | 11 | No | PK |  | AUTO_INCREMENT |  | PRIMARY |
| profesional_id | Profesional al que pertenece | VARCHAR | 50 | No | FK |  |  | profesionales.id (fk_habilidades_profesional; ON DELETE CASCADE) | fk_habilidades_profesional |
| habilidad | Habilidad | VARCHAR | 100 | No |  |  |  |  |  |

## `profesional_insignias`

**Área:** Profesionales. Insignias de verificación otorgadas por Skilly.

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | INT | 11 | No | PK |  | AUTO_INCREMENT |  | PRIMARY |
| profesional_id | Profesional al que pertenece | VARCHAR | 50 | No | FK, UQ compuesta |  |  | profesionales.id (fk_insignias_profesional; ON DELETE CASCADE) | uq_insignias_profesional |
| insignia | Tipo de insignia de verificación | ENUM |  | No | UQ compuesta |  | Valores: identidad_verificada,titulo_verificado,entrevista_skilly,referencias_verificadas |  | uq_insignias_profesional |

## `perfiles_profesionales`

**Área:** Profesionales. Datos privados y estado de validación del profesional (1:1 con profesionales).

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| profesional_id | Profesional al que pertenece | VARCHAR | 50 | No | PK, FK |  |  | profesionales.id (fk_perfil_profesional; ON DELETE CASCADE) | PRIMARY |
| email | Correo privado del profesional (igual a cuentas.email) | VARCHAR | 255 | No |  |  |  |  |  |
| area_principal | Área principal declarada al registrarse | VARCHAR | 50 | No |  |  |  |  |  |
| estado_validacion | Estado del proceso de validación por Skilly | ENUM |  | No |  | 'perfil_incompleto' | Valores: perfil_incompleto,en_revision,validado |  | idx_perfiles_estado |
| validado_en | Fecha de validación | DATETIME |  | Sí |  | NULL |  |  |  |
| comentario_validacion | Observación de Skilly al validar o devolver el perfil | TEXT | 65535 | Sí |  | NULL |  |  |  |
| consentimiento_aceptado | 1 si aceptó la política de datos | TINYINT | 1 | No |  | 0 |  |  |  |
| consentimiento_fecha | Fecha y hora de la aceptación | DATETIME |  | Sí |  | NULL |  |  |  |
| consentimiento_version | Versión de la política aceptada | VARCHAR | 20 | Sí |  | NULL |  |  |  |

## `documentos_respaldo`

**Área:** Profesionales. Metadatos de los documentos subidos (el archivo está en disco, fuera de la web pública).

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | VARCHAR | 50 | No | PK |  |  |  | PRIMARY |
| profesional_id | Profesional al que pertenece | VARCHAR | 50 | No | FK |  |  | profesionales.id (fk_documentos_profesional; ON DELETE CASCADE) | idx_documentos_profesional |
| tipo | Tipo de documento | ENUM |  | No |  |  | Valores: curriculum,certificado,titulo |  |  |
| nombre_archivo | Nombre original del archivo subido | VARCHAR | 255 | No |  |  |  |  |  |
| tamano_bytes | Tamaño del archivo en bytes (máx. 5 MB, validado en la API) | INT | 11 | No |  |  | chk_documentos_tamano: tamano_bytes >= 0 |  |  |
| subido_en | Fecha de carga | DATETIME |  | No |  | current_timestamp() |  |  |  |
| estado | Estado de revisión por Skilly | ENUM |  | No |  | 'pendiente_revision' | Valores: pendiente_revision,aprobado,rechazado |  | idx_documentos_profesional |
| ruta_archivo | Nombre interno aleatorio en la carpeta privada de subidas | VARCHAR | 255 | Sí |  | NULL |  |  |  |
| tipo_mime | Tipo MIME real detectado con finfo | VARCHAR | 100 | Sí |  | NULL |  |  |  |

## `cuentas`

**Área:** Acceso. Credenciales y rol de cada usuario; enlaza con su organización o ficha profesional.

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | VARCHAR | 50 | No | PK |  |  |  | PRIMARY |
| email | Correo de acceso (único) | VARCHAR | 255 | No | UQ |  |  |  | uq_cuentas_email |
| contrasena | Hash bcrypt de la contraseña (password_hash); nunca texto plano | VARCHAR | 255 | No |  |  |  |  |  |
| rol | Rol que determina permisos | ENUM |  | No |  |  | Valores: organizacion,profesional,administrador,fundador |  | idx_cuentas_rol |
| nombre | Nombre a mostrar | VARCHAR | 255 | No |  |  |  |  |  |
| organizacion_id | Organización asociada | VARCHAR | 50 | Sí | FK | NULL |  | organizaciones.id (fk_cuentas_organizacion; ON DELETE SET NULL) | fk_cuentas_organizacion |
| profesional_id | Profesional al que pertenece | VARCHAR | 50 | Sí | FK | NULL |  | profesionales.id (fk_cuentas_profesional; ON DELETE SET NULL) | fk_cuentas_profesional |

## `sesiones_autenticacion`

**Área:** Acceso. Sesiones activas: solo el hash SHA-256 del token Bearer.

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| token_hash | SHA-256 del token Bearer (el token original nunca se guarda) | CHAR | 64 | No | PK |  |  |  | PRIMARY |
| cuenta_id | Cuenta de usuario | VARCHAR | 50 | No | FK |  |  | cuentas.id (fk_sesiones_cuenta; ON DELETE CASCADE) | idx_sesion_cuenta |
| creada_en | Fecha de creación | DATETIME |  | No |  | current_timestamp() |  |  |  |
| expira_en | Fecha de expiración | DATETIME |  | No |  |  |  |  | idx_sesion_expira |

## `intentos_login`

**Área:** Acceso. Intentos fallidos de ingreso para el límite anti fuerza bruta.

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | INT | 11 | No | PK |  | AUTO_INCREMENT |  | PRIMARY |
| email | Correo intentado | VARCHAR | 255 | No |  |  |  |  | idx_intentos_email |
| ip | IP de origen (IPv4/IPv6) | VARCHAR | 45 | No |  |  |  |  | idx_intentos_ip |
| fecha | Fecha del intento | DATETIME |  | No |  | current_timestamp() |  |  | idx_intentos_email, idx_intentos_ip |

## `servicios`

**Área:** Servicios. Servicios publicados o pausados por profesionales.

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | VARCHAR | 50 | No | PK |  |  |  | PRIMARY |
| profesional_id | Profesional al que pertenece | VARCHAR | 50 | No | FK |  |  | profesionales.id (fk_servicios_profesional; ON DELETE CASCADE) | idx_servicios_profesional |
| categoria_id | Categoría a la que pertenece | VARCHAR | 50 | No | FK |  |  | categorias.id (fk_servicios_categoria; ON DELETE RESTRICT; ON UPDATE CASCADE) | fk_servicios_categoria, idx_servicios_catalogo |
| subcategoria_id | Subcategoría del servicio | VARCHAR | 50 | No | FK |  |  | subcategorias.id (fk_servicios_subcategoria; ON DELETE RESTRICT; ON UPDATE CASCADE) | fk_servicios_subcategoria, idx_servicios_catalogo |
| titulo | Título o cargo profesional | VARCHAR | 255 | No |  |  |  |  |  |
| descripcion | Descripción | TEXT | 65535 | No |  |  |  |  |  |
| duracion_estimada | Duración total estimada (texto) | VARCHAR | 100 | No |  |  |  |  |  |
| duracion_sesion_minutos | Duración de cada sesión en minutos (> 0) | INT | 11 | No |  | 60 | chk_servicios_duracion: duracion_sesion_minutos > 0 |  |  |
| precio | Precio en pesos chilenos sin decimales | INT | 11 | No |  |  | chk_servicios_precio: precio > 0 |  | idx_servicios_precio |
| publicado | 1 = visible en el catálogo; 0 = pausado | TINYINT | 1 | No |  | 1 |  |  | idx_servicios_catalogo, idx_servicios_precio, idx_servicios_profesional |
| actualizado_en | Última edición (invalida una revisión aprobada anterior) | DATETIME |  | Sí |  | NULL |  |  |  |

## `servicio_entregables`

**Área:** Servicios. Entregables del servicio (multivaluado).

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | INT | 11 | No | PK |  | AUTO_INCREMENT |  | PRIMARY |
| servicio_id | Servicio relacionado | VARCHAR | 50 | No | FK |  |  | servicios.id (fk_entregables_servicio; ON DELETE CASCADE) | fk_entregables_servicio |
| entregable | Entregable comprometido | VARCHAR | 255 | No |  |  |  |  |  |

## `servicio_modalidades`

**Área:** Servicios. Modalidades en que se ofrece el servicio (multivaluado, sin repetidos).

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | INT | 11 | No | PK |  | AUTO_INCREMENT |  | PRIMARY |
| servicio_id | Servicio relacionado | VARCHAR | 50 | No | FK, UQ compuesta |  |  | servicios.id (fk_modalidades_servicio; ON DELETE CASCADE) | idx_modalidades_modalidad, uq_modalidad_servicio |
| modalidad | Modalidad de atención | ENUM |  | No | UQ compuesta |  | Valores: remoto,presencial,hibrido |  | idx_modalidades_modalidad, uq_modalidad_servicio |

## `servicio_etiquetas`

**Área:** Servicios. Etiquetas de búsqueda del servicio.

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | INT | 11 | No | PK |  | AUTO_INCREMENT |  | PRIMARY |
| servicio_id | Servicio relacionado | VARCHAR | 50 | No | FK |  |  | servicios.id (fk_etiquetas_servicio; ON DELETE CASCADE) | fk_etiquetas_servicio |
| etiqueta | Etiqueta de búsqueda | VARCHAR | 100 | No |  |  |  |  | idx_etiquetas_etiqueta |

## `solicitudes_revision_servicio`

**Área:** Servicios. Historial de solicitudes de revisión de servicios por Skilly.

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | VARCHAR | 50 | No | PK |  |  |  | PRIMARY |
| servicio_id | Servicio relacionado | VARCHAR | 50 | No | FK |  |  | servicios.id (fk_revision_servicio; ON DELETE CASCADE) | idx_revision_servicio |
| profesional_id | Profesional al que pertenece | VARCHAR | 50 | No | FK |  |  | profesionales.id (fk_revision_profesional; ON DELETE CASCADE) | fk_revision_profesional |
| estado | Resultado de la revisión | ENUM |  | No |  | 'pendiente' | Valores: pendiente,aprobada,observada |  | idx_revision_estado |
| mensaje | Mensaje del profesional a Skilly | TEXT | 65535 | Sí |  | NULL |  |  |  |
| solicitada_en | Fecha de la solicitud | DATETIME |  | No |  | current_timestamp() |  |  | idx_revision_servicio |
| resuelta_en | Fecha de la resolución | DATETIME |  | Sí |  | NULL |  |  |  |
| comentario_admin | Comentario de Skilly al resolver | TEXT | 65535 | Sí |  | NULL |  |  |  |
| revisado_por | Nombre de quien resolvió | VARCHAR | 150 | Sí |  | NULL |  |  |  |

## `bloques_disponibles`

**Área:** Agenda. Horas libres reservables (1 h), generadas desde horarios y bloqueos.

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | VARCHAR | 50 | No | PK |  |  |  | PRIMARY |
| profesional_id | Profesional al que pertenece | VARCHAR | 50 | No | FK, UQ compuesta |  |  | profesionales.id (fk_bloques_profesional; ON DELETE CASCADE) | uq_bloque_profesional_inicio |
| inicio | Fecha y hora de inicio | DATETIME |  | No | UQ compuesta |  | chk_bloques_rango: fin > inicio |  | uq_bloque_profesional_inicio |
| fin | Fecha y hora de término (> inicio) | DATETIME |  | No |  |  | chk_bloques_rango: fin > inicio |  |  |

## `horarios_semanales`

**Área:** Agenda. Horario semanal de atención del profesional (PK compuesta profesional + día).

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| profesional_id | Profesional al que pertenece | VARCHAR | 50 | No | PK, FK |  |  | profesionales.id (fk_horarios_profesional; ON DELETE CASCADE) | PRIMARY |
| dia | Día de la semana (0 = domingo … 6 = sábado) | TINYINT | 4 | No | PK |  | chk_horarios_dia: dia between 0 and 6 |  | PRIMARY |
| activo | 1 si atiende ese día | TINYINT | 1 | No |  | 0 |  |  |  |
| desde | Hora de inicio | TIME |  | No |  |  | chk_horarios_rango: desde < hasta |  |  |
| hasta | Hora de término (> desde) | TIME |  | No |  |  | chk_horarios_rango: desde < hasta |  |  |

## `bloqueos_disponibilidad`

**Área:** Agenda. Ausencias puntuales que impiden generar bloques.

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | VARCHAR | 50 | No | PK |  |  |  | PRIMARY |
| profesional_id | Profesional al que pertenece | VARCHAR | 50 | No | FK |  |  | profesionales.id (fk_bloqueos_profesional; ON DELETE CASCADE) | idx_bloqueos_profesional_fecha |
| fecha | Día bloqueado | DATE |  | No |  |  |  |  | idx_bloqueos_profesional_fecha |
| desde | Hora de inicio | TIME |  | No |  |  | chk_bloqueos_rango: desde < hasta |  |  |
| hasta | Hora de término (> desde) | TIME |  | No |  |  | chk_bloqueos_rango: desde < hasta |  |  |
| motivo | Motivo | VARCHAR | 255 | Sí |  | NULL |  |  |  |

## `retenciones`

**Área:** Agenda. Reserva temporal de un bloque mientras la organización completa la solicitud.

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | VARCHAR | 50 | No | PK |  |  |  | PRIMARY |
| bloque_id | Bloque retenido | VARCHAR | 50 | No | FK |  |  | bloques_disponibles.id (fk_retenciones_bloque; ON DELETE CASCADE) | idx_retenciones_bloque |
| servicio_id | Servicio relacionado | VARCHAR | 50 | No | FK |  |  | servicios.id (fk_retenciones_servicio; ON DELETE CASCADE) | fk_retenciones_servicio |
| organizacion_id | Organización asociada | VARCHAR | 50 | No | FK |  |  | organizaciones.id (fk_retenciones_organizacion; ON DELETE CASCADE) | idx_retenciones_organizacion |
| expira_en | Fecha de expiración | DATETIME |  | No |  |  |  |  | idx_retenciones_bloque |

## `reservas`

**Área:** Contratación. Contratación entre organización y profesional, con montos congelados y estado.

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | VARCHAR | 50 | No | PK |  |  |  | PRIMARY |
| codigo | Código legible de la contratación (SK-AAAA-NNNN) | VARCHAR | 20 | No | UQ |  |  |  | uq_reservas_codigo |
| organizacion_id | Organización asociada | VARCHAR | 50 | No | FK |  |  | organizaciones.id (fk_reservas_organizacion; ON DELETE RESTRICT) | idx_reservas_organizacion |
| profesional_id | Profesional al que pertenece | VARCHAR | 50 | No | FK |  |  | profesionales.id (fk_reservas_profesional; ON DELETE RESTRICT) | idx_reservas_profesional |
| servicio_id | Servicio relacionado | VARCHAR | 50 | No | FK |  |  | servicios.id (fk_reservas_servicio; ON DELETE RESTRICT) | idx_reservas_servicio |
| inicio | Fecha y hora de inicio | DATETIME |  | No |  |  | chk_reservas_rango: fin > inicio |  | idx_reservas_organizacion |
| fin | Fecha y hora de término (> inicio) | DATETIME |  | No |  |  | chk_reservas_rango: fin > inicio |  |  |
| modalidad | Modalidad de atención | ENUM |  | No |  |  | Valores: remoto,presencial,hibrido |  |  |
| mensaje | Mensaje de la organización al profesional | TEXT | 65535 | Sí |  | NULL |  |  |  |
| precio | Precio en pesos chilenos sin decimales | INT | 11 | No |  |  | chk_reservas_montos: precio >= 0 and comision >= 0 and total = precio + comision |  |  |
| comision_porcentaje | Comisión de la plataforma aplicada (%) | DECIMAL | 5,2 | No |  |  |  |  |  |
| comision | Comisión en pesos (congelada al contratar) | INT | 11 | No |  |  | chk_reservas_montos: precio >= 0 and comision >= 0 and total = precio + comision |  |  |
| total | Total pagado = precio + comision (CHECK) | INT | 11 | No |  |  | chk_reservas_montos: precio >= 0 and comision >= 0 and total = precio + comision |  |  |
| estado | Estado de la máquina de estados de la contratación | ENUM |  | No |  | 'SOLICITADA' | Valores: SOLICITADA,APROBADA_ADMIN,PENDIENTE_PAGO,CONFIRMADA,EN_CURSO,ENTREGADA,EVALUADA,RECHAZADA,CANCELADA,REAGENDADA |  | idx_reservas_estado, idx_reservas_profesional, idx_reservas_servicio |
| estado_pago | Estado del pago SIMULADO; sin_cobro = cancelada antes de pagar (no hay nada que reembolsar) | ENUM |  | No |  | 'pendiente_confirmacion' | Valores: pendiente_confirmacion,confirmado,reembolsado,retenido_parcial,sin_cobro |  |  |
| conformidad_confirmada | 1 si la organización dio conformidad | TINYINT | 1 | No |  | 0 |  |  |  |
| conformidad_fecha | Fecha de la conformidad | DATETIME |  | Sí |  | NULL |  |  |  |
| aceptacion_fecha | Fecha de aceptación de condiciones | DATETIME |  | Sí |  | NULL |  |  |  |
| aceptacion_usuario | Nombre de quien aceptó | VARCHAR | 255 | Sí |  | NULL |  |  |  |
| aceptacion_version | Versión de las condiciones aceptadas | VARCHAR | 20 | Sí |  | NULL |  |  |  |
| reagendamiento_inicio | Inicio propuesto en un cambio de fecha pendiente | DATETIME |  | Sí |  | NULL | chk_reservas_reagenda: reagendamiento_inicio is null or reagendamiento_fin > reagendamiento_inicio |  |  |
| reagendamiento_fin | Término propuesto | DATETIME |  | Sí |  | NULL | chk_reservas_reagenda: reagendamiento_inicio is null or reagendamiento_fin > reagendamiento_inicio |  |  |
| reagendamiento_solicitado | Fecha de la propuesta | DATETIME |  | Sí |  | NULL |  |  |  |
| administrador_asignado_id | Cuenta administrativa responsable de la solicitud | VARCHAR | 50 | Sí | FK | NULL |  | cuentas.id (fk_reservas_administrador; ON DELETE SET NULL) | fk_reservas_administrador |
| administrador_asignado_nombre | Nombre del responsable al momento de asignar (instantánea histórica) | VARCHAR | 255 | Sí |  | NULL |  |  |  |
| administrador_decidio_en | Fecha de la decisión de administración | DATETIME |  | Sí |  | NULL |  |  |  |
| profesional_decidio_en | Fecha de la decisión del profesional | DATETIME |  | Sí |  | NULL |  |  |  |
| pago_confirmado_en | Fecha del pago simulado | DATETIME |  | Sí |  | NULL |  |  |  |
| creada_en | Fecha de creación | DATETIME |  | No |  | current_timestamp() |  |  | idx_reservas_estado |

## `contadores_reserva`

**Área:** Contratación. Contador correlativo por año del código visible SK-AAAA-NNNN; se incrementa dentro de la transacción que crea la reserva.

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| anio | Año del código (SK-AAAA-…) | SMALLINT | 6 | No | PK |  |  |  | PRIMARY |
| ultimo | Último número asignado en ese año | INT | 11 | No |  | 0 | chk_contadores_ultimo: ultimo >= 0 |  |  |

## `historial_reservas`

**Área:** Contratación. Bitácora de cada cambio de estado (trazabilidad/auditoría).

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador del evento | VARCHAR | 50 | No | PK |  |  |  | PRIMARY |
| secuencia | Orden estable de eventos (autoincremental) | BIGINT | 20 | No | UQ |  | AUTO_INCREMENT |  | idx_historial_reserva, uq_historial_secuencia |
| reserva_id | Contratación relacionada | VARCHAR | 50 | No | FK |  |  | reservas.id (fk_historial_reserva; ON DELETE RESTRICT) | idx_historial_reserva |
| fecha | Fecha y hora del evento | DATETIME |  | No |  |  |  |  | idx_historial_reserva |
| actor_tipo | Tipo de actor que generó el evento | ENUM |  | No |  |  | Valores: organizacion,profesional,skilly,sistema |  |  |
| actor_nombre | Nombre del actor (instantánea) | VARCHAR | 255 | No |  |  |  |  |  |
| estado_anterior | Estado previo | VARCHAR | 20 | Sí |  | NULL |  |  |  |
| estado_nuevo | Estado resultante | VARCHAR | 20 | No |  |  | chk_historial_estado: estado_nuevo in ('SOLICITADA','APROBADA_ADMIN','PENDIENTE_PAGO','CONFIRMADA','EN_CURSO','ENTREGADA','EVALUADA','RECHAZADA','CANCELADA','REAGENDADA') |  |  |
| motivo | Motivo | TEXT | 65535 | Sí |  | NULL |  |  |  |
| detalle | Detalle adicional (montos, horarios) | TEXT | 65535 | Sí |  | NULL |  |  |  |

## `mensajes_chat`

**Área:** Contratación. Mensajes del chat de coordinación de una contratación.

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador del mensaje | VARCHAR | 80 | No | PK |  |  |  | PRIMARY |
| reserva_id | Contratación relacionada | VARCHAR | 50 | No | FK |  |  | reservas.id (fk_mensajes_reserva; ON DELETE RESTRICT) | idx_mensajes_reserva |
| cuenta_id | Cuenta de usuario | VARCHAR | 50 | No | FK |  |  | cuentas.id (fk_mensajes_cuenta; ON DELETE CASCADE) | fk_mensajes_cuenta |
| autor_rol | Rol del autor del mensaje | ENUM |  | No |  |  | Valores: organizacion,profesional |  |  |
| autor_nombre | Nombre del autor (instantánea) | VARCHAR | 255 | No |  |  |  |  |  |
| texto | Contenido (1-5.000 caracteres; se muestra como texto, nunca como HTML) | TEXT | 65535 | No |  |  | chk_mensajes_largo: char_length(texto) between 1 and 5000 |  |  |
| enviado_en | Fecha de envío | DATETIME |  | No |  | current_timestamp() |  |  | idx_mensajes_reserva |

## `evaluaciones`

**Área:** Reputación. Evaluaciones ciegas bidireccionales (organización→profesional y viceversa).

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | VARCHAR | 50 | No | PK |  |  |  | PRIMARY |
| reserva_id | Contratación relacionada | VARCHAR | 50 | No | FK, UQ compuesta |  |  | reservas.id (fk_evaluaciones_reserva; ON DELETE RESTRICT) | uq_evaluacion_reserva_autor |
| profesional_id | Profesional al que pertenece | VARCHAR | 50 | No | FK |  |  | profesionales.id (fk_evaluaciones_profesional; ON DELETE CASCADE) | idx_evaluaciones_reputacion |
| organizacion_id | Organización asociada | VARCHAR | 50 | No | FK |  |  | organizaciones.id (fk_evaluaciones_organizacion; ON DELETE CASCADE) | fk_evaluaciones_organizacion |
| autor | Parte que evalúa | ENUM |  | No | UQ compuesta |  | Valores: organizacion,profesional |  | idx_evaluaciones_reputacion, uq_evaluacion_reserva_autor |
| calidad | Nivel de calidad (1-4) | TINYINT | 4 | No |  |  | chk_evaluaciones_calidad: calidad between 1 and 4 |  |  |
| plazos | Nivel de cumplimiento de plazos (1-4) | TINYINT | 4 | No |  |  | chk_evaluaciones_plazos: plazos between 1 and 4 |  |  |
| comunicacion | Nivel de comunicación (1-4) | TINYINT | 4 | No |  |  | chk_evaluaciones_comunicacion: comunicacion between 1 and 4 |  |  |
| comentario | Comentario opcional (se publica solo si se aprueba) | TEXT | 65535 | Sí |  | NULL |  |  |  |
| fecha | Fecha de envío (inicia el plazo de publicación automática) | DATETIME |  | No |  | current_timestamp() |  |  | idx_evaluaciones_moderacion, idx_evaluaciones_publicacion, idx_evaluaciones_reputacion |
| publicada | 1 si ya es visible (ambas partes evaluaron o venció el plazo) | TINYINT | 1 | No |  | 0 |  |  | idx_evaluaciones_publicacion, idx_evaluaciones_reputacion |
| estado_comentario | Estado de moderación del comentario | ENUM |  | No |  | 'sin_comentario' | Valores: sin_comentario,en_revision,aprobado,rechazado |  | idx_evaluaciones_moderacion |

## `favoritos`

**Área:** Catálogo. Servicios guardados por una organización.

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | INT | 11 | No | PK |  | AUTO_INCREMENT |  | PRIMARY |
| usuario_id | Organización dueña del favorito | VARCHAR | 50 | No | FK, UQ compuesta |  |  | organizaciones.id (fk_favoritos_organizacion; ON DELETE CASCADE) | uq_favorito |
| servicio_id | Servicio relacionado | VARCHAR | 50 | No | FK, UQ compuesta |  |  | servicios.id (fk_favoritos_servicio; ON DELETE CASCADE) | fk_favoritos_servicio, uq_favorito |

## `configuracion_plataforma`

**Área:** Configuración. Parámetros de negocio editables por la fundadora (fila única).

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Siempre 1 (CHECK): tabla de una sola fila | INT | 11 | No | PK | 1 | chk_configuracion_unica: id = 1 |  | PRIMARY |
| comision_porcentaje | Comisión de la plataforma aplicada (%) | DECIMAL | 5,2 | No |  | 15.00 | chk_configuracion_comisiones: comision_porcentaje between 0 and 50 and comision_profesional_porcentaje between 0 and 50 and comision_organizacion_porcentaje between 0 and 50 |  |  |
| comision_profesional_porcentaje | Comisión descontada al profesional (%) | DECIMAL | 5,2 | No |  | 5.00 | chk_configuracion_comisiones: comision_porcentaje between 0 and 50 and comision_profesional_porcentaje between 0 and 50 and comision_organizacion_porcentaje between 0 and 50 |  |  |
| comision_organizacion_porcentaje | Comisión cobrada a la organización (%) | DECIMAL | 5,2 | No |  | 5.00 | chk_configuracion_comisiones: comision_porcentaje between 0 and 50 and comision_profesional_porcentaje between 0 and 50 and comision_organizacion_porcentaje between 0 and 50 |  |  |
| retencion_bloque_minutos | Minutos que dura la retención de un bloque | INT | 11 | No |  | 10 |  |  |  |
| reputacion_minimo_evaluaciones | Mínimo de evaluaciones para mostrar reputación | INT | 11 | No |  | 3 | chk_configuracion_reputacion: reputacion_minimo_evaluaciones >= 0 and reputacion_ventana_max > 0 and reputacion_ventana_meses > 0 and reputacion_dias_publicacion >= 0 and reputacion_max_caracteres > 0 |  |  |
| reputacion_ventana_max | Máximo de evaluaciones consideradas | INT | 11 | No |  | 10 | chk_configuracion_reputacion: reputacion_minimo_evaluaciones >= 0 and reputacion_ventana_max > 0 and reputacion_ventana_meses > 0 and reputacion_dias_publicacion >= 0 and reputacion_max_caracteres > 0 |  |  |
| reputacion_ventana_meses | Antigüedad máxima (meses) de las evaluaciones consideradas | INT | 11 | No |  | 12 | chk_configuracion_reputacion: reputacion_minimo_evaluaciones >= 0 and reputacion_ventana_max > 0 and reputacion_ventana_meses > 0 and reputacion_dias_publicacion >= 0 and reputacion_max_caracteres > 0 |  |  |
| reputacion_dias_publicacion | Días tras los cuales una evaluación se publica sola | INT | 11 | No |  | 7 | chk_configuracion_reputacion: reputacion_minimo_evaluaciones >= 0 and reputacion_ventana_max > 0 and reputacion_ventana_meses > 0 and reputacion_dias_publicacion >= 0 and reputacion_max_caracteres > 0 |  |  |
| reputacion_max_caracteres | Largo máximo del comentario | INT | 11 | No |  | 500 | chk_configuracion_reputacion: reputacion_minimo_evaluaciones >= 0 and reputacion_ventana_max > 0 and reputacion_ventana_meses > 0 and reputacion_dias_publicacion >= 0 and reputacion_max_caracteres > 0 |  |  |
| version_condiciones | Versión vigente de las condiciones de contratación | VARCHAR | 20 | No |  | '2026-01' |  |  |  |
| version_politica_datos | Versión vigente de la política de datos | VARCHAR | 20 | No |  | '2026-01' |  |  |  |

## `tramos_cancelacion`

**Área:** Configuración. Política de cancelación: % retenido según horas de antelación.

| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |
|---|---|---|---|---|---|---|---|---|---|
| id | Identificador único del registro | INT | 11 | No | PK |  | AUTO_INCREMENT |  | PRIMARY |
| desde_horas | Horas de antelación desde las que aplica el tramo | INT | 11 | No | UQ |  | chk_tramos_valores: desde_horas >= 0 and retencion_porcentaje between 0 and 100 |  | uq_tramos_desde |
| retencion_porcentaje | Porcentaje retenido (0-100) | INT | 11 | No |  |  | chk_tramos_valores: desde_horas >= 0 and retencion_porcentaje between 0 and 100 |  |  |
| etiqueta | Texto del tramo mostrado al usuario | VARCHAR | 100 | No |  |  |  |  |  |

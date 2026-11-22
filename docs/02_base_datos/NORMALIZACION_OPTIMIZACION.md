# Normalización y optimización — Skilly LATAM

## 1. Análisis de formas normales

### Primera forma normal (1FN): valores atómicos, sin grupos repetidos

| Atributo multivaluado | Solución | Cumple |
|---|---|---|
| Formación, experiencia y habilidades del profesional | Tablas `profesional_formacion`, `profesional_experiencia` y `profesional_habilidades` (una fila por valor) | Sí |
| Entregables, modalidades y etiquetas del servicio | `servicio_entregables`, `servicio_modalidades`, `servicio_etiquetas` | Sí |
| Insignias | `profesional_insignias` con UNIQUE(profesional_id, insignia) | Sí |
| Horario semanal | Una fila por (profesional, día) | Sí |
| Tramos de cancelación | Tabla `tramos_cancelacion`, no un JSON en la configuración | Sí |

Ninguna columna guarda listas separadas por comas ni JSON.

### Segunda forma normal (2FN): sin dependencias parciales de una clave compuesta

Solo tienen PK compuesta `horarios_semanales(profesional_id, dia)` y, a nivel de unicidad, `favoritos` y `servicio_modalidades`.

En `horarios_semanales`, los atributos `activo`, `desde` y `hasta` dependen del par completo, no solo del profesional ni solo del día. Las demás tablas tienen PK simple, así que cumplen 2FN trivialmente.

### Tercera forma normal (3FN): sin dependencias transitivas

| Caso revisado | Análisis | Decisión |
|---|---|---|
| `servicios.categoria_id` + `subcategoria_id` | La categoría se puede deducir de la subcategoría (dependencia transitiva). | **Desnormalización controlada:** se conserva para filtrar el catálogo por categoría con el índice `idx_servicios_catalogo` sin JOIN. La API valida que la subcategoría pertenezca a la categoría (`skillyGuardarServicio`). Riesgo de anomalía: bajo, porque las subcategorías no cambian de categoría desde la interfaz. |
| `reservas.precio`, `comision_porcentaje`, `comision`, `total` | `total` se deriva de `precio + comision`, y el precio podría leerse del servicio. | **Instantánea histórica, no redundancia:** el contrato conserva lo que la organización aceptó aunque luego cambien el precio o la comisión. La anomalía `total ≠ precio + comision` se impide con `CHECK chk_reservas_montos`. |
| `reservas.administrador_asignado_nombre`, `historial_reservas.actor_nombre`, `mensajes_chat.autor_nombre` | Se podrían obtener por JOIN con `cuentas`. | Instantánea para auditoría: si la persona cambia su nombre o se elimina su cuenta, el registro histórico mantiene quién actuó. |
| `profesionales.validado_por_skilly` y `perfiles_profesionales.estado_validacion` | El primero se deriva del segundo (= 'validado'). | Se conserva porque la ficha pública (`profesionales`) no debe leer la tabla privada. Ambos se actualizan **en la misma transacción** (`validar-profesional`). Mejora propuesta: vista o columna generada (PM-BD-02). |
| `perfiles_profesionales.email` y `cuentas.email` | Dato duplicado. | La API nunca modifica el correo del profesional después del registro, por lo que no hay anomalía de actualización hoy. Si se agrega la edición, debe actualizarse en la misma transacción, igual que ya se hace con `organizaciones.email_contacto`. Registrado como PM-BD-03. |
| `organizaciones.rut_normalizado` | Derivado de `rut`. | Columna **generada** por el motor (`GENERATED ALWAYS … STORED`): no se puede desincronizar. |
| `reservas.profesional_id` | Se deduce de `servicio_id` (servicio → profesional). | Se conserva para las bandejas del profesional (`idx_reservas_profesional`) sin JOIN. Al crear la reserva la API comprueba que coincida con el dueño del servicio dentro de la transacción, y un servicio no cambia de dueño. |
| `evaluaciones.profesional_id` y `evaluaciones.organizacion_id` | Se deducen de `reserva_id`. | Se conservan para calcular la reputación con `idx_evaluaciones_reputacion` sin JOIN. La API los copia de la reserva al registrar la evaluación; nunca se reciben del cliente. |
| `solicitudes_revision_servicio.profesional_id` | Se deduce de `servicio_id`. | Permite listar las solicitudes de un profesional sin JOIN. Se toma de la cuenta autenticada solo después de comprobar que el servicio le pertenece (`servicios.profesional_id = :prof`). |
| `mensajes_chat.autor_rol` | Se deduce de `cuenta_id` → `cuentas.rol`. | Instantánea: el rol con el que se escribió el mensaje queda fijo aunque la cuenta cambie o se elimine. |
| `contadores_reserva.ultimo` | Coincide con el mayor número de `reservas.codigo` del año. | Tabla de control, no dato de negocio: existe para asignar el correlativo con un bloqueo de fila (INC-25). La migración la inicializa con el máximo existente. |

**Conclusión:** el esquema cumple **3FN** salvo las desnormalizaciones de la tabla anterior, todas identificadas y justificadas: instantáneas históricas, columnas copiadas para filtrar sin JOIN y una tabla de control. Cada una está protegida por una restricción, una transacción, una columna generada o la regla de que la API copia el valor desde la tabla de origen. La anomalía de borrado más grave (perder contrataciones al eliminar un servicio o una reserva) se corrigió con `ON DELETE RESTRICT` en `reservas` y en sus tablas dependientes.

### Más allá de 3FN

- **Forma normal de Boyce-Codd:** el esquema **no** está en FNBC estricta. Las desnormalizaciones de la tabla anterior son, justamente, dependencias cuyo determinante no es superclave (por ejemplo `servicio_id → profesional_id` dentro de `reservas`, o `reserva_id → profesional_id` dentro de `evaluaciones`). Se aceptan a propósito por rendimiento o por valor histórico. Las tablas sin esas columnas sí cumplen FNBC; en ellas las claves candidatas (`codigo`, `rut_normalizado`, `email`) están declaradas como UNIQUE.
- **4FN:** las modalidades y las etiquetas de un servicio son independientes entre sí y están en tablas separadas. No hay dependencias multivaluadas mezcladas en una misma tabla.

## 2. Problemas detectados y corregidos

| ID | Problema | Tipo | Corrección |
|---|---|---|---|
| INC-03 | `ON DELETE CASCADE` desde servicios, profesionales y organizaciones hacia `reservas` | Anomalía de borrado (pérdida de historial) | FK con `RESTRICT` y verificación previa en la API |
| INC-26 | `ON DELETE CASCADE` desde `historial_reservas`, `mensajes_chat` y `evaluaciones` hacia `reservas`, y un `DELETE` expuesto | Anomalía de borrado (pérdida de auditoría) | FK con `RESTRICT` (prueba CP-BD-13) y la API responde 409 al intentar borrar |
| INC-25 | Código `SK-AAAA-NNNN` calculado con `COUNT(*)+1` | Colisión en altas simultáneas o después de un borrado | Tabla `contadores_reserva` con bloqueo de fila |
| INC-12 | `favoritos.usuario_id` sin FK | Integridad referencial | `fk_favoritos_organizacion` (CASCADE) y limpieza de huérfanos en la migración |
| INC-12 | Una parte podía evaluar dos veces la misma reserva (carrera) | Duplicidad | UNIQUE(reserva_id, autor) |
| INC-12 | Bloques duplicados para la misma hora | Duplicidad | UNIQUE(profesional_id, inicio) |
| INC-12 | Sin CHECK en montos, rangos de hora y niveles 1-4 | Dominio | 20 restricciones CHECK con nombre (incluida `chk_contadores_ultimo`) |
| INC-14 / INC-39 | Unicidad de RUT dependiente del formato (puntos, guion y, después, espacios) | Clave candidata no garantizada | Columna generada `rut_normalizado` UNIQUE que quita puntos, guion y espacios (prueba CP-BD-14) |
| INC-43 | El comparador de esquemas no revisaba la columna destino de las FK | Verificación incompleta | `comparar_esquemas.py` compara `referenced_column_name` y es estricto por defecto |
| INC-20 | Orden del historial no determinista | Falta de atributo de orden | `secuencia` AUTO_INCREMENT UNIQUE |
| — | FK sin nombre (`*_ibfk_N`) | Mantenibilidad | 36 FK con nombre `fk_<tabla>_<referencia>` |

## 3. Optimización

### 3.1 Consultas: eliminación del patrón N+1 (INC-10)

El catálogo armaba cada servicio con alrededor de 15 consultas (servicio, entregables, modalidades, etiquetas, revisión, profesional y sus 4 tablas de detalle, categoría, subcategoría, próximo bloque, configuración y evaluaciones). Con 120 servicios eran **1.803 sentencias por petición**. Los listados de administración repetían el mismo patrón.

Se crearon funciones de carga **por lotes** en `backend/config/helpers.php`. Cada una ejecuta una consulta `WHERE id IN (…)` por tabla, sin importar la cantidad de filas:

| Función | Consultas totales |
|---|---|
| `obtenerServiciosLote` | 5 |
| `obtenerProfesionalesLote` | 5 |
| `obtenerCatalogoLote` | ~15 |
| `obtenerReservasLote` | 2 |
| `obtenerReservasConNombres` | 3 |
| `reputacionesLote` | 2-3 |

Además, el filtro de modalidad pasó de una consulta por servicio, hecha en PHP, a un `EXISTS` dentro de la consulta principal.

**Resultado medido** (misma semilla: 30 profesionales, 120 servicios, 1.200 bloques, 300 reservas; mismo equipo; servidor embebido de PHP con 4 procesos):

| Endpoint | SQL/petición antes → después | p50 antes → después | Rendimiento con 8 clientes | Error antes → después |
|---|---|---|---|---|
| Catálogo sin filtros | 1.803 → **19** (21 tras agregar el filtro de elegibilidad, INC-30) | 275,4 → **15,6 ms** (17,7×) | 7,9 → **146,6 req/s** | 0 % → 0 % |
| Catálogo filtrado (categoría + modalidad + texto) | 3 (fallaba) → **19** | — → **6,7 ms** | — → **246,9 req/s** | **100 %** → 0 % |
| Admin: todas las reservas | 1.504 → **7** | 192,3 → **13,0 ms** | 15,6 → **164,6 req/s** | 0 % → 0 % |
| Reservas: listado admin | 604 → **6** | 110,0 → **11,6 ms** | 32,5 → **180,6 req/s** | 0 % → 0 % |
| Reputación de un profesional | 4 → 5 | 1,8 → 1,9 ms | 743 → 861 req/s | 0 % → 0 % |

Prueba de estrés: 32 clientes simultáneos, 1.000 peticiones por endpoint (5.000 en total), con **0 % de error**.

Fuente: `evidencias/rendimiento_linea_base.json`, `rendimiento_corregido.json` y `estres_corregido.json`. Medición repetida después de las correcciones finales: `evidencias/correcciones_2026-11-17/rendimiento.json` (catálogo: 21 sentencias, p50 15,2 ms, p95 20,9 ms) y `estres.json`.

### 3.2 Índices

Se agregaron índices compuestos alineados con las cláusulas `WHERE` y `ORDER BY` reales de la API:

| Índice | Consulta que acelera |
|---|---|
| `idx_servicios_catalogo (publicado, categoria_id, subcategoria_id)` | Catálogo filtrado |
| `idx_servicios_precio (publicado, precio)` | Orden por precio |
| `idx_servicios_profesional (profesional_id, publicado)` | Servicios de un profesional |
| `idx_modalidades_modalidad (modalidad, servicio_id)` | Filtro de modalidad con EXISTS |
| `idx_reservas_organizacion (organizacion_id, inicio)` | "Mis servicios" ordenado por fecha |
| `idx_reservas_profesional (profesional_id, estado)` | Solicitudes del profesional, conteos |
| `idx_reservas_estado (estado, creada_en)` | Bandeja de administración |
| `idx_evaluaciones_reputacion (profesional_id, publicada, autor, fecha)` | Cálculo de reputación |
| `idx_evaluaciones_publicacion (publicada, fecha)` | Publicación diferida por plazo |
| `idx_historial_reserva (reserva_id, fecha, secuencia)` | Historial ordenado |
| `uq_bloque_profesional_inicio (profesional_id, inicio)` | Próximo bloque libre (MIN) y unicidad |
| `uq_organizaciones_rut_normalizado` | Verificar RUT duplicado (antes recorría toda la tabla en PHP) |

**Verificación con `EXPLAIN`** (`evidencias/explain_indices.txt`), con los datos de la semilla:

| Consulta | Tipo de acceso | Índice usado |
|---|---|---|
| Catálogo por categoría ordenado por precio | `ref` | `idx_servicios_catalogo` |
| Reservas de una organización por fecha | `ref`, *Using index* (cubriente) | `idx_reservas_organizacion` |
| Evaluaciones publicadas de varios profesionales | `range` | `idx_evaluaciones_reputacion` |
| Próximo bloque por profesional | `range`, *Using index* (cubriente) | `uq_bloque_profesional_inicio` |
| Historial de varias reservas | `range` | `idx_historial_reserva` |
| RUT duplicado | `const` | `uq_organizaciones_rut_normalizado` |

### 3.3 Otras optimizaciones

- La búsqueda de LinkedIn duplicado usaba `LOWER(linkedin) = LOWER(:x)`, lo que impide usar un índice. La intercalación `utf8mb4_unicode_ci` ya compara sin distinguir mayúsculas, así que ahora es `linkedin = :x` con `idx_profesionales_linkedin`.
- Purga de `sesiones_autenticacion` vencidas e `intentos_login` antiguos, para que esas tablas no crezcan sin límite.
- La publicación diferida de evaluaciones es una única sentencia `UPDATE … JOIN` indexada, en lugar de un proceso programado que XAMPP no ofrece.

### 3.4 Pendientes

| ID | Mejora | Motivo |
|---|---|---|
| PM-BD-01 | Búsqueda de texto con `FULLTEXT` (`MATCH … AGAINST`) en lugar de `LIKE '%texto%'` | `LIKE` con comodín inicial no usa índices; hoy es aceptable (p95 < 20 ms con 120 servicios) |
| PM-BD-02 | Derivar `validado_por_skilly` mediante una vista | Eliminar una redundancia controlada |
| PM-BD-04 | Paginación en catálogo y listados administrativos (`LIMIT/OFFSET` o por cursor) | Escalar a miles de servicios |

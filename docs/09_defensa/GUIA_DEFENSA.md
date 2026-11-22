# Guía de defensa oral — Skilly LATAM

La rúbrica (3.1.6.14) indica **tres preguntas por alumno**. Este banco reúne preguntas técnicas con respuestas **basadas en el código real** (archivo y función). Están ordenadas por tema y con dificultad ★ (definición), ★★ (aplicación) y ★★★ (análisis y decisión).

**Cómo usar este banco:**

- Cada integrante domina al menos su tema y uno transversal (seguridad o pruebas).
- Ensayen en voz alta: respuesta de 1 minuto con **qué**, **dónde está en el código** y **por qué** se decidió así.

## 1. Arquitectura

**1. ★ ¿Cuál es la arquitectura de Skilly?**
Cliente-servidor en tres capas:

- una SPA en React 18 + TypeScript (Vite, Tailwind);
- una API REST en PHP 8 con un archivo por recurso (`backend/api/<recurso>/index.php`), servida por Apache con `mod_rewrite`;
- MySQL/MariaDB a través de PDO.

El frontend llama a la API mediante `src/services/*` → `src/lib/apiClient.ts`.

**2. ★★ ¿Para qué sirve `USE_API` y qué riesgo tuvo?**
`src/config.ts` decide si los servicios llaman a la API o a datos simulados (`src/mocks`). Permite hacer demostraciones sin servidor. El riesgo apareció en la auditoría: las pruebas originales solo cubrían el modo demostración, cuyos datos ya venían en estados avanzados. Eso ocultó que, con la base real, el profesional no tenía botones para pasar a EN_CURSO o ENTREGADA (INC-01).

**3. ★★★ ¿Por qué no se cambió a Laravel o Next.js?**
La rúbrica y el entorno (XAMPP) favorecen PHP plano. Reescribir agregaba riesgo sin resolver los defectos reales, que eran de lógica, integridad y rendimiento. Se corrigió dentro de la arquitectura y se extrajeron funciones comunes a `helpers.php`: autenticación, validación, carga por lotes y reputación.

**4. ★★ ¿Cómo se enrutan las URL `/api/reservas/abc`?**
`backend/.htaccess` reescribe `^api/reservas/([^/]+)/?$` a `api/reservas/index.php?id=$1` y reenvía la cabecera `Authorization` con `E=HTTP_AUTHORIZATION`. Para las pruebas fuera de Apache, `tests/integracion/router.php` replica esas reglas.

## 2. Frontend

**5. ★ ¿Cómo se maneja el estado de la sesión?**
Con Zustand y `persist` (`src/modules/auth/sesionStore.ts`), que guarda usuario, organización, profesional y token en `localStorage`. Al cargar la aplicación, `restaurar()` valida el token contra `/auth/sesion`.

**6. ★★ ¿Cómo se validan los formularios?**
Con React Hook Form y esquemas Zod (`src/lib/validadores.ts`): RUT con dígito verificador (`rut.ts`), correo y contraseña (8 caracteres, letras y números). **La misma regla se repite en el servidor** (`rutValido`, `errorContrasena`), porque la API puede llamarse sin el formulario. CP-VAL-01..03 lo prueban.

**7. ★★★ ¿Cómo decide la pantalla del profesional qué botones mostrar?**
Con `accionesProfesional(reserva, yaEvaluo)` en `src/modules/agenda/estadoReserva.ts`, una función pura:

| Estado | Acción disponible |
|---|---|
| APROBADA_ADMIN | Responder la solicitud |
| REAGENDADA | Responder el cambio de fecha |
| CONFIRMADA | Iniciar el trabajo |
| EN_CURSO | Marcar como entregado |
| ENTREGADA con conformidad | Evaluar a la organización |

Está cubierta por CP-UNI-EST-05.

**8. ★★ ¿Qué hicieron por la accesibilidad?**

- Diálogos con `<dialog>` nativo (foco atrapado, Esc).
- Foco visible global.
- Objetivos táctiles de 44 px.
- Calendario con `role="grid"` y `aria-label`.
- Contraste corregido de 3,47:1 a 4,85:1 (INC-19).

E2E-17 verifica el orden de tabulación.

## 3. PHP y API REST

**9. ★ ¿Cómo responde la API a un error?**
Con JSON `{codigo, mensaje}` y el código HTTP correspondiente:

| HTTP | Significado |
|---|---|
| 400 | Validación |
| 401 | Sin sesión |
| 403 | Sin permiso (o `cambiar_contrasena`: la cuenta aún usa la contraseña inicial) |
| 404 | No encontrado |
| 409 | Conflicto de estado o historial; también al intentar borrar una contratación |
| 410 | Retención vencida |
| 429 | Demasiados intentos |
| 500 | Error interno |

El detalle técnico va solo a `error_log`.

**10. ★★ ¿Qué pasa si dos organizaciones eligen la misma hora a la vez?**
`POST /disponibilidad?accion=retener` abre una transacción y bloquea los bloques de la sesión con `SELECT … FROM bloques_disponibles … FOR UPDATE`. Si alguno ya tiene una retención vigente, responde 409. Al crear la reserva se vuelven a bloquear los bloques **primero** (mismo orden que al retener, para que dos operaciones no se esperen mutuamente) y se consume la retención. La conexión usa `READ COMMITTED`: con el `REPEATABLE READ` por defecto, InnoDB bloqueaba huecos del índice y dos retenciones contiguas producían *deadlock* (lo detectamos en la revisión final, INC-31). Lo prueban CP-INT-RES-01, CP-REG-08 y `concurrencia_escritura.mjs`: 60 organizaciones piden el mismo horario a la vez, una sola lo obtiene y ninguna recibe error 500.

**11. ★★★ Expliquen el defecto del filtro de modalidad.**
`servicios/index.php` preparaba `servicio_id=:id AND modalidad IN (?,?)`, que mezcla marcadores nombrados y posicionales. PDO lanza una excepción, por lo que **todo filtro de modalidad respondía 500**: lo detectó la prueba de carga, con 100 % de error. Se reemplazó por un `EXISTS` en la consulta principal con `:mod0, :mod1`, validados contra la lista de modalidades. Así además se pasó de 1 consulta por servicio a 0 consultas extra.

**12. ★★ ¿Cómo funciona el reagendamiento ahora?**

1. La organización propone otro bloque libre (`accion=reagendar`). La reserva pasa a REAGENDADA, se guarda la propuesta y el bloque deja de ofrecerse.
2. El profesional responde con `accion=responder-reagendamiento`:
   - si **acepta**, la reserva se mueve al nuevo horario y el original vuelve al catálogo;
   - si **rechaza**, se mantiene la fecha original y el bloque propuesto se libera.

En ambos casos la reserva vuelve a CONFIRMADA.

## 4. Base de datos y normalización

**13. ★ ¿Cuántas tablas tiene la base y cuáles son las centrales?**
30 tablas. La central es `reservas` (contratación), con `historial_reservas`, `mensajes_chat` y `evaluaciones`; `contadores_reserva` entrega su código correlativo. Los actores están en `organizaciones`, `profesionales` (+ `perfiles_profesionales`) y `cuentas`.

**14. ★★ ¿Está en 3FN? ¿Qué redundancias tiene?**
Cumple 3FN salvo desnormalizaciones identificadas y justificadas (`NORMALIZACION_OPTIMIZACION.md`):

- **Montos de la reserva:** son una instantánea del contrato, y `CHECK total = precio + comision` impide la inconsistencia.
- **Nombres de actores en el historial y `mensajes_chat.autor_rol`:** auditoría.
- **`categoria_id` en servicios:** permite filtrar con índice; la API valida la coherencia con la subcategoría.
- **`reservas.profesional_id`, `evaluaciones.profesional_id/organizacion_id`, `solicitudes_revision_servicio.profesional_id`:** se deducen de otra FK, pero se guardan para filtrar sin JOIN. La API los copia de la fila de origen; nunca los recibe del cliente.
- **`validado_por_skilly`:** se actualiza en la misma transacción que el estado de validación.
- **`rut_normalizado`:** columna generada por el motor.

**¿Y FNBC?** No en sentido estricto: esas columnas copiadas son dependencias cuyo determinante no es superclave (por ejemplo `servicio_id → profesional_id` dentro de `reservas`). Es una decisión consciente por rendimiento; la primera versión del documento afirmaba FNBC y lo corregimos (INC-43).

**15. ★★★ ¿Por qué cambiaron `ON DELETE CASCADE` a `RESTRICT` en reservas?**
En la línea base, cuando la fundadora borró un profesional con contrataciones, MySQL eliminó en cascada sus reservas, el historial y las evaluaciones (CP-INT-INT-02 devolvía 200). Una contratación es un registro contable y legal que no puede desaparecer. Ahora `reservas` tiene `RESTRICT` hacia servicios, profesionales y organizaciones, y la API responde 409. En la revisión final vimos que **la propia reserva** todavía se podía borrar desde el panel, arrastrando su historial, chat y evaluaciones (INC-26): se quitó el botón, `DELETE` responde 409 y esas tres tablas también tienen `RESTRICT` hacia `reservas`, así que la base lo impide aunque se use otro cliente (CP-BD-13).

**16. ★★ ¿Qué es `rut_normalizado` y por qué es una columna generada?**
Es `UPPER(REPLACE(REPLACE(REPLACE(rut,'.',''),'-',''),' ',''))` con `STORED` y un índice UNIQUE. "76.086.428-5", "76086428-5" y "76 086 428-5" son el mismo RUT. La versión anterior no quitaba espacios y permitía duplicarlo así (INC-39, CP-BD-14); además la API ahora guarda el RUT en forma canónica. Antes de la columna, la API recorría toda la tabla en PHP para comparar. Ahora es una búsqueda `const` por índice (verificada con EXPLAIN).

**17. ★★ ¿Cómo prueban que los scripts separados son correctos?**
`database/verificar/comparar_esquemas.py` compara `information_schema` (columnas, PK, FK, CHECK, únicos, índices) entre una base creada con `skilly.sql` y otra con los scripts 00-05. El resultado es 0 diferencias. Lo mismo se hizo con una base antigua migrada.

**18. ★★★ ¿Cómo migraron sin perder datos?**
`migracion_entrega3_2026_11.sql`:

1. Consultas de diagnóstico.
2. Limpia solo lo que ya era inválido (favoritos huérfanos, bloques duplicados).
3. Agrega columnas con `IF NOT EXISTS`.
4. Renumera `secuencia` en dos pasadas para no chocar con UNIQUE.
5. Reemplaza las FK `*_ibfk_N` por FK con nombre y agrega los CHECK.

Se probó con 300 reservas, 900 eventos y 300 evaluaciones: todos se conservaron. Es re-ejecutable.

Las correcciones finales van en una tercera migración, `migracion_correcciones_2026_11.sql`: crea `contadores_reserva` partiendo del mayor código ya usado en cada año, cambia las FK de historial, chat y evaluaciones a `RESTRICT`, agrega `sin_cobro` y reconstruye `rut_normalizado`. `database/verificar/verificar_scripts.sh` la aplica dos veces sobre una base de la versión anterior y compara el resultado con una instalación nueva: 0 diferencias.

## 5. Seguridad, autenticación y permisos

**19. ★ ¿Cómo guardan las contraseñas?**
Con `password_hash(PASSWORD_DEFAULT)` (bcrypt con sal) y `password_verify`. Las antiguas en texto plano se migran a hash en el primer ingreso (`login.php`).

**20. ★★ ¿Cómo funciona el token y por qué guardan su hash?**
`random_bytes(32)` → 64 caracteres hexadecimales que se entregan al cliente. En `sesiones_autenticacion` solo se guarda `sha256(token)`: si alguien copia la tabla, no puede iniciar sesión. Expira a los 30 días, `logout` lo borra y cambiar la contraseña revoca las demás sesiones (CP-SEG-04/05).

**21. ★★★ ¿Es seguro guardar el token en `localStorage`? ¿Y CSRF?**
Es un riesgo **mitigado, no eliminado**: un XSS podría leerlo. Mitigaciones:

- React escapa la salida y no usamos `dangerouslySetInnerHTML` (E2E-11 inyecta `<img onerror>` en el chat y no se ejecuta);
- la API envía CSP y nosniff;
- el token es revocable.

La alternativa es una cookie `HttpOnly; Secure; SameSite=Strict`, que exige el mismo dominio para frontend y API (PM-SEG-01). **CSRF no aplica** hoy porque el token viaja en la cabecera `Authorization`, que el navegador no envía de forma automática.

**22. ★★ ¿Qué es IDOR y cómo lo evitan?**
Es cambiar el ID en la URL para ver datos ajenos. Antes de responder, cada recurso verifica la pertenencia: `skillyReservaAutorizada` compara `organizacion_id`/`profesional_id` con la cuenta, y lo mismo hacen el chat y los documentos. CP-SEG-12/16/17 devuelven 403. Editar un servicio ajeno da 404 para no revelar que existe.

**23. ★★ ¿Cómo evitan la fuerza bruta?**
Con la tabla `intentos_login`: 5 fallos por correo o 20 por IP en 15 minutos → 429. El mensaje de error es el mismo exista o no el correo (CP-SEG-03), y desde la revisión final también el tiempo de respuesta: si el correo no existe, `login.php` verifica contra un hash ficticio para no delatarlo (INC-45).

**24. ★★★ Un profesional sube `cv.pdf`, pero en realidad es PHP. ¿Qué pasa?**
`finfo` detecta `text/x-php`, que no corresponde a `.pdf`, y se rechaza con 400 (CP-SEG-10). Aunque pasara:

- se guarda con un nombre aleatorio `doc-<hex>.pdf`;
- la carpeta tiene `Require all denied`;
- solo se descarga por la API con `nosniff` y control de dueño.

**25. ★★ ¿Cuáles son los 5 patrones de seguridad principales?**

1. bcrypt.
2. PDO parametrizado.
3. Tokens hasheados con expiración y revocación.
4. RBAC + anti-IDOR.
5. Límite de intentos.

Y además: validación de servidor, subida segura, CORS y cabeceras, errores sin fuga, integridad transaccional y escape XSS (12 en total, en `AUDITORIA_SEGURIDAD.md`).

**26. ★★★ ¿Qué vulnerabilidad sigue abierta?**
Ninguna crítica ni alta. Las dependencias con avisos (react-router 6.30 y zod 3) se migraron a react-router 7.18 y zod 4.6 y `npm audit --omit=dev` da 0. Queda **mitigado, no eliminado**, el token en `localStorage` (INC-23, pregunta 21). En la revisión final también cerramos la contraseña inicial pública: ahora la API bloquea la cuenta hasta que se cambie (403 `cambiar_contrasena`, CP-SEG-23).

## 6. Git y GitHub

**27. ★ ¿Qué flujo de ramas proponen?**
GitHub Flow: `main` protegida; ramas `feature/`, `fix/` y `docs/`; PR con un revisor y CI en verde; *squash merge*.

**28. ★★ ¿Qué hace el CI?**
`.github/workflows/ci.yml` ejecuta `npm ci`, `typecheck`, `npm test` y `build`. Además levanta MariaDB 10.11 y PHP 8.2, ejecuta `php -l`, importa `skilly.sql`, inicia la API con el router y corre las 94 pruebas de integración. Si algo falla, el PR no se integra.

**29. ★★ ¿Qué no debe subirse al repositorio?**
`node_modules`, `dist`, `.env.local`, `backend/config/config.local.php` (credenciales) y los documentos subidos. Todo eso ya está en `.gitignore`.

## 7. Casos de uso y pruebas

**30. ★ ¿Cuántos casos de uso y requerimientos tienen?**
26 casos de uso (especificados en `docs/05_pruebas/CASOS_DE_USO.md`, con tres diagramas por actor), 28 RF y 10 RNF. La matriz de trazabilidad muestra 100 % de casos de uso cubiertos y 37/38 requerimientos validados: RNF-07 (compatibilidad con XAMPP) queda pendiente hasta ejecutar CP-MAN-01 y CP-MAN-03 en Windows. Antes contaba como validado con cualquier caso aprobado; lo corregimos para no declarar algo que no probamos (INC-44).

**31. ★★ ¿Cuáles son los 5 tipos de prueba?**

| Tipo | Casos | Herramienta |
|---|---|---|
| Unitarias | 45 | Vitest |
| Integración (incluye 16 de regresión y 2 de concurrencia) | 69 | API y base reales |
| E2E | 20 | Chrome con Playwright |
| Seguridad | 28 | Vitest contra la API, Playwright, `npm audit` |
| Rendimiento, carga y estrés | 7 | `medir.mjs`, `concurrencia_escritura.mjs` |

Además: base de datos (15), usabilidad y compatibilidad (14) y análisis estático (3). En total 201 casos.

**32. ★★★ ¿Cómo saben que sus pruebas detectan errores reales?**
Se ejecutaron primero contra la **versión de la Evaluación 2** (línea base): 15 de 74 casos de integración fallaron, la integridad de la base pasó 1 de 8 y el catálogo filtrado tuvo 100 % de error. Después de cada corrección se repitió la suite completa sobre una base nueva hasta 77/77. Una prueba que nunca falla no demuestra nada; estas fallaron por los motivos correctos.

Lo repetimos en la revisión final: antes de corregir cada defecto escribimos su prueba de regresión y la ejecutamos con el código anterior. Resultado: 75/94 (fallan las 17 nuevas y dos que dependían de ellas); con el código corregido, 94/94. Evidencia: `evidencias/correcciones_2026-11-17/integracion_linea_base_codigo_anterior.json`.

**33. ★★ Den un ejemplo de prueba de valor límite.**

- CP-LIM-01: un archivo de exactamente 5 MB + 10 bytes se rechaza.
- CP-LIM-03: `precio_min = precio_max = 350000` incluye el servicio, y 350001 lo excluye.
- CP-UNI-VAL-01: una contraseña de 7 caracteres falla y una de 8 pasa.

**34. ★★ ¿Cómo se prueba la evaluación ciega sin esperar 7 días?**
CP-INT-EVA-05 cambia, como fundadora, `diasPublicacionAutomatica` a 0. La organización evalúa sola, se verifica que la evaluación se publica y cuenta en la reputación, y luego se restaura la configuración.

## 8. Resultados y métricas

**35. ★ ¿Cuál es el porcentaje de pruebas aprobadas?**
195 de 195 ejecutadas, un 100 %. Hay 6 casos manuales pendientes (XAMPP, usabilidad con personas, otros navegadores y lector de pantalla), es decir, un 3,0 % del total. El único fallo anterior, la auditoría de dependencias, se corrigió.

**36. ★★ ¿Cómo calculan las métricas?**
Con fórmulas en la hoja *Métricas*: `COUNTIF` sobre la columna Estado de *Casos*, `COUNTIFS` por requerimiento en *Trazabilidad* y conteos en *Incidencias*. Si el equipo completa un caso pendiente, todo se recalcula.

**37. ★★★ ¿Cuánto mejoró el rendimiento y cómo lo midieron?**
Con la misma semilla (120 servicios, 300 reservas) y `medir.mjs`, que cuenta las sentencias SQL con `SHOW GLOBAL STATUS 'Questions'` y mide p50/p95 y req/s:

| Medida | Antes | Después |
|---|---|---|
| Sentencias SQL del catálogo | 1.803 | 19 (21 tras agregar el filtro de elegibilidad) |
| p50 | 275 ms | 15,6 ms (17,7×); 15,2 ms tras la revisión final |
| Rendimiento | 7,9 req/s | 146,6 req/s |
| Estrés (32 clientes, 5.000 peticiones) | — | 0 % de error |

La mejora vino de la carga por lotes (`obtenerCatalogoLote`) y de los índices compuestos.

**38. ★★ ¿Su producto está certificado?**
"Aprobación condicionada". Cumple ≥ 95 % de aprobación, 0 defectos críticos o altos abiertos, 100 % de cobertura de casos de uso, rendimiento y 0 avisos de dependencias. Faltan dos criterios que dependen del equipo: el checklist con 3 personas externas y la instalación e integración en XAMPP (RNF-07).

## 9. Problemas encontrados y decisiones

**39. ★★ ¿Cuál fue el problema más grave?**
INC-01: con la base real no se podía completar una contratación, porque el profesional no tenía cómo pasar a "En curso" ni a "Entregada". Por eso no había conformidad, evaluación ni reputación. Los endpoints existían, pero ninguna pantalla los usaba.

**40. ★★★ ¿Por qué la publicación automática de evaluaciones no usa un cron?**
XAMPP en Windows no trae un programador de tareas integrado a PHP. `publicarEvaluacionesVencidas()` ejecuta un único `UPDATE … JOIN configuracion` indexado cada vez que alguien consulta la reputación o las evaluaciones. El efecto visible es el mismo y no requiere infraestructura adicional.

**41. ★★ ¿Por qué el pago es simulado?**
Integrar una pasarela real (Webpay, Mercado Pago) excede el alcance académico y obligaría a manejar datos de tarjetas. El flujo está modelado igual (PENDIENTE_PAGO → CONFIRMADA, `estado_pago`), la interfaz lo dice explícitamente ("Pago simulado") y los datos de la tarjeta no se envían ni se guardan.

**42. ★★★ Si tuvieran una semana más, ¿qué harían primero?**

1. Aplicar los checklists de usabilidad y corregir los hallazgos.
2. Activar el CI en GitHub, con la prueba de concurrencia.
3. Usar una cookie `HttpOnly` para la sesión.
4. Subir la cobertura automatizada sobre el 70 %.

Es el orden de impacto en la evaluación y en el riesgo (`PLAN_MEJORA.md`).

## 10. Revisión final

**43. ★★ ¿Por qué fijaron la zona horaria en la configuración?**
La política de cancelación depende de cuántas horas faltan para la sesión. PHP tomaba la zona de `php.ini` (UTC en XAMPP) y el navegador interpretaba las fechas en su propia zona, así que la antelación podía correrse 3 horas (INC-27). Ahora PHP usa `America/Santiago`, cada conexión MySQL fija el mismo desfase y `apiClient` convierte las fechas de la API con esa zona (`fromZonedTime`). CP-REG-11 lo prueba.

**44. ★★★ Un servicio dura 120 minutos y la agenda tiene bloques de 60. ¿Qué pasaba y qué pasa ahora?**
Antes la reserva ocupaba un solo bloque, así que la hora siguiente se podía vender a otra organización (INC-29). Ahora `cadenaDeBloques()` exige `ceil(minutos / 60)` bloques consecutivos libres, los bloquea todos en la misma transacción y la reserva termina en `inicio + duración`. La agenda solo ofrece inicios que tienen tiempo suficiente (`GET /disponibilidad/?servicio_id=`). CP-REG-06.

**45. ★★ ¿Por qué agregaron el estado de pago `sin_cobro`?**
Una organización que cancelaba antes de pagar quedaba registrada como "reembolsado", lo que contablemente es falso: no hubo cobro (INC-38). La prueba original CP-INT-CAN-01 esperaba justo ese valor, así que aprobaba validando el defecto; corregimos ambas.

**46. ★★★ ¿Qué aprendieron de que una revisión encontrara 23 defectos con la suite al 100 %?**
Que una suite en verde solo prueba lo que se le pregunta. Faltaban tres tipos de prueba: concurrencia (todo corría en serie), zona horaria (todo corría en la misma) y **la misma regla en cada ruta** (la evaluación ciega se respetaba en `?accion=estado` pero no en `?reserva_id`). Ahora las reglas viven en funciones comunes de `helpers.php` y el plan de mejora exige una prueba por ruta (PM-PRU-05).

## 11. Asignación de tres preguntas por integrante

Completar cuando se confirmen los integrantes y su participación. Cada persona prepara las preguntas de su área y una transversal.

| Integrante | Rol / área | Pregunta 1 (★) | Pregunta 2 (★★) | Pregunta 3 (★★★) |
|---|---|---|---|---|
| (nombre) | Backend / BD | 13 | 10, 16 o 43 | 15, 18 o 44 |
| (nombre) | Frontend / UX | 5 | 6 u 8 | 7 |
| (nombre) | QA / Seguridad | 19 o 30 | 22, 31, 33 o 45 | 21, 24, 32 o 46 |
| (nombre) | Líder / Documentación | 1 o 27 | 28, 36 o 38 | 3, 37 o 42 |

Sugerencia de ensayo: un integrante hace de docente, elige una pregunta al azar de otra área y pide **mostrar el archivo** donde está la respuesta.

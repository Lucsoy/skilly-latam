# Plan de pruebas — Skilly LATAM

**Versión:** 2.1 (Evaluación 3, con las correcciones de la revisión final). **Fecha:** 17-11-2026.
**Documento editable con todos los casos:** `Plan_y_Resultados_de_Pruebas.xlsx`. Cada caso registra ID, requerimiento, módulo, objetivo, tipo, precondiciones, datos de entrada, procedimiento, resultado esperado, resultado obtenido, estado, evidencia y observaciones.

## 1. Objetivo

Verificar que Skilly LATAM cumpla sus 28 requerimientos funcionales, sus 10 requerimientos no funcionales y sus 14 reglas de negocio, cubriendo el **100 % de los 26 casos de uso**. Para ello se combinan casos positivos, negativos, de límite, de permisos, de errores de conexión y de estados inválidos, en **cinco tipos de prueba obligatorios** más usabilidad, compatibilidad y base de datos.

## 2. Alcance

| Incluido | Excluido (y por qué) |
|---|---|
| Frontend React (modo API y modo demostración), API PHP, base MariaDB/MySQL, flujos de los 4 roles | Pasarela de pago real: fuera del alcance académico; se prueba el **pago simulado** |
| Seguridad de la aplicación (OWASP Top 10 aplicable) | Notificaciones por correo: no implementadas (todo se informa dentro de la plataforma) |
| Rendimiento en entorno local con datos sintéticos | Pruebas de carga en producción o en la nube (no hay despliegue) |
| Usabilidad con 3 personas externas (instrumento preparado) | — |

## 3. Requerimientos, actores y casos de uso

Las tablas completas están en las hojas *Requerimientos*, *Actores*, *Reglas de negocio* y *Trazabilidad* del libro Excel. Resumen:

- **Actores (6):** Visitante, Organización, Profesional, Administrador, Fundadora, Sistema.
- **Requerimientos funcionales (28):** RF-01 Registro de organización … RF-28 Historial auditable.
- **Requerimientos no funcionales (10):** seguridad de credenciales, autorización por recurso, integridad, rendimiento, usabilidad y accesibilidad, diseño responsivo, compatibilidad XAMPP, mantenibilidad, privacidad y robustez.
- **Casos de uso implementados (26):**

| CU | Nombre | Actor principal | RF |
|---|---|---|---|
| CU-01 | Registrar organización | Visitante | RF-01 |
| CU-02 | Registrar profesional | Visitante | RF-02 |
| CU-03 | Iniciar y cerrar sesión | Todos | RF-03, RF-04 |
| CU-04 | Cambiar contraseña | Todos | RF-03 |
| CU-05 | Editar perfil de organización | Organización | RF-05 |
| CU-06 | Completar perfil profesional y subir documentos | Profesional | RF-06 |
| CU-07 | Validar profesional | Administrador | RF-07 |
| CU-08 | Gestionar servicios | Profesional | RF-08 |
| CU-09 | Revisar servicio | Profesional, Administrador | RF-09 |
| CU-10 | Configurar disponibilidad | Profesional | RF-12 |
| CU-11 | Buscar y filtrar servicios | Visitante, Organización | RF-10 |
| CU-12 | Gestionar favoritos | Organización | RF-11 |
| CU-13 | Agendar y solicitar contratación | Organización | RF-13, RF-14 |
| CU-14 | Revisar solicitud de contratación | Administrador, Fundadora | RF-15 |
| CU-15 | Responder solicitud de trabajo | Profesional | RF-16 |
| CU-16 | Pagar contratación (simulado) | Organización | RF-17 |
| CU-17 | Coordinar por chat | Organización, Profesional | RF-18 |
| CU-18 | Reagendar contratación | Organización, Profesional | RF-19 |
| CU-19 | Cancelar contratación | Organización | RF-20 |
| CU-20 | Ejecutar, entregar y dar conformidad | Profesional, Organización | RF-21, RF-28 |
| CU-21 | Evaluar contraparte | Organización, Profesional, Sistema | RF-22 |
| CU-22 | Consultar reputación | Visitante, Organización | RF-23 |
| CU-23 | Moderar comentarios | Administrador | RF-24 |
| CU-24 | Supervisar la plataforma | Administrador, Fundadora | RF-25 |
| CU-25 | Configurar plataforma y administradores | Fundadora | RF-26 |
| CU-26 | Consultar ingresos | Profesional | RF-27 |

**Condiciones de aceptación por caso de uso:** son los "resultados esperados" de los casos de prueba que lo cubren (hoja *Trazabilidad*). Por ejemplo, CU-13 se acepta si:

- el bloque queda retenido para una sola organización (CP-INT-RES-01);
- no se crea la reserva sin aceptar las condiciones (CP-INT-RES-02);
- se rechaza una modalidad no ofrecida (CP-INT-RES-03);
- la reserva nace SOLICITADA con `total = precio + comisión` y un código legible (CP-INT-RES-04);
- el flujo funciona en la interfaz real (E2E-04/05).

## 4. Tipos de prueba

| N.º | Tipo | Qué se prueba | Herramienta | Casos |
|---|---|---|---|---|
| 1 | **Unitarias** | Máquina de estados, validadores (RUT, contraseña, correo, LinkedIn), enlaces seguros, reglas de servicios y de cancelación en modo demostración | Vitest | 45 |
| 2 | **Integración** | API PHP + MariaDB reales. Ciclo completo con 4 roles: positivos, negativos (`Integración (negativa)`), límites (`Validación`) y escrituras simultáneas (`Integración (concurrencia)`). Incluye las 16 pruebas de regresión CP-REG-01..16 de la revisión final | Vitest + `fetch`; `tests/rendimiento/concurrencia_escritura.mjs` | 69 (44 positivos, 10 negativos, 13 de validación/límite, 2 de concurrencia) |
| 3 | **Funcionales extremo a extremo** | Interfaz real en Chrome: cambio obligatorio de la contraseña inicial → registro → catálogo → agenda → solicitud → aprobación → pago simulado → reagendamiento → chat → ejecución → conformidad → evaluaciones → moderación → cancelación → ingresos → panel | Playwright + Chrome | 20 |
| 4 | **Seguridad** | SQLi, XSS (incluidos enlaces `javascript:`), IDOR, roles, evaluación ciega, contraseña inicial, fuerza bruta, revocación de sesiones, subidas maliciosas, CORS, cabeceras, fuga de errores, dependencias | Vitest (API), Playwright, `npm audit` | 28 |
| 5 | **Rendimiento, carga y estrés** | Sentencias SQL por petición, latencia p50/p95, req/s con 8 clientes, 0 % de error con 32 clientes; 60 organizaciones reservando el mismo horario a la vez | `tests/rendimiento/medir.mjs` + `semilla.mjs`; `concurrencia_escritura.mjs` | 7 |
| 6 | Base de datos | Idempotencia, equivalencia de scripts, migraciones sin pérdida, CHECK/UNIQUE/FK, borrado de una contratación rechazado, RUT con espacios | MariaDB + Python | 15 |
| 7 | Usabilidad y compatibilidad | Responsivo 390/768/1440 px, teclado, contraste, checklist con 3 personas, otros navegadores | Playwright + formularios | 14 (9 responsivos, 1 de teclado, 4 manuales) |
| — | Análisis estático | TypeScript, compilación, sintaxis PHP | tsc, Vite, `php -l` | 3 |

**Total: 201 casos** (195 ejecutados y aprobados; 6 manuales pendientes del equipo).

## 5. Técnicas de diseño de casos

| Técnica | Ejemplos |
|---|---|
| Partición de equivalencia | RUT válido / inválido / con otro formato; rol permitido / no permitido |
| Valores límite | Presentación de 39 y 40 caracteres; archivo de 5 MB + 10 bytes; mensaje de 5.001 caracteres; precio igual al mínimo y +1; niveles 4 y 5; contraseña de 7 y 8 caracteres |
| Transición de estados | Todos los cambios válidos de la máquina y los saltos inválidos (pagar antes de aceptar, entregar sin estar en curso, segunda conformidad, segunda evaluación) |
| Pruebas de permisos | Cada acción con el rol correcto y con un rol o dueño incorrecto |
| Errores de conexión y estados inesperados | Token inválido, sesión revocada, retención vencida (410), reserva inexistente (404 sin fuga) y API caída. La interfaz muestra "No se pudo conectar…" con *Reintentar*: está implementado en `apiClient`, pero no se automatizó la caída del servidor (se valida en la demostración) |
| Pruebas de concurrencia | Dos organizaciones retienen el mismo bloque (409); dos reservas simultáneas reciben códigos distintos (CP-REG-08); cancelar e iniciar a la vez, solo una gana (CP-REG-12); 60 clientes reservan el mismo horario y exactamente uno lo obtiene, sin errores 500 (CP-EST-02); 32 clientes simultáneos en lectura |
| Pruebas de regresión | Cada defecto de la revisión final tiene una prueba que **falla con el código anterior y pasa con el corregido** (línea base: 75/94 con el código anterior → 94/94) |

## 6. Entorno y datos

- **Automatizado:** Ubuntu 24.04, Node 22.23, PHP 8.3.6, MariaDB 10.11.14, Chrome 153 headless. Servidor embebido de PHP con `tests/integracion/router.php`, que replica las reglas de `backend/.htaccess`. Base recién importada desde `database/skilly.sql` antes de cada ejecución (`scripts/entorno-pruebas.sh`).
- **Datos:**
  - Las pruebas crean sus propias cuentas con correos únicos `*@ejemplo.test`.
  - El rendimiento usa datos **sintéticos** con prefijo `perf-`, generados por `semilla.mjs`.
  - No se usan datos personales reales.
- **Entorno oficial del equipo:** Windows + XAMPP. Los casos CP-MAN-01..03 repiten instalación e integración allí.

## 7. Protocolo de ejecución

1. **Preparar:** `bash scripts/entorno-pruebas.sh` (o importar `skilly.sql` en XAMPP).
2. **Estáticas:** `npm run typecheck`, `npm run build`, `php -l` sobre `backend/`.
3. **Unitarias:** `npm test` (o `npm run test:cobertura`).
4. **Integración y seguridad:** `npm run test:integracion` → `evidencias/correcciones_2026-11-17/integracion.json`. Escrituras simultáneas: `node tests/rendimiento/concurrencia_escritura.mjs 60`.
5. **E2E:** con `npm run dev` (proxy a la API) → `npm run test:e2e` → capturas y `resultados_e2e.json`.
6. **Base de datos:** `database/verificar/` (`verificar_scripts.sh`, `comparar_esquemas.py` y `pruebas_integridad.sql`).
7. **Rendimiento:** cargar la semilla en una base de prueba → `npm run test:rendimiento -- --consultas`; estrés con `--concurrencia 32 --total 1000`.
8. **Manuales:** checklists de usabilidad (3 personas), XAMPP, Firefox/Edge y lector de pantalla.
9. **Registrar:** cada ejecución en la hoja *Registro de ejecución* (comando, entorno, fecha, resultado, errores, evidencia, corrección).
10. **Ante un fallo:** registrar la incidencia (INC-xx), corregir, **repetir la suite completa** (no solo el caso) y actualizar la comparación esperado/obtenido.

## 8. Criterios de entrada, salida y suspensión

Ver la hoja *Certificación*.

- **Suspensión:** se suspende la ejecución si falla la importación del esquema o la API no responde en `/api/categorias/`.
- **Reanudación:** se reanuda desde el paso 1 con una base nueva.

## 9. Trazabilidad

La hoja *Trazabilidad* calcula con fórmulas:

- cuántos casos aprobados cubren cada caso de uso (**26/26 cubiertos = 100 %**);
- cada requerimiento RF/RNF (**37/38 validados = 97,4 %**). RNF-07 (compatibilidad con XAMPP) solo se considera validado cuando se aprueben CP-MAN-01, CP-MAN-03 y CP-MAN-05 en Windows + XAMPP; antes contaba cualquier caso aprobado asociado (INC-44).

Durante la elaboración, la primera versión de la matriz detectó tres requerimientos sin casos: RF-05 perfil de organización, RF-25 panel de administración y RF-27 ingresos. Se agregaron CP-INT-ORG-01, CP-INT-ADM-03, CP-INT-ING-01 y E2E-18/19/20 (registro EJ-16).

**Lo que no puede probarse automáticamente en este entorno** queda como *Pendiente*, con responsable:

| Caso | Prueba pendiente |
|---|---|
| CP-MAN-01 | Instalación en Windows + XAMPP |
| CP-MAN-02 | Bloqueo de `uploads/` por Apache |
| CP-MAN-03 | Integración en XAMPP |
| CP-MAN-04 | Checklist de usabilidad con 3 personas |
| CP-MAN-05 | Firefox y Edge |
| CP-MAN-06 | Lector de pantalla |

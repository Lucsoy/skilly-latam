# Plan de mejora continua — Skilly LATAM

Cada mejora nace de una **incidencia o discrepancia concreta** detectada en la comparación entre resultados esperados y obtenidos (`docs/05_pruebas/RESULTADOS_Y_VALIDACION.md`). Las mejoras se separan en **implementadas en esta entrega** (con su verificación) y **pendientes** (con responsable, esfuerzo e indicador).

Cuando el equipo defina a sus integrantes, los roles propuestos se asignan a personas en la matriz de `docs/08_equipo/`.

**Esfuerzo:** S < 4 h · M 4-16 h · L > 16 h.
**Prioridad:** P1 antes de la entrega/defensa · P2 próximo ciclo · P3 cuando se despliegue.

## 1. Mejoras implementadas en esta entrega

| ID | Área | Problema original (evidencia) | Causa | Solución aplicada | Indicador de éxito | Verificación |
|---|---|---|---|---|---|---|
| MI-01 | Código / funcionalidad | INC-01: el ciclo se detenía en CONFIRMADA (CP-INT-RES-09 fallaba) | Endpoints sin interfaz | Acciones por estado en `DetalleSolicitud` + servicios `iniciarTrabajo`/`marcarEntregado` | Ciclo completo en la interfaz | E2E-12 ✓, CP-UNI-CON-03 ✓ |
| MI-02 | Código / funcionalidad | INC-06: reagendamiento y cancelación sin flujo (CP-INT-REA-01/02 fallaban) | Acción inexistente y sin botones | Estado REAGENDADA, `responder-reagendamiento`, diálogos con simulación de retención | 2 casos API + 3 E2E aprobados | CP-INT-REA-01/02, E2E-09/10/16 ✓ |
| MI-03 | Código / funcionalidad | INC-05: reputación nunca visible; el profesional no podía evaluar | Sin publicación por plazo ni pantalla | `publicarEvaluacionesVencidas()` + `EvaluarOrganizacion` | Publicación conjunta y por plazo | CP-INT-EVA-03/05, E2E-14 ✓ |
| MI-04 | Código | INC-02: filtro de modalidad con 100 % de error 500 | Parámetros PDO mezclados | `EXISTS` con parámetros nombrados | 0 % de error | CP-INT-CAT-03, CP-REN-02 ✓ |
| MI-05 | Base de datos | INC-03: borrado en cascada de contrataciones (CP-INT-INT-02 devolvía 200) | FK CASCADE | FK RESTRICT + migración no destructiva | 8/8 restricciones (antes 1/8); 10/10 tras la revisión final | CP-BD-05..14 ✓ |
| MI-06 | Base de datos | INC-12/14/20: faltaban FK, UNIQUE, CHECK y un orden estable | Esquema sin restricciones declarativas | 36 FK con nombre, 19 CHECK (20 tras la revisión final), UNIQUE compuestos, `rut_normalizado`, `secuencia`; scripts separados | Esquemas equivalentes | CP-BD-01..04 ✓ |
| MI-07 | Rendimiento | INC-10: 1.803 consultas por petición del catálogo | N+1 | Carga por lotes + 12 índices compuestos | ≤ 20 SQL; p95 ≤ 300 ms | CP-REN-01..05, CP-EST-01 ✓ |
| MI-08 | Seguridad | INC-04, 08, 09, 15, 17 | Confianza en el frontend; configuración por defecto | Filtro de privacidad, validación de servidor, cabeceras, sin fuga de errores, demo oculta en modo API, aviso de contraseña inicial | 0 vulnerabilidades altas propias abiertas | CP-SEG-18/20/22, CP-VAL-01..03 ✓ |
| MI-09 | Usabilidad | INC-18 desborde en móvil; INC-19 contraste 3,47:1; INC-16 pago sin aviso | CSS decorativo; paleta sin verificar | Media query, primario-700/800, foco visible en opciones, aviso de pago simulado | 0 desborde en 390/768/1440; contraste ≥ 4,5 | RESP-* ✓, E2E-08 ✓ |
| MI-10 | Pruebas | Solo 27 pruebas unitarias en modo demo; ninguna contra la API | Sin entorno de integración | 77 de integración, 20 E2E, rendimiento, BD, línea base y protocolo (94 de integración y 30 pasos E2E tras la revisión final) | 100 % de CU cubiertos | Hoja Trazabilidad ✓ |
| MI-11 | Documentación | README con estado desactualizado; sin modelos ni plan de pruebas | — | Documentación en `docs/`, README actualizado, diccionario generado desde la base | Documentación coherente con el código | Revisión cruzada (§4 del informe) |
| MI-12 | Control de versiones | No había `.git` ni CI | — | Guía Git/GitHub, plantilla de PR y flujo `ci.yml` (preparado, no ejecutado en GitHub) | — | Pendiente PM-VER-01 |
| MI-13 | Seguridad | INC-21 (antes PM-SEG-02): 3 avisos en dependencias de producción | react-router 6 / zod 3 | react-router 7.18, zod 4.6 y @hookform/resolvers 5.9; esquemas adaptados a la API de zod 4 | `npm audit --omit=dev` = 0 | CP-SEG-DEP ✓, 45 unitarias, 30 E2E |
| MI-14 | Seguridad | INC-35 (antes PM-SEG-03): con la contraseña inicial publicada se podía operar el panel | Solo había un aviso | La API responde 403 `cambiar_contrasena` a toda ruta salvo sesión y cambio de contraseña; la interfaz redirige a *Mi cuenta* | 0 operaciones posibles con la contraseña inicial | CP-SEG-23 ✓, E2E-21 ✓ |
| MI-15 | Arquitectura | INC-22 (antes PM-ARQ-01): paquete JS de 683 kB | Sin división de código | Rutas diferidas para los paneles de profesional y administración; paquetes de proveedores separados | Compilación sin advertencias | `build.log`: mayor fragmento 237 kB ✓ |
| MI-16 | Código / BD | INC-25, 26, 29, 31: código de reserva con `COUNT(*)+1`, borrado de contrataciones, sesiones largas en un solo bloque, decisiones sobre lecturas antiguas, *deadlock* | Supuestos de ejecución en serie | Tabla `contadores_reserva`; FK `RESTRICT` y 409 en `DELETE`; cadena de bloques consecutivos; `SELECT … FOR UPDATE`, `READ COMMITTED` y un orden único de bloqueo | 60 clientes simultáneos: 1 reserva, 0 errores 500 | CP-REG-06, 08, 09, 12, CP-EST-02, CP-BD-13 ✓ |
| MI-17 | Código | INC-27, 28, 30, 37, 38: zona horaria, evaluación ciega en una sola ruta, profesional despublicado aún contratable, rechazo sin liberar horario, cancelación sin pago marcada como reembolso | Reglas aplicadas en un solo punto de entrada | Zona `America/Santiago` en PHP, MySQL y navegador; funciones comunes `profesionalElegible()` y `liberarIntervalo()`; estado `sin_cobro` | Cada regla probada en todas sus rutas | CP-REG-07, 10, 11, 13, 14, 16, CP-INT-CAN-01 ✓ |
| MI-18 | Seguridad / validación | INC-32..36, 39, 40, 45: textos largos con error 500, enlaces `javascript:`, consentimiento implícito, credenciales editadas sin revisión, RUT con espacios, ficha no validada visible, tiempo de respuesta distinto en el login | Validación incompleta en el servidor | `exigirLargos`, `urlOpcional` + `hrefSeguro`, `exigirConsentimiento`, regreso a `en_revision`, RUT canónico, filtro de validación, hash ficticio | 0 errores 500 por entrada del usuario | CP-REG-01..05, 15, CP-BD-14 ✓ |
| MI-19 | Documentación / pruebas | INC-43, 44 (antes PM-DOC-01): diccionario y diagramas a mano; comparador incompleto; RNF-07 contado como validado | Mantenimiento manual | `generar_diccionario.py` y `generar_diagramas.py` desde `information_schema`; comparador estricto; trazabilidad de RNF-07 ligada a CP-MAN-01/03 | Documentación igual al esquema | Diff tras regenerar = 0 ✓ |

## 2. Mejoras pendientes

| ID | Área | Problema (evidencia) | Causa | Solución propuesta | Prior. | Rol responsable | Esfuerzo | Indicador de éxito | Método de verificación |
|---|---|---|---|---|---|---|---|---|---|
| PM-SEG-01 | Seguridad | INC-23 token en `localStorage` | SPA con API en otro puerto | Cookie `HttpOnly; Secure; SameSite=Strict` emitida por `login.php`, frontend y API en el mismo dominio, CSP en el HTML | P3 | Backend + DevOps | M | El token no es accesible desde `document.cookie` ni desde `localStorage` | Prueba E2E que lea `localStorage`; CP-SEG-04 sigue aprobado |
| PM-SEG-04 | Seguridad | V-16: IP real detrás de un proxy | `REMOTE_ADDR` | Lista de proxies de confianza y lectura de `X-Forwarded-For` solo desde ellos | P3 | Backend | S | El límite por IP funciona tras el proxy | Prueba con cabecera simulada |
| PM-SEG-05 | Seguridad | Sin registro de auditoría de acciones administrativas (validaciones, cambios de configuración, creación de administradores) | No se diseñó | Tabla `auditoria_admin` (quién, qué, cuándo) | P2 | Backend + BD | M | 100 % de acciones de la fundadora registradas | Integración: validar o crear un administrador genera una fila |
| PM-BD-01 | Base de datos / rendimiento | Búsqueda `LIKE '%texto%'` sin índice | Comodín inicial | Índice `FULLTEXT` (titulo, descripcion) + `MATCH … AGAINST` | P3 | BD | M | p95 del catálogo con texto ≤ 50 ms con 5.000 servicios | `medir.mjs` con una semilla de 1.250 profesionales |
| PM-BD-02 | Base de datos | Redundancia `validado_por_skilly` | Ficha pública separada del perfil privado | Vista `v_profesionales_publicos` o columna derivada | P3 | BD | S | 0 columnas redundantes no controladas | `NORMALIZACION_OPTIMIZACION.md` actualizado |
| PM-BD-03 | Base de datos | Correo duplicado en perfiles y cuentas | Diseño inicial | Si se permite editar el correo del profesional, actualizar ambos en una transacción, o eliminar `perfiles_profesionales.email` | P3 | Backend | S | Sin divergencias | Consulta de control `JOIN` = 0 filas distintas |
| PM-BD-04 | Rendimiento | Listados sin paginación | Volumen académico | `LIMIT/OFFSET` o cursor en el catálogo y en los listados de administración | P2 | Backend + Frontend | M | Respuesta < 200 kB con 10.000 reservas | Prueba de carga con semilla grande |
| PM-ARQ-02 | Arquitectura | Lógica de transición de estados duplicada (TS para demo y PHP para API) | Doble modo de datos | Documentar la tabla única de transiciones; prueba que compare `TRANSICIONES` con las reglas de la API | P3 | Arquitectura | M | Una sola fuente de verdad | Prueba de contrato |
| PM-COD-01 | Código | Archivos de pantalla con JSX en una sola línea (`MisSolicitudes.tsx`, `MisIngresos.tsx`) | Edición rápida previa | Formatear con Prettier y agregar ESLint en CI | P2 | Frontend | S | 0 avisos de ESLint | Paso de CI |
| PM-UX-01 | Usabilidad | Sin validación con usuarios externos (CP-MAN-04) | Pendiente | Aplicar los 3 checklists y corregir los hallazgos | **P1** | Todo el equipo | S | Promedio ≥ 4/5, 0 hallazgos críticos | Formularios firmados + `PROCEDIMIENTO_USABILIDAD.md` |
| PM-UX-02 | Usabilidad | Accesibilidad no verificada con lector de pantalla (CP-MAN-06) | — | Recorrido con NVDA y Lighthouse Accessibility | P2 | Frontend | S | Lighthouse ≥ 90 | Informe de Lighthouse |
| PM-UX-03 | Funcionalidad | Notificaciones por correo no implementadas | Fuera del alcance | Correo transaccional (PHPMailer) en aprobar, aceptar, pagar y entregar | P3 | Backend | M | 100 % de cambios de estado notifican | Prueba con un servidor SMTP de pruebas (MailHog) |
| PM-PRU-01 | Pruebas | INC-24: cobertura de líneas 52,5 % en `lib`/`services` y sin pruebas de componentes | Pruebas centradas en servicios | Testing Library para pantallas críticas (agenda, detalle de reserva, solicitudes) | P2 | QA | M | Cobertura ≥ 70 % | `npm run test:cobertura` |
| PM-PRU-02 | Detección temprana | Errores que llegaban a la evaluación sin detectarse (INC-01/02 existían en la versión "definitiva") | Sin integración continua ni pruebas contra la API | Activar `ci.yml` y exigirlo en la protección de `main` | **P1** | Líder técnico | S | 100 % de PRs con CI en verde antes del merge | Pestaña *Actions* de GitHub |
| PM-PRU-03 | Pruebas | XAMPP no se probó aquí (CP-MAN-01..03) | Entorno de la auditoría | Ejecutar `test:integracion` contra XAMPP antes de cada entrega | **P1** | QA | S | 94/94 en XAMPP; RNF-07 validado | Captura C-09 |
| PM-PRU-04 | Pruebas | Caída de la API no automatizada | — | Prueba E2E con la API detenida que verifique el mensaje y el botón *Reintentar* | P3 | QA | S | Caso automatizado | Nuevo E2E |
| PM-PRU-05 | Pruebas | La revisión final encontró 23 defectos con la suite al 100 % | Sin pruebas de concurrencia, zona horaria ni reglas por ruta | Mantener `concurrencia_escritura.mjs` en CI y agregar una prueba por ruta cada vez que se cree una regla de negocio | P2 | QA | S | 0 defectos de concurrencia en la próxima revisión | Paso de CI con `concurrencia_escritura.mjs 30` |
| PM-EQ-01 | Trabajo en equipo | Sin evidencia de reparto de tareas ni de revisiones en la versión de la Evaluación 2 | Trabajo sin repositorio compartido | Tablero de issues, una issue por PM-xx, PR con revisor obligatorio y reunión semanal de 15 min | **P1** | Líder de proyecto | S | Cada integrante con ≥ 1 PR revisado | *Insights → Contributors* + registro de contribuciones |
| PM-VER-01 | Control de versiones | No existía repositorio | — | Seguir `GUIA_GIT_GITHUB.md`: repositorio privado, `main` protegida, ramas por tarea | **P1** | Líder técnico | S | Repositorio con historial y PRs | Capturas G-01..G-07 |

## 3. Procedimiento de detección temprana de errores

Este procedimiento evita que defectos como INC-01 e INC-02 lleguen a una evaluación. Ambos existían en la versión entregada como "definitiva" y se habrían detectado con un solo recorrido contra la API real.

1. **Antes de cada commit (local, ~1 min):** `npm run typecheck && npm test`.
2. **Antes de abrir un PR (~3 min):**
   1. `bash scripts/entorno-pruebas.sh` (o XAMPP con una base nueva);
   2. `npm run test:integracion`;
   3. si cambia la interfaz, `npm run test:e2e`.
3. **En cada PR (automático):** `ci.yml` ejecuta tipos, unitarias, compilación, `php -l` e integración contra MariaDB. El PR no se integra si falla. Si el cambio toca reservas o agenda, se ejecuta también `node tests/rendimiento/concurrencia_escritura.mjs 30`.
4. **Revisión de código obligatoria** con la lista de la plantilla:
   - pruebas;
   - migración si cambia la base;
   - sin secretos;
   - el cambio está en el modo API, no solo en el modo demo.
5. **Regla de "no solo backend":** toda acción nueva de la API debe tener su botón y su caso E2E en el mismo PR, o una issue enlazada.
6. **Regla de "todas las rutas":** una regla de negocio (privacidad, elegibilidad, liberación de horario) se escribe en una función de `helpers.php` y se prueba en **cada** endpoint que la necesita, no solo en el primero.
7. **Ensayo general 48 h antes de cada entrega:**
   1. instalación desde cero en un equipo distinto, siguiendo `GUIA_INSTALACION.md`;
   2. suite completa;
   3. guion de video.

   Se registra en la hoja *Registro de ejecución*.
8. **Retrospectiva** después de cada entrega (ver `docs/08_equipo/COLABORACION.md`): qué falló, qué detectó tarde el proceso y qué paso se agrega.

## 4. Seguimiento

| Indicador | Línea base (versión Evaluación 2) | Actual | Meta próximo ciclo |
|---|---|---|---|
| Casos de integración aprobados | 59/74 | 94/94 | 100 % en XAMPP y CI |
| Defectos críticos abiertos | 2 | 0 | 0 |
| Cobertura de casos de uso | sin plan | 100 % | 100 % |
| Requerimientos validados | sin plan | 37/38 (falta RNF-07, XAMPP) | 38/38 |
| Cobertura de líneas automatizada | no medida | 52,5 % | ≥ 70 % |
| Avisos de dependencias de producción | 3 | 0 | 0 |
| Escrituras simultáneas sin error 500 | no medido | 60/60 clientes | 100 % en CI |
| Satisfacción de usabilidad | no medida | pendiente | ≥ 4/5 |
| p95 del catálogo (120 servicios) | 349 ms | 20,9 ms | ≤ 50 ms con 5.000 servicios |

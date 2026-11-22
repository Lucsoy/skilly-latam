# Cambios de la Evaluación 3 (17-11-2026)

Lista de todos los archivos modificados o creados respecto de nuestra versión de la Evaluación 2 (`Skilly_latam.zip`, carpeta "Skilly_latam version definitiva"). Cada cambio responde a una incidencia comprobada (INC-xx, ver `docs/05_pruebas`) o a un entregable de la rúbrica. No se eliminó ninguna funcionalidad existente.

**Resumen (verificado comparando archivo por archivo con la versión de la Evaluación 2, sin contar `docs/` ni `evidencias/`):** 45 archivos modificados y 27 nuevos; ningún archivo eliminado.

## Backend (PHP)

| Archivo | Cambio | Motivo |
|---|---|---|
| `backend/config/helpers.php` | Funciones comunes nuevas:<br>• validación: `rutValido`, `correoValido`, `errorContrasena`<br>• carga por lotes: `obtenerReservasLote`, `obtenerReservasConNombres`, `obtenerCatalogoLote`, `reputacionesLote`<br>• reputación y publicación: `calcularReputacion`, `publicarEvaluacionesVencidas`<br>• borrado seguro: `rutasArchivosProfesional`, `borrarArchivos`<br>• otras: `existeRegistro`, purga de sesiones vencidas, aviso de contraseña inicial | INC-05, 07, 09, 10, 15; PM-SEG-03 (parcial) |
| `backend/config/cors.php` | Cabeceras `nosniff`, `X-Frame-Options`, CSP, `Referrer-Policy`, `no-store`; método PATCH | INC-15 |
| `backend/config/config.php` | Variables de entorno `SKILLY_DB_*` opcionales | Configuración reproducible y CI |
| `backend/api/servicios/index.php` | Filtro de modalidad con `EXISTS` y parámetros nombrados; catálogo por lotes; no se borra un servicio con historial | INC-02, 10, 03 |
| `backend/api/reservas/index.php` | Estado REAGENDADA real; acción `responder-reagendamiento`; liberación de horarios; listados por lotes; solicitudes del profesional con las cerradas | INC-06, 10, 11 |
| `backend/api/evaluaciones/index.php` | Listado público sin comentarios no moderados; publicación por plazo; reputación común; transacción; `contraparte` | INC-04, 05 |
| `backend/api/organizaciones/index.php` | Validación de servidor (RUT, correo, contraseña), búsqueda de RUT indexada, edición validada, borrado con cuentas y protección de historial | INC-07, 09, 14 |
| `backend/api/profesionales/index.php` | Política de contraseñas; LinkedIn indexado; borrado: verificación de historial y archivos después del commit | INC-03, 07 |
| `backend/api/admin/index.php` | Listados por lotes; borrados protegidos; validación del documento antes de actualizar | INC-03, 07, 10 |
| `backend/api/chat/index.php` | Chat de CONFIRMADA a ENTREGADA | INC-13 |
| `backend/api/disponibilidad/index.php` | El horario propuesto en un reagendamiento no se vuelve a ofrecer; validación de fecha y hora de bloqueos | INC-06, 09 |
| `backend/api/categorias/index.php` | Sin fuga del mensaje de error de PDO | INC-08 |
| `backend/api/auth/contrasena.php` | Política de contraseñas común | INC-09 |

## Base de datos

| Archivo | Cambio |
|---|---|
| `database/skilly.sql` | Esquema 2026.11-E3: 36 FK con nombre (`RESTRICT` sobre reservas), 19 CHECK (20 en 2026.11-E3.1), UNIQUE compuestos, `rut_normalizado`, `secuencia`, índices compuestos, charset explícito; sigue siendo idempotente |
| `database/migracion_entrega3_2026_11.sql` | **Nuevo.** Migración no destructiva y re-ejecutable |
| `database/scripts/00..05, 90, 91` | **Nuevos.** Modelo físico separado: tablas, PK, FK, índices/restricciones y datos; scripts destructivos separados y advertidos |
| `database/verificar/*` | **Nuevos.** Comparador de esquemas y pruebas de integridad |
| `database/README.md` | **Nuevo.** Orden de ejecución y advertencias |

## Frontend (React/TypeScript)

| Archivo | Cambio | Motivo |
|---|---|---|
| `src/modules/profesional/pages/DetalleSolicitud.tsx` | Reescrito: acciones por estado (aceptar, responder reagendamiento, comenzar, entregar, evaluar), diálogos de confirmación, historial | INC-01, 06 |
| `src/modules/profesional/pages/EvaluarOrganizacion.tsx` | **Nuevo.** Evaluación de la organización | INC-05 |
| `src/modules/agenda/PaginaDetalleReserva.tsx` | Cancelar (con simulación de retención) y cambiar fecha; aviso de reagendamiento pendiente; chat según estado | INC-06, 13 |
| `src/modules/agenda/estadoReserva.ts` | Transiciones REAGENDADA → CONFIRMADA/CANCELADA, `ESTADOS_CHAT`, `accionesProfesional` | INC-06 |
| `src/services/solicitudes.ts` | `iniciarTrabajo`, `marcarEntregado`, `responderReagendamiento` (API + demo) | INC-01, 06 |
| `src/services/reservas.ts`, `evaluaciones.ts`, `chat.ts` | Liberación de horarios, evaluación del profesional, chat por estado (modo demo coherente con la API) | INC-05, 06, 13 |
| `src/modules/agenda/PaginaPago.tsx` | Aviso "Pago simulado", datos de prueba, `autocomplete=off` | INC-16 |
| `src/modules/auth/PaginaIngresar.tsx` | Cuentas demo solo en modo demostración | INC-17 |
| `src/app/Layout.tsx`, `src/types/index.ts`, `src/components/cuenta/CambiarContrasena.tsx` | Aviso de contraseña inicial | V-14 |
| `src/index.css` | Sin desborde horizontal en el ingreso bajo 1024 px | INC-18 |
| `Calendario.tsx`, `PaginaAgendar.tsx`, `PaginaChat.tsx`, `PasosAgendamiento.tsx`, `Campo.tsx`, `Insignia.tsx`, `PaginaEvaluar.tsx`, `MiPerfil.tsx`, `PaginaMiOrganizacion.tsx`, `Layout.tsx` | Contraste AA (primario-700/800) y foco visible en opciones | INC-19 |
| `src/modules/profesional/pages/MisSolicitudes.tsx`, `index.ts`, `src/app/router.tsx` | Reagendamientos como "requiere decisión"; ruta de evaluación | INC-06, 05 |

## Pruebas y herramientas

| Archivo | Contenido |
|---|---|
| `tests/integracion/*` | 77 pruebas contra la API real + router que replica `.htaccess` (94 tras la revisión final) |
| `tests/e2e/flujo_e2e.py` | 29 pasos en Chrome (ciclo completo, XSS, teclado, responsivo); 30 tras la revisión final |
| `tests/rendimiento/*` | Semilla sintética y medición de latencia, SQL por petición y carga |
| `src/**/estadoReserva.test.ts`, `contratacion.test.ts`, `lib/rut.test.ts` | 16 pruebas unitarias nuevas |
| `vitest.integracion.config.ts`, `vite.config.ts`, `package.json` | Scripts `test:integracion`, `test:e2e`, `test:rendimiento`, `test:cobertura`; proxy configurable; cobertura |
| `scripts/entorno-pruebas.sh` | Entorno de pruebas reproducible (Linux/macOS) |
| `.github/workflows/ci.yml`, `.github/pull_request_template.md` | Integración continua y plantilla de revisión (preparados; activarlos en GitHub) |
| `package-lock.json` | `npm audit fix` (solo versiones compatibles) y `@vitest/coverage-v8` |

## Documentación

`README.md`, `SETUP_XAMPP.md` y `MODULOS_CONTRATACION.md` actualizados, y la carpeta `docs/` completa (ver `docs/README.md`).

---

## Correcciones de la revisión final (esquema 2026.11-E3.1)

Una revisión adversarial del sistema ya corregido encontró 23 defectos más (INC-25..INC-47). La tabla de cada defecto, su causa, su corrección y su prueba de regresión está en `docs/05_pruebas/CORRECCIONES_AUDITORIA.md`. Respecto de la versión anterior a esa revisión cambiaron **57 archivos de código, base de datos y pruebas** (sin contar `docs/` ni `evidencias/`) y se crearon 8. No se eliminó ninguna funcionalidad salvo el borrado de contrataciones, que era el defecto INC-26.

| Área | Archivos | Cambio | Incidencias |
|---|---|---|---|
| Configuración | `backend/config/config.php`, `config.example.php`, `database.php` | Zona `America/Santiago` en PHP y MySQL; aislamiento `READ COMMITTED` | INC-27, 31 |
| Funciones comunes | `backend/config/helpers.php` | `exigirLargos`, `urlOpcional`, `rutCanonico`, `exigirConsentimiento`, `siguienteCodigoReserva`, `profesionalElegible`, `bloquesPorSesion`, `cadenaDeBloques`, `liberarIntervalo`; bloqueo por contraseña inicial en `usuarioAutenticado` | INC-25, 29, 30, 32-35, 37, 39 |
| Autenticación | `backend/api/auth/login.php`, `sesion.php`, `contrasena.php` | Hash ficticio si el correo no existe; rutas permitidas con la contraseña inicial | INC-35, 45 |
| Reservas | `backend/api/reservas/index.php` | Releer con `FOR UPDATE` en cada acción; orden de bloqueo; sesiones de varios bloques; código por contador; `sin_cobro`; liberación al rechazar; `DELETE` → 409 | INC-25, 26, 29, 31, 37, 38 |
| Agenda | `backend/api/disponibilidad/index.php` | Horas válidas; disponibilidad por duración (`servicio_id`, `minutos`); retención de toda la sesión con `expiraEn` ISO 8601 | INC-29, 31 |
| Evaluaciones | `backend/api/evaluaciones/index.php` | Evaluación ciega también en `GET ?reserva_id` | INC-28 |
| Perfiles y servicios | `backend/api/profesionales/`, `organizaciones/`, `servicios/`, `admin/` | Largos, URL, consentimiento, RUT canónico; regreso a revisión al editar credenciales; elegibilidad en catálogo y ficha; listado de profesionales por lotes; `DELETE` de reserva → 409 | INC-26, 30, 32-36, 39, 40, 42 |
| Base de datos | `database/skilly.sql`, `scripts/01-05`, `91`, `migracion_correcciones_2026_11.sql` (nuevo) | Tabla `contadores_reserva`; FK `RESTRICT` desde historial, chat y evaluaciones; `sin_cobro`; `rut_normalizado` sin espacios; tildes; `SET NAMES utf8mb4` | INC-25, 26, 38, 39, 41 |
| Verificación de BD | `database/verificar/comparar_esquemas.py`, `pruebas_integridad.sql`; nuevos `generar_diagramas.py`, `generar_diccionario.py`, `verificar_scripts.sh` | Comparador estricto con columna destino de las FK; CP-BD-13/14; diccionario y diagramas generados desde la base | INC-43 |
| Frontend | `src/config.ts`, `lib/apiClient.ts`, `lib/formato.ts`, `lib/precios.ts`, `lib/enlaces.ts` (nuevo), `types/index.ts`, `services/*`, `app/router.tsx`, `app/RequiereSesion.tsx`, `app/Layout.tsx`, `index.css` y 13 pantallas | Fechas en la zona del negocio; `hrefSeguro`; consentimiento explícito; cambio obligatorio de contraseña; agenda por duración; aviso de cancelación sin cobro; sin botón de borrar reservas; rutas diferidas; zod 4 | INC-21, 22, 27, 29, 33-36, 38, 46, 47 |
| Dependencias | `package.json`, `package-lock.json`, `vite.config.ts` | react-router 7.18, zod 4.6, @hookform/resolvers 5.9; paquetes de proveedores | INC-21, 22 |
| Pruebas | `tests/integracion/flujo-completo.test.ts`, `helpers.ts`, `tests/e2e/flujo_e2e.py`, `src/services/*.test.ts`, `src/lib/enlaces.test.ts` (nuevo), `tests/rendimiento/concurrencia_escritura.mjs` (nuevo) | CP-REG-01..16, CP-SEG-23, CP-EST-02, CP-UNI-ENL-01/02, E2E-21; CP-INT-CAN-01 corregida | — |
| Configuración del proyecto | `.env.example` (nuevo), `.gitignore` | Plantilla de variables (`VITE_API_URL`); se versionan los `.log` de evidencias | INC-47 |

**Resultado:** 45/45 unitarias, 94/94 de integración (75/94 con el código anterior), 30/30 pasos E2E, 60 clientes simultáneos sin errores 500, `npm audit --omit=dev` = 0 y compilación sin advertencias. Evidencia en `evidencias/correcciones_2026-11-17/`.


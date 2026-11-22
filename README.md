# Skilly LATAM

[Documentación técnica del código (Word)](docs/Documentacion_Tecnica_Skilly_LATAM.docx)

## Versión corregida de la Entrega 3

Para instalar en Windows, sigue [la guía de XAMPP](docs/03_entorno/GUIA_INSTALACION.md). Las correcciones de cierre usan el esquema existente. El flujo de contratación envía el precio, el porcentaje de comisión y la versión de condiciones que se mostraron al confirmar. Los clientes de la API pueden obtener esos campos en la propiedad condiciones de la respuesta al retener un bloque. Si cambian antes de crear la reserva, la API devuelve 409 y la interfaz solicita revisarlos de nuevo.

Los resultados de esta copia están en [evidencias/cierre](evidencias/cierre/) y en la hoja **Cierre** del plan de pruebas. Las ejecuciones de integración y navegador de E3.1 se conservan como antecedentes. [Pendientes del equipo](PENDIENTES_ANTES_DE_ENTREGAR.md) reúne las comprobaciones en Windows, los formularios de usabilidad, la portada y los enlaces para la evaluación.

Plataforma *Talent as a Service* que conecta **organizaciones** (pymes) con **profesionales independientes** de Personas y Back Office (reclutamiento, cultura, compensaciones, capacitación, administración de personal y finanzas). El equipo de **Skilly** valida a los profesionales, revisa sus servicios y supervisa cada contratación.

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS (zustand, react-router, react-hook-form + zod).
- **Backend:** PHP 8 + PDO (API REST en `backend/`).
- **Base de datos:** MySQL / MariaDB (XAMPP) — esquema en `database/skilly.sql` (2026.11-E3.1: 30 tablas, 36 FK, 20 CHECK, 86 índices).

## Cómo levantarlo

La guía completa desde cero (Windows + XAMPP, 16 pasos con resultados esperados) está en **[docs/03_entorno/GUIA_INSTALACION.md](docs/03_entorno/GUIA_INSTALACION.md)**; la guía breve original, en [SETUP_XAMPP.md](SETUP_XAMPP.md). Resumen:

1. Importa `database/skilly.sql` en phpMyAdmin. (Si ya tenías la base de una versión anterior, respáldala y ejecuta las migraciones en orden: `migracion_cierre_2026_11.sql`, `migracion_entrega3_2026_11.sql` y `migracion_correcciones_2026_11.sql`.)
2. Copia la carpeta `backend/` completa a `C:\xampp\htdocs\skilly-api\`.
3. En la raíz del proyecto: `npm ci` y `npm run dev` → `http://localhost:5173`.
4. Ingresa como fundadora y cambia la contraseña inicial: hasta hacerlo, la API no permite otras operaciones.

Para probar sin backend (datos de demostración en el navegador), crea `.env.local` con `VITE_USE_API=false`. Todas las variables están en `.env.example`.

## Cuentas

| Modo | Rol | Correo | Contraseña |
|---|---|---|---|
| Base de datos real | Fundadora | `fundadora@skilly.cl` | `Skilly#Fundadora2026` (es obligatorio cambiarla en el primer ingreso) |
| Demo (`VITE_USE_API=false`) | Organización | `contacto@bloom.cl` | `skilly2026` |
| Demo | Profesional validada | `camila.rojas@ejemplo.cl` | `camila2026` |
| Demo | Profesional nueva | `valentina.munoz@ejemplo.cl` | `valentina2026` |
| Demo | Administración | `admin@skilly.cl` | `admin2026` |
| Demo | Fundadora | `fundadora@skilly.cl` | `Skilly#Fundadora2026` |

En el modo demo, la pantalla de ingreso tiene botones que completan estas cuentas automáticamente.

## Módulos y estado (verificado el 17-11-2026 contra la base real)

| Módulo | Estado | Evidencia |
|---|---|---|
| Registro e inicio de sesión (organización y profesional), cambio de contraseña | ✅ Completo, con validación también en el servidor (RUT, correo, contraseña, largos, enlaces, consentimiento explícito) | CP-INT-AUT-*, CP-VAL-*, CP-REG-01..04, E2E-01/02 |
| Catálogo, filtros (incluida la modalidad), ficha de servicio y de profesional, favoritos | ✅ Completo | CP-INT-CAT-*, E2E-03 |
| Agendamiento con retención, condiciones, solicitud, aprobación de administración y del profesional | ✅ Completo; una sesión larga ocupa todos los bloques que necesita | CP-INT-RES-*, CP-REG-06..08, E2E-04..07 |
| Pago | ⚠️ **Simulado** e identificado como tal en la interfaz (no hay pasarela real) | CP-INT-RES-08, E2E-08 |
| Chat de coordinación (de confirmada a entregada) | ✅ Completo | CP-INT-CHA-01, E2E-11 |
| Ejecución: el profesional marca "en curso" y "entregado" | ✅ Completo (**corregido**: antes no había botones) | CP-INT-RES-09, E2E-12 |
| Conformidad y evaluación de la organización al profesional | ✅ Completo | E2E-13 |
| Evaluación del profesional a la organización | ✅ Completo (**nuevo**: antes solo backend) | CP-INT-EVA-03, E2E-14 |
| Publicación de evaluaciones (conjunta o por plazo) y reputación | ✅ Completo (**corregido**: la publicación por plazo no existía) | CP-INT-EVA-05 |
| Cancelar y reagendar desde la organización; respuesta del profesional al cambio de fecha | ✅ Completo (**nuevo**) | CP-INT-REA-*, CP-INT-CAN-01, E2E-09/10/16 |
| Panel del profesional: perfil, documentos, servicios, disponibilidad, solicitudes, ingresos, reputación | ✅ Completo | CP-INT-PRO-*, CP-INT-ING-01, E2E-18 |
| Revisión de servicios y validación de profesionales por Skilly | ✅ Completo | CP-INT-PRO-06, CP-INT-ADM-* |
| Administración: resumen, reservas, solicitudes, profesionales, organizaciones, moderación | ✅ Completo | CP-INT-ADM-03, E2E-15/19 |
| Fundadora: centro de mando, administradores, configuración | ✅ Completo | CP-SEG-08, CP-INT-EVA-05 |
| Notificaciones por correo | ❌ No implementado (todo se informa dentro de la plataforma; ver plan de mejora PM-UX-03) | — |

## Reglas de negocio principales

- Un profesional solo puede **publicar** servicios cuando Skilly **valida su perfil**. Para validarlo, la administración debe aprobar al menos un documento de respaldo.
- La administración puede **devolver** un perfil con observaciones; el profesional las ve en su panel y en *Mi perfil*.
- El profesional puede **solicitar la revisión** de cada servicio. Si edita un servicio ya aprobado, la aprobación deja de valer y puede pedirla de nuevo.
- Ciclo de una contratación: SOLICITADA → APROBADA_ADMIN → PENDIENTE_PAGO → CONFIRMADA (⇄ REAGENDADA) → EN_CURSO → ENTREGADA → EVALUADA. La organización puede cancelar antes de EN_CURSO, con la retención de la política (0 % con más de 48 h, 25 % entre 24 y 48 h, 50 % con menos de 24 h).
- Ambas partes **se evalúan** (calidad, plazos, comunicación) después de la conformidad. La evaluación es ciega: se publica cuando ambas evalúan o a los 7 días. Los comentarios pasan por moderación antes de mostrarse.
- Una contratación registrada **no se puede borrar**, ni directa ni indirectamente: la API responde 409 y la base usa `ON DELETE RESTRICT` (no se elimina un servicio, profesional u organización con historial, ni una reserva con su historial, chat o evaluaciones). Las contrataciones se cancelan o rechazan.
- Si la organización cancela **antes de pagar**, no hay retención ni reembolso: el estado de pago queda `sin_cobro`.
- Si Skilly devuelve el perfil de un profesional a revisión (o él edita su formación, experiencia o enlaces), sus servicios dejan de ofrecerse y de poder contratarse hasta que se valide de nuevo.
- Todas las fechas y horas se manejan en hora de Chile (`America/Santiago`), en PHP, MySQL y el navegador.

## Seguridad

Resumen (detalle, imágenes del código y matriz de vulnerabilidades en `docs/04_seguridad/AUDITORIA_SEGURIDAD.md`):

- Contraseñas con `password_hash` (bcrypt) y política de 8+ caracteres con letras y números, validada **en el servidor**.
- Consultas parametrizadas con PDO (sin emulación).
- Token Bearer de 256 bits: en la base solo se guarda su hash SHA-256; expira a los 30 días y se puede revocar.
- Control de acceso por rol y por recurso (anti-IDOR).
- **Límite de intentos de login:** 5 fallos por correo o 20 por IP en 15 minutos → bloqueo temporal (HTTP 429).
- **CORS** restringido y cabeceras `nosniff`, `X-Frame-Options: DENY`, CSP y `no-store` en la API.
- Errores sin detalles internos.
- Credenciales fuera del código: `backend/config/config.local.php` (en `.gitignore`), a partir de `config.example.php`, o variables `SKILLY_DB_*`.
- Documentos: se valida extensión **y** tipo real del archivo (finfo), máximo 5 MB, nombre interno aleatorio, carpeta bloqueada por `.htaccess` y descarga solo para el dueño o el equipo de Skilly.
- La pantalla de ingreso muestra cuentas de demostración **solo** en modo demo. Con la base real, mientras la fundadora use la contraseña inicial publicada, la API responde 403 (`cambiar_contrasena`) a todo salvo ver la sesión y cambiarla.
- Enlaces de perfiles solo `http`/`https` (en la API y en la interfaz, `hrefSeguro`).
- Cada acción sobre una reserva relee la fila con `SELECT … FOR UPDATE` dentro de la transacción; probado con 60 organizaciones reservando el mismo horario a la vez (`tests/rendimiento/concurrencia_escritura.mjs`).

### Decisión consciente: token en `localStorage`

El frontend guarda el token de sesión en `localStorage` (vía `zustand/persist`) para que la sesión sobreviva a recargas de página. Es una práctica habitual en SPAs con API separada, pero tiene un costo: si la aplicación sufriera una vulnerabilidad XSS, un script malicioso podría leer el token. Se mitiga porque React escapa todo el contenido por defecto y el proyecto no usa `dangerouslySetInnerHTML`.

La alternativa más robusta sería una **cookie `HttpOnly` + `SameSite=Strict`** emitida por PHP (inaccesible para JavaScript), que exigiría servir frontend y API desde el mismo dominio o configurar credenciales CORS. Queda como mejora para un despliegue en producción.

## Scripts

```bash
npm run dev               # servidor de desarrollo (proxy /api → http://localhost/skilly-api)
npm run build             # typecheck + build de producción
npm run typecheck         # solo TypeScript
npm test                  # 45 pruebas unitarias (Vitest, modo demostración)
npm run test:cobertura    # unitarias + cobertura
npm run test:integracion  # 94 pruebas contra la API PHP y la base reales (SKILLY_API_URL)
npm run test:e2e          # 30 pasos en Chrome (Playwright) con la app levantada
node tests/rendimiento/concurrencia_escritura.mjs 60   # escrituras simultáneas sobre el mismo horario
npm run test:rendimiento  # latencia, consultas SQL y carga
```

En Linux/macOS, `bash scripts/entorno-pruebas.sh` recrea la base y levanta la API con `php -S` para las pruebas. En Windows se usa XAMPP (ver la guía).

## Estructura

```text
src/
  app/            rutas, layouts, guardias por rol, títulos de página
  components/     UI reutilizable (Boton, Dialogo, Campo…) y CambiarContrasena
  modules/        pantallas por área: auth, catalogo, agenda, organizacion, profesional, admin
  services/       capa de datos (API PHP o mocks según VITE_USE_API) + pruebas
  mocks/          datos de demostración
backend/
  config/         configuración, conexión, CORS/cabeceras y funciones comunes
  api/            un endpoint por recurso (auth, servicios, profesionales, reservas…)
  uploads/        documentos subidos (privado)
database/
  skilly.sql                      esquema completo (idempotente)
  scripts/                        el mismo modelo separado: tablas, PK, FK, índices, datos y scripts de eliminación
  migracion_*.sql                 migraciones para bases existentes
  verificar/                      comparación de esquemas, pruebas de integridad y generadores del diccionario y los diagramas
tests/            integracion/ (API real), e2e/ (Chrome), rendimiento/
docs/             documentación técnica y académica (ver docs/README.md)
```

## Documentación

| Tema | Archivo |
|---|---|
| Índice de la entrega y matriz de criterios | `docs/README.md` |
| Arquitectura, API, permisos y mantenimiento | `docs/01_arquitectura/ARQUITECTURA.md` |
| Modelos de datos, DER, diccionario y normalización | `docs/02_base_datos/` y `database/README.md` |
| Instalación en Windows + XAMPP y Git/GitHub | `docs/03_entorno/` |
| Seguridad | `docs/04_seguridad/AUDITORIA_SEGURIDAD.md` |
| Plan de pruebas, resultados y métricas | `docs/05_pruebas/` |
| Plan de mejora | `docs/06_mejora/PLAN_MEJORA.md` |
| Guía de estilos y usabilidad | `docs/07_usabilidad/` |
| Trabajo en equipo | `docs/08_equipo/` |
| Guion de video y defensa | `docs/09_defensa/` |
| Cambios de esta entrega | `CAMBIOS_ENTREGA3.md` |

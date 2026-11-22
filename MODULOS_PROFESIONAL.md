# Módulos del panel profesional de Skilly

Se completó la experiencia principal del oferente/profesional independiente.

## 1. Registro y perfil
- Registro inicial de cuenta.
- Perfil público editable: título, ciudad, presentación, formación, experiencia, habilidades, LinkedIn y portafolio.
- Carga simulada de documentos de respaldo.
- Estado de validación: perfil incompleto, en revisión y validado.
- Envío del perfil a revisión de Skilly.

## 2. Mis servicios
- Listado de servicios propios.
- Crear servicio.
- Editar servicio.
- Publicar/pausar servicio.
- Eliminar servicios sin contrataciones activas.
- Precio, modalidad, duración, entregables, etiquetas y categoría.
- Los servicios pausados desaparecen del catálogo público.

## 3. Disponibilidad
- Horario semanal por día.
- Activar/desactivar días.
- Hora de inicio y término.
- Bloqueos puntuales por fecha y horario.
- Al guardar, se regeneran los bloques futuros disponibles para el profesional.

## 4. Solicitudes
- Bandeja separada por pendientes, aceptadas y cerradas.
- Detalle de solicitud.
- Aceptar o rechazar trabajos derivados por administración.
- Motivo de rechazo.
- Continuación hacia pago y contratación.
- Chat disponible cuando la contratación está confirmada.

## 5. Ingresos
- Trabajos con pago confirmado.
- Bruto contratado.
- Comisión profesional según configuración de Skilly.
- Neto estimado.
- Desglose mensual.
- Trabajos pendientes de pago.

## 6. Reputación
- Cantidad de evaluaciones consideradas e históricas.
- Dimensiones independientes: calidad, plazos y comunicación.
- Comentarios públicos aprobados.
- Tratamiento especial para profesionales nuevos sin suficientes evaluaciones.

## Persistencia de la demo
Los cambios se guardan en `localStorage` mediante el almacén mock existente. La estructura de servicios está separada para poder reemplazar posteriormente estas operaciones por endpoints Django REST.

## 7. Solicitud de revisión de servicios
- En **Mis servicios**, cada servicio tiene el botón **Solicitar revisión**, que abre un diálogo con un mensaje opcional (máx. 500 caracteres) para el equipo de Skilly.
- Mientras la revisión está pendiente el botón queda deshabilitado ("Revisión solicitada") y la tarjeta muestra la insignia *En revisión*.
- Cuando un administrador responde, el profesional ve el resultado en la misma tarjeta: *Revisado por Skilly* (aprobada) o *Con observaciones* (con el comentario del administrador). Después puede pedir una nueva revisión.
- Administración: en **Profesionales** hay una pestaña *Revisiones pendientes* y cada tarjeta tiene el botón **Ver ficha completa** (`/admin/profesionales/:id`), que muestra cuenta y datos privados, documentos, perfil, reservas y todos los servicios con su detalle. Desde ahí se aprueba o se envían observaciones (obligatorio un comentario de 10+ caracteres).
- API: `POST /api/servicios/?accion=solicitar-revision&id=…`, `GET /api/admin/?accion=profesional-detalle&id=…`, `POST /api/admin/?accion=resolver-revision&id=…`.
- Si el profesional edita un servicio ya aprobado, la aprobación deja de valer y puede volver a solicitar la revisión.
- Base de datos: tabla `solicitudes_revision_servicio`. Si la base ya existía, ejecutar `database/migracion_cierre_2026_11.sql` en phpMyAdmin.

## 8. Validación del perfil y documentos
- El profesional sube sus documentos de respaldo (PDF, Word o JPG/PNG, hasta 5 MB) desde **Mi perfil**; el archivo real queda guardado en el servidor y puede abrirlo haciendo clic en su nombre.
- Al enviar su perfil a revisión, aparece en **Administración → Profesionales → Perfiles por validar**.
- En la ficha completa, el administrador abre cada documento, lo aprueba o rechaza, y luego **valida el perfil** (requiere al menos un documento aprobado) o lo **devuelve con observaciones** (comentario obligatorio).
- El profesional ve las observaciones en su panel y en Mi perfil.
- **Solo los profesionales validados pueden publicar servicios.** Mientras tanto pueden crearlos y dejarlos pausados.
- API: `POST /api/profesionales/?accion=documento` (multipart), `GET /api/profesionales/?accion=documento-archivo&id=…`, `POST /api/admin/?accion=documento-estado&id=…`, `POST /api/admin/?accion=validar-profesional&id=…`.

## 9. Cambio de contraseña
- Disponible para todos los roles: al final de **Mi perfil** (profesional), de **Mi organización** (organización) y en **Mi cuenta** (administración, haciendo clic en el nombre en la barra superior).
- API: `POST /api/auth/contrasena` `{ actual, nueva }`. Al cambiarla se cierran las demás sesiones abiertas.

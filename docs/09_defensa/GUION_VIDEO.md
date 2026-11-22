# Guion del video demostrativo — Skilly LATAM (Evaluación 3)

**Objetivo:** evidenciar el ciclo completo del producto (criterio 3.1.1.1) y la navegabilidad, el diseño y el comportamiento responsivo (3.1.1.2), con datos reales en MySQL.
**Duración objetivo:** 12-15 minutos. **Formato:** grabación de pantalla 1920×1080 con voz (OBS Studio o la *Barra de juegos* de Windows, `Win + Alt + R`).

## Preparación (antes de grabar)

1. **Base limpia:** importar `database/skilly.sql` en phpMyAdmin. Apache y MySQL en verde.
2. Ejecutar `npm run dev` y abrir <http://localhost:5173>. Abrir **tres perfiles del navegador** (o una ventana normal, una de incógnito y otro navegador), uno por rol, para no tener que cerrar sesión.
3. Cuentas:

   | Rol | Cómo obtenerla |
   |---|---|
   | Fundadora / Administración | `fundadora@skilly.cl` (cambia su contraseña al inicio del video y la usa durante la grabación) |
   | Profesional | Se registra en la escena 2 (por ejemplo, `valeria@ejemplo.cl`) |
   | Organización | Se registra en la escena 4 (por ejemplo, `contacto@panaderia.cl`, con un RUT válido como `76.086.428-5`) |

4. Tener a mano un PDF pequeño (CV de prueba) para subirlo.
5. **No mostrar contraseñas reales ni datos personales.** Usar datos ficticios.

## Escenas

| N.º | Tiempo | Rol | Pantalla / acción | Resultado que debe verse | Criterio |
|---|---|---|---|---|---|
| 1 | 0:00-0:40 | — | Presentación: integrantes, problema de negocio (pymes que necesitan RR. HH. y Back Office por servicio), arquitectura (diapositiva con `arquitectura.png`) | Contexto | 3.1.1.1 |
| 2 | 0:40-2:00 | Profesional | `/registro/profesional` → crear cuenta → *Mi perfil*: completar formación y habilidades → subir el CV en PDF | Perfil "En revisión" y documento "Pendiente de revisión" | 3.1.1.1 |
| 3 | 2:00-3:00 | Fundadora | Ingreso: la app exige cambiar la contraseña inicial y abre *Mi cuenta* → cambiarla (el aviso desaparece y se habilita el panel). *Profesionales → Ver ficha completa*: aprobar documento → **Validar perfil** | Insignia "Validado por Skilly" | 3.1.3.5 / 3.1.1.1 |
| 4 | 3:00-4:15 | Profesional | *Disponibilidad*: horario semanal → *Mis servicios → Nuevo*: crear y **publicar** → *Solicitar revisión* · Fundadora: aprobar la revisión | Servicio publicado y revisión aprobada | 3.1.1.1 |
| 5 | 4:15-5:15 | Organización | `/registro`: probar primero un RUT con dígito verificador incorrecto (mensaje de error), luego registrarse con uno válido → **Catálogo**: buscar, filtrar por categoría y **modalidad**, ordenar por precio → ficha → ♥ favorito | Filtros funcionando, ficha con reputación "Nuevo" y próximo horario | 3.1.1.1 / 3.1.1.2 |
| 6 | 5:15-6:15 | Organización | *Ver disponibilidad y agendar* → elegir día y hora (cuenta regresiva de retención) → *Continuar* → aceptar condiciones → **Enviar solicitud a Skilly** | Confirmación con código SK-2026-0001 | 3.1.1.1 |
| 7 | 6:15-7:00 | Fundadora | *Solicitudes*: asignar responsable → **Aceptar y enviar al profesional** | Estado "Aprobada por administración" | 3.1.1.1 |
| 8 | 7:00-7:40 | Profesional | *Solicitudes → Ver detalle* → **Aceptar trabajo** (diálogo de confirmación) | "Pago pendiente" | 3.1.1.1 |
| 9 | 7:40-8:30 | Organización | *Mis servicios* → *Completar pago (simulado)* → mostrar el aviso **"Pago simulado"** → *Usar datos de prueba* → confirmar | Estado "Confirmada", pago "Confirmado (pago simulado)" | 3.1.1.1 |
| 10 | 8:30-9:20 | Organización / Profesional | **Cambiar fecha** (elegir otro horario) → el profesional ve "La organización propone cambiar la fecha" → **Aceptar nueva fecha** | La reserva queda en el nuevo horario; el historial muestra ambos | 3.1.1.1 |
| 11 | 9:20-10:00 | Ambos | **Chat**: un mensaje por cada lado | Mensajes con nombre y hora | 3.1.1.1 |
| 12 | 10:00-10:40 | Profesional | **Comenzar el trabajo** → **Marcar como entregado** | "En curso" → "Entregada" | 3.1.1.1 |
| 13 | 10:40-11:30 | Organización / Profesional | **Confirmar conformidad** → **Evaluar al profesional** (3 dimensiones + comentario) · el profesional: **Evaluar organización** | Evaluación ciega; ambas publicadas | 3.1.1.1 |
| 14 | 11:30-12:00 | Fundadora | *Moderación*: aprobar el comentario → *Resumen* y *Reservas* (historial completo) → *Configuración* (comisiones y política de cancelación) | Panel administrativo | 3.1.1.1 |
| 15 | 12:00-12:40 | Organización / Profesional | Segunda reserva → **Cancelar contratación**: el diálogo muestra el % retenido y el monto devuelto · Profesional: *Ingresos* con desglose de comisión | Cancelación con política; ingresos | 3.1.1.1 |
| 16 | 12:40-13:40 | — | **Responsivo:** herramientas de desarrollo (F12 → modo dispositivo) con iPhone 12 (390 px) y iPad (768 px) en catálogo, ficha y seguimiento; abrir el menú móvil. **Teclado:** recorrer el ingreso con Tab y cerrar un diálogo con Esc | Sin desplazamiento lateral; foco visible | 3.1.1.2 |
| 17 | 13:40-14:30 | — | **Evidencia técnica breve:** phpMyAdmin con `SELECT codigo, estado FROM reservas` y `historial_reservas`; terminal con `npm run test:integracion` (mostrar el resultado real de la ejecución final en XAMPP) | Persistencia real y pruebas | 3.1.5.10 |
| 18 | 14:30-15:00 | — | Cierre: qué se mejoró (incidencias críticas corregidas) y qué queda pendiente | — | 3.1.6.13 |

## Recomendaciones de grabación

- Mantener el cursor visible, ampliar al 110-125 % y narrar **qué necesidad de negocio** resuelve cada paso, no solo los clics.
- Si algo falla durante la grabación, no editar para ocultarlo: repetir la toma. El video es evidencia.
- Subir a YouTube como "No listado" o a Drive con acceso para el docente, y pegar el enlace en el informe (Anexo B).

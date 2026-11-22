# Flujo de contratación de Skilly

> Actualizado en la Evaluación 3: describe la implementación final verificada contra la base real. Las pantallas de cada paso están en `docs/09_defensa/GUION_VIDEO.md` y la máquina de estados, en `docs/01_arquitectura/diagramas/estados_reserva.png`.

## Flujo

1. La organización selecciona un servicio y un horario; el bloque queda **retenido 10 minutos** solo para ella.
2. Revisa las condiciones (precio, comisión y total), las acepta y envía la solicitud → **SOLICITADA**.
3. Administración recibe la solicitud en `/admin/solicitudes`, la asigna a un responsable y la acepta (→ **APROBADA_ADMIN**) o la rechaza (→ RECHAZADA).
4. El profesional la ve en `/profesional/solicitudes` y la acepta (→ **PENDIENTE_PAGO**) o la rechaza.
5. La organización completa el **pago simulado** (→ **CONFIRMADA**). No se realiza ningún cobro y la pantalla lo indica.
6. Se habilita el **chat** de coordinación, que permanece disponible hasta la entrega.
7. *(Opcional)* La organización **propone otra fecha** (→ **REAGENDADA**). El profesional la acepta (la reserva se mueve al nuevo horario y el original vuelve a ofrecerse) o la rechaza (se mantiene la original). En ambos casos vuelve a CONFIRMADA.
8. *(Opcional)* Antes de que comience el trabajo, la organización puede **cancelar**. El diálogo muestra el porcentaje retenido según la antelación y el horario vuelve al catálogo.
9. El profesional **comienza el trabajo** (→ **EN_CURSO**) y luego lo **marca como entregado** (→ **ENTREGADA**).
10. La organización revisa la entrega y **confirma su conformidad** desde *Mis servicios → detalle*.
11. La organización **evalúa al profesional** (→ **EVALUADA**) y el profesional **evalúa a la organización**. Ambas evaluaciones son ciegas: se publican cuando las dos partes evalúan o a los 7 días. Los comentarios pasan por moderación.

## Persistencia

- Con `VITE_USE_API` sin definir o en `true`, todo se guarda en MySQL a través de la API PHP. Cada cambio de estado queda en `historial_reservas`.
- Con `VITE_USE_API=false` (modo demostración), se usa el almacén simulado y `localStorage`.

## Dónde está el código

| Paso | Frontend | API |
|---|---|---|
| 1-2 | `PaginaAgendar`, `PaginaCondiciones`, `services/disponibilidad.ts`, `services/reservas.ts` | `disponibilidad?accion=retener`, `POST /reservas/` |
| 3 | `PaginaSolicitudesAdmin`, `services/solicitudes.ts` | `reservas?accion=asignar-administrador / aprobar-admin / rechazar-admin` |
| 4, 7, 9 | `profesional/pages/DetalleSolicitud` | `aceptar-profesional`, `rechazar-profesional`, `responder-reagendamiento`, `marcar-en-curso`, `marcar-entregada` |
| 5 | `PaginaPago` | `accion=pagar` |
| 6 | `PaginaChat`, `services/chat.ts` | `/chat/` |
| 7, 8, 10 | `PaginaDetalleReserva` | `reagendar`, `simular-cancelacion`, `cancelar`, `conformidad` |
| 11 | `PaginaEvaluar`, `profesional/pages/EvaluarOrganizacion`, `services/evaluaciones.ts` | `/evaluaciones/` |

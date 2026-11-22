# Correcciones de la auditoría final — trazabilidad

Antes del cierre revisamos de nuevo el sistema completo con dos auditorías independientes (una propia, hallazgos **T-xx**, y una externa, hallazgos **A-xx**) y con pruebas que el plan no tenía: concurrencia real, borrados, zonas horarias, textos fuera de rango y duraciones distintas de 60 minutos. La tabla identifica la evidencia disponible por incidencia: regresión automatizada, inspección de código, captura o revisión de la matriz.

**Evidencia:** `evidencias/correcciones_2026-11-17/`

| Archivo | Qué demuestra |
|---|---|
| `integracion_linea_base_codigo_anterior.json` | Las pruebas nuevas contra el código anterior: 75 de 94 aprobadas. Fallan las 17 de regresión (CP-SEG-23 y CP-REG-01..16), CP-INT-CAN-01 (ahora exige `sin_cobro`) y CP-INT-ADM-03, que cuenta la cancelación de CP-INT-CAN-01 |
| `integracion.json` | Las mismas 94 pruebas contra el código corregido: 94 de 94 |
| `concurrencia_escritura.txt` | 60 clientes simultáneos: 30 reservas en horarios distintos con códigos únicos y correlativos, 1 ganador entre 30 que compiten por el mismo horario, 0 errores 500 |
| `e2e/` | 30 pasos en Chrome, 0 errores de JavaScript |
| `bd_scripts_y_migracion.log`, `bd_integridad.log` | Esquema 2026.11-E3.1, scripts equivalentes, migración re-ejecutable y 10 de 10 restricciones de integridad |
| `rendimiento.json`, `estres.json` | Sin regresión de rendimiento |

## 1. Hallazgos, causas y correcciones

| Incidencia | Hallazgo | Severidad | Causa raíz | Corrección | Prueba |
|---|---|---|---|---|---|
| INC-25 | T-01: después de borrar una contratación, ninguna organización podía crear reservas (409 permanente); dos altas simultáneas podían chocar | Crítica | Código SK-AAAA-NNNN calculado con `COUNT(*)+1` sobre una columna `UNIQUE` | Tabla `contadores_reserva` incrementada dentro de la transacción (bloqueo de fila) | CP-REG-08, CP-REG-09, CP-EST-02 |
| INC-26 | T-02 / A-11: la fundadora podía borrar una contratación con su historial, chat y evaluaciones | Alta | `DELETE` expuesto en la API y en la interfaz; FK con `CASCADE` desde historial, chat y evaluaciones | Sin borrado físico (409); FK `RESTRICT`; botón reemplazado por "Ver historial" | CP-REG-09, CP-BD-13 |
| INC-27 | T-03 / A-07: la antelación de la política de cancelación se calculaba con otra zona horaria; el navegador interpretaba las fechas en su propia zona | Alta | PHP usaba la zona de `php.ini` y MySQL la del sistema; la API entrega fechas sin zona | Zona única `America/Santiago` en PHP y en la sesión SQL; el cliente convierte las fechas a instantes ISO; retención con desfase | CP-REG-11, CP-REG-16 |
| INC-28 | A-01: `GET /evaluaciones/?reserva_id=` entregaba la evaluación de la contraparte antes de publicarse | Alta | La política de evaluación ciega solo estaba en `accion=estado` | Misma política en ambas rutas; el comentario de la contraparte solo si fue aprobado | CP-REG-13 |
| INC-29 | A-02: un servicio de 90, 120 o 240 minutos ocupaba solo una hora de agenda | Alta | Bloques fijos de 60 minutos y reserva con el `fin` del bloque | La sesión ocupa todos los bloques que necesita; la agenda ofrece solo inicios con tiempo suficiente | CP-REG-06 |
| INC-30 | A-03: si Skilly devolvía un perfil validado, sus servicios seguían en el catálogo y se podían contratar | Alta | La elegibilidad solo se revisaba al publicar | Condición común (perfil validado) en catálogo, ficha, agenda, retención y reserva | CP-REG-14 |
| INC-31 | A-05: decisiones sobre una reserva tomadas con una lectura previa; deadlock entre retenciones simultáneas | Alta | Lectura fuera de la transacción; bloqueos de hueco de `REPEATABLE READ`; orden de bloqueo inverso entre reservar y retener | `SELECT … FOR UPDATE` dentro de la transacción; `READ COMMITTED`; orden único bloque → retención | CP-REG-12, CP-EST-02 |
| INC-32 | T-04: textos más largos que la columna producían error 500 | Media | Sin validación de largo en el servidor | `exigirLargos()` en registro, perfiles, servicios, agenda y reservas | CP-REG-02 |
| INC-33 | T-05: se guardaba y mostraba un enlace `javascript:` en LinkedIn o portafolio | Media | Sin validación de esquema de URL | `urlOpcional()` en la API y `hrefSeguro()` en la interfaz | CP-REG-03, CP-UNI-ENL-01/02 |
| INC-34 | T-06 / A-04: el registro guardaba el consentimiento como aceptado aunque no se enviara, con fecha del cliente | Media | El servidor fijaba `consentimiento_aceptado = 1` | Se exige `consentimiento: true`; fecha y versión las fija el servidor | CP-REG-01 |
| INC-35 | T-07: con la contraseña inicial publicada se podía operar el panel completo | Media | Solo había un aviso visual | La API responde 403 `cambiar_contrasena` hasta cambiarla; la interfaz lleva a "Mi cuenta" | CP-SEG-23, E2E-21 |
| INC-36 | T-08: editar formación, experiencia o enlaces de un perfil validado no lo devolvía a revisión | Media | La edición conservaba el estado `validado` | Cambios de credenciales → `en_revision` y fuera del catálogo hasta revalidar | CP-REG-15 |
| INC-37 | A-06: rechazar una solicitud no devolvía su horario al catálogo | Media | Solo la cancelación liberaba bloques | Liberación en ambos rechazos | CP-REG-07 |
| INC-38 | A-12: cancelar antes de pagar registraba "reembolsado" | Media | La política de retención no consideraba si hubo pago | Estado de pago `sin_cobro`; la simulación indica `pagado: false` | CP-REG-10, CP-INT-CAN-01, E2E-16 |
| INC-39 | T-10: el mismo RUT se podía registrar dos veces escribiéndolo con espacios | Baja | La columna generada no quitaba espacios | RUT guardado en forma canónica y columna generada sin espacios | CP-REG-04, CP-BD-14 |
| INC-40 | T-11: la ficha pública de un profesional no validado era accesible | Baja | Sin filtro de validación | Visible solo validada, o para Skilly, el propio profesional y quienes ya lo contrataron | CP-REG-14 |
| INC-41 | T-12: categorías sin tildes ni eñes ("desempeno", "Diseno") | Baja | Datos iniciales escritos sin tildes | Textos corregidos y `SET NAMES utf8mb4` en los scripts | Captura `RESP-catalogo-escritorio` |
| INC-42 | T-13: el listado administrativo de profesionales seguía con N+1 | Baja | Bucle de una consulta por profesional | `obtenerProfesionalesLote()` | Revisión de código |
| INC-43 | A-10: `comparar_esquemas.py` no comparaba la columna destino de las FK; se afirmaba FNBC | Baja | Comparador incompleto; afirmación teórica excesiva | Comparador estricto (columna destino e índices sobrantes); normalización corregida | Prueba del comparador (FK a otra columna → 2 diferencias) |
| INC-44 | A-08: RNF-07 (XAMPP) figuraba como validado sin ejecutarse en XAMPP; ninguna prueba ejercía escrituras concurrentes | Media | La trazabilidad contaba cualquier caso aprobado con el requisito | RNF-07 exige CP-MAN-01 y CP-MAN-03; prueba de estrés de escritura | Hoja *Trazabilidad*, CP-EST-02 |
| INC-45 | T-17: el inicio de sesión respondía antes si el correo no existía | Baja | No se verificaba ningún hash en ese caso | Verificación contra un hash ficticio | Revisión de código |
| INC-46 | Detalles de interfaz: texto de la tarjeta del catálogo en una sola línea; resumen de administración con 8 de 10 estados | Baja | CSS sin `display:flex`; lista de estados incompleta | Corregidos | E2E y capturas |
| INC-47 | T-16: la compilación solo funcionaba detrás del proxy de Vite | Baja | URL de la API fija | `VITE_API_URL` documentada | Revisión de código |

Además se cerraron dos incidencias que estaban abiertas: **INC-21** (dependencias con avisos: zod 4 y react-router 7, `npm audit` de producción sin avisos) e **INC-22** (paquete de 682 kB: áreas de administración y profesional con carga diferida y dependencias en paquetes propios; el mayor queda en 237 kB, sin advertencias de compilación).

## 2. Pruebas que cambiaron de expectativa

| Prueba | Antes esperaba | Ahora espera | Motivo |
|---|---|---|---|
| CP-INT-CAN-01 | Cancelar una solicitud no pagada → `reembolsado` | `sin_cobro` | Validaba el defecto INC-38 |
| CP-INT-AUT-01 | La fundadora opera con la contraseña inicial | La API exige cambiarla (CP-SEG-23) | INC-35 |
| E2E-16 | El diálogo de cancelación muestra "Se devuelve" | Indica que no hubo cobro | INC-38 |
| CP-UNI-CON-04 | Cancelación sin pago → reembolso | `sin_cobro` en modo demostración | INC-38 |

## 3. Cómo reproducir

```bash
bash scripts/entorno-pruebas.sh                                   # base limpia + API
SKILLY_API_URL=http://127.0.0.1:8080/api npm run test:integracion # 94 pruebas
node tests/rendimiento/concurrencia_escritura.mjs 30              # estrés de escritura
mariadb -uroot < database/migracion_correcciones_2026_11.sql      # bases existentes (re-ejecutable)
```

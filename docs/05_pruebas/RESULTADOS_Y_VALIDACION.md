# Ejecución, validación y comparación de resultados — Skilly LATAM

**Alcance temporal.** Este registro corresponde a E3.1. Para la ejecución posterior a las correcciones de cierre, consultar la hoja Cierre y evidencias/cierre/.

Este documento cubre la ejecución del protocolo (3.1.5.10), la validación y el análisis de los resultados (3.1.5.11) y la comparación de resultados esperados frente a obtenidos con métricas (3.1.6.12). Los datos provienen de ejecuciones reales registradas en `evidencias/` y en el libro `Plan_y_Resultados_de_Pruebas.xlsx`.

## 1. Ejecución del protocolo

El protocolo se ejecutó en **tres rondas sobre el mismo plan**:

1. **Línea base:** contra la versión de la Evaluación 2, para medir el estado inicial con evidencia.
2. **Verificación:** después de cada corrección, repitiendo la suite **completa**, no solo el caso afectado.
3. **Revisión final (EJ-20..EJ-25):** una revisión adversarial del sistema ya corregido encontró 23 defectos nuevos (INC-25..INC-47). Cada uno recibió una prueba de regresión que se ejecutó primero contra el código anterior (debe fallar) y después contra el corregido (debe pasar). Detalle: `CORRECCIONES_AUDITORIA.md`.

| Ejecución | Comando | Resultado | Evidencia |
|---|---|---|---|
| EJ-01 Línea base unitarias | `npx vitest run` | 27/27 | consola |
| EJ-02 Línea base rendimiento | `medir.mjs --consultas` | Catálogo: 1.803 SQL/petición; catálogo filtrado: **100 % HTTP 500** | `rendimiento_linea_base.json` |
| EJ-03 Línea base integración | `test:integracion` | **59/74** (15 fallidos) | `integracion_linea_base.json` |
| EJ-14 Línea base integridad BD | `pruebas_integridad.sql` sobre el esquema original | **1/8** restricciones presentes | `bd_integridad_linea_base.log` |
| EJ-04/18 Integración (2.ª ronda) | `test:integracion` | 77/77 | `integracion_final.json` |
| EJ-13 Unitarias + cobertura (2.ª ronda) | `test:cobertura` | 43/43; 52,3 % de líneas | `unitarias_final.json`, `cobertura_resumen.json` |
| EJ-09..12/18 E2E (2.ª ronda) | `test:e2e` | 1.ª: 6 OK / 10 fallos / 10 bloqueados → 29/29, 0 errores JS | `e2e/resultados_e2e.json` + 29 capturas |
| EJ-25 Línea base de la revisión final | `test:integracion` con las 17 pruebas nuevas, sobre el código anterior | **75/94** (fallan las 17 de regresión, CP-INT-CAN-01 y CP-INT-ADM-03) | `correcciones_2026-11-17/integracion_linea_base_codigo_anterior.json` |
| EJ-21..25 Integración final | `test:integracion` (×3) | **94/94** | `correcciones_2026-11-17/integracion.json` |
| EJ-25 Unitarias + cobertura | `test:cobertura` | **45/45**; 52,5 % de líneas | `correcciones_2026-11-17/unitarias.json`, `cobertura_resumen.json` |
| EJ-24/25 E2E | `test:e2e` | **30/30**, 0 errores JS (incluye el cambio obligatorio de contraseña, E2E-21) | `correcciones_2026-11-17/e2e/` (30 capturas) |
| EJ-23/24 Escrituras simultáneas | `concurrencia_escritura.mjs` | 1.ª: errores 500 por *deadlock* → final: 60 clientes, 1 reserva, 0 errores 500 | `correcciones_2026-11-17/concurrencia_escritura.txt` |
| EJ-05/25 Rendimiento | `medir.mjs` | 0 % de error; catálogo 19 → 21 SQL (filtro de elegibilidad), p50 15,2 ms, p95 20,9 ms | `rendimiento_corregido.json`, `correcciones_2026-11-17/rendimiento.json` |
| EJ-06/25 Estrés | 32 clientes × 1.000 | 0 % de error (5.000 peticiones) | `estres_corregido.json`, `correcciones_2026-11-17/estres.json` |
| EJ-14/15/25 Base de datos | Integridad, scripts, migraciones | 10/10; 0 diferencias; datos intactos | `correcciones_2026-11-17/bd_integridad.log`, `bd_scripts_y_migracion.log` |
| EJ-25 Estáticas | `tsc`, `build`, `php -l` | Sin errores ni advertencias de compilación; PHP 20/20 | `correcciones_2026-11-17/typecheck.log`, `build.log`, `php_lint.log` |
| EJ-08 → EJ-25 Dependencias | `npm audit --omit=dev` | 3 avisos → **0** (react-router 7, zod 4) | `correcciones_2026-11-17/npm_audit_produccion.json` |

**Entorno:** Ubuntu 24.04 · Node 22.23 · PHP 8.3.6 · MariaDB 10.11.14 · Chrome 153. Fecha: 17-11-2026.

Cada caso tiene su evidencia:

- **Integración y unitarias:** el informe JSON de Vitest, con título, estado, duración y mensaje de error si falló.
- **E2E:** una captura PNG por paso.
- **Base de datos:** el log con el error exacto que devolvió el motor.

## 2. Resumen de resultados (estado final)

| Tipo | Definidos | Aprobados | Fallidos | Pendientes |
|---|---|---|---|---|
| Unitarias | 45 | 45 | 0 | 0 |
| Integración (positivas, negativas, límites, concurrencia) | 69 | 68 | 0 | 1 (CP-MAN-03, XAMPP) |
| E2E funcionales | 20 | 20 | 0 | 0 |
| Seguridad (incluye dependencias) | 28 | 27 | 0 | 1 (CP-MAN-02) |
| Rendimiento, carga y estrés | 7 | 7 | 0 | 0 |
| Base de datos | 15 | 15 | 0 | 0 |
| Usabilidad y compatibilidad | 14 | 10 | 0 | 4 |
| Análisis estático | 3 | 3 | 0 | 0 |
| **Total** | **201** | **195** | **0** | **6** |

## 3. Comparación: resultados esperados frente a obtenidos

La tabla completa, con las columnas *ID · Requerimiento · Esperado · Obtenido · Coincidencia · Desviación · Causa · Severidad · Acción correctiva · Estado final · Evidencia* para los 201 casos, está en la hoja **"Esperado vs obtenido"**. A continuación, **todas las discrepancias** detectadas:

| ID | Esperado | Obtenido (línea base) | Desviación y causa | Sev. | Acción correctiva | Estado final |
|---|---|---|---|---|---|---|
| CP-INT-CAT-03 / CP-REN-02 | Filtro de modalidad: 200 con 1 y 0 resultados | **HTTP 500** en el 100 % de las peticiones | Parámetros nombrados y posicionales mezclados en PDO (INC-02) | Crítica | `EXISTS` con parámetros nombrados y validados | Corregido, 200 |
| CP-INT-RES-09 | En curso → chat disponible → entregada | Chat 409 en EN_CURSO; el profesional no tenía botón para avanzar | Regla del chat limitada a CONFIRMADA (INC-13) y sin interfaz (INC-01) | Crítica | Chat de CONFIRMADA a ENTREGADA; botones Comenzar y Marcar entregado | Corregido (también E2E-12) |
| CP-INT-RES-11, EVA-02, EVA-03, EVA-04 | Conformidad, evaluación ciega, publicación conjunta, moderación | No se ejecutaron: la reserva nunca llegó a ENTREGADA | Dependencia del caso anterior | Crítica | (la de INC-01/13) | Corregido |
| CP-INT-REA-01 | La reserva pasa a REAGENDADA con propuesta | Seguía CONFIRMADA; el historial decía REAGENDADA (estado inconsistente) | INC-06 | Alta | Estado REAGENDADA real | Corregido |
| CP-INT-REA-02 | El profesional acepta y la reserva se mueve al nuevo horario | **404**: la acción no existía | INC-06 | Alta | Acción `responder-reagendamiento` y liberación de horarios | Corregido |
| CP-INT-EVA-05 | Con plazo vencido, la evaluación unilateral cuenta en la reputación | `totalHistoricas = 0`: nunca se publicaba | Sin publicación por plazo (INC-05) | Alta | `publicarEvaluacionesVencidas()` | Corregido |
| CP-INT-INT-01 | Borrar un servicio con historial → 409 | (dependía de RES-09) | INC-03 | Alta | FK RESTRICT + verificación previa | Corregido |
| CP-INT-INT-02 | Borrar un profesional con contrataciones → 409 | **200**: se borraron en cascada el profesional, sus reservas, historial y evaluaciones | FK CASCADE (INC-03) | Alta | FK RESTRICT; archivos se borran después del commit | Corregido |
| CP-VAL-01/02/03 | RUT inválido, correo inválido, contraseña débil → 400 | **201**: cuenta creada | Sin validación de servidor (INC-09) | Media | `rutValido`, `correoValido`, `errorContrasena` | Corregido |
| CP-SEG-20 | Cabeceras nosniff, DENY, no-store | Ausentes | No configuradas (INC-15) | Baja | `cors.php` | Corregido |
| CP-BD-06/07/08/12 | La base rechaza bloque invertido, montos inconsistentes, evaluación duplicada y RUT duplicado | Aceptados | Faltaban CHECK/UNIQUE (INC-12, INC-14) | Baja | CHECK, UNIQUE, columna generada | Corregido |
| CP-BD-09/10 | La base rechaza borrar un servicio o profesional con contrataciones | Borrado en cascada | INC-03 | Alta | RESTRICT | Corregido |
| CP-REN-01 | Catálogo p95 ≤ 300 ms | p95 349 ms; 1.803 SQL | N+1 (INC-10) | Media | Carga por lotes + índices | Corregido: p95 19 ms |
| RESP-ingreso-móvil/tablet | Sin desplazamiento horizontal | `scrollWidth` 700 px en 390 y 933 px en 768 | Decoraciones CSS fuera del contenedor (INC-18) | Media | Ocultarlas bajo 1024 px | Corregido |
| (inspección E2E) | El ingreso con base real no muestra credenciales | Botones con la contraseña de la fundadora | Bloque demo sin condición (INC-17) | Alta | Solo con `VITE_USE_API=false` | Corregido |
| (cálculo de contraste) | Contraste ≥ 4,5:1 (WCAG AA) | 3,47:1 en botones, burbujas y calendario | Paleta sin verificar (INC-19) | Media | primario-700/800 | Corregido |
| CP-SEG-DEP | 0 avisos en dependencias de producción | 3 avisos (react-router 2 moderados, zod 1 alto) | Versiones mayores anteriores (INC-21) | Media | Migración a react-router 7.18 y zod 4.6 | Corregido: 0 avisos |
| (compilación) | Sin advertencias | Paquete JS de 683 kB | Sin división por rutas (INC-22) | Baja | Rutas diferidas y paquetes de proveedores | Corregido: mayor fragmento 237 kB |
| CP-REG-01..16, CP-SEG-23, CP-EST-02, CP-BD-13/14 | Ver `CORRECCIONES_AUDITORIA.md` | Fallaban con el código anterior (75/94) | INC-25..INC-47 de la revisión final | 1 crítica, 6 altas, 8 medias, 8 bajas | Una corrección y una prueba por defecto | Corregidos |
| CP-INT-CAN-01 | Cancelar antes de pagar → `sin_cobro` | `reembolsado` | La prueba original validaba el defecto (INC-38) | Media | Expectativa de la prueba corregida y documentada | Corregido |
| CP-MAN-01..06 | Ver plan | No ejecutados | Requieren XAMPP en Windows, personas evaluadoras u otro navegador | — | Ejecutar con el equipo | **Pendiente** |

**Falsos positivos detectados y corregidos en las propias pruebas** (no son defectos del producto, pero se registran por transparencia):

- **EJ-07:** CP-UNI-CON-05 suponía que el dato de demostración no tenía evaluación del profesional.
- **EJ-09/10/11:** selectores de la prueba E2E (campo *Tamaño* es una lista accesible personalizada; textos duplicados).
- **EJ-17:** CP-INT-ING-01 esperaba ver una solicitud cancelada antes de derivarse. La regla correcta es no mostrarla, porque nunca llegó al profesional.
- **EJ-21:** al revés que los anteriores, CP-INT-CAN-01 era un **falso negativo**: aprobaba porque esperaba el comportamiento defectuoso (`reembolsado` sin pago). Se corrigió la expectativa junto con el producto.

## 4. Análisis y validación de resultados

### 4.1 Pruebas exitosas

Al cierre, **los 195 casos ejecutados (100 %)** coinciden con lo esperado; quedan 6 manuales pendientes del equipo. El ciclo completo de contratación se verificó **en la API** (CP-INT-RES-01..11, REA, CHA, EVA, CAN) y **en la interfaz real** (E2E-01..20), recorriendo los 10 estados y los 4 roles.

### 4.2 Incidencias y errores recurrentes

Se registraron **47 incidencias** (hoja *Incidencias*): 3 críticas, 11 altas, 16 medias y 17 bajas. Las 24 primeras salieron de la línea base y las 23 restantes de la revisión final. Hay **cinco patrones recurrentes**:

1. **Funcionalidad "solo en el backend"** (INC-01, INC-05, INC-06). El README declaraba limitaciones parciales, pero el impacto real era mayor: sin los botones de avance, el ciclo de contratación **no podía completarse con la base real**. Las pruebas originales usaban datos de demostración que ya venían en estados avanzados, lo que ocultaba el problema. **Causa raíz:** las pruebas existentes cubrían solo el modo demostración (27 unitarias) y ninguna recorría el flujo contra la API.
2. **Confiar en el frontend** (INC-09, INC-04, INC-17): validaciones, filtros de privacidad y modo demostración controlados solo en la interfaz.
3. **Integridad delegada al código** (INC-03, INC-12, INC-14, INC-26): la base no tenía restricciones que impidieran estados inválidos o borrados destructivos.
4. **Una regla aplicada en un solo punto de entrada** (INC-28, INC-30, INC-37): la evaluación ciega se respetaba en una ruta y no en otra; la elegibilidad del profesional se revisaba al publicar, pero no al listar ni al reservar; solo la cancelación liberaba el horario. **Causa raíz:** la regla estaba escrita dentro de un endpoint y no en una función común. Las correcciones las movieron a `helpers.php` (`profesionalElegible`, `liberarIntervalo`).
5. **Supuestos implícitos del entorno** (INC-25, INC-27, INC-29, INC-31, INC-47): zona horaria del servidor, nivel de aislamiento por defecto de InnoDB, bloques fijos de 60 minutos, `COUNT(*)+1` para el código y URL de la API fija. Ninguna prueba los ejercitaba porque las pruebas corrían en secuencia y en la misma zona horaria. Se agregaron pruebas de concurrencia y la zona se fijó en la configuración.

### 4.3 Validación de las correcciones

Cada corrección se validó con **un caso que fallaba antes y pasa después**, ejecutado sobre una base recién importada:

- **Integración:** 59/74 → 77/77 (2.ª ronda) → **94/94** (revisión final; con el código anterior, 75/94).
- **Integridad de la base:** 1/8 → 8/8 → **10/10**.
- **E2E:** de 6 aprobados a 29/29 → **30/30**.
- **Escrituras simultáneas:** errores 500 por *deadlock* → 60 clientes, un solo ganador, 0 errores 500.
- **Rendimiento:** catálogo de 275 a 15,2 ms p50, con 0 % de error; las correcciones finales no lo empeoraron.
- **Regresión:** las 27 pruebas unitarias originales siguen aprobadas (45/45 en total).

### 4.4 Riesgos pendientes

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Comportamiento en Apache/XAMPP no verificado aquí (`.htaccess` de `uploads/`, `mod_rewrite`, MariaDB 10.4) | Medio | CP-MAN-01..03 con capturas C-07..C-09 |
| Token en `localStorage` (INC-23) | Medio-bajo | Sin sumideros XSS (E2E-11); PM-SEG-01 |
| Cobertura automatizada de componentes baja (52,5 % en `lib`/`services`; pantallas solo por E2E) — INC-24 | Bajo | PM-PRU-01 |
| Usabilidad sin validar con usuarios externos | Medio (criterio 3.1.1.2) | Checklists preparados (CP-MAN-04) |

### 4.5 Oportunidades de optimización

- Paginación de los listados (PM-BD-04).
- Búsqueda `FULLTEXT` (PM-BD-01).
- Precargar las rutas diferidas más usadas para que la primera visita al panel no espere la descarga.

### 4.6 Conclusiones

1. El sistema **cumple los procesos de negocio** de los 26 casos de uso, con evidencia ejecutada en la API y en el navegador.
2. Las dos fallas críticas que impedían demostrar el flujo (avance de estados y filtro de catálogo) están corregidas y cubiertas por pruebas de regresión.
3. La base protege ahora la integridad del historial por sí misma: las 10 restricciones verificadas responden aunque se use otro cliente distinto de la API, y una contratación ya no se puede borrar.
4. La revisión final mostró que una suite que pasa al 100 % no basta: faltaban pruebas de concurrencia, de zona horaria y de reglas aplicadas en todas las rutas. Esas pruebas existen ahora y fallan con el código anterior.
5. Quedan **dos incidencias sin cerrar**, ninguna crítica ni alta: INC-23 (token en `localStorage`, mitigada) e INC-24 (cobertura bajo la meta).

### 4.7 Recomendaciones

Ver `docs/06_mejora/PLAN_MEJORA.md`. Las prioritarias son:

1. Ejecutar CP-MAN-01..04 en el equipo.
2. Activar la integración continua (`.github/workflows/ci.yml`) para que cada PR ejecute tipos, unitarias, compilación, PHP e integración.
3. Pasar el token a una cookie `HttpOnly` al desplegar.
4. Subir la cobertura de `lib` y `services` sobre el 70 %.

## 5. Métricas de calidad

La hoja **Métricas** las calcula con **fórmulas** sobre las hojas *Casos*, *Incidencias* y *Trazabilidad*, de modo que se recalculan cuando el equipo complete los casos pendientes. **Medidas** = calculadas con datos reales; **propuesta** = definida, pero sin dato todavía.

| Métrica | Fórmula | Valor medido | Umbral | ¿Cumple? |
|---|---|---|---|---|
| % de pruebas aprobadas | aprobados / ejecutados = 195 / 195 | **100 %** | ≥ 95 % | Sí |
| % pendientes o bloqueadas | (pendientes + bloqueadas) / total = 6 / 201 | **3,0 %** | ≤ 10 % | Sí |
| % de casos de uso cubiertos | CU con ≥ 1 caso aprobado / 26 | **100 %** | 100 % | Sí |
| % de requerimientos validados | RF+RNF con su evidencia aprobada / 38 = 37 / 38 (falta RNF-07, XAMPP) | **97,4 %** | 100 % | **No** |
| Defectos detectados | n.º de incidencias | **47** | — | — |
| Tasa de defectos | incidencias / casos ejecutados = 47 / 195 | **0,24** | — | — |
| Defectos críticos abiertos | críticas sin corregir | **0** | 0 | Sí |
| Defectos altos abiertos | altas abiertas | **0** | 0 | Sí |
| Tasa de corrección | corregidas / detectadas = 45 / 47 | **95,7 %** | ≥ 80 % | Sí |
| Cumplimiento de criterios de aceptación | integración + E2E aprobados / ejecutados | **100 %** | 100 % | Sí |
| Cobertura automatizada (líneas, `lib` + `services`) | líneas ejecutadas / instrumentadas | **52,5 %** | ≥ 70 % | **No** |
| Mejora de latencia del catálogo | p50 antes / p50 después (hoja *Rendimiento*) | **17,7×** | ≥ 5× | Sí |
| Satisfacción de usabilidad | promedio de 3 checklists (1-5) | **sin dato** | ≥ 4 | Propuesta |

## 6. Propuesta de certificación interna

El producto se considera **apto para aprobación interna** cuando se cumplen *todos* los criterios de salida de la hoja *Certificación*.

**Estado al 17-11-2026:**

- **Cumple:** ≥ 95 % de aprobación; 0 críticos y 0 altos abiertos; 100 % de cobertura de casos de uso; rendimiento; ≥ 80 % de corrección; 0 avisos en dependencias de producción.
- **Pendiente:** checklist de usabilidad con 3 personas e instalación e integración en XAMPP (RNF-07).

**Dictamen: "Aprobación condicionada"**, a la espera de las dos evidencias del equipo. La cobertura automatizada (52,5 %) no es criterio de salida en esta versión. Se registra como meta del plan de mejora (≥ 70 %) por la razón explicada en 4.4.

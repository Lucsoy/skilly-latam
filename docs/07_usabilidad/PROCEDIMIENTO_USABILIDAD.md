# Evaluación de usabilidad con personas externas — instrumento y procedimiento

La rúbrica (3.1.1.2) exige **tres checklists contestados por tres personas ajenas al proyecto**. Esta carpeta deja el instrumento listo para aplicarse.

**Las respuestas no se han completado ni se deben inventar.** Hasta que el equipo aplique los formularios, el caso CP-MAN-04 queda *Pendiente* y la métrica de satisfacción "sin dato".

## 1. Materiales

| Archivo | Uso |
|---|---|
| `Formulario_Usabilidad_Evaluador_1.docx`, `_2.docx`, `_3.docx` | Un formulario independiente por persona: datos (sin dato sensible), consentimiento, 6 tareas observadas, checklist de 20 afirmaciones (escala 1-5 + N/A) en 6 grupos, cuestionario SUS de 10 ítems, observaciones abiertas y firmas |
| `Registro_Resultados_Usabilidad.xlsx` | Se copian las respuestas; calcula con fórmulas el promedio por afirmación, por grupo y general, el puntaje SUS por persona y el promedio, la tasa de éxito y el tiempo por tarea |
| `GUIA_ESTILOS.md` | Lineamientos contra los que se contrastan los hallazgos |

## 2. Diseño del instrumento

- **Checklist (20 ítems, escala Likert 1-5):** cubre lo que pide la rúbrica.

  | Grupo | Ítems |
  |---|---|
  | A. Navegabilidad | 1-4 |
  | B. Estética y consistencia | 5-8 (uso de la guía de estilos) |
  | C. Formularios, mensajes y errores | 9-12 |
  | D. Diseño responsivo | 13-15 |
  | E. Comprensión del proceso de negocio | 16-18 (estado de la contratación, pago simulado, evaluación) |
  | F. Accesibilidad por teclado | 19-20 |

- **Tareas observadas (T1-T6):** recorren el ciclo de contratación y una tarea en el celular. Se registra si la persona la completó sola, con ayuda o no la completó, junto con el tiempo y los errores. Así se mide la usabilidad *real*, no solo la opinión.
- **SUS (System Usability Scale):** cuestionario estándar de 10 ítems (Brooke, 1996). Permite comparar con un valor de referencia: 68 puntos es el promedio de la industria según Sauro (2011).

## 3. Procedimiento de aplicación

1. **Seleccionar 3 personas ajenas al proyecto:** no integrantes, idealmente con perfiles distintos (por ejemplo, alguien de administración o RR. HH., un estudiante de otra carrera y una persona que use poco la tecnología). No pueden haber visto el sistema antes.
2. **Preparar el entorno** con la base real o el modo demostración, según lo que se quiera evaluar:
   - **Modo demostración** (`VITE_USE_API=false`): trae cuentas y contrataciones de ejemplo. Recomendado, porque no requiere preparar datos.
   - **Modo API:** preparar con anticipación una organización, un profesional validado con un servicio publicado y el responsable de administración.
3. **Sesión individual de unos 20 minutos.** Una persona del equipo modera y otra anota:
   1. Leer el consentimiento.
   2. Leer cada tarea **sin indicar dónde hacer clic**. Pedir que la persona piense en voz alta.
   3. Registrar en la sección 2 del formulario: C/A/N, tiempo y errores.
   4. Entregar el checklist (sección 3) y el SUS (sección 4) para que la persona los responda **sola**.
   5. Hacer las preguntas abiertas (sección 5).
   6. Firmar ambas personas.
4. **Evidencia:**
   - escanear o fotografiar cada formulario firmado (`docs/anexos/capturas/U-01..03`);
   - opcional y **solo con autorización**, grabar la pantalla.

## 4. Registro e interpretación

1. Copiar las respuestas en `Registro_Resultados_Usabilidad.xlsx` (celdas amarillas). Las respuestas N/A quedan vacías.
2. Interpretar con las fórmulas de la planilla:

   | Indicador | Regla | Acción |
   |---|---|---|
   | Promedio por afirmación | ≥ 4,0 *Fortaleza* · 3,0-3,9 *Mejorable* · < 3,0 *Problema* | Todo *Problema* genera una incidencia INC-xx con su corrección |
   | Promedio general | Meta ≥ 4,0 (criterio de salida de la certificación) | — |
   | SUS | ≥ 68 sobre el promedio; ≥ 80 excelente | Bajo 68 → revisar las tareas con más ayuda |
   | Tasa de éxito por tarea | Meta 100 % sin ayuda en T1-T4 | Una tarea con "A" o "N" indica un problema de navegación en esa pantalla |
   | Observaciones | Agrupar comentarios repetidos (2 o más personas = hallazgo) | Registrar en la hoja *Incidencias* del plan de pruebas |

3. Actualizar:
   - el caso **CP-MAN-04** (estado y obtenido) en `Plan_y_Resultados_de_Pruebas.xlsx`;
   - la métrica "Satisfacción de usabilidad" de la hoja *Métricas* (celda amarilla).
4. Si se corrigen hallazgos, volver a ejecutar `npm run test:e2e` para comprobar que no hubo regresiones.

## 5. Verificaciones de usabilidad ya ejecutadas (automáticas)

Estas pruebas complementan, pero **no reemplazan**, la evaluación con personas:

| Caso | Verificación | Resultado |
|---|---|---|
| RESP-* (9) | Sin desplazamiento horizontal en ingreso, catálogo y ficha, a 390, 768 y 1440 px | 9/9 (se corrigió INC-18) |
| E2E-17 | Orden de tabulación lógico en el ingreso | Aprobado |
| E2E-16 | El diálogo se cierra con Escape; muestra la retención antes de confirmar | Aprobado |
| E2E-02 | El error de RUT se muestra junto al campo | Aprobado |
| Contraste | 12 combinaciones de la guía ≥ 4,5:1 | Cumple (se corrigió INC-19) |

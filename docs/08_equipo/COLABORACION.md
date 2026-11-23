# Trabajo colaborativo — Skilly LATAM

> **Cómo trabajamos y cómo se acredita.** Hasta la Evaluación 2 el código se compartió como carpetas comprimidas, sin un repositorio común; por eso esas etapas no tienen historial de commits. Desde esta entrega el proyecto vive en el repositorio GitHub del anexo B, con el código publicado en `main`. La incorporación de revisiones mediante *pull requests* comienza con la propuesta de actualización de este documento.
>
> Este documento muestra la integración visible en el código (§1), la organización del equipo (§2-§6) y las evidencias del repositorio (§7). La matriz de roles y el registro de contribuciones están en `Matriz_Responsabilidades_y_Contribuciones.xlsx`.

## 1. Evidencias de integración visibles en el código

| Evidencia | Dónde se observa | Qué demuestra |
|---|---|---|
| Separación por módulos de negocio | `src/modules/{auth,catalogo,agenda,organizacion,profesional,admin}` y `backend/api/<recurso>` | El trabajo se puede repartir por área sin pisarse |
| Contrato común entre capas | `src/types/index.ts` (tipos de dominio) y las mismas claves `camelCase` en las respuestas PHP | Frontend y backend se integraron sobre un contrato explícito |
| Componentes compartidos | `src/components/ui/*` reutilizados en todas las pantallas | Consistencia visual entre personas distintas |
| Convenciones homogéneas | Nombres en español, prefijos `Pagina…`, funciones `skilly…` y `responderError` en todos los endpoints | Normas acordadas y respetadas |
| Doble modo de datos (API / demo) | `src/services/*` con `USE_API` | Permite avanzar el frontend sin depender del backend; también ocultó defectos de integración (ver §6) |
| Documentación previa | `README.md`, `SETUP_XAMPP.md`, `MODULOS_*.md` | Hábito de documentar funcionalidades |

## 2. Aportes del equipo y roles propuestos

Según el registro del equipo, el proyecto se trabajó en clases y se coordinó por WhatsApp.

- **Alonso Rodríguez** aportó ideas al inicio y desarrolló la base de datos.
- **David Muñoz** desarrolló la primera versión de la página, probó su funcionamiento y revisó los informes, el código y la presentación visual.
- **Enzo Cortez** lideró el desarrollo de la versión final, revisó los requerimientos y elaboró el plan de desarrollo.

### Roles propuestos para la matriz RACI

| Rol | Responsabilidades principales |
|---|---|
| Líder de proyecto | Planificación, tablero de *issues*, plazos, coordinación con el docente, retrospectivas |
| Líder técnico / arquitectura | Decisiones técnicas, revisión de PR, CI, contratos entre frontend y API |
| Frontend y UX | Pantallas, guía de estilos, accesibilidad, diseño responsivo |
| Backend y base de datos | API PHP, esquema, migraciones, rendimiento |
| QA y seguridad | Plan de pruebas, ejecución, evidencias, auditoría, usabilidad |
| Documentación | Informe, manuales, diccionario, guion de video, coherencia y ortografía |

La hoja *Matriz RACI* asigna, para 16 actividades de esta evaluación, quién realiza (R), quién aprueba (A), a quién se consulta (C) y a quién se informa (I). El equipo debe escribir el nombre de cada integrante en la hoja *Roles*.

## 3. División de tareas para la Evaluación 3

Una propuesta derivada de las incidencias reales:

| Bloque | Incidencias / mejoras | Rol |
|---|---|---|
| Ciclo de contratación en la interfaz | INC-01, INC-06, INC-13, INC-16 | Frontend |
| API, reglas y rendimiento | INC-02, INC-05, INC-10, INC-11 | Backend |
| Base de datos y scripts | INC-03, INC-12, INC-14, INC-20 | Backend/BD |
| Seguridad | INC-04, INC-07, INC-08, INC-09, INC-15, INC-17 | QA/Seguridad |
| Usabilidad | INC-18, INC-19, checklists externos | Frontend/UX + QA |
| Entorno, Git y CI | Guía de instalación, repositorio, `ci.yml` | Líder técnico |
| Informe, video y defensa | — | Documentación + todo el equipo |

## 4. Prácticas propuestas para integrar y revisar cambios

1. **Integración continua** (`.github/workflows/ci.yml`): en cada PR se ejecutan tipos, pruebas unitarias, compilación, sintaxis PHP e integración contra MariaDB.
2. **Plantilla de PR** (`.github/pull_request_template.md`): qué cambia, cómo se probó, migración si toca la base, sin secretos y revisor asignado.
3. **Regla "no solo backend":** una acción de la API llega con su botón y su prueba E2E, o con una *issue* enlazada.
4. **Revisión cruzada:** quien escribe el backend revisa el PR de frontend del mismo flujo, y viceversa. Así se detectan contratos rotos entre capas.

## 5. Flujo propuesto de Git y documentación compartida

- **Git:** GitHub Flow con ramas `feature/`, `fix/`, `docs/` y `test/`, `main` protegida y *squash merge*. Detalle en `docs/03_entorno/GUIA_GIT_GITHUB.md`.
- **Incidencias:** una *issue* por INC-xx y PM-xx, con etiqueta y responsable. El PR que la resuelve la cierra con `Closes #n`.
- **Documentación compartida:** todo en `docs/` dentro del repositorio, versionado junto al código. Las planillas (`.xlsx`) se editan en ramas `docs/` para evitar conflictos.

## 6. Aprendizajes y mejoras del equipo

| Aprendizaje | Origen (evidencia) | Práctica que se adopta |
|---|---|---|
| Un modo de demostración con datos ya avanzados puede ocultar que el flujo real no funciona | INC-01: el ciclo no se completaba con la base real, pero las 27 pruebas existentes pasaban | Pruebas de integración contra la API real en cada PR |
| "Documentado en el README" no es "implementado" | El README marcaba "✅ Completo" en flujos que no podían terminarse | Revisar la funcionalidad con el guion de video antes de declararla completa |
| La base debe proteger el historial por sí misma | INC-03: borrado en cascada de contrataciones | Toda FK nueva se discute en el PR (RESTRICT o CASCADE) |
| Las validaciones del navegador no bastan | INC-09: la API aceptaba RUT y contraseñas inválidas | Validar en ambas capas con la misma regla y probar el servidor directamente |
| Medir antes de optimizar | INC-10: 1.803 consultas por petición, invisibles con pocos datos | Semilla de volumen y `medir.mjs` en el ensayo general |

## 7. Evidencias del repositorio y del equipo

| Evidencia | Formato | Estado |
|---|---|---|
| Integrantes y aportes | Sección 2 y hoja *Roles* | Informados por el equipo |
| Repositorio público | [Lucsoy/skilly-latam](https://github.com/Lucsoy/skilly-latam) | Código disponible en `main` |
| Historial y revisión | [Commits](https://github.com/Lucsoy/skilly-latam/commits/main/) y [pull requests](https://github.com/Lucsoy/skilly-latam/pulls) | Historial de publicación y revisión de cambios en GitHub |
| Registro de contribuciones | Hoja *Registro contribuciones* | Aportes informados por el equipo. Respaldos individuales pendientes |
| Actas de reuniones o retrospectiva | Hoja *Reuniones* | Pendiente |
| Tablero de *issues* | Captura G-07 | Pendiente |

El criterio 3.1.3.6 se evalúa además por el **proceso en clases** (responsabilidad, compromiso), que solo el docente puede observar.

## 8. Revisión de este cambio

David puede contrastar los aportes de pruebas y control de calidad. Alonso puede revisar la descripción de la base de datos y del trabajo inicial. Cada integrante puede dejar su observación desde su cuenta en el pull request. El historial de GitHub permite consultar quién revisó el cambio y cuándo.

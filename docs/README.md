# Entrega Evaluación N.º 3 — Skilly LATAM: índice y mapa de evidencias

## 1. Índice de la entrega

| Carpeta / archivo | Contenido | Criterio |
|---|---|---|
| `../README.md`, `../CAMBIOS_ENTREGA3.md` | Descripción del sistema y lista de archivos modificados con su motivo | 3.1.4.8 |
| `01_arquitectura/ARQUITECTURA.md` + `diagramas/` | Arquitectura, carpetas, módulos, flujo, API, permisos, errores, concurrencia, zona horaria, convenciones y mantenimiento | 3.1.4.8 |
| `02_base_datos/MODELOS_DATOS.md` + `diagramas/` | Modelo conceptual mejorado, lógico, físico, DER completo y tres vistas por módulo (Mermaid + SVG + PNG) | 3 |
| `02_base_datos/DICCIONARIO_DATOS.md` + `Diccionario_de_Datos.xlsx` | 30 tablas y 207 columnas: tipo, longitud, nulo, clave, defecto, restricciones, relación e índices | 3 |
| `02_base_datos/NORMALIZACION_OPTIMIZACION.md`, `../database/README.md`, `../database/scripts/` | Normalización 1FN-3FN, optimización medida y scripts separados (tablas, PK, FK, índices, datos, eliminar FK, eliminar tablas) | 4 |
| `03_entorno/GUIA_INSTALACION.md`, `GUIA_GIT_GITHUB.md`, `CAPTURAS_REQUERIDAS.md` | Instalación desde cero en Windows + XAMPP, Git/GitHub colaborativo y capturas de evidencia | 3.1.4.7 |
| `04_seguridad/AUDITORIA_SEGURIDAD.md` + `img/` | 12 patrones de seguridad con imágenes del código, pruebas y matriz de vulnerabilidades | 3.1.3.5 |
| `05_pruebas/CASOS_DE_USO.md` | Especificación de los 26 casos de uso (actores, precondiciones, flujos, postcondiciones) y diagrama | 3.1.5.9 |
| `05_pruebas/PLAN_PRUEBAS.md`, `RESULTADOS_Y_VALIDACION.md`, `CORRECCIONES_AUDITORIA.md`, `Plan_y_Resultados_de_Pruebas.xlsx` | Requerimientos, 201 casos, trazabilidad, registro de ejecución, esperado vs obtenido, 47 incidencias, métricas y certificación | 3.1.5.9-3.1.6.12 |
| `../evidencias/` | Resultados reales: línea base, primera corrección y `correcciones_2026-11-17/` (verificación final) | 3.1.5.10 |
| `06_mejora/PLAN_MEJORA.md` | Mejoras implementadas y pendientes, con responsable, esfuerzo, indicador y verificación | 3.1.6.13 |
| `07_usabilidad/` | Guía de estilos, procedimiento, 3 formularios para evaluadores externos y planilla de resultados | 3.1.1.2 |
| `08_equipo/` | Trabajo colaborativo, matriz RACI y registro de contribuciones | 3.1.3.6 |
| `09_defensa/GUION_VIDEO.md`, `GUIA_DEFENSA.md` | Guion del video y banco de preguntas con respuestas basadas en el código | 3.1.1.1, 3.1.6.14 |
| `Informe_Final_Skilly_LATAM.docx` / `.pdf` | Informe académico. Fuente editable: `INFORME_FINAL.md`; se regenera con `python3 docs/generar_informe.py` (portada en `datos_portada.json`) | 3.1.6.15 |

## 2. Dónde está la evidencia de cada criterio

| Criterio de la rúbrica | Evidencia principal | Cómo verificarla |
|---|---|---|
| 3.1.1.1 Coherencia funcional de la interfaz | Video (anexo B del informe); 30 pasos E2E en Chrome | `evidencias/correcciones_2026-11-17/e2e/` |
| 3.1.1.2 Lineamientos estéticos y funcionales | Guía de estilos; pruebas responsivas 390/768/1440 px; 3 checklists externos | `07_usabilidad/`, capturas `RESP-*` |
| 3 Estructura de la base de datos | Modelos conceptual, lógico y físico; diccionario generado desde la base | `02_base_datos/` |
| 4 Optimización y normalización | Scripts separados equivalentes a `skilly.sql`; `EXPLAIN`; mediciones antes/después | `database/`, `evidencias/correcciones_2026-11-17/bd_scripts_y_migracion.log` |
| 3.1.3.5 Patrones de seguridad | 12 patrones con imagen del código y pruebas CP-SEG / CP-REG | `04_seguridad/AUDITORIA_SEGURIDAD.md` |
| 3.1.3.6 Colaboración en equipo | Repositorio, PR revisados, matriz RACI, contribuciones | `08_equipo/`, anexo B |
| 3.1.4.7 Configuración del entorno | Guía paso a paso, CI y enlace al repositorio | `03_entorno/`, `.github/workflows/ci.yml` |
| 3.1.4.8 Documentación de la implementación | Arquitectura, API, comentarios con el porqué y la incidencia | `01_arquitectura/`, `CAMBIOS_ENTREGA3.md` |
| 3.1.5.9 Cobertura del plan de pruebas | Casos de uso, 38 requerimientos, 201 casos de 8 tipos, trazabilidad con fórmulas | `05_pruebas/` |
| 3.1.5.10 Ejecución del protocolo | 25 ejecuciones registradas con comando, entorno, resultado y evidencia | Hoja *Registro de ejecución*, `evidencias/` |
| 3.1.5.11 Validación de resultados | Análisis de causas, regresión que falla antes y pasa después | `RESULTADOS_Y_VALIDACION.md`, `CORRECCIONES_AUDITORIA.md` |
| 3.1.6.12 Esperado vs obtenido y métricas | Hoja *Esperado vs obtenido*, *Métricas* y *Certificación* | `Plan_y_Resultados_de_Pruebas.xlsx` |
| 3.1.6.13 Plan de mejora | Mejoras con prioridad, responsable, indicador y verificación | `06_mejora/PLAN_MEJORA.md` |
| 3.1.6.14 Respuesta a preguntas | Banco de preguntas basado en el código | `09_defensa/GUIA_DEFENSA.md` |
| 3.1.6.15 Informe final | Informe Word/PDF | `Informe_Final_Skilly_LATAM.*` |

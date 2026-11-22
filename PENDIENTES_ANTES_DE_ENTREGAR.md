# Pendientes del equipo antes de entregar

> **Borra este archivo antes de subir la entrega.** Lista lo que no se puede generar desde el código: depende de personas, de Windows con XAMPP o de la cuenta de GitHub del equipo. Nada de esto debe inventarse; si algo no se alcanza, se deja marcado como pendiente en los documentos (ya lo está).

## 1. Portada e identificación (rúbrica: presentación)

- [ ] Completar `docs/datos_portada.json` (institución y sede, asignatura y sección, docente, nombre y RUT de cada integrante).
- [ ] Regenerar el informe: `python3 docs/generar_informe.py` (requiere pandoc, LibreOffice y Poppler). Si no tienen esas herramientas, abrir `docs/Informe_Final_Skilly_LATAM.docx` en Word y completar la portada a mano; luego exportar a PDF.
- [ ] En Word, responder **Sí** cuando pregunte por actualizar los campos (índice con números de página).
- [ ] Completar los integrantes en `docs/08_equipo/COLABORACION.md`, `Matriz_Responsabilidades_y_Contribuciones.xlsx` y la tabla de la §11 de `docs/09_defensa/GUIA_DEFENSA.md`.

## 2. Windows + XAMPP (RNF-07, CP-MAN-01..03)

- [ ] Instalar desde cero siguiendo `docs/03_entorno/GUIA_INSTALACION.md` en un equipo con Windows. Importar con phpMyAdmin o `cmd /c` (no con la tubería de PowerShell).
- [ ] Tomar las capturas C-01..C-10 de `docs/03_entorno/CAPTURAS_REQUERIDAS.md`.
- [ ] CP-MAN-02: comprobar que `http://localhost/skilly-api/uploads/documentos/` responde 403.
- [ ] CP-MAN-03: `$env:SKILLY_API_URL="http://localhost/skilly-api/api"; npm run test:integracion` con una base recién importada → 94 passed. Seguir la sección de pruebas de GUIA_INSTALACION.md para volver a crear exclusivamente la base desechable. Importar sobre tablas existentes conserva la contraseña cambiada.
- [ ] Registrar el resultado en `Plan_y_Resultados_de_Pruebas.xlsx`: hoja *Casos* (columna Estado de CP-MAN-01..03 → "Aprobado" o "Fallido", evidencia y fecha) y fila EJ-19 de *Registro de ejecución*. La métrica de requerimientos se recalcula sola (RNF-07 también requiere CP-MAN-05).

## 3. Usabilidad y compatibilidad (CP-MAN-04..06)

- [ ] Aplicar los tres formularios `docs/07_usabilidad/Formulario_Usabilidad_Evaluador_1/2/3.docx` a **tres personas reales ajenas al proyecto**, con firma.
- [ ] Copiar las respuestas en `Registro_Resultados_Usabilidad.xlsx` y el promedio en la hoja *Métricas* del plan de pruebas.
- [ ] Probar en Firefox y Edge (CP-MAN-05) y con un lector de pantalla, por ejemplo NVDA (CP-MAN-06).

## 4. GitHub y trabajo colaborativo

- [ ] Crear el repositorio privado y subir el proyecto siguiendo `docs/03_entorno/GUIA_GIT_GITHUB.md` (sin `node_modules`, `dist`, `coverage`, `config.local.php` ni `.env.local`).
- [ ] Proteger `main`, activar `.github/workflows/ci.yml` y trabajar con ramas y PR revisados.
- [ ] Completar las capturas G-01..G-07 y el enlace del repositorio y del CI en el anexo B del informe (`docs/INFORME_FINAL.md`).

## 5. Video y defensa

- [ ] Grabar el video siguiendo `docs/09_defensa/GUION_VIDEO.md` (el primer ingreso de la fundadora ahora exige cambiar la contraseña) y agregar el enlace al anexo B.
- [ ] Repartir las preguntas de `docs/09_defensa/GUIA_DEFENSA.md` y ensayar (incluye las preguntas 43-46 sobre la revisión final).

## 6. Limpieza final

- [ ] Verificar que `backend/uploads/documentos/` solo contenga `.gitkeep`.
- [ ] Borrar este archivo.

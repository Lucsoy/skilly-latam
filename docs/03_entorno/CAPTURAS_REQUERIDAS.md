# Capturas requeridas (evidencia de configuración y colaboración)

Tomar en el equipo del proyecto y guardar en `docs/anexos/capturas/` con el código indicado. **No reutilizar capturas de otro equipo ni editarlas.** Se recomienda que se vea la fecha y hora del sistema.

| Código | Qué mostrar | Guía / paso | Criterio |
|---|---|---|---|
| C-01 | Terminal con `node -v` y `npm -v` | Instalación §3 | 3.1.4.7 |
| C-02 | XAMPP Control Panel con Apache y MySQL en verde | §5 | 3.1.4.7 |
| C-03 | phpMyAdmin: `skilly_db` con 30 tablas tras la importación | §6 | 3.1.4.7 / 3 |
| C-04 | `npm ci` terminado sin errores | §8 | 3.1.4.7 |
| C-05 | `npm run dev` y el catálogo en <http://localhost:5173> | §10 | 3.1.4.7 |
| C-06 | Cambio obligatorio de la contraseña inicial de la fundadora (la app abre *Mi cuenta* y, al cambiarla, el aviso desaparece) | §10 | 3.1.3.5 |
| C-07 | <http://localhost/skilly-api/api/categorias/> con JSON | §11 | 3.1.4.7 |
| C-08 | Acceso directo a `uploads/documentos/` → 403 Forbidden | §11 (CP-MAN-02) | 3.1.3.5 |
| C-09 | `npm run test:integracion` contra XAMPP: 94 passed | §12 (CP-MAN-03) | 3.1.5.10 |
| C-10 | `npm test` (45 passed) y `npm run build` (sin advertencias) | §12 | 3.1.5.10 |
| G-01 | `git status` antes del primer commit (sin node_modules ni secretos) | Git §1 | 3.1.4.7 |
| G-02 | Repositorio en GitHub con los archivos | Git §2 | 3.1.4.7 |
| G-03 | Colaboradores invitados | Git §2 | 3.1.3.6 |
| G-04 | Regla de protección de `main` | Git §2 | 3.1.3.6 |
| G-05 | Pull request con revisión aprobada y CI en verde | Git §4 | 3.1.3.6 |
| G-06 | Historial de `main` / gráfico de commits por integrante (*Insights → Contributors*) | Git §4 | 3.1.3.6 |
| G-07 | Tablero de issues/Project | Git §6 | 3.1.3.6 |
| U-01..03 | Los tres checklists de usabilidad firmados (escaneo o PDF) | docs/07_usabilidad | 3.1.1.2 |

Las capturas de la interfaz y de las pruebas automáticas ya generadas están en `evidencias/e2e/` (29 PNG con su resultado en `resultados_e2e.json`).

# Guía Git y GitHub — trabajo colaborativo en Skilly LATAM

> Hasta la Evaluación 2 el código se compartió como carpetas comprimidas, sin historial Git. Esta guía es el procedimiento con el que el equipo publica el proyecto en GitHub y trabaja de forma colaborativa; la URL del repositorio, el historial de commits y los *pull requests* quedan registrados en la tabla final y en el anexo B del informe.

## 1. Preparar el repositorio local (una sola vez, integrante responsable)

```powershell
cd C:\ruta\skilly-latam
git init
git add .
git status            # revisar: NO deben aparecer node_modules, dist, .env.local ni config.local.php
git commit -m "Versión inicial de Skilly LATAM (Evaluación 3)"
```

El archivo `.gitignore` ya excluye:

- `node_modules`, `dist`, `*.local` y `*.log`;
- `backend/config/config.local.php`;
- los documentos subidos (`backend/uploads/documentos/*`).

📸 G-01: salida de `git status` antes del primer commit.

## 2. Crear el repositorio en GitHub y vincularlo

1. En <https://github.com/new>:
   - Nombre: `skilly-latam`.
   - Visibilidad: **Private** (recomendado: contiene datos de configuración del proyecto).
   - **Sin** README, .gitignore ni licencia (ya existen localmente).
2. Vincular y subir:

   ```powershell
   git remote add origin https://github.com/<usuario-u-organizacion>/skilly-latam.git
   git branch -M main
   git push -u origin main
   ```

   📸 G-02: repositorio en GitHub con los archivos.
3. *Settings → Collaborators → Add people*: invitar a cada integrante y al docente si lo solicita. 📸 G-03
4. *Settings → Branches → Add rule* para `main`:
   - **Require a pull request before merging** (1 aprobación);
   - **Require status checks to pass** (el flujo `CI` de `.github/workflows/ci.yml`).

   📸 G-04

## 3. Flujo de trabajo por ramas (GitHub Flow)

```text
main  ──●──────────────●────────────●──   (siempre estable, protegida)
          \            /            /
feature/   ●──●──●────●            /       (una rama por tarea)
fix/                   ●──●───────●
```

| Prefijo | Uso | Ejemplo |
|---|---|---|
| `feature/` | Nueva funcionalidad | `feature/reagendamiento-ui` |
| `fix/` | Corrección de un defecto | `fix/inc-02-filtro-modalidad` |
| `docs/` | Documentación | `docs/plan-pruebas` |
| `test/` | Pruebas | `test/integracion-reservas` |

```powershell
git switch main
git pull                                   # partir de la última versión
git switch -c fix/inc-02-filtro-modalidad  # nueva rama
# … editar, probar …
git add backend/api/servicios/index.php tests/integracion/flujo-completo.test.ts
git commit -m "fix(servicios): filtro de modalidad con parámetros nombrados (INC-02)"
git push -u origin fix/inc-02-filtro-modalidad
```

### Mensajes de commit

Formato `tipo(área): descripción en imperativo (referencia)`. Tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`.

- `feat(reservas): respuesta del profesional al reagendamiento (INC-06)`
- `perf(api): catálogo por lotes, de 1.803 a 19 consultas (INC-10)`

## 4. Pull request y revisión de código

1. En GitHub: *Compare & pull request* → base `main`. La plantilla (`.github/pull_request_template.md`) pide qué cambia, cómo se probó y la lista de verificación.
2. Asignar a **otro integrante** como revisor (*Reviewers*). Quien revisa:
   - lee el *diff*;
   - ejecuta las pruebas si toca la API;
   - deja comentarios en las líneas;
   - aprueba (*Approve*) o pide cambios (*Request changes*).
3. El flujo **CI** debe quedar en verde: tipos, unitarias, compilación, sintaxis PHP e integración contra MariaDB.
4. Merge con **Squash and merge** (un commit limpio por tarea) y **Delete branch**. 📸 G-05 (PR con revisión aprobada y CI verde), 📸 G-06 (historial de `main`)

## 5. Resolver conflictos

```powershell
git switch fix/mi-rama
git pull origin main          # trae lo nuevo de main
# Git marca los archivos en conflicto: editarlos y elegir el contenido correcto
git add archivo-resuelto.tsx
git commit                    # cierra el merge
npm test                      # volver a probar
git push
```

## 6. Gestión de incidencias (Issues)

Una *issue* por incidencia o mejora (ver `docs/06_mejora/PLAN_MEJORA.md`):

- título `INC-21 Actualizar react-router a v7`;
- etiquetas `bug`, `seguridad`, `mejora`, `docs`;
- responsable asignado;
- el PR que la resuelve incluye `Closes #<n>` para cerrarla al integrarse.

Un **Project** (tablero *To do / In progress / Review / Done*) muestra el avance. 📸 G-07

## 7. Evidencias que se deben registrar (completar el equipo)

| Evidencia | Valor |
|---|---|
| URL del repositorio | (completar) |
| Integrantes con acceso | (completar) |
| N.º de commits por integrante (`git shortlog -sn`) | (completar) |
| PRs revisados y aprobados (enlaces) | (completar) |
| Ejecuciones de CI en verde (enlace a *Actions*) | (completar) |

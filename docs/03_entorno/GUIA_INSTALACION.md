# Guía de instalación desde cero — Windows + XAMPP

Esta guía deja Skilly LATAM funcionando en un equipo Windows 10/11 sin nada instalado. Cada paso indica el **comando exacto**, la **ruta** y el **resultado esperado**. Las capturas que conviene tomar como evidencia están marcadas con 📸 y listadas en `CAPTURAS_REQUERIDAS.md`.

> Las instrucciones se verificaron contra los archivos reales del proyecto. Las pruebas automatizadas de esta entrega se ejecutaron en Linux con PHP 8.3 y MariaDB 10.11, y en el **paso 12** se indica cómo repetirlas en XAMPP. La instalación en Windows debe confirmarla el equipo (caso de prueba CP-MAN-01).

## 1. Requisitos previos

| Componente | Versión probada / recomendada | Mínima |
|---|---|---|
| Windows | 10 u 11 (64 bits) | 10 |
| XAMPP | 8.2.x (Apache 2.4, PHP 8.2, MariaDB 10.4) | PHP 8.1 con `pdo_mysql`, `fileinfo` y `mbstring`; MariaDB 10.4 o MySQL 8 |
| Node.js | 22 LTS (probado 22.23) | 18.18 (lo exige Vite 6) |
| npm | 10.x (incluido con Node) | 9 |
| Git | 2.4x | 2.30 |
| Navegador | Chrome, Edge o Firefox actuales | — |
| Espacio en disco | ~600 MB (XAMPP) + ~300 MB (`node_modules`) | — |

Puertos libres: **80** (Apache), **3306** (MySQL) y **5173** (Vite).

## 2. Versiones y dependencias del proyecto

Las fija `package.json` / `package-lock.json`:

- **Producción:** React 18.3, React Router 7.18, Zustand 5, React Hook Form 7, Zod 4.6, @hookform/resolvers 5.9, date-fns 4, date-fns-tz, lucide-react.
- **Desarrollo:** Vite 6, TypeScript 5.7, Tailwind 3.4, Vitest 3.2 (+ cobertura v8).

El backend no usa Composer: solo PHP con las extensiones `pdo_mysql`, `fileinfo` y `mbstring`, que vienen activadas en XAMPP.

## 3. Instalación de Node.js y npm

1. Descarga el instalador **LTS** desde <https://nodejs.org> e instálalo con las opciones por defecto (deja marcado "Add to PATH").
2. Abre una **nueva** terminal (PowerShell) y ejecuta:

   ```powershell
   node -v
   npm -v
   ```

   **Resultado esperado:** `v22.x.x` y `10.x.x` (o superiores). 📸 C-01

## 4. Instalación y configuración de XAMPP

1. Descarga XAMPP para Windows (PHP 8.2) desde <https://www.apachefriends.org> e instálalo en `C:\xampp`. Marca al menos *Apache*, *MySQL*, *PHP* y *phpMyAdmin*.
2. Si Windows pregunta por el firewall, permite el acceso en **redes privadas**.

## 5. Configuración de Apache y MySQL

1. Abre **XAMPP Control Panel** y presiona **Start** en *Apache* y en *MySQL*. Ambos deben quedar en verde. 📸 C-02
   - Si el puerto 80 está ocupado (Skype, IIS), cambia `Listen 80` por `Listen 8080` en `C:\xampp\apache\conf\httpd.conf`. Usa entonces `http://localhost:8080/...` en esta guía y en `vite.config.ts`.
2. **`mod_rewrite`** (necesario para las rutas `/api/...`): en `C:\xampp\apache\conf\httpd.conf` comprueba que la línea `LoadModule rewrite_module modules/mod_rewrite.so` **no** tenga `#` al inicio, y que en el bloque `<Directory "C:/xampp/htdocs">` diga `AllowOverride All`. Viene así por defecto. Si cambias algo, reinicia Apache.
3. **PHP:** en *Config → PHP (php.ini)* verifica `upload_max_filesize = 40M` y `post_max_size = 40M` (los valores de XAMPP). La API limita los documentos a 5 MB.

## 6. Creación e importación de la base de datos

**Opción recomendada (phpMyAdmin):**

1. Abre <http://localhost/phpmyadmin>.
2. Pestaña **Importar** → *Seleccionar archivo* → `database\skilly.sql` del proyecto → **Importar**.
3. **Resultado esperado:** "La importación se ejecutó exitosamente". A la izquierda aparece `skilly_db` con **30 tablas**. 📸 C-03

**Opción por consola** (PowerShell, desde la carpeta del proyecto). La importación se hace con `cmd /c` y `<`, **no** con `Get-Content … |`: la tubería de PowerShell vuelve a codificar el texto y las tildes quedan dañadas ("DesempeÃ±o").

```powershell
cmd /c "C:\xampp\mysql\bin\mysql.exe -u root --default-character-set=utf8mb4 < database\skilly.sql"
C:\xampp\mysql\bin\mysql.exe -u root -e "SELECT COUNT(*) AS tablas FROM information_schema.tables WHERE table_schema='skilly_db'"
```

**Resultado esperado:** `tablas = 30`. En phpMyAdmin, la categoría *Evaluación de desempeño* debe verse con tilde y eñe.

- **¿Ya tenías `skilly_db` con datos?** No la borres: respáldala (*Exportar*) y ejecuta las migraciones en orden (`migracion_cierre_2026_11.sql` si es anterior a noviembre, `migracion_entrega3_2026_11.sql` y `migracion_correcciones_2026_11.sql`), como se explica en `database/README.md`.
- **Para revisar el modelo por partes:** ejecuta `database\scripts\00` a `05` en orden (mismo resultado).

## 7. Configuración segura del backend PHP

1. Copia **la carpeta completa** `backend` a `C:\xampp\htdocs\skilly-api`:

   ```powershell
   robocopy backend C:\xampp\htdocs\skilly-api /E
   ```

   Debe quedar `C:\xampp\htdocs\skilly-api\.htaccess`, junto con las carpetas `config\`, `api\` y `uploads\`.
2. **Credenciales:** los valores por defecto (`localhost`, `3306`, `skilly_db`, `root`, sin contraseña) sirven para XAMPP. Si tu MySQL tiene contraseña (recomendado fuera de un equipo personal):

   ```powershell
   copy C:\xampp\htdocs\skilly-api\config\config.example.php C:\xampp\htdocs\skilly-api\config\config.local.php
   notepad C:\xampp\htdocs\skilly-api\config\config.local.php
   ```

   Deja solo las claves que cambian (por ejemplo `'db_pass' => 'tu_clave'`). **No edites `config.php` ni subas `config.local.php` a GitHub**: está en `.gitignore`.
3. **CORS:** `cors_origenes` permite `http://localhost:5173` y `http://127.0.0.1:5173`. Agrega otros orígenes solo en `config.local.php`.
4. **Contraseña inicial:** la cuenta `fundadora@skilly.cl` se crea con la contraseña indicada en `SETUP_XAMPP.md`, que es pública. Mientras no la cambies, la API **bloquea** el resto de las operaciones (responde 403 `cambiar_contrasena`) y la interfaz te lleva a *Mi cuenta → Cambiar contraseña* (paso 10).

## 8. Instalación del frontend

En una terminal ubicada en la carpeta del proyecto (donde está `package.json`):

```powershell
npm ci
```

**Resultado esperado:** `added NNN packages` sin errores. `npm ci` instala exactamente las versiones de `package-lock.json`; si falla por falta de *lock*, usa `npm install`. 📸 C-04

## 9. Variables de entorno

| Variable | Dónde | Valor por defecto | Para qué |
|---|---|---|---|
| `VITE_USE_API` | `.env.local` en la raíz | (vacío = `true`) | `false` activa el **modo demostración** sin servidor (datos simulados en el navegador) |
| `VITE_API_URL` | `.env.local` o terminal antes de `npm run build` | `/api` | URL de la API en la versión compilada (`dist/`), donde no existe el proxy de Vite |
| `SKILLY_API_PROXY` | Terminal antes de `npm run dev` | `http://localhost/skilly-api` | Cambiar el destino del proxy `/api` (por ejemplo, Apache en el puerto 8080) |
| `SKILLY_DB_HOST`, `_PORT`, `_NAME`, `_USER`, `_PASS` | Entorno del servidor PHP | valores de XAMPP | Alternativa a `config.local.php` (CI y pruebas) |
| `SKILLY_API_URL` | Terminal antes de `npm run test:integracion` | `http://127.0.0.1:8080/api` | URL de la API para las pruebas de integración |

La plantilla con todas las variables del frontend está en `.env.example`: cópiala como `.env.local` y ajústala.

Ejemplo, con Apache en el puerto 8080:

```powershell
$env:SKILLY_API_PROXY = "http://localhost:8080/skilly-api"
npm run dev
```

## 10. Ejecución de la aplicación

```powershell
npm run dev
```

**Resultado esperado:** `VITE v6.x ready` y `Local: http://localhost:5173/`.

1. Abre <http://localhost:5173>. Debe verse el catálogo (vacío en una base nueva). 📸 C-05
2. Ingresa con la cuenta fundadora. La aplicación abre *Mi cuenta* y no deja ir a otra pantalla hasta que **cambies la contraseña**. Al cambiarla, el aviso rojo desaparece y el panel queda disponible. 📸 C-06
3. Para el flujo completo con datos, sigue el guion de `docs/09_defensa/GUION_VIDEO.md`: registra un profesional y una organización, valida al profesional y contrata un servicio.

Compilación de producción (opcional):

```powershell
$env:VITE_API_URL = "http://localhost/skilly-api/api"
npm run build
```

**Resultado esperado:** carpeta `dist\` y `✓ built`, sin advertencias (las pantallas de profesional y administración se cargan por separado; el fragmento más grande pesa ~237 kB). Para servirla con Apache, copia el contenido de `dist\` a una carpeta de `htdocs` (por ejemplo `C:\xampp\htdocs\skilly`) y agrega ese origen a `cors_origenes` en `config.local.php`. Como la aplicación usa rutas del navegador, recargar una ruta interna (`/admin`) en Apache requiere una regla que devuelva `index.html`; para la revisión basta con `npm run dev` o `npm run preview`.

## 11. Comprobación de la conexión API / base de datos

1. Abre <http://localhost/skilly-api/api/categorias/>. **Esperado:** JSON con 6 categorías y sus subcategorías. 📸 C-07
2. Abre <http://localhost:5173/api/categorias/> (a través del proxy de Vite). **Esperado:** el mismo JSON.
3. Abre <http://localhost/skilly-api/uploads/documentos/> o cualquier archivo dentro. **Esperado: 403 Forbidden** (carpeta privada). 📸 C-08 (caso CP-MAN-02)
4. En phpMyAdmin → `skilly_db` → SQL, después de registrar una organización en la interfaz:

   ```sql
   SELECT id, email, rol FROM cuentas ORDER BY id DESC;
   ```

   **Esperado:** la cuenta nueva con su `rol`. La columna `contrasena` empieza con `$2y$` (hash bcrypt).

## 12. Ejecución de pruebas

| Comando | Qué ejecuta | Resultado esperado |
|---|---|---|
| `npm run typecheck` | Verificación de tipos | Sin salida (0 errores) |
| `npm test` | 45 pruebas unitarias (Vitest, modo demostración) | `Tests 45 passed` |
| `npm run test:cobertura` | Unitarias + cobertura | Resumen (~52,5 % de líneas en `lib` y `services`) |
| `npm run test:integracion` | 94 pruebas contra la API y la base reales | `Tests 94 passed` |
| `npm run test:e2e` | 30 pasos en Chrome (Playwright, Python) | `Aprobados 30 · Fallidos 0` |
| `npm run test:rendimiento -- --consultas` | Latencia, consultas SQL y carga | Tabla por endpoint |
| `node tests/rendimiento/concurrencia_escritura.mjs 60` | 60 organizaciones piden el mismo horario a la vez | `CONCURRENCIA DE ESCRITURA: APROBADA` (1 reserva, 0 errores 500) |

**Integración en XAMPP** (📸 C-09):

1. Importa una base **recién creada**: las pruebas crean datos, entran con la contraseña inicial de la fundadora y la **cambian** a `FundadoraPruebas2026` (caso CP-SEG-23; se puede elegir otra con la variable `SKILLY_FUNDADORA_CLAVE_NUEVA`).
2. Ejecuta:

   ```powershell
   $env:SKILLY_API_URL = "http://localhost/skilly-api/api"
   npm run test:integracion
   ```

3. Después, vuelve a importar la base (`91_eliminar_tablas.sql` y luego `skilly.sql`) para partir limpio; si no, la fundadora queda con la contraseña de las pruebas.

> Las pruebas generan intentos fallidos de ingreso a propósito (CP-SEG-03). Si las repites varias veces en menos de 15 minutos desde la misma IP puede activarse el límite de 20 fallos por IP. Ejecuta `DELETE FROM intentos_login;` en phpMyAdmin o reimporta la base.

**E2E** (opcional): requiere Python 3 y `pip install playwright`. En Windows el comando suele ser `python` y no `python3`: ejecuta `python tests\e2e\flujo_e2e.py`. Con Chrome instalado, se indica su ruta en la variable `CHROME`, por ejemplo `$env:CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"`. Con `npm run dev` corriendo y una base recién importada, ejecuta `npm run test:e2e` (el paso E2E-21 también cambia la contraseña inicial).

**Rendimiento** (opcional): genera datos sintéticos **solo en una base de prueba**:

```powershell
node tests/rendimiento/semilla.mjs 30 > semilla.sql
```

Impórtalo y luego ejecuta `npm run test:rendimiento`.

## 13. Solución de errores frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| "No se pudo conectar con el servidor. Verifica que XAMPP esté corriendo" | Apache apagado o carpeta mal copiada | Inicia Apache; verifica que exista `C:\xampp\htdocs\skilly-api\api\categorias\index.php` |
| `/api/...` responde 404 de Apache | `mod_rewrite` desactivado o falta `.htaccess` | Paso 5.2; copia la carpeta completa con `robocopy … /E` (incluye archivos ocultos) |
| Todo responde 401 aunque ingresaste | Apache no pasa la cabecera `Authorization` | El `.htaccess` ya la reenvía; comprueba que esté en `skilly-api\` y que `AllowOverride All` esté activo |
| JSON `{"codigo":"red","mensaje":"No se pudo completar…"}` | Credenciales MySQL o base inexistente | Revisa `config.local.php`; importa `skilly.sql`; mira `C:\xampp\apache\logs\error.log` |
| "Hubo demasiados intentos fallidos" | Límite anti fuerza bruta | Espera 15 min o `DELETE FROM intentos_login;` |
| MySQL no inicia (puerto 3306 en uso) | Otro MySQL instalado | Detén el otro servicio o cambia el puerto en `my.ini` y en `config.local.php` (`db_port`) |
| No se puede subir un documento | Carpeta `uploads\documentos` sin permisos o archivo > 5 MB | Verifica que exista la carpeta; usa PDF, Word o JPG/PNG de hasta 5 MB |
| `npm ci` falla con `EBADENGINE` | Node antiguo | Instala Node 22 LTS |
| La página muestra datos que no están en la base | Estás en modo demostración | Borra `.env.local` o pon `VITE_USE_API=true` y reinicia `npm run dev` |
| Importar la migración falla en `ADD CONSTRAINT … CHECK` | Datos inválidos previos | Revisa las consultas de diagnóstico del paso 0 de la migración |
| Tildes dañadas ("DesempeÃ±o") en categorías | Importación con una tubería de PowerShell o sin `utf8mb4` | Reimporta con phpMyAdmin o con `cmd /c "… --default-character-set=utf8mb4 < database\skilly.sql"` (paso 6) |
| Todo responde "Debes cambiar la contraseña inicial" (403) | La fundadora conserva la contraseña publicada | Cámbiala en *Mi cuenta* (paso 10.2) |
| La versión compilada muestra "No se pudo conectar" | `dist/` compilado sin `VITE_API_URL` y servido fuera del proxy | Compila con `VITE_API_URL` apuntando a la API (paso 10) |

## 14. Configuración de Git

```powershell
git --version
git config --global user.name "Nombre Apellido"
git config --global user.email "correo@inacapmail.cl"
git config --global init.defaultBranch main
git config --global core.autocrlf true
```

`core.autocrlf true` evita diferencias de fin de línea entre Windows y otros sistemas.

## 15. Creación y vinculación del repositorio en GitHub

Ver **`GUIA_GIT_GITHUB.md`**:

- crear el repositorio (vacío, sin README);
- `git init` / `git remote add origin …` / primer `push`;
- invitar a los integrantes;
- proteger la rama `main`.

> La URL del repositorio del equipo se registra en el anexo B del informe y en `docs/08_equipo/COLABORACION.md`.

## 16. Uso colaborativo: ramas, commits, pull requests y merges

Flujo recomendado (detallado en `GUIA_GIT_GITHUB.md`):

1. `git switch -c feature/<tema>`
2. Commits pequeños con mensaje descriptivo.
3. `git push -u origin feature/<tema>`
4. *Pull request* hacia `main` con al menos una revisión.
5. CI/pruebas verdes.
6. *Merge*.
7. Borrar la rama.

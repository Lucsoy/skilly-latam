# Skilly: conexión real a MySQL con XAMPP

> Guía breve. La guía completa desde cero, con Node, Git, variables de entorno, pruebas y solución de problemas, está en `docs/03_entorno/GUIA_INSTALACION.md`.

Esta versión usa **React + Vite** para la interfaz y **PHP + PDO + MySQL** para persistir la información. Las operaciones habituales no deben depender de los datos de demostración (`mocks`) cuando `VITE_USE_API` no está definido o vale `true`.

## 1. Requisitos

- XAMPP con **Apache** y **MySQL**.
- PHP con las extensiones `pdo` y `pdo_mysql` habilitadas (normalmente vienen con XAMPP).
- Node.js y npm.

## 2. Importar el esquema

1. En XAMPP, inicia **Apache** y **MySQL**.
2. Abre `http://localhost/phpmyadmin`.
3. Entra a **Importar** y selecciona `database/skilly.sql` de este proyecto.
4. Ejecuta la importación. El script crea/usa la base `skilly_db`, sus 30 tablas, las categorías/subcategorías y una cuenta inicial de fundador.

   Si prefieres la consola de Windows, usa `cmd /c "C:\xampp\mysql\bin\mysql.exe -u root --default-character-set=utf8mb4 < database\skilly.sql"`. No uses `Get-Content … | mysql` en PowerShell: daña las tildes.

> **¿Ya tenías la base creada con una versión anterior?** Respáldala (Exportar) y ejecuta, una sola vez cada una y en este orden, `database/migracion_cierre_2026_11.sql` (solo si es anterior a noviembre de 2026), `database/migracion_entrega3_2026_11.sql` y `database/migracion_correcciones_2026_11.sql`. Ver `database/README.md`. Si importas `skilly.sql` desde cero, no hace falta.

Si ya tienes datos en `skilly_db`, el script utiliza `CREATE TABLE IF NOT EXISTS` y no elimina las cuentas, organizaciones, profesionales, servicios ni reservas existentes. Las categorías se actualizan por ID y los tramos de cancelación por defecto solo se agregan cuando no existen esos umbrales.

## 3. Copiar el backend a Apache

Copia **la carpeta completa `backend/`** a:

```text
C:\xampp\htdocs\skilly-api\
```

La ruta debe quedar así (no copies solo los archivos PHP; también son necesarios `.htaccess` y `config/`):

```text
C:\xampp\htdocs\skilly-api\
  .htaccess
  config\
    config.php
    config.example.php
    database.php
    cors.php
    helpers.php
  uploads\
    .htaccess          (bloquea el acceso directo a los archivos)
    documentos\        (aquí se guardan los documentos subidos)
  api\
    auth\login.php
    auth\sesion.php
    auth\logout.php
    auth\contrasena.php
    categorias\index.php
    organizaciones\index.php
    profesionales\index.php
    servicios\index.php
    disponibilidad\index.php
    reservas\index.php
    evaluaciones\index.php
    favoritos\index.php
    chat\index.php
    configuracion\index.php
    admin\index.php
```

La conexión viene configurada para XAMPP por defecto: servidor `localhost`, puerto `3306`, base `skilly_db`, usuario `root` y contraseña vacía. Si tu MySQL utiliza otros datos **no edites el código**: copia `config/config.example.php` como `config/config.local.php` (en la copia de `htdocs`) y cambia ahí solo lo necesario. Ese archivo está en `.gitignore`, así que tus credenciales no se suben al repositorio. En el mismo archivo puedes cambiar el origen permitido por CORS (`cors_origenes`) y la carpeta donde se guardan los documentos (`directorio_subidas`).

La carpeta `uploads/documentos` debe poder escribirse por Apache (en XAMPP para Windows funciona sin cambios).

Apache necesita `mod_rewrite` habilitado para las rutas limpias del `.htaccess`. En una instalación estándar de XAMPP suele estar habilitado.

## 4. Verificar PHP y MySQL

Abre esta URL en el navegador:

```text
http://localhost/skilly-api/api/categorias/
```

Debe aparecer un arreglo JSON con categorías y subcategorías. Si recibes un error, revisa que Apache y MySQL estén iniciados, que la base `skilly_db` exista y que las credenciales (en `config/config.local.php` si lo creaste) sean correctas.

No abras los archivos PHP haciendo doble clic ni desde el servidor de desarrollo de Vite: los ejecuta Apache desde `htdocs`.

## 5. Instalar y levantar el frontend

Abre una terminal en la carpeta raíz del proyecto (donde está `package.json`) y ejecuta:

```bash
npm install
npm run dev
```

Ingresa a la dirección que muestre Vite, normalmente `http://localhost:5173`. El proxy configurado en `vite.config.ts` redirige `/api/...` a `http://localhost/skilly-api/api/...`.

La API está activada por defecto. Para volver voluntariamente a los datos simulados de demo, crea un archivo `.env.local` en la raíz con:

```dotenv
VITE_USE_API=false
```

Elimina esa variable o usa `VITE_USE_API=true` para conectar con MySQL. Reinicia `npm run dev` después de cambiarla.

## 6. Iniciar sesión y probar

La base de datos incluye una cuenta inicial (su contraseña se guarda solo como hash bcrypt):

- **Correo:** `fundadora@skilly.cl`
- **Contraseña inicial:** `Skilly#Fundadora2026`
- **Rol:** fundador de Skilly

**Debes cambiarla al primer ingreso.** Como esta contraseña es pública, mientras no la cambies la API solo permite ver la sesión y cambiar la contraseña: cualquier otra operación responde 403 (`cambiar_contrasena`) y la aplicación te lleva directamente a *Mi cuenta → Cambiar contraseña*.

Si tu base fue creada con una versión anterior, tu cuenta inicial sigue siendo `admin@skilly.cl` / `admin123`; al entrar por primera vez el backend convierte esa contraseña en un hash seguro, pero igual conviene cambiarla.

Por seguridad, después de 5 intentos fallidos con el mismo correo (o 20 desde la misma IP) el inicio de sesión se bloquea por 15 minutos.

Para probar el resto del flujo, registra una organización y un profesional desde la interfaz. El proyecto **no** agrega organizaciones, profesionales ni servicios de demostración por defecto. El profesional debe completar su perfil y configurar su disponibilidad; después podrá crear un servicio y publicarlo. La organización podrá buscarlo, guardarlo en favoritos y comenzar una contratación.

## 7. Qué persiste en MySQL

- Registro, inicio/cierre de sesión y edición de la organización.
- Registro, perfil, formación, experiencia, habilidades y referencias de documentos del profesional.
- Servicios, categorías, subcategorías, modalidades, entregables y etiquetas.
- Horarios semanales, bloqueos, disponibilidad y retenciones temporales.
- Reservas/contrataciones, cambios de estado e historial de auditoría.
- Favoritos, mensajes de chat y evaluaciones; moderación de comentarios.
- Configuración de comisiones, reputación y política de cancelación.
- Administración de cuentas y herramientas de administración.

**Documentos:** el profesional sube el archivo real (PDF, Word o JPG/PNG, máximo 5 MB). Se guarda en `uploads/documentos` con un nombre interno, y en MySQL quedan sus datos y su estado de revisión. Solo el propio profesional y el equipo de Skilly pueden descargarlo, a través de la API; Apache bloquea el acceso directo a la carpeta.

**Nota sobre pagos:** el flujo actual registra una confirmación de pago simulada; no conecta con una pasarela de pago real.

## 8. Problemas frecuentes

- **No se puede conectar:** revisa el panel de XAMPP, el puerto MySQL (normalmente `3306`) y `config/config.local.php` si lo creaste.
- **"Hubo demasiados intentos fallidos":** espera 15 minutos, o borra los registros con `DELETE FROM intentos_login;` en phpMyAdmin.
- **No se puede subir un documento:** revisa que exista `uploads/documentos` dentro de `htdocs/skilly-api` y que `upload_max_filesize` en `php.ini` sea de al menos 5M (XAMPP trae 40M).
- **La interfaz dice que no se pudo conectar:** comprueba que la carpeta esté exactamente en `C:\xampp\htdocs\skilly-api\` y visita la URL de categorías indicada antes.
- **No hay servicios en el catálogo:** es normal en una base nueva. Registra un profesional, completa su perfil, sube un documento y envíalo a revisión; con la cuenta fundadora apruébalo y valida el perfil en *Profesionales → Ver ficha completa*. Recién entonces el profesional puede publicar servicios.
- **El navegador conserva una sesión antigua:** cierra sesión y vuelve a entrar. Si cambiaste de base de datos, también puedes borrar los datos del sitio para que se elimine el token antiguo.

## 9. Comprobar que el CRUD sí llega a la base de datos

En phpMyAdmin selecciona `skilly_db`, abre la pestaña **SQL** y ejecuta las consultas siguientes después de realizar cada acción en la interfaz:

```sql
SELECT id, email, rol, nombre FROM cuentas ORDER BY id DESC;
SELECT id, razon_social, rut, email_contacto FROM organizaciones ORDER BY creada_en DESC;
SELECT id, nombre, apellido, titulo, ciudad FROM profesionales ORDER BY fecha_ingreso DESC;
SELECT id, profesional_id, titulo, precio, publicado FROM servicios ORDER BY id DESC;
SELECT id, codigo, estado, estado_pago, inicio FROM reservas ORDER BY creada_en DESC;
SELECT usuario_id, servicio_id FROM favoritos ORDER BY id DESC;
SELECT reserva_id, autor_rol, texto, enviado_en FROM mensajes_chat ORDER BY enviado_en DESC;
SELECT id, reserva_id, autor, calidad, plazos, comunicacion, publicada FROM evaluaciones ORDER BY fecha DESC;
```

Prueba primero registrar una organización y un profesional; cada registro debe crear tanto la fila de perfil como la fila de `cuentas`. Luego completa el perfil profesional, guarda sus horarios, crea y publica un servicio, e inicia una contratación con la organización. Editar un servicio o perfil debe reflejarse con `SELECT`; eliminar un servicio con contrataciones se rechaza para evitar perder historial. Las contrataciones no se eliminan nunca: se cancelan o rechazan, y la base lo impide también con `ON DELETE RESTRICT`. Los cambios de estado de las reservas deben quedar registrados también en `historial_reservas`.

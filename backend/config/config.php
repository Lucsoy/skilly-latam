<?php
/**
 * Configuración del backend.
 *
 * Los valores por defecto sirven para una instalación estándar de XAMPP.
 * Para cambiarlos SIN tocar el código, copia `config.example.php` como
 * `config.local.php` (en esta misma carpeta) y edita solo lo que necesites.
 * `config.local.php` está en .gitignore, así que tus credenciales no se suben.
 */
function skillyConfig(): array {
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $config = [
        'db_host' => 'localhost',
        'db_port' => '3306',
        'db_name' => 'skilly_db',
        'db_user' => 'root',
        'db_pass' => '',
        // Orígenes del frontend que pueden llamar a la API (CORS).
        'cors_origenes' => ['http://localhost:5173', 'http://127.0.0.1:5173'],
        // Carpeta donde se guardan los documentos de respaldo de los profesionales.
        'directorio_subidas' => __DIR__ . '/../uploads/documentos',
        // Tamaño máximo de un documento, en bytes (5 MB).
        'tamano_maximo_documento' => 5 * 1024 * 1024,
        // Límite de intentos fallidos de inicio de sesión.
        'login_max_intentos_correo' => 5,
        'login_max_intentos_ip' => 20,
        'login_ventana_minutos' => 15,
        // Zona horaria del negocio. PHP y MySQL usan la misma para que NOW(), date()
        // y strtotime() hablen del mismo reloj (antes PHP usaba la de php.ini).
        'zona_horaria' => 'America/Santiago',
    ];

    // Variables de entorno opcionales (útiles para pruebas automatizadas o CI):
    // SKILLY_DB_HOST, SKILLY_DB_PORT, SKILLY_DB_NAME, SKILLY_DB_USER, SKILLY_DB_PASS.
    foreach (['db_host', 'db_port', 'db_name', 'db_user', 'db_pass'] as $clave) {
        $valor = getenv('SKILLY_' . strtoupper($clave));
        if ($valor !== false) {
            $config[$clave] = $valor;
        }
    }

    // config.local.php tiene la última palabra (no se sube al repositorio).
    $local = __DIR__ . '/config.local.php';
    if (is_file($local)) {
        $propios = require $local;
        if (is_array($propios)) {
            $config = array_merge($config, $propios);
        }
    }

    return $config;
}

// Un solo reloj para toda la API: lo que PHP calcula con date()/strtotime() coincide
// con las fechas que guarda MySQL (database.php fija el mismo desfase en la sesión SQL).
date_default_timezone_set(skillyConfig()['zona_horaria'] ?? 'America/Santiago');

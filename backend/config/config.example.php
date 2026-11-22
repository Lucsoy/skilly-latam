<?php
/**
 * Ejemplo de configuración local.
 *
 * 1. Copia este archivo como `config.local.php` en esta misma carpeta.
 * 2. Deja solo las claves que quieras cambiar.
 *
 * `config.local.php` no se sube al repositorio (está en .gitignore).
 */
return [
    'db_host' => 'localhost',
    'db_port' => '3306',
    'db_name' => 'skilly_db',
    'db_user' => 'root',
    'db_pass' => '',
    'cors_origenes' => ['http://localhost:5173'],
    // 'zona_horaria' => 'America/Santiago',
    // 'directorio_subidas' => 'C:/xampp/skilly-uploads/documentos',
];

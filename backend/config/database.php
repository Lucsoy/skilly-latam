<?php
/**
 * Conexión a la base de datos MySQL/MariaDB.
 *
 * Las credenciales salen de config.php (y de config.local.php si existe),
 * así que no hace falta editar este archivo.
 *
 * Uso:
 *   require_once __DIR__ . '/../config/database.php';
 *   $db = conectarDB();
 */
require_once __DIR__ . '/config.php';

function conectarDB(): PDO {
    $cfg = skillyConfig();
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $cfg['db_host'],
        $cfg['db_port'],
        $cfg['db_name'],
    );

    $opciones = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    $db = new PDO($dsn, $cfg['db_user'], $cfg['db_pass'], $opciones);
    // NOW() de MySQL con el mismo desfase que la zona de PHP (p. ej. -03:00). Se usa el
    // desfase y no el nombre de la zona porque XAMPP no trae cargadas las tablas de zonas.
    $db->exec("SET time_zone = '" . (new DateTimeImmutable())->format('P') . "'");
    // READ COMMITTED: las decisiones se serializan con bloqueos de FILA (SELECT … FOR UPDATE
    // sobre la reserva, los bloques o el contador). Con REPEATABLE READ, InnoDB además bloquea
    // "huecos" del índice y dos retenciones simultáneas de horarios contiguos terminaban en
    // deadlock (error 1213, detectado por CP-REG-08).
    $db->exec('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED');
    return $db;
}

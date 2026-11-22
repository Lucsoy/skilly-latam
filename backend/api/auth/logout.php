<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/helpers.php';
try {
    $db = conectarDB();
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        responderError('validacion', 'Método no permitido.', 405);
    }
    revocarTokenActual($db);
    responderJSON(['ok' => true]);
} catch (PDOException $e) {
    error_log('Error logout Skilly: ' . $e->getMessage());
    responderError('red', 'No se pudo cerrar sesión.', 500);
}

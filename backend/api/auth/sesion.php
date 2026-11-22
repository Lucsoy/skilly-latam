<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/helpers.php';
try {
    $db = conectarDB();
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        responderError('validacion', 'Método no permitido.', 405);
    }
    $cuenta = usuarioAutenticado($db, [], true);
    responderJSON(cuentaDesdeSesion($db, $cuenta));
} catch (PDOException $e) {
    error_log('Error sesión Skilly: ' . $e->getMessage());
    responderError('red', 'No se pudo validar la sesión.', 500);
}

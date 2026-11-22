<?php
/**
 * Cambio de contraseña de la cuenta en sesión (cualquier rol).
 * POST /api/auth/contrasena  { actual, nueva } → { ok: true }
 * Al cambiarla se cierran las demás sesiones abiertas de la cuenta.
 */
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/helpers.php';

try {
    $db = conectarDB();
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        responderError('validacion', 'Método no permitido.', 405);
    }
    $cuenta = usuarioAutenticado($db, [], true);
    $data = leerJSON();
    $actual = (string) ($data['actual'] ?? '');
    $nueva = (string) ($data['nueva'] ?? '');

    $guardada = (string) $cuenta['contrasena'];
    $esHash = str_starts_with($guardada, '$2y$') || str_starts_with($guardada, '$argon2');
    $valida = $esHash ? password_verify($actual, $guardada) : hash_equals($guardada, $actual);
    if (!$valida) {
        responderError('credenciales_invalidas', 'La contraseña actual no es correcta.', 401);
    }
    if ($error = errorContrasena($nueva)) {
        responderError('validacion', $error);
    }
    if ($actual === $nueva) {
        responderError('validacion', 'La nueva contraseña debe ser distinta de la actual.');
    }

    $q = $db->prepare('UPDATE cuentas SET contrasena = :pass WHERE id = :id');
    $q->execute(['pass' => password_hash($nueva, PASSWORD_DEFAULT), 'id' => $cuenta['id']]);

    $tokenActual = hash('sha256', obtenerToken() ?? '');
    $q = $db->prepare('DELETE FROM sesiones_autenticacion WHERE cuenta_id = :id AND token_hash <> :actual');
    $q->execute(['id' => $cuenta['id'], 'actual' => $tokenActual]);

    responderJSON(['ok' => true]);
} catch (PDOException $e) {
    error_log('Error cambio de contraseña Skilly: ' . $e->getMessage());
    responderError('red', 'No se pudo cambiar la contraseña.', 500);
}

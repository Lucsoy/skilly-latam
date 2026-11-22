<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderError('validacion', 'Método no permitido.', 405);
}
$data = leerJSON();
$faltante = camposFaltantes($data, ['email', 'contrasena']);
if ($faltante) {
    responderError('validacion', "Falta el campo: $faltante");
}
$email = strtolower(trim((string) $data['email']));
$ip = ipCliente();
$cfg = skillyConfig();
$ventana = (int) $cfg['login_ventana_minutos'];

try {
    $db = conectarDB();

    // Límite de intentos: por correo y por IP dentro de la ventana configurada.
    $q = $db->prepare("SELECT
            SUM(email = :email) AS por_correo,
            SUM(ip = :ip)       AS por_ip
        FROM intentos_login
        WHERE fecha > DATE_SUB(NOW(), INTERVAL $ventana MINUTE)");
    $q->execute(['email' => $email, 'ip' => $ip]);
    $intentos = $q->fetch() ?: ['por_correo' => 0, 'por_ip' => 0];
    if (
        (int) $intentos['por_correo'] >= (int) $cfg['login_max_intentos_correo'] ||
        (int) $intentos['por_ip'] >= (int) $cfg['login_max_intentos_ip']
    ) {
        responderError(
            'demasiados_intentos',
            "Hubo demasiados intentos fallidos. Espera $ventana minutos antes de volver a intentarlo.",
            429,
        );
    }

    $registrarFallo = function () use ($db, $email, $ip): void {
        $q = $db->prepare('INSERT INTO intentos_login (email, ip) VALUES (:email, :ip)');
        $q->execute(['email' => $email, 'ip' => $ip]);
        responderError('credenciales_invalidas', 'El correo o la contraseña no coinciden.', 401);
    };

    $stmt = $db->prepare('SELECT * FROM cuentas WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => $email]);
    $cuenta = $stmt->fetch();
    if (!$cuenta) {
        // Mismo costo que una contraseña incorrecta: el tiempo de respuesta no revela si el correo existe.
        password_verify((string) $data['contrasena'], SKILLY_HASH_CONTRASENA_INICIAL);
        $registrarFallo();
    }

    $guardada = (string) $cuenta['contrasena'];
    $esHash = str_starts_with($guardada, '$2y$') || str_starts_with($guardada, '$argon2');
    $valida = $esHash
        ? password_verify((string) $data['contrasena'], $guardada)
        : hash_equals($guardada, (string) $data['contrasena']);
    if (!$valida) {
        $registrarFallo();
    }

    // Compatibilidad con cuentas creadas por un SQL antiguo con contraseña en texto plano:
    // al entrar por primera vez se reemplaza por un hash seguro.
    if (!$esHash) {
        $upd = $db->prepare('UPDATE cuentas SET contrasena = :pass WHERE id = :id');
        $upd->execute(['pass' => password_hash((string) $data['contrasena'], PASSWORD_DEFAULT), 'id' => $cuenta['id']]);
    }

    // Login correcto: se limpian los intentos de ese correo y los registros viejos.
    $db->prepare('DELETE FROM intentos_login WHERE email = :email')->execute(['email' => $email]);
    $db->exec('DELETE FROM intentos_login WHERE fecha < DATE_SUB(NOW(), INTERVAL 1 DAY)');

    $token = emitirTokenSesion($db, $cuenta['id']);
    responderJSON(construirSesion($db, $cuenta, $token));
} catch (PDOException $e) {
    error_log('Error login Skilly: ' . $e->getMessage());
    responderError('red', 'No se pudo iniciar sesión. Comprueba que la base de datos esté disponible.', 500);
}

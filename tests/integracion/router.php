<?php
/**
 * Router para el servidor embebido de PHP (`php -S`), usado SOLO para pruebas
 * automatizadas fuera de XAMPP. Replica las reglas de `backend/.htaccess`:
 *   /api/auth/login        → api/auth/login.php
 *   /api/servicios/{id}    → api/servicios/index.php?id={id}
 *   /uploads/...           → 403 (equivale a "Require all denied")
 * No se copia a htdocs: en Apache las rutas las resuelve el .htaccess real.
 */
$backend = getenv('SKILLY_BACKEND') ?: realpath(__DIR__ . '/../../backend');
$ruta = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
// Permite montar la API con prefijo (/skilly-api/api/...) igual que en XAMPP.
$ruta = preg_replace('#^/skilly-api#', '', $ruta);

if (preg_match('#^/uploads(/|$)#', $ruta)) {
    http_response_code(403);
    echo 'Forbidden';
    return true;
}
if (preg_match('#^/api/auth/(login|sesion|logout|contrasena)/?$#', $ruta, $m)) {
    require $backend . "/api/auth/{$m[1]}.php";
    return true;
}
if (preg_match('#^/api/(servicios|profesionales|reservas)/([^/]+)/?$#', $ruta, $m)) {
    $_GET['id'] = urldecode($m[2]);
    require $backend . "/api/{$m[1]}/index.php";
    return true;
}
if (preg_match('#^/api/(categorias|servicios|profesionales|organizaciones|reservas|evaluaciones|favoritos|configuracion|disponibilidad|chat|admin)/?$#', $ruta, $m)) {
    require $backend . "/api/{$m[1]}/index.php";
    return true;
}
http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['codigo' => 'no_encontrado', 'mensaje' => 'Ruta no encontrada.']);
return true;

<?php
/**
 * Cabeceras comunes de la API: CORS y endurecimiento HTTP.
 *
 * - CORS: solo se permiten los orígenes configurados en `cors_origenes`
 *   (config.php / config.local.php). Un origen no listado no recibe
 *   Access-Control-Allow-Origin y el navegador bloquea la respuesta.
 * - Endurecimiento: las respuestas JSON no se pueden interpretar como otro
 *   tipo (nosniff), no se pueden incrustar en marcos (clickjacking) y no se
 *   guardan en cachés intermedias (contienen datos personales).
 *
 * Incluir al inicio de cada endpoint.
 */
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');

$origen = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origen !== '' && in_array($origen, skillyConfig()['cors_origenes'], true)) {
    header('Access-Control-Allow-Origin: ' . $origen);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Responder inmediatamente a las peticiones preflight (OPTIONS).
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/helpers.php';
try {
    $db = conectarDB();
    $method = $_SERVER['REQUEST_METHOD'];
    $cuenta = usuarioAutenticado($db, ['organizacion']);
    $orgId = $cuenta['organizacion_id'];
    if ($method === 'GET') {
        $q = $db->prepare('SELECT servicio_id FROM favoritos WHERE usuario_id=:uid ORDER BY id DESC');
        $q->execute(['uid' => $orgId]);
        responderJSON($q->fetchAll(PDO::FETCH_COLUMN));
    }
    if ($method === 'POST') {
        $d = leerJSON();
        $servicioId = (string) ($d['servicioId'] ?? '');
        if ($servicioId === '') {
            responderError('validacion', 'Falta servicioId.');
        }
        $q = $db->prepare('SELECT id FROM servicios WHERE id=:id AND publicado=1');
        $q->execute(['id' => $servicioId]);
        if (!$q->fetch()) {
            responderError('no_encontrado', 'El servicio no existe o no está publicado.', 404);
        }
        $q = $db->prepare('INSERT IGNORE INTO favoritos (usuario_id,servicio_id) VALUES (:uid,:sid)');
        $q->execute(['uid' => $orgId, 'sid' => $servicioId]);
        $q = $db->prepare('SELECT servicio_id FROM favoritos WHERE usuario_id=:uid ORDER BY id DESC');
        $q->execute(['uid' => $orgId]);
        responderJSON(['ok' => true, 'favoritos' => $q->fetchAll(PDO::FETCH_COLUMN)], 201);
    }
    if ($method === 'DELETE') {
        $sid = (string) ($_GET['servicio_id'] ?? '');
        if ($sid === '') {
            responderError('validacion', 'Falta servicio_id.');
        }
        $q = $db->prepare('DELETE FROM favoritos WHERE usuario_id=:uid AND servicio_id=:sid');
        $q->execute(['uid' => $orgId, 'sid' => $sid]);
        $q = $db->prepare('SELECT servicio_id FROM favoritos WHERE usuario_id=:uid ORDER BY id DESC');
        $q->execute(['uid' => $orgId]);
        responderJSON(['ok' => true, 'favoritos' => $q->fetchAll(PDO::FETCH_COLUMN)]);
    }
    responderError('validacion', 'Método no permitido.', 405);
} catch (PDOException $e) {
    error_log('API favoritos: ' . $e->getMessage());
    responderError('red', 'No se pudieron actualizar los favoritos.', 500);
}

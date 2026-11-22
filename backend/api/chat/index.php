<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/helpers.php';

const SKILLY_ESTADOS_CHAT = ['CONFIRMADA', 'REAGENDADA', 'EN_CURSO', 'ENTREGADA'];

/** Verifica que la cuenta sea parte de la contratación (anti-IDOR) y que el chat esté habilitado. */
function skillyChatAutorizado(PDO $db, array $cuenta, string $reservaId): array {
    $q = $db->prepare(
        'SELECT r.*, o.razon_social, CONCAT(p.nombre,\' \',p.apellido) AS profesional_nombre FROM reservas r JOIN organizaciones o ON o.id=r.organizacion_id JOIN profesionales p ON p.id=r.profesional_id WHERE r.id=:id',
    );
    $q->execute(['id' => $reservaId]);
    $r = $q->fetch();
    if (!$r) {
        responderError('no_encontrado', 'No encontramos esta contratación.', 404);
    }
    $ok =
        ($cuenta['rol'] === 'organizacion' && $r['organizacion_id'] === $cuenta['organizacion_id']) ||
        ($cuenta['rol'] === 'profesional' && $r['profesional_id'] === $cuenta['profesional_id']);
    if (!$ok) {
        responderError('no_autorizado', 'No puedes acceder al chat de esta contratación.', 403);
    }
    // El chat acompaña la contratación desde que se confirma hasta la entrega (INC-13).
    if (!in_array($r['estado'], SKILLY_ESTADOS_CHAT, true)) {
        responderError('conflicto', 'El chat está disponible desde que la contratación se confirma hasta su entrega.', 409);
    }
    return $r;
}
try {
    $db = conectarDB();
    $method = $_SERVER['REQUEST_METHOD'];
    $cuenta = usuarioAutenticado($db, ['organizacion', 'profesional']);
    if ($method === 'GET') {
        $rid = (string) ($_GET['reserva_id'] ?? '');
        if (!$rid) {
            responderError('validacion', 'Falta reserva_id.');
        }
        skillyChatAutorizado($db, $cuenta, $rid);
        $q = $db->prepare(
            'SELECT id,reserva_id,autor_rol,autor_nombre,texto,enviado_en FROM mensajes_chat WHERE reserva_id=:id ORDER BY enviado_en,id',
        );
        $q->execute(['id' => $rid]);
        $items = [];
        foreach ($q->fetchAll() as $m) {
            $items[] = [
                'id' => $m['id'],
                'reservaId' => $m['reserva_id'],
                'autorRol' => $m['autor_rol'],
                'autorNombre' => $m['autor_nombre'],
                'texto' => $m['texto'],
                'enviadoEn' => $m['enviado_en'],
            ];
        }
        responderJSON($items);
    }
    if ($method === 'POST') {
        $d = leerJSON();
        $rid = (string) ($d['reservaId'] ?? '');
        $texto = trim((string) ($d['texto'] ?? ''));
        if (!$rid || $texto === '') {
            responderError('validacion', 'Indica la contratación y escribe un mensaje.');
        }
        if (mb_strlen($texto) > 5000) {
            responderError('validacion', 'El mensaje no puede superar 5000 caracteres.');
        }
        skillyChatAutorizado($db, $cuenta, $rid);
        $id = generarId('chat');
        $q = $db->prepare(
            'INSERT INTO mensajes_chat (id,reserva_id,cuenta_id,autor_rol,autor_nombre,texto,enviado_en) VALUES (:id,:res,:cuenta,:rol,:nombre,:texto,NOW())',
        );
        $q->execute([
            'id' => $id,
            'res' => $rid,
            'cuenta' => $cuenta['id'],
            'rol' => $cuenta['rol'],
            'nombre' => $cuenta['nombre'],
            'texto' => $texto,
        ]);
        responderJSON(
            [
                'id' => $id,
                'reservaId' => $rid,
                'autorRol' => $cuenta['rol'],
                'autorNombre' => $cuenta['nombre'],
                'texto' => $texto,
                'enviadoEn' => date('Y-m-d H:i:s'),
            ],
            201,
        );
    }
    responderError('validacion', 'Método no permitido.', 405);
} catch (PDOException $e) {
    error_log('API chat: ' . $e->getMessage());
    responderError('red', 'No se pudo guardar el mensaje.', 500);
}

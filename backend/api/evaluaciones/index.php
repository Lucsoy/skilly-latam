<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/helpers.php';

function skillyEvaluacionArray(array $e): array {
    return [
        'id' => $e['id'],
        'reservaId' => $e['reserva_id'],
        'profesionalId' => $e['profesional_id'],
        'organizacionId' => $e['organizacion_id'],
        'autor' => $e['autor'],
        'calidad' => (int) $e['calidad'],
        'plazos' => (int) $e['plazos'],
        'comunicacion' => (int) $e['comunicacion'],
        'comentario' => $e['comentario'],
        'fecha' => $e['fecha'],
        'publicada' => (bool) $e['publicada'],
        'estadoComentario' => $e['estado_comentario'],
    ];
}
try {
    $db = conectarDB();
    $metodo = $_SERVER['REQUEST_METHOD'];
    $accion = $_GET['accion'] ?? '';
    if ($metodo === 'GET' && $accion === 'reputacion') {
        $profId = (string) ($_GET['profesional_id'] ?? '');
        if (!$profId) {
            responderError('validacion', 'Falta profesional_id.');
        }
        // Misma regla que usa el catálogo (calcularReputacion en helpers.php).
        responderJSON(reputacionesLote($db, [$profId])[$profId]);
    }
    if ($metodo === 'GET' && $accion === 'estado') {
        $cuenta = usuarioAutenticado($db, ['organizacion', 'profesional']);
        $reservaId = (string) ($_GET['reserva_id'] ?? '');
        if (!$reservaId) {
            responderError('validacion', 'Falta reserva_id.');
        }
        $q = $db->prepare('SELECT * FROM reservas WHERE id=:id');
        $q->execute(['id' => $reservaId]);
        $r = $q->fetch();
        if (!$r) {
            responderError('no_encontrado', 'No encontramos la reserva.', 404);
        }
        if (
            ($cuenta['rol'] === 'organizacion' && $r['organizacion_id'] !== $cuenta['organizacion_id']) ||
            ($cuenta['rol'] === 'profesional' && $r['profesional_id'] !== $cuenta['profesional_id'])
        ) {
            responderError('no_autorizado', 'No puedes ver las evaluaciones de esta reserva.', 403);
        }
        publicarEvaluacionesVencidas($db);
        $q = $db->prepare('SELECT * FROM evaluaciones WHERE reserva_id=:id ORDER BY fecha');
        $q->execute(['id' => $reservaId]);
        $all = $q->fetchAll();
        $propia = null;
        $otra = null;
        $autor = $cuenta['rol'];
        foreach ($all as $e) {
            if ($e['autor'] === $autor) {
                $propia = skillyEvaluacionArray($e);
            } else {
                $otra = skillyEvaluacionArray($e);
            }
        }
        $cfg = $db->query('SELECT reputacion_dias_publicacion FROM configuracion_plataforma WHERE id=1')->fetch();
        $dias = (int) ($cfg['reputacion_dias_publicacion'] ?? 7);
        $ambas = $propia !== null && $otra !== null;
        $auto =
            $propia && !$propia['publicada']
                ? date(DATE_ATOM, strtotime($propia['fecha'] . ' +' . $dias . ' days'))
                : null;
        // La evaluación de la otra parte solo se entrega cuando ya es pública (evaluación ciega).
        $contraparte = $otra && $otra['publicada'] ? $otra : null;
        if ($contraparte && $contraparte['estadoComentario'] !== 'aprobado') {
            $contraparte['comentario'] = null;
        }
        responderJSON([
            'propia' => $propia,
            'delProfesional' => $autor === 'organizacion' ? $contraparte : null,
            'contraparte' => $contraparte,
            'ambasEnviadas' => $ambas,
            'publicacionAutomaticaEn' => $auto,
        ]);
    }
    if ($metodo === 'GET' && $accion === 'moderacion') {
        usuarioAutenticado($db, ['administrador', 'fundador']);
        $q = $db->query(
            "SELECT e.*, o.razon_social, CONCAT(p.nombre,' ',p.apellido) AS nombre_profesional FROM evaluaciones e JOIN organizaciones o ON o.id=e.organizacion_id JOIN profesionales p ON p.id=e.profesional_id WHERE e.estado_comentario='en_revision' ORDER BY e.fecha ASC",
        );
        $items = [];
        foreach ($q->fetchAll() as $e) {
            $items[] = [
                'evaluacion' => skillyEvaluacionArray($e),
                'organizacion' => $e['razon_social'],
                'profesional' => $e['nombre_profesional'],
            ];
        }
        responderJSON($items);
    }
    if ($metodo === 'GET') {
        $profId = $_GET['profesional_id'] ?? null;
        $reservaId = $_GET['reserva_id'] ?? null;
        if ($reservaId) {
            $cuenta = usuarioAutenticado($db, ['organizacion', 'profesional', 'administrador', 'fundador']);
            $q = $db->prepare('SELECT * FROM reservas WHERE id=:id');
            $q->execute(['id' => $reservaId]);
            $r = $q->fetch();
            if (!$r) {
                responderError('no_encontrado', 'No encontramos la reserva.', 404);
            }
            if (
                !in_array($cuenta['rol'], ['administrador', 'fundador'], true) &&
                (($cuenta['rol'] === 'organizacion' && $r['organizacion_id'] !== $cuenta['organizacion_id']) ||
                    ($cuenta['rol'] === 'profesional' && $r['profesional_id'] !== $cuenta['profesional_id']))
            ) {
                responderError('no_autorizado', 'No puedes ver estas evaluaciones.', 403);
            }
            publicarEvaluacionesVencidas($db);
            $q = $db->prepare('SELECT * FROM evaluaciones WHERE reserva_id=:id ORDER BY fecha DESC');
            $q->execute(['id' => $reservaId]);
            $filas = $q->fetchAll();
            if (in_array($cuenta['rol'], ['administrador', 'fundador'], true)) {
                responderJSON(array_map('skillyEvaluacionArray', $filas));
            }
            // Evaluación ciega (misma política que accion=estado): cada parte ve la suya y,
            // de la contraparte, solo la que ya se publicó; su comentario, solo si fue aprobado.
            $visibles = [];
            foreach ($filas as $e) {
                if ($e['autor'] === $cuenta['rol']) {
                    $visibles[] = skillyEvaluacionArray($e);
                } elseif ((bool) $e['publicada']) {
                    if ($e['estado_comentario'] !== 'aprobado') {
                        $e['comentario'] = null;
                    }
                    $visibles[] = skillyEvaluacionArray($e);
                }
            }
            responderJSON($visibles);
        } elseif ($profId) {
            // Listado PÚBLICO: solo evaluaciones hechas por organizaciones, ya publicadas,
            // y sin comentarios que no hayan sido aprobados por moderación (INC-04).
            publicarEvaluacionesVencidas($db);
            $q = $db->prepare(
                "SELECT * FROM evaluaciones WHERE profesional_id=:id AND publicada=1 AND autor='organizacion' ORDER BY fecha DESC",
            );
            $q->execute(['id' => $profId]);
            $publicas = [];
            foreach ($q->fetchAll() as $e) {
                if ($e['estado_comentario'] !== 'aprobado') {
                    $e['comentario'] = null;
                }
                $publicas[] = skillyEvaluacionArray($e);
            }
            responderJSON($publicas);
        } else {
            usuarioAutenticado($db, ['administrador', 'fundador']);
            $q = $db->query('SELECT * FROM evaluaciones ORDER BY fecha DESC');
        }
        responderJSON(array_map('skillyEvaluacionArray', $q->fetchAll()));
    }
    if ($metodo === 'POST' && $accion === 'moderar') {
        usuarioAutenticado($db, ['administrador', 'fundador']);
        $id = (string) ($_GET['id'] ?? '');
        $data = leerJSON();
        $decision = $data['decision'] ?? '';
        if (!in_array($decision, ['aprobar', 'rechazar'], true)) {
            responderError('validacion', 'La decisión debe ser aprobar o rechazar.');
        }
        $q = $db->prepare('SELECT * FROM evaluaciones WHERE id=:id');
        $q->execute(['id' => $id]);
        $e = $q->fetch();
        if (!$e) {
            responderError('no_encontrado', 'No encontramos esa evaluación.', 404);
        }
        if ($e['estado_comentario'] !== 'en_revision') {
            responderError('conflicto', 'Ese comentario ya fue revisado.', 409);
        }
        $estado = $decision === 'aprobar' ? 'aprobado' : 'rechazado';
        $q = $db->prepare('UPDATE evaluaciones SET estado_comentario=:estado WHERE id=:id');
        $q->execute(['estado' => $estado, 'id' => $id]);
        $q = $db->prepare('SELECT * FROM evaluaciones WHERE id=:id');
        $q->execute(['id' => $id]);
        responderJSON(skillyEvaluacionArray($q->fetch()));
    }
    if ($metodo === 'POST' && $accion === '') {
        $cuenta = usuarioAutenticado($db, ['organizacion', 'profesional']);
        $data = leerJSON();
        $faltante = camposFaltantes($data, ['reservaId', 'calidad', 'plazos', 'comunicacion']);
        if ($faltante) {
            responderError('validacion', "Falta el campo: $faltante");
        }
        foreach (['calidad', 'plazos', 'comunicacion'] as $d) {
            if (!in_array((int) $data[$d], [1, 2, 3, 4], true)) {
                responderError('validacion', "El valor de $d debe estar entre 1 y 4.");
            }
        }
        $q = $db->prepare('SELECT * FROM reservas WHERE id=:id');
        $q->execute(['id' => $data['reservaId']]);
        $r = $q->fetch();
        if (!$r) {
            responderError('no_encontrado', 'No encontramos esa reserva.', 404);
        }
        $autor = $cuenta['rol'];
        if (
            ($autor === 'organizacion' && $r['organizacion_id'] !== $cuenta['organizacion_id']) ||
            ($autor === 'profesional' && $r['profesional_id'] !== $cuenta['profesional_id'])
        ) {
            responderError('no_autorizado', 'No puedes evaluar esta reserva.', 403);
        }
        if (!in_array($r['estado'], ['ENTREGADA', 'EVALUADA'], true) || !(bool) $r['conformidad_confirmada']) {
            responderError(
                'conflicto',
                'Podrás evaluar cuando el servicio esté entregado y la organización haya confirmado su conformidad.',
                409,
            );
        }
        $q = $db->prepare('SELECT id FROM evaluaciones WHERE reserva_id=:id AND autor=:autor');
        $q->execute(['id' => $r['id'], 'autor' => $autor]);
        if ($q->fetch()) {
            responderError('conflicto', 'Ya enviaste tu evaluación para este servicio.', 409);
        }
        $cfg = $db->query('SELECT reputacion_max_caracteres FROM configuracion_plataforma WHERE id=1')->fetch();
        $max = (int) ($cfg['reputacion_max_caracteres'] ?? 500);
        if (isset($data['comentario']) && !is_string($data['comentario'])) {
            responderError('validacion', 'El comentario debe ser texto.');
        }
        $coment = trim((string) ($data['comentario'] ?? ''));
        if (mb_strlen($coment) > $max) {
            responderError('validacion', "El comentario puede tener hasta $max caracteres.");
        }
        $evalId = generarId('eval');
        $estado = $coment !== '' ? 'en_revision' : 'sin_comentario';
        // Evaluación + cambio de estado de la reserva + historial: todo o nada.
        $db->beginTransaction();
        $q = $db->prepare(
            'INSERT INTO evaluaciones (id,reserva_id,profesional_id,organizacion_id,autor,calidad,plazos,comunicacion,comentario,fecha,publicada,estado_comentario) VALUES (:id,:res,:prof,:org,:autor,:cal,:pla,:com,:coment,NOW(),0,:estado)',
        );
        $q->execute([
            'id' => $evalId,
            'res' => $r['id'],
            'prof' => $r['profesional_id'],
            'org' => $r['organizacion_id'],
            'autor' => $autor,
            'cal' => (int) $data['calidad'],
            'pla' => (int) $data['plazos'],
            'com' => (int) $data['comunicacion'],
            'coment' => $coment ?: null,
            'estado' => $estado,
        ]);
        if ($autor === 'organizacion') {
            $q = $db->prepare("UPDATE reservas SET estado='EVALUADA' WHERE id=:id");
            $q->execute(['id' => $r['id']]);
            registrarEventoHistorialCompartido(
                $db,
                (string) $r['id'],
                ['tipo' => 'organizacion', 'nombre' => $cuenta['nombre']],
                'ENTREGADA',
                'EVALUADA',
                'Evaluación enviada por la organización.',
            );
        }
        $q = $db->prepare('SELECT * FROM evaluaciones WHERE id=:id');
        $q->execute(['id' => $evalId]);
        $new = $q->fetch();
        $q = $db->prepare('SELECT COUNT(*) FROM evaluaciones WHERE reserva_id=:id');
        $q->execute(['id' => $r['id']]);
        if ((int) $q->fetchColumn() >= 2) {
            $q = $db->prepare('UPDATE evaluaciones SET publicada=1 WHERE reserva_id=:id');
            $q->execute(['id' => $r['id']]);
            $q = $db->prepare('SELECT * FROM evaluaciones WHERE id=:id');
            $q->execute(['id' => $evalId]);
            $new = $q->fetch();
        }
        $db->commit();
        responderJSON(skillyEvaluacionArray($new), 201);
    }
    responderError('validacion', 'Método u operación no permitidos.', 405);
} catch (PDOException $e) {
    error_log('API evaluaciones: ' . $e->getMessage());
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    if ($e->getCode() === '23000') {
        responderError('conflicto', 'Ya existe una evaluación o faltan registros relacionados.', 409);
    }
    responderError('red', 'No se pudo completar la operación de evaluación.', 500);
} catch (Throwable $e) {
    error_log('API evaluaciones: ' . $e->getMessage());
    responderError('red', 'Ocurrió un error al procesar la evaluación.', 500);
}

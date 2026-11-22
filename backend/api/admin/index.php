<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/helpers.php';

function skillyAdminServicio(PDO $db, string $id): ?array {
    return obtenerServiciosLote($db, [$id])[$id] ?? null;
}
try {
    $db = conectarDB();
    $method = $_SERVER['REQUEST_METHOD'];
    $accion = (string) ($_GET['accion'] ?? '');
    $id = (string) ($_GET['id'] ?? '');
    $cuenta = usuarioAutenticado($db, ['administrador', 'fundador']);
    $fundador = $cuenta['rol'] === 'fundador';
    if ($method === 'GET' && in_array($accion, ['administradores', 'administradores-disponibles'], true)) {
        if ($accion === 'administradores' && !$fundador) {
            responderError('no_autorizado', 'Solo la cuenta fundadora puede gestionar administradores.', 403);
        }
        $q = $db->query(
            "SELECT id,nombre,email,rol FROM cuentas WHERE rol IN ('administrador','fundador') ORDER BY rol,nombre",
        );
        responderJSON($q->fetchAll());
    }
    if ($method === 'POST' && $accion === 'administradores') {
        if (!$fundador) {
            responderError('no_autorizado', 'Solo la cuenta fundadora puede crear administradores.', 403);
        }
        $d = leerJSON();
        $falt = camposFaltantes($d, ['nombre', 'email', 'contrasena', 'rol']);
        if ($falt) {
            responderError('validacion', "Falta el campo $falt.");
        }
        if (!in_array($d['rol'], ['administrador', 'fundador'], true)) {
            responderError('validacion', 'El rol administrativo no es válido.');
        }
        if ($error = errorContrasena((string) $d['contrasena'])) {
            responderError('validacion', $error);
        }
        exigirLargos($d, ['nombre' => 255, 'email' => 255]);
        $email = strtolower(trim((string) $d['email']));
        if (!correoValido($email)) {
            responderError('validacion', 'El correo no es válido.');
        }
        $idNew = generarId('cta');
        $q = $db->prepare(
            'INSERT INTO cuentas (id,email,contrasena,rol,nombre) VALUES (:id,:email,:pass,:rol,:nombre)',
        );
        $q->execute([
            'id' => $idNew,
            'email' => $email,
            'pass' => password_hash((string) $d['contrasena'], PASSWORD_DEFAULT),
            'rol' => $d['rol'],
            'nombre' => trim((string) $d['nombre']),
        ]);
        responderJSON(
            ['id' => $idNew, 'nombre' => trim((string) $d['nombre']), 'email' => $email, 'rol' => $d['rol']],
            201,
        );
    }
    if ($method === 'DELETE' && $accion === 'administradores') {
        if (!$fundador) {
            responderError('no_autorizado', 'Solo la cuenta fundadora puede eliminar administradores.', 403);
        }
        if (!$id) {
            responderError('validacion', 'Falta id.');
        }
        if ($id === $cuenta['id']) {
            responderError('conflicto', 'No puedes eliminar tu propia cuenta.', 409);
        }
        $q = $db->prepare("SELECT rol FROM cuentas WHERE id=:id AND rol IN ('administrador','fundador')");
        $q->execute(['id' => $id]);
        $r = $q->fetch();
        if (!$r) {
            responderError('no_encontrado', 'No encontramos esa cuenta administrativa.', 404);
        }
        if (
            $r['rol'] === 'fundador' &&
            (int) $db->query("SELECT COUNT(*) FROM cuentas WHERE rol='fundador'")->fetchColumn() <= 1
        ) {
            responderError('conflicto', 'Debe existir al menos una cuenta fundadora.', 409);
        }
        $q = $db->prepare('DELETE FROM cuentas WHERE id=:id');
        $q->execute(['id' => $id]);
        responderJSON(['ok' => true]);
    }
    if ($method === 'GET' && $accion === 'resumen') {
        $count = fn(string $sql) => (int) $db->query($sql)->fetchColumn();
        $estados = [];
        foreach ($db->query('SELECT estado,COUNT(*) total FROM reservas GROUP BY estado')->fetchAll() as $r) {
            $estados[$r['estado']] = (int) $r['total'];
        }
        $q = $db->query("SELECT COUNT(*) FROM evaluaciones WHERE estado_comentario='en_revision'");
        $pend = (int) $q->fetchColumn();
        $q = $db->query(
            "SELECT COUNT(*) FROM reservas WHERE estado IN ('CONFIRMADA','SOLICITADA') AND inicio>NOW() AND inicio<=DATE_ADD(NOW(),INTERVAL 24 HOUR)",
        );
        $next = (int) $q->fetchColumn();
        $q = $db->query(
            "SELECT COUNT(*) FROM profesionales p LEFT JOIN evaluaciones e ON e.profesional_id=p.id AND e.autor='organizacion' AND e.publicada=1 GROUP BY p.id HAVING COUNT(e.id)<(SELECT reputacion_minimo_evaluaciones FROM configuracion_plataforma WHERE id=1)",
        );
        $nuevos = count($q->fetchAll(PDO::FETCH_COLUMN));
        responderJSON([
            'organizaciones' => $count('SELECT COUNT(*) FROM organizaciones'),
            'profesionales' => $count('SELECT COUNT(*) FROM profesionales'),
            'profesionalesNuevos' => $nuevos,
            'servicios' => $count('SELECT COUNT(*) FROM servicios'),
            'reservasPorEstado' => (object) $estados,
            'comentariosEnRevision' => $pend,
            'proximas24h' => $next,
        ]);
    }
    if ($method === 'GET' && $accion === 'organizaciones') {
        $ids = $db->query('SELECT id FROM organizaciones ORDER BY creada_en DESC')->fetchAll(PDO::FETCH_COLUMN);
        $r = [];
        foreach ($ids as $oid) {
            $o = obtenerOrganizacion($db, $oid);
            if ($o) {
                $r[] = $o;
            }
        }
        responderJSON($r);
    }
    if ($method === 'GET' && $accion === 'profesionales') {
        // Listado optimizado: un puñado de consultas en total, sin importar cuántos profesionales haya.
        $ids = $db->query('SELECT id FROM profesionales ORDER BY fecha_ingreso DESC')->fetchAll(PDO::FETCH_COLUMN);
        $fichas = obtenerProfesionalesLote($db, $ids);
        $serviciosPorProfesional = [];
        $filasServicios = consultarEnLote(
            $db,
            'SELECT id, profesional_id FROM servicios WHERE profesional_id IN (:ids) ORDER BY titulo',
            $ids,
        );
        $servicios = obtenerServiciosLote($db, array_column($filasServicios, 'id'));
        foreach ($filasServicios as $f) {
            if (isset($servicios[$f['id']])) {
                $serviciosPorProfesional[$f['profesional_id']][] = $servicios[$f['id']];
            }
        }
        $evaluaciones = [];
        foreach (
            $db->query(
                "SELECT profesional_id, COUNT(*) total FROM evaluaciones WHERE autor = 'organizacion' GROUP BY profesional_id",
            )
            as $f
        ) {
            $evaluaciones[$f['profesional_id']] = (int) $f['total'];
        }
        $activas = [];
        foreach (
            $db->query(
                "SELECT profesional_id, COUNT(*) total FROM reservas WHERE estado IN ('SOLICITADA','CONFIRMADA','EN_CURSO','REAGENDADA') GROUP BY profesional_id",
            )
            as $f
        ) {
            $activas[$f['profesional_id']] = (int) $f['total'];
        }
        $validacion = [];
        foreach ($db->query('SELECT profesional_id, estado_validacion FROM perfiles_profesionales') as $f) {
            $validacion[$f['profesional_id']] = $f['estado_validacion'];
        }
        $minimo = (int) $db
            ->query('SELECT reputacion_minimo_evaluaciones FROM configuracion_plataforma WHERE id=1')
            ->fetchColumn();
        $items = [];
        foreach ($ids as $pid) {
            if (!isset($fichas[$pid])) {
                continue;
            }
            $total = $evaluaciones[$pid] ?? 0;
            $items[] = [
                'profesional' => $fichas[$pid],
                'servicios' => $serviciosPorProfesional[$pid] ?? [],
                'totalEvaluaciones' => $total,
                'esNuevo' => $total < $minimo,
                'reservasActivas' => $activas[$pid] ?? 0,
                'estadoValidacion' => $validacion[$pid] ?? null,
            ];
        }
        responderJSON($items);
    }
    if ($method === 'GET' && $accion === 'profesional-detalle') {
        if (!$id) {
            responderError('validacion', 'Falta id.');
        }
        $p = obtenerProfesional($db, $id);
        if (!$p) {
            responderError('no_encontrado', 'No encontramos al profesional.', 404);
        }
        $privado = obtenerPerfilPrivado($db, $id);
        $q = $db->prepare('SELECT email FROM cuentas WHERE profesional_id=:id LIMIT 1');
        $q->execute(['id' => $id]);
        $emailCuenta = $q->fetchColumn() ?: null;
        $q = $db->prepare('SELECT id FROM servicios WHERE profesional_id=:id ORDER BY titulo');
        $q->execute(['id' => $id]);
        $serv = array_values(obtenerServiciosLote($db, $q->fetchAll(PDO::FETCH_COLUMN)));
        $q = $db->prepare('SELECT estado,COUNT(*) total FROM reservas WHERE profesional_id=:id GROUP BY estado');
        $q->execute(['id' => $id]);
        $porEstado = [];
        foreach ($q->fetchAll() as $r) {
            $porEstado[$r['estado']] = (int) $r['total'];
        }
        $q = $db->prepare(
            "SELECT COUNT(*) FROM reservas WHERE profesional_id=:id AND estado IN ('SOLICITADA','CONFIRMADA','EN_CURSO','REAGENDADA')",
        );
        $q->execute(['id' => $id]);
        $act = (int) $q->fetchColumn();
        $q = $db->prepare(
            "SELECT COALESCE(SUM(precio),0) FROM reservas WHERE profesional_id=:id AND estado IN ('ENTREGADA','EVALUADA')",
        );
        $q->execute(['id' => $id]);
        $facturado = (int) $q->fetchColumn();
        $q = $db->prepare("SELECT COUNT(*) FROM evaluaciones WHERE profesional_id=:id AND autor='organizacion'");
        $q->execute(['id' => $id]);
        $total = (int) $q->fetchColumn();
        $cfg = (int) $db
            ->query('SELECT reputacion_minimo_evaluaciones FROM configuracion_plataforma WHERE id=1')
            ->fetchColumn();
        responderJSON([
            'profesional' => $p,
            'privado' => $privado,
            'estadoValidacion' => $privado['estadoValidacion'] ?? null,
            'emailCuenta' => $emailCuenta,
            'servicios' => $serv,
            'totalEvaluaciones' => $total,
            'esNuevo' => $total < $cfg,
            'reservasActivas' => $act,
            'reservasPorEstado' => (object) $porEstado,
            'montoFinalizado' => $facturado,
        ]);
    }
    if ($method === 'POST' && $accion === 'resolver-revision') {
        if (!$id) {
            responderError('validacion', 'Falta el id del servicio.');
        }
        $d = leerJSON();
        $decision = (string) ($d['decision'] ?? '');
        $coment = trim((string) ($d['comentario'] ?? ''));
        if (!in_array($decision, ['aprobar', 'observar'], true)) {
            responderError('validacion', 'La decisión debe ser aprobar u observar.');
        }
        if ($decision === 'observar' && mb_strlen($coment) < 10) {
            responderError('validacion', 'Explica al profesional qué debe corregir (al menos 10 caracteres).');
        }
        $rev = obtenerRevisionServicio($db, $id);
        if (!$rev) {
            responderError('no_encontrado', 'Este servicio no tiene solicitudes de revisión.', 404);
        }
        if ($rev['estado'] !== 'pendiente') {
            responderError('conflicto', 'Esa solicitud ya fue revisada.', 409);
        }
        $q = $db->prepare(
            'UPDATE solicitudes_revision_servicio SET estado=:estado,resuelta_en=NOW(),comentario_admin=:coment,revisado_por=:por WHERE id=:id',
        );
        $q->execute([
            'estado' => $decision === 'aprobar' ? 'aprobada' : 'observada',
            'coment' => $coment !== '' ? $coment : null,
            'por' => $cuenta['nombre'],
            'id' => $rev['id'],
        ]);
        responderJSON(skillyAdminServicio($db, $id));
    }
    if ($method === 'POST' && $accion === 'documento-estado') {
        // Aprobar o rechazar un documento de respaldo.
        $d = leerJSON();
        $estado = (string) ($d['estado'] ?? '');
        if (!in_array($estado, ['aprobado', 'rechazado'], true)) {
            responderError('validacion', 'El estado debe ser aprobado o rechazado.');
        }
        $q = $db->prepare('SELECT profesional_id FROM documentos_respaldo WHERE id = :id');
        $q->execute(['id' => $id]);
        $profId = $q->fetchColumn();
        if (!$profId) {
            responderError('no_encontrado', 'No encontramos ese documento.', 404);
        }
        $q = $db->prepare('UPDATE documentos_respaldo SET estado = :estado WHERE id = :id');
        $q->execute(['estado' => $estado, 'id' => $id]);
        responderJSON(obtenerPerfilPrivado($db, (string) $profId));
    }
    if ($method === 'POST' && $accion === 'validar-profesional') {
        // Validar el perfil (pasa a "Validado por Skilly") o devolverlo con observaciones.
        $d = leerJSON();
        $decision = (string) ($d['decision'] ?? '');
        $comentario = trim((string) ($d['comentario'] ?? ''));
        if (!in_array($decision, ['validar', 'devolver'], true)) {
            responderError('validacion', 'La decisión debe ser validar o devolver.');
        }
        $privado = obtenerPerfilPrivado($db, $id);
        if (!$privado) {
            responderError('no_encontrado', 'No encontramos al profesional.', 404);
        }
        if ($decision === 'validar') {
            $aprobados = array_filter($privado['documentos'], fn($doc) => $doc['estado'] === 'aprobado');
            if (!$aprobados) {
                responderError('validacion', 'Aprueba al menos un documento de respaldo antes de validar el perfil.');
            }
            $db->beginTransaction();
            $q = $db->prepare(
                "UPDATE perfiles_profesionales SET estado_validacion = 'validado', validado_en = NOW(), comentario_validacion = :c WHERE profesional_id = :id",
            );
            $q->execute(['c' => $comentario !== '' ? $comentario : null, 'id' => $id]);
            $q = $db->prepare('UPDATE profesionales SET validado_por_skilly = 1 WHERE id = :id');
            $q->execute(['id' => $id]);
            $db->commit();
        } else {
            if (mb_strlen($comentario) < 10) {
                responderError(
                    'validacion',
                    'Explica al profesional qué debe completar o corregir (al menos 10 caracteres).',
                );
            }
            $db->beginTransaction();
            $q = $db->prepare(
                "UPDATE perfiles_profesionales SET estado_validacion = 'perfil_incompleto', validado_en = NULL, comentario_validacion = :c WHERE profesional_id = :id",
            );
            $q->execute(['c' => $comentario, 'id' => $id]);
            $q = $db->prepare('UPDATE profesionales SET validado_por_skilly = 0 WHERE id = :id');
            $q->execute(['id' => $id]);
            $db->commit();
        }
        responderJSON(['profesional' => obtenerProfesional($db, $id), 'privado' => obtenerPerfilPrivado($db, $id)]);
    }
    if ($method === 'GET' && $accion === 'servicios') {
        $ids = $db->query('SELECT id FROM servicios ORDER BY titulo')->fetchAll(PDO::FETCH_COLUMN);
        responderJSON(array_values(obtenerServiciosLote($db, $ids)));
    }
    if ($method === 'GET' && $accion === 'reservas') {
        // 3 consultas en total (antes 5 por reserva: INC-10).
        $ids = $db->query('SELECT id FROM reservas ORDER BY creada_en DESC')->fetchAll(PDO::FETCH_COLUMN);
        responderJSON(obtenerReservasConNombres($db, $ids));
    }
    if ($method === 'GET' && $accion === 'solicitudes') {
        // Un administrador ve las solicitudes sin asignar y las suyas; la fundadora, todas.
        $q = $db->prepare(
            "SELECT id FROM reservas WHERE estado IN ('SOLICITADA','APROBADA_ADMIN','PENDIENTE_PAGO') AND (:fundador=1 OR administrador_asignado_id IS NULL OR administrador_asignado_id=:actual) ORDER BY creada_en DESC",
        );
        $q->execute(['fundador' => $fundador ? 1 : 0, 'actual' => $cuenta['id']]);
        responderJSON(obtenerReservasConNombres($db, $q->fetchAll(PDO::FETCH_COLUMN)));
    }
    if ($method === 'DELETE' && $accion === 'organizacion') {
        if (!$fundador) {
            responderError('no_autorizado', 'Solo el fundador puede eliminar organizaciones.', 403);
        }
        if (!$id) {
            responderError('validacion', 'Falta id.');
        }
        if (existeRegistro($db, 'SELECT 1 FROM reservas WHERE organizacion_id=:id', ['id' => $id])) {
            responderError('conflicto', 'La organización tiene contrataciones registradas y no se puede eliminar.', 409);
        }
        $db->beginTransaction();
        $q = $db->prepare('DELETE FROM favoritos WHERE usuario_id=:id');
        $q->execute(['id' => $id]);
        $q = $db->prepare('DELETE FROM cuentas WHERE organizacion_id=:id');
        $q->execute(['id' => $id]);
        $q = $db->prepare('DELETE FROM organizaciones WHERE id=:id');
        $q->execute(['id' => $id]);
        if (!$q->rowCount()) {
            $db->rollBack();
            responderError('no_encontrado', 'No encontramos la organización.', 404);
        }
        $db->commit();
        responderJSON(['ok' => true]);
    }
    if ($method === 'DELETE' && $accion === 'profesional') {
        if (!$fundador) {
            responderError('no_autorizado', 'Solo el fundador puede eliminar profesionales.', 403);
        }
        if (!$id) {
            responderError('validacion', 'Falta id.');
        }
        if (existeRegistro($db, 'SELECT 1 FROM reservas WHERE profesional_id=:id', ['id' => $id])) {
            responderError('conflicto', 'El profesional tiene contrataciones registradas y no se puede eliminar. Puedes pausar sus servicios.', 409);
        }
        $archivos = rutasArchivosProfesional($db, $id);
        $db->beginTransaction();
        $q = $db->prepare('DELETE FROM cuentas WHERE profesional_id = :id');
        $q->execute(['id' => $id]);
        $q = $db->prepare('DELETE FROM profesionales WHERE id = :id');
        $q->execute(['id' => $id]);
        if (!$q->rowCount()) {
            $db->rollBack();
            responderError('no_encontrado', 'No encontramos al profesional.', 404);
        }
        $db->commit();
        borrarArchivos($archivos); // solo después de confirmar la transacción
        responderJSON(['ok' => true]);
    }
    if ($method === 'DELETE' && $accion === 'reserva') {
        if (!$fundador) {
            responderError('no_autorizado', 'Solo el fundador puede eliminar reservas.', 403);
        }
        // Las contrataciones no se borran (T-02/A-11): se conservan con su historial,
        // chat y evaluaciones. La base también lo impide con FK RESTRICT.
        responderError(
            'conflicto',
            'Las contrataciones no se eliminan: quedan en el historial. Puedes cancelarlas o rechazarlas según su estado.',
            409,
        );
    }
    if ($method === 'DELETE' && $accion === 'servicio') {
        if (!$fundador) {
            responderError('no_autorizado', 'Solo el fundador puede eliminar servicios.', 403);
        }
        if (existeRegistro($db, 'SELECT 1 FROM reservas WHERE servicio_id=:id', ['id' => $id])) {
            responderError('conflicto', 'El servicio tiene contrataciones registradas y no se puede eliminar.', 409);
        }
        $q = $db->prepare('DELETE FROM servicios WHERE id=:id');
        $q->execute(['id' => $id]);
        if (!$q->rowCount()) {
            responderError('no_encontrado', 'No encontramos el servicio.', 404);
        }
        responderJSON(['ok' => true]);
    }
    responderError('no_encontrado', 'Operación administrativa no reconocida.', 404);
} catch (PDOException $e) {
    error_log('API admin: ' . $e->getMessage());
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    if ($e->getCode() === '23000') {
        responderError('conflicto', 'No se pudo completar por registros relacionados o duplicados.', 409);
    }
    responderError('red', 'No se pudo completar la operación administrativa.', 500);
} catch (Throwable $e) {
    error_log('API admin: ' . $e->getMessage());
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    responderError('red', 'Ocurrió un error administrativo.', 500);
}

<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/helpers.php';

/** Reserva con historial en formato del frontend (ver obtenerReservasLote en helpers.php). */
function skillyReserva(PDO $db, string $id): ?array {
    return obtenerReserva($db, $id);
}
function skillyReservaAutorizada(PDO $db, array $cuenta, array $reserva): void {
    if (in_array($cuenta['rol'], ['fundador', 'administrador'], true)) {
        return;
    }
    if ($cuenta['rol'] === 'organizacion' && $reserva['organizacion_id'] === $cuenta['organizacion_id']) {
        return;
    }
    if ($cuenta['rol'] === 'profesional' && $reserva['profesional_id'] === $cuenta['profesional_id']) {
        return;
    }
    responderError('no_autorizado', 'No tienes permiso para acceder a esta contratación.', 403);
}
function skillyActor(array $cuenta): array {
    if (in_array($cuenta['rol'], ['fundador', 'administrador'], true)) {
        return ['tipo' => 'skilly', 'nombre' => $cuenta['nombre'] . ' (Skilly)'];
    }
    if ($cuenta['rol'] === 'profesional') {
        return ['tipo' => 'profesional', 'nombre' => $cuenta['nombre']];
    }
    return ['tipo' => 'organizacion', 'nombre' => $cuenta['nombre']];
}
function skillyEvento(
    PDO $db,
    string $reservaId,
    array $actor,
    ?string $anterior,
    string $nuevo,
    ?string $motivo = null,
    ?string $detalle = null,
): void {
    registrarEventoHistorialCompartido($db, $reservaId, $actor, $anterior, $nuevo, $motivo, $detalle);
}
/**
 * Devuelve al catálogo los bloques de una hora que ocupaba [$inicio, $fin) (si aún no
 * pasaron). Una sesión de 90 minutos devuelve dos bloques. Ver liberarIntervalo().
 */
function skillyLiberarBloque(PDO $db, string $profesionalId, string $inicio, string $fin): void {
    liberarIntervalo($db, $profesionalId, $inicio, $fin);
}
function skillyMoverEstado(
    PDO $db,
    string $id,
    string $estado,
    array $actor,
    ?string $motivo = null,
    ?string $detalle = null,
    array $extra = [],
): array {
    $actual = skillyReserva($db, $id);
    if (!$actual) {
        responderError('no_encontrado', 'No encontramos la contratación.', 404);
    }
    $prev = $actual['estado'];
    $sets = ['estado=:estado'];
    $params = ['estado' => $estado, 'id' => $id];
    foreach ($extra as $col => $valor) {
        $sets[] = "$col=:$col";
        $params[$col] = $valor;
    }
    $q = $db->prepare('UPDATE reservas SET ' . implode(',', $sets) . ' WHERE id=:id');
    $q->execute($params);
    skillyEvento($db, $id, $actor, $prev, $estado, $motivo, $detalle);
    return skillyReserva($db, $id);
}
function skillyRetencion(PDO $db, string $retencionId, string $organizacionId): ?array {
    $q = $db->prepare('SELECT * FROM retenciones WHERE id=:id AND organizacion_id=:org AND expira_en>NOW() LIMIT 1');
    $q->execute(['id' => $retencionId, 'org' => $organizacionId]);
    return $q->fetch() ?: null;
}
/**
 * Política de cancelación. Si la organización todavía no pagó (pago simulado), no hay nada
 * que retener ni devolver: el resultado lo dice con pagado = false (A-12).
 */
function skillyTramoCancelacion(PDO $db, string $inicio, int $total, bool $pagado = true): array {
    // date_default_timezone_set (config.php) hace que strtotime y time() usen la hora de negocio.
    $horas = max(0, (strtotime($inicio) - time()) / 3600);
    $q = $db->query(
        'SELECT desde_horas,retencion_porcentaje,etiqueta FROM tramos_cancelacion ORDER BY desde_horas DESC',
    );
    $tramos = $q->fetchAll();
    if (!$tramos) {
        $tramos = [['desde_horas' => 0, 'retencion_porcentaje' => 0, 'etiqueta' => 'Sin política definida']];
    }
    $tramo = $tramos[count($tramos) - 1];
    foreach ($tramos as $t) {
        if ($horas >= (int) $t['desde_horas']) {
            $tramo = $t;
            break;
        }
    }
    $retenido = $pagado ? (int) round($total * ((int) $tramo['retencion_porcentaje'] / 100)) : 0;
    return [
        'pagado' => $pagado,
        'tramo' => [
            'desdeHoras' => (int) $tramo['desde_horas'],
            'retencionPorcentaje' => (int) $tramo['retencion_porcentaje'],
            'etiqueta' => $tramo['etiqueta'],
        ],
        'horasAntelacion' => $horas,
        'retencionPorcentaje' => (int) $tramo['retencion_porcentaje'],
        'montoRetenido' => $retenido,
        'montoDevuelto' => $pagado ? $total - $retenido : 0,
    ];
}

try {
    $db = conectarDB();
    $metodo = $_SERVER['REQUEST_METHOD'];
    $id = isset($_GET['id']) ? (string) $_GET['id'] : null;
    $accion = $_GET['accion'] ?? '';
    if ($metodo === 'GET') {
        $cuenta = usuarioAutenticado($db, ['organizacion', 'profesional', 'administrador', 'fundador']);
        if ($accion === 'admin-listado') {
            if (!in_array($cuenta['rol'], ['administrador', 'fundador'], true)) {
                responderError('no_autorizado', 'Solo administración puede consultar todas las reservas.', 403);
            }
            $ids = $db->query('SELECT id FROM reservas ORDER BY creada_en DESC')->fetchAll(PDO::FETCH_COLUMN);
            responderJSON(array_values(obtenerReservasLote($db, $ids)));
        }
        if ($id !== null) {
            $q = $db->prepare('SELECT * FROM reservas WHERE id=:id');
            $q->execute(['id' => $id]);
            $raw = $q->fetch();
            if (!$raw) {
                responderError('no_encontrado', 'No encontramos la contratación.', 404);
            }
            skillyReservaAutorizada($db, $cuenta, $raw);
            if ($accion === 'simular-cancelacion') {
                responderJSON(skillyTramoCancelacion($db, $raw['inicio'], (int) $raw['total'], $raw['estado_pago'] === 'confirmado'));
            }
            responderJSON(skillyReserva($db, $id));
        }
        $params = [];
        $where = '1=1';
        if ($cuenta['rol'] === 'organizacion') {
            $where = 'organizacion_id=:entidad';
            $params['entidad'] = $cuenta['organizacion_id'];
        } elseif ($cuenta['rol'] === 'profesional') {
            $where = 'profesional_id=:entidad';
            $params['entidad'] = $cuenta['profesional_id'];
        } elseif ($accion !== 'admin-listado') {
            $where = '1=0';
        }
        if ($accion === 'solicitudes-profesional') {
            if ($cuenta['rol'] !== 'profesional') {
                responderError('no_autorizado', 'Solo un profesional puede ver sus solicitudes.', 403);
            }
            // El profesional ve todo lo que administración ya le derivó, incluidas las
            // cerradas (rechazadas o canceladas después de la derivación): INC-11.
            $where = "profesional_id=:entidad AND administrador_decidio_en IS NOT NULL
                AND NOT (estado='RECHAZADA' AND profesional_decidio_en IS NULL)";
            $params = ['entidad' => $cuenta['profesional_id']];
        }
        $q = $db->prepare("SELECT id FROM reservas WHERE $where ORDER BY inicio ASC");
        $q->execute($params);
        responderJSON(array_values(obtenerReservasLote($db, $q->fetchAll(PDO::FETCH_COLUMN))));
    }

    if ($metodo === 'POST' && $accion === '') {
        $cuenta = usuarioAutenticado($db, ['organizacion']);
        $data = leerJSON();
        $faltante = camposFaltantes($data, ['retencionId', 'bloqueId', 'servicioId', 'modalidad', 'aceptaCondiciones']);
        if ($faltante) {
            responderError('validacion', "Falta el campo: $faltante");
        }
        if (($data['aceptaCondiciones'] ?? null) !== true) {
            responderError('validacion', 'Debes aceptar las condiciones para continuar.');
        }
        if (!in_array($data['modalidad'], ['remoto', 'presencial', 'hibrido'], true)) {
            responderError('validacion', 'La modalidad no es válida.');
        }
        exigirLargos($data, ['mensaje' => 2000]);
        $orgId = $cuenta['organizacion_id'];
        $actor = skillyActor($cuenta);
        $idReserva = generarId('res');
        try {
            $db->beginTransaction();
            // Orden de bloqueo único en toda la API: primero los BLOQUES (de menor a mayor hora)
            // y después las retenciones. Con el orden inverso, una reserva y una retención
            // simultáneas sobre el mismo horario se bloqueaban mutuamente (deadlock 1213).
            $q = $db->prepare('SELECT * FROM bloques_disponibles WHERE id=:id AND inicio>NOW() FOR UPDATE');
            $q->execute(['id' => $data['bloqueId']]);
            $bloque = $q->fetch();
            if (!$bloque) {
                $db->rollBack();
                responderError('no_encontrado', 'Ese horario ya no está disponible.', 404);
            }
            $q = $db->prepare('SELECT * FROM retenciones WHERE id=:id AND organizacion_id=:org AND expira_en>NOW() FOR UPDATE');
            $q->execute(['id' => $data['retencionId'], 'org' => $orgId]);
            $ret = $q->fetch();
            if (!$ret) {
                $db->rollBack();
                responderError('expirado', 'Se agotó el tiempo para reservar este horario. Selecciona otro.', 410);
            }
            if ($ret['bloque_id'] !== $data['bloqueId'] || $ret['servicio_id'] !== $data['servicioId']) {
                $db->rollBack();
                responderError('validacion', 'La retención no corresponde al servicio y horario seleccionado.');
            }
            // Solo servicios publicados de profesionales con validación VIGENTE (A-03): si Skilly
            // devolvió el perfil, no se aceptan contrataciones nuevas aunque el servicio siga publicado.
            $q = $db->prepare(
                'SELECT s.*, p.id AS prof_id FROM servicios s JOIN profesionales p ON p.id=s.profesional_id WHERE s.id=:id AND s.publicado=1 AND p.validado_por_skilly=1',
            );
            $q->execute(['id' => $data['servicioId']]);
            $servicio = $q->fetch();
            if (!$servicio) {
                $db->rollBack();
                responderError('no_encontrado', 'El servicio ya no está disponible para contratar.', 404);
            }
            if ($bloque['profesional_id'] !== $servicio['profesional_id']) {
                $db->rollBack();
                responderError('validacion', 'El horario no pertenece al profesional del servicio.');
            }
            // La sesión dura lo que ofrece el servicio (A-02): ocupa todos los bloques necesarios.
            $minutos = (int) $servicio['duracion_sesion_minutos'];
            $cadena = cadenaDeBloques($db, $bloque['profesional_id'], $bloque['inicio'], bloquesPorSesion($minutos), $orgId, true);
            if (!$cadena) {
                $db->rollBack();
                responderError('conflicto', 'Ya no queda tiempo libre suficiente desde ese horario. Selecciona otro.', 409);
            }
            $q = $db->prepare('SELECT 1 FROM servicio_modalidades WHERE servicio_id=:id AND modalidad=:mod');
            $q->execute(['id' => $data['servicioId'], 'mod' => $data['modalidad']]);
            if (!$q->fetch()) {
                $db->rollBack();
                responderError('validacion', 'Ese servicio no está disponible en la modalidad elegida.');
            }
            $q = $db->query('SELECT * FROM configuracion_plataforma WHERE id=1');
            $cfg = $q->fetch();
            $vigentes = condicionesReserva($servicio, $cfg);
            if (!coincidenCondicionesReserva($data['condiciones'] ?? null, $vigentes)) {
                $db->rollBack();
                responderError('conflicto', 'Revisa el precio, la comisión y las condiciones vigentes y vuelve a confirmar.', 409);
            }
            $precio = $vigentes['precio'];
            $pct = $vigentes['porcentaje'];
            $comision = (int) round(($precio * $pct) / 100);
            $total = $precio + $comision;
            // Contador por año bloqueado en esta transacción: sin repeticiones ni carreras (T-01).
            $codigo = siguienteCodigoReserva($db);
            $inicio = $bloque['inicio'];
            $fin = sumarMinutos($inicio, $minutos);
            $version = $vigentes['version'];
            $q = $db->prepare(
                'INSERT INTO reservas (id,codigo,organizacion_id,profesional_id,servicio_id,inicio,fin,modalidad,mensaje,precio,comision_porcentaje,comision,total,estado,estado_pago,aceptacion_fecha,aceptacion_usuario,aceptacion_version,creada_en) VALUES (:id,:codigo,:org,:prof,:serv,:inicio,:fin,:mod,:mensaje,:precio,:pct,:comision,:total,\'SOLICITADA\',\'pendiente_confirmacion\',NOW(),:usuario,:version,NOW())',
            );
            $q->execute([
                'id' => $idReserva,
                'codigo' => $codigo,
                'org' => $orgId,
                'prof' => $servicio['profesional_id'],
                'serv' => $data['servicioId'],
                'inicio' => $inicio,
                'fin' => $fin,
                'mod' => $data['modalidad'],
                'mensaje' => trim((string) ($data['mensaje'] ?? '')) ?: null,
                'precio' => $precio,
                'pct' => $pct,
                'comision' => $comision,
                'total' => $total,
                'usuario' => $cuenta['nombre'],
                'version' => $version,
            ]);
            skillyEvento($db, $idReserva, $actor, null, 'SOLICITADA', 'Reserva creada por la organización.');
            liberarGrupoRetenido($db, $orgId, $ret['id']);
            $q = $db->prepare('DELETE FROM bloques_disponibles WHERE id=:id');
            foreach ($cadena as $ocupado) {
                $q->execute(['id' => $ocupado['id']]);
            }
            $db->commit();
            responderJSON(skillyReserva($db, $idReserva), 201);
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
    }

    if ($metodo === 'POST' && $id !== null) {
        $cuenta = usuarioAutenticado($db, ['organizacion', 'profesional', 'administrador', 'fundador']);
        $data = leerJSON();
        $actor = skillyActor($cuenta);
        try {
            // La fila se lee y se BLOQUEA dentro de la transacción (A-05): dos peticiones
            // simultáneas sobre la misma contratación se atienden de a una, y la segunda ve
            // el estado que dejó la primera (por ejemplo, no se puede iniciar y cancelar a la vez).
            $db->beginTransaction();
            $q = $db->prepare('SELECT * FROM reservas WHERE id=:id FOR UPDATE');
            $q->execute(['id' => $id]);
            $raw = $q->fetch();
            if (!$raw) {
                $db->rollBack();
                responderError('no_encontrado', 'No encontramos la contratación.', 404);
            }
            skillyReservaAutorizada($db, $cuenta, $raw);
            $r = skillyReserva($db, $id);
            switch ($accion) {
                case 'cancelar':
                    if ($cuenta['rol'] !== 'organizacion') {
                        responderError('no_autorizado', 'Solo la organización puede cancelar esta solicitud.', 403);
                    }
                    if (
                        !in_array(
                            $r['estado'],
                            ['SOLICITADA', 'APROBADA_ADMIN', 'PENDIENTE_PAGO', 'CONFIRMADA', 'REAGENDADA'],
                            true,
                        )
                    ) {
                        responderError('conflicto', 'Esta contratación ya no se puede cancelar.', 409);
                    }
                    $pagado = $r['estadoPago'] === 'confirmado';
                    $resultado = skillyTramoCancelacion($db, $r['inicio'], (int) $r['total'], $pagado);
                    // Sin pago previo no hay reembolso ni retención: queda "sin_cobro" (A-12).
                    $pago = !$pagado ? 'sin_cobro' : ($resultado['montoRetenido'] > 0 ? 'retenido_parcial' : 'reembolsado');
                    $nuevo = skillyMoverEstado(
                        $db,
                        $id,
                        'CANCELADA',
                        $actor,
                        trim((string) ($data['motivo'] ?? '')) ?: 'Cancelada por la organización.',
                        $pagado
                            ? 'Retención: ' . $resultado['retencionPorcentaje'] . '% (' . $resultado['montoRetenido'] . ').'
                            : 'Cancelada antes del pago: no hubo cobro.',
                        ['estado_pago' => $pago],
                    );
                    // Los horarios se devuelven al catálogo solo si todavía no pasó su hora.
                    skillyLiberarBloque($db, $r['profesionalId'], $r['inicio'], $r['fin']);
                    if ($r['reagendamientoPropuesto']) {
                        // También el horario que estaba propuesto para reagendar.
                        skillyLiberarBloque(
                            $db,
                            $r['profesionalId'],
                            $r['reagendamientoPropuesto']['inicio'],
                            $r['reagendamientoPropuesto']['fin'],
                        );
                        $q = $db->prepare('UPDATE reservas SET reagendamiento_inicio=NULL,reagendamiento_fin=NULL,reagendamiento_solicitado=NULL WHERE id=:id');
                        $q->execute(['id' => $id]);
                        $nuevo = skillyReserva($db, $id);
                    }
                    $db->commit();
                    responderJSON($nuevo);
                case 'reagendar':
                    // La organización propone otro horario libre del mismo profesional.
                    // La reserva queda REAGENDADA hasta que el profesional responda.
                    if ($cuenta['rol'] !== 'organizacion') {
                        responderError(
                            'no_autorizado',
                            'Solo la organización puede solicitar un cambio de fecha.',
                            403,
                        );
                    }
                    if ($r['estado'] !== 'CONFIRMADA') {
                        responderError(
                            'conflicto',
                            'Solo puedes pedir un cambio de fecha en contrataciones confirmadas y sin otra solicitud pendiente.',
                            409,
                        );
                    }
                    $q = $db->prepare(
                        'SELECT * FROM bloques_disponibles b WHERE b.id=:id AND b.profesional_id=:prof AND b.inicio>NOW()
                         AND NOT EXISTS (SELECT 1 FROM retenciones r WHERE r.bloque_id=b.id AND r.expira_en>NOW()) FOR UPDATE',
                    );
                    $q->execute(['id' => (string) ($data['bloqueId'] ?? ''), 'prof' => $r['profesionalId']]);
                    $b = $q->fetch();
                    if (!$b) {
                        responderError('no_encontrado', 'Ese horario ya no está disponible.', 404);
                    }
                    // El nuevo horario debe tener libre la misma duración contratada (A-02).
                    $minutosContratados = (int) round((strtotime($r['fin']) - strtotime($r['inicio'])) / 60);
                    $cadena = cadenaDeBloques($db, $r['profesionalId'], $b['inicio'], bloquesPorSesion($minutosContratados), null, true);
                    if (!$cadena) {
                        responderError('conflicto', 'Desde esa hora no queda tiempo libre suficiente para la sesión contratada.', 409);
                    }
                    $b['fin'] = sumarMinutos($b['inicio'], $minutosContratados);
                    $nuevo = skillyMoverEstado(
                        $db,
                        $id,
                        'REAGENDADA',
                        $actor,
                        trim((string) ($data['motivo'] ?? '')) ?: 'Solicitud de reagendamiento.',
                        'Nuevo horario propuesto: ' . date('d-m-Y H:i', strtotime($b['inicio'])) . '. Pendiente de aceptación del profesional.',
                        [
                            'reagendamiento_inicio' => $b['inicio'],
                            'reagendamiento_fin' => $b['fin'],
                            'reagendamiento_solicitado' => date('Y-m-d H:i:s'),
                        ],
                    );
                    // El horario propuesto (todos sus bloques) deja de ofrecerse mientras se decide.
                    $q = $db->prepare('DELETE FROM bloques_disponibles WHERE id=:id');
                    foreach ($cadena as $ocupado) {
                        $q->execute(['id' => $ocupado['id']]);
                    }
                    $db->commit();
                    responderJSON($nuevo);
                case 'responder-reagendamiento':
                    // El profesional acepta (se mueve la reserva al nuevo horario y el
                    // original vuelve al catálogo) o rechaza (se mantiene el original y
                    // el propuesto vuelve al catálogo). En ambos casos queda CONFIRMADA.
                    if ($cuenta['rol'] !== 'profesional') {
                        responderError('no_autorizado', 'Solo el profesional puede responder el cambio de fecha.', 403);
                    }
                    if ($r['estado'] !== 'REAGENDADA' || !$r['reagendamientoPropuesto']) {
                        responderError('conflicto', 'Esta contratación no tiene un cambio de fecha pendiente.', 409);
                    }
                    $decision = (string) ($data['decision'] ?? '');
                    if (!in_array($decision, ['aceptar', 'rechazar'], true)) {
                        responderError('validacion', 'La decisión debe ser aceptar o rechazar.');
                    }
                    $propuesto = $r['reagendamientoPropuesto'];
                    $limpiar = [
                        'reagendamiento_inicio' => null,
                        'reagendamiento_fin' => null,
                        'reagendamiento_solicitado' => null,
                    ];
                    if ($decision === 'aceptar') {
                        $nuevo = skillyMoverEstado(
                            $db,
                            $id,
                            'CONFIRMADA',
                            $actor,
                            'El profesional aceptó la nueva fecha.',
                            'Horario anterior: ' . date('d-m-Y H:i', strtotime($r['inicio'])) . '. Nuevo horario: ' . date('d-m-Y H:i', strtotime($propuesto['inicio'])) . '.',
                            $limpiar + ['inicio' => $propuesto['inicio'], 'fin' => $propuesto['fin']],
                        );
                        skillyLiberarBloque($db, $r['profesionalId'], $r['inicio'], $r['fin']);
                    } else {
                        $nuevo = skillyMoverEstado(
                            $db,
                            $id,
                            'CONFIRMADA',
                            $actor,
                            trim((string) ($data['motivo'] ?? '')) ?: 'El profesional no puede en la fecha propuesta; se mantiene la original.',
                            null,
                            $limpiar,
                        );
                        skillyLiberarBloque($db, $r['profesionalId'], $propuesto['inicio'], $propuesto['fin']);
                    }
                    $db->commit();
                    responderJSON($nuevo);
                case 'conformidad':
                    if ($cuenta['rol'] !== 'organizacion') {
                        responderError('no_autorizado', 'Solo la organización puede confirmar conformidad.', 403);
                    }
                    if ($r['estado'] !== 'ENTREGADA') {
                        responderError(
                            'conflicto',
                            'Solo puedes confirmar conformidad cuando el servicio esté entregado.',
                            409,
                        );
                    }
                    if ($r['conformidadConfirmada']) {
                        responderError('conflicto', 'Ya confirmaste la conformidad de este servicio.', 409);
                    }
                    $q = $db->prepare(
                        'UPDATE reservas SET conformidad_confirmada=1,conformidad_fecha=NOW() WHERE id=:id',
                    );
                    $q->execute(['id' => $id]);
                    skillyEvento(
                        $db,
                        $id,
                        $actor,
                        'ENTREGADA',
                        'ENTREGADA',
                        'Conformidad confirmada por la organización.',
                    );
                    $db->commit();
                    responderJSON(skillyReserva($db, $id));
                case 'asignar-administrador':
                    if (!in_array($cuenta['rol'], ['fundador', 'administrador'], true)) {
                        responderError('no_autorizado', 'Solo administración puede asignar solicitudes.', 403);
                    }
                    if ($r['estado'] !== 'SOLICITADA') {
                        responderError('conflicto', 'Solo puedes asignar solicitudes pendientes de revisión.', 409);
                    }
                    $adminId = (string) ($data['administradorId'] ?? '');
                    $q = $db->prepare(
                        "SELECT id,nombre,rol FROM cuentas WHERE id=:id AND rol IN ('administrador','fundador')",
                    );
                    $q->execute(['id' => $adminId]);
                    $admin = $q->fetch();
                    if (!$admin) {
                        responderError('no_encontrado', 'Ese administrador no existe.', 404);
                    }
                    if (
                        $cuenta['rol'] !== 'fundador' &&
                        $r['administradorAsignadoId'] &&
                        $r['administradorAsignadoId'] !== $cuenta['id']
                    ) {
                        responderError('no_autorizado', 'La solicitud ya está asignada a otra persona.', 403);
                    }
                    $q = $db->prepare(
                        'UPDATE reservas SET administrador_asignado_id=:admin,administrador_asignado_nombre=:nombre WHERE id=:id',
                    );
                    $q->execute(['admin' => $admin['id'], 'nombre' => $admin['nombre'], 'id' => $id]);
                    $db->commit();
                    responderJSON(skillyReserva($db, $id));
                case 'aprobar-admin':
                    if (!in_array($cuenta['rol'], ['fundador', 'administrador'], true)) {
                        responderError('no_autorizado', 'Solo administración puede revisar solicitudes.', 403);
                    }
                    if ($r['estado'] !== 'SOLICITADA') {
                        responderError('conflicto', 'Esta solicitud ya fue revisada.', 409);
                    }
                    if (!$r['administradorAsignadoId']) {
                        responderError('conflicto', 'Primero debes asignar esta solicitud a un administrador.', 409);
                    }
                    if ($cuenta['rol'] !== 'fundador' && $r['administradorAsignadoId'] !== $cuenta['id']) {
                        responderError('no_autorizado', 'Solo la persona asignada puede aceptar esta solicitud.', 403);
                    }
                    $nuevo = skillyMoverEstado(
                        $db,
                        $id,
                        'APROBADA_ADMIN',
                        ['tipo' => 'skilly', 'nombre' => $r['administradorAsignadoNombre'] . ' (Skilly)'],
                        'Solicitud aceptada por administración.',
                        'La solicitud fue derivada al profesional.',
                        ['administrador_decidio_en' => date('Y-m-d H:i:s')],
                    );
                    $db->commit();
                    responderJSON($nuevo);
                case 'rechazar-admin':
                    if (!in_array($cuenta['rol'], ['fundador', 'administrador'], true)) {
                        responderError('no_autorizado', 'Solo administración puede revisar solicitudes.', 403);
                    }
                    if ($r['estado'] !== 'SOLICITADA') {
                        responderError('conflicto', 'Esta solicitud ya fue revisada.', 409);
                    }
                    if (!$r['administradorAsignadoId']) {
                        responderError('conflicto', 'Primero debes asignar esta solicitud a un administrador.', 409);
                    }
                    if ($cuenta['rol'] !== 'fundador' && $r['administradorAsignadoId'] !== $cuenta['id']) {
                        responderError('no_autorizado', 'Solo la persona asignada puede rechazar esta solicitud.', 403);
                    }
                    $nuevo = skillyMoverEstado(
                        $db,
                        $id,
                        'RECHAZADA',
                        ['tipo' => 'skilly', 'nombre' => $r['administradorAsignadoNombre'] . ' (Skilly)'],
                        trim((string) ($data['motivo'] ?? '')) ?: 'Solicitud rechazada por administración.',
                        null,
                        ['administrador_decidio_en' => date('Y-m-d H:i:s')],
                    );
                    // El horario vuelve a ofrecerse de inmediato (antes quedaba fuera del catálogo: A-06).
                    skillyLiberarBloque($db, $r['profesionalId'], $r['inicio'], $r['fin']);
                    $db->commit();
                    responderJSON($nuevo);
                case 'aceptar-profesional':
                    if ($cuenta['rol'] !== 'profesional') {
                        responderError('no_autorizado', 'Solo el profesional puede responder esta solicitud.', 403);
                    }
                    if ($r['estado'] !== 'APROBADA_ADMIN') {
                        responderError('conflicto', 'Esta solicitud ya no está pendiente de respuesta.', 409);
                    }
                    $nuevo = skillyMoverEstado(
                        $db,
                        $id,
                        'PENDIENTE_PAGO',
                        $actor,
                        'El profesional aceptó realizar el trabajo.',
                        null,
                        ['profesional_decidio_en' => date('Y-m-d H:i:s')],
                    );
                    $db->commit();
                    responderJSON($nuevo);
                case 'rechazar-profesional':
                    if ($cuenta['rol'] !== 'profesional') {
                        responderError('no_autorizado', 'Solo el profesional puede responder esta solicitud.', 403);
                    }
                    if ($r['estado'] !== 'APROBADA_ADMIN') {
                        responderError('conflicto', 'Esta solicitud ya no está pendiente de respuesta.', 409);
                    }
                    $nuevo = skillyMoverEstado(
                        $db,
                        $id,
                        'RECHAZADA',
                        $actor,
                        trim((string) ($data['motivo'] ?? '')) ?: 'El profesional rechazó la solicitud.',
                        null,
                        ['profesional_decidio_en' => date('Y-m-d H:i:s')],
                    );
                    // El horario vuelve a ofrecerse de inmediato (antes quedaba fuera del catálogo: A-06).
                    skillyLiberarBloque($db, $r['profesionalId'], $r['inicio'], $r['fin']);
                    $db->commit();
                    responderJSON($nuevo);
                case 'pagar':
                    if ($cuenta['rol'] !== 'organizacion') {
                        responderError('no_autorizado', 'Solo la organización puede confirmar el pago.', 403);
                    }
                    if ($r['estado'] !== 'PENDIENTE_PAGO') {
                        responderError('conflicto', 'El pago no está disponible para esta solicitud.', 409);
                    }
                    $nuevo = skillyMoverEstado(
                        $db,
                        $id,
                        'CONFIRMADA',
                        $actor,
                        'Pago simulado confirmado por la organización.',
                        null,
                        ['estado_pago' => 'confirmado', 'pago_confirmado_en' => date('Y-m-d H:i:s')],
                    );
                    $db->commit();
                    responderJSON($nuevo);
                case 'marcar-en-curso':
                    if (!in_array($cuenta['rol'], ['profesional', 'fundador', 'administrador'], true)) {
                        responderError('no_autorizado', 'No tienes permiso para avanzar esta contratación.', 403);
                    }
                    if ($r['estado'] !== 'CONFIRMADA') {
                        responderError(
                            'conflicto',
                            'Solo una contratación confirmada puede pasar a estar en curso.',
                            409,
                        );
                    }
                    $nuevo = skillyMoverEstado($db, $id, 'EN_CURSO', $actor, 'Trabajo iniciado.');
                    $db->commit();
                    responderJSON($nuevo);
                case 'marcar-entregada':
                    if (!in_array($cuenta['rol'], ['profesional', 'fundador', 'administrador'], true)) {
                        responderError('no_autorizado', 'No tienes permiso para entregar esta contratación.', 403);
                    }
                    if ($r['estado'] !== 'EN_CURSO') {
                        responderError('conflicto', 'Solo un trabajo en curso puede marcarse como entregado.', 409);
                    }
                    $nuevo = skillyMoverEstado(
                        $db,
                        $id,
                        'ENTREGADA',
                        $actor,
                        'El profesional marcó el trabajo como entregado.',
                    );
                    $db->commit();
                    responderJSON($nuevo);
                default:
                    $db->rollBack();
                    responderError('validacion', 'Acción de reserva desconocida.', 404);
            }
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
    }
    if ($metodo === 'DELETE' && $id !== null) {
        // Una contratación es un registro contable con historial, chat y evaluaciones: no se
        // borra (T-02/A-11). Se cierra cancelándola o rechazándola, y queda en el historial.
        usuarioAutenticado($db, ['fundador']);
        responderError(
            'conflicto',
            'Las contrataciones no se eliminan: quedan en el historial. Puedes cancelarlas o rechazarlas según su estado.',
            409,
        );
    }
    responderError('validacion', 'Método u operación no permitidos.', 405);
} catch (PDOException $e) {
    error_log('API reservas: ' . $e->getMessage());
    if ($e->getCode() === '23000') {
        responderError('conflicto', 'No se pudo completar la operación porque hay registros relacionados.', 409);
    }
    responderError('red', 'No se pudo completar la operación en la base de datos.', 500);
} catch (Throwable $e) {
    error_log('API reservas: ' . $e->getMessage());
    responderError('red', 'Ocurrió un error al procesar la contratación.', 500);
}

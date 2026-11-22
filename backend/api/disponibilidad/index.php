<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/helpers.php';

/** HH:MM con hora 00-23 y minutos 00-59 (antes se aceptaba, por ejemplo, 99:99). */
function horaValida(string $hora): bool {
    return (bool) preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $hora);
}

/** Retención en formato de respuesta. expiraEn va en ISO 8601 con desfase horario para que
 *  el navegador la interprete igual en cualquier zona (y en Safari, que no acepta "AAAA-MM-DD HH:MM:SS"). */
function skillyRetencionRespuesta(array $r): array {
    return [
        'id' => $r['id'],
        'bloqueId' => $r['bloque_id'],
        'servicioId' => $r['servicio_id'],
        'organizacionId' => $r['organizacion_id'],
        'expiraEn' => (new DateTimeImmutable($r['expira_en']))->format(DATE_ATOM),
    ];
}


try {
    $db = conectarDB();
    $metodo = $_SERVER['REQUEST_METHOD'];
    $accion = $_GET['accion'] ?? '';
    if ($metodo === 'GET' && $accion === 'horarios') {
        $cuenta = usuarioAutenticado($db, ['profesional']);
        $prof = $cuenta['profesional_id'];
        $q = $db->prepare(
            'SELECT dia,activo,desde,hasta FROM horarios_semanales WHERE profesional_id=:id ORDER BY dia',
        );
        $q->execute(['id' => $prof]);
        $lista = $q->fetchAll();
        if (!$lista) {
            $lista = [];
            for ($d = 0; $d <= 6; $d++) {
                $lista[] = [
                    'dia' => $d,
                    'activo' => in_array($d, [1, 2, 3, 4, 5], true),
                    'desde' => '09:00',
                    'hasta' => $d === 5 ? '16:00' : '18:00',
                ];
            }
        }
        // Al abrir por primera vez la agenda, también se crean los bloques de la semana por defecto.
        // Así los servicios nuevos tienen disponibilidad real que consultar en el catálogo.
        generarBloquesDesdeHorarios($db, $prof);
        responderJSON(
            array_map(
                fn($h) => [
                    'dia' => (int) $h['dia'],
                    'activo' => (bool) $h['activo'],
                    'desde' => substr((string) $h['desde'], 0, 5),
                    'hasta' => substr((string) $h['hasta'], 0, 5),
                ],
                $lista,
            ),
        );
    }
    if ($metodo === 'PUT' && $accion === 'horarios') {
        $cuenta = usuarioAutenticado($db, ['profesional']);
        $prof = $cuenta['profesional_id'];
        $data = leerJSON();
        $horarios = $data['horarios'] ?? $data;
        if (!is_array($horarios)) {
            responderError('validacion', 'El horario semanal no tiene el formato correcto.');
        }
        try {
            $db->beginTransaction();
            $q = $db->prepare('DELETE FROM horarios_semanales WHERE profesional_id=:id');
            $q->execute(['id' => $prof]);
            $q = $db->prepare(
                'INSERT INTO horarios_semanales (profesional_id,dia,activo,desde,hasta) VALUES (:id,:dia,:activo,:desde,:hasta)',
            );
            foreach ($horarios as $h) {
                $dia = (int) ($h['dia'] ?? -1);
                $desde = (string) ($h['desde'] ?? '09:00');
                $hasta = (string) ($h['hasta'] ?? '18:00');
                if (
                    $dia < 0 ||
                    $dia > 6 ||
                    !horaValida($desde) ||
                    !horaValida($hasta) ||
                    $desde >= $hasta
                ) {
                    responderError('validacion', 'Revisa los días y horarios configurados.');
                }
                $q->execute([
                    'id' => $prof,
                    'dia' => $dia,
                    'activo' => !empty($h['activo']) ? 1 : 0,
                    'desde' => $desde,
                    'hasta' => $hasta,
                ]);
            }
            generarBloquesDesdeHorarios($db, $prof);
            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
        responderJSON($horarios);
    }
    if ($metodo === 'GET' && $accion === 'bloqueos') {
        $cuenta = usuarioAutenticado($db, ['profesional']);
        $q = $db->prepare('SELECT * FROM bloqueos_disponibilidad WHERE profesional_id=:id ORDER BY fecha,desde');
        $q->execute(['id' => $cuenta['profesional_id']]);
        $lista = [];
        foreach ($q->fetchAll() as $b) {
            $lista[] = [
                'id' => $b['id'],
                'fecha' => $b['fecha'],
                'desde' => substr($b['desde'], 0, 5),
                'hasta' => substr($b['hasta'], 0, 5),
                'motivo' => $b['motivo'],
            ];
        }
        responderJSON($lista);
    }
    if ($metodo === 'POST' && $accion === 'bloqueos') {
        $cuenta = usuarioAutenticado($db, ['profesional']);
        $data = leerJSON();
        $faltante = camposFaltantes($data, ['fecha', 'desde', 'hasta']);
        if ($faltante) {
            responderError('validacion', "Falta: $faltante");
        }
        $fecha = DateTime::createFromFormat('!Y-m-d', (string) $data['fecha']);
        if (
            !$fecha ||
            $fecha->format('Y-m-d') !== $data['fecha'] ||
            !horaValida((string) $data['desde']) ||
            !horaValida((string) $data['hasta'])
        ) {
            responderError('validacion', 'Usa una fecha AAAA-MM-DD y horas HH:MM válidas.');
        }
        if ($data['desde'] >= $data['hasta']) {
            responderError('validacion', 'La hora de inicio debe ser anterior a la hora de término.');
        }
        exigirLargos($data, ['motivo' => 255]);
        $id = generarId('bloq');
        $q = $db->prepare(
            'INSERT INTO bloqueos_disponibilidad (id,profesional_id,fecha,desde,hasta,motivo) VALUES (:id,:prof,:fecha,:desde,:hasta,:motivo)',
        );
        $q->execute([
            'id' => $id,
            'prof' => $cuenta['profesional_id'],
            'fecha' => $data['fecha'],
            'desde' => $data['desde'],
            'hasta' => $data['hasta'],
            'motivo' => trim((string) ($data['motivo'] ?? '')) ?: null,
        ]);
        generarBloquesDesdeHorarios($db, $cuenta['profesional_id']);
        responderJSON(
            [
                'id' => $id,
                'fecha' => $data['fecha'],
                'desde' => $data['desde'],
                'hasta' => $data['hasta'],
                'motivo' => $data['motivo'] ?? null,
            ],
            201,
        );
    }
    if ($metodo === 'DELETE' && $accion === 'bloqueos' && isset($_GET['id'])) {
        $cuenta = usuarioAutenticado($db, ['profesional']);
        $q = $db->prepare('DELETE FROM bloqueos_disponibilidad WHERE id=:id AND profesional_id=:prof');
        $q->execute(['id' => $_GET['id'], 'prof' => $cuenta['profesional_id']]);
        if (!$q->rowCount()) {
            responderError('no_encontrado', 'No encontramos ese bloqueo.', 404);
        }
        generarBloquesDesdeHorarios($db, $cuenta['profesional_id']);
        responderJSON(['ok' => true]);
    }
    if ($metodo === 'GET' && $accion === 'retencion') {
        $cuenta = usuarioAutenticado($db, ['organizacion']);
        $id = (string) ($_GET['id'] ?? '');
        $q = $db->prepare('SELECT * FROM retenciones WHERE id=:id AND organizacion_id=:org AND expira_en>NOW()');
        $q->execute(['id' => $id, 'org' => $cuenta['organizacion_id']]);
        $r = $q->fetch();
        if (!$r) {
            responderError('expirado', 'La retención expiró o ya no existe.', 410);
        }
        responderJSON(skillyRetencionRespuesta($r));
    }
    if ($metodo === 'POST' && $accion === 'retener') {
        $cuenta = usuarioAutenticado($db, ['organizacion']);
        $data = leerJSON();
        $faltante = camposFaltantes($data, ['bloqueId', 'servicioId']);
        if ($faltante) {
            responderError('validacion', "Falta: $faltante");
        }
        try {
            $db->beginTransaction();
            $q = $db->prepare('SELECT * FROM bloques_disponibles WHERE id=:id AND inicio>NOW() FOR UPDATE');
            $q->execute(['id' => $data['bloqueId']]);
            $b = $q->fetch();
            if (!$b) {
                $db->rollBack();
                responderError('no_encontrado', 'Ese horario ya no está disponible.', 404);
            }
            $q = $db->prepare(
                'SELECT s.id, s.precio, s.duracion_sesion_minutos FROM servicios s JOIN profesionales p ON p.id = s.profesional_id
                 WHERE s.id=:id AND s.profesional_id=:prof AND s.publicado=1 AND p.validado_por_skilly=1',
            );
            $q->execute(['id' => $data['servicioId'], 'prof' => $b['profesional_id']]);
            $servicio = $q->fetch();
            if (!$servicio) {
                $db->rollBack();
                responderError('validacion', 'El horario no corresponde a un servicio disponible para contratar.');
            }
            // Una sesión de más de 60 minutos necesita varios bloques seguidos (A-02): se
            // bloquean todos y ninguno puede estar retenido por otra organización.
            $cantidad = bloquesPorSesion((int) $servicio['duracion_sesion_minutos']);
            // Lectura sin FOR UPDATE: toda retención sobre este bloque se crea teniendo su fila
            // bloqueada (la tenemos nosotros), y READ COMMITTED ve lo último confirmado.
            $q = $db->prepare('SELECT id FROM retenciones WHERE bloque_id=:id AND expira_en>NOW() AND organizacion_id<>:org');
            $q->execute(['id' => $b['id'], 'org' => $cuenta['organizacion_id']]);
            if ($q->fetch()) {
                $db->rollBack();
                responderError('conflicto', 'Alguien más está reservando ese horario. Elige otro.', 409);
            }
            $cadena = cadenaDeBloques($db, $b['profesional_id'], $b['inicio'], $cantidad, $cuenta['organizacion_id'], true);
            if (!$cadena) {
                $db->rollBack();
                responderError(
                    'conflicto',
                    'Desde esa hora no queda tiempo libre suficiente para una sesión de ' . (int) $servicio['duracion_sesion_minutos'] . ' minutos. Elige otro horario.',
                    409,
                );
            }
            $q = $db->prepare('DELETE FROM retenciones WHERE organizacion_id=:org');
            $q->execute(['org' => $cuenta['organizacion_id']]);
            $cfg = $db->query('SELECT retencion_bloque_minutos, comision_porcentaje, version_condiciones FROM configuracion_plataforma WHERE id=1')->fetch();
            $min = (int) ($cfg['retencion_bloque_minutos'] ?? 10);
            $rid = generarId('ret');
            $expira = (new DateTimeImmutable())->modify('+' . $min . ' minutes')->format('Y-m-d H:i:s');
            // Una fila por bloque: la primera es la retención principal (su id se devuelve);
            // las demás llevan el sufijo -2, -3… y se liberan junto con ella.
            $q = $db->prepare(
                'INSERT INTO retenciones (id,bloque_id,servicio_id,organizacion_id,expira_en) VALUES (:id,:bloque,:serv,:org,:expira)',
            );
            foreach ($cadena as $i => $bloque) {
                $q->execute([
                    'id' => $i === 0 ? $rid : $rid . '-' . ($i + 1),
                    'bloque' => $bloque['id'],
                    'serv' => $data['servicioId'],
                    'org' => $cuenta['organizacion_id'],
                    'expira' => $expira,
                ]);
            }
            $db->commit();
            responderJSON(
                skillyRetencionRespuesta([
                    'id' => $rid,
                    'bloque_id' => $b['id'],
                    'servicio_id' => $data['servicioId'],
                    'organizacion_id' => $cuenta['organizacion_id'],
                    'expira_en' => $expira,
                ]) + ['condiciones' => condicionesReserva($servicio, $cfg)],
                201,
            );
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
    }
    if ($metodo === 'DELETE' && $accion === 'retener' && isset($_GET['id'])) {
        $cuenta = usuarioAutenticado($db, ['organizacion']);
        // Se libera la retención principal y los bloques adicionales de la misma sesión.
        liberarGrupoRetenido($db, $cuenta['organizacion_id'], (string) $_GET['id']);
        responderJSON(['ok' => true]);
    }
    if ($metodo === 'GET') {
        $prof = (string) ($_GET['profesional_id'] ?? '');
        if (!$prof) {
            responderError('validacion', 'Falta profesional_id.');
        }
        $desde = fechaISOaSQL($_GET['desde'] ?? null) ?? date('Y-m-d H:i:s');
        $hasta = fechaISOaSQL($_GET['hasta'] ?? null) ?? date('Y-m-d H:i:s', strtotime('+60 days'));
        $q = $db->prepare(
            'SELECT b.id,b.profesional_id,b.inicio,b.fin FROM bloques_disponibles b WHERE b.profesional_id=:prof AND b.inicio>=:desde AND b.inicio<=:hasta AND b.inicio>NOW() AND NOT EXISTS (SELECT 1 FROM retenciones r WHERE r.bloque_id=b.id AND r.expira_en>NOW()) ORDER BY b.inicio',
        );
        $q->execute(['prof' => $prof, 'desde' => $desde, 'hasta' => $hasta]);
        $filas = $q->fetchAll();
        // Con servicio_id se ofrecen solo las horas de inicio que tienen tiempo libre
        // suficiente para la duración de ESE servicio (A-02), y solo si el servicio se
        // puede contratar hoy (perfil validado y servicio publicado: A-03).
        $minutos = 60;
        if (!empty($_GET['servicio_id'])) {
            $qs = $db->prepare(
                'SELECT s.duracion_sesion_minutos FROM servicios s JOIN profesionales p ON p.id = s.profesional_id
                 WHERE s.id=:id AND s.profesional_id=:prof AND s.publicado=1 AND p.validado_por_skilly=1',
            );
            $qs->execute(['id' => (string) $_GET['servicio_id'], 'prof' => $prof]);
            $duracion = $qs->fetchColumn();
            if ($duracion === false) {
                responderJSON([]);
            }
            $minutos = (int) $duracion;
        } elseif (isset($_GET['minutos'])) {
            // Reagendamiento de una contratación existente: se busca su misma duración.
            $minutos = (int) $_GET['minutos'];
            if ($minutos < 15 || $minutos > 480) {
                responderError('validacion', 'La duración debe estar entre 15 y 480 minutos.');
            }
        }
        $cantidad = bloquesPorSesion($minutos);
        $porInicio = array_column($filas, null, 'inicio');
        $items = [];
        foreach ($filas as $b) {
            $actual = $b;
            for ($i = 1; $i < $cantidad && $actual; $i++) {
                $actual = $porInicio[$actual['fin']] ?? null;
            }
            if (!$actual) {
                continue;
            }
            $items[] = [
                'id' => $b['id'],
                'profesionalId' => $b['profesional_id'],
                'inicio' => $b['inicio'],
                'fin' => $minutos === 60 && empty($_GET['servicio_id']) ? $b['fin'] : sumarMinutos($b['inicio'], $minutos),
            ];
        }
        responderJSON($items);
    }
    responderError('validacion', 'Método u operación no permitidos.', 405);
} catch (PDOException $e) {
    error_log('API disponibilidad: ' . $e->getMessage());
    responderError('red', 'No se pudo actualizar la disponibilidad.', 500);
} catch (Throwable $e) {
    error_log('API disponibilidad: ' . $e->getMessage());
    responderError('red', 'Ocurrió un error al procesar la disponibilidad.', 500);
}

<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/helpers.php';

function skillyServicioBasico(PDO $db, string $id): ?array {
    return obtenerServiciosLote($db, [$id])[$id] ?? null;
}
/** Ficha completa de catálogo de un servicio (ver obtenerCatalogoLote en helpers.php). */
function skillyServicioCatalogo(PDO $db, string $id): ?array {
    return obtenerCatalogoLote($db, [$id])[$id] ?? null;
}
/** Solo los profesionales validados por Skilly pueden mostrar servicios en el catálogo. */
function skillyExigirPerfilValidado(PDO $db, string $profId): void {
    $q = $db->prepare('SELECT estado_validacion FROM perfiles_profesionales WHERE profesional_id=:id');
    $q->execute(['id' => $profId]);
    if ($q->fetchColumn() !== 'validado') {
        responderError(
            'conflicto',
            'Podrás publicar servicios cuando Skilly valide tu perfil. Mientras tanto puedes guardarlos como pausados.',
            409,
        );
    }
}

function skillyGuardarServicio(PDO $db, array $data, string $profId, ?string $id = null): array {
    $req = [
        'categoriaId',
        'subcategoriaId',
        'titulo',
        'descripcion',
        'entregables',
        'duracionEstimada',
        'duracionSesionMinutos',
        'modalidades',
        'precio',
        'etiquetas',
        'publicado',
    ];
    foreach ($req as $k) {
        if (!array_key_exists($k, $data)) {
            responderError('validacion', "Falta el campo: $k");
        }
    }
    if (mb_strlen(trim((string) $data['titulo'])) < 8) {
        responderError('validacion', 'El título debe tener al menos 8 caracteres.');
    }
    if (mb_strlen(trim((string) $data['descripcion'])) < 30) {
        responderError('validacion', 'La descripción debe tener al menos 30 caracteres.');
    }
    if (
        !is_array($data['entregables']) ||
        count(array_filter($data['entregables'], fn($x) => trim((string) $x) !== '')) < 1
    ) {
        responderError('validacion', 'Agrega al menos un entregable.');
    }
    if (
        !is_array($data['modalidades']) ||
        count($data['modalidades']) < 1 ||
        count(array_diff($data['modalidades'], ['remoto', 'presencial', 'hibrido'])) > 0
    ) {
        responderError('validacion', 'Selecciona al menos una modalidad válida.');
    }
    if ((int) $data['precio'] <= 0 || (int) $data['duracionSesionMinutos'] <= 0) {
        responderError('validacion', 'El precio y la duración deben ser mayores que cero.');
    }
    // La sesión se agenda en bloques de 60 minutos: entre 15 minutos y una jornada de 8 horas.
    $minutos = (int) $data['duracionSesionMinutos'];
    if ($minutos < 15 || $minutos > 480 || $minutos % 15 !== 0) {
        responderError('validacion', 'La duración de la sesión debe estar entre 15 y 480 minutos, en múltiplos de 15.');
    }
    if ((int) $data['precio'] > 100000000) {
        responderError('validacion', 'El precio supera el máximo permitido.');
    }
    exigirLargos($data, [
        'titulo' => 255, 'descripcion' => 5000, 'duracionEstimada' => 100,
        'entregables' => 255, 'etiquetas' => 100,
    ]);
    $q = $db->prepare('SELECT id FROM categorias WHERE id=:id');
    $q->execute(['id' => $data['categoriaId']]);
    if (!$q->fetch()) {
        responderError('validacion', 'La categoría seleccionada no existe.');
    }
    $q = $db->prepare('SELECT id FROM subcategorias WHERE id=:id AND categoria_id=:cat');
    $q->execute(['id' => $data['subcategoriaId'], 'cat' => $data['categoriaId']]);
    if (!$q->fetch()) {
        responderError('validacion', 'La subcategoría no pertenece a esa categoría.');
    }
    // Publicar (o guardar publicado) exige validación VIGENTE, también al editar un servicio
    // que ya estaba publicado: si Skilly devolvió el perfil, no puede seguir ofreciéndose (A-03).
    if (!empty($data['publicado'])) {
        skillyExigirPerfilValidado($db, $profId);
    }
    $isNew = $id === null;
    $id = $id ?? generarId('srv');
    try {
        $db->beginTransaction();
        if ($isNew) {
            $q = $db->prepare(
                'INSERT INTO servicios (id,profesional_id,categoria_id,subcategoria_id,titulo,descripcion,duracion_estimada,duracion_sesion_minutos,precio,publicado) VALUES (:id,:prof,:cat,:sub,:titulo,:desc,:duracion,:minutos,:precio,:publicado)',
            );
        } else {
            $q = $db->prepare(
                'UPDATE servicios SET categoria_id=:cat,subcategoria_id=:sub,titulo=:titulo,descripcion=:desc,duracion_estimada=:duracion,duracion_sesion_minutos=:minutos,precio=:precio,publicado=:publicado,actualizado_en=NOW() WHERE id=:id AND profesional_id=:prof',
            );
        }
        $q->execute([
            'id' => $id,
            'prof' => $profId,
            'cat' => $data['categoriaId'],
            'sub' => $data['subcategoriaId'],
            'titulo' => trim((string) $data['titulo']),
            'desc' => trim((string) $data['descripcion']),
            'duracion' => trim((string) $data['duracionEstimada']) ?: 'A coordinar',
            'minutos' => (int) $data['duracionSesionMinutos'],
            'precio' => (int) $data['precio'],
            'publicado' => !empty($data['publicado']) ? 1 : 0,
        ]);
        if (!$isNew && !$q->rowCount()) {
            $check = $db->prepare('SELECT id FROM servicios WHERE id=:id AND profesional_id=:prof');
            $check->execute(['id' => $id, 'prof' => $profId]);
            if (!$check->fetch()) {
                $db->rollBack();
                responderError('no_encontrado', 'No encontramos ese servicio en tu cuenta.', 404);
            }
        }
        foreach (['servicio_entregables', 'servicio_modalidades', 'servicio_etiquetas'] as $tabla) {
            $q = $db->prepare("DELETE FROM $tabla WHERE servicio_id=:id");
            $q->execute(['id' => $id]);
        }
        $q = $db->prepare('INSERT INTO servicio_entregables (servicio_id,entregable) VALUES (:id,:v)');
        foreach ($data['entregables'] as $v) {
            if (trim((string) $v) !== '') {
                $q->execute(['id' => $id, 'v' => trim((string) $v)]);
            }
        }
        $q = $db->prepare('INSERT INTO servicio_modalidades (servicio_id,modalidad) VALUES (:id,:v)');
        foreach (array_unique($data['modalidades']) as $v) {
            $q->execute(['id' => $id, 'v' => $v]);
        }
        $q = $db->prepare('INSERT INTO servicio_etiquetas (servicio_id,etiqueta) VALUES (:id,:v)');
        foreach ($data['etiquetas'] ?? [] as $v) {
            if (trim((string) $v) !== '') {
                $q->execute(['id' => $id, 'v' => trim((string) $v)]);
            }
        }
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
    return skillyServicioBasico($db, $id) ?? [];
}

try {
    $db = conectarDB();
    $metodo = $_SERVER['REQUEST_METHOD'];
    $accion = $_GET['accion'] ?? '';
    $id = isset($_GET['id']) ? (string) $_GET['id'] : null;

    if ($metodo === 'GET' && $accion === 'mis-servicios') {
        $cuenta = usuarioAutenticado($db, ['profesional']);
        $profId = $cuenta['profesional_id'];
        $q = $db->prepare('SELECT id FROM servicios WHERE profesional_id=:id ORDER BY titulo');
        $q->execute(['id' => $profId]);
        responderJSON(array_values(obtenerServiciosLote($db, $q->fetchAll(PDO::FETCH_COLUMN))));
    }
    if ($metodo === 'GET' && $accion === 'de-profesional') {
        $profId = (string) ($_GET['profesional_id'] ?? '');
        $q = $db->prepare(
            'SELECT s.id FROM servicios s JOIN profesionales p ON p.id = s.profesional_id WHERE s.profesional_id=:id AND s.publicado=1 AND p.validado_por_skilly=1 ORDER BY s.titulo',
        );
        $q->execute(['id' => $profId]);
        responderJSON(array_values(obtenerServiciosLote($db, $q->fetchAll(PDO::FETCH_COLUMN))));
    }
    if ($metodo === 'GET' && $id !== null) {
        $item = skillyServicioCatalogo($db, $id);
        // Ficha pública solo si el servicio está publicado y el perfil sigue validado (A-03).
        if (!$item || !$item['servicio']['publicado'] || !profesionalElegible($db, $item['servicio']['profesionalId'])) {
            responderError('no_encontrado', 'Este servicio ya no está publicado.', 404);
        }
        $q = $db->prepare(
            'SELECT id FROM servicios WHERE profesional_id=:prof AND id<>:id AND publicado=1 ORDER BY titulo',
        );
        $q->execute(['prof' => $item['servicio']['profesionalId'], 'id' => $id]);
        $otros = array_values(obtenerServiciosLote($db, $q->fetchAll(PDO::FETCH_COLUMN)));
        $item['otrosServiciosDelProfesional'] = $otros;
        responderJSON($item);
    }
    if ($metodo === 'GET' && $accion === 'admin-listado') {
        usuarioAutenticado($db, ['administrador', 'fundador']);
        $q = $db->query('SELECT id FROM servicios ORDER BY titulo');
        responderJSON(array_values(obtenerServiciosLote($db, $q->fetchAll(PDO::FETCH_COLUMN))));
    }
    if ($metodo === 'GET') {
        // Catálogo: servicios publicados de profesionales con validación vigente (A-03).
        $where = ['s.publicado=1', 'EXISTS(SELECT 1 FROM profesionales pv WHERE pv.id=s.profesional_id AND pv.validado_por_skilly=1)'];
        $params = [];
        if (!empty($_GET['categoria'])) {
            $where[] = 's.categoria_id=:cat';
            $params['cat'] = $_GET['categoria'];
        }
        if (!empty($_GET['subcategoria'])) {
            $where[] = 's.subcategoria_id=:sub';
            $params['sub'] = $_GET['subcategoria'];
        }
        if (isset($_GET['precio_min']) && $_GET['precio_min'] !== '') {
            $where[] = 's.precio>=:pmin';
            $params['pmin'] = (int) $_GET['precio_min'];
        }
        if (isset($_GET['precio_max']) && $_GET['precio_max'] !== '') {
            $where[] = 's.precio<=:pmax';
            $params['pmax'] = (int) $_GET['precio_max'];
        }
        if (!empty($_GET['texto'])) {
            $where[] =
                '(s.titulo LIKE :texto OR s.descripcion LIKE :texto2 OR EXISTS(SELECT 1 FROM servicio_etiquetas et WHERE et.servicio_id=s.id AND et.etiqueta LIKE :texto3))';
            $like = '%' . trim((string) $_GET['texto']) . '%';
            $params['texto'] = $like;
            $params['texto2'] = $like;
            $params['texto3'] = $like;
        }
        // Modalidad: se filtra en SQL con parámetros nombrados y solo valores válidos.
        // (Antes se mezclaban parámetros nombrados y posicionales y PDO lanzaba una excepción: INC-02.)
        if (!empty($_GET['modalidad'])) {
            $modalidades = array_values(
                array_intersect(
                    array_unique(explode(',', (string) $_GET['modalidad'])),
                    ['remoto', 'presencial', 'hibrido'],
                ),
            );
            if (!$modalidades) {
                responderError('validacion', 'La modalidad indicada no es válida.');
            }
            $marcas = [];
            foreach ($modalidades as $i => $m) {
                $marcas[] = ":mod$i";
                $params["mod$i"] = $m;
            }
            $where[] =
                'EXISTS(SELECT 1 FROM servicio_modalidades sm WHERE sm.servicio_id=s.id AND sm.modalidad IN (' .
                implode(',', $marcas) .
                '))';
        }
        $sql = 'SELECT s.id FROM servicios s WHERE ' . implode(' AND ', $where);
        $orden = $_GET['orden'] ?? 'relevancia';
        $sql .=
            $orden === 'precio_asc'
                ? ' ORDER BY s.precio ASC'
                : ($orden === 'precio_desc'
                    ? ' ORDER BY s.precio DESC'
                    : ' ORDER BY s.titulo ASC');
        $q = $db->prepare($sql);
        $q->execute($params);
        // Fichas completas en ~15 consultas en total (antes ~15 por servicio: INC-10).
        $items = array_values(obtenerCatalogoLote($db, $q->fetchAll(PDO::FETCH_COLUMN)));
        // Disponibilidad y orden por relevancia se calculan con los campos persistidos.
        $disp = $_GET['disponibilidad'] ?? 'cualquiera';
        if ($disp !== 'cualquiera') {
            $d = strtotime($disp === 'esta_semana' ? '+7 days' : '+14 days');
            $items = array_values(
                array_filter($items, fn($x) => $x['proximoBloque'] && strtotime($x['proximoBloque']) <= $d),
            );
        }
        responderJSON(['items' => $items, 'total' => count($items)]);
    }
    if ($metodo === 'POST' && $accion === '') {
        $cuenta = usuarioAutenticado($db, ['profesional']);
        $service = skillyGuardarServicio($db, leerJSON(), $cuenta['profesional_id']);
        responderJSON($service, 201);
    }
    if ($metodo === 'POST' && $id !== null && $accion === 'solicitar-revision') {
        $cuenta = usuarioAutenticado($db, ['profesional']);
        $data = leerJSON();
        $q = $db->prepare('SELECT id FROM servicios WHERE id=:id AND profesional_id=:prof');
        $q->execute(['id' => $id, 'prof' => $cuenta['profesional_id']]);
        if (!$q->fetch()) {
            responderError('no_encontrado', 'No encontramos ese servicio en tu cuenta.', 404);
        }
        $actual = obtenerRevisionServicio($db, $id);
        if ($actual && $actual['estado'] === 'pendiente') {
            responderError(
                'conflicto',
                'Ya enviaste este servicio a revisión. El equipo de Skilly te responderá pronto.',
                409,
            );
        }
        $mensaje = trim((string) ($data['mensaje'] ?? ''));
        if (mb_strlen($mensaje) > 500) {
            responderError('validacion', 'El mensaje no puede superar los 500 caracteres.');
        }
        $q = $db->prepare(
            "INSERT INTO solicitudes_revision_servicio (id,servicio_id,profesional_id,estado,mensaje,solicitada_en) VALUES (:id,:srv,:prof,'pendiente',:msg,NOW())",
        );
        $q->execute([
            'id' => generarId('rev'),
            'srv' => $id,
            'prof' => $cuenta['profesional_id'],
            'msg' => $mensaje !== '' ? $mensaje : null,
        ]);
        responderJSON(skillyServicioBasico($db, $id), 201);
    }
    if ($metodo === 'PUT' && $id !== null && $accion === 'publicacion') {
        $cuenta = usuarioAutenticado($db, ['profesional']);
        $data = leerJSON();
        if (!array_key_exists('publicado', $data)) {
            responderError('validacion', 'Falta publicado.');
        }
        if (!empty($data['publicado'])) {
            skillyExigirPerfilValidado($db, $cuenta['profesional_id']);
        }
        $q = $db->prepare('UPDATE servicios SET publicado=:p WHERE id=:id AND profesional_id=:prof');
        $q->execute(['p' => !empty($data['publicado']) ? 1 : 0, 'id' => $id, 'prof' => $cuenta['profesional_id']]);
        if (!$q->rowCount()) {
            $check = $db->prepare('SELECT id FROM servicios WHERE id=:id AND profesional_id=:prof');
            $check->execute(['id' => $id, 'prof' => $cuenta['profesional_id']]);
            if (!$check->fetch()) {
                responderError('no_encontrado', 'No encontramos ese servicio en tu cuenta.', 404);
            }
        }
        responderJSON(skillyServicioBasico($db, $id));
    }
    if ($metodo === 'PUT' && $id !== null) {
        $cuenta = usuarioAutenticado($db, ['profesional']);
        $q = $db->prepare('SELECT id FROM servicios WHERE id=:id AND profesional_id=:prof');
        $q->execute(['id' => $id, 'prof' => $cuenta['profesional_id']]);
        if (!$q->fetch()) {
            responderError('no_encontrado', 'No encontramos ese servicio en tu cuenta.', 404);
        }
        responderJSON(skillyGuardarServicio($db, leerJSON(), $cuenta['profesional_id'], $id));
    }
    if ($metodo === 'DELETE' && $id !== null) {
        $cuenta = usuarioAutenticado($db, ['profesional', 'fundador']);
        $q = $db->prepare('SELECT profesional_id FROM servicios WHERE id=:id');
        $q->execute(['id' => $id]);
        $registro = $q->fetch();
        if (!$registro) {
            responderError('no_encontrado', 'No encontramos el servicio.', 404);
        }
        if ($cuenta['rol'] === 'profesional' && $registro['profesional_id'] !== $cuenta['profesional_id']) {
            responderError('no_autorizado', 'No puedes eliminar un servicio que no te pertenece.', 403);
        }
        // Un servicio con contrataciones (activas o terminadas) no se borra: se perdería
        // el historial, las evaluaciones y la reputación del profesional (INC-03).
        // La FK reservas.servicio_id es RESTRICT, así que la base también lo impide.
        if (existeRegistro($db, 'SELECT 1 FROM reservas WHERE servicio_id=:id', ['id' => $id])) {
            responderError(
                'conflicto',
                'Este servicio tiene contrataciones registradas y no se puede eliminar. Puedes pausarlo para que deje de aparecer en el catálogo.',
                409,
            );
        }
        $q = $db->prepare('DELETE FROM servicios WHERE id=:id');
        $q->execute(['id' => $id]);
        responderJSON(['ok' => true]);
    }
    responderError('validacion', 'Método u operación no permitidos.', 405);
} catch (PDOException $e) {
    error_log('API servicios: ' . $e->getMessage());
    if ($e->getCode() === '23000') {
        responderError(
            'conflicto',
            'El servicio no se puede guardar porque uno de sus datos relacionados no existe.',
            409,
        );
    }
    responderError('red', 'No se pudo completar la operación en la base de datos.', 500);
} catch (Throwable $e) {
    error_log('API servicios: ' . $e->getMessage());
    responderError('red', 'Ocurrió un error al procesar el servicio.', 500);
}

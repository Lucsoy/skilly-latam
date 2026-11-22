<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/helpers.php';

try {
    $db = conectarDB();
    $metodo = $_SERVER['REQUEST_METHOD'];
    $accion = $_GET['accion'] ?? '';

    if ($metodo === 'POST' && $accion === '') {
        $data = leerJSON();
        $faltante = camposFaltantes($data, ['nombreCompleto', 'email', 'contrasena', 'areaPrincipal']);
        if ($faltante) {
            responderError('validacion', "Falta el campo: $faltante");
        }
        if ($error = errorContrasena((string) $data['contrasena'])) {
            responderError('validacion', $error);
        }
        exigirLargos($data, ['nombreCompleto' => 200, 'email' => 255, 'areaPrincipal' => 50]);
        $email = strtolower(trim((string) $data['email']));
        $linkedin = urlOpcional($data, 'linkedin');
        if (!correoValido($email)) {
            responderError('validacion', 'El correo electrónico no es válido.');
        }
        $stmt = $db->prepare('SELECT id FROM cuentas WHERE email = :email');
        $stmt->execute(['email' => $email]);
        if ($stmt->fetch()) {
            responderError('conflicto', 'Ya existe una cuenta con ese correo.', 409);
        }
        if ($linkedin !== null) {
            $stmt = $db->prepare('SELECT id FROM profesionales WHERE linkedin = :linkedin LIMIT 1');
            $stmt->execute(['linkedin' => $linkedin]);
        }
        if ($linkedin !== null && $stmt->fetch()) {
            responderError('conflicto', 'Ese perfil de LinkedIn ya está asociado a Skilly.', 409);
        }
        $partes = preg_split('/\s+/', trim((string) $data['nombreCompleto']));
        $nombre = $partes[0] ?? '';
        $apellido = implode(' ', array_slice($partes, 1));
        if (!$nombre || !$apellido) {
            responderError('validacion', 'Ingresa tu nombre y al menos un apellido.');
        }
        if (mb_strlen($nombre) > 100 || mb_strlen($apellido) > 100) {
            responderError('validacion', 'El nombre y los apellidos admiten como máximo 100 caracteres cada uno.');
        }
        $consentimiento = exigirConsentimiento($db, $data);
        $profId = generarId('prof');
        $cuentaId = generarId('cta');
        $ahora = date('Y-m-d H:i:s');
        try {
            $db->beginTransaction();
            $stmt = $db->prepare(
                'INSERT INTO profesionales (id,nombre,apellido,presentacion,linkedin,fecha_ingreso) VALUES (:id,:nombre,:apellido,\'\',:linkedin,:fecha)',
            );
            $stmt->execute([
                'id' => $profId,
                'nombre' => $nombre,
                'apellido' => $apellido,
                'linkedin' => $linkedin,
                'fecha' => $ahora,
            ]);
            $stmt = $db->prepare(
                'INSERT INTO perfiles_profesionales (profesional_id,email,area_principal,estado_validacion,consentimiento_aceptado,consentimiento_fecha,consentimiento_version) VALUES (:id,:email,:area,\'perfil_incompleto\',1,:fecha,:version)',
            );
            // Fecha y versión del consentimiento las fija el servidor (no se aceptan del cliente).
            $stmt->execute([
                'id' => $profId,
                'email' => $email,
                'area' => trim((string) $data['areaPrincipal']),
                'fecha' => $consentimiento['fecha'],
                'version' => $consentimiento['version'],
            ]);
            $stmt = $db->prepare(
                'INSERT INTO cuentas (id,email,contrasena,rol,nombre,profesional_id) VALUES (:id,:email,:pass,\'profesional\',:nombre,:prof)',
            );
            $stmt->execute([
                'id' => $cuentaId,
                'email' => $email,
                'pass' => password_hash((string) $data['contrasena'], PASSWORD_DEFAULT),
                'nombre' => trim((string) $data['nombreCompleto']),
                'prof' => $profId,
            ]);
            $token = emitirTokenSesion($db, $cuentaId);
            $db->commit();
            $cuenta = [
                'id' => $cuentaId,
                'email' => $email,
                'contrasena' => '',
                'rol' => 'profesional',
                'nombre' => trim((string) $data['nombreCompleto']),
                'organizacion_id' => null,
                'profesional_id' => $profId,
            ];
            responderJSON(construirSesion($db, $cuenta, $token), 201);
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
    }

    if ($metodo === 'GET' && $accion === 'mi-cuenta') {
        $cuenta = usuarioAutenticado($db, ['profesional']);
        $id = $cuenta['profesional_id'] ?? '';
        $prof = obtenerProfesional($db, $id);
        $privado = obtenerPerfilPrivado($db, $id);
        if (!$prof || !$privado) {
            responderError('no_encontrado', 'No encontramos tu perfil profesional.', 404);
        }
        responderJSON(['profesional' => $prof, 'privado' => $privado]);
    }

    if ($metodo === 'PUT' && ($accion === 'mi-perfil' || $accion === '')) {
        $cuenta = usuarioAutenticado($db, ['profesional']);
        $id = $cuenta['profesional_id'] ?? '';
        $data = leerJSON();
        if (
            empty(trim((string) ($data['titulo'] ?? ''))) ||
            empty(trim((string) ($data['ciudad'] ?? ''))) ||
            mb_strlen(trim((string) ($data['presentacion'] ?? ''))) < 40
        ) {
            responderError('validacion', 'Completa cargo, ciudad y una presentación de al menos 40 caracteres.');
        }
        if (empty(array_filter($data['formacion'] ?? [])) || empty(array_filter($data['habilidades'] ?? []))) {
            responderError('validacion', 'Agrega al menos una formación y una habilidad.');
        }
        exigirLargos($data, ['titulo' => 255, 'ciudad' => 100, 'presentacion' => 5000, 'formacion' => 255, 'habilidades' => 100]);
        foreach ($data['experiencia'] ?? [] as $exp) {
            exigirLargos(is_array($exp) ? $exp : [], ['cargo' => 255, 'organizacion' => 255, 'periodo' => 100]);
        }
        $linkedin = urlOpcional($data, 'linkedin');
        $portafolio = urlOpcional($data, 'portafolio');
        // Credenciales que Skilly revisó al validar. Si un perfil validado las cambia,
        // vuelve a revisión: el sello "Validado por Skilly" no puede cubrir datos no revisados.
        $antes = obtenerProfesional($db, $id);
        $huella = fn(array $p) => json_encode([
            array_values(array_filter(array_map('trim', array_map('strval', $p['formacion'] ?? [])))),
            array_values(array_map(
                fn($x) => [trim((string) ($x['cargo'] ?? '')), trim((string) ($x['organizacion'] ?? '')), trim((string) ($x['periodo'] ?? ''))],
                array_filter($p['experiencia'] ?? [], fn($x) => is_array($x) && trim((string) ($x['cargo'] ?? '')) !== '' && trim((string) ($x['organizacion'] ?? '')) !== ''),
            )),
            $p['linkedin'] ?? null,
            $p['portafolio'] ?? null,
        ]);
        $cambiaCredenciales =
            $antes !== null &&
            $huella($antes) !== $huella(['formacion' => $data['formacion'] ?? [], 'experiencia' => $data['experiencia'] ?? [], 'linkedin' => $linkedin, 'portafolio' => $portafolio]);
        try {
            $db->beginTransaction();
            $stmt = $db->prepare(
                'UPDATE profesionales SET titulo=:titulo, ciudad=:ciudad, presentacion=:presentacion, linkedin=:linkedin, portafolio=:portafolio WHERE id=:id',
            );
            $stmt->execute([
                'titulo' => trim((string) $data['titulo']),
                'ciudad' => trim((string) $data['ciudad']),
                'presentacion' => trim((string) $data['presentacion']),
                'linkedin' => $linkedin,
                'portafolio' => $portafolio,
                'id' => $id,
            ]);
            foreach (['profesional_formacion', 'profesional_experiencia', 'profesional_habilidades'] as $tabla) {
                $stmt = $db->prepare("DELETE FROM $tabla WHERE profesional_id = :id");
                $stmt->execute(['id' => $id]);
            }
            $stmt = $db->prepare('INSERT INTO profesional_formacion (profesional_id,descripcion) VALUES (:id,:v)');
            foreach ($data['formacion'] ?? [] as $v) {
                if (trim((string) $v) !== '') {
                    $stmt->execute(['id' => $id, 'v' => trim((string) $v)]);
                }
            }
            $stmt = $db->prepare('INSERT INTO profesional_habilidades (profesional_id,habilidad) VALUES (:id,:v)');
            foreach ($data['habilidades'] ?? [] as $v) {
                if (trim((string) $v) !== '') {
                    $stmt->execute(['id' => $id, 'v' => trim((string) $v)]);
                }
            }
            $stmt = $db->prepare(
                'INSERT INTO profesional_experiencia (profesional_id,cargo,organizacion,periodo) VALUES (:id,:cargo,:org,:periodo)',
            );
            foreach ($data['experiencia'] ?? [] as $v) {
                if (trim((string) ($v['cargo'] ?? '')) === '' || trim((string) ($v['organizacion'] ?? '')) === '') {
                    continue;
                }
                $stmt->execute([
                    'id' => $id,
                    'cargo' => trim((string) $v['cargo']),
                    'org' => trim((string) $v['organizacion']),
                    'periodo' => trim((string) ($v['periodo'] ?? '')),
                ]);
            }
            $estadoActual = $db->prepare('SELECT estado_validacion FROM perfiles_profesionales WHERE profesional_id = :id');
            $estadoActual->execute(['id' => $id]);
            if ($estadoActual->fetchColumn() === 'validado' && $cambiaCredenciales) {
                $stmt = $db->prepare(
                    "UPDATE perfiles_profesionales SET estado_validacion = 'en_revision', validado_en = NULL, comentario_validacion = :c WHERE profesional_id = :id",
                );
                $stmt->execute([
                    'c' => 'Cambiaste tu formación, experiencia o enlaces: Skilly debe revisarlos de nuevo. Mientras tanto tus servicios no aparecen en el catálogo.',
                    'id' => $id,
                ]);
                // Misma transacción que el estado (desnormalización controlada).
                $stmt = $db->prepare('UPDATE profesionales SET validado_por_skilly = 0 WHERE id = :id');
                $stmt->execute(['id' => $id]);
            } else {
                $stmt = $db->prepare(
                    "UPDATE perfiles_profesionales SET estado_validacion = IF(estado_validacion = 'validado', estado_validacion, 'en_revision') WHERE profesional_id = :id",
                );
                $stmt->execute(['id' => $id]);
            }
            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
        responderJSON(['profesional' => obtenerProfesional($db, $id), 'privado' => obtenerPerfilPrivado($db, $id)]);
    }

    if ($metodo === 'POST' && $accion === 'validar') {
        $cuenta = usuarioAutenticado($db, ['profesional']);
        $id = $cuenta['profesional_id'] ?? '';
        $p = obtenerProfesional($db, $id);
        if (
            !$p ||
            !$p['titulo'] ||
            !$p['ciudad'] ||
            mb_strlen((string) $p['presentacion']) < 40 ||
            count($p['formacion']) === 0 ||
            count($p['habilidades']) === 0
        ) {
            responderError('validacion', 'Completa tu perfil profesional antes de solicitar validación.');
        }
        $stmt = $db->prepare(
            "UPDATE perfiles_profesionales SET estado_validacion = 'en_revision' WHERE profesional_id = :id",
        );
        $stmt->execute(['id' => $id]);
        responderJSON(obtenerPerfilPrivado($db, $id));
    }

    if ($metodo === 'POST' && $accion === 'documento') {
        // Subida real del archivo (multipart/form-data: campos "tipo" y "archivo").
        $cuenta = usuarioAutenticado($db, ['profesional']);
        $id = $cuenta['profesional_id'] ?? '';
        $cfg = skillyConfig();
        $tipo = (string) ($_POST['tipo'] ?? '');
        if (!in_array($tipo, ['curriculum', 'certificado', 'titulo'], true)) {
            responderError('validacion', 'El tipo de documento no es válido.');
        }
        $archivo = $_FILES['archivo'] ?? null;
        if (!$archivo || !is_array($archivo) || ($archivo['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            responderError('validacion', 'Selecciona un archivo para subir.');
        }
        if (
            $archivo['error'] === UPLOAD_ERR_INI_SIZE ||
            $archivo['error'] === UPLOAD_ERR_FORM_SIZE ||
            (int) $archivo['size'] > (int) $cfg['tamano_maximo_documento']
        ) {
            responderError('validacion', 'El archivo supera el tamaño máximo de 5 MB.');
        }
        if ($archivo['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($archivo['tmp_name'])) {
            responderError('validacion', 'No pudimos recibir el archivo. Inténtalo de nuevo.');
        }

        // Se valida la extensión y también el tipo real del contenido.
        $permitidos = [
            'pdf' => ['application/pdf'],
            'doc' => ['application/msword', 'application/octet-stream'],
            'docx' => [
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/zip',
                'application/octet-stream',
            ],
            'jpg' => ['image/jpeg'],
            'jpeg' => ['image/jpeg'],
            'png' => ['image/png'],
        ];
        $nombreOriginal = trim(basename((string) $archivo['name']));
        $extension = strtolower(pathinfo($nombreOriginal, PATHINFO_EXTENSION));
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($archivo['tmp_name']) ?: 'application/octet-stream';
        if (!isset($permitidos[$extension]) || !in_array($mime, $permitidos[$extension], true)) {
            responderError('validacion', 'Formato no permitido. Sube un PDF, Word (.doc/.docx) o imagen JPG/PNG.');
        }

        $directorio = rtrim((string) $cfg['directorio_subidas'], '/\\');
        if (!is_dir($directorio) && !mkdir($directorio, 0750, true)) {
            responderError('red', 'El servidor no tiene dónde guardar documentos. Revisa la carpeta de subidas.', 500);
        }
        $docId = generarId('doc');
        $nombreGuardado = $docId . '.' . $extension;
        if (!move_uploaded_file($archivo['tmp_name'], $directorio . DIRECTORY_SEPARATOR . $nombreGuardado)) {
            responderError('red', 'No se pudo guardar el archivo en el servidor.', 500);
        }

        $stmt = $db->prepare("INSERT INTO documentos_respaldo
            (id, profesional_id, tipo, nombre_archivo, tamano_bytes, estado, ruta_archivo, tipo_mime)
            VALUES (:id, :prof, :tipo, :nombre, :tamano, 'pendiente_revision', :ruta, :mime)");
        $stmt->execute([
            'id' => $docId,
            'prof' => $id,
            'tipo' => $tipo,
            'nombre' => mb_substr($nombreOriginal, 0, 255),
            'tamano' => (int) $archivo['size'],
            'ruta' => $nombreGuardado,
            'mime' => $mime,
        ]);
        $stmt = $db->prepare(
            'SELECT id, tipo, nombre_archivo, tamano_bytes, subido_en, estado FROM documentos_respaldo WHERE id = :id',
        );
        $stmt->execute(['id' => $docId]);
        $d = $stmt->fetch();
        responderJSON(
            [
                'id' => $d['id'],
                'tipo' => $d['tipo'],
                'nombreArchivo' => $d['nombre_archivo'],
                'tamanoBytes' => (int) $d['tamano_bytes'],
                'subidoEn' => $d['subido_en'],
                'estado' => $d['estado'],
                'tieneArchivo' => true,
            ],
            201,
        );
    }

    if ($metodo === 'GET' && $accion === 'documento-archivo') {
        // Descarga protegida: solo el dueño del documento o el equipo de Skilly.
        $cuenta = usuarioAutenticado($db, ['profesional', 'administrador', 'fundador']);
        $docId = (string) ($_GET['id'] ?? '');
        $stmt = $db->prepare('SELECT * FROM documentos_respaldo WHERE id = :id');
        $stmt->execute(['id' => $docId]);
        $doc = $stmt->fetch();
        if (!$doc) {
            responderError('no_encontrado', 'No encontramos ese documento.', 404);
        }
        if ($cuenta['rol'] === 'profesional' && $doc['profesional_id'] !== $cuenta['profesional_id']) {
            responderError('no_autorizado', 'No puedes ver documentos de otro profesional.', 403);
        }
        if (empty($doc['ruta_archivo'])) {
            responderError(
                'no_encontrado',
                'Este documento se registró antes de que existiera la subida de archivos y no tiene archivo asociado.',
                404,
            );
        }
        $ruta =
            rtrim((string) skillyConfig()['directorio_subidas'], '/\\') .
            DIRECTORY_SEPARATOR .
            basename((string) $doc['ruta_archivo']);
        responderArchivo(
            $ruta,
            (string) $doc['nombre_archivo'],
            (string) ($doc['tipo_mime'] ?: 'application/octet-stream'),
        );
    }

    if ($metodo === 'GET' && $accion === 'listado') {
        usuarioAutenticado($db, ['administrador', 'fundador']);
        $ids = $db->query('SELECT id FROM profesionales ORDER BY fecha_ingreso DESC')->fetchAll(PDO::FETCH_COLUMN);
        // Carga por lotes (5 consultas en total, no 5 por profesional).
        $lote = obtenerProfesionalesLote($db, $ids);
        responderJSON(array_values(array_filter(array_map(fn($id) => $lote[$id] ?? null, $ids))));
    }

    if ($metodo === 'GET' && isset($_GET['id'])) {
        $profId = (string) $_GET['id'];
        $prof = obtenerProfesional($db, $profId);
        if (!$prof) {
            responderError('no_encontrado', 'Profesional no encontrado.', 404);
        }
        // La ficha es pública solo si Skilly validó el perfil. Si no, la ven el propio
        // profesional, el equipo de Skilly y las organizaciones que ya lo contrataron.
        if (!$prof['validadoPorSkilly']) {
            $permitido = false;
            if (obtenerToken()) {
                $cuenta = usuarioAutenticado($db);
                $permitido =
                    in_array($cuenta['rol'], ['administrador', 'fundador'], true) ||
                    ($cuenta['rol'] === 'profesional' && $cuenta['profesional_id'] === $profId) ||
                    ($cuenta['rol'] === 'organizacion' &&
                        existeRegistro(
                            $db,
                            'SELECT 1 FROM reservas WHERE profesional_id = :p AND organizacion_id = :o',
                            ['p' => $profId, 'o' => $cuenta['organizacion_id']],
                        ));
            }
            if (!$permitido) {
                responderError('no_encontrado', 'Profesional no encontrado.', 404);
            }
        }
        responderJSON($prof);
    }

    if ($metodo === 'DELETE' && isset($_GET['id'])) {
        // Se borra la ficha y también su cuenta de acceso, para no dejar cuentas huérfanas.
        usuarioAutenticado($db, ['fundador']);
        $profId = (string) $_GET['id'];
        if (existeRegistro($db, 'SELECT 1 FROM reservas WHERE profesional_id = :id', ['id' => $profId])) {
            responderError('conflicto', 'El profesional tiene contrataciones registradas y no se puede eliminar. Puedes pausar sus servicios.', 409);
        }
        // Las rutas se leen ANTES de borrar, pero los archivos se eliminan del disco solo
        // DESPUÉS del commit: si la transacción falla, los documentos siguen intactos (INC-07).
        $archivos = rutasArchivosProfesional($db, $profId);
        $db->beginTransaction();
        $stmt = $db->prepare('DELETE FROM cuentas WHERE profesional_id = :id');
        $stmt->execute(['id' => $profId]);
        $stmt = $db->prepare('DELETE FROM profesionales WHERE id = :id');
        $stmt->execute(['id' => $profId]);
        if (!$stmt->rowCount()) {
            $db->rollBack();
            responderError('no_encontrado', 'No encontramos al profesional.', 404);
        }
        $db->commit();
        borrarArchivos($archivos);
        responderJSON(['ok' => true]);
    }

    responderError('validacion', 'Operación no permitida para profesionales.', 405);
} catch (PDOException $e) {
    error_log('API profesionales: ' . $e->getMessage());
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    if ($e->getCode() === '23000') {
        responderError(
            'conflicto',
            'Uno de los datos ya está registrado o se encuentra relacionado con otros registros.',
            409,
        );
    }
    responderError('red', 'No se pudo completar la operación en la base de datos.', 500);
} catch (Throwable $e) {
    error_log('API profesionales: ' . $e->getMessage());
    responderError('red', 'Ocurrió un error al procesar el perfil profesional.', 500);
}

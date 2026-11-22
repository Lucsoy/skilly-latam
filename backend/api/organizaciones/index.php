<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/helpers.php';

try {
    $db = conectarDB();
    $metodo = $_SERVER['REQUEST_METHOD'];
    $accion = $_GET['accion'] ?? '';

    // Crear organización y cuenta en una sola transacción.
    if ($metodo === 'POST' && $accion === '') {
        $data = leerJSON();
        $faltante = camposFaltantes($data, [
            'razonSocial',
            'rut',
            'giro',
            'tamano',
            'nombreContacto',
            'emailContacto',
            'contrasena',
        ]);
        if ($faltante) {
            responderError('validacion', "Falta el campo: $faltante");
        }
        // Validaciones de servidor: replican las del formulario (zod) porque el
        // cliente puede omitirlas llamando directamente a la API (INC-09).
        if ($error = errorContrasena((string) $data['contrasena'])) {
            responderError('validacion', $error);
        }
        if (!in_array($data['tamano'], ['1-10', '11-50', '51-200', '201-500', '500+'], true)) {
            responderError('validacion', 'El tamaño de organización no es válido.');
        }
        $email = strtolower(trim((string) $data['emailContacto']));
        if (!correoValido($email)) {
            responderError('validacion', 'El correo electrónico no es válido.');
        }
        if (!rutValido((string) $data['rut'])) {
            responderError('validacion', 'El RUT no es válido. Revisa el dígito verificador.');
        }
        exigirLargos($data, ['razonSocial' => 255, 'giro' => 255, 'nombreContacto' => 255, 'emailContacto' => 255]);
        $consentimiento = exigirConsentimiento($db, $data);
        $check = $db->prepare('SELECT id FROM cuentas WHERE email = :email');
        $check->execute(['email' => $email]);
        if ($check->fetch()) {
            responderError('conflicto', 'Ya existe una cuenta con ese correo.', 409);
        }
        // Búsqueda indexada por la columna generada rut_normalizado (UNIQUE): un RUT con o
        // sin puntos es el mismo. Antes se recorría la tabla completa en PHP (INC-14).
        $check = $db->prepare('SELECT id FROM organizaciones WHERE rut_normalizado = :rut LIMIT 1');
        $check->execute(['rut' => rutLimpio((string) $data['rut'])]);
        if ($check->fetch()) {
            responderError('conflicto', 'Ese RUT ya está registrado en Skilly.', 409);
        }
        $orgId = generarId('org');
        $cuentaId = generarId('cta');
        $ahora = date('Y-m-d H:i:s');
        try {
            $db->beginTransaction();
            $stmt = $db->prepare(
                'INSERT INTO organizaciones (id, razon_social, rut, giro, tamano, nombre_contacto, email_contacto, consentimiento_aceptado, consentimiento_fecha, consentimiento_version, creada_en) VALUES (:id,:razon,:rut,:giro,:tamano,:nombre,:email,1,:fecha,:version,:creada)',
            );
            $stmt->execute([
                'id' => $orgId,
                'razon' => trim((string) $data['razonSocial']),
                // Forma canónica 12345678-5: el mismo RUT no puede quedar guardado con dos formatos.
                'rut' => rutCanonico((string) $data['rut']),
                'giro' => trim((string) $data['giro']),
                'tamano' => $data['tamano'],
                'nombre' => trim((string) $data['nombreContacto']),
                'email' => $email,
                // Fecha y versión del consentimiento las fija el servidor (no se aceptan del cliente).
                'fecha' => $consentimiento['fecha'],
                'version' => $consentimiento['version'],
                'creada' => $ahora,
            ]);
            $stmt = $db->prepare(
                'INSERT INTO cuentas (id,email,contrasena,rol,nombre,organizacion_id) VALUES (:id,:email,:pass,\'organizacion\',:nombre,:org)',
            );
            $stmt->execute([
                'id' => $cuentaId,
                'email' => $email,
                'pass' => password_hash((string) $data['contrasena'], PASSWORD_DEFAULT),
                'nombre' => trim((string) $data['nombreContacto']),
                'org' => $orgId,
            ]);
            $token = emitirTokenSesion($db, $cuentaId);
            $db->commit();
            $cuenta = [
                'id' => $cuentaId,
                'email' => $email,
                'contrasena' => '',
                'rol' => 'organizacion',
                'nombre' => trim((string) $data['nombreContacto']),
                'organizacion_id' => $orgId,
                'profesional_id' => null,
            ];
            responderJSON(construirSesion($db, $cuenta, $token), 201);
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
    }

    if ($metodo === 'GET' && $accion === 'me') {
        $cuenta = usuarioAutenticado($db, ['organizacion']);
        $org = obtenerOrganizacion($db, $cuenta['organizacion_id'] ?? null);
        if (!$org) {
            responderError('no_encontrado', 'No encontramos tu organización.', 404);
        }
        responderJSON($org);
    }

    if ($metodo === 'PUT' && ($accion === 'me' || $accion === '')) {
        $cuenta = usuarioAutenticado($db, ['organizacion']);
        $orgId = $cuenta['organizacion_id'] ?? null;
        if (!$orgId) {
            responderError('no_encontrado', 'La cuenta no tiene una organización asociada.', 404);
        }
        $data = leerJSON();
        $campos = [
            'razonSocial' => 'razon_social',
            'giro' => 'giro',
            'tamano' => 'tamano',
            'nombreContacto' => 'nombre_contacto',
            'emailContacto' => 'email_contacto',
            'telefono' => 'telefono',
            'sitioWeb' => 'sitio_web',
            'descripcion' => 'descripcion',
            'direccion' => 'direccion',
        ];
        exigirLargos($data, [
            'razonSocial' => 255, 'giro' => 255, 'nombreContacto' => 255, 'emailContacto' => 255,
            'telefono' => 50, 'descripcion' => 2000, 'direccion' => 255,
        ]);
        $sets = [];
        $params = ['id' => $orgId];
        foreach ($campos as $json => $col) {
            if (array_key_exists($json, $data)) {
                if ($data[$json] !== null && !is_scalar($data[$json])) {
                    responderError('validacion', "El campo $json no tiene un formato válido.");
                }
                if (
                    $json === 'tamano' &&
                    !in_array($data[$json], ['1-10', '11-50', '51-200', '201-500', '500+'], true)
                ) {
                    responderError('validacion', 'El tamaño de organización no es válido.');
                }
                $sets[] = "$col = :$json";
                $params[$json] = is_string($data[$json]) ? trim($data[$json]) : $data[$json];
            }
        }
        if (!$sets) {
            responderJSON(obtenerOrganizacion($db, $orgId));
        }
        if (array_key_exists('sitioWeb', $data)) {
            // Solo http/https: el sitio se muestra como enlace en la ficha de la organización.
            $params['sitioWeb'] = urlOpcional($data, 'sitioWeb');
        }
        if (array_key_exists('emailContacto', $data)) {
            $nuevoEmail = strtolower(trim((string) $data['emailContacto']));
            if (!correoValido($nuevoEmail)) {
                responderError('validacion', 'El correo electrónico no es válido.');
            }
            $params['emailContacto'] = $nuevoEmail;
            if (existeRegistro($db, 'SELECT 1 FROM cuentas WHERE email = :email AND id <> :id', ['email' => $nuevoEmail, 'id' => $cuenta['id']])) {
                responderError('conflicto', 'Ese correo ya pertenece a otra cuenta.', 409);
            }
        }
        foreach (['razonSocial', 'giro', 'nombreContacto'] as $obligatorio) {
            if (array_key_exists($obligatorio, $data) && trim((string) $data[$obligatorio]) === '') {
                responderError('validacion', "El campo $obligatorio no puede quedar vacío.");
            }
        }
        try {
            $db->beginTransaction();
            $stmt = $db->prepare('UPDATE organizaciones SET ' . implode(', ', $sets) . ' WHERE id = :id');
            $stmt->execute($params);
            if (!empty($data['emailContacto'])) {
                $email = strtolower(trim((string) $data['emailContacto']));
                $stmt = $db->prepare('UPDATE cuentas SET email = :email, nombre = :nombre WHERE id = :cuenta');
                $stmt->execute([
                    'email' => $email,
                    'nombre' => trim((string) ($data['nombreContacto'] ?? $cuenta['nombre'])),
                    'cuenta' => $cuenta['id'],
                ]);
            } elseif (!empty($data['nombreContacto'])) {
                $stmt = $db->prepare('UPDATE cuentas SET nombre = :nombre WHERE id = :id');
                $stmt->execute(['nombre' => trim((string) $data['nombreContacto']), 'id' => $cuenta['id']]);
            }
            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
        $org = obtenerOrganizacion($db, $orgId);
        responderJSON($org);
    }

    if ($metodo === 'GET' && $accion === 'listado') {
        usuarioAutenticado($db, ['administrador', 'fundador']);
        $ids = $db->query('SELECT id FROM organizaciones ORDER BY creada_en DESC')->fetchAll(PDO::FETCH_COLUMN);
        $lista = [];
        foreach ($ids as $id) {
            $x = obtenerOrganizacion($db, $id);
            if ($x) {
                $lista[] = $x;
            }
        }
        responderJSON($lista);
    }

    if ($metodo === 'DELETE' && isset($_GET['id'])) {
        // Se borra la organización y sus cuentas de acceso (antes quedaban huérfanas: INC-07).
        // Si tiene contrataciones, no se borra para conservar el historial (FK RESTRICT).
        usuarioAutenticado($db, ['fundador']);
        $orgId = (string) $_GET['id'];
        if (existeRegistro($db, 'SELECT 1 FROM reservas WHERE organizacion_id = :id', ['id' => $orgId])) {
            responderError('conflicto', 'La organización tiene contrataciones registradas y no se puede eliminar.', 409);
        }
        $db->beginTransaction();
        $db->prepare('DELETE FROM cuentas WHERE organizacion_id = :id')->execute(['id' => $orgId]);
        $stmt = $db->prepare('DELETE FROM organizaciones WHERE id = :id');
        $stmt->execute(['id' => $orgId]);
        if (!$stmt->rowCount()) {
            $db->rollBack();
            responderError('no_encontrado', 'No encontramos la organización.', 404);
        }
        $db->commit();
        responderJSON(['ok' => true]);
    }

    responderError('validacion', 'Operación no permitida para organizaciones.', 405);
} catch (PDOException $e) {
    error_log('API organizaciones: ' . $e->getMessage());
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    if ($e->getCode() === '23000') {
        responderError('conflicto', 'El correo, RUT u otro dato ya está registrado.', 409);
    }
    responderError('red', 'No se pudo completar la operación en la base de datos.', 500);
} catch (Throwable $e) {
    error_log('API organizaciones: ' . $e->getMessage());
    responderError('red', 'Ocurrió un error al procesar la organización.', 500);
}

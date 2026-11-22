<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/condiciones_reserva.php';
/** Funciones comunes de la API de Skilly. */

/** Hash de la contraseña inicial publicada en database/skilly.sql (cuenta fundadora). */
const SKILLY_HASH_CONTRASENA_INICIAL = '$2y$10$CmwcKFLzDGwsyZlYoxhepelzciwIqKRuEsNiPLbmAY4jACBb5/w1i';

function leerJSON(): array {
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    return is_array($data) ? $data : [];
}

function responderJSON($data, int $codigo = 200): void {
    http_response_code($codigo);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

function responderError(string $codigoError, string $mensaje, int $httpCode = 400): void {
    responderJSON(['codigo' => $codigoError, 'mensaje' => $mensaje], $httpCode);
}

function camposFaltantes(array $data, array $requeridos): ?string {
    foreach ($requeridos as $campo) {
        if (!array_key_exists($campo, $data) || (is_string($data[$campo]) && trim($data[$campo]) === '')) {
            return $campo;
        }
    }
    return null;
}

function obtenerToken(): ?string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        return trim($matches[1]);
    }
    return null;
}

function generarId(string $prefijo = 'id'): string {
    return $prefijo . '-' . bin2hex(random_bytes(8));
}

function registrarEventoHistorialCompartido(
    PDO $db,
    string $reservaId,
    array $actor,
    ?string $anterior,
    string $nuevo,
    ?string $motivo = null,
    ?string $detalle = null,
): void {
    $q = $db->prepare(
        'INSERT INTO historial_reservas (id,reserva_id,fecha,actor_tipo,actor_nombre,estado_anterior,estado_nuevo,motivo,detalle) VALUES (:id,:res,NOW(),:tipo,:nombre,:ant,:nuevo,:motivo,:detalle)',
    );
    $q->execute([
        'id' => generarId('hist'),
        'res' => $reservaId,
        'tipo' => $actor['tipo'] ?? 'sistema',
        'nombre' => $actor['nombre'] ?? 'Sistema Skilly',
        'ant' => $anterior,
        'nuevo' => $nuevo,
        'motivo' => $motivo,
        'detalle' => $detalle,
    ]);
}

/**
 * Valida token, vigencia y, cuando corresponde, rol.
 *
 * Mientras una cuenta siga usando la contraseña inicial publicada en la documentación
 * de instalación, solo puede consultar su sesión y cambiarla ($permitirClaveInicial):
 * el resto de la API responde 403 con el código "cambiar_contrasena".
 */
function usuarioAutenticado(PDO $db, array $roles = [], bool $permitirClaveInicial = false): array {
    $token = obtenerToken();
    if (!$token) {
        responderError('no_autorizado', 'Debes iniciar sesión para continuar.', 401);
    }
    $stmt = $db->prepare(
        'SELECT c.* FROM sesiones_autenticacion s JOIN cuentas c ON c.id = s.cuenta_id WHERE s.token_hash = :hash AND s.expira_en > NOW() LIMIT 1',
    );
    $stmt->execute(['hash' => hash('sha256', $token)]);
    $cuenta = $stmt->fetch();
    if (!$cuenta) {
        responderError('no_autorizado', 'La sesión expiró. Vuelve a ingresar.', 401);
    }
    if (!$permitirClaveInicial && hash_equals(SKILLY_HASH_CONTRASENA_INICIAL, (string) $cuenta['contrasena'])) {
        responderError(
            'cambiar_contrasena',
            'Esta cuenta aún usa la contraseña inicial de instalación. Cámbiala en "Mi cuenta" para continuar.',
            403,
        );
    }
    if ($roles && !in_array($cuenta['rol'], $roles, true)) {
        responderError('no_autorizado', 'No tienes permisos para realizar esta acción.', 403);
    }
    return $cuenta;
}

/**
 * Emite un token de sesión aleatorio de 256 bits. Al cliente se le entrega el
 * token; en la base solo se guarda su hash SHA-256, de modo que una copia de
 * la tabla no permite suplantar sesiones. Aprovecha para purgar las sesiones
 * vencidas (consulta indexada por idx_sesion_expira).
 */
function emitirTokenSesion(PDO $db, string $cuentaId): string {
    $db->exec('DELETE FROM sesiones_autenticacion WHERE expira_en < NOW()');
    $token = bin2hex(random_bytes(32));
    $stmt = $db->prepare(
        'INSERT INTO sesiones_autenticacion (token_hash, cuenta_id, creada_en, expira_en) VALUES (:hash, :cuenta, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))',
    );
    $stmt->execute(['hash' => hash('sha256', $token), 'cuenta' => $cuentaId]);
    return $token;
}

function revocarTokenActual(PDO $db): void {
    $token = obtenerToken();
    if (!$token) {
        return;
    }
    $stmt = $db->prepare('DELETE FROM sesiones_autenticacion WHERE token_hash = :hash');
    $stmt->execute(['hash' => hash('sha256', $token)]);
}

function obtenerOrganizacion(PDO $db, ?string $id): ?array {
    if (!$id) {
        return null;
    }
    $stmt = $db->prepare('SELECT * FROM organizaciones WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $o = $stmt->fetch();
    if (!$o) {
        return null;
    }
    return [
        'id' => $o['id'],
        'razonSocial' => $o['razon_social'],
        'rut' => $o['rut'],
        'giro' => $o['giro'],
        'tamano' => $o['tamano'],
        'nombreContacto' => $o['nombre_contacto'],
        'emailContacto' => $o['email_contacto'],
        'telefono' => $o['telefono'],
        'sitioWeb' => $o['sitio_web'],
        'descripcion' => $o['descripcion'],
        'direccion' => $o['direccion'],
        'consentimiento' => [
            'aceptado' => (bool) $o['consentimiento_aceptado'],
            'fecha' => $o['consentimiento_fecha'],
            'version' => $o['consentimiento_version'] ?? '2026-01',
        ],
        'creadaEn' => $o['creada_en'],
    ];
}

/**
 * Ejecuta "SELECT ... WHERE columna IN (...)" con parámetros posicionales.
 * Devuelve todas las filas; con una lista vacía no consulta la base.
 */
function consultarEnLote(PDO $db, string $sql, array $ids): array {
    $ids = array_values(array_unique($ids));
    if (!$ids) {
        return [];
    }
    $marcas = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $db->prepare(str_replace('(:ids)', "($marcas)", $sql));
    $stmt->execute($ids);
    return $stmt->fetchAll();
}

/**
 * Fichas públicas de varios profesionales con 5 consultas en total
 * (antes eran 5 consultas POR profesional). Devuelve [id => ficha].
 */
function obtenerProfesionalesLote(PDO $db, array $ids): array {
    $filas = consultarEnLote($db, 'SELECT * FROM profesionales WHERE id IN (:ids)', $ids);
    if (!$filas) {
        return [];
    }
    $base = [];
    foreach ($filas as $p) {
        $base[$p['id']] = [
            'id' => $p['id'],
            'nombre' => $p['nombre'],
            'apellido' => $p['apellido'],
            'titulo' => $p['titulo'],
            'ciudad' => $p['ciudad'],
            'presentacion' => $p['presentacion'],
            'formacion' => [],
            'experiencia' => [],
            'habilidades' => [],
            'linkedin' => $p['linkedin'],
            'portafolio' => $p['portafolio'],
            'validadoPorSkilly' => (bool) $p['validado_por_skilly'],
            'insignias' => [],
            'fechaIngreso' => $p['fecha_ingreso'],
        ];
    }
    $encontrados = array_keys($base);
    foreach (
        consultarEnLote(
            $db,
            'SELECT profesional_id, descripcion FROM profesional_formacion WHERE profesional_id IN (:ids) ORDER BY id',
            $encontrados,
        )
        as $f
    ) {
        $base[$f['profesional_id']]['formacion'][] = $f['descripcion'];
    }
    foreach (
        consultarEnLote(
            $db,
            'SELECT profesional_id, cargo, organizacion, periodo FROM profesional_experiencia WHERE profesional_id IN (:ids) ORDER BY id',
            $encontrados,
        )
        as $e
    ) {
        $base[$e['profesional_id']]['experiencia'][] = [
            'cargo' => $e['cargo'],
            'organizacion' => $e['organizacion'],
            'periodo' => $e['periodo'],
        ];
    }
    foreach (
        consultarEnLote(
            $db,
            'SELECT profesional_id, habilidad FROM profesional_habilidades WHERE profesional_id IN (:ids) ORDER BY id',
            $encontrados,
        )
        as $h
    ) {
        $base[$h['profesional_id']]['habilidades'][] = $h['habilidad'];
    }
    foreach (
        consultarEnLote(
            $db,
            'SELECT profesional_id, insignia FROM profesional_insignias WHERE profesional_id IN (:ids) ORDER BY id',
            $encontrados,
        )
        as $i
    ) {
        $base[$i['profesional_id']]['insignias'][] = $i['insignia'];
    }
    return $base;
}

function obtenerProfesional(PDO $db, ?string $id): ?array {
    if (!$id) {
        return null;
    }
    return obtenerProfesionalesLote($db, [$id])[$id] ?? null;
}

/** Convierte una fila de solicitudes_revision_servicio al formato del frontend. */
function revisionDesdeFila(array $r): array {
    return [
        'id' => $r['id'],
        'estado' => $r['estado'],
        'mensaje' => $r['mensaje'],
        'solicitadaEn' => $r['solicitada_en'],
        'resueltaEn' => $r['resuelta_en'],
        'comentarioAdmin' => $r['comentario_admin'],
        'revisadoPor' => $r['revisado_por'],
    ];
}

/**
 * Una revisión APROBADA deja de valer si el profesional editó el servicio después.
 * En ese caso se trata como si no hubiera revisión (puede volver a pedirla).
 */
function revisionVigente(?array $revision, ?string $servicioActualizadoEn): ?array {
    if (
        $revision &&
        $revision['estado'] === 'aprobada' &&
        $servicioActualizadoEn &&
        $revision['resueltaEn'] &&
        strtotime($servicioActualizadoEn) > strtotime($revision['resueltaEn'])
    ) {
        return null;
    }
    return $revision;
}

/** Última solicitud de revisión vigente de un servicio (o null). */
function obtenerRevisionServicio(PDO $db, string $servicioId): ?array {
    $stmt = $db->prepare('SELECT r.*, s.actualizado_en AS servicio_actualizado_en
        FROM solicitudes_revision_servicio r JOIN servicios s ON s.id = r.servicio_id
        WHERE r.servicio_id = :id ORDER BY r.solicitada_en DESC, r.id DESC LIMIT 1');
    $stmt->execute(['id' => $servicioId]);
    $r = $stmt->fetch();
    return $r ? revisionVigente(revisionDesdeFila($r), $r['servicio_actualizado_en']) : null;
}

/**
 * Servicios completos (con entregables, modalidades, etiquetas y revisión) en
 * 5 consultas en total. Devuelve [id => servicio] respetando el orden pedido.
 */
function obtenerServiciosLote(PDO $db, array $ids): array {
    $filas = consultarEnLote($db, 'SELECT * FROM servicios WHERE id IN (:ids)', $ids);
    $porId = [];
    $actualizado = [];
    foreach ($filas as $s) {
        $porId[$s['id']] = [
            'id' => $s['id'],
            'profesionalId' => $s['profesional_id'],
            'categoriaId' => $s['categoria_id'],
            'subcategoriaId' => $s['subcategoria_id'],
            'titulo' => $s['titulo'],
            'descripcion' => $s['descripcion'],
            'entregables' => [],
            'duracionEstimada' => $s['duracion_estimada'],
            'duracionSesionMinutos' => (int) $s['duracion_sesion_minutos'],
            'modalidades' => [],
            'precio' => (int) $s['precio'],
            'etiquetas' => [],
            'publicado' => (bool) $s['publicado'],
            'revision' => null,
        ];
        $actualizado[$s['id']] = $s['actualizado_en'] ?? null;
    }
    if (!$porId) {
        return [];
    }
    $encontrados = array_keys($porId);
    foreach (
        consultarEnLote(
            $db,
            'SELECT servicio_id, entregable FROM servicio_entregables WHERE servicio_id IN (:ids) ORDER BY id',
            $encontrados,
        )
        as $f
    ) {
        $porId[$f['servicio_id']]['entregables'][] = $f['entregable'];
    }
    foreach (
        consultarEnLote(
            $db,
            'SELECT servicio_id, modalidad FROM servicio_modalidades WHERE servicio_id IN (:ids) ORDER BY id',
            $encontrados,
        )
        as $f
    ) {
        $porId[$f['servicio_id']]['modalidades'][] = $f['modalidad'];
    }
    foreach (
        consultarEnLote(
            $db,
            'SELECT servicio_id, etiqueta FROM servicio_etiquetas WHERE servicio_id IN (:ids) ORDER BY id',
            $encontrados,
        )
        as $f
    ) {
        $porId[$f['servicio_id']]['etiquetas'][] = $f['etiqueta'];
    }
    // Ordenadas de la más antigua a la más reciente: la última que se asigna es la vigente.
    foreach (
        consultarEnLote(
            $db,
            'SELECT * FROM solicitudes_revision_servicio WHERE servicio_id IN (:ids) ORDER BY solicitada_en, id',
            $encontrados,
        )
        as $r
    ) {
        $porId[$r['servicio_id']]['revision'] = revisionDesdeFila($r);
    }
    $resultado = [];
    foreach ($ids as $id) {
        if (isset($porId[$id])) {
            $porId[$id]['revision'] = revisionVigente($porId[$id]['revision'], $actualizado[$id]);
            $resultado[$id] = $porId[$id];
        }
    }
    return $resultado;
}

/** Rutas absolutas de los documentos subidos por un profesional. */
function rutasArchivosProfesional(PDO $db, string $profesionalId): array {
    $stmt = $db->prepare(
        'SELECT ruta_archivo FROM documentos_respaldo WHERE profesional_id = :id AND ruta_archivo IS NOT NULL',
    );
    $stmt->execute(['id' => $profesionalId]);
    $directorio = rtrim((string) skillyConfig()['directorio_subidas'], '/\\');
    // basename() impide que una ruta manipulada salga de la carpeta de subidas.
    return array_map(
        fn($ruta) => $directorio . DIRECTORY_SEPARATOR . basename((string) $ruta),
        $stmt->fetchAll(PDO::FETCH_COLUMN),
    );
}

/** Elimina del disco los archivos indicados (llamar después del commit). */
function borrarArchivos(array $rutas): void {
    foreach ($rutas as $archivo) {
        if (is_file($archivo)) {
            @unlink($archivo);
        }
    }
}

function obtenerPerfilPrivado(PDO $db, string $profesionalId): ?array {
    $stmt = $db->prepare('SELECT * FROM perfiles_profesionales WHERE profesional_id = :id LIMIT 1');
    $stmt->execute(['id' => $profesionalId]);
    $p = $stmt->fetch();
    if (!$p) {
        return null;
    }
    $stmt = $db->prepare(
        'SELECT id, tipo, nombre_archivo, tamano_bytes, subido_en, estado, ruta_archivo FROM documentos_respaldo WHERE profesional_id = :id ORDER BY subido_en DESC',
    );
    $stmt->execute(['id' => $profesionalId]);
    $docs = [];
    foreach ($stmt->fetchAll() as $d) {
        $docs[] = [
            'id' => $d['id'],
            'tipo' => $d['tipo'],
            'nombreArchivo' => $d['nombre_archivo'],
            'tamanoBytes' => (int) $d['tamano_bytes'],
            'subidoEn' => $d['subido_en'],
            'estado' => $d['estado'],
            'tieneArchivo' => !empty($d['ruta_archivo']),
        ];
    }
    return [
        'profesionalId' => $p['profesional_id'],
        'email' => $p['email'],
        'areaPrincipal' => $p['area_principal'],
        'estadoValidacion' => $p['estado_validacion'],
        'validadoEn' => $p['validado_en'],
        'documentos' => $docs,
        'comentarioValidacion' => $p['comentario_validacion'] ?? null,
        'consentimiento' => [
            'aceptado' => (bool) $p['consentimiento_aceptado'],
            'fecha' => $p['consentimiento_fecha'],
            'version' => $p['consentimiento_version'] ?? '2026-01',
        ],
    ];
}


function construirSesion(PDO $db, array $cuenta, string $token): array {
    return [
        'token' => $token,
        'usuario' => [
            'id' => $cuenta['id'],
            'nombre' => $cuenta['nombre'],
            'email' => $cuenta['email'],
            'rol' => $cuenta['rol'],
            // La interfaz insiste en cambiarla mientras siga siendo la contraseña de instalación.
            'debeCambiarContrasena' => hash_equals(SKILLY_HASH_CONTRASENA_INICIAL, (string) ($cuenta['contrasena'] ?? '')),
        ],
        'organizacion' => obtenerOrganizacion($db, $cuenta['organizacion_id'] ?? null),
        'profesional' => obtenerProfesional($db, $cuenta['profesional_id'] ?? null),
    ];
}

function cuentaDesdeSesion(PDO $db, array $cuenta): array {
    return construirSesion($db, $cuenta, obtenerToken() ?? '');
}

function usuarioIdEntidad(array $cuenta): ?string {
    if (($cuenta['rol'] ?? '') === 'organizacion') {
        return $cuenta['organizacion_id'] ?? null;
    }
    if (($cuenta['rol'] ?? '') === 'profesional') {
        return $cuenta['profesional_id'] ?? null;
    }
    return $cuenta['id'] ?? null;
}

function fechaISOaSQL(?string $fecha): ?string {
    if (!$fecha) {
        return null;
    }
    try {
        // Un ISO con zona (p. ej. "…Z" desde el navegador) se lleva a la hora del negocio,
        // que es como se guardan todas las fechas en la base.
        return (new DateTime($fecha))
            ->setTimezone(new DateTimeZone(date_default_timezone_get()))
            ->format('Y-m-d H:i:s');
    } catch (Throwable $e) {
        return null;
    }
}

function aBooleano($valor): bool {
    return filter_var($valor, FILTER_VALIDATE_BOOLEAN);
}

/** IP del cliente (para el límite de intentos de inicio de sesión). */
function ipCliente(): string {
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? 'desconocida'), 0, 45);
}

/**
 * Envía un archivo guardado en disco y termina la ejecución.
 * Reemplaza la cabecera JSON que pone cors.php.
 */
function responderArchivo(string $ruta, string $nombre, string $mime): void {
    if (!is_file($ruta)) {
        responderError('no_encontrado', 'El archivo ya no está disponible en el servidor.', 404);
    }
    $nombreSeguro = preg_replace('/[^A-Za-z0-9._ -]/', '_', $nombre) ?: 'documento';
    // La CSP restrictiva de cors.php es para JSON; un PDF necesita su visor.
    header_remove('Content-Security-Policy');
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($ruta));
    header('Content-Disposition: inline; filename="' . $nombreSeguro . '"');
    header('X-Content-Type-Options: nosniff');
    readfile($ruta);
    exit();
}

// ---------------------------------------------------------------------------
// Validaciones de servidor (no se confía en las validaciones del frontend)
// ---------------------------------------------------------------------------

/** Deja solo dígitos y K mayúscula: "12.345.678-k" → "12345678K". */
function rutLimpio(string $rut): string {
    return strtoupper(preg_replace('/[^0-9kK]/', '', $rut) ?? '');
}

/** Valida un RUT chileno con su dígito verificador (algoritmo módulo 11). */
function rutValido(string $rut): bool {
    $limpio = rutLimpio($rut);
    if (!preg_match('/^(\d{7,8})([0-9K])$/', $limpio, $m)) {
        return false;
    }
    $suma = 0;
    $multiplicador = 2;
    foreach (array_reverse(str_split($m[1])) as $digito) {
        $suma += (int) $digito * $multiplicador;
        $multiplicador = $multiplicador === 7 ? 2 : $multiplicador + 1;
    }
    $resto = 11 - ($suma % 11);
    $esperado = $resto === 11 ? '0' : ($resto === 10 ? 'K' : (string) $resto);
    return $esperado === $m[2];
}

/**
 * Política de contraseñas común a registro, creación de administradores y
 * cambio de contraseña. Devuelve el mensaje de error o null si es válida.
 */
function errorContrasena(string $clave): ?string {
    if (strlen($clave) < 8 || !preg_match('/[A-Za-z]/', $clave) || !preg_match('/\d/', $clave)) {
        return 'La contraseña debe tener al menos 8 caracteres, con letras y números.';
    }
    if (strlen($clave) > 72) {
        // bcrypt ignora lo que pasa de 72 bytes: se rechaza para no dar una falsa sensación de seguridad.
        return 'La contraseña no puede superar los 72 caracteres.';
    }
    return null;
}

function correoValido(string $correo): bool {
    return strlen($correo) <= 255 && filter_var($correo, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Rechaza con 400 los textos más largos que su columna (antes la base respondía con un
 * error 500). $limites: ['campoDelJSON' => largoMáximo]. Solo revisa los campos presentes.
 */
function exigirLargos(array $data, array $limites): void {
    foreach ($limites as $campo => $maximo) {
        if (!array_key_exists($campo, $data) || $data[$campo] === null) {
            continue;
        }
        $valores = is_array($data[$campo]) ? $data[$campo] : [$data[$campo]];
        foreach ($valores as $valor) {
            if (is_array($valor)) {
                continue;
            }
            if (mb_strlen(trim((string) $valor)) > $maximo) {
                responderError('validacion', "El campo $campo admite como máximo $maximo caracteres.");
            }
        }
    }
}

/**
 * Valida un enlace opcional: vacío, o una URL http/https bien formada de hasta 255
 * caracteres. Impide guardar esquemas como "javascript:" que luego se mostrarían como
 * enlace en la ficha pública. Devuelve la URL limpia o null.
 */
function urlOpcional(array $data, string $campo): ?string {
    $url = trim((string) ($data[$campo] ?? ''));
    if ($url === '') {
        return null;
    }
    if (!preg_match('#^https?://#i', $url)) {
        $url = 'https://' . $url;
    }
    $partes = parse_url($url);
    if (
        mb_strlen($url) > 255 ||
        filter_var($url, FILTER_VALIDATE_URL) === false ||
        !in_array(strtolower((string) ($partes['scheme'] ?? '')), ['http', 'https'], true) ||
        empty($partes['host']) ||
        !str_contains((string) $partes['host'], '.')
    ) {
        responderError('validacion', "El enlace de $campo no es una dirección web válida (http o https).");
    }
    return $url;
}

/** RUT en forma canónica "12345678-5": así un mismo RUT nunca se guarda con dos formatos. */
function rutCanonico(string $rut): string {
    $limpio = rutLimpio($rut);
    return substr($limpio, 0, -1) . '-' . substr($limpio, -1);
}

/**
 * Consentimiento informado: el servidor exige que llegue aceptado de forma explícita y
 * registra su propia fecha y la versión vigente de la política (no las del cliente).
 * Devuelve ['fecha' => ..., 'version' => ...].
 */
function exigirConsentimiento(PDO $db, array $data): array {
    if (($data['consentimiento'] ?? null) !== true) {
        responderError('validacion', 'Debes aceptar la política de tratamiento de datos para crear la cuenta.');
    }
    $version = $db->query('SELECT version_politica_datos FROM configuracion_plataforma WHERE id=1')->fetchColumn();
    return ['fecha' => date('Y-m-d H:i:s'), 'version' => $version ?: '2026-01'];
}

// ---------------------------------------------------------------------------
// Contrataciones: código correlativo, elegibilidad y bloques de agenda
// ---------------------------------------------------------------------------

/**
 * Siguiente código SK-AAAA-NNNN. Debe llamarse DENTRO de la transacción que crea la
 * reserva: el INSERT … ON DUPLICATE KEY UPDATE bloquea la fila del año hasta el commit,
 * así dos altas simultáneas obtienen números distintos. No depende de COUNT(*), por lo
 * que nunca repite un número ya usado.
 */
function siguienteCodigoReserva(PDO $db): string {
    $anio = (int) date('Y');
    $q = $db->prepare(
        'INSERT INTO contadores_reserva (anio, ultimo) VALUES (:anio, 1) ON DUPLICATE KEY UPDATE ultimo = ultimo + 1',
    );
    $q->execute(['anio' => $anio]);
    $q = $db->prepare('SELECT ultimo FROM contadores_reserva WHERE anio = :anio');
    $q->execute(['anio' => $anio]);
    return sprintf('SK-%d-%04d', $anio, (int) $q->fetchColumn());
}

/** Un profesional puede recibir contrataciones nuevas solo si su perfil está validado hoy. */
function profesionalElegible(PDO $db, string $profesionalId): bool {
    return existeRegistro(
        $db,
        'SELECT 1 FROM profesionales WHERE id = :id AND validado_por_skilly = 1',
        ['id' => $profesionalId],
    );
}

/** Bloques de 60 minutos que ocupa una sesión de $minutos (45 → 1, 90 → 2, 240 → 4). */
function bloquesPorSesion(int $minutos): int {
    return max(1, (int) ceil(max(1, $minutos) / 60));
}

/** Suma minutos a una fecha 'Y-m-d H:i:s' (hora local del negocio). */
function sumarMinutos(string $fecha, int $minutos): string {
    return (new DateTimeImmutable($fecha))->modify("+$minutos minutes")->format('Y-m-d H:i:s');
}

/**
 * Bloques consecutivos que necesita una sesión que comienza en $inicio y ocupa $cantidad
 * bloques. Devuelve las filas o null si falta alguno, si no son contiguos o si alguno
 * está retenido por OTRA organización ($organizacionPropia puede retenerlos).
 * Con $bloquear = true usa FOR UPDATE (llamar dentro de una transacción).
 */
function cadenaDeBloques(
    PDO $db,
    string $profesionalId,
    string $inicio,
    int $cantidad,
    ?string $organizacionPropia = null,
    bool $bloquear = false,
): ?array {
    $limite = sumarMinutos($inicio, 60 * $cantidad);
    $q = $db->prepare(
        'SELECT * FROM bloques_disponibles WHERE profesional_id = :prof AND inicio >= :inicio AND inicio < :limite ORDER BY inicio' .
            ($bloquear ? ' FOR UPDATE' : ''),
    );
    $q->execute(['prof' => $profesionalId, 'inicio' => $inicio, 'limite' => $limite]);
    $bloques = $q->fetchAll();
    if (count($bloques) !== $cantidad || $bloques[0]['inicio'] !== $inicio) {
        return null;
    }
    for ($i = 1; $i < $cantidad; $i++) {
        if ($bloques[$i]['inicio'] !== $bloques[$i - 1]['fin']) {
            return null;
        }
    }
    $ids = array_column($bloques, 'id');
    $marcas = implode(',', array_fill(0, count($ids), '?'));
    $sql = "SELECT 1 FROM retenciones WHERE bloque_id IN ($marcas) AND expira_en > NOW()";
    $params = $ids;
    if ($organizacionPropia !== null) {
        $sql .= ' AND organizacion_id <> ?';
        $params[] = $organizacionPropia;
    }
    $q = $db->prepare($sql . ' LIMIT 1');
    $q->execute($params);
    return $q->fetch() ? null : $bloques;
}

function generarBloquesDesdeHorarios(PDO $db, string $profId, ?DateTimeImmutable $inicio = null, ?DateTimeImmutable $fin = null): void {
    $q = $db->prepare('SELECT dia,activo,desde,hasta FROM horarios_semanales WHERE profesional_id=:id');
    $q->execute(['id' => $profId]);
    $horarios = [];
    foreach ($q->fetchAll() as $h) {
        $horarios[(int) $h['dia']] = $h;
    }
    if (!$horarios) {
        for ($d = 0; $d <= 6; $d++) {
            $horarios[$d] = [
                'dia' => $d,
                'activo' => in_array($d, [1, 2, 3, 4, 5], true) ? 1 : 0,
                'desde' => '09:00:00',
                'hasta' => $d === 5 ? '16:00:00' : '18:00:00',
            ];
        }
    }
    $zone = new DateTimeZone('America/Santiago');
    $ahora = new DateTimeImmutable('now', $zone);
    $desdeSQL = $ahora->format('Y-m-d H:i:s');
    // Retira la disponibilidad futura no reservada; no elimina bloques retenidos.
    if ($inicio === null) {
        $q = $db->prepare(
            'DELETE b FROM bloques_disponibles b WHERE b.profesional_id=:id AND b.inicio>:ahora AND NOT EXISTS (SELECT 1 FROM retenciones r WHERE r.bloque_id=b.id AND r.expira_en>NOW())',
        );
        $q->execute(['id' => $profId, 'ahora' => $desdeSQL]);
    }
    $q = $db->prepare(
        // Ocupan agenda el horario de cada reserva vigente y, si hay un cambio de fecha
        // pendiente, también el horario propuesto (para no volver a ofrecerlo).
        "SELECT inicio,fin FROM reservas WHERE profesional_id=:id AND estado NOT IN ('RECHAZADA','CANCELADA') AND fin>:ahora
         UNION ALL
         SELECT reagendamiento_inicio,reagendamiento_fin FROM reservas WHERE profesional_id=:id2 AND estado='REAGENDADA' AND reagendamiento_inicio IS NOT NULL
         UNION ALL
         SELECT b.inicio,b.fin FROM bloques_disponibles b JOIN retenciones t ON t.bloque_id=b.id
         WHERE b.profesional_id=:id3 AND t.expira_en>NOW()",
    );
    $q->execute(['id' => $profId, 'ahora' => $desdeSQL, 'id2' => $profId, 'id3' => $profId]);
    $reservas = $q->fetchAll();
    $q = $db->prepare('SELECT fecha,desde,hasta FROM bloqueos_disponibilidad WHERE profesional_id=:id');
    $q->execute(['id' => $profId]);
    $bloqueos = $q->fetchAll();
    $ins = $db->prepare(
        'INSERT IGNORE INTO bloques_disponibles (id,profesional_id,inicio,fin) VALUES (:id,:prof,:inicio,:fin)',
    );
    $primero = ($inicio ?? $ahora->modify('+1 day'))->setTime(0, 0);
    $ultimo = ($fin ?? $ahora->modify('+60 days'))->setTime(0, 0);
    for ($dia = $primero; $dia <= $ultimo; $dia = $dia->modify('+1 day')) {
        $weekday = (int) $dia->format('w');
        $h = $horarios[$weekday] ?? null;
        if (!$h || !(bool) $h['activo']) {
            continue;
        }
        $minutosIni = ((int) substr((string) $h['desde'], 0, 2)) * 60 + (int) substr((string) $h['desde'], 3, 2);
        $minutosFin = ((int) substr((string) $h['hasta'], 0, 2)) * 60 + (int) substr((string) $h['hasta'], 3, 2);
        for ($m = $minutosIni; $m + 60 <= $minutosFin; $m += 60) {
            $start = $dia->setTime(intdiv($m, 60), $m % 60, 0);
            $end = $start->modify('+60 minutes');
            if ($start <= $ahora || ($inicio && $end <= $inicio) || ($fin && $start >= $fin)) {
                continue;
            }
            $startSQL = $start->format('Y-m-d H:i:s');
            $endSQL = $end->format('Y-m-d H:i:s');
            $ocupado = false;
            foreach ($reservas as $r) {
                if ($startSQL < $r['fin'] && $endSQL > $r['inicio']) {
                    $ocupado = true;
                    break;
                }
            }
            if ($ocupado) {
                continue;
            }
            foreach ($bloqueos as $b) {
                if ($b['fecha'] === $start->format('Y-m-d')) {
                    $bs = substr((string) $b['desde'], 0, 5);
                    $be = substr((string) $b['hasta'], 0, 5);
                    if ($start->format('H:i') < $be && $end->format('H:i') > $bs) {
                        $ocupado = true;
                        break;
                    }
                }
            }
            if ($ocupado) {
                continue;
            }
            $id = 'blq-' . substr(hash('sha256', $profId . '|' . $startSQL), 0, 24);
            $ins->execute(['id' => $id, 'prof' => $profId, 'inicio' => $startSQL, 'fin' => $endSQL]);
        }
    }
}

function liberarIntervalo(PDO $db, string $profesionalId, string $inicio, string $fin): void {
    generarBloquesDesdeHorarios($db, $profesionalId, new DateTimeImmutable($inicio), new DateTimeImmutable($fin));
}

function liberarGrupoRetenido(PDO $db, string $organizacion, string $id): void {
    if (!preg_match('/^ret-[a-f0-9]{16}$/D', $id)) {
        return;
    }
    $q = $db->prepare('DELETE FROM retenciones WHERE organizacion_id=:org AND (id=:id OR id LIKE :hijos)');
    $q->execute(['org' => $organizacion, 'id' => $id, 'hijos' => $id . '-%']);
}

// ---------------------------------------------------------------------------
// Reservas: carga por lotes (evita N+1 consultas en los listados)
// ---------------------------------------------------------------------------

/** Convierte una fila de `reservas` + su historial al formato del frontend. */
function reservaDesdeFila(array $r, array $historial): array {
    return [
        'id' => $r['id'],
        'codigo' => $r['codigo'],
        'organizacionId' => $r['organizacion_id'],
        'profesionalId' => $r['profesional_id'],
        'servicioId' => $r['servicio_id'],
        'inicio' => $r['inicio'],
        'fin' => $r['fin'],
        'modalidad' => $r['modalidad'],
        'mensaje' => $r['mensaje'],
        'precio' => (int) $r['precio'],
        'comisionPorcentaje' => (float) $r['comision_porcentaje'],
        'comision' => (int) $r['comision'],
        'total' => (int) $r['total'],
        'estado' => $r['estado'],
        'estadoPago' => $r['estado_pago'],
        'conformidadConfirmada' => (bool) $r['conformidad_confirmada'],
        'conformidadFecha' => $r['conformidad_fecha'],
        'aceptacionCondiciones' => $r['aceptacion_fecha']
            ? [
                'fecha' => $r['aceptacion_fecha'],
                'usuario' => $r['aceptacion_usuario'] ?? '',
                'version' => $r['aceptacion_version'] ?? '',
            ]
            : null,
        'reagendamientoPropuesto' => $r['reagendamiento_inicio']
            ? [
                'inicio' => $r['reagendamiento_inicio'],
                'fin' => $r['reagendamiento_fin'],
                'solicitadoEn' => $r['reagendamiento_solicitado'],
            ]
            : null,
        'creadaEn' => $r['creada_en'],
        'historial' => $historial,
        'administradorAsignadoId' => $r['administrador_asignado_id'],
        'administradorAsignadoNombre' => $r['administrador_asignado_nombre'],
        'administradorDecidioEn' => $r['administrador_decidio_en'],
        'profesionalDecidioEn' => $r['profesional_decidio_en'],
        'pagoConfirmadoEn' => $r['pago_confirmado_en'],
    ];
}

/**
 * Reservas completas (con historial) en 2 consultas en total, sin importar
 * cuántas sean. Devuelve [id => reserva] respetando el orden de $ids.
 */
function obtenerReservasLote(PDO $db, array $ids): array {
    $filas = consultarEnLote($db, 'SELECT * FROM reservas WHERE id IN (:ids)', $ids);
    if (!$filas) {
        return [];
    }
    $historial = [];
    foreach (
        consultarEnLote(
            $db,
            'SELECT * FROM historial_reservas WHERE reserva_id IN (:ids) ORDER BY fecha, secuencia',
            array_column($filas, 'id'),
        )
        as $h
    ) {
        $historial[$h['reserva_id']][] = [
            'id' => $h['id'],
            'fecha' => $h['fecha'],
            'actor' => ['tipo' => $h['actor_tipo'], 'nombre' => $h['actor_nombre']],
            'estadoAnterior' => $h['estado_anterior'],
            'estadoNuevo' => $h['estado_nuevo'],
            'motivo' => $h['motivo'],
            'detalle' => $h['detalle'],
        ];
    }
    $porId = [];
    foreach ($filas as $r) {
        $porId[$r['id']] = reservaDesdeFila($r, $historial[$r['id']] ?? []);
    }
    $resultado = [];
    foreach ($ids as $id) {
        if (isset($porId[$id])) {
            $resultado[$id] = $porId[$id];
        }
    }
    return $resultado;
}

function obtenerReserva(PDO $db, string $id): ?array {
    return obtenerReservasLote($db, [$id])[$id] ?? null;
}

/**
 * Reservas con los nombres de organización, profesional y servicio (para los
 * listados de administración) en 3 consultas en total.
 */
function obtenerReservasConNombres(PDO $db, array $ids): array {
    $reservas = obtenerReservasLote($db, $ids);
    if (!$reservas) {
        return [];
    }
    $q = $db->prepare(
        "SELECT r.id, o.razon_social, CONCAT(p.nombre,' ',p.apellido) AS profesional, s.titulo
         FROM reservas r
         LEFT JOIN organizaciones o ON o.id = r.organizacion_id
         LEFT JOIN profesionales p ON p.id = r.profesional_id
         LEFT JOIN servicios s ON s.id = r.servicio_id
         WHERE r.id IN (" . implode(',', array_fill(0, count($reservas), '?')) . ')',
    );
    $q->execute(array_keys($reservas));
    $nombres = [];
    foreach ($q->fetchAll() as $n) {
        $nombres[$n['id']] = $n;
    }
    $items = [];
    foreach ($reservas as $id => $r) {
        $items[] = [
            'reserva' => $r,
            'organizacion' => $nombres[$id]['razon_social'] ?? $r['organizacionId'],
            'profesional' => $nombres[$id]['profesional'] ?? $r['profesionalId'],
            'servicio' => $nombres[$id]['titulo'] ?? $r['servicioId'],
        ];
    }
    return $items;
}

// ---------------------------------------------------------------------------
// Evaluaciones y reputación
// ---------------------------------------------------------------------------

/**
 * Regla de evaluación ciega: una evaluación se publica cuando ambas partes
 * evaluaron O cuando pasan `reputacion_dias_publicacion` días desde que se
 * envió. Como no hay tareas programadas en XAMPP, la publicación por plazo se
 * aplica de forma diferida cada vez que alguien consulta reputación o
 * evaluaciones (una sola sentencia UPDATE indexada).
 */
function publicarEvaluacionesVencidas(PDO $db): void {
    $db->exec(
        'UPDATE evaluaciones e JOIN configuracion_plataforma c ON c.id = 1
         SET e.publicada = 1
         WHERE e.publicada = 0 AND e.fecha <= DATE_SUB(NOW(), INTERVAL c.reputacion_dias_publicacion DAY)',
    );
}

function configuracionReputacion(PDO $db): array {
    $cfg = $db
        ->query(
            'SELECT reputacion_minimo_evaluaciones, reputacion_ventana_max, reputacion_ventana_meses FROM configuracion_plataforma WHERE id=1',
        )
        ->fetch();
    return [
        'minimo' => (int) ($cfg['reputacion_minimo_evaluaciones'] ?? 3),
        'ventanaMax' => (int) ($cfg['reputacion_ventana_max'] ?? 10),
        'ventanaMeses' => (int) ($cfg['reputacion_ventana_meses'] ?? 12),
    ];
}

/**
 * Calcula la reputación de un profesional a partir de sus evaluaciones
 * publicadas (ordenadas de la más reciente a la más antigua).
 *  - Ventana: últimas `ventanaMax` evaluaciones de los últimos `ventanaMeses`.
 *  - Con menos de `minimo` evaluaciones se muestra como "nuevo" (sin niveles).
 *  - Por dimensión se informa el nivel predominante (moda, desempata el mayor)
 *    y cuántas organizaciones indicaron "cumplió" o "superó" (3 o 4).
 *  - Solo se muestran comentarios aprobados por moderación.
 */
function calcularReputacion(string $profesionalId, array $publicadas, array $cfg): array {
    $limite = date('Y-m-d H:i:s', strtotime('-' . $cfg['ventanaMeses'] . ' months'));
    $ventana = array_slice(
        array_values(array_filter($publicadas, fn($e) => $e['fecha'] >= $limite)),
        0,
        $cfg['ventanaMax'],
    );
    $historicas = count($publicadas);
    $esNuevo = $historicas < $cfg['minimo'];
    $dimensiones = null;
    $comentarios = [];
    if (!$esNuevo && count($ventana) >= $cfg['minimo']) {
        $dimensiones = [];
        foreach (['calidad', 'plazos', 'comunicacion'] as $d) {
            $conteo = [1 => 0, 2 => 0, 3 => 0, 4 => 0];
            foreach ($ventana as $e) {
                $conteo[(int) $e[$d]]++;
            }
            $nivel = 3;
            $mayor = -1;
            foreach ([4, 3, 2, 1] as $n) {
                if ($conteo[$n] > $mayor) {
                    $mayor = $conteo[$n];
                    $nivel = $n;
                }
            }
            $dimensiones[] = [
                'dimension' => $d,
                'conteo' => (object) $conteo,
                'total' => count($ventana),
                'nivelPredominante' => $nivel,
                'cumplioOSupero' => $conteo[3] + $conteo[4],
            ];
        }
        foreach ($ventana as $e) {
            if (!empty($e['comentario']) && $e['estado_comentario'] === 'aprobado') {
                $comentarios[] = [
                    'comentario' => $e['comentario'],
                    'fecha' => $e['fecha'],
                    'organizacion' => $e['razon_social'] ?: 'Organización cliente',
                ];
            }
        }
    }
    return [
        'profesionalId' => $profesionalId,
        'totalConsideradas' => count($ventana),
        'totalHistoricas' => $historicas,
        'esNuevo' => $esNuevo,
        'dimensiones' => $dimensiones,
        'comentariosPublicos' => $comentarios,
    ];
}

/** Reputación de varios profesionales con una sola consulta. Devuelve [id => reputación]. */
function reputacionesLote(PDO $db, array $profesionalIds): array {
    $profesionalIds = array_values(array_unique($profesionalIds));
    if (!$profesionalIds) {
        return [];
    }
    publicarEvaluacionesVencidas($db);
    $cfg = configuracionReputacion($db);
    $porProfesional = array_fill_keys($profesionalIds, []);
    foreach (
        consultarEnLote(
            $db,
            "SELECT e.*, o.razon_social FROM evaluaciones e
             LEFT JOIN organizaciones o ON o.id = e.organizacion_id
             WHERE e.profesional_id IN (:ids) AND e.publicada = 1 AND e.autor = 'organizacion'
             ORDER BY e.fecha DESC",
            $profesionalIds,
        )
        as $e
    ) {
        $porProfesional[$e['profesional_id']][] = $e;
    }
    $resultado = [];
    foreach ($porProfesional as $id => $lista) {
        $resultado[$id] = calcularReputacion((string) $id, $lista, $cfg);
    }
    return $resultado;
}

// ---------------------------------------------------------------------------
// Catálogo: fichas completas por lotes
// ---------------------------------------------------------------------------

/**
 * Ítems del catálogo (servicio + profesional + categoría + subcategoría +
 * reputación + próximo bloque libre) con ~15 consultas en total, en vez de
 * ~15 consultas POR servicio. Devuelve [id => ítem] en el orden de $ids.
 * Los servicios cuyo profesional, categoría o subcategoría no exista se omiten.
 */
function obtenerCatalogoLote(PDO $db, array $ids): array {
    $servicios = obtenerServiciosLote($db, $ids);
    if (!$servicios) {
        return [];
    }
    $profIds = array_values(array_unique(array_column($servicios, 'profesionalId')));
    $profesionales = obtenerProfesionalesLote($db, $profIds);
    $categorias = [];
    foreach ($db->query('SELECT id, nombre, descripcion FROM categorias') as $c) {
        $categorias[$c['id']] = $c;
    }
    $subcategorias = [];
    foreach ($db->query('SELECT id, categoria_id, nombre FROM subcategorias') as $s) {
        $subcategorias[$s['id']] = $s;
    }
    $proximos = [];
    foreach (
        consultarEnLote(
            $db,
            'SELECT b.profesional_id, MIN(b.inicio) AS proximo FROM bloques_disponibles b
             WHERE b.profesional_id IN (:ids) AND b.inicio > NOW()
               AND NOT EXISTS (SELECT 1 FROM retenciones r WHERE r.bloque_id = b.id AND r.expira_en > NOW())
             GROUP BY b.profesional_id',
            $profIds,
        )
        as $p
    ) {
        $proximos[$p['profesional_id']] = $p['proximo'];
    }
    $reputaciones = reputacionesLote($db, $profIds);
    $resultado = [];
    foreach ($servicios as $id => $s) {
        $p = $profesionales[$s['profesionalId']] ?? null;
        $c = $categorias[$s['categoriaId']] ?? null;
        $sub = $subcategorias[$s['subcategoriaId']] ?? null;
        if (!$p || !$c || !$sub) {
            continue;
        }
        $resultado[$id] = [
            'servicio' => $s,
            'profesional' => $p,
            'categoria' => ['id' => $c['id'], 'nombre' => $c['nombre'], 'descripcion' => $c['descripcion']],
            'subcategoria' => ['id' => $sub['id'], 'categoriaId' => $sub['categoria_id'], 'nombre' => $sub['nombre']],
            'reputacion' => $reputaciones[$s['profesionalId']],
            'proximoBloque' => $proximos[$s['profesionalId']] ?? null,
        ];
    }
    return $resultado;
}

/** true si la tabla tiene al menos una fila que cumple la condición (consulta con LIMIT 1). */
function existeRegistro(PDO $db, string $sql, array $params): bool {
    $q = $db->prepare($sql . ' LIMIT 1');
    $q->execute($params);
    return (bool) $q->fetchColumn();
}

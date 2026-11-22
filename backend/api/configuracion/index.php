<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/helpers.php';

function skillyConfiguracion(PDO $db): array {
    $q = $db->query('SELECT * FROM configuracion_plataforma WHERE id=1');
    $c = $q->fetch();
    if (!$c) {
        responderError('no_encontrado', 'Configuración no encontrada.', 404);
    }
    $tramos = [];
    foreach (
        $db
            ->query(
                'SELECT desde_horas,retencion_porcentaje,etiqueta FROM tramos_cancelacion ORDER BY desde_horas DESC',
            )
            ->fetchAll()
        as $t
    ) {
        $tramos[] = [
            'desdeHoras' => (int) $t['desde_horas'],
            'retencionPorcentaje' => (int) $t['retencion_porcentaje'],
            'etiqueta' => $t['etiqueta'],
        ];
    }
    return [
        'comisionPorcentaje' => (float) $c['comision_porcentaje'],
        'comisionProfesionalPorcentaje' => (float) $c['comision_profesional_porcentaje'],
        'comisionOrganizacionPorcentaje' => (float) $c['comision_organizacion_porcentaje'],
        'politicaCancelacion' => $tramos,
        'retencionBloqueMinutos' => (int) $c['retencion_bloque_minutos'],
        'reputacion' => [
            'minimoEvaluaciones' => (int) $c['reputacion_minimo_evaluaciones'],
            'ventanaMaxEvaluaciones' => (int) $c['reputacion_ventana_max'],
            'ventanaMeses' => (int) $c['reputacion_ventana_meses'],
            'diasPublicacionAutomatica' => (int) $c['reputacion_dias_publicacion'],
            'maxCaracteresComentario' => (int) $c['reputacion_max_caracteres'],
        ],
        'versionCondiciones' => $c['version_condiciones'],
        'versionPoliticaDatos' => $c['version_politica_datos'],
    ];
}
try {
    $db = conectarDB();
    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'GET') {
        responderJSON(skillyConfiguracion($db));
    }
    if ($method === 'PUT' || $method === 'PATCH') {
        usuarioAutenticado($db, ['fundador']);
        $d = leerJSON();
        $tramos = $d['politicaCancelacion'] ?? [];
        $rep = $d['reputacion'] ?? [];
        if (!is_array($tramos) || count($tramos) < 1) {
            responderError('validacion', 'La política de cancelación debe tener al menos un tramo.');
        }
        foreach (
            [
                'comisionPorcentaje',
                'comisionProfesionalPorcentaje',
                'comisionOrganizacionPorcentaje',
                'retencionBloqueMinutos',
            ]
            as $k
        ) {
            if (!isset($d[$k]) || !is_numeric($d[$k])) {
                responderError('validacion', "Falta un valor válido para $k.");
            }
        }
        foreach (
            [
                'minimoEvaluaciones',
                'ventanaMaxEvaluaciones',
                'ventanaMeses',
                'diasPublicacionAutomatica',
                'maxCaracteresComentario',
            ]
            as $k
        ) {
            if (!isset($rep[$k]) || !is_numeric($rep[$k])) {
                responderError('validacion', "Falta un parámetro de reputación válido: $k.");
            }
        }
        if (
            $d['comisionPorcentaje'] < 0 ||
            $d['comisionPorcentaje'] > 50 ||
            $d['comisionProfesionalPorcentaje'] < 0 ||
            $d['comisionProfesionalPorcentaje'] > 50 ||
            $d['comisionOrganizacionPorcentaje'] < 0 ||
            $d['comisionOrganizacionPorcentaje'] > 50
        ) {
            responderError('validacion', 'Las comisiones deben estar entre 0 y 50 %.');
        }
        if ($d['retencionBloqueMinutos'] < 0 || $d['retencionBloqueMinutos'] > 120) {
            responderError('validacion', 'La retención debe estar entre 0 y 120 minutos.');
        }
        foreach ($tramos as $t) {
            if (
                !isset($t['desdeHoras'], $t['retencionPorcentaje'], $t['etiqueta']) ||
                (int) $t['desdeHoras'] < 0 ||
                (int) $t['retencionPorcentaje'] < 0 ||
                (int) $t['retencionPorcentaje'] > 100
            ) {
                responderError('validacion', 'Revisa los tramos de la política de cancelación.');
            }
        }
        try {
            $db->beginTransaction();
            $q = $db->prepare(
                'UPDATE configuracion_plataforma SET comision_porcentaje=:cp,comision_profesional_porcentaje=:cprof,comision_organizacion_porcentaje=:corg,retencion_bloque_minutos=:ret,reputacion_minimo_evaluaciones=:min,reputacion_ventana_max=:ventmax,reputacion_ventana_meses=:meses,reputacion_dias_publicacion=:dias,reputacion_max_caracteres=:chars,version_condiciones=:cond,version_politica_datos=:priv WHERE id=1',
            );
            $q->execute([
                'cp' => $d['comisionPorcentaje'],
                'cprof' => $d['comisionProfesionalPorcentaje'],
                'corg' => $d['comisionOrganizacionPorcentaje'],
                'ret' => $d['retencionBloqueMinutos'],
                'min' => $rep['minimoEvaluaciones'],
                'ventmax' => $rep['ventanaMaxEvaluaciones'],
                'meses' => $rep['ventanaMeses'],
                'dias' => $rep['diasPublicacionAutomatica'],
                'chars' => $rep['maxCaracteresComentario'],
                'cond' => trim((string) ($d['versionCondiciones'] ?? '2026-01')),
                'priv' => trim((string) ($d['versionPoliticaDatos'] ?? '2026-01')),
            ]);
            $db->exec('DELETE FROM tramos_cancelacion');
            $q = $db->prepare(
                'INSERT INTO tramos_cancelacion (desde_horas,retencion_porcentaje,etiqueta) VALUES (:desde,:porcentaje,:etiqueta)',
            );
            foreach ($tramos as $t) {
                $q->execute([
                    'desde' => (int) $t['desdeHoras'],
                    'porcentaje' => (int) $t['retencionPorcentaje'],
                    'etiqueta' => trim((string) $t['etiqueta']),
                ]);
            }
            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
        responderJSON(skillyConfiguracion($db));
    }
    responderError('validacion', 'Método no permitido.', 405);
} catch (PDOException $e) {
    error_log('API configuración: ' . $e->getMessage());
    responderError('red', 'No se pudo guardar la configuración.', 500);
}

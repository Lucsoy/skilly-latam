<?php
/** Condiciones que una organización debe revisar antes de confirmar una reserva. */

/**
 * Convierte los valores de la base de datos al contrato JSON de contratación.
 *
 * @param array $servicio Fila del servicio con su precio en pesos chilenos.
 * @param array $cfg Configuración con la comisión y la versión de las condiciones.
 * @return array{precio:int, porcentaje:float, version:string} Valores vigentes.
 */
function condicionesReserva(array $servicio, array $cfg): array {
    return [
        'precio' => (int) $servicio['precio'],
        'porcentaje' => (float) $cfg['comision_porcentaje'],
        'version' => (string) $cfg['version_condiciones'],
    ];
}

/**
 * Comprueba que el cliente aceptó los mismos valores que aplicará la API.
 *
 * @param mixed $vistas Condiciones recibidas del cliente, o null si faltan.
 * @param array $vigentes Resultado de condicionesReserva().
 * @return bool Verdadero si coinciden el precio, el porcentaje y la versión.
 */
function coincidenCondicionesReserva($vistas, array $vigentes): bool {
    if (!is_array($vistas)) {
        return false;
    }
    $porcentaje = $vistas['porcentaje'] ?? null;
    // JSON admite tanto 15 como 15.0 para la misma comisión.
    return (is_int($porcentaje) || is_float($porcentaje))
        && (float) $porcentaje === $vigentes['porcentaje']
        && ($vistas['precio'] ?? null) === $vigentes['precio']
        && ($vistas['version'] ?? null) === $vigentes['version'];
}

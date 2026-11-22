<?php
require_once __DIR__ . '/../../backend/config/condiciones_reserva.php';

$vigentes = condicionesReserva(['precio' => '20000'], [
    'comision_porcentaje' => '15.00',
    'version_condiciones' => 'v2',
]);
$casos = [
    'original' => [$vigentes, true],
    'comisión entera' => [['porcentaje' => 15] + $vigentes, true],
    'sin condiciones' => [null, false],
    'sin versión' => [array_diff_key($vigentes, ['version' => true]), false],
    'precio como texto' => [['precio' => '20000'] + $vigentes, false],
    'comisión como texto' => [['porcentaje' => '15'] + $vigentes, false],
    'cambio de precio' => [['precio' => 21000] + $vigentes, false],
    'cambio de comisión' => [['porcentaje' => 15.5] + $vigentes, false],
    'cambio de versión' => [['version' => 'v1'] + $vigentes, false],
];
foreach ($casos as $nombre => [$vistas, $esperado]) {
    if (coincidenCondicionesReserva($vistas, $vigentes) !== $esperado) {
        throw new RuntimeException("Resultado incorrecto: $nombre");
    }
    echo "OK $nombre\n";
}

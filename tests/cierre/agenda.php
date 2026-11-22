<?php
// Ejecutar con php tests/cierre/agenda.php. El doble de PDO registra bloques, sin una base externa.
require_once __DIR__ . '/../../backend/config/helpers.php';

class AgendaPrueba extends PDO {
    public array $jornada = [];
    public array $ocupados = [];
    public array $bloqueos = [];
    public array $altas = [];
    public array $bajas = [];
    public function __construct() {}
    public function prepare(string $query, array $options = []): PDOStatement|false {
        return new ConsultaAgenda($this, $query);
    }
}
class ConsultaAgenda extends PDOStatement {
    public function __construct(private AgendaPrueba $agenda, private string $sql) {}
    public function execute(?array $params = null): bool {
        if (str_starts_with($this->sql, 'INSERT IGNORE')) $this->agenda->altas[] = $params['inicio'];
        if (str_starts_with($this->sql, 'DELETE FROM retenciones')) $this->agenda->bajas[] = $params;
        return true;
    }
    public function fetchAll(int $mode = PDO::FETCH_DEFAULT, mixed ...$args): array {
        if (str_contains($this->sql, 'FROM horarios_semanales')) return $this->agenda->jornada;
        if (str_contains($this->sql, 'FROM reservas')) return $this->agenda->ocupados;
        if (str_contains($this->sql, 'FROM bloqueos_disponibilidad')) return $this->agenda->bloqueos;
        throw new RuntimeException('Consulta inesperada');
    }
}
function comprobar(bool $cumple, string $nombre): void {
    if (!$cumple) throw new RuntimeException($nombre);
    echo "OK $nombre\n";
}
$db = new AgendaPrueba();
$dia = (new DateTimeImmutable('next monday'))->format('Y-m-d');
$db->bloqueos = [['fecha' => $dia, 'desde' => '10:00', 'hasta' => '11:00']];
liberarIntervalo($db, 'prof', "$dia 10:00:00", "$dia 11:30:00");
comprobar($db->altas === ["$dia 11:00:00"], 'Una sesión de 90 minutos devuelve únicamente la hora permitida');
$db->altas = [];
$db->ocupados = [['inicio' => "$dia 11:30:00", 'fin' => "$dia 12:30:00"]];
liberarIntervalo($db, 'prof', "$dia 10:00:00", "$dia 12:00:00");
comprobar(!$db->altas, 'La franja con otra reserva sigue ocupada');
$db->jornada = [['dia'=>1,'activo'=>0,'desde'=>'09:00','hasta'=>'18:00']];
liberarIntervalo($db, 'prof', "$dia 13:00:00", "$dia 14:00:00");
comprobar(!$db->altas, 'Un cambio de jornada se respeta al liberar');
$id = 'ret-0123456789abcdef';
liberarGrupoRetenido($db, 'org', $id);
comprobar($db->bajas === [['org'=>'org','id'=>$id,'hijos'=>$id.'-%']], 'La eliminación queda acotada al titular y grupo seleccionado');

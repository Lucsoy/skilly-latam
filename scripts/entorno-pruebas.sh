#!/usr/bin/env bash
# Levanta un entorno de pruebas reproducible en Linux/macOS (sin XAMPP):
#   1. recrea la base skilly_db desde database/skilly.sql (¡BORRA esa base!);
#   2. inicia la API con el servidor embebido de PHP en http://127.0.0.1:8080/api.
# Uso:  bash scripts/entorno-pruebas.sh        (luego: npm run test:integracion)
# En Windows con XAMPP no se usa: ver docs/03_entorno/GUIA_INSTALACION.md, §12.
set -euo pipefail
cd "$(dirname "$0")/.."
MYSQL="${MYSQL:-mariadb}"
PUERTO="${PUERTO:-8080}"
"$MYSQL" -uroot -e "DROP DATABASE IF EXISTS skilly_db"
"$MYSQL" -uroot < database/skilly.sql
echo "Base skilly_db recreada desde database/skilly.sql"
pkill -f "php -S 127.0.0.1:${PUERTO}" 2>/dev/null || true
(cd backend && PHP_CLI_SERVER_WORKERS=4 nohup php -S "127.0.0.1:${PUERTO}" ../tests/integracion/router.php > /tmp/skilly-php.log 2>&1 &)
sleep 1
curl -fsS "http://127.0.0.1:${PUERTO}/api/categorias/" > /dev/null && echo "API lista en http://127.0.0.1:${PUERTO}/api"

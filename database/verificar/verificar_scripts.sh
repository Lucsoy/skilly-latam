#!/usr/bin/env bash
# Verificación de los scripts SQL (CP-BD-01, 02, 03, 13) — BORRA y recrea skilly_db: úsalo solo en un equipo de pruebas.
# Uso: bash database/verificar/verificar_scripts.sh database [carpeta con el skilly.sql del esquema 2026.11-E3]
# Sin el segundo argumento se omite la prueba de migración desde la versión anterior.
set -euo pipefail
D="${1:-database}"; O="${2:-}"; M="mariadb -uroot --default-character-set=utf8mb4"
dump(){ mariadb-dump -uroot --default-character-set=utf8mb4 --no-data --skip-comments --skip-dump-date skilly_db | sed 's/ AUTO_INCREMENT=[0-9]*//'; }
$M -e "DROP DATABASE IF EXISTS skilly_db"; $M < "$D/skilly.sql"; $M < "$D/skilly.sql"; echo "IMPORT_x2_OK"
$M -N -e "select 'tablas',count(*) from information_schema.tables where table_schema='skilly_db' union all select 'fk',count(*) from information_schema.referential_constraints where constraint_schema='skilly_db' union all select 'check',count(*) from information_schema.check_constraints where constraint_schema='skilly_db' union all select 'indices',count(distinct table_name,index_name) from information_schema.statistics where table_schema='skilly_db' union all select 'columnas',count(*) from information_schema.columns where table_schema='skilly_db'"
$M -N -e "select nombre from skilly_db.subcategorias where id='desempeno'"
dump > /tmp/nA.sql
$M -e "DROP DATABASE skilly_db"; for f in 00 01 02 03 04 05; do $M < "$D"/scripts/${f}_*.sql; done
dump > /tmp/nB.sql; diff /tmp/nA.sql /tmp/nB.sql && echo "SCRIPTS_00_05_IGUAL_A_SKILLY_SQL"
$M < "$D/migracion_correcciones_2026_11.sql" >/dev/null; $M < "$D/migracion_correcciones_2026_11.sql" >/dev/null
dump > /tmp/nC.sql; diff /tmp/nA.sql /tmp/nC.sql && echo "MIGRACION_REEJECUTABLE_SIN_CAMBIOS"
if [ -n "$O" ]; then
$M -e "DROP DATABASE skilly_db"; $M < "$O/skilly.sql"
$M skilly_db -e "INSERT INTO organizaciones (id,razon_social,rut,giro,tamano,nombre_contacto,email_contacto) VALUES ('o1','Org','11.111.111-1','g','1-10','c','a@b.cl'); INSERT INTO profesionales (id,nombre,apellido,titulo,ciudad,presentacion,fecha_ingreso) VALUES ('p1','A','B','t','c','p',NOW()); INSERT INTO servicios (id,profesional_id,categoria_id,subcategoria_id,titulo,descripcion,duracion_estimada,duracion_sesion_minutos,precio,publicado) VALUES ('s1','p1','reclutamiento','busqueda-perfiles','t','d','x',60,1000,1); INSERT INTO reservas (id,codigo,organizacion_id,profesional_id,servicio_id,inicio,fin,modalidad,precio,comision_porcentaje,comision,total,estado,estado_pago,creada_en) VALUES ('r1','SK-2026-0007','o1','p1','s1','2026-12-01 10:00:00','2026-12-01 11:00:00','remoto',1000,15,150,1150,'CANCELADA','reembolsado',NOW()); INSERT INTO historial_reservas (id,reserva_id,fecha,actor_tipo,actor_nombre,estado_nuevo) VALUES ('h1','r1',NOW(),'sistema','S','SOLICITADA');"
$M < "$D/migracion_correcciones_2026_11.sql" | tail -1; $M < "$D/migracion_correcciones_2026_11.sql" >/dev/null; echo "MIGRACION_SOBRE_BASE_E3_OK"
$M -N skilly_db -e "select concat('contador ',anio,'=',ultimo) from contadores_reserva; select concat('estado_pago=',estado_pago) from reservas; select concat('historial=',count(*)) from historial_reservas"
dump > /tmp/nD.sql; diff /tmp/nA.sql /tmp/nD.sql && echo "BASE_MIGRADA_IGUAL_A_NUEVA"
($M skilly_db -e "DELETE FROM reservas WHERE id='r1'" 2>&1 || true) | grep -q "ERROR 1451" && echo "BORRADO_DE_CONTRATACION_RECHAZADO_POR_LA_BASE (ERROR 1451)"
fi
$M < "$D/scripts/90_eliminar_claves_foraneas.sql"; $M < "$D/scripts/91_eliminar_tablas.sql"
$M -N -e "select concat('tablas tras 91: ',count(*)) from information_schema.tables where table_schema='skilly_db'"

$M < "$D/skilly.sql" && echo "BASE_REINSTALADA"

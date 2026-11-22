"""
Compara semánticamente dos esquemas MySQL/MariaDB (columnas, claves primarias,
foráneas, CHECK, unicidad e índices) usando information_schema.

Uso:  python3 database/verificar/comparar_esquemas.py esquema_a esquema_b [--permitir-indices-extra]
Sale con código 0 si son equivalentes. Los nombres de índices creados
automáticamente por InnoDB para las FK se ignoran: se comparan sus columnas.

Por defecto la comparación es ESTRICTA: también informa índices no únicos que
sobran en esquema_b. Con --permitir-indices-extra solo se informa lo que falta
en esquema_b (útil para una base migrada que conserva índices redundantes).
Las claves foráneas se comparan con sus columnas de origen Y de destino.
"""
from __future__ import annotations

import re
import subprocess
import sys

def q(sql: str) -> list[tuple[str, ...]]:
    """Ejecuta una consulta de lectura con el cliente MariaDB.

    Args:
        sql: Consulta sobre los metadatos del esquema.

    Returns:
        Lista de filas, cada una como una tupla de cadenas.

    Raises:
        subprocess.CalledProcessError: Si MariaDB rechaza la consulta.
        FileNotFoundError: Si el cliente mariadb no está instalado.

    Examples:
        >>> q("SELECT 1")
        [('1',)]
    """
    r = subprocess.run(['mariadb', '-uroot', '-N', '-B', '-e', sql], capture_output=True, text=True, check=True)
    return [tuple(l.split('\t')) for l in r.stdout.splitlines() if l]

def describir(s: str) -> dict[str, set[tuple[str, ...]]]:
    """Agrupa los metadatos que se comparan entre dos esquemas.

    Args:
        s: Nombre de esquema ya validado por la interfaz de línea de comandos.

    Returns:
        Diccionario de conjuntos de filas por categoría de metadato.

    Raises:
        subprocess.CalledProcessError: Si falla una consulta de metadatos.
        FileNotFoundError: Si el ejecutable mariadb no está disponible.
    """
    d = {}
    d['columnas'] = set(q(f"""SELECT table_name, column_name, column_type, is_nullable, IFNULL(column_default,'∅'), extra, IFNULL(generation_expression,'')
        FROM information_schema.columns WHERE table_schema='{s}'"""))
    d['claves_foraneas'] = set(q(f"""SELECT rc.table_name, rc.constraint_name, GROUP_CONCAT(k.column_name ORDER BY k.ordinal_position),
        rc.referenced_table_name, GROUP_CONCAT(k.referenced_column_name ORDER BY k.ordinal_position), rc.delete_rule, rc.update_rule FROM information_schema.referential_constraints rc
        JOIN information_schema.key_column_usage k ON k.constraint_schema=rc.constraint_schema AND k.constraint_name=rc.constraint_name AND k.table_name=rc.table_name
        WHERE rc.constraint_schema='{s}' GROUP BY rc.table_name, rc.constraint_name"""))
    d['check'] = set(q(f"SELECT table_name, constraint_name, check_clause FROM information_schema.check_constraints WHERE constraint_schema='{s}'"))
    d['primarias_y_unicas'] = set(q(f"""SELECT table_name, IF(index_name='PRIMARY','PRIMARY','UNIQUE'), GROUP_CONCAT(column_name ORDER BY seq_in_index)
        FROM information_schema.statistics WHERE table_schema='{s}' AND non_unique=0 GROUP BY table_name, index_name"""))
    d['indices_no_unicos'] = set(q(f"""SELECT table_name, GROUP_CONCAT(column_name ORDER BY seq_in_index)
        FROM information_schema.statistics WHERE table_schema='{s}' AND non_unique=1 GROUP BY table_name, index_name"""))
    d['tablas'] = set(q(f"SELECT table_name, engine, table_collation FROM information_schema.tables WHERE table_schema='{s}'"))
    return d

args = [x for x in sys.argv[1:] if not x.startswith('--')]
permitir_extra = '--permitir-indices-extra' in sys.argv
if len(args) != 2 or not all(re.fullmatch(r'[A-Za-z0-9_]+', x) for x in args):
    sys.exit('Uso: comparar_esquemas.py esquema_a esquema_b [--permitir-indices-extra]')
a, b = args
da, db = describir(a), describir(b)
dif = 0
for k in da:
    solo_a, solo_b = da[k] - db[k], db[k] - da[k]
    if k == 'indices_no_unicos' and permitir_extra:
        # Un índice del esquema migrado puede ser un prefijo ya cubierto: solo se informa lo que FALTA en b.
        solo_b = set()
    for x in sorted(solo_a):
        print(f'[{k}] solo en {a}: {x}'); dif += 1
    for x in sorted(solo_b):
        print(f'[{k}] solo en {b}: {x}'); dif += 1
print(f'Diferencias: {dif}')
sys.exit(1 if dif else 0)

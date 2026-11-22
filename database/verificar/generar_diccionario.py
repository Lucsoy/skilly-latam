"""
Genera el diccionario de datos (Markdown y Excel) desde information_schema.

Uso:  python3 database/verificar/generar_diccionario.py [esquema] [carpeta]
      (por defecto: skilly_db  docs/02_base_datos)

Las descripciones de tablas y columnas se toman de la versión anterior del Excel
(hojas Tablas y Diccionario) y de DESCRIPCIONES_NUEVAS; todo lo demás (tipos, largos,
nulos, claves, valores por defecto, CHECK, relaciones e índices) sale de la base.
"""
import os, re, subprocess, sys
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill

ESQ = sys.argv[1] if len(sys.argv) > 1 else 'skilly_db'
DIR = sys.argv[2] if len(sys.argv) > 2 else 'docs/02_base_datos'
VERSION = sys.argv[3] if len(sys.argv) > 3 else '2026.11-E3.1'
SQL = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'skilly.sql')
XLSX = os.path.join(DIR, 'Diccionario_de_Datos.xlsx')
if not re.fullmatch(r'[A-Za-z0-9_]+', ESQ):
    sys.exit('Nombre de esquema inválido')

DESCRIPCIONES_NUEVAS = {
    ('contadores_reserva', None): ('Contratación', 'Contador correlativo por año del código visible SK-AAAA-NNNN; se incrementa dentro de la transacción que crea la reserva.'),
    ('contadores_reserva', 'anio'): 'Año del código (SK-AAAA-…)',
    ('contadores_reserva', 'ultimo'): 'Último número asignado en ese año',
}
CAMBIOS = {
    ('organizaciones', 'rut_normalizado'): 'RUT sin puntos, guion ni espacios y con K mayúscula (columna generada) para garantizar unicidad',
    ('reservas', 'estado_pago'): 'Estado del pago SIMULADO; sin_cobro = cancelada antes de pagar (no hay nada que reembolsar)',
}

def q(sql):
    r = subprocess.run(['mariadb', '-uroot', '-N', '-B', '--default-character-set=utf8mb4', '-e', sql], capture_output=True, text=True, check=True)
    return [l.split('\t') for l in r.stdout.splitlines() if l]

# Descripciones previas
desc_tabla, desc_col = {}, {}
if os.path.exists(XLSX):
    wb0 = openpyxl.load_workbook(XLSX)
    for r in wb0['Tablas'].iter_rows(min_row=4, values_only=True):
        if r[0]:
            desc_tabla[r[0]] = (r[1], r[2])
    for r in wb0['Diccionario'].iter_rows(min_row=4, values_only=True):
        if r[0]:
            desc_col[(r[0], r[1])] = r[2]
for (t, c), v in DESCRIPCIONES_NUEVAS.items():
    if c is None:
        desc_tabla.setdefault(t, v)
    else:
        desc_col.setdefault((t, c), v)
desc_col.update(CAMBIOS)

tablas = [t for (t,) in q(f"SELECT table_name FROM information_schema.tables WHERE table_schema='{ESQ}'")]
orden_sql = re.findall(r'CREATE TABLE IF NOT EXISTS (\w+)', open(SQL, encoding='utf-8').read()) if os.path.exists(SQL) else []
tablas.sort(key=lambda t: orden_sql.index(t) if t in orden_sql else len(orden_sql))
cols = q(f"""SELECT table_name, column_name, column_type, data_type, IFNULL(character_maximum_length,''), is_nullable,
  IFNULL(column_default,'#NULO#'), extra, IFNULL(generation_expression,''), numeric_precision, numeric_scale
  FROM information_schema.columns WHERE table_schema='{ESQ}' ORDER BY table_name, ordinal_position""")
idx = q(f"""SELECT table_name, index_name, non_unique, GROUP_CONCAT(column_name ORDER BY seq_in_index)
  FROM information_schema.statistics WHERE table_schema='{ESQ}' GROUP BY table_name, index_name, non_unique ORDER BY table_name, index_name""")
fks = q(f"""SELECT k.table_name, k.column_name, k.referenced_table_name, k.referenced_column_name, k.constraint_name, rc.delete_rule, rc.update_rule
  FROM information_schema.key_column_usage k JOIN information_schema.referential_constraints rc
  ON rc.constraint_schema=k.constraint_schema AND rc.constraint_name=k.constraint_name AND rc.table_name=k.table_name
  WHERE k.table_schema='{ESQ}' AND k.referenced_table_name IS NOT NULL ORDER BY k.table_name, k.column_name""")
chks = q(f"SELECT table_name, constraint_name, check_clause FROM information_schema.check_constraints WHERE constraint_schema='{ESQ}' ORDER BY table_name, constraint_name")
chks = [(t, n, c.replace('`', '')) for t, n, c in chks]

def largo(column_type, data_type, maxlen, prec, esc):
    if data_type in ('varchar', 'char', 'text', 'mediumtext', 'longtext'):
        return maxlen
    if data_type == 'decimal':
        return f'{prec},{esc}'
    m = re.match(r'\w+\((\d+)\)', column_type)
    return m.group(1) if m and data_type in ('int', 'tinyint', 'smallint', 'bigint') else ''

indices_de = {}
for t, i, nu, cs in idx:
    for c in cs.split(','):
        indices_de.setdefault((t, c), []).append(i)
pk = {(t, c) for t, i, _, cs in idx if i == 'PRIMARY' for c in cs.split(',')}
uq = {(t, c) for t, i, nu, cs in idx if nu == '0' and i != 'PRIMARY' for c in cs.split(',') if len(cs.split(',')) == 1}
uqc = {(t, c) for t, i, nu, cs in idx if nu == '0' and i != 'PRIMARY' and ',' in cs for c in cs.split(',')}
fk_de = {(t, c): (rt, rc, n, d, u) for t, c, rt, rc, n, d, u in fks}

filas = []
for t, c, ctype, dt, maxlen, nulo, defecto, extra, gen, prec, esc in cols:
    clave = ', '.join(x for x, ok in (('PK', (t, c) in pk), ('FK', (t, c) in fk_de), ('UQ', (t, c) in uq and (t, c) not in pk), ('UQ compuesta', (t, c) in uqc and (t, c) not in uq and (t, c) not in pk)) if ok)
    restr = []
    if gen:
        restr.append('Generada: ' + gen.replace('`', ''))
    if 'auto_increment' in extra:
        restr.append('AUTO_INCREMENT')
    if dt == 'enum':
        restr.append('Valores: ' + ','.join(re.findall(r"'([^']*)'", ctype)))
    for tt, n, cl in chks:
        if tt == t and re.search(r'\b%s\b' % re.escape(c), cl):
            restr.append(f'{n}: {cl}')
    rel = ''
    if (t, c) in fk_de:
        rt, rc, n, d, u = fk_de[(t, c)]
        rel = f'{rt}.{rc} ({n}; ON DELETE {d}' + (f'; ON UPDATE {u}' if u != 'RESTRICT' else '') + ')'
    df = '' if defecto == '#NULO#' and nulo == 'NO' else ('NULL' if defecto == '#NULO#' else defecto)
    if gen:
        df = 'NULL' if nulo == 'YES' else ''
    filas.append([t, c, desc_col.get((t, c), ''), dt.upper(), largo(ctype, dt, maxlen, prec, esc), 'Sí' if nulo == 'YES' else 'No',
                  clave, df, ' · '.join(restr), rel, ', '.join(sorted(indices_de.get((t, c), [])))])

# ---- Markdown
md = [f'# Diccionario de datos — {ESQ} (esquema {VERSION})', '',
      '> Generado desde `information_schema` de la base importada con `database/skilly.sql` (`database/verificar/generar_diccionario.py`). Versión editable con filtros: `Diccionario_de_Datos.xlsx`.', '',
      'Abreviaturas: PK clave primaria · FK clave foránea · UQ única · Nulo = admite NULL.', '']
for t in tablas:
    area, d = desc_tabla.get(t, ('', ''))
    md += [f'## `{t}`', '', f'**Área:** {area}. {d}', '',
           '| Columna | Descripción | Tipo | Long. | Nulo | Clave | Defecto | Restricciones | Relación | Índices |',
           '|---|---|---|---|---|---|---|---|---|---|']
    md += ['| ' + ' | '.join(str(x) for x in f[1:]) + ' |' for f in filas if f[0] == t]
    md.append('')
open(os.path.join(DIR, 'DICCIONARIO_DATOS.md'), 'w', encoding='utf-8').write('\n'.join(md))

# ---- Excel
CAB = Font(bold=True, color='FFFFFF'); RELL = PatternFill('solid', fgColor='34436D'); TIT = Font(bold=True, size=14)
NOTA = f'Generado automáticamente desde information_schema de la base skilly_db (esquema {VERSION}), por lo que coincide exactamente con database/skilly.sql.'
wb = openpyxl.Workbook(); wb.remove(wb.active)
def hoja(nombre, titulo, cab, datos, anchos):
    ws = wb.create_sheet(nombre)
    ws['A1'] = titulo; ws['A1'].font = TIT; ws['A2'] = NOTA
    for i, h in enumerate(cab, 1):
        c = ws.cell(3, i, h); c.font = CAB; c.fill = RELL; c.alignment = Alignment(wrap_text=True, vertical='top')
    for r, fila in enumerate(datos, 4):
        for i, v in enumerate(fila, 1):
            ws.cell(r, i, v).alignment = Alignment(wrap_text=True, vertical='top')
    for i, w in enumerate(anchos):
        ws.column_dimensions[chr(65 + i)].width = w
    ws.freeze_panes = 'C4'; ws.auto_filter.ref = f'A3:{chr(64 + len(cab))}{3 + len(datos)}'
ncols = {t: sum(1 for f in filas if f[0] == t) for t in tablas}
pk_t = {t: ', '.join(cs.split(',')) for t, i, _, cs in idx if i == 'PRIMARY'}
salientes = {}
for t, c, rt, *_ in fks:
    if rt not in salientes.setdefault(t, []):
        salientes[t].append(rt)
hoja('Tablas', 'Tablas de skilly_db', ['Tabla', 'Área', 'Descripción', 'N.º columnas', 'Clave primaria', 'Referencias (FK salientes)'],
     [[t, desc_tabla.get(t, ('', ''))[0], desc_tabla.get(t, ('', ''))[1], ncols[t], pk_t.get(t, ''), ', '.join(sorted(salientes.get(t, []))) or None] for t in tablas],
     [28, 15, 70, 10, 26, 46])
hoja('Diccionario', 'Diccionario de datos', ['Tabla', 'Columna', 'Descripción', 'Tipo', 'Longitud / precisión', 'Nulo', 'Clave', 'Valor por defecto', 'Restricciones', 'Relación (FK)', 'Índices que la incluyen'],
     [[x if x != '' else None for x in f] for f in sorted(filas, key=lambda f: tablas.index(f[0]))], [24, 26, 52, 11, 12, 7, 9, 18, 46, 46, 36])
card = lambda t, c: 'N:0..1 (opcional)' if [x for x in cols if x[0] == t and x[1] == c][0][5] == 'YES' else ('1:1 (obligatoria)' if (t, c) in uq or pk_t.get(t) == c else 'N:1 (obligatoria)')
hoja('Relaciones', 'Relaciones (claves foráneas)', ['Tabla hija', 'Columna', 'Tabla padre', 'Columna padre', 'Restricción', 'ON DELETE', 'ON UPDATE', 'Cardinalidad'],
     [[t, c, rt, rc, n, d, u, card(t, c)] for t, c, rt, rc, n, d, u in fks], [26, 24, 24, 14, 30, 12, 12, 18])
hoja('Índices', 'Índices', ['Tabla', 'Índice', 'Único', 'Columnas'], [[t, i, 'No' if nu == '1' else 'Sí', cs] for t, i, nu, cs in sorted(idx, key=lambda x: (x[0], x[1] != 'PRIMARY', x[1]))], [28, 36, 8, 50])
hoja('CHECK', 'Restricciones CHECK', ['Tabla', 'Restricción', 'Condición'], [list(x) for x in chks], [26, 34, 100])
wb.save(XLSX)
print(f'{len(tablas)} tablas, {len(filas)} columnas, {len(fks)} FK, {len(idx)} índices, {len(chks)} CHECK')

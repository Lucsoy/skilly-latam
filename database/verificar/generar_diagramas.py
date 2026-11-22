"""
Genera los diagramas Mermaid del modelo LÓGICO y FÍSICO desde information_schema, para
que siempre coincidan con la base instalada.

Uso:  python3 database/verificar/generar_diagramas.py [esquema] [carpeta_salida]
      (por defecto: skilly_db  docs/02_base_datos/diagramas)
Luego, para las imágenes:  npx @mermaid-js/mermaid-cli -i der_fisico.mmd -o der_fisico.svg
"""
import os, re, subprocess, sys

ESQ = sys.argv[1] if len(sys.argv) > 1 else 'skilly_db'
SAL = sys.argv[2] if len(sys.argv) > 2 else 'docs/02_base_datos/diagramas'
if not re.fullmatch(r'[A-Za-z0-9_]+', ESQ):
    sys.exit('Nombre de esquema inválido')

def q(sql):
    r = subprocess.run(['mariadb', '-uroot', '-N', '-B', '--default-character-set=utf8mb4', '-e', sql], capture_output=True, text=True, check=True)
    return [l.split('\t') for l in r.stdout.splitlines() if l]

tablas = [t for (t,) in q(f"SELECT table_name FROM information_schema.tables WHERE table_schema='{ESQ}' ORDER BY table_name")]
# Mismo orden que database/skilly.sql (todas se crean en el mismo segundo).
SQL = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'skilly.sql')
if len(sys.argv) > 3:
    SQL = sys.argv[3]
if os.path.exists(SQL):
    en_sql = re.findall(r'CREATE TABLE IF NOT EXISTS (\w+)', open(SQL, encoding='utf-8').read())
    tablas.sort(key=lambda t: en_sql.index(t) if t in en_sql else len(en_sql))
orden = {t: i for i, t in enumerate(tablas)}
cols = q(f"""SELECT table_name, column_name, data_type,
  IF(data_type='decimal', CONCAT(numeric_precision,'_',numeric_scale), IFNULL(character_maximum_length,'')), is_nullable, ordinal_position
  FROM information_schema.columns WHERE table_schema='{ESQ}' ORDER BY table_name, ordinal_position""")
pk = {(t, c) for t, c in q(f"SELECT table_name, column_name FROM information_schema.key_column_usage WHERE table_schema='{ESQ}' AND constraint_name='PRIMARY'")}
uk_cols = {}
for t, i, c in q(f"SELECT table_name, index_name, column_name FROM information_schema.statistics WHERE table_schema='{ESQ}' AND non_unique=0 AND index_name<>'PRIMARY'"):
    uk_cols.setdefault((t, i), []).append(c)
uk = {(t, cs[0]) for (t, _), cs in uk_cols.items() if len(cs) == 1}
fks = q(f"""SELECT k.table_name, k.column_name, k.referenced_table_name, rc.delete_rule FROM information_schema.key_column_usage k
  JOIN information_schema.referential_constraints rc ON rc.constraint_schema=k.constraint_schema AND rc.constraint_name=k.constraint_name AND rc.table_name=k.table_name
  WHERE k.table_schema='{ESQ}' AND k.referenced_table_name IS NOT NULL""")
fks.sort(key=lambda f: (f[0], f[1]))
fk = {(t, c) for t, c, _, _ in fks}
nulos = {(t, c): n == 'YES' for t, c, _, _, n, _ in cols}
pk_por_tabla = {}
for t, c in pk:
    pk_por_tabla.setdefault(t, set()).add(c)

def tipo(dt, largo):
    return f'{dt}_{largo}' if dt in ('varchar', 'char', 'decimal') else dt

def marcas(t, c):
    m = [x for x, ok in (('PK', (t, c) in pk), ('FK', (t, c) in fk), ('UK', (t, c) in uk and (t, c) not in pk)) if ok]
    return (' ' + ','.join(m)) if m else ''

def generar(fisico):
    out = ['erDiagram']
    for t in tablas:
        out.append(f'  {t} {{')
        for tt, c, dt, largo, _, _ in cols:
            if tt != t:
                continue
            m = marcas(t, c)
            if fisico or m:
                out.append(f'    {tipo(dt, largo)} {c}{m}')
        out.append('  }')
    for t, c, ref, regla in fks:
        padre = '|o' if nulos[(t, c)] else '||'
        hijo = 'o|' if (t, c) in uk or pk_por_tabla.get(t) == {c} else 'o{'
        out.append(f'  {ref} {padre}--{hijo} {t} : "{c} ({regla})"')
    return '\n'.join(out) + '\n'

# Vistas por módulo (modelo físico de un subconjunto de tablas): legibles en una página.
MODULOS = {
    'modulo_cuentas_perfiles': ['organizaciones', 'cuentas', 'sesiones_autenticacion', 'intentos_login', 'profesionales',
                                'perfiles_profesionales', 'documentos_respaldo', 'profesional_formacion',
                                'profesional_experiencia', 'profesional_habilidades', 'profesional_insignias'],
    'modulo_catalogo_agenda': ['categorias', 'subcategorias', 'servicios', 'servicio_entregables', 'servicio_modalidades',
                               'servicio_etiquetas', 'solicitudes_revision_servicio', 'favoritos', 'horarios_semanales',
                               'bloqueos_disponibilidad', 'bloques_disponibles', 'retenciones'],
    'modulo_contratacion': ['reservas', 'contadores_reserva', 'historial_reservas', 'mensajes_chat', 'evaluaciones',
                            'configuracion_plataforma', 'tramos_cancelacion'],
}

def generar_modulo(incluidas):
    global tablas
    todas = tablas
    tablas = [t for t in todas if t in incluidas]
    texto = generar(True)
    tablas = todas
    # Solo relaciones entre tablas del módulo.
    lineas = [l for l in texto.splitlines() if '--' not in l or (l.split()[0] in incluidas and l.split()[2] in incluidas)]
    return '\n'.join(lineas) + '\n'

os.makedirs(SAL, exist_ok=True)
for nombre, fisico in (('modelo_logico.mmd', False), ('der_fisico.mmd', True)):
    with open(os.path.join(SAL, nombre), 'w', encoding='utf-8') as f:
        f.write(generar(fisico))
for nombre, incluidas in MODULOS.items():
    with open(os.path.join(SAL, nombre + '.mmd'), 'w', encoding='utf-8') as f:
        f.write(generar_modulo(incluidas))
print(f'{len(tablas)} tablas y {len(fks)} relaciones → {SAL}')

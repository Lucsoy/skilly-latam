#!/usr/bin/env python3
"""Genera el informe final en Word y PDF a partir de docs/INFORME_FINAL.md.

Uso (desde la raíz del proyecto):
    python3 docs/generar_informe.py [carpeta_salida]

Requisitos: pandoc >= 3, LibreOffice (soffice) y pdftotext (Poppler).
La variable de entorno SOFFICE permite indicar otro ejecutable de LibreOffice.

- El .docx lleva un índice como campo de Word: Word ofrece actualizarlo al abrir
  el archivo (responder «Sí») y así los números de página quedan exactos.
- El .pdf lleva un índice estático cuyos números de página se calculan en una
  primera conversión y se escriben en la segunda.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

AQUI = os.path.dirname(os.path.abspath(__file__))
FUENTE = os.path.join(AQUI, 'INFORME_FINAL.md')
NOMBRE = 'Informe_Final_Skilly_LATAM'
SOFFICE = os.environ.get('SOFFICE', 'soffice')
AZUL = '1F3864'

def _portada():
    """Lee docs/datos_portada.json (institución, asignatura, docente, integrantes)."""
    import json
    with open(os.path.join(AQUI, 'datos_portada.json'), encoding='utf-8') as f:
        d = json.load(f)
    integrantes = d.get('integrantes') or ['Integrantes: (completar)']
    filas = [
        # (texto, tamaño en medios puntos, negrita, color, espacio posterior)
        (d.get('institucion', ''), 24, False, '595959', 1800),
        ('Skilly LATAM', 64, True, AZUL, 120),
        ('Plataforma Talent as a Service para Personas y Back Office', 28, False, AZUL, 600),
        ('Informe final', 36, True, '000000', 80),
        ('Evaluación Sumativa N.º 3', 28, False, '000000', 2200),
        (d.get('asignatura', ''), 24, False, '000000', 80),
        (d.get('docente', ''), 24, False, '000000', 80),
    ]
    for i, nombre in enumerate(integrantes):
        filas.append((nombre, 24, False, '000000', 1600 if i == len(integrantes) - 1 else 40))
    filas.append((d.get('lugar_fecha', ''), 24, False, '000000', 0))
    return filas


PORTADA = _portada()


def esc(t):
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def parrafo(texto, tam, negrita, color, despues, alin='center'):
    b = '<w:b/>' if negrita else ''
    return (f'<w:p><w:pPr><w:jc w:val="{alin}"/><w:spacing w:before="0" w:after="{despues}"/></w:pPr>'
            f'<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>{b}<w:color w:val="{color}"/>'
            f'<w:sz w:val="{tam}"/></w:rPr><w:t xml:space="preserve">{esc(texto)}</w:t></w:r></w:p>')


SALTO = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'


def titulos(md):
    return [l[2:].strip() for l in md.splitlines() if l.startswith('# ')]


def indice_campo():
    return ('<w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r>'
            '<w:r><w:instrText xml:space="preserve"> TOC \\o "1-1" \\h \\z \\u </w:instrText></w:r>'
            '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
            '<w:r><w:t>Haga clic derecho y elija «Actualizar campo» para generar el índice.</w:t></w:r>'
            '<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>')


def indice_estatico(lista, paginas):
    out = []
    for i, t in enumerate(lista, 1):
        pag = str(paginas.get(i, '00'))
        out.append('<w:p><w:pPr><w:tabs><w:tab w:val="left" w:pos="567"/>'
                   '<w:tab w:val="right" w:leader="dot" w:pos="9350"/></w:tabs>'
                   '<w:spacing w:before="0" w:after="100"/></w:pPr>'
                   f'<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>'
                   f'<w:t xml:space="preserve">{i}</w:t><w:tab/><w:t xml:space="preserve">{esc(t)}</w:t>'
                   f'<w:tab/><w:t>{pag}</w:t></w:r></w:p>')
    return ''.join(out)


def bloque_inicial(indice_xml):
    portada = ''.join(parrafo(*p) for p in PORTADA)
    titulo_indice = parrafo('Índice', 32, True, AZUL, 300, alin='left')
    return portada + SALTO + titulo_indice + indice_xml + SALTO


PIE = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
       '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
       '<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="BFBFBF"/></w:pBdr>'
       '<w:tabs><w:tab w:val="right" w:pos="9350"/></w:tabs></w:pPr>'
       '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="595959"/><w:sz w:val="18"/></w:rPr>'
       '<w:t xml:space="preserve">Skilly LATAM · Informe final · Evaluación Sumativa N.º 3</w:t><w:tab/></w:r>'
       '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>'
       '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>'
       '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r>'
       '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr><w:t>1</w:t></w:r>'
       '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>'
       '</w:p></w:ftr>')

SECCION = ('<w:sectPr><w:footerReference w:type="default" r:id="rIdPie1"/>'
           '<w:pgSz w:w="12240" w:h="15840"/>'
           '<w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/>'
           '<w:titlePg/></w:sectPr>')


def documento_referencia(tmp):
    ref = os.path.join(tmp, 'ref.docx')
    with open(ref, 'wb') as f:
        f.write(subprocess.check_output(['pandoc', '--print-default-data-file', 'reference.docx']))
    with zipfile.ZipFile(ref) as z:
        partes = {n: z.read(n) for n in z.namelist()}
    s = partes['word/styles.xml'].decode()
    s = re.sub(r'w:asciiTheme="[^"]+"', 'w:ascii="Arial"', s)
    s = re.sub(r'w:hAnsiTheme="[^"]+"', 'w:hAnsi="Arial"', s)
    s = re.sub(r'w:eastAsiaTheme="[^"]+"', 'w:eastAsia="Arial"', s)
    s = re.sub(r'w:cstheme="[^"]+"', 'w:cs="Arial"', s)
    s = re.sub(r'<w:color w:val="[0-9A-Fa-f]{6}" w:themeColor="accent1"[^/]*/>', f'<w:color w:val="{AZUL}"/>', s)
    partes['word/styles.xml'] = s.encode()
    salida = os.path.join(tmp, 'ref_arial.docx')
    with zipfile.ZipFile(salida, 'w', zipfile.ZIP_DEFLATED) as o:
        for n, b in partes.items():
            o.writestr(n, b)
    return salida


def estilos_tabla(s):
    bordes = (f'<w:tblBorders><w:top w:val="single" w:sz="8" w:space="0" w:color="{AZUL}"/>'
              f'<w:bottom w:val="single" w:sz="8" w:space="0" w:color="{AZUL}"/>'
              '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/></w:tblBorders>')
    i = s.find('w:styleId="Table"')
    j = s.find('</w:style>', i)
    bloque = s[i:j]
    bloque = bloque.replace('<w:tblInd w:type="dxa" w:w="0" />', '<w:tblInd w:type="dxa" w:w="0" />' + bordes, 1)
    bloque = bloque.replace('<w:vAlign w:val="bottom" />',
                            '<w:vAlign w:val="bottom" /><w:shd w:val="clear" w:color="auto" w:fill="D9E2F3"/>')
    bloque = bloque.replace('</w:tcPr>\n    </w:tblStylePr>', '</w:tcPr>\n      <w:rPr><w:b/></w:rPr>\n    </w:tblStylePr>')
    return s[:i] + bloque + s[j:]


def postprocesar(docx_in, docx_out, indice_xml, actualizar_campos):
    with zipfile.ZipFile(docx_in) as z:
        partes = {n: z.read(n) for n in z.namelist() if not n.endswith('/')}
    d = partes['word/document.xml'].decode()
    marca = re.search(r'<w:p>(?:(?!<w:p>).)*?@@PORTADA@@.*?</w:p>', d, re.S)
    if not marca:
        sys.exit('No se encontró la marca @@PORTADA@@ en el documento.')
    d = d[:marca.start()] + bloque_inicial(indice_xml) + d[marca.end():]
    d = re.sub(r'<w:sectPr\s*/>|<w:sectPr>.*?</w:sectPr>', SECCION, d, flags=re.S)
    if 'xmlns:r=' not in d[:2000]:
        sys.exit('El documento no declara el espacio de nombres r.')
    partes['word/document.xml'] = d.encode()
    partes['word/styles.xml'] = estilos_tabla(partes['word/styles.xml'].decode()).encode()
    partes['word/footer1.xml'] = PIE.encode()
    rels = partes['word/_rels/document.xml.rels'].decode()
    rels = rels.replace('</Relationships>',
                        '<Relationship Id="rIdPie1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>')
    partes['word/_rels/document.xml.rels'] = rels.encode()
    ct = partes['[Content_Types].xml'].decode()
    ct = ct.replace('</Types>', '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>')
    partes['[Content_Types].xml'] = ct.encode()
    if actualizar_campos:
        st = partes['word/settings.xml'].decode()
        st = re.sub(r'(<w:settings[^>]*>)', r'\1<w:updateFields w:val="true"/>', st, count=1)
        partes['word/settings.xml'] = st.encode()
    with zipfile.ZipFile(docx_out, 'w', zipfile.ZIP_DEFLATED) as o:
        orden = ['[Content_Types].xml'] + [n for n in partes if n != '[Content_Types].xml']
        for n in orden:
            o.writestr(n, partes[n])


def a_pdf(docx, carpeta):
    subprocess.run([SOFFICE, '--headless', '--convert-to', 'pdf', '--outdir', carpeta, docx],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return os.path.splitext(docx)[0] + '.pdf'


def paginas_de_titulos(pdf, lista):
    n_pag = int(re.search(r'Pages:\s+(\d+)', subprocess.check_output(['pdfinfo', pdf]).decode()).group(1))
    textos = {p: subprocess.check_output(['pdftotext', '-layout', '-f', str(p), '-l', str(p), pdf, '-']).decode()
              for p in range(3, n_pag + 1)}
    res, desde = {}, 3
    for i, t in enumerate(lista, 1):
        patron = re.compile(rf'^\s*{i}\s+{re.escape(t)}\s*$', re.M)
        for p in range(desde, n_pag + 1):
            if patron.search(textos[p]):
                res[i] = desde = p
                break
    return res


def main():
    destino = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else AQUI
    os.makedirs(destino, exist_ok=True)
    md = open(FUENTE, encoding='utf-8').read()
    lista = titulos(md)
    with tempfile.TemporaryDirectory() as tmp:
        ref = documento_referencia(tmp)
        base = os.path.join(tmp, 'base.docx')
        subprocess.run(['pandoc', FUENTE, '-o', base, '--reference-doc', ref, '-N',
                        '--resource-path', f'{AQUI}:{os.path.dirname(AQUI)}'], check=True, cwd=AQUI)
        # Word: índice como campo.
        postprocesar(base, os.path.join(destino, NOMBRE + '.docx'), indice_campo(), True)
        # PDF: índice estático en dos pasadas.
        pdf_dir = os.path.join(tmp, 'pdf')
        os.makedirs(pdf_dir)
        tmp_docx = os.path.join(pdf_dir, NOMBRE + '.docx')
        postprocesar(base, tmp_docx, indice_estatico(lista, {}), False)
        paginas = paginas_de_titulos(a_pdf(tmp_docx, pdf_dir), lista)
        faltan = [t for i, t in enumerate(lista, 1) if i not in paginas]
        if faltan:
            print('Advertencia: no se ubicó la página de:', faltan)
        postprocesar(base, tmp_docx, indice_estatico(lista, paginas), False)
        shutil.copy(a_pdf(tmp_docx, pdf_dir), os.path.join(destino, NOMBRE + '.pdf'))
    print(f'Generados {NOMBRE}.docx y {NOMBRE}.pdf en {destino} ({len(lista)} secciones numeradas).')


if __name__ == '__main__':
    main()

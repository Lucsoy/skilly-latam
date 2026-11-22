"""
Pruebas funcionales de extremo a extremo (E2E) de Skilly LATAM en un navegador
real (Google Chrome headless) con Playwright.

Recorre el ciclo completo de contratación desde los tres roles usando la
interfaz, verifica accesibilidad básica por teclado, que un contenido HTML
malicioso del chat no se ejecute, y toma capturas responsivas.

Requisitos:
  - API levantada y base recién importada (bash scripts/entorno-pruebas.sh).
  - Frontend:  SKILLY_API_PROXY=http://127.0.0.1:8080/skilly-api npm run dev
  - pip install playwright   (usa el Chrome instalado: CHROME=/ruta/a/chrome)

Uso:  python3 tests/e2e/flujo_e2e.py [--salida carpeta_evidencias]
Genera resultados_e2e.json y una captura PNG por paso en la carpeta de salida.
"""
import json
import os
import sys
import time
import urllib.request
from datetime import datetime
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

WEB = os.environ.get('SKILLY_WEB_URL', 'http://localhost:5173')
API = os.environ.get('SKILLY_API_URL', 'http://127.0.0.1:8080/api')
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
SALIDA = Path(sys.argv[sys.argv.index('--salida') + 1] if '--salida' in sys.argv else 'evidencias_e2e')
SALIDA.mkdir(parents=True, exist_ok=True)
RUN = datetime.now().strftime('%H%M%S')
FUNDADORA = ('fundadora@skilly.cl', os.environ.get('SKILLY_FUNDADORA_CLAVE', 'Skilly#Fundadora2026'))
# La API exige cambiar la contraseña inicial antes de operar (T-07): E2E-21 la cambia por la interfaz.
FUNDADORA_NUEVA = os.environ.get('SKILLY_FUNDADORA_CLAVE_NUEVA', 'FundadoraPruebas2026')
ORG = {'email': f'org.e2e.{RUN}@ejemplo.test', 'clave': 'Organiza2026', 'razon': f'Panadería Los Andes {RUN}'}
PROF = {'email': f'prof.e2e.{RUN}@ejemplo.test', 'clave': 'Profesional2026', 'nombre': 'Valeria Prueba Núñez'}
resultados = []
contexto = {}
DEPENDE_DE_RESERVA = {f'E2E-{n:02d}' for n in range(6, 16)}


def api(metodo, ruta, cuerpo=None, token=None, form=None):
    datos, cab = None, {}
    if cuerpo is not None:
        datos = json.dumps(cuerpo).encode()
        cab['Content-Type'] = 'application/json'
    if form is not None:
        limite = 'skillyE2E'
        partes = []
        for k, v in form.items():
            if isinstance(v, tuple):
                partes.append(f'--{limite}\r\nContent-Disposition: form-data; name="{k}"; filename="{v[0]}"\r\nContent-Type: application/pdf\r\n\r\n'.encode() + v[1] + b'\r\n')
            else:
                partes.append(f'--{limite}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
        datos = b''.join(partes) + f'--{limite}--\r\n'.encode()
        cab['Content-Type'] = f'multipart/form-data; boundary={limite}'
    if token:
        cab['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(API + ruta, data=datos, method=metodo, headers=cab)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read() or b'null')
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'{metodo} {ruta} → {e.code} {e.read()[:200]}')


def rut(cuerpo):
    s, m = 0, 2
    for d in reversed(str(cuerpo)):
        s += int(d) * m
        m = 2 if m == 7 else m + 1
    r = 11 - s % 11
    return f"{cuerpo}-{'0' if r == 11 else 'K' if r == 10 else r}"


class Bloqueado(Exception):
    pass


def paso(pid, descripcion, pagina=None):
    """Decorador: ejecuta un paso, guarda captura y registra el resultado."""
    def envoltura(fn):
        if pid in DEPENDE_DE_RESERVA and 'reserva' not in contexto:
            resultados.append({'id': pid, 'descripcion': descripcion, 'estado': 'bloqueado', 'motivo': 'no se creó la reserva (E2E-05)'})
            print(f'[bloqueado] {pid} {descripcion}')
            return fn
        t0 = time.time()
        reg = {'id': pid, 'descripcion': descripcion, 'inicio': datetime.now().isoformat(timespec='seconds')}
        try:
            detalle = fn()
            reg.update(estado='aprobado', detalle=detalle)
        except Exception as e:  # noqa: BLE001 - se registra cualquier fallo
            reg.update(estado='fallido', error=str(e)[:400], detiene=True)
        reg['segundos'] = round(time.time() - t0, 1)
        p = pagina() if callable(pagina) else pagina
        if p is not None:
            archivo = SALIDA / f'{pid}.png'
            try:
                p.screenshot(path=str(archivo), full_page=True)
                reg['captura'] = archivo.name
            except Exception:  # noqa: BLE001
                pass
        resultados.append(reg)
        print(f"[{reg['estado']:>9}] {pid} {descripcion}" + (f" — {reg.get('error')}" if reg.get('error') else ''))
        return fn
    return envoltura


def ingresar(pagina, email, clave):
    pagina.goto(f'{WEB}/ingresar')
    pagina.get_by_label('Correo', exact=True).fill(email)
    pagina.get_by_label('Contraseña', exact=True).fill(clave)
    pagina.get_by_role('button', name='Ingresar', exact=True).click()
    pagina.wait_for_url(lambda u: '/ingresar' not in u, timeout=15000)


# --------------------------------------------------------------------------
# Preparación por API: profesional validado con servicio publicado y agenda.
# (El registro y la contratación se hacen por la interfaz más abajo.)
# --------------------------------------------------------------------------
def preparar():
    """Profesional validado con servicio publicado y agenda (se llama después de E2E-21)."""
    global tf, tp, prof_id, SERVICIO
    tf = api('POST', '/auth/login', {'email': FUNDADORA[0], 'contrasena': FUNDADORA_NUEVA})['token']
    sp = api('POST', '/profesionales/', {'nombreCompleto': PROF['nombre'], 'email': PROF['email'], 'contrasena': PROF['clave'], 'areaPrincipal': 'reclutamiento', 'consentimiento': True})
    tp, prof_id = sp['token'], sp['profesional']['id']
    api('PUT', '/profesionales/?accion=mi-perfil', {'titulo': 'Consultora en selección', 'ciudad': 'Valparaíso', 'presentacion': 'Acompaño a pymes en procesos de selección y en la incorporación de nuevas personas.', 'formacion': ['Psicología'], 'experiencia': [], 'habilidades': ['Selección']}, tp)
    doc = api('POST', '/profesionales/?accion=documento', form={'tipo': 'curriculum', 'archivo': ('cv.pdf', b'%PDF-1.4\n%%EOF\n')}, token=tp)
    api('POST', f"/admin/?accion=documento-estado&id={doc['id']}", {'estado': 'aprobado'}, tf)
    api('POST', f'/admin/?accion=validar-profesional&id={prof_id}', {'decision': 'validar', 'comentario': 'Antecedentes en orden'}, tf)
    api('PUT', '/disponibilidad/?accion=horarios', {'horarios': [{'dia': d, 'activo': True, 'desde': '09:00', 'hasta': '13:00'} for d in range(7)]}, tp)
    srv = api('POST', '/servicios/', {'categoriaId': 'reclutamiento', 'subcategoriaId': 'busqueda-perfiles', 'titulo': f'Selección de vendedor/a {RUN}', 'descripcion': 'Búsqueda, entrevistas por competencias y terna final para un cargo de ventas.', 'entregables': ['Terna final', 'Informe'], 'duracionEstimada': '2 semanas', 'duracionSesionMinutos': 60, 'modalidades': ['remoto', 'hibrido'], 'precio': 280000, 'etiquetas': ['ventas'], 'publicado': True}, tp)
    SERVICIO = srv['id']


with sync_playwright() as pw:
    nav = pw.chromium.launch(executable_path=CHROME, headless=True, args=['--no-sandbox'])
    org = nav.new_context(viewport={'width': 1366, 'height': 900}, locale='es-CL', timezone_id='America/Santiago')
    pro = nav.new_context(viewport={'width': 1366, 'height': 900}, locale='es-CL', timezone_id='America/Santiago')
    adm = nav.new_context(viewport={'width': 1366, 'height': 900}, locale='es-CL', timezone_id='America/Santiago')
    cta = nav.new_context(viewport={'width': 1366, 'height': 900}, locale='es-CL', timezone_id='America/Santiago')
    po, pp, pa, pc = org.new_page(), pro.new_page(), adm.new_page(), cta.new_page()
    errores_consola = []
    for pg in (po, pp, pa, pc):
        pg.on('pageerror', lambda e: errores_consola.append(str(e)))

    @paso('E2E-21', 'La fundadora debe cambiar la contraseña inicial publicada antes de usar el panel (T-07)', pc)
    def _():
        ingresar(pc, *FUNDADORA)
        pc.wait_for_url('**/admin/cuenta', timeout=15000)
        expect(pc.get_by_text('Esta cuenta usa la contraseña inicial').first).to_be_visible(timeout=10000)
        pc.goto(f'{WEB}/admin/reservas')
        pc.wait_for_url('**/admin/cuenta', timeout=10000)
        pc.get_by_label('Contraseña actual').fill(FUNDADORA[1])
        pc.get_by_label('Nueva contraseña').fill(FUNDADORA_NUEVA)
        pc.get_by_label('Repite la nueva').fill(FUNDADORA_NUEVA)
        pc.get_by_role('button', name='Actualizar contraseña').click()
        expect(pc.get_by_text('Contraseña actualizada').first).to_be_visible(timeout=10000)
        pc.goto(f'{WEB}/admin/reservas')
        pc.wait_for_url('**/admin/reservas', timeout=10000)
        return 'Redirige a Mi cuenta hasta cambiarla; después el panel queda disponible.'

    preparar()

    @paso('E2E-01', 'Registro de organización desde la interfaz (RUT válido y consentimiento)', po)
    def _():
        po.goto(f'{WEB}/registro')
        po.get_by_label('Razón social').fill(ORG['razon'])
        po.get_by_label('RUT').fill(rut(76000000 + int(RUN) % 900000))
        po.get_by_label('Giro').fill('Elaboración de pan')
        po.get_by_role('button', name='Tamaño').click()
        po.get_by_role('option', name='11 a 50 personas').click()
        po.get_by_label('Nombre y apellido').fill('Rosa Contacto')
        po.get_by_label('Correo', exact=True).fill(ORG['email'])
        po.get_by_label('Contraseña', exact=True).fill(ORG['clave'])
        po.get_by_role('checkbox').first.check()
        po.get_by_role('button', name='Crear cuenta').click()
        po.wait_for_url('**/buscar**', timeout=15000)
        return 'Cuenta creada y sesión iniciada; redirige al catálogo.'

    @paso('E2E-02', 'Validación de formulario: RUT inválido muestra el error en pantalla', lambda: pa)
    def _():
        pa.goto(f'{WEB}/registro')
        pa.get_by_label('RUT').fill('11.111.111-2')
        pa.get_by_role('button', name='Crear cuenta').click()
        expect(pa.get_by_text('dígito verificador', exact=False).first).to_be_visible(timeout=5000)
        return 'Mensaje de dígito verificador visible; no se envía al servidor.'

    @paso('E2E-03', 'Catálogo: búsqueda por texto y filtro de modalidad (INC-02)', po)
    def _():
        po.goto(f'{WEB}/buscar?q={RUN}&mod=hibrido')
        expect(po.get_by_text(f'Selección de vendedor/a {RUN}').first).to_be_visible(timeout=15000)
        po.goto(f'{WEB}/buscar?q={RUN}&mod=presencial')
        po.wait_for_timeout(1500)
        visible = po.get_by_text(f'Selección de vendedor/a {RUN}').count()
        if visible:
            raise AssertionError('El filtro presencial no debió mostrar el servicio')
        po.goto(f'{WEB}/buscar?q={RUN}')
        expect(po.get_by_text(f'Selección de vendedor/a {RUN}').first).to_be_visible(timeout=15000)
        return 'Híbrido: 1 resultado; presencial: 0 resultados.'

    @paso('E2E-04', 'Ficha del servicio y agendamiento: día, hora y retención del bloque', po)
    def _():
        po.goto(f'{WEB}/servicios/{SERVICIO}')
        po.get_by_role('link', name='Ver disponibilidad y agendar').click()
        po.wait_for_url(f'**/agendar/{SERVICIO}', timeout=15000)
        po.locator('button[aria-label*="con horas disponibles"]').first.click()
        po.locator('ul button[aria-pressed]').first.click()
        expect(po.get_by_role('button', name='Continuar a las condiciones')).to_be_enabled(timeout=10000)
        return 'Bloque retenido; cuenta regresiva visible.'

    @paso('E2E-05', 'Condiciones: aceptación explícita y envío de la solicitud', po)
    def _():
        po.get_by_role('button', name='Continuar a las condiciones').click()
        po.wait_for_url('**/condiciones', timeout=10000)
        boton = po.get_by_role('button', name='Enviar solicitud a Skilly')
        expect(boton).to_be_disabled()
        po.get_by_role('checkbox').check()
        boton.click()
        po.wait_for_url('**/confirmacion', timeout=15000)
        contexto['reserva'] = po.url.split('/reservas/')[1].split('/')[0]
        return f"Reserva {contexto['reserva']} en estado SOLICITADA."

    @paso('E2E-06', 'Administración asigna responsable y aprueba la solicitud', pa)
    def _():
        ingresar(pa, FUNDADORA[0], FUNDADORA_NUEVA)
        pa.goto(f'{WEB}/admin/solicitudes')
        tarjeta = pa.locator('li', has_text=f'Selección de vendedor/a {RUN}').first
        tarjeta.get_by_role('button', name='Responsable').click()
        pa.get_by_role('option', name='Fundadora Skilly').click()
        pa.wait_for_timeout(1200)
        tarjeta.get_by_role('button', name='Aceptar y enviar al profesional').click()
        expect(tarjeta.get_by_text('Solicitud enviada al profesional')).to_be_visible(timeout=10000)
        return 'Estado APROBADA_ADMIN.'

    @paso('E2E-07', 'El profesional acepta el trabajo (diálogo de confirmación)', pp)
    def _():
        ingresar(pp, PROF['email'], PROF['clave'])
        pp.goto(f"{WEB}/profesional/solicitudes/{contexto['reserva']}")
        pp.get_by_role('button', name='Aceptar trabajo').click()
        pp.get_by_role('button', name='Sí, acepto').click()
        expect(pp.get_by_text('Te avisaremos en tu panel')).to_be_visible(timeout=10000)
        return 'Estado PENDIENTE_PAGO.'

    @paso('E2E-08', 'Pago SIMULADO por la organización con datos de prueba', po)
    def _():
        po.goto(f"{WEB}/reservas/{contexto['reserva']}/pago")
        expect(po.get_by_text('Pago simulado', exact=True)).to_be_visible(timeout=10000)
        po.get_by_role('button', name='Usar datos de prueba').click()
        po.get_by_role('button', name='Confirmar pago simulado', exact=False).click()
        po.wait_for_url(f"**/mis-servicios/{contexto['reserva']}", timeout=15000)
        expect(po.get_by_text('Confirmado (pago simulado)')).to_be_visible(timeout=10000)
        return 'Estado CONFIRMADA, pago confirmado (simulado).'

    @paso('E2E-09', 'La organización propone una nueva fecha (reagendamiento, INC-06)', po)
    def _():
        po.get_by_role('button', name='Cambiar fecha').click()
        dialogo = po.get_by_role('dialog')
        primera = dialogo.locator('fieldset label').first
        expect(primera).to_be_visible(timeout=15000)
        primera.click()
        dialogo.get_by_role('button', name='Enviar propuesta').click()
        expect(po.get_by_text('Cambio de fecha pendiente')).to_be_visible(timeout=10000)
        return 'Estado REAGENDADA con propuesta visible.'

    @paso('E2E-10', 'El profesional acepta la nueva fecha', pp)
    def _():
        pp.reload()
        pp.get_by_role('button', name='Aceptar nueva fecha').first.click()
        pp.get_by_role('dialog').get_by_role('button', name='Aceptar nueva fecha').click()
        expect(pp.get_by_text('Aceptaste la nueva fecha')).to_be_visible(timeout=10000)
        return 'Vuelve a CONFIRMADA con el nuevo horario.'

    @paso('E2E-11', 'Chat: un mensaje con HTML/JS se muestra como texto y no se ejecuta (XSS)', pp)
    def _():
        pp.goto(f"{WEB}/profesional/solicitudes/{contexto['reserva']}/chat")
        carga = '<img src=x onerror="window.__xss=1">Hola, ¿coordinamos la entrevista?'
        pp.get_by_label('Escribe un mensaje').fill(carga)
        pp.get_by_role('button', name='Enviar mensaje').click()
        expect(pp.get_by_text('Hola, ¿coordinamos la entrevista?', exact=False)).to_be_visible(timeout=10000)
        if pp.evaluate('window.__xss === 1'):
            raise AssertionError('Se ejecutó el script inyectado')
        if pp.locator('main img[src="x"]').count():
            raise AssertionError('Se insertó un elemento <img> desde el mensaje')
        return 'El texto se muestra literal; no se creó <img> ni se ejecutó onerror.'

    @paso('E2E-12', 'El profesional inicia el trabajo y lo marca como entregado (INC-01)', pp)
    def _():
        pp.goto(f"{WEB}/profesional/solicitudes/{contexto['reserva']}")
        pp.get_by_role('button', name='Comenzar el trabajo').click()
        pp.get_by_role('dialog').get_by_role('button', name='Comenzar').click()
        expect(pp.get_by_text('El trabajo quedó en curso')).to_be_visible(timeout=10000)
        pp.get_by_role('button', name='Marcar como entregado').click()
        pp.get_by_role('dialog').get_by_role('button', name='Marcar entregado').click()
        expect(pp.get_by_text('Marcaste el trabajo como entregado')).to_be_visible(timeout=10000)
        return 'CONFIRMADA → EN_CURSO → ENTREGADA desde la interfaz.'

    @paso('E2E-13', 'La organización confirma conformidad y evalúa al profesional', po)
    def _():
        po.goto(f"{WEB}/mis-servicios/{contexto['reserva']}")
        po.get_by_role('button', name='Confirmar conformidad').click()
        po.get_by_role('button', name='Sí, estoy conforme').click()
        po.get_by_role('link', name='Evaluar al profesional').click()
        grupos = po.locator('fieldset')
        grupos.nth(0).get_by_text('Superó lo esperado', exact=True).click()
        grupos.nth(1).get_by_text('Cumplió', exact=True).click()
        grupos.nth(2).get_by_text('Superó lo esperado', exact=True).click()
        po.get_by_label('Comentario para otras organizaciones', exact=False).fill('Muy ordenada y clara en cada etapa.')
        po.get_by_role('button', name='Enviar evaluación').click()
        expect(po.get_by_text('¡Gracias por evaluar!')).to_be_visible(timeout=10000)
        return 'Reserva EVALUADA; comentario queda en moderación.'

    @paso('E2E-14', 'El profesional evalúa a la organización (antes sin interfaz, INC-05)', pp)
    def _():
        pp.goto(f"{WEB}/profesional/solicitudes/{contexto['reserva']}")
        pp.get_by_role('link', name='Evaluar organización').click()
        grupos = pp.locator('fieldset')
        for i in range(3):
            grupos.nth(i).get_by_text('Cumplió', exact=True).click()
        pp.get_by_role('button', name='Enviar evaluación').click()
        expect(pp.get_by_text('Ya enviaste tu evaluación de esta organización')).to_be_visible(timeout=10000)
        return 'Ambas evaluaciones enviadas → publicadas.'

    @paso('E2E-15', 'Moderación del comentario por administración', pa)
    def _():
        pa.goto(f'{WEB}/admin/moderacion')
        expect(pa.get_by_text('Muy ordenada y clara en cada etapa.')).to_be_visible(timeout=10000)
        return 'El comentario aparece en la cola de moderación.'

    @paso('E2E-16', 'Cancelación antes de pagar: el diálogo indica que no hay cobro y Escape lo cierra (A-12)', po)
    def _():
        tor = api('POST', '/auth/login', {'email': ORG['email'], 'contrasena': ORG['clave']})['token']
        bloques = api('GET', f'/disponibilidad/?profesional_id={prof_id}')
        ret = api('POST', '/disponibilidad/?accion=retener', {'bloqueId': bloques[-1]['id'], 'servicioId': SERVICIO}, tor)
        res = api('POST', '/reservas/', {'retencionId': ret['id'], 'condiciones': ret['condiciones'], 'bloqueId': bloques[-1]['id'], 'servicioId': SERVICIO, 'modalidad': 'remoto', 'aceptaCondiciones': True}, tor)
        po.goto(f"{WEB}/mis-servicios/{res['id']}")
        po.get_by_role('button', name='Cancelar contratación').click()
        dialogo = po.get_by_role('dialog')
        expect(dialogo.get_by_text('Todavía no has pagado esta contratación')).to_be_visible(timeout=10000)
        po.keyboard.press('Escape')
        expect(dialogo).to_be_hidden(timeout=5000)
        po.get_by_role('button', name='Cancelar contratación').click()
        po.get_by_role('dialog').get_by_role('button', name='Sí, cancelar').click()
        expect(po.get_by_text('La contratación quedó cancelada')).to_be_visible(timeout=10000)
        return 'Sin pago previo: sin cobro ni reembolso; reserva CANCELADA.'

    @paso('E2E-18', 'El profesional ve sus ingresos con el desglose de comisión', pp)
    def _():
        pp.goto(f'{WEB}/profesional/ingresos')
        expect(pp.get_by_text('$280.000').first).to_be_visible(timeout=10000)
        return 'El servicio pagado (simulado) aparece con su monto.'

    @paso('E2E-19', 'Administración: resumen y listado de reservas con el código de la contratación', pa)
    def _():
        pa.goto(f'{WEB}/admin/reservas')
        expect(pa.get_by_text(f'Selección de vendedor/a {RUN}').first).to_be_visible(timeout=10000)
        pa.goto(f'{WEB}/admin')
        expect(pa.get_by_role('heading').first).to_be_visible(timeout=10000)
        return 'La reserva aparece en el listado global; el resumen carga.'

    @paso('E2E-20', 'La organización actualiza el perfil de su organización', po)
    def _():
        po.goto(f'{WEB}/perfil')
        campo = po.get_by_label('Teléfono', exact=False).first
        campo.fill('+56 9 8765 4321')
        po.get_by_role('button', name='Guardar', exact=False).first.click()
        expect(po.get_by_text('se guardaron correctamente', exact=False)).to_be_visible(timeout=10000)
        return 'Cambios guardados y confirmados en pantalla.'

    @paso('E2E-17', 'Accesibilidad: el formulario de ingreso se recorre con Tab en orden lógico', lambda: pa)
    def _():
        ctx = nav.new_context(viewport={'width': 1366, 'height': 900})
        p = ctx.new_page()
        p.goto(f'{WEB}/ingresar')
        p.get_by_label('Correo', exact=True).focus()
        orden = []
        for _ in range(4):
            orden.append(p.evaluate("(document.activeElement.getAttribute('type')||document.activeElement.tagName).toLowerCase()"))
            p.keyboard.press('Tab')
        ctx.close()
        if 'email' not in orden[0] and 'input' not in orden[0]:
            raise AssertionError(f'Orden inesperado: {orden}')
        if 'password' not in orden:
            raise AssertionError(f'No se alcanza la contraseña con Tab: {orden}')
        return f'Orden de foco: {orden}'

    # Capturas responsivas de pantallas clave (evidencia de diseño adaptable).
    tamanos = {'movil': (390, 844), 'tablet': (768, 1024), 'escritorio': (1440, 900)}
    pantallas = {'ingreso': '/ingresar', 'catalogo': '/buscar', 'servicio': f'/servicios/{SERVICIO}'}
    for nombre_t, (w, h) in tamanos.items():
        ctx = nav.new_context(viewport={'width': w, 'height': h}, locale='es-CL', is_mobile=(w < 500), has_touch=(w < 500))
        p = ctx.new_page()
        for nombre_p, ruta in pantallas.items():
            pid = f'RESP-{nombre_p}-{nombre_t}'

            @paso(pid, f'Diseño responsivo: {nombre_p} en {nombre_t} ({w}×{h}) sin desborde horizontal', p)
            def _():
                p.goto(f'{WEB}{ruta}')
                p.wait_for_load_state('networkidle')
                ancho = p.evaluate('document.documentElement.scrollWidth')
                if ancho > w + 1:
                    raise AssertionError(f'Desborde horizontal: {ancho}px > {w}px')
                return f'scrollWidth={ancho}px'
        ctx.close()
    for nombre, pg in (('org', po), ('prof', pp)):
        pg.set_viewport_size({'width': 390, 'height': 844})
    po.goto(f"{WEB}/mis-servicios/{contexto.get('reserva','')}")
    po.wait_for_timeout(1500)
    po.screenshot(path=str(SALIDA / 'RESP-detalle-reserva-movil.png'), full_page=True)
    pp.goto(f'{WEB}/profesional')
    pp.wait_for_timeout(1500)
    pp.screenshot(path=str(SALIDA / 'RESP-panel-profesional-movil.png'), full_page=True)
    pa.goto(f'{WEB}/admin')
    pa.wait_for_timeout(1500)
    pa.screenshot(path=str(SALIDA / 'PANEL-admin-escritorio.png'), full_page=True)
    nav.close()

resumen = {
    'fecha': datetime.now().isoformat(timespec='seconds'),
    'navegador': 'Google Chrome headless (Playwright)',
    'web': WEB,
    'api': API,
    'aprobados': sum(r['estado'] == 'aprobado' for r in resultados),
    'fallidos': sum(r['estado'] == 'fallido' for r in resultados),
    'bloqueados': sum(r['estado'] == 'bloqueado' for r in resultados),
    'erroresJavaScript': errores_consola,
    'pasos': resultados,
}
(SALIDA / 'resultados_e2e.json').write_text(json.dumps(resumen, ensure_ascii=False, indent=2))
print(f"\nAprobados {resumen['aprobados']} · Fallidos {resumen['fallidos']} · Bloqueados {resumen['bloqueados']} · Errores JS {len(errores_consola)}")
sys.exit(1 if resumen['fallidos'] else 0)

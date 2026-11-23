"""Regresión de los hallazgos de los tres formularios en una copia en modo demo."""
import os
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

url = os.getenv("SKILLY_WEB", "http://127.0.0.1:4197")
motor = os.getenv("SKILLY_BROWSER", "chromium")
salida = Path(os.getenv("SKILLY_EVIDENCIA", "evidencias-demo"))
salida.mkdir(parents=True, exist_ok=True)

with sync_playwright() as playwright:
    browser = getattr(playwright, motor).launch(executable_path=os.getenv("SKILLY_EXE") or None)
    page = browser.new_page(reduced_motion="reduce")
    page.goto(url + "/ingresar")
    page.get_by_role("button", name="Empresa", exact=False).click()
    page.get_by_role("button", name="Ingresar", exact=True).click()
    expect(page).to_have_url(url + "/buscar")
    for width in (320, 375, 390, 768, 820, 1024, 1366):
        page.set_viewport_size({"width": width, "height": 850})
        page.goto(url + "/buscar")
        expect(page.locator(".tarjeta-vitrina").first).to_be_visible()
        if width < 1024:
            page.get_by_role("button", name="Filtros", exact=True).click()
            expect(page.locator("#panel-filtros")).to_be_visible()
        limits = page.evaluate("""() => {
            const cards = [...document.querySelectorAll('.tarjeta-vitrina,#panel-filtros,#orden,#busqueda')];
            const withinViewport = cards.every(el => {
                const rect = el.getBoundingClientRect();
                return rect.left >= -1 && rect.right <= innerWidth + 1;
            });
            return {width: document.documentElement.scrollWidth, withinViewport};
        }""")
        assert limits["width"] == width and limits["withinViewport"], (width, limits)
        if width == 375:
            page.screenshot(path=salida / "catalogo-movil.png")
        if width in (768, 820):
            menu = page.get_by_role("button", name="Abrir menú")
            menu.focus()
            page.keyboard.press("Enter")
            link = page.locator('#menu-movil a[href="/buscar"]')
            expect(link).to_be_visible()
            link.focus()
            page.keyboard.press("Enter")
            expect(page.locator("#menu-movil")).to_have_count(0)
        print(f"OK catálogo y controles a {width} px", flush=True)
    page.goto(url + "/mis-servicios/res-02")
    page.get_by_role("button", name="Cambiar fecha").click()
    expect(page.get_by_role("dialog")).to_be_visible()
    page.keyboard.press("Escape")
    page.get_by_role("link", name="Abrir chat").click()
    field = page.get_by_role("textbox", name="Escribe un mensaje")
    button = page.get_by_role("button", name="Enviar mensaje")
    expect(button).to_be_disabled()
    message = "Confirmamos la coordinación de la reserva."
    field.fill(message)
    button.focus()
    page.keyboard.press("Enter")
    expect(field).to_have_value("")
    expect(page.get_by_text(message, exact=True)).to_be_visible()
    page.reload()
    expect(page.get_by_text(message, exact=True)).to_have_count(1)
    page.screenshot(path=salida / "chat-tras-recarga.png")
    print(f"OK cambio de fecha, envío por teclado y mensaje tras recarga. {motor} {browser.version}")
    browser.close()

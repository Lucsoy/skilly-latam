/**
 * Enlaces escritos por usuarios (LinkedIn, portafolio, sitio web).
 *
 * Solo se convierten en <a href> si son http o https. Cualquier otro esquema
 * ("javascript:", "data:", "vbscript:"…) se descarta: React 18 los renderiza tal cual
 * y un clic podría ejecutar código en la sesión de quien mira la ficha. La API también
 * los rechaza al guardar (urlOpcional en backend/config/helpers.php); esto protege
 * además los datos antiguos que ya estuvieran en la base.
 */
export function hrefSeguro(url?: string | null): string | undefined {
  const valor = (url ?? '').trim();
  if (!valor) return undefined;
  const conEsquema = /^[a-z][a-z0-9+.-]*:/i.test(valor) ? valor : `https://${valor}`;
  try {
    const u = new URL(conEsquema);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Normaliza texto para búsqueda: minúsculas y sin tildes. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

const PALABRAS_VACIAS = new Set([
  'de', 'la', 'el', 'los', 'las', 'un', 'una', 'para', 'por', 'con', 'sin', 'que', 'en', 'y', 'o',
  'a', 'al', 'del', 'mi', 'mis', 'nuestro', 'nuestra', 'necesito', 'necesitamos', 'quiero',
  'queremos', 'busco', 'buscamos', 'ayuda', 'tenemos', 'tengo', 'hay', 'me', 'nos', 'se', 'lo',
  'persona', 'personas', 'armar', 'hacer', 'empresa', 'equipo', 'gente', 'alguien', 'urgente',
]);

/** Divide una frase de búsqueda en términos útiles, ignorando palabras vacías. */
export function tokenizar(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9ñ]+/)
    .filter((t) => t.length > 2 && !PALABRAS_VACIAS.has(t));
}

/** Raíz simple para que "onboarding"/"onboardings" o "contrato"/"contratos" coincidan. */
export function raiz(termino: string): string {
  return termino.replace(/(es|s)$/, '').slice(0, 6);
}

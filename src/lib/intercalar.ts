/**
 * Intercala elementos "nuevos" entre los que tienen historial, manteniendo el
 * orden relativo de cada grupo. Con `cada = 2` el resultado queda
 * V V N V V N ... y los nuevos sobrantes se reparten al final.
 *
 * Es la regla de visibilidad del catálogo: nunca mostrar solo los mejor
 * puntuados arriba.
 */
export function intercalarNuevos<T>(items: T[], esNuevo: (item: T) => boolean, cada = 2): T[] {
  const veteranos = items.filter((i) => !esNuevo(i));
  const nuevos = items.filter(esNuevo);
  if (veteranos.length === 0 || nuevos.length === 0) return items;

  const resultado: T[] = [];
  let indiceNuevo = 0;
  veteranos.forEach((v, i) => {
    resultado.push(v);
    if ((i + 1) % cada === 0 && indiceNuevo < nuevos.length) {
      resultado.push(nuevos[indiceNuevo] as T);
      indiceNuevo += 1;
    }
  });
  while (indiceNuevo < nuevos.length) {
    resultado.push(nuevos[indiceNuevo] as T);
    indiceNuevo += 1;
  }
  return resultado;
}

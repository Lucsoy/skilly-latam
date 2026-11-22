export type CodigoError =
  | 'no_encontrado'
  | 'no_autorizado'
  | 'credenciales_invalidas'
  | 'conflicto'
  | 'validacion'
  | 'expirado'
  | 'transicion_invalida'
  | 'demasiados_intentos'
  | 'red';

/**
 * Error uniforme de la capa de servicios. Cuando exista backend, el cliente
 * HTTP traducirá los códigos de estado a estos códigos (404 → no_encontrado,
 * 401 → no_autorizado, 409 → conflicto, 400 → validacion, 410 → expirado).
 */
export class ErrorServicio extends Error {
  constructor(
    public readonly codigo: CodigoError,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorServicio';
  }
}

export function esErrorServicio(error: unknown): error is ErrorServicio {
  return error instanceof ErrorServicio;
}

/** Mensaje apto para mostrar a la organización, con tono cercano. */
export function mensajeParaUsuario(error: unknown): string {
  if (esErrorServicio(error)) return error.message;
  return 'Algo no salió como esperábamos. Inténtalo de nuevo en un momento.';
}

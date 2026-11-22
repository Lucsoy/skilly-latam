import type { ReactNode } from 'react';
import { Boton } from './Boton';

interface PropsVacio {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
  icono?: ReactNode;
}

export function EstadoVacio({ titulo, descripcion, accion, icono }: PropsVacio) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-borde-fuerte bg-superficie/60 px-6 py-12 text-center">
      <div aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-primario-50 text-primario-600">
        {icono ?? <IconoBuscar />}
      </div>
      <h3 className="text-base font-semibold">{titulo}</h3>
      {descripcion && <p className="max-w-md text-sm text-tinta-suave">{descripcion}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}

interface PropsError {
  titulo?: string;
  mensaje: string;
  reintentar?: () => void;
}

export function EstadoError({ titulo = 'No pudimos cargar esto', mensaje, reintentar }: PropsError) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-peligro-600/20 bg-peligro-50 px-6 py-10 text-center">
      <h3 className="text-base font-semibold text-peligro-700">{titulo}</h3>
      <p className="max-w-md text-sm text-tinta-suave">{mensaje}</p>
      {reintentar && (
        <Boton variante="secundario" tamano="sm" onClick={reintentar}>
          Intentar de nuevo
        </Boton>
      )}
    </div>
  );
}

function IconoBuscar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

import { cn } from '@/lib/cn';
import { useNavigate } from 'react-router-dom';
import { useSesion } from '@/modules/auth/sesionStore';
import { useFavoritos } from './favoritosStore';

interface Props {
  servicioId: string;
  titulo: string;
  className?: string;
}

/** Guardar en favoritos. Acción reversible, por eso no pide confirmación. */
export function BotonFavorito({ servicioId, titulo, className }: Props) {
  const navegar = useNavigate();
  const usuario = useSesion((s) => s.usuario);
  const ids = useFavoritos((s) => s.ids);
  const enProceso = useFavoritos((s) => s.enProceso);
  const alternar = useFavoritos((s) => s.alternar);

  const esFavorito = ids.includes(servicioId);
  const ocupado = enProceso.includes(servicioId);

  return (
    <button
      type="button"
      aria-pressed={esFavorito}
      aria-label={esFavorito ? `Quitar “${titulo}” de favoritos` : `Guardar “${titulo}” en favoritos`}
      disabled={ocupado}
      onClick={() => {
        if (!usuario) {
          navegar('/ingresar', { state: { desde: window.location.pathname + window.location.search } });
          return;
        }
        void alternar(servicioId);
      }}
      className={cn(
        'relative z-10 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50',
        esFavorito ? 'text-primario-600 hover:bg-primario-50' : 'text-tinta-tenue hover:bg-crema hover:text-primario-600',
        className,
      )}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={esFavorito ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 14c1.5-1.5 3-3.3 3-5.5A5.5 5.5 0 0 0 12 5.5 5.5 5.5 0 0 0 2 8.5c0 2.2 1.5 4 3 5.5l7 7Z" />
      </svg>
    </button>
  );
}

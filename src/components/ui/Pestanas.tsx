import { useId, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

export interface Pestana<T extends string> {
  valor: T;
  etiqueta: string;
  cantidad?: number;
}

interface Props<T extends string> {
  pestanas: Array<Pestana<T>>;
  activa: T;
  onCambiar: (valor: T) => void;
  etiquetaGrupo: string;
}

export function Pestanas<T extends string>({ pestanas, activa, onCambiar, etiquetaGrupo }: Props<T>) {
  const id = useId();

  const manejarTeclado = (e: KeyboardEvent<HTMLDivElement>) => {
    const indice = pestanas.findIndex((p) => p.valor === activa);
    if (indice < 0) return;
    let nuevo = indice;
    if (e.key === 'ArrowRight') nuevo = (indice + 1) % pestanas.length;
    else if (e.key === 'ArrowLeft') nuevo = (indice - 1 + pestanas.length) % pestanas.length;
    else if (e.key === 'Home') nuevo = 0;
    else if (e.key === 'End') nuevo = pestanas.length - 1;
    else return;
    e.preventDefault();
    const destino = pestanas[nuevo];
    if (destino) {
      onCambiar(destino.valor);
      document.getElementById(`${id}-${destino.valor}`)?.focus();
    }
  };

  return (
    <div role="tablist" aria-label={etiquetaGrupo} className="flex gap-1 overflow-x-auto border-b border-borde" onKeyDown={manejarTeclado}>
      {pestanas.map((p) => {
        const esActiva = p.valor === activa;
        return (
          <button
            key={p.valor}
            id={`${id}-${p.valor}`}
            role="tab"
            type="button"
            aria-selected={esActiva}
            tabIndex={esActiva ? 0 : -1}
            onClick={() => onCambiar(p.valor)}
            className={cn(
              '-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              esActiva ? 'border-primario-600 text-primario-700' : 'border-transparent text-tinta-suave hover:text-tinta',
            )}
          >
            {p.etiqueta}
            {p.cantidad !== undefined && (
              <span className={cn('rounded-full px-2 text-xs', esActiva ? 'bg-primario-100 text-primario-700' : 'bg-crema text-tinta-suave')}>
                {p.cantidad}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

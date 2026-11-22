import { cn } from '@/lib/cn';

interface Props {
  className?: string;
}

/** Bloque gris animado para estados de carga. Combínalo con `aria-busy` en el contenedor. */
export function Esqueleto({ className }: Props) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-borde/70', className)} />;
}

export function EsqueletoTexto({ lineas = 3, className }: { lineas?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden="true">
      {Array.from({ length: lineas }).map((_, i) => (
        <Esqueleto key={i} className={cn('h-3.5', i === lineas - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface Props extends HTMLAttributes<HTMLDivElement> {
  relleno?: 'ninguno' | 'sm' | 'md' | 'lg';
  interactiva?: boolean;
}

const rellenos = { ninguno: '', sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' };

export function Tarjeta({ relleno = 'md', interactiva = false, className, ...resto }: Props) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-borde bg-superficie shadow-suave',
        rellenos[relleno],
        interactiva && 'tarjeta-interactiva transition-colors hover:border-primario-300',
        className,
      )}
      {...resto}
    />
  );
}

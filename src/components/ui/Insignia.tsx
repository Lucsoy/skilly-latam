import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type TonoInsignia = 'neutro' | 'primario' | 'exito' | 'aviso' | 'peligro' | 'info';

const tonos: Record<TonoInsignia, string> = {
  neutro: 'bg-crema text-tinta-suave border-borde',
  primario: 'bg-primario-50 text-primario-800 border-primario-200',
  exito: 'bg-exito-50 text-exito-700 border-exito-600/20',
  aviso: 'bg-aviso-50 text-aviso-700 border-aviso-600/20',
  peligro: 'bg-peligro-50 text-peligro-700 border-peligro-600/20',
  info: 'bg-info-50 text-info-600 border-info-600/20',
};

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tono?: TonoInsignia;
  icono?: ReactNode;
}

export function Insignia({ tono = 'neutro', icono, className, children, ...resto }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5',
        tonos[tono],
        className,
      )}
      {...resto}
    >
      {icono}
      {children}
    </span>
  );
}

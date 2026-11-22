import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tono = 'info' | 'exito' | 'aviso' | 'peligro';

const tonos: Record<Tono, string> = {
  info: 'bg-info-50 border-info-600/20 text-tinta',
  exito: 'bg-exito-50 border-exito-600/20 text-tinta',
  aviso: 'bg-aviso-50 border-aviso-600/20 text-tinta',
  peligro: 'bg-peligro-50 border-peligro-600/20 text-tinta',
};

interface Props {
  tono?: Tono;
  titulo?: string;
  children: ReactNode;
  className?: string;
  accion?: ReactNode;
}

export function Alerta({ tono = 'info', titulo, children, className, accion }: Props) {
  const rol = tono === 'peligro' || tono === 'aviso' ? 'alert' : 'status';
  return (
    <div role={rol} className={cn('flex flex-col gap-2 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-start sm:justify-between', tonos[tono], className)}>
      <div>
        {titulo && <p className="font-semibold">{titulo}</p>}
        <div className={cn(titulo && 'mt-0.5', 'text-tinta-suave')}>{children}</div>
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </div>
  );
}

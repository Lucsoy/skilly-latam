import { cn } from '@/lib/cn';

interface Props {
  tamano?: 'sm' | 'md' | 'lg';
  claro?: boolean;
  etiqueta?: string;
  className?: string;
}

const tamanos = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-10 w-10 border-[3px]' };

export function Cargando({ tamano = 'md', claro = false, etiqueta = 'Cargando', className }: Props) {
  return (
    <span role="status" className={cn('inline-flex items-center', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'animate-spin rounded-full border-solid',
          tamanos[tamano],
          claro ? 'border-white/40 border-t-white' : 'border-primario-200 border-t-primario-600',
        )}
      />
      <span className="sr-only">{etiqueta}</span>
    </span>
  );
}

import { cn } from '@/lib/cn';
import { iniciales } from '@/lib/formato';

interface Props {
  nombre: string;
  apellido?: string;
  tamano?: 'sm' | 'md' | 'lg';
  className?: string;
}

const tamanos = { sm: 'h-9 w-9 text-xs', md: 'h-12 w-12 text-sm', lg: 'h-20 w-20 text-xl' };

/** Avatar con iniciales. Sin fotos en esta etapa; el backend podrá agregar una URL. */
export function Avatar({ nombre, apellido, tamano = 'md', className }: Props) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-primario-100 font-semibold text-primario-800',
        tamanos[tamano],
        className,
      )}
    >
      {iniciales(nombre, apellido)}
    </span>
  );
}

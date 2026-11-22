import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Cargando } from './Cargando';

export type VarianteBoton = 'primario' | 'secundario' | 'fantasma' | 'peligro';
export type TamanoBoton = 'sm' | 'md' | 'lg';

const base =
  'skilly-pressable relative isolate overflow-hidden inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors select-none disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';

const variantes: Record<VarianteBoton, string> = {
  primario: 'bg-primario-400 text-carbon hover:bg-primario-500 active:bg-primario-600 border border-lila-300',
  secundario: 'bg-amarillo-300 text-carbon border border-lila-300 hover:bg-amarillo-400 hover:border-lila-500',
  fantasma: 'bg-transparent text-lila-700 hover:bg-lila-50',
  peligro: 'bg-peligro-600 text-white hover:bg-peligro-700',
};

const tamanos: Record<TamanoBoton, string> = {
  sm: 'text-sm px-3 py-1.5 min-h-[36px]',
  md: 'text-sm px-4 py-2.5 min-h-[44px]',
  lg: 'text-base px-5 py-3 min-h-[48px]',
};

export function clasesBoton(variante: VarianteBoton = 'primario', tamano: TamanoBoton = 'md', extra?: string): string {
  return cn(base, variantes[variante], tamanos[tamano], extra);
}

interface PropsBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  cargando?: boolean;
  bloque?: boolean;
  icono?: ReactNode;
}

export const Boton = forwardRef<HTMLButtonElement, PropsBoton>(function Boton(
  { variante = 'primario', tamano = 'md', cargando = false, bloque = false, icono, className, children, disabled, type = 'button', ...resto },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clasesBoton(variante, tamano, cn(bloque && 'w-full', className))}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...resto}
    >
      {cargando ? <Cargando tamano="sm" claro={variante === 'primario' || variante === 'peligro'} /> : icono}
      {children}
    </button>
  );
});

interface PropsBotonEnlace extends LinkProps {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  bloque?: boolean;
  icono?: ReactNode;
}

/** Enlace de React Router con apariencia de botón. */
export function BotonEnlace({ variante = 'primario', tamano = 'md', bloque = false, icono, className, children, ...resto }: PropsBotonEnlace) {
  return (
    <Link className={clasesBoton(variante, tamano, cn(bloque && 'w-full', className))} {...resto}>
      {icono}
      {children}
    </Link>
  );
}

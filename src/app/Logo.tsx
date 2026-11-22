import { cn } from '@/lib/cn';

export function Logo({ className, soloIcono = false }: { className?: string; soloIcono?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight text-primario-600', className)}>
      <span aria-hidden="true" className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primario-400 text-sm font-bold text-carbon border border-lila-300">
        S
      </span>
      {soloIcono ? <span className="sr-only">Skilly</span> : 'Skilly'}
    </span>
  );
}

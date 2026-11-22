import { cn } from '@/lib/cn';

const PASOS = ['Elige horario', 'Revisa condiciones', 'Reserva solicitada'];

/** Indicador de avance del flujo de agendamiento (3 pantallas). */
export function PasosAgendamiento({ actual }: { actual: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Pasos del agendamiento" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {PASOS.map((nombre, i) => {
        const numero = i + 1;
        const estado = numero < actual ? 'listo' : numero === actual ? 'actual' : 'pendiente';
        return (
          <li key={nombre} className="flex items-center gap-2" aria-current={estado === 'actual' ? 'step' : undefined}>
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold',
                estado === 'listo' && 'bg-exito-600 text-white',
                estado === 'actual' && 'bg-primario-700 text-white',
                estado === 'pendiente' && 'border border-borde-fuerte text-tinta-tenue',
              )}
            >
              {estado === 'listo' ? '✓' : numero}
            </span>
            <span className={cn(estado === 'actual' ? 'font-medium text-tinta' : 'text-tinta-tenue')}>{nombre}</span>
            {i < PASOS.length - 1 && <span aria-hidden="true" className="mx-1 h-px w-5 bg-borde-fuerte" />}
          </li>
        );
      })}
    </ol>
  );
}

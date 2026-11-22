import type { BloqueDisponible, Modalidad, Profesional, Servicio } from '@/types';
import type { Desglose } from '@/lib/precios';
import { ETIQUETA_MODALIDAD, formatearCLP, formatearRangoBloque } from '@/lib/formato';
import { Esqueleto } from '@/components/ui';

interface Props {
  servicio: Servicio;
  profesional: Profesional;
  bloque: BloqueDisponible | null;
  modalidad: Modalidad | null;
  desglose: Desglose | null;
}

/**
 * Resumen de la reserva: se usa en el agendamiento, en las condiciones y en la
 * confirmación, para que la persona vea siempre lo mismo.
 */
export function ResumenReserva({ servicio, profesional, bloque, modalidad, desglose }: Props) {
  return (
    <dl className="flex flex-col gap-3 text-sm">
      <Fila termino="Servicio">
        <span className="font-medium">{servicio.titulo}</span>
      </Fila>
      <Fila termino="Profesional">
        {profesional.nombre} {profesional.apellido}
      </Fila>
      <Fila termino="Fecha y hora">
        {bloque ? (
          <span className="font-medium">{formatearRangoBloque(bloque.inicio, bloque.fin)}</span>
        ) : (
          <span className="text-tinta-tenue">Elige un horario en el calendario</span>
        )}
      </Fila>
      <Fila termino="Modalidad">{modalidad ? ETIQUETA_MODALIDAD[modalidad] : <span className="text-tinta-tenue">Por definir</span>}</Fila>

      <div className="mt-1 border-t border-borde pt-3">
        {desglose ? (
          <>
            <Fila termino="Precio del servicio">{formatearCLP(desglose.precio)}</Fila>
            <Fila termino={`Comisión de plataforma (${desglose.comisionPorcentaje} %)`} className="mt-2">
              {formatearCLP(desglose.comision)}
            </Fila>
            <Fila termino="Total" className="mt-3 text-base">
              <span className="font-semibold">{formatearCLP(desglose.total)}</span>
            </Fila>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <Esqueleto className="h-4 w-full" />
            <Esqueleto className="h-4 w-full" />
            <Esqueleto className="h-5 w-2/3" />
          </div>
        )}
      </div>
    </dl>
  );
}

function Fila({ termino, children, className }: { termino: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${className ?? ''}`}>
      <dt className="shrink-0 text-tinta-suave">{termino}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

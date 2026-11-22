import { useState } from 'react';
import { listarReservasAdmin } from '@/services/admin';
import { useRecurso } from '@/lib/useRecurso';
import { formatearCLP, formatearFechaHora, formatearFechaHoraExacta } from '@/lib/formato';
import { ETIQUETA_ESTADO } from '@/modules/agenda/estadoReserva';
import type { EstadoReserva } from '@/types';
import { Esqueleto, EstadoError, EstadoVacio, Insignia, Tarjeta } from '@/components/ui';
import type { TonoInsignia } from '@/components/ui/Insignia';

export const TONO_ESTADO: Record<EstadoReserva, TonoInsignia> = {
  SOLICITADA: 'info',
  APROBADA_ADMIN: 'aviso',
  PENDIENTE_PAGO: 'exito',
  CONFIRMADA: 'exito',
  EN_CURSO: 'primario',
  ENTREGADA: 'primario',
  EVALUADA: 'neutro',
  RECHAZADA: 'peligro',
  CANCELADA: 'peligro',
  REAGENDADA: 'aviso',
};

const ETIQUETA_PAGO: Record<string, string> = {
  pendiente_confirmacion: 'Pago pendiente',
  confirmado: 'Pagado',
  reembolsado: 'Reembolsado',
  retenido_parcial: 'Retención parcial',
  sin_cobro: 'Sin cobro (cancelada antes de pagar)',
};

export function PaginaReservasAdmin() {
  const reservas = useRecurso(() => listarReservasAdmin(), []);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<EstadoReserva | ''>('');

  if (reservas.error) return <EstadoError mensaje={reservas.error} reintentar={reservas.recargar} />;

  const lista = (reservas.datos ?? []).filter((r) => !filtro || r.reserva.estado === filtro);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reservas</h1>
          <p className="mt-1.5 text-sm text-tinta-suave">Todas las reservas de todas las organizaciones, con su historial completo.</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="filtro-estado" className="text-sm text-tinta-suave">
            Estado
          </label>
          <select
            id="filtro-estado"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as EstadoReserva | '')}
            className="min-h-[36px] rounded-xl border border-borde-fuerte bg-superficie px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {(Object.keys(ETIQUETA_ESTADO) as EstadoReserva[]).map((e) => (
              <option key={e} value={e}>
                {ETIQUETA_ESTADO[e]}
              </option>
            ))}
          </select>
        </div>
      </header>

      {reservas.cargando ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Esqueleto key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <EstadoVacio titulo="No hay reservas con ese estado" />
      ) : (
        <ul className="flex flex-col gap-2">
          {lista.map(({ reserva, organizacion, profesional, servicio }) => {
            const expandida = abierta === reserva.id;
            return (
              <li key={reserva.id}>
                <Tarjeta relleno="ninguno">
                  <button
                    type="button"
                    aria-expanded={expandida}
                    onClick={() => setAbierta(expandida ? null : reserva.id)}
                    className="grid w-full gap-x-4 gap-y-1 rounded-2xl px-4 py-3 text-left text-sm sm:grid-cols-[110px_1fr_1fr_150px_auto] sm:items-center"
                  >
                    <span className="font-mono text-xs text-tinta-tenue">{reserva.codigo}</span>
                    <span>
                      <span className="block font-medium">{servicio}</span>
                      <span className="block text-xs text-tinta-suave">{profesional}</span>
                    </span>
                    <span className="text-tinta-suave">{organizacion}</span>
                    <span className="text-xs text-tinta-suave">{formatearFechaHora(reserva.inicio)}</span>
                    <span className="flex flex-wrap gap-1">
                      <Insignia tono={TONO_ESTADO[reserva.estado]}>{ETIQUETA_ESTADO[reserva.estado]}</Insignia>
                      <Insignia tono="neutro">{ETIQUETA_PAGO[reserva.estadoPago] ?? reserva.estadoPago}</Insignia>
                    </span>
                  </button>
                  {expandida && (
                    <div className="border-t border-borde px-4 py-3 text-sm">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <p>
                          <span className="block text-xs text-tinta-tenue">Total</span>
                          {formatearCLP(reserva.total)} <span className="text-xs text-tinta-suave">(comisión {formatearCLP(reserva.comision)})</span>
                        </p>
                        <p>
                          <span className="block text-xs text-tinta-tenue">Condiciones aceptadas</span>
                          {reserva.aceptacionCondiciones ? `${formatearFechaHoraExacta(reserva.aceptacionCondiciones.fecha)} · v${reserva.aceptacionCondiciones.version}` : 'Sin registro'}
                        </p>
                        <p>
                          <span className="block text-xs text-tinta-tenue">Conformidad</span>
                          {reserva.conformidadConfirmada && reserva.conformidadFecha ? formatearFechaHoraExacta(reserva.conformidadFecha) : 'Pendiente'}
                        </p>
                      </div>
                      {reserva.mensaje && (
                        <p className="mt-3 rounded-lg bg-crema px-3 py-2 text-tinta-suave">“{reserva.mensaje}”</p>
                      )}
                      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-tinta-tenue">Historial</h3>
                      <ol className="mt-2 flex flex-col gap-1.5">
                        {reserva.historial.map((h) => (
                          <li key={h.id} className="flex flex-wrap gap-x-3 text-xs">
                            <span className="tabular-nums text-tinta-tenue">{formatearFechaHoraExacta(h.fecha)}</span>
                            <span className="font-medium">{ETIQUETA_ESTADO[h.estadoNuevo]}</span>
                            <span className="text-tinta-suave">{h.actor.nombre}</span>
                            {h.motivo && <span className="text-tinta-suave">· {h.motivo}</span>}
                            {h.detalle && <span className="basis-full text-tinta-tenue">{h.detalle}</span>}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </Tarjeta>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import { useParams } from 'react-router-dom';
import { useRecurso } from '@/lib/useRecurso';
import { obtenerReserva } from '@/services/reservas';
import { formatearCLP, formatearFechaHora, formatearRangoBloque } from '@/lib/formato';
import { Alerta, BotonEnlace, Esqueleto, EstadoError, Insignia, Tarjeta } from '@/components/ui';
import { PasosAgendamiento } from './PasosAgendamiento';
import { ETIQUETA_ESTADO } from './estadoReserva';

export function PaginaConfirmacion() {
  const { reservaId = '' } = useParams();
  const reserva = useRecurso(() => obtenerReserva(reservaId), [reservaId]);
  if (reserva.error) return <EstadoError titulo="No encontramos tu solicitud" mensaje={reserva.error} reintentar={reserva.recargar} />;
  if (reserva.cargando || !reserva.datos) return <Esqueleto className="h-96 w-full rounded-2xl" />;
  const r = reserva.datos;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PasosAgendamiento actual={3} />
      <Alerta tono="exito" titulo="Tu solicitud ha sido enviada a los administradores">
        La solicitud <strong>{r.codigo}</strong> quedó registrada. En breve tendrás novedades y, cuando corresponda, un chat para coordinar el trato con el profesional.
      </Alerta>
      <Tarjeta className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs text-tinta-tenue">Solicitud {r.codigo}</p><h1 className="mt-1 text-xl font-semibold">{ETIQUETA_ESTADO[r.estado]}</h1></div>
          <Insignia tono="info">En revisión</Insignia>
        </div>
        <dl className="grid gap-3 border-y border-borde py-4 text-sm sm:grid-cols-2">
          <div><dt className="text-tinta-tenue">Fecha solicitada</dt><dd className="mt-0.5 font-medium">{formatearRangoBloque(r.inicio, r.fin)}</dd></div>
          <div><dt className="text-tinta-tenue">Total</dt><dd className="mt-0.5 font-medium">{formatearCLP(r.total)}</dd></div>
          <div><dt className="text-tinta-tenue">Enviada</dt><dd className="mt-0.5">{formatearFechaHora(r.creadaEn)}</dd></div>
          <div><dt className="text-tinta-tenue">Administrador</dt><dd className="mt-0.5">Pendiente de asignación</dd></div>
        </dl>
        <div className="flex flex-col gap-2 sm:flex-row">
          <BotonEnlace to={`/mis-servicios/${r.id}`} bloque>Ver seguimiento</BotonEnlace>
          <BotonEnlace to="/buscar" variante="secundario" bloque>Seguir buscando</BotonEnlace>
        </div>
      </Tarjeta>
    </div>
  );
}

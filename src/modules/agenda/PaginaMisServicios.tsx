import type { CSSProperties } from 'react';
import { CalendarDays, CheckCircle2, ChevronRight, CircleDollarSign, Clock3, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { useRecurso } from '@/lib/useRecurso';
import { listarReservas } from '@/services/reservas';
import { formatearCLP, formatearRangoBloque } from '@/lib/formato';
import { BotonEnlace, EstadoError, EstadoVacio, Insignia, Tarjeta } from '@/components/ui';
import { ETIQUETA_ESTADO, DESCRIPCION_ESTADO } from './estadoReserva';
import type { EstadoReserva } from '@/types';

const tono: Record<EstadoReserva, 'info'|'exito'|'aviso'|'peligro'|'primario'|'neutro'> = {
  SOLICITADA:'aviso', APROBADA_ADMIN:'info', PENDIENTE_PAGO:'exito', CONFIRMADA:'exito', EN_CURSO:'primario', ENTREGADA:'primario', EVALUADA:'neutro', RECHAZADA:'peligro', CANCELADA:'peligro', REAGENDADA:'aviso'
};

const CLASE_ESTADO: Record<EstadoReserva, string> = {
  SOLICITADA:'solicitud-card--solicitada',
  APROBADA_ADMIN:'solicitud-card--aprobada',
  PENDIENTE_PAGO:'solicitud-card--pago',
  CONFIRMADA:'solicitud-card--confirmada',
  EN_CURSO:'solicitud-card--curso',
  ENTREGADA:'solicitud-card--entregada',
  EVALUADA:'solicitud-card--evaluada',
  RECHAZADA:'solicitud-card--rechazada',
  CANCELADA:'solicitud-card--cancelada',
  REAGENDADA:'solicitud-card--reagendada',
};

const PASOS = ['Solicitud', 'Revisión', 'Profesional', 'Pago', 'Confirmada'];

function pasoActivo(estado: EstadoReserva) {
  switch (estado) {
    case 'SOLICITADA': return 0;
    case 'APROBADA_ADMIN': return 2;
    case 'PENDIENTE_PAGO': return 3;
    case 'CONFIRMADA':
    case 'EN_CURSO':
    case 'ENTREGADA':
    case 'EVALUADA': return 4;
    case 'RECHAZADA':
    case 'CANCELADA': return 1;
    case 'REAGENDADA': return 2;
  }
}

export function PaginaMisServicios() {
  const reservas = useRecurso(() => listarReservas(), []);
  if (reservas.error) return <EstadoError mensaje={reservas.error} reintentar={reservas.recargar} />;
  if (reservas.cargando) return <div className="h-40 animate-pulse rounded-2xl bg-crema" />;
  if (!reservas.datos?.length) return <EstadoVacio titulo="Todavía no tienes servicios contratados" descripcion="Cuando envíes una solicitud podrás seguir aquí todo el proceso." accion={<BotonEnlace to="/buscar">Buscar profesionales</BotonEnlace>} />;

  const activas = reservas.datos.filter((r) => !['EVALUADA','RECHAZADA','CANCELADA'].includes(r.estado)).length;

  return (
    <div className="flex flex-col gap-6 pagina-mis-solicitudes">
      <header className="solicitudes-encabezado">
        <div>
          <p className="text-sm font-medium text-primario-700">Tu actividad en Skilly</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Mis solicitudes</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-tinta-suave">Seguimiento de cada contratación desde que la envías hasta que el profesional confirma el trabajo.</p>
        </div>
        <div className="solicitudes-resumen">
          <div className="solicitudes-resumen__icon"><Sparkles size={17} /></div>
          <div><strong>{activas}</strong><span>en proceso</span></div>
        </div>
      </header>

      <ul className="flex flex-col gap-4">
        {reservas.datos.map((r, indice) => {
          const activo = pasoActivo(r.estado);
          const esFinal = ['EVALUADA','RECHAZADA','CANCELADA'].includes(r.estado);
          return (
            <li key={r.id} style={{ '--solicitud-delay': `${indice * 70}ms` } as CSSProperties}>
              <Tarjeta className={`solicitud-card ${CLASE_ESTADO[r.estado]}`}>
                <div className="solicitud-card__shine" aria-hidden="true" />
                <div className="solicitud-card__top">
                  <div className="solicitud-card__identity">
                    <div className="solicitud-card__orb" aria-hidden="true"><ShieldCheck size={19} /></div>
                    <div>
                      <p className="font-mono text-[11px] tracking-wide text-tinta-tenue">{r.codigo}</p>
                      <h2 className="mt-1 font-semibold">Solicitud de contratación</h2>
                    </div>
                  </div>
                  <Insignia tono={tono[r.estado]}>{ETIQUETA_ESTADO[r.estado]}</Insignia>
                </div>

                <div className="solicitud-card__datos">
                  <div><CalendarDays size={15} /><span>{formatearRangoBloque(r.inicio,r.fin)}</span></div>
                  <div><CircleDollarSign size={15} /><span>{formatearCLP(r.total)}</span></div>
                  <div><MapPin size={15} /><span className="capitalize">{r.modalidad}</span></div>
                </div>

                <div className="solicitud-progreso" aria-label={`Progreso: ${ETIQUETA_ESTADO[r.estado]}`}>
                  <div className="solicitud-progreso__linea"><span style={{ width: `${(activo / (PASOS.length - 1)) * 100}%` }} /></div>
                  {PASOS.map((paso, i) => (
                    <div key={paso} className={`solicitud-progreso__paso ${i <= activo ? 'is-active' : ''} ${i === activo ? 'is-current' : ''}`}>
                      <span>{i <= activo ? <CheckCircle2 size={12} /> : i + 1}</span><small>{paso}</small>
                    </div>
                  ))}
                </div>

                <div className="solicitud-card__mensaje">
                  <div className="solicitud-card__mensaje-icon"><Clock3 size={14} /></div>
                  <p>{DESCRIPCION_ESTADO[r.estado]}</p>
                </div>

                <div className="solicitud-card__footer">
                  <span className="solicitud-card__nota">{esFinal ? 'Solicitud cerrada' : 'Seguimiento actualizado'}</span>
                  <div className="flex items-center gap-2">
                    {r.estado==='PENDIENTE_PAGO' && <BotonEnlace to={`/reservas/${r.id}/pago`} tamano="sm">Ir al pago <ChevronRight size={15} /></BotonEnlace>}
                    {r.estado==='CONFIRMADA' && <BotonEnlace to={`/mis-servicios/${r.id}/chat`} variante="secundario" tamano="sm">Abrir chat <ChevronRight size={15} /></BotonEnlace>}
                    {r.estado!=='PENDIENTE_PAGO' && r.estado!=='CONFIRMADA' && <BotonEnlace to={`/mis-servicios/${r.id}`} variante="secundario" tamano="sm">Ver seguimiento <ChevronRight size={15} /></BotonEnlace>}
                  </div>
                </div>
              </Tarjeta>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

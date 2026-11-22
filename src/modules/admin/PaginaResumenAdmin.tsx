import { Link } from 'react-router-dom';
import { obtenerResumen } from '@/services/admin';
import { useRecurso } from '@/lib/useRecurso';
import { ETIQUETA_ESTADO } from '@/modules/agenda/estadoReserva';
import type { EstadoReserva } from '@/types';
import { Esqueleto, EstadoError, Tarjeta } from '@/components/ui';

const ORDEN_ESTADOS: EstadoReserva[] = ['SOLICITADA', 'APROBADA_ADMIN', 'PENDIENTE_PAGO', 'CONFIRMADA', 'REAGENDADA', 'EN_CURSO', 'ENTREGADA', 'EVALUADA', 'CANCELADA', 'RECHAZADA'];

export function PaginaResumenAdmin() {
  const resumen = useRecurso(() => obtenerResumen(), []);

  if (resumen.error) return <EstadoError mensaje={resumen.error} reintentar={resumen.recargar} />;

  const d = resumen.datos;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Panel de Skilly</h1>
        <p className="mt-1.5 text-sm text-tinta-suave">Cómo está la plataforma hoy y qué necesita una mano del equipo.</p>
      </header>

      <div aria-busy={resumen.cargando} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra etiqueta="Organizaciones registradas" valor={d?.organizaciones} enlace="/admin/organizaciones" />
        <Cifra etiqueta="Profesionales publicados" valor={d?.profesionales} detalle={d ? `${d.profesionalesNuevos} nuevos` : undefined} enlace="/admin/profesionales" />
        <Cifra etiqueta="Servicios en catálogo" valor={d?.servicios} />
        <Cifra
          etiqueta="Comentarios por revisar"
          valor={d?.comentariosEnRevision}
          enlace="/admin/moderacion"
          destacado={Boolean(d && d.comentariosEnRevision > 0)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Tarjeta>
          <h2 className="text-base font-semibold">Reservas por estado</h2>
          {d ? (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {ORDEN_ESTADOS.map((estado) => (
                <li key={estado} className="flex items-center justify-between rounded-lg bg-crema px-3 py-2 text-sm">
                  <span className="text-tinta-suave">{ETIQUETA_ESTADO[estado]}</span>
                  <span className="font-semibold tabular-nums">{d.reservasPorEstado[estado] ?? 0}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Esqueleto key={i} className="h-9 w-full" />
              ))}
            </div>
          )}
          <Link to="/admin/reservas" className="mt-4 inline-block text-sm font-medium text-primario-700 underline">
            Ver todas las reservas
          </Link>
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Próximas 24 horas</h2>
          {d ? (
            <p className="text-3xl font-semibold tabular-nums">{d.proximas24h}</p>
          ) : (
            <Esqueleto className="h-9 w-16" />
          )}
          <p className="text-sm text-tinta-suave">
            Sesiones solicitadas o confirmadas que empiezan en el próximo día. Conviene revisar que el profesional
            haya confirmado.
          </p>
        </Tarjeta>
      </div>
    </div>
  );
}

function Cifra({ etiqueta, valor, detalle, enlace, destacado }: { etiqueta: string; valor?: number; detalle?: string; enlace?: string; destacado?: boolean }) {
  const contenido = (
    <Tarjeta relleno="sm" interactiva={Boolean(enlace)} className={destacado ? 'border-aviso-600/40 bg-aviso-50' : undefined}>
      <p className="text-xs text-tinta-tenue">{etiqueta}</p>
      {valor === undefined ? <Esqueleto className="mt-1.5 h-8 w-12" /> : <p className="mt-1 text-2xl font-semibold tabular-nums">{valor}</p>}
      {detalle && <p className="text-xs text-tinta-suave">{detalle}</p>}
    </Tarjeta>
  );
  return enlace ? (
    <Link to={enlace} className="block rounded-2xl">
      {contenido}
    </Link>
  ) : (
    contenido
  );
}

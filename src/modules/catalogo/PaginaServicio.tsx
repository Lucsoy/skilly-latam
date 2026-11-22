import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { obtenerServicio } from '@/services/catalogo';
import { obtenerConfiguracion } from '@/services/configuracion';
import { useRecurso } from '@/lib/useRecurso';
import { calcularDesglose } from '@/lib/precios';
import { ETIQUETA_MODALIDAD, capitalizar, formatearCLP, formatearFechaLarga, formatearMinutos } from '@/lib/formato';
import { BotonEnlace, Esqueleto, EsqueletoTexto, EstadoError, Insignia, Tarjeta } from '@/components/ui';
import { useFavoritos } from './favoritosStore';
import { BotonFavorito } from './BotonFavorito';
import { PerfilProfesional } from './PerfilProfesional';

export function PaginaServicio() {
  const { servicioId = '' } = useParams();
  const detalle = useRecurso(() => obtenerServicio(servicioId), [servicioId]);
  const config = useRecurso(() => obtenerConfiguracion(), []);
  const cargarFavoritos = useFavoritos((s) => s.cargar);

  useEffect(() => {
    void cargarFavoritos();
  }, [cargarFavoritos]);

  if (detalle.error) {
    return (
      <div className="mx-auto max-w-2xl">
        <EstadoError titulo="No encontramos este servicio" mensaje={detalle.error} reintentar={detalle.recargar} />
        <div className="mt-4 text-center">
          <BotonEnlace to="/buscar" variante="secundario">
            Volver a buscar
          </BotonEnlace>
        </div>
      </div>
    );
  }

  if (detalle.cargando || !detalle.datos) return <EsqueletoFicha />;

  const { servicio, profesional, categoria, subcategoria, reputacion, proximoBloque, otrosServiciosDelProfesional } =
    detalle.datos;
  const desglose = config.datos ? calcularDesglose(servicio.precio, config.datos.comisionPorcentaje) : null;

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ruta" className="text-xs text-tinta-tenue">
        <Link to="/buscar" className="hover:text-primario-700 hover:underline">
          Buscar
        </Link>
        <span aria-hidden="true"> › </span>
        <Link to={`/buscar?cat=${categoria.id}`} className="hover:text-primario-700 hover:underline">
          {categoria.nombre}
        </Link>
        <span aria-hidden="true"> › </span>
        <Link to={`/buscar?cat=${categoria.id}&sub=${subcategoria.id}`} className="hover:text-primario-700 hover:underline">
          {subcategoria.nombre}
        </Link>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{servicio.titulo}</h1>
              <BotonFavorito servicioId={servicio.id} titulo={servicio.titulo} className="-mr-2 -mt-1" />
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {servicio.modalidades.map((m) => (
                <li key={m}>
                  <Insignia tono="neutro">{ETIQUETA_MODALIDAD[m]}</Insignia>
                </li>
              ))}
              <li>
                <Insignia tono="neutro">Duración: {servicio.duracionEstimada}</Insignia>
              </li>
              <li>
                <Insignia tono="neutro">Sesiones de {formatearMinutos(servicio.duracionSesionMinutos)}</Insignia>
              </li>
            </ul>
          </header>

          <section aria-labelledby="descripcion">
            <h2 id="descripcion" className="text-base font-semibold">
              En qué consiste
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-tinta">{servicio.descripcion}</p>
          </section>

          <section aria-labelledby="entregables">
            <h2 id="entregables" className="text-base font-semibold">
              Qué recibes
            </h2>
            <ul className="mt-2 flex flex-col gap-2">
              {servicio.entregables.map((e) => (
                <li key={e} className="flex gap-2.5 text-sm">
                  <span aria-hidden="true" className="mt-0.5 text-exito-600">
                    <IconoCheck />
                  </span>
                  {e}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="profesional" className="border-t border-borde pt-6">
            <h2 id="profesional" className="mb-4 text-base font-semibold">
              Quién lo hace
            </h2>
            <PerfilProfesional profesional={profesional} reputacion={reputacion} />
            <div className="mt-4">
              <Link to={`/profesionales/${profesional.id}`} className="text-sm font-medium text-primario-700 underline">
                Ver perfil completo de {profesional.nombre}
              </Link>
            </div>
          </section>

          {otrosServiciosDelProfesional.length > 0 && (
            <section aria-labelledby="otros" className="border-t border-borde pt-6">
              <h2 id="otros" className="text-base font-semibold">
                Otros servicios de {profesional.nombre}
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {otrosServiciosDelProfesional.map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/servicios/${s.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-borde bg-superficie px-4 py-3 text-sm transition-colors hover:border-primario-300"
                    >
                      <span className="font-medium">{s.titulo}</span>
                      <span className="shrink-0 text-tinta-suave">desde {formatearCLP(s.precio)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Panel de acción: precio, disponibilidad y el único botón principal. */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Tarjeta className="flex flex-col gap-4">
            <div>
              <p className="text-xs text-tinta-tenue">Precio del servicio</p>
              <p className="text-2xl font-semibold">{formatearCLP(servicio.precio)}</p>
              {desglose ? (
                <p className="mt-1 text-xs text-tinta-suave">
                  + {formatearCLP(desglose.comision)} de comisión de plataforma ({desglose.comisionPorcentaje} %). Total{' '}
                  <span className="font-medium text-tinta">{formatearCLP(desglose.total)}</span>.
                </p>
              ) : (
                <Esqueleto className="mt-1 h-3.5 w-3/4" />
              )}
            </div>

            <div className="rounded-xl bg-crema px-3.5 py-3 text-sm">
              {proximoBloque ? (
                <>
                  <p className="text-xs text-tinta-tenue">Primera hora disponible</p>
                  <p className="font-medium">{capitalizar(formatearFechaLarga(proximoBloque))}</p>
                </>
              ) : (
                <>
                  <p className="font-medium">Sin horas publicadas por ahora</p>
                  <p className="mt-0.5 text-xs text-tinta-suave">
                    Guárdalo en favoritos y vuelve a revisar en unos días, o escríbenos y te avisamos.
                  </p>
                </>
              )}
            </div>

            <BotonEnlace to={`/agendar/${servicio.id}`} tamano="lg" bloque>
              Ver disponibilidad y agendar
            </BotonEnlace>

            <p className="text-xs text-tinta-tenue">
              Agendar no tiene costo. Pagas solo cuando el profesional confirma y aceptas las condiciones.
            </p>
          </Tarjeta>
        </aside>
      </div>
    </div>
  );
}

function EsqueletoFicha() {
  return (
    <div aria-busy="true" className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <Esqueleto className="h-3 w-1/3" />
        <Esqueleto className="h-9 w-4/5" />
        <div className="flex gap-2">
          <Esqueleto className="h-6 w-20 rounded-full" />
          <Esqueleto className="h-6 w-28 rounded-full" />
        </div>
        <EsqueletoTexto lineas={4} />
        <EsqueletoTexto lineas={4} />
        <div className="flex items-center gap-4">
          <Esqueleto className="h-20 w-20 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Esqueleto className="h-5 w-1/2" />
            <Esqueleto className="h-3.5 w-2/3" />
          </div>
        </div>
      </div>
      <Tarjeta className="flex flex-col gap-4">
        <Esqueleto className="h-8 w-1/2" />
        <Esqueleto className="h-14 w-full" />
        <Esqueleto className="h-12 w-full" />
      </Tarjeta>
    </div>
  );
}

function IconoCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

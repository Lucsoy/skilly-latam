import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buscarServicios, listarCategorias } from '@/services/catalogo';
import { useRecurso, useRetardo } from '@/lib/useRecurso';
import { plural } from '@/lib/formato';
import { cn } from '@/lib/cn';
import { Boton, EstadoError, EstadoVacio, Insignia, Revelar } from '@/components/ui';
import { useFavoritos } from './favoritosStore';
import { FiltrosCatalogo } from './FiltrosCatalogo';
import { EsqueletoTarjetaServicio, TarjetaServicio } from './TarjetaServicio';
import {
  FILTROS_VACIOS,
  OPCIONES_ORDEN,
  aFiltrosBusqueda,
  contarFiltrosActivos,
  escribirFiltros,
  leerFiltros,
  type FiltrosUi,
} from './filtrosUrl';

const SUGERENCIAS = [
  'Necesito armar el onboarding para 20 personas',
  'Ordenar los sueldos de mi equipo',
  'Contratar un desarrollador backend',
  'Revisar contratos y finiquitos',
];

export function PaginaBuscar() {
  const [params, setParams] = useSearchParams();
  const filtros = useMemo(() => leerFiltros(params), [params]);

  // El texto se escribe libre y se manda a buscar con un pequeño retardo.
  const [texto, setTexto] = useState(filtros.texto);
  const textoRetrasado = useRetardo(texto, 400);
  const [panelAbierto, setPanelAbierto] = useState(false);

  const cargarFavoritos = useFavoritos((s) => s.cargar);
  useEffect(() => {
    void cargarFavoritos();
  }, [cargarFavoritos]);

  const aplicar = useCallback(
    (nuevos: FiltrosUi) => setParams(escribirFiltros(nuevos), { replace: true }),
    [setParams],
  );

  // Sincroniza el texto retrasado con la barra de direcciones.
  useEffect(() => {
    if (textoRetrasado.trim() === filtros.texto.trim()) return;
    aplicar({ ...filtros, texto: textoRetrasado });
  }, [textoRetrasado, filtros, aplicar]);

  const categorias = useRecurso(() => listarCategorias(), []);
  const clave = params.toString();
  const resultados = useRecurso(() => buscarServicios(aFiltrosBusqueda(filtros)), [clave]);

  const activos = contarFiltrosActivos(filtros);
  const hayBusqueda = Boolean(filtros.texto.trim()) || activos > 0;

  const limpiarTodo = () => {
    setTexto('');
    aplicar(FILTROS_VACIOS);
  };

  const panelFiltros = (
    <FiltrosCatalogo
      filtros={filtros}
      onCambiar={aplicar}
      categorias={categorias.datos}
      cargandoCategorias={categorias.cargando}
    />
  );

  return (
    <div className="catalogo-vitrina flex flex-col gap-6">
      <header className="flex min-w-0 flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">¿Con qué necesitas ayuda?</h1>
          <p className="mt-1.5 text-sm text-tinta-suave">
            Cuéntanos tu necesidad en tus palabras. Nosotros te mostramos a quién puede resolverla.
          </p>
        </div>

        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            aplicar({ ...filtros, texto });
          }}
          className="relative"
        >
          <label htmlFor="busqueda" className="sr-only">
            Describe lo que necesitas
          </label>
          <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-tinta-tenue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            id="busqueda"
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ej: necesito armar el proceso de onboarding para 20 personas"
            className="w-full rounded-2xl border border-borde-fuerte bg-superficie py-3.5 pl-11 pr-4 text-base placeholder:text-tinta-tenue focus:border-primario-500"
          />
        </form>

        {!hayBusqueda && (
          <ul className="flex flex-wrap gap-2">
            {SUGERENCIAS.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => {
                    setTexto(s);
                    aplicar({ ...filtros, texto: s });
                  }}
                  className="rounded-full border border-borde bg-superficie px-3 py-1.5 text-xs text-tinta-suave transition-colors hover:border-primario-300 hover:text-primario-700"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-borde bg-superficie p-5">{panelFiltros}</div>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Boton
                variante="secundario"
                tamano="sm"
                className="lg:hidden"
                aria-expanded={panelAbierto}
                aria-controls="panel-filtros"
                onClick={() => setPanelAbierto((v) => !v)}
              >
                Filtros
                {activos > 0 && (
                  <span className="rounded-full bg-primario-100 px-1.5 text-xs text-primario-700">{activos}</span>
                )}
              </Boton>
              <p aria-live="polite" className="text-sm text-tinta-suave">
                {resultados.cargando
                  ? 'Buscando…'
                  : resultados.datos
                    ? plural(resultados.datos.total, 'servicio', 'servicios')
                    : ''}
              </p>
            </div>

            <div className="flex max-w-full flex-wrap items-center gap-2">
              <label htmlFor="orden" className="text-sm text-tinta-suave">
                Ordenar por
              </label>
              <select
                id="orden"
                value={filtros.orden}
                onChange={(e) => aplicar({ ...filtros, orden: e.target.value as FiltrosUi['orden'] })}
                className="min-h-[36px] min-w-0 max-w-full rounded-xl border border-borde-fuerte bg-superficie px-3 py-1.5 text-sm focus:border-primario-500"
              >
                {OPCIONES_ORDEN.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {panelAbierto && (
            <div id="panel-filtros" className="rounded-2xl border border-borde bg-superficie p-5 lg:hidden">
              {panelFiltros}
              <Boton bloque className="mt-5" onClick={() => setPanelAbierto(false)}>
                Ver resultados
              </Boton>
            </div>
          )}

          {filtros.orden === 'relevancia' && (
            <p className={cn('text-xs text-tinta-tenue', resultados.cargando && 'opacity-60')}>
              Mezclamos a propósito profesionales nuevos con quienes ya tienen historial en Skilly. Todos pasan
              por la misma validación.
            </p>
          )}

          <Resultados
            cargando={resultados.cargando}
            error={resultados.error}
            recargar={resultados.recargar}
            items={resultados.datos?.items ?? []}
            hayBusqueda={hayBusqueda}
            onLimpiar={limpiarTodo}
          />
        </div>
      </div>
    </div>
  );
}

interface PropsResultados {
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  items: Awaited<ReturnType<typeof buscarServicios>>['items'];
  hayBusqueda: boolean;
  onLimpiar: () => void;
}

function Resultados({ cargando, error, recargar, items, hayBusqueda, onLimpiar }: PropsResultados) {
  if (error) return <EstadoError mensaje={error} reintentar={recargar} />;

  if (cargando) {
    return (
      <ul aria-busy="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <EsqueletoTarjetaServicio />
          </li>
        ))}
      </ul>
    );
  }

  if (items.length === 0) {
    return (
      <EstadoVacio
        titulo="No encontramos servicios con esos criterios"
        descripcion={
          hayBusqueda
            ? 'Prueba con menos filtros o describe tu necesidad de otra forma. Si prefieres, escríbenos a hola@skilly.cl y te ayudamos a buscar.'
            : 'Todavía no hay servicios publicados en esta categoría.'
        }
        accion={
          hayBusqueda ? (
            <Boton variante="secundario" onClick={onLimpiar}>
              Limpiar la búsqueda
            </Boton>
          ) : undefined
        }
      />
    );
  }

  const nuevos = items.filter((i) => i.reputacion.esNuevo).length;

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, i) => (
          <li key={item.servicio.id}>
            {/* Cascada por columnas: cada fila entra escalonada, no de golpe. */}
            <Revelar retraso={(i % 3) * 90} className="h-full">
              <TarjetaServicio item={item} />
            </Revelar>
          </li>
        ))}
      </ul>
      {nuevos > 0 && (
        <p className="flex items-center gap-2 text-xs text-tinta-tenue">
          <Insignia tono="primario">{nuevos}</Insignia>
          {nuevos === 1 ? 'perfil nuevo aparece' : 'perfiles nuevos aparecen'} en esta lista, repartidos entre
          los demás.
        </p>
      )}
    </>
  );
}

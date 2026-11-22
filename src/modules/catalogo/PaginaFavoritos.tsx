import { useEffect } from 'react';
import { buscarServicios } from '@/services/catalogo';
import { useRecurso } from '@/lib/useRecurso';
import { plural } from '@/lib/formato';
import { BotonEnlace, EstadoError, EstadoVacio } from '@/components/ui';
import { useFavoritos } from './favoritosStore';
import { EsqueletoTarjetaServicio, TarjetaServicio } from './TarjetaServicio';

export function PaginaFavoritos() {
  const ids = useFavoritos((s) => s.ids);
  const cargado = useFavoritos((s) => s.cargado);
  const cargar = useFavoritos((s) => s.cargar);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Se pide el catálogo completo y se filtra por los ids guardados. Con backend,
  // esto será GET /api/favoritos/?expandir=servicio en una sola llamada.
  const catalogo = useRecurso(() => buscarServicios({ orden: 'relevancia' }), []);
  const items = (catalogo.datos?.items ?? []).filter((i) => ids.includes(i.servicio.id));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Servicios guardados</h1>
        <p className="mt-1.5 text-sm text-tinta-suave">
          Lo que dejaste anotado para revisar con calma o comentar con tu equipo.
        </p>
      </header>

      {catalogo.error ? (
        <EstadoError mensaje={catalogo.error} reintentar={catalogo.recargar} />
      ) : catalogo.cargando || !cargado ? (
        <ul aria-busy="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <EsqueletoTarjetaServicio />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no guardas ningún servicio"
          descripcion="Cuando encuentres algo que te sirva, toca el corazón de la tarjeta y quedará acá."
          accion={<BotonEnlace to="/buscar">Buscar profesionales</BotonEnlace>}
        />
      ) : (
        <>
          <p className="text-sm text-tinta-suave">{plural(items.length, 'servicio guardado', 'servicios guardados')}</p>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <li key={item.servicio.id}>
                <TarjetaServicio item={item} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

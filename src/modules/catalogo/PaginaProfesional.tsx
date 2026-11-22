import { Link, useParams } from 'react-router-dom';
import { obtenerProfesional, obtenerReputacion } from '@/services/profesionales';
import { listarServiciosDeProfesional } from '@/services/catalogo';
import { useRecurso } from '@/lib/useRecurso';
import { ETIQUETA_MODALIDAD, formatearCLP } from '@/lib/formato';
import { BotonEnlace, Esqueleto, EsqueletoTexto, EstadoError, Insignia, Tarjeta } from '@/components/ui';
import { PerfilProfesional } from './PerfilProfesional';

export function PaginaProfesional() {
  const { profesionalId = '' } = useParams();
  const datos = useRecurso(
    () =>
      Promise.all([
        obtenerProfesional(profesionalId),
        obtenerReputacion(profesionalId),
        listarServiciosDeProfesional(profesionalId),
      ]),
    [profesionalId],
  );

  if (datos.error) {
    return (
      <div className="mx-auto max-w-2xl">
        <EstadoError titulo="No encontramos este perfil" mensaje={datos.error} reintentar={datos.recargar} />
        <div className="mt-4 text-center">
          <BotonEnlace to="/buscar" variante="secundario">
            Volver a buscar
          </BotonEnlace>
        </div>
      </div>
    );
  }

  if (datos.cargando || !datos.datos) {
    return (
      <div aria-busy="true" className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center gap-4">
          <Esqueleto className="h-20 w-20 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Esqueleto className="h-6 w-1/2" />
            <Esqueleto className="h-3.5 w-2/3" />
          </div>
        </div>
        <EsqueletoTexto lineas={4} />
        <EsqueletoTexto lineas={3} />
      </div>
    );
  }

  const [profesional, reputacion, servicios] = datos.datos;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <nav aria-label="Ruta" className="text-xs text-tinta-tenue">
        <Link to="/buscar" className="hover:text-primario-700 hover:underline">
          Buscar
        </Link>
        <span aria-hidden="true"> › </span>
        <span>
          {profesional.nombre} {profesional.apellido}
        </span>
      </nav>

      <PerfilProfesional profesional={profesional} reputacion={reputacion} completo />

      <section aria-labelledby="servicios" className="border-t border-borde pt-6">
        <h2 id="servicios" className="text-base font-semibold">
          Servicios que ofrece
        </h2>
        {servicios.length === 0 ? (
          <p className="mt-2 text-sm text-tinta-suave">Todavía no tiene servicios publicados.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {servicios.map((s) => (
              <li key={s.id}>
                <Tarjeta relleno="sm" interactiva className="relative">
                  <h3 className="text-base font-semibold">
                    <Link to={`/servicios/${s.id}`} className="after:absolute after:inset-0 after:rounded-2xl">
                      {s.titulo}
                    </Link>
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-tinta-suave">{s.descripcion}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <ul className="flex flex-wrap gap-1.5">
                      {s.modalidades.map((m) => (
                        <li key={m}>
                          <Insignia tono="neutro">{ETIQUETA_MODALIDAD[m]}</Insignia>
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm">
                      <span className="text-xs text-tinta-tenue">Desde </span>
                      <span className="font-semibold">{formatearCLP(s.precio)}</span>
                    </p>
                  </div>
                </Tarjeta>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

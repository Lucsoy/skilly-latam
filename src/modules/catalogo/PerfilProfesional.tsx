import { Link } from 'react-router-dom';
import { hrefSeguro } from '@/lib/enlaces';
import type { Profesional, Reputacion } from '@/types';
import { formatearFechaCorta } from '@/lib/formato';
import { Avatar, Insignia, Tarjeta } from '@/components/ui';
import { BloqueReputacion, ListaInsignias } from '@/components/reputacion/BloqueReputacion';

interface Props {
  profesional: Profesional;
  reputacion: Reputacion;
  /** true en la página del profesional; false en la ficha del servicio (versión resumida). */
  completo?: boolean;
}

export function PerfilProfesional({ profesional, reputacion, completo = false }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        <Avatar nombre={profesional.nombre} apellido={profesional.apellido} tamano="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold leading-tight">
            {completo ? (
              <>
                {profesional.nombre} {profesional.apellido}
              </>
            ) : (
              <Link to={`/profesionales/${profesional.id}`} className="hover:text-primario-700 hover:underline">
                {profesional.nombre} {profesional.apellido}
              </Link>
            )}
          </h2>
          <p className="mt-0.5 text-sm text-tinta-suave">{profesional.titulo}</p>
          <p className="mt-0.5 text-xs text-tinta-tenue">
            {profesional.ciudad} · En Skilly desde {formatearFechaCorta(profesional.fechaIngreso)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profesional.validadoPorSkilly && (
              <Insignia tono="exito" icono={<IconoEscudo />}>
                Validado por Skilly
              </Insignia>
            )}
            {(hrefSeguro(profesional.linkedin) || hrefSeguro(profesional.portafolio)) && (
              <>
                {hrefSeguro(profesional.linkedin) && (
                  <a
                    href={hrefSeguro(profesional.linkedin)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-borde bg-superficie px-2.5 py-0.5 text-xs font-medium text-tinta-suave hover:border-primario-300 hover:text-primario-700"
                  >
                    LinkedIn <IconoExterno />
                  </a>
                )}
                {hrefSeguro(profesional.portafolio) && (
                  <a
                    href={hrefSeguro(profesional.portafolio)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-borde bg-superficie px-2.5 py-0.5 text-xs font-medium text-tinta-suave hover:border-primario-300 hover:text-primario-700"
                  >
                    Portafolio <IconoExterno />
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-tinta">{profesional.presentacion}</p>

      <section aria-labelledby="habilidades">
        <h3 id="habilidades" className="text-sm font-semibold">
          Habilidades
        </h3>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {profesional.habilidades.map((h) => (
            <li key={h}>
              <Insignia tono="neutro">{h}</Insignia>
            </li>
          ))}
        </ul>
      </section>

      {completo && (
        <>
          <section aria-labelledby="formacion">
            <h3 id="formacion" className="text-sm font-semibold">
              Formación
            </h3>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm text-tinta-suave">
              {profesional.formacion.map((f) => (
                <li key={f} className="flex gap-2">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primario-400" />
                  {f}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="experiencia">
            <h3 id="experiencia" className="text-sm font-semibold">
              Experiencia
            </h3>
            <ul className="mt-2 flex flex-col gap-3">
              {profesional.experiencia.map((e) => (
                <li key={`${e.organizacion}-${e.periodo}`} className="text-sm">
                  <p className="font-medium">{e.cargo}</p>
                  <p className="text-tinta-suave">
                    {e.organizacion} · {e.periodo}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="verificaciones">
            <h3 id="verificaciones" className="text-sm font-semibold">
              Verificado por Skilly
            </h3>
            <ListaInsignias insignias={profesional.insignias} className="mt-2" />
            <p className="mt-2 text-xs text-tinta-tenue">
              Antes de publicar un perfil revisamos identidad, título y experiencia, y conversamos con cada
              profesional.
            </p>
          </section>
        </>
      )}

      <Tarjeta relleno="sm" className="bg-crema/60">
        <h3 className="text-sm font-semibold">Cómo lo evalúan otras organizaciones</h3>
        <BloqueReputacion
          reputacion={reputacion}
          insignias={profesional.insignias}
          validadoPorSkilly={profesional.validadoPorSkilly}
          variante="completa"
          className="mt-3"
        />
      </Tarjeta>
    </div>
  );
}

function IconoEscudo() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconoExterno() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

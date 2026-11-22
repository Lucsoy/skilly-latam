import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { listarProfesionalesAdmin } from '@/services/admin';
import { useRecurso } from '@/lib/useRecurso';
import { formatearFechaCorta, plural } from '@/lib/formato';
import { ETIQUETA_INSIGNIA } from '@/components/reputacion/BloqueReputacion';
import { Avatar, BotonEnlace, Esqueleto, EstadoError, EstadoVacio, Insignia, Pestanas, Tarjeta } from '@/components/ui';

type Filtro = 'todos' | 'validar' | 'revision';

export function PaginaProfesionalesAdmin() {
  const lista = useRecurso(() => listarProfesionalesAdmin(), []);
  const [filtro, setFiltro] = useState<Filtro>('todos');

  if (lista.error) return <EstadoError mensaje={lista.error} reintentar={lista.recargar} />;

  const todos = (lista.datos ?? []).map((item) => ({
    ...item,
    revisionesPendientes: item.servicios.filter((s) => s.revision?.estado === 'pendiente').length,
  }));
  const conRevision = todos.filter((p) => p.revisionesPendientes > 0);
  const porValidar = todos.filter((p) => p.estadoValidacion === 'en_revision');
  const visibles = filtro === 'revision' ? conRevision : filtro === 'validar' ? porValidar : todos;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profesionales</h1>
        <p className="mt-1.5 text-sm text-tinta-suave">
          Quiénes están publicados, qué verificaciones tienen y cuánta actividad llevan. Abre la ficha de cada uno para
          ver toda su información y responder las revisiones de servicios.
        </p>
      </header>

      <Pestanas<Filtro>
        etiquetaGrupo="Filtrar profesionales"
        activa={filtro}
        onCambiar={setFiltro}
        pestanas={[
          { valor: 'todos', etiqueta: 'Todos', cantidad: todos.length },
          { valor: 'validar', etiqueta: 'Perfiles por validar', cantidad: porValidar.length },
          { valor: 'revision', etiqueta: 'Revisiones pendientes', cantidad: conRevision.length },
        ]}
      />

      {lista.cargando ? (
        <div aria-busy="true" className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Esqueleto key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : visibles.length === 0 ? (
        <EstadoVacio
          titulo={filtro === 'revision' ? 'No hay revisiones pendientes' : filtro === 'validar' ? 'No hay perfiles por validar' : 'Todavía no hay profesionales'}
          descripcion={
            filtro === 'revision'
              ? 'Cuando un profesional solicite revisar uno de sus servicios, aparecerá acá.'
              : filtro === 'validar'
                ? 'Cuando un profesional envíe su perfil a revisión, aparecerá acá.'
                : 'Los profesionales que se registren aparecerán en esta lista.'
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visibles.map(({ profesional, servicios, totalEvaluaciones, esNuevo, reservasActivas, revisionesPendientes, estadoValidacion }) => (
            <li key={profesional.id}>
              <Tarjeta relleno="sm" className="flex h-full flex-col gap-3">
                <div className="flex items-start gap-3">
                  <Avatar nombre={profesional.nombre} apellido={profesional.apellido} tamano="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {profesional.nombre} {profesional.apellido}
                    </p>
                    <p className="truncate text-xs text-tinta-suave">{profesional.titulo}</p>
                    <p className="text-xs text-tinta-tenue">
                      {profesional.ciudad} · ingresó el {formatearFechaCorta(profesional.fechaIngreso)}
                    </p>
                  </div>
                  {profesional.validadoPorSkilly ? (
                    <Insignia tono="exito">Validado</Insignia>
                  ) : (
                    <Insignia tono="aviso">Sin validar</Insignia>
                  )}
                </div>
                <ul className="flex flex-wrap gap-1">
                  {estadoValidacion === 'en_revision' && (
                    <li>
                      <Insignia tono="aviso">Perfil por validar</Insignia>
                    </li>
                  )}
                  {revisionesPendientes > 0 && (
                    <li>
                      <Insignia tono="info">{plural(revisionesPendientes, 'revisión pendiente', 'revisiones pendientes')}</Insignia>
                    </li>
                  )}
                  {profesional.insignias.map((i) => (
                    <li key={i}>
                      <Insignia tono="neutro">{ETIQUETA_INSIGNIA[i]}</Insignia>
                    </li>
                  ))}
                </ul>
                <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-borde pt-3 text-xs">
                  <div>
                    <dt className="text-tinta-tenue">Servicios</dt>
                    <dd className="font-semibold tabular-nums">{servicios.length}</dd>
                  </div>
                  <div>
                    <dt className="text-tinta-tenue">Evaluaciones</dt>
                    <dd className="font-semibold tabular-nums">
                      {totalEvaluaciones} {esNuevo && <span className="font-normal text-primario-700">(nuevo)</span>}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-tinta-tenue">Reservas activas</dt>
                    <dd className="font-semibold tabular-nums">{plural(reservasActivas, 'reserva', 'reservas')}</dd>
                  </div>
                </dl>
                <BotonEnlace
                  to={`/admin/profesionales/${encodeURIComponent(profesional.id)}`}
                  variante="secundario"
                  tamano="sm"
                  bloque
                  icono={<ArrowRight className="h-4 w-4" />}
                >
                  Ver ficha completa
                </BotonEnlace>
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

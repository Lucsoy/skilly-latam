import { useState } from 'react';
import { listarComentariosEnRevision, moderarComentario } from '@/services/admin';
import { mensajeParaUsuario } from '@/services/errores';
import { useRecurso } from '@/lib/useRecurso';
import { formatearFechaHora } from '@/lib/formato';
import { ETIQUETA_DIMENSION, ETIQUETA_NIVEL } from '@/lib/reputacion';
import { Alerta, Boton, Esqueleto, EstadoError, EstadoVacio, Tarjeta } from '@/components/ui';

export function PaginaModeracionAdmin() {
  const pendientes = useRecurso(() => listarComentariosEnRevision(), []);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ultimaDecision, setUltimaDecision] = useState<string | null>(null);

  const decidir = async (id: string, decision: 'aprobar' | 'rechazar') => {
    setError(null);
    setProcesando(id);
    try {
      await moderarComentario(id, decision);
      setUltimaDecision(decision === 'aprobar' ? 'Comentario publicado.' : 'Comentario rechazado. No se mostrará en el perfil.');
      pendientes.establecer((pendientes.datos ?? []).filter((c) => c.evaluacion.id !== id));
    } catch (e) {
      setError(mensajeParaUsuario(e));
    } finally {
      setProcesando(null);
    }
  };

  if (pendientes.error) return <EstadoError mensaje={pendientes.error} reintentar={pendientes.recargar} />;

  const lista = pendientes.datos ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Moderación de comentarios</h1>
        <p className="mt-1.5 text-sm text-tinta-suave">
          Las notas de las tres dimensiones se publican solas. Los comentarios escritos pasan por acá antes de verse
          en el perfil del profesional.
        </p>
      </header>

      {error && <Alerta tono="peligro">{error}</Alerta>}
      {ultimaDecision && (
        <Alerta tono="exito" accion={<Boton variante="fantasma" tamano="sm" onClick={() => setUltimaDecision(null)}>Cerrar</Boton>}>
          {ultimaDecision}
        </Alerta>
      )}

      {pendientes.cargando ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Esqueleto key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <EstadoVacio titulo="No hay comentarios pendientes" descripcion="Cuando una organización escriba un comentario, aparecerá acá para revisarlo." />
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.map(({ evaluacion, organizacion, profesional }) => (
            <li key={evaluacion.id}>
              <Tarjeta className="flex flex-col gap-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <p>
                    <span className="font-medium">{organizacion}</span> <span className="text-tinta-suave">evaluó a</span>{' '}
                    <span className="font-medium">{profesional}</span>
                  </p>
                  <p className="text-xs text-tinta-tenue">{formatearFechaHora(evaluacion.fecha)}</p>
                </div>

                <dl className="grid gap-2 rounded-lg bg-crema px-3 py-2 text-xs sm:grid-cols-3">
                  {(['calidad', 'plazos', 'comunicacion'] as const).map((d) => (
                    <div key={d} className="flex justify-between gap-2 sm:block">
                      <dt className="text-tinta-tenue">{ETIQUETA_DIMENSION[d]}</dt>
                      <dd className="font-medium">{ETIQUETA_NIVEL[evaluacion[d]]}</dd>
                    </div>
                  ))}
                </dl>

                <blockquote className="border-l-2 border-primario-300 pl-3 text-sm text-tinta">“{evaluacion.comentario}”</blockquote>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Boton
                    variante="secundario"
                    onClick={() => void decidir(evaluacion.id, 'rechazar')}
                    cargando={procesando === evaluacion.id}
                    disabled={procesando !== null}
                  >
                    Rechazar
                  </Boton>
                  <Boton
                    onClick={() => void decidir(evaluacion.id, 'aprobar')}
                    cargando={procesando === evaluacion.id}
                    disabled={procesando !== null}
                  >
                    Aprobar y publicar
                  </Boton>
                </div>
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

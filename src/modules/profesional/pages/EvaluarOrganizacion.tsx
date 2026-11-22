import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import type { DimensionEvaluacion, NivelEvaluacion } from '@/types';
import { obtenerSolicitudProfesional } from '@/services/solicitudes';
import { enviarEvaluacion, obtenerEstadoEvaluacion } from '@/services/evaluaciones';
import { obtenerConfiguracion } from '@/services/configuracion';
import { mensajeParaUsuario } from '@/services/errores';
import { useRecurso } from '@/lib/useRecurso';
import { cn } from '@/lib/cn';
import { formatearFechaCorta } from '@/lib/formato';
import { DIMENSIONES, ETIQUETA_DIMENSION, ETIQUETA_NIVEL } from '@/lib/reputacion';
import { Alerta, Boton, BotonEnlace, CampoTextarea, Esqueleto, EstadoError, Tarjeta } from '@/components/ui';

const NIVELES: NivelEvaluacion[] = [4, 3, 2, 1];

const PREGUNTA: Record<DimensionEvaluacion, string> = {
  calidad: '¿La organización entregó la información y los insumos que necesitabas?',
  plazos: '¿Respetó los plazos y horarios acordados?',
  comunicacion: '¿Cómo fue la comunicación durante el servicio?',
};

type Respuestas = Partial<Record<DimensionEvaluacion, NivelEvaluacion>>;

/**
 * Evaluación de la organización por parte del profesional (la otra mitad de
 * la evaluación bidireccional y ciega). Antes solo existía en el backend.
 * Ruta: /profesional/solicitudes/:reservaId/evaluar
 */
export function EvaluarOrganizacion() {
  const { reservaId = '' } = useParams();
  const navegar = useNavigate();
  const reserva = useRecurso(() => obtenerSolicitudProfesional(reservaId), [reservaId]);
  const estado = useRecurso(() => obtenerEstadoEvaluacion(reservaId), [reservaId]);
  const configuracion = useRecurso(obtenerConfiguracion, []);
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (reserva.error) return <EstadoError titulo="No encontramos esta contratación" mensaje={reserva.error} reintentar={reserva.recargar} />;
  if (estado.error) return <EstadoError mensaje={estado.error} reintentar={estado.recargar} />;
  if (reserva.cargando || !reserva.datos || estado.cargando || !estado.datos) {
    return <Esqueleto className="mx-auto h-96 w-full max-w-3xl rounded-2xl" />;
  }

  const r = reserva.datos;
  const maximo = configuracion.datos?.reputacion.maxCaracteresComentario ?? 500;
  const volver = `/profesional/solicitudes/${encodeURIComponent(r.id)}`;
  const propia = estado.datos.propia;

  if (propia) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header>
          <p className="font-mono text-xs text-tinta-tenue">{r.codigo}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Tu evaluación de la organización</h1>
          <p className="mt-1 text-sm text-tinta-suave">La enviaste el {formatearFechaCorta(propia.fecha)}.</p>
        </header>
        <Tarjeta className="flex flex-col gap-4">
          <dl className="grid gap-3 sm:grid-cols-3">
            {DIMENSIONES.map((d) => (
              <div key={d} className="rounded-xl bg-crema px-4 py-3">
                <dt className="text-xs text-tinta-tenue">{ETIQUETA_DIMENSION[d]}</dt>
                <dd className="mt-1 text-sm font-semibold">{ETIQUETA_NIVEL[propia[d]]}</dd>
              </div>
            ))}
          </dl>
          <Alerta tono="info">
            {propia.publicada ? 'Tu evaluación ya es visible para la organización.' : 'Se publicará cuando la organización también evalúe o al vencer el plazo.'}
          </Alerta>
          <BotonEnlace to={volver} variante="secundario">Volver a la contratación</BotonEnlace>
        </Tarjeta>
      </div>
    );
  }

  if (!['ENTREGADA', 'EVALUADA'].includes(r.estado) || !r.conformidadConfirmada) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Evaluar a la organización</h1>
        <Alerta tono="aviso" titulo="Todavía no puedes evaluar">
          Podrás evaluar cuando marques el trabajo como entregado y la organización confirme su conformidad.
        </Alerta>
        <BotonEnlace to={volver} variante="secundario">Volver a la contratación</BotonEnlace>
      </div>
    );
  }

  const completo = DIMENSIONES.every((d) => respuestas[d] !== undefined);

  const enviar = async () => {
    if (!completo) {
      setError('Responde las tres preguntas antes de enviar.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await enviarEvaluacion({
        reservaId: r.id,
        calidad: respuestas.calidad!,
        plazos: respuestas.plazos!,
        comunicacion: respuestas.comunicacion!,
        comentario: comentario.trim() || undefined,
      });
      navegar(volver, { replace: true });
    } catch (e) {
      setError(mensajeParaUsuario(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <p className="font-mono text-xs text-tinta-tenue">{r.codigo}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Evaluar a la organización</h1>
        <p className="mt-1 text-sm text-tinta-suave">
          Es ciega: la organización no la verá hasta que ambos hayan evaluado. El comentario pasa por revisión de Skilly.
        </p>
      </header>
      <Tarjeta className="flex flex-col gap-6">
        {DIMENSIONES.map((d) => (
          <fieldset key={d} className="flex flex-col gap-2">
            <legend className="text-sm font-semibold">{ETIQUETA_DIMENSION[d]}</legend>
            <p className="text-sm text-tinta-suave">{PREGUNTA[d]}</p>
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {NIVELES.map((nivel) => {
                const elegido = respuestas[d] === nivel;
                return (
                  <label
                    key={nivel}
                    className={cn(
                      'flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-center text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-primario-500',
                      elegido ? 'border-primario-600 bg-primario-50 text-primario-800' : 'border-borde-fuerte bg-superficie text-tinta hover:border-primario-300',
                    )}
                  >
                    <input
                      type="radio"
                      name={d}
                      value={nivel}
                      checked={elegido}
                      onChange={() => setRespuestas((actual) => ({ ...actual, [d]: nivel }))}
                      className="sr-only"
                    />
                    {ETIQUETA_NIVEL[nivel]}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
        <CampoTextarea
          etiqueta="Comentario"
          nota="Opcional"
          value={comentario}
          valorActual={comentario}
          maximo={maximo}
          onChange={(e) => setComentario(e.target.value)}
        />
        {error && <Alerta tono="peligro">{error}</Alerta>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link to={volver} className="self-center text-sm font-medium text-primario-700 hover:underline">Cancelar</Link>
          <Boton onClick={() => void enviar()} cargando={enviando} disabled={!completo} icono={<CheckCircle2 className="h-4 w-4" />}>
            Enviar evaluación
          </Boton>
        </div>
      </Tarjeta>
    </div>
  );
}

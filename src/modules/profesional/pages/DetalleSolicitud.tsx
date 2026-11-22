import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarCheck, CalendarX, CheckCircle2, PackageCheck, PlayCircle, XCircle } from 'lucide-react';
import { useRecurso } from '@/lib/useRecurso';
import {
  aceptarTrabajoProfesional,
  iniciarTrabajo,
  marcarEntregado,
  obtenerSolicitudProfesional,
  rechazarTrabajoProfesional,
  responderReagendamiento,
} from '@/services/solicitudes';
import { obtenerEstadoEvaluacion } from '@/services/evaluaciones';
import { obtenerServicio } from '@/services/catalogo';
import { mensajeParaUsuario } from '@/services/errores';
import { formatearCLP, formatearFechaHoraExacta, formatearRangoBloque } from '@/lib/formato';
import { Alerta, Boton, BotonEnlace, CampoTextarea, Dialogo, Esqueleto, EstadoError, Insignia, Tarjeta } from '@/components/ui';
import { ETIQUETA_ESTADO, ESTADOS_CHAT, accionesProfesional } from '@/modules/agenda/estadoReserva';

type Accion = 'aceptar' | 'rechazar' | 'iniciar' | 'entregar' | 'aceptar_fecha' | 'rechazar_fecha';

const CONFIRMACION: Record<Exclude<Accion, 'rechazar' | 'rechazar_fecha'>, { titulo: string; texto: string; boton: string }> = {
  aceptar: {
    titulo: '¿Aceptas realizar este trabajo?',
    texto: 'La organización podrá completar el pago y la contratación quedará confirmada.',
    boton: 'Sí, acepto',
  },
  iniciar: {
    titulo: '¿Comenzar el trabajo?',
    texto: 'La contratación pasará a "En curso". Hazlo cuando inicie la primera sesión o el desarrollo.',
    boton: 'Comenzar',
  },
  entregar: {
    titulo: '¿Marcar el trabajo como entregado?',
    texto: 'La organización revisará lo entregado y confirmará su conformidad. Después podrán evaluarse mutuamente.',
    boton: 'Marcar entregado',
  },
  aceptar_fecha: {
    titulo: '¿Aceptas la nueva fecha?',
    texto: 'La contratación se moverá al horario propuesto y el horario anterior volverá a estar disponible.',
    boton: 'Aceptar nueva fecha',
  },
};

/**
 * Detalle de una contratación desde el profesional. Muestra solo las acciones
 * que corresponden al estado actual (ver accionesProfesional en estadoReserva.ts):
 * responder la solicitud, responder un cambio de fecha, iniciar el trabajo,
 * marcarlo como entregado y evaluar a la organización.
 */
export function DetalleSolicitud() {
  const { reservaId = '' } = useParams();
  const solicitud = useRecurso(() => obtenerSolicitudProfesional(reservaId), [reservaId]);
  const evaluacion = useRecurso(() => obtenerEstadoEvaluacion(reservaId), [reservaId, solicitud.datos?.estado]);
  const servicio = useRecurso(
    () => (solicitud.datos ? obtenerServicio(solicitud.datos.servicioId).catch(() => null) : Promise.resolve(null)),
    [solicitud.datos?.servicioId],
  );
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<Accion | null>(null);
  const [cargando, setCargando] = useState(false);

  if (solicitud.error) return <EstadoError titulo="No encontramos la solicitud" mensaje={solicitud.error} reintentar={solicitud.recargar} />;
  if (solicitud.cargando || !solicitud.datos) return <Esqueleto className="h-96 w-full rounded-2xl" />;
  const r = solicitud.datos;
  const yaEvaluo = Boolean(evaluacion.datos?.propia);
  const acciones = accionesProfesional(r, yaEvaluo);

  const ejecutar = async (accion: Accion) => {
    setCargando(true);
    setError(null);
    setExito(null);
    try {
      const operaciones: Record<Accion, () => Promise<unknown>> = {
        aceptar: () => aceptarTrabajoProfesional(r.id),
        rechazar: () => rechazarTrabajoProfesional(r.id, motivo),
        iniciar: () => iniciarTrabajo(r.id),
        entregar: () => marcarEntregado(r.id),
        aceptar_fecha: () => responderReagendamiento(r.id, 'aceptar'),
        rechazar_fecha: () => responderReagendamiento(r.id, 'rechazar', motivo),
      };
      await operaciones[accion]();
      const mensajes: Record<Accion, string> = {
        aceptar: 'Aceptaste el trabajo. Te avisaremos en tu panel cuando la organización complete el pago.',
        rechazar: 'Rechazaste la solicitud.',
        iniciar: 'El trabajo quedó en curso.',
        entregar: 'Marcaste el trabajo como entregado. Ahora la organización debe confirmar su conformidad.',
        aceptar_fecha: 'Aceptaste la nueva fecha.',
        rechazar_fecha: 'Se mantiene la fecha original.',
      };
      setExito(mensajes[accion]);
      setMotivo('');
      solicitud.recargar();
    } catch (e) {
      setError(mensajeParaUsuario(e));
    } finally {
      setCargando(false);
      setPendiente(null);
    }
  };

  const dialogo = pendiente && pendiente !== 'rechazar' && pendiente !== 'rechazar_fecha' ? CONFIRMACION[pendiente] : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <p className="font-mono text-xs text-tinta-tenue">{r.codigo}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Solicitud de trabajo</h1>
          <Insignia tono={r.estado === 'RECHAZADA' || r.estado === 'CANCELADA' ? 'peligro' : acciones.length ? 'aviso' : 'info'}>
            {ETIQUETA_ESTADO[r.estado]}
          </Insignia>
        </div>
        <p className="mt-1 text-sm text-tinta-suave">Revisa el alcance y avanza la contratación desde aquí.</p>
      </header>

      {exito && <Alerta tono="exito">{exito}</Alerta>}
      {error && <Alerta tono="peligro">{error}</Alerta>}

      <Tarjeta className="flex flex-col gap-5">
        <div>
          <p className="text-xs text-tinta-tenue">Servicio</p>
          <h2 className="mt-1 text-lg font-semibold">{servicio.datos?.servicio.titulo ?? 'Servicio contratado'}</h2>
        </div>
        <dl className="grid gap-4 border-y border-borde py-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-tinta-tenue">Fecha y hora</dt>
            <dd className="mt-1 font-medium">{formatearRangoBloque(r.inicio, r.fin)}</dd>
          </div>
          <div>
            <dt className="text-tinta-tenue">Monto del servicio</dt>
            <dd className="mt-1 font-medium">{formatearCLP(r.precio)}</dd>
          </div>
          <div>
            <dt className="text-tinta-tenue">Modalidad</dt>
            <dd className="mt-1 font-medium capitalize">{r.modalidad === 'hibrido' ? 'Híbrido' : r.modalidad}</dd>
          </div>
        </dl>
        {r.mensaje && (
          <div className="rounded-xl bg-crema px-4 py-3 text-sm">
            <p className="text-xs text-tinta-tenue">Mensaje de la empresa</p>
            <p className="mt-1 whitespace-pre-wrap">{r.mensaje}</p>
          </div>
        )}

        {acciones.includes('responder_solicitud') && (
          <>
            <Alerta tono="info" titulo="Administración ya revisó esta solicitud">Si aceptas, la empresa podrá completar el pago y se confirmará la contratación.</Alerta>
            <CampoTextarea etiqueta="Motivo de rechazo" nota="Opcional" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Boton tamano="lg" cargando={cargando} icono={<CheckCircle2 className="h-4 w-4" />} onClick={() => setPendiente('aceptar')}>Aceptar trabajo</Boton>
              <Boton variante="peligro" tamano="lg" cargando={cargando} icono={<XCircle className="h-4 w-4" />} onClick={() => void ejecutar('rechazar')}>Rechazar trabajo</Boton>
            </div>
          </>
        )}

        {acciones.includes('responder_reagendamiento') && r.reagendamientoPropuesto && (
          <>
            <Alerta tono="aviso" titulo="La organización propone cambiar la fecha">
              Nueva fecha propuesta: <strong>{formatearRangoBloque(r.reagendamientoPropuesto.inicio, r.reagendamientoPropuesto.fin)}</strong>.
              Si no puedes, se mantiene la fecha original.
            </Alerta>
            <CampoTextarea etiqueta="Mensaje para la organización" nota="Opcional, si rechazas" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Boton cargando={cargando} icono={<CalendarCheck className="h-4 w-4" />} onClick={() => setPendiente('aceptar_fecha')}>Aceptar nueva fecha</Boton>
              <Boton variante="secundario" cargando={cargando} icono={<CalendarX className="h-4 w-4" />} onClick={() => void ejecutar('rechazar_fecha')}>Mantener fecha original</Boton>
            </div>
          </>
        )}

        {r.estado === 'PENDIENTE_PAGO' && <Alerta tono="info">Aceptaste el trabajo. Falta que la organización complete el pago (simulado).</Alerta>}

        {acciones.includes('iniciar_trabajo') && (
          <Boton cargando={cargando} icono={<PlayCircle className="h-4 w-4" />} onClick={() => setPendiente('iniciar')}>Comenzar el trabajo</Boton>
        )}
        {acciones.includes('marcar_entregado') && (
          <Boton cargando={cargando} icono={<PackageCheck className="h-4 w-4" />} onClick={() => setPendiente('entregar')}>Marcar como entregado</Boton>
        )}
        {r.estado === 'ENTREGADA' && !r.conformidadConfirmada && (
          <Alerta tono="info">Entregaste el trabajo. Esperamos que la organización confirme su conformidad.</Alerta>
        )}
        {acciones.includes('evaluar_organizacion') && (
          <div className="rounded-xl border border-primario-200 bg-primario-50 px-4 py-3 text-sm">
            <p className="font-semibold">Evalúa a la organización</p>
            <p className="mt-1 text-tinta-suave">Tu evaluación es ciega: se publica cuando ambas partes evalúan o al vencer el plazo.</p>
            <BotonEnlace to={`/profesional/solicitudes/${r.id}/evaluar`} tamano="sm" className="mt-3">Evaluar organización</BotonEnlace>
          </div>
        )}
        {yaEvaluo && <Alerta tono="exito">Ya enviaste tu evaluación de esta organización.</Alerta>}

        {ESTADOS_CHAT.includes(r.estado) && (
          <BotonEnlace to={`/profesional/solicitudes/${r.id}/chat`} variante="secundario" tamano="sm" className="self-start">
            Abrir chat de coordinación
          </BotonEnlace>
        )}

        <div>
          <h2 className="text-sm font-semibold">Historial</h2>
          <ol className="mt-3 flex flex-col gap-2">
            {r.historial.map((h) => (
              <li key={h.id} className="rounded-xl bg-crema px-3 py-2 text-xs">
                <span className="text-tinta-tenue">{formatearFechaHoraExacta(h.fecha)}</span>
                <span className="mx-2 font-medium">{ETIQUETA_ESTADO[h.estadoNuevo]}</span>
                <span className="text-tinta-suave">{h.actor.nombre}</span>
                {h.motivo && <p className="mt-1 text-tinta-suave">{h.motivo}</p>}
              </li>
            ))}
          </ol>
        </div>
        <Link to="/profesional/solicitudes" className="text-sm font-medium text-primario-700 underline">Volver a solicitudes</Link>
      </Tarjeta>

      <Dialogo
        abierto={Boolean(dialogo)}
        titulo={dialogo?.titulo ?? ''}
        onCerrar={() => setPendiente(null)}
        textoConfirmar={dialogo?.boton}
        onConfirmar={() => pendiente && void ejecutar(pendiente)}
        confirmando={cargando}
      >
        {dialogo?.texto}
      </Dialogo>
    </div>
  );
}

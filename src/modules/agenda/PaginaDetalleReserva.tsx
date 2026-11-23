import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CalendarClock, XCircle } from 'lucide-react';
import type { BloqueDisponible } from '@/types';
import { useRecurso } from '@/lib/useRecurso';
import {
  cancelarReserva,
  confirmarConformidad,
  obtenerReserva,
  simularCancelacion,
  solicitarReagendamiento,
} from '@/services/reservas';
import { listarBloquesDisponibles } from '@/services/disponibilidad';
import type { ResultadoCancelacion } from '@/lib/precios';
import { mensajeParaUsuario } from '@/services/errores';
import { formatearCLP, formatearFechaHoraExacta, formatearRangoBloque } from '@/lib/formato';
import { cn } from '@/lib/cn';
import { Alerta, Boton, BotonEnlace, CampoTextarea, Dialogo, EstadoError, Esqueleto, Insignia, Tarjeta } from '@/components/ui';
import { ETIQUETA_ESTADO, DESCRIPCION_ESTADO, ESTADOS_CANCELABLES, ESTADOS_CHAT } from './estadoReserva';

const ETIQUETA_PAGO = {
  pendiente_confirmacion: 'Pendiente',
  confirmado: 'Confirmado (pago simulado)',
  reembolsado: 'Reembolsado',
  retenido_parcial: 'Reembolso parcial',
  sin_cobro: 'Sin cobro (cancelada antes de pagar)',
} as const;

/**
 * Seguimiento de una contratación desde la organización: estado, pago, chat,
 * conformidad, evaluación, cancelación (con la retención calculada antes de
 * confirmar) y solicitud de cambio de fecha.
 */
export function PaginaDetalleReserva() {
  const { reservaId = '' } = useParams();
  const ubicacion = useLocation();
  const rsrc = useRecurso(() => obtenerReserva(reservaId), [reservaId]);
  const [confirmando, setConfirmando] = useState(false);
  const [dialogoConformidad, setDialogoConformidad] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // Cancelación
  const [simulacion, setSimulacion] = useState<ResultadoCancelacion | null>(null);
  const [dialogoCancelar, setDialogoCancelar] = useState(false);
  const [motivoCancelar, setMotivoCancelar] = useState('');
  const [cancelando, setCancelando] = useState(false);

  // Reagendamiento
  const [dialogoReagendar, setDialogoReagendar] = useState(false);
  const [bloques, setBloques] = useState<BloqueDisponible[] | null>(null);
  const [bloqueElegido, setBloqueElegido] = useState<string | null>(null);
  const [motivoReagendar, setMotivoReagendar] = useState('');
  const [reagendando, setReagendando] = useState(false);

  const recienEvaluada = Boolean((ubicacion.state as { evaluada?: boolean } | null)?.evaluada);

  if (rsrc.error) return <EstadoError titulo="No encontramos este servicio" mensaje={rsrc.error} reintentar={rsrc.recargar} />;
  if (rsrc.cargando || !rsrc.datos) return <Esqueleto className="h-96 w-full rounded-2xl" />;

  const r = rsrc.datos;
  const puedeCancelar = ESTADOS_CANCELABLES.includes(r.estado);
  const puedeReagendar = r.estado === 'CONFIRMADA';

  const confirmar = async () => {
    setConfirmando(true);
    setError(null);
    try {
      rsrc.establecer(await confirmarConformidad(r.id));
      setDialogoConformidad(false);
    } catch (e) {
      setError(mensajeParaUsuario(e));
      setDialogoConformidad(false);
    } finally {
      setConfirmando(false);
    }
  };

  const abrirCancelar = async () => {
    setError(null);
    try {
      setSimulacion(await simularCancelacion(r.id));
      setDialogoCancelar(true);
    } catch (e) {
      setError(mensajeParaUsuario(e));
    }
  };

  const cancelar = async () => {
    setCancelando(true);
    setError(null);
    try {
      rsrc.establecer(await cancelarReserva(r.id, motivoCancelar));
      setDialogoCancelar(false);
      setExito('La contratación quedó cancelada y el horario volvió a quedar disponible.');
    } catch (e) {
      setError(mensajeParaUsuario(e));
      setDialogoCancelar(false);
    } finally {
      setCancelando(false);
    }
  };

  const abrirReagendar = async () => {
    setError(null);
    setBloqueElegido(null);
    setBloques(null);
    setDialogoReagendar(true);
    try {
      const desde = new Date();
      const hasta = new Date(desde.getTime() + 30 * 24 * 3600 * 1000);
      // Se buscan horarios con la misma duración contratada (fin − inicio de la reserva).
      const minutos = Math.round((new Date(r.fin.replace(' ', 'T')).getTime() - new Date(r.inicio.replace(' ', 'T')).getTime()) / 60000);
      setBloques(await listarBloquesDisponibles(r.profesionalId, { desde: desde.toISOString(), hasta: hasta.toISOString(), minutos }));
    } catch (e) {
      setDialogoReagendar(false);
      setError(mensajeParaUsuario(e));
    }
  };

  const reagendar = async () => {
    if (!bloqueElegido) return;
    setReagendando(true);
    setError(null);
    try {
      rsrc.establecer(await solicitarReagendamiento(r.id, bloqueElegido, motivoReagendar));
      setDialogoReagendar(false);
      setExito('Enviamos tu propuesta de nueva fecha al profesional.');
    } catch (e) {
      setError(mensajeParaUsuario(e));
      setDialogoReagendar(false);
    } finally {
      setReagendando(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <p className="font-mono text-xs text-tinta-tenue">{r.codigo}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Seguimiento de contratación</h1>
          <Insignia tono={r.estado === 'CANCELADA' || r.estado === 'RECHAZADA' ? 'peligro' : 'info'}>{ETIQUETA_ESTADO[r.estado]}</Insignia>
        </div>
        <p className="mt-1 text-sm text-tinta-suave">{DESCRIPCION_ESTADO[r.estado]}</p>
      </header>

      {recienEvaluada && <Alerta tono="exito" titulo="¡Gracias por evaluar!">Tu evaluación quedó registrada y el servicio se cerró.</Alerta>}
      {exito && <Alerta tono="exito">{exito}</Alerta>}
      {error && <Alerta tono="peligro">{error}</Alerta>}

      <Tarjeta className="flex flex-col gap-5">
        <dl className="grid gap-4 border-b border-borde pb-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-tinta-tenue">Horario</dt>
            <dd className="mt-1 font-medium">{formatearRangoBloque(r.inicio, r.fin)}</dd>
            {puedeReagendar && (
              <dd className="mt-2">
                <Boton variante="secundario" tamano="sm" icono={<CalendarClock className="h-4 w-4" />} onClick={() => void abrirReagendar()}>
                  Cambiar fecha
                </Boton>
              </dd>
            )}
          </div>
          <div>
            <dt className="text-tinta-tenue">Total</dt>
            <dd className="mt-1 font-medium">{formatearCLP(r.total)}</dd>
          </div>
          <div>
            <dt className="text-tinta-tenue">Administrador asignado</dt>
            <dd className="mt-1">{r.administradorAsignadoNombre ?? 'Aún no asignado'}</dd>
          </div>
          <div>
            <dt className="text-tinta-tenue">Pago</dt>
            <dd className="mt-1">{ETIQUETA_PAGO[r.estadoPago]}</dd>
          </div>
        </dl>

        {r.estado === 'PENDIENTE_PAGO' && <BotonEnlace to={`/reservas/${r.id}/pago`} bloque>Completar pago (simulado)</BotonEnlace>}

        {r.estado === 'REAGENDADA' && r.reagendamientoPropuesto && (
          <Alerta tono="aviso" titulo="Cambio de fecha pendiente">
            Propusiste {formatearRangoBloque(r.reagendamientoPropuesto.inicio, r.reagendamientoPropuesto.fin)}. Si el profesional
            no puede, se mantiene el horario original.
          </Alerta>
        )}

        {ESTADOS_CHAT.includes(r.estado) && (
          <div className="rounded-xl border border-exito-600/20 bg-exito-50 px-4 py-3 text-sm">
            <p className="font-semibold">Chat de coordinación</p>
            <p className="mt-1 text-tinta-suave">Coordina directamente con el profesional; la conversación queda registrada.</p>
            <BotonEnlace to={`/mis-servicios/${r.id}/chat`} tamano="sm" className="mt-3">Abrir chat</BotonEnlace>
          </div>
        )}

        {r.estado === 'ENTREGADA' && !r.conformidadConfirmada && (
          <div className="rounded-xl border border-primario-200 bg-primario-50 px-4 py-3 text-sm">
            <p className="font-semibold">El profesional marcó el trabajo como entregado</p>
            <p className="mt-1 text-tinta-suave">Revisa lo que recibiste. Si está conforme, confírmalo para cerrar el servicio y poder evaluarlo.</p>
            <Boton tamano="sm" className="mt-3" onClick={() => setDialogoConformidad(true)}>Confirmar conformidad</Boton>
          </div>
        )}

        {r.estado === 'ENTREGADA' && r.conformidadConfirmada && (
          <div className="rounded-xl border border-exito-600/20 bg-exito-50 px-4 py-3 text-sm">
            <p className="font-semibold">Falta tu evaluación</p>
            <p className="mt-1 text-tinta-suave">Cuéntanos cómo te fue en calidad, plazos y comunicación. Ayuda a otras organizaciones a elegir.</p>
            <BotonEnlace to={`/mis-servicios/${r.id}/evaluar`} tamano="sm" className="mt-3">Evaluar al profesional</BotonEnlace>
          </div>
        )}

        {r.estado === 'EVALUADA' && (
          <BotonEnlace to={`/mis-servicios/${r.id}/evaluar`} variante="secundario" tamano="sm" className="self-start">
            Ver mi evaluación
          </BotonEnlace>
        )}

        {puedeCancelar && (
          <div className="flex flex-col gap-2 border-t border-borde pt-4 sm:flex-row">
            <Boton variante="peligro" tamano="sm" icono={<XCircle className="h-4 w-4" />} onClick={() => void abrirCancelar()}>
              Cancelar contratación
            </Boton>
          </div>
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
                {h.detalle && <p className="mt-0.5 text-tinta-tenue">{h.detalle}</p>}
              </li>
            ))}
          </ol>
        </div>
        <Link to="/mis-servicios" className="text-sm font-medium text-primario-700 underline">Volver a mis servicios</Link>
      </Tarjeta>

      <Dialogo
        abierto={dialogoConformidad}
        titulo="¿Confirmas que recibiste el trabajo conforme?"
        onCerrar={() => setDialogoConformidad(false)}
        textoConfirmar="Sí, estoy conforme"
        textoCancelar="Todavía no"
        onConfirmar={() => void confirmar()}
        confirmando={confirmando}
      >
        Al confirmar, el servicio queda listo para cerrarse y podrás evaluar al profesional. Si algo no está bien,
        escríbele primero por el chat o contacta a Skilly.
      </Dialogo>

      <Dialogo
        abierto={dialogoCancelar}
        titulo="¿Cancelar esta contratación?"
        onCerrar={() => setDialogoCancelar(false)}
        textoConfirmar="Sí, cancelar"
        textoCancelar="No, mantener"
        varianteConfirmar="peligro"
        onConfirmar={() => void cancelar()}
        confirmando={cancelando}
      >
        {simulacion && (
          <div className="flex flex-col gap-3 text-sm">
            {simulacion.pagado === false ? (
              <p>
                Todavía no has pagado esta contratación, así que cancelarla no tiene costo: no hay nada que retener ni
                devolver.
              </p>
            ) : (
              <>
                <p>
                  Faltan {Math.floor(simulacion.horasAntelacion)} horas para el inicio ({simulacion.tramo.etiqueta.toLowerCase()}).
                  {simulacion.retencionPorcentaje === 0
                    ? ' La cancelación no tiene costo.'
                    : ` Según la política se retiene el ${simulacion.retencionPorcentaje} %.`}
                </p>
                <dl className="grid grid-cols-2 gap-2 rounded-xl bg-crema px-3 py-2">
                  <dt className="text-tinta-tenue">Se retiene</dt>
                  <dd className="text-right font-medium">{formatearCLP(simulacion.montoRetenido)}</dd>
                  <dt className="text-tinta-tenue">Se devuelve</dt>
                  <dd className="text-right font-medium">{formatearCLP(simulacion.montoDevuelto)}</dd>
                </dl>
              </>
            )}
            <p className="text-xs text-tinta-tenue">Montos de referencia: el pago de esta plataforma es simulado.</p>
            <CampoTextarea etiqueta="Motivo" nota="Opcional" value={motivoCancelar} onChange={(e) => setMotivoCancelar(e.target.value)} rows={2} />
          </div>
        )}
      </Dialogo>

      <Dialogo
        abierto={dialogoReagendar}
        titulo="Proponer una nueva fecha"
        onCerrar={() => setDialogoReagendar(false)}
        textoConfirmar="Enviar propuesta"
        onConfirmar={() => void reagendar()}
        confirmando={reagendando}
        confirmarDeshabilitado={!bloqueElegido}
      >
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-tinta-suave">Elige un horario libre del profesional en los próximos 30 días. Mientras responde, se mantiene la fecha actual.</p>
          {bloques === null ? (
            <Esqueleto className="h-32 w-full rounded-xl" />
          ) : bloques.length === 0 ? (
            <Alerta tono="aviso">El profesional no tiene otros horarios libres en los próximos 30 días. Escríbele por el chat.</Alerta>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-xl border border-borde p-2">
            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="sr-only">Horarios disponibles</legend>
              {bloques.slice(0, 40).map((b) => (
                <label
                  key={b.id}
                  className={cn(
                    'flex min-h-[44px] cursor-pointer items-center rounded-xl border px-3 py-2 text-xs font-medium focus-within:ring-2 focus-within:ring-primario-500',
                    bloqueElegido === b.id ? 'border-primario-600 bg-primario-50 text-primario-800' : 'border-borde-fuerte hover:border-primario-300',
                  )}
                >
                  <input type="radio" name="bloque" value={b.id} className="sr-only" checked={bloqueElegido === b.id} onChange={() => setBloqueElegido(b.id)} />
                  {formatearRangoBloque(b.inicio, b.fin)}
                </label>
              ))}
            </fieldset>
            </div>
          )}
          <CampoTextarea etiqueta="Motivo" nota="Opcional" value={motivoReagendar} onChange={(e) => setMotivoReagendar(e.target.value)} rows={2} />
        </div>
      </Dialogo>
    </div>
  );
}

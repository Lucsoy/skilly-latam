import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { addDays } from 'date-fns';
import type { BloqueDisponible, Modalidad } from '@/types';
import { obtenerServicio } from '@/services/catalogo';
import { obtenerConfiguracion } from '@/services/configuracion';
import { liberarRetencion, listarBloquesDisponibles, retenerBloque } from '@/services/disponibilidad';
import { mensajeParaUsuario } from '@/services/errores';
import { useRecurso } from '@/lib/useRecurso';
import { calcularDesglose } from '@/lib/precios';
import { claveDiaSantiago } from '@/lib/tiempo';
import { ETIQUETA_MODALIDAD, capitalizar, formatearFechaLarga, formatearHora, plural } from '@/lib/formato';
import { cn } from '@/lib/cn';
import { Alerta, Boton, BotonEnlace, CampoTextarea, Cargando, Esqueleto, EstadoError, EstadoVacio, Tarjeta } from '@/components/ui';
import { Calendario } from './Calendario';
import { CuentaRegresiva } from './CuentaRegresiva';
import { ResumenReserva } from './ResumenReserva';
import { PasosAgendamiento } from './PasosAgendamiento';
import { retencionVigente, useReservaEnCurso } from './reservaStore';

const HORIZONTE_DIAS = 60;
const MAX_MENSAJE = 300;

export function PaginaAgendar() {
  const { servicioId = '' } = useParams();
  const navegar = useNavigate();

  const detalle = useRecurso(() => obtenerServicio(servicioId), [servicioId]);
  const config = useRecurso(() => obtenerConfiguracion(), []);
  const profesionalId = detalle.datos?.profesional.id ?? null;

  const bloques = useRecurso(
    () =>
      profesionalId
        ? listarBloquesDisponibles(profesionalId, {
            desde: new Date().toISOString(),
            hasta: addDays(new Date(), HORIZONTE_DIAS).toISOString(),
            // Solo horas con tiempo libre para la duración completa de este servicio.
            servicioId,
          })
        : Promise.resolve<BloqueDisponible[]>([]),
    [profesionalId],
  );

  const reserva = useReservaEnCurso();
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [reteniendo, setReteniendo] = useState<string | null>(null);
  const [errorRetencion, setErrorRetencion] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Al entrar: si había una reserva a medias de OTRO servicio, se libera.
  // Si es de este servicio pero venció mientras la persona no estaba, se avisa.
  useEffect(() => {
    if (reserva.servicioId && reserva.servicioId !== servicioId) {
      if (reserva.retencion) void liberarRetencion(reserva.retencion.id);
      reserva.limpiar();
      return;
    }
    if (reserva.servicioId === servicioId && reserva.retencion && !retencionVigente(reserva.retencion)) {
      reserva.marcarExpirada();
    }
    // Solo al montar o cambiar de servicio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicioId]);

  // Agrupa los bloques por día de Santiago.
  const bloquesPorDia = useMemo(() => {
    const mapa = new Map<string, BloqueDisponible[]>();
    for (const b of bloques.datos ?? []) {
      const k = claveDiaSantiago(b.inicio);
      const lista = mapa.get(k) ?? [];
      lista.push(b);
      mapa.set(k, lista);
    }
    return mapa;
  }, [bloques.datos]);
  const diasConBloques = useMemo(() => new Set(bloquesPorDia.keys()), [bloquesPorDia]);

  // Día inicial: el del bloque ya elegido o el primero disponible.
  useEffect(() => {
    if (diaSeleccionado || bloquesPorDia.size === 0) return;
    const delBloque = reserva.bloque && reserva.servicioId === servicioId ? claveDiaSantiago(reserva.bloque.inicio) : null;
    const primero = [...bloquesPorDia.keys()].sort()[0] ?? null;
    setDiaSeleccionado(delBloque && bloquesPorDia.has(delBloque) ? delBloque : primero);
  }, [bloquesPorDia, diaSeleccionado, reserva.bloque, reserva.servicioId, servicioId]);

  const seleccionarBloque = useCallback(
    async (bloque: BloqueDisponible) => {
      if (!detalle.datos) return;
      setErrorRetencion(null);
      setReteniendo(bloque.id);
      try {
        const retencion = await retenerBloque(bloque.id, servicioId);
        const modalidadInicial = detalle.datos.servicio.modalidades[0] as Modalidad;
        reserva.seleccionar(servicioId, bloque, retencion, modalidadInicial);
        // En pantallas angostas el resumen queda abajo: se lleva a la vista.
        if (window.innerWidth < 1024) {
          panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch (e) {
        setErrorRetencion(mensajeParaUsuario(e));
        bloques.recargar();
      } finally {
        setReteniendo(null);
      }
    },
    [detalle.datos, servicioId, reserva, bloques],
  );

  const alExpirar = useCallback(() => {
    reserva.marcarExpirada();
    bloques.recargar();
  }, [reserva, bloques]);

  if (detalle.error) {
    return (
      <div className="mx-auto max-w-2xl">
        <EstadoError titulo="No encontramos este servicio" mensaje={detalle.error} reintentar={detalle.recargar} />
      </div>
    );
  }
  if (detalle.cargando || !detalle.datos) return <EsqueletoAgendar />;

  const { servicio, profesional } = detalle.datos;
  const desglose = config.datos ? calcularDesglose(servicio.precio, config.datos.comisionPorcentaje) : null;
  const seleccionActiva = reserva.servicioId === servicioId && retencionVigente(reserva.retencion);
  const bloqueElegido = seleccionActiva ? reserva.bloque : null;
  const bloquesDelDia = diaSeleccionado ? (bloquesPorDia.get(diaSeleccionado) ?? []) : [];
  const puedeContinuar = seleccionActiva && Boolean(reserva.modalidad);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <PasosAgendamiento actual={1} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Elige un horario</h1>
          <p className="mt-1 text-sm text-tinta-suave">
            {servicio.titulo} con{' '}
            <Link to={`/profesionales/${profesional.id}`} className="font-medium text-tinta hover:underline">
              {profesional.nombre} {profesional.apellido}
            </Link>
            . Solo mostramos las horas que están libres.
          </p>
        </div>
      </header>

      {reserva.expirada && (
        <Alerta
          tono="aviso"
          titulo="Se acabó el tiempo para completar la reserva"
          accion={
            <Boton variante="secundario" tamano="sm" onClick={reserva.descartarAvisoExpiracion}>
              Entendido
            </Boton>
          }
        >
          El horario que habías elegido volvió a quedar libre. Si sigue disponible, puedes elegirlo de nuevo y
          tendrás otros {config.datos?.retencionBloqueMinutos ?? 10} minutos.
        </Alerta>
      )}
      {errorRetencion && <Alerta tono="peligro">{errorRetencion}</Alerta>}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          {bloques.error ? (
            <EstadoError mensaje={bloques.error} reintentar={bloques.recargar} />
          ) : bloques.cargando || !bloques.datos ? (
            <EsqueletoCalendario />
          ) : bloques.datos.length === 0 ? (
            <EstadoVacio
              titulo={`${profesional.nombre} no tiene horas publicadas en los próximos dos meses`}
              descripcion="Guarda el servicio en favoritos para volver más adelante, o escríbenos a hola@skilly.cl y buscamos una alternativa contigo."
              accion={
                <BotonEnlace to={`/servicios/${servicio.id}`} variante="secundario">
                  Volver al servicio
                </BotonEnlace>
              }
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
              <Tarjeta relleno="sm">
                <Calendario
                  diasConBloques={diasConBloques}
                  diaSeleccionado={diaSeleccionado}
                  onSeleccionarDia={setDiaSeleccionado}
                />
              </Tarjeta>

              <section aria-labelledby="horas" aria-busy={reteniendo !== null}>
                <h2 id="horas" className="text-sm font-semibold">
                  {diaSeleccionado && bloquesDelDia[0]
                    ? capitalizar(formatearFechaLarga(bloquesDelDia[0].inicio))
                    : 'Elige un día en el calendario'}
                </h2>
                {diaSeleccionado && (
                  <p className="mt-0.5 text-xs text-tinta-tenue">
                    {plural(bloquesDelDia.length, 'hora disponible', 'horas disponibles')} · sesiones de{' '}
                    {servicio.duracionSesionMinutos} minutos
                  </p>
                )}
                <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {bloquesDelDia.map((b) => {
                    const elegido = bloqueElegido?.id === b.id;
                    const cargandoEste = reteniendo === b.id;
                    return (
                      <li key={b.id}>
                        <button
                          type="button"
                          aria-pressed={elegido}
                          disabled={reteniendo !== null}
                          onClick={() => void seleccionarBloque(b)}
                          className={cn(
                            'flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium tabular-nums transition-colors',
                            elegido
                              ? 'border-primario-700 bg-primario-700 text-white'
                              : 'border-borde-fuerte bg-superficie text-tinta hover:border-primario-400 hover:bg-primario-50',
                            reteniendo !== null && !cargandoEste && 'opacity-60',
                          )}
                        >
                          {cargandoEste ? <Cargando tamano="sm" etiqueta="Reservando horario" /> : null}
                          {formatearHora(b.inicio)}–{formatearHora(b.fin)}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          )}
        </div>

        {/* Resumen y datos de la reserva. */}
        <aside ref={panelRef} className="scroll-mt-20 lg:sticky lg:top-24 lg:self-start">
          <Tarjeta className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold">Tu reserva</h2>
              {seleccionActiva && reserva.retencion && (
                <CuentaRegresiva expiraEn={reserva.retencion.expiraEn} onExpirar={alExpirar} />
              )}
            </div>

            <ResumenReserva
              servicio={servicio}
              profesional={profesional}
              bloque={bloqueElegido}
              modalidad={seleccionActiva ? reserva.modalidad : null}
              desglose={desglose}
            />

            {seleccionActiva && (
              <div className="flex flex-col gap-4 border-t border-borde pt-4">
                {servicio.modalidades.length > 1 ? (
                  <fieldset>
                    <legend className="mb-2 text-sm font-medium">¿Cómo prefieres trabajar?</legend>
                    <div className="flex flex-wrap gap-2">
                      {servicio.modalidades.map((m) => (
                        <label
                          key={m}
                          className={cn(
                            'cursor-pointer rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors',
                            reserva.modalidad === m
                              ? 'border-primario-600 bg-primario-50 text-primario-800'
                              : 'border-borde-fuerte bg-superficie text-tinta hover:border-primario-300',
                          )}
                        >
                          <input
                            type="radio"
                            name="modalidad"
                            value={m}
                            checked={reserva.modalidad === m}
                            onChange={() => reserva.establecerModalidad(m)}
                            className="sr-only"
                          />
                          {ETIQUETA_MODALIDAD[m]}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ) : (
                  <p className="text-sm text-tinta-suave">
                    Este servicio se realiza en modalidad{' '}
                    <span className="font-medium text-tinta">{ETIQUETA_MODALIDAD[servicio.modalidades[0] as Modalidad].toLowerCase()}</span>.
                  </p>
                )}

                <CampoTextarea
                  etiqueta={`Cuéntale a ${profesional.nombre} qué necesitas`}
                  nota="Opcional"
                  placeholder="Ej: Somos 32 personas, entran 6 en octubre y hoy no tenemos proceso de inducción."
                  value={reserva.mensaje}
                  onChange={(e) => reserva.establecerMensaje(e.target.value.slice(0, MAX_MENSAJE))}
                  maximo={MAX_MENSAJE}
                  valorActual={reserva.mensaje}
                  rows={3}
                />
              </div>
            )}

            <Boton
              tamano="lg"
              bloque
              disabled={!puedeContinuar}
              onClick={() => navegar(`/agendar/${servicioId}/condiciones`)}
            >
              Continuar a las condiciones
            </Boton>
            {!seleccionActiva && (
              <p className="-mt-2 text-center text-xs text-tinta-tenue">
                Al elegir un horario lo reservamos para ti por {config.datos?.retencionBloqueMinutos ?? 10} minutos.
              </p>
            )}
          </Tarjeta>
        </aside>
      </div>
    </div>
  );
}

function EsqueletoCalendario() {
  return (
    <div aria-busy="true" className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
      <Tarjeta relleno="sm" className="flex flex-col gap-3">
        <Esqueleto className="h-6 w-1/2 self-center" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Esqueleto key={i} className="h-10 w-10 rounded-full" />
          ))}
        </div>
      </Tarjeta>
      <div className="flex flex-col gap-3">
        <Esqueleto className="h-5 w-1/2" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Esqueleto key={i} className="h-11 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function EsqueletoAgendar() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <Esqueleto className="h-4 w-2/3 max-w-md" />
      <Esqueleto className="h-8 w-1/3" />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <EsqueletoCalendario />
        <Tarjeta className="flex flex-col gap-3">
          <Esqueleto className="h-5 w-1/3" />
          <Esqueleto className="h-4 w-full" />
          <Esqueleto className="h-4 w-full" />
          <Esqueleto className="h-4 w-3/4" />
          <Esqueleto className="h-12 w-full" />
        </Tarjeta>
      </div>
    </div>
  );
}

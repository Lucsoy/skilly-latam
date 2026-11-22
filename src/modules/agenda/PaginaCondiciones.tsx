import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { obtenerConfiguracion } from '@/services/configuracion';
import { crearReserva } from '@/services/reservas';
import { mensajeParaUsuario } from '@/services/errores';
import { useReservaEnCurso, retencionVigente } from './reservaStore';
import { useRecurso } from '@/lib/useRecurso';
import { useParams } from 'react-router-dom';
import { obtenerServicio } from '@/services/catalogo';
import { formatearCLP, ETIQUETA_MODALIDAD, formatearRangoBloque } from '@/lib/formato';
import { Alerta, Boton, Esqueleto, EstadoError, Tarjeta } from '@/components/ui';
import { PasosAgendamiento } from './PasosAgendamiento';
import { calcularDesglose } from '@/lib/precios';

export function PaginaCondiciones() {
  const { servicioId = '' } = useParams();
  const navegar = useNavigate();
  const reserva = useReservaEnCurso();
  const detalle = useRecurso(() => obtenerServicio(servicioId), [servicioId]);
  const config = useRecurso(() => obtenerConfiguracion(), []);
  const [acepta, setAcepta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (detalle.error) return <EstadoError titulo="No encontramos el servicio" mensaje={detalle.error} reintentar={detalle.recargar} />;
  if (config.error) return <EstadoError titulo="No pudimos cargar las condiciones" mensaje={config.error} reintentar={config.recargar} />;
  if (detalle.cargando || !detalle.datos || config.cargando || !config.datos) return <Esqueleto className="h-96 w-full rounded-2xl" />;

  const { servicio, profesional } = detalle.datos;
  const bloque = reserva.servicioId === servicioId && retencionVigente(reserva.retencion) ? reserva.bloque : null;
  const desglose = calcularDesglose(servicio.precio, config.datos.comisionPorcentaje);

  const condiciones = { precio: servicio.precio, porcentaje: config.datos.comisionPorcentaje, version: config.datos.versionCondiciones };

  const enviarSolicitud = async () => {
    if (!bloque || !reserva.retencion || !reserva.modalidad || !acepta) return;
    setEnviando(true);
    setError(null);
    try {
      const creada = await crearReserva({
        retencionId: reserva.retencion.id,
        bloqueId: bloque.id,
        servicioId,
        modalidad: reserva.modalidad,
        mensaje: reserva.mensaje,
        aceptaCondiciones: true,
        condiciones,
      });
      reserva.limpiar();
      navegar(`/reservas/${creada.id}/confirmacion`, { replace: true });
    } catch (e) {
      setAcepta(false);
      setError(mensajeParaUsuario(e));
      detalle.recargar();
      config.recargar();
    } finally {
      setEnviando(false);
    }
  };

  if (!bloque || !reserva.modalidad) {
    return (
      <div className="mx-auto max-w-2xl">
        <Alerta tono="aviso" titulo="Tu horario ya no está reservado">Vuelve al calendario para elegir un horario disponible.</Alerta>
        <Boton className="mt-4" onClick={() => navegar(`/agendar/${servicioId}`)}>Volver al calendario</Boton>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PasosAgendamiento actual={2} />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Revisa las condiciones</h1>
        <p className="mt-1 text-sm text-tinta-suave">Antes de enviar la solicitud, revisa los datos del servicio y confirma las condiciones.</p>
      </header>
      {error && <Alerta tono="peligro">{error}</Alerta>}
      <Tarjeta className="flex flex-col gap-5">
        <div>
          <p className="text-xs text-tinta-tenue">Servicio solicitado</p>
          <h2 className="mt-1 text-lg font-semibold">{servicio.titulo}</h2>
          <p className="mt-1 text-sm text-tinta-suave">Profesional: {profesional.nombre} {profesional.apellido}</p>
        </div>
        <dl className="grid gap-3 border-y border-borde py-4 text-sm sm:grid-cols-2">
          <div><dt className="text-tinta-tenue">Fecha y hora</dt><dd className="mt-0.5 font-medium">{formatearRangoBloque(bloque.inicio, bloque.fin)}</dd></div>
          <div><dt className="text-tinta-tenue">Modalidad</dt><dd className="mt-0.5 font-medium">{ETIQUETA_MODALIDAD[reserva.modalidad]}</dd></div>
          <div><dt className="text-tinta-tenue">Precio del servicio</dt><dd className="mt-0.5">{formatearCLP(desglose.precio)}</dd></div>
          <div><dt className="text-tinta-tenue">Comisión de plataforma</dt><dd className="mt-0.5">{formatearCLP(desglose.comision)}</dd></div>
          <div className="sm:col-span-2"><dt className="text-tinta-tenue">Total estimado</dt><dd className="mt-0.5 text-lg font-semibold">{formatearCLP(desglose.total)}</dd></div>
        </dl>
        <div className="rounded-xl bg-crema px-4 py-3 text-sm text-tinta-suave">
          <p className="font-medium text-tinta">¿Qué ocurre después?</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Enviaremos tu solicitud al equipo de administración de Skilly.</li>
            <li>Un administrador podrá revisarla, asignarla o derivarla a otro administrador.</li>
            <li>Si es aprobada, se enviará al profesional para que acepte o rechace el trabajo.</li>
            <li>Solo después de que el profesional acepte podrás completar el pago y confirmar la contratación.</li>
          </ol>
        </div>
        <label className="flex cursor-pointer gap-3 rounded-xl border border-borde-fuerte p-4 text-sm">
          <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primario-600" />
          <span>Acepto las condiciones de contratación (versión {condiciones.version}) y autorizo a Skilly a gestionar esta solicitud con el profesional.</span>
        </label>
        <Boton tamano="lg" bloque cargando={enviando} disabled={!acepta} onClick={() => void enviarSolicitud()}>
          Enviar solicitud a Skilly
        </Boton>
      </Tarjeta>
    </div>
  );
}

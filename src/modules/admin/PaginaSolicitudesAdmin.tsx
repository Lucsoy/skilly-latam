import { useState } from 'react';
import { useSesion } from '@/modules/auth/sesionStore';
import { useRecurso } from '@/lib/useRecurso';
import { Alerta, Boton, CampoSelect, CampoTextarea, Esqueleto, EstadoError, EstadoVacio, Insignia, Tarjeta } from '@/components/ui';
import { asignarAdministrador, aprobarSolicitudAdmin, listarSolicitudesAdmin, rechazarSolicitudAdmin, listarAdministradoresParaAsignar } from '@/services/solicitudes';
import { formatearCLP, formatearRangoBloque } from '@/lib/formato';
import { mensajeParaUsuario } from '@/services/errores';
import { ETIQUETA_ESTADO } from '@/modules/agenda/estadoReserva';

export function PaginaSolicitudesAdmin() {
  const solicitudes = useRecurso(() => listarSolicitudesAdmin(), []);
  const administradores = useRecurso(listarAdministradoresParaAsignar, []);
  const usuario = useSesion((s) => s.usuario);
  const esFundador = usuario?.rol === 'fundador';
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ejecutar = async (fn: () => Promise<unknown>, id: string) => {
    setOcupada(id); setError(null);
    try { await fn(); solicitudes.recargar(); } catch (e) { setError(mensajeParaUsuario(e)); }
    finally { setOcupada(null); }
  };

  if (solicitudes.error) return <EstadoError mensaje={solicitudes.error} reintentar={solicitudes.recargar} />;
  const lista = solicitudes.datos ?? [];
  return (
    <div className="flex flex-col gap-6">
      <header><h1 className="text-2xl font-semibold tracking-tight">Solicitudes de contratación</h1><p className="mt-1.5 text-sm text-tinta-suave">Las solicitudes llegan primero a Skilly. Puedes asignarlas a un administrador; solo quien quede responsable puede aceptarlas y enviarlas al profesional.</p></header>
      {error && <Alerta tono="peligro">{error}</Alerta>}
      {administradores.error && <Alerta tono="peligro">No se pudieron cargar los administradores: {administradores.error}</Alerta>}
      {solicitudes.cargando ? <div className="flex flex-col gap-2">{Array.from({length:4}).map((_,i)=><Esqueleto key={i} className="h-48 w-full rounded-2xl" />)}</div> : lista.length === 0 ? <EstadoVacio titulo="No hay solicitudes pendientes" descripcion="Cuando una empresa envíe una contratación aparecerá aquí." /> : (
        <ul className="flex flex-col gap-4">
          {lista.map(({ reserva, organizacion, profesional, servicio }) => (
            <li key={reserva.id}><Tarjeta className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs text-tinta-tenue">{reserva.codigo}</p><h2 className="mt-1 font-semibold">{servicio}</h2><p className="mt-1 text-sm text-tinta-suave">{organizacion} · {profesional}</p></div><Insignia tono={reserva.estado === 'SOLICITADA' ? 'aviso' : 'info'}>{ETIQUETA_ESTADO[reserva.estado]}</Insignia></div>
              <div className="grid gap-3 text-sm sm:grid-cols-3"><p><span className="block text-xs text-tinta-tenue">Horario</span>{formatearRangoBloque(reserva.inicio, reserva.fin)}</p><p><span className="block text-xs text-tinta-tenue">Total</span>{formatearCLP(reserva.total)}</p><p><span className="block text-xs text-tinta-tenue">Administrador</span>{reserva.administradorAsignadoNombre ?? 'Sin asignar'}</p></div>
              {reserva.mensaje && <p className="rounded-xl bg-crema px-3 py-2 text-sm text-tinta-suave">“{reserva.mensaje}”</p>}
              {reserva.estado === 'SOLICITADA' && <>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><CampoSelect etiqueta="Responsable" value={reserva.administradorAsignadoId ?? ''} onChange={(e)=>void ejecutar(()=>asignarAdministrador(reserva.id,e.target.value),reserva.id)} opciones={[{valor:'',etiqueta:'Asignar responsable'},...(administradores.datos ?? []).map(a=>({valor:a.id,etiqueta:a.nombre}))]} /><div className="flex flex-wrap gap-2">{(esFundador || reserva.administradorAsignadoId === usuario?.id) && <><Boton variante="secundario" cargando={ocupada===reserva.id} onClick={()=>void ejecutar(()=>aprobarSolicitudAdmin(reserva.id),reserva.id)}>Aceptar y enviar al profesional</Boton><Boton variante="peligro" cargando={ocupada===reserva.id} onClick={()=>void ejecutar(()=>rechazarSolicitudAdmin(reserva.id,motivo),reserva.id)}>Rechazar</Boton></>}</div></div>
                <CampoTextarea etiqueta="Motivo de rechazo" nota="Opcional" value={motivo} onChange={(e)=>setMotivo(e.target.value)} rows={2} />
              </>}
              {reserva.estado === 'APROBADA_ADMIN' && <Alerta tono="info" titulo="Solicitud enviada al profesional">El profesional debe aceptar o rechazar el trabajo. Si lo acepta, la empresa verá el botón de pago.</Alerta>}
              {reserva.estado === 'PENDIENTE_PAGO' && <Alerta tono="exito" titulo="Profesional aceptó el trabajo">La empresa ya puede completar el pago para confirmar la contratación.</Alerta>}
            </Tarjeta></li>
          ))}
        </ul>
      )}
    </div>
  );
}

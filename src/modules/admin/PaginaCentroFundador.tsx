import { formatearFechaCorta } from '@/lib/formato';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { obtenerResumen, listarAdministradoresAdmin, listarOrganizacionesAdmin, listarProfesionalesAdmin, listarReservasAdmin, listarServiciosAdmin, eliminarOrganizacionFundador, eliminarProfesionalFundador, eliminarServicioFundador } from '@/services/admin';
import { useRecurso } from '@/lib/useRecurso';
import { mensajeParaUsuario } from '@/services/errores';
import { Alerta, Boton, Dialogo, Esqueleto, EstadoError, Insignia, Tarjeta } from '@/components/ui';
import { useSesion } from '@/modules/auth/sesionStore';

export function PaginaCentroFundador() {
  const resumen = useRecurso(() => obtenerResumen(), []);
  const organizaciones = useRecurso(() => listarOrganizacionesAdmin(), []);
  const profesionales = useRecurso(() => listarProfesionalesAdmin(), []);
  const reservas = useRecurso(() => listarReservasAdmin(), []);
  const servicios = useRecurso(() => listarServiciosAdmin(), []);
  const administradores = useRecurso(() => listarAdministradoresAdmin(), []);
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const usuario = useSesion((s) => s.usuario);

  const recargarTodo = () => {
    resumen.recargar();
    organizaciones.recargar();
    profesionales.recargar();
    reservas.recargar();
    servicios.recargar();
    administradores.recargar();
  };

  const [pendiente, setPendiente] = useState<{ id: string; accion: () => Promise<void>; exito: string } | null>(null);

  // Primero se pide confirmación con un diálogo propio de la app; la acción corre al confirmar.
  const ejecutar = (id: string, accion: () => Promise<void>, exito: string) => {
    setMensaje(null);
    setPendiente({ id, accion, exito });
  };

  const confirmarPendiente = async () => {
    if (!pendiente) return;
    const { id, accion, exito } = pendiente;
    setOcupada(id);
    try {
      await accion();
      setMensaje(exito);
      recargarTodo();
    } catch (e) {
      setMensaje(mensajeParaUsuario(e));
    } finally {
      setOcupada(null);
      setPendiente(null);
    }
  };

  if (resumen.error) return <EstadoError mensaje={resumen.error} reintentar={resumen.recargar} />;

  const totalServicios = resumen.datos?.servicios ?? 0;
  const totalReservas = reservas.datos?.length ?? 0;

  return (
    <div className="centro-fundador flex flex-col gap-6">
      <section className="fundador-hero rounded-[2rem] p-6 text-white shadow-xl sm:p-8">
        <div className="fundador-hero__halo" aria-hidden="true" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="fundador-corona">✦</span>
              <Insignia tono="primario">Cuenta fundadora</Insignia>
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/55">Acceso total</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Centro de mando</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
              {usuario?.nombre}. Desde aquí puedes supervisar y administrar la operación completa de Skilly.
              Las acciones sensibles quedan reservadas para cuentas fundadoras.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[460px]">
            <MiniDato etiqueta="Organizaciones" valor={resumen.datos?.organizaciones} />
            <MiniDato etiqueta="Profesionales" valor={resumen.datos?.profesionales} />
            <MiniDato etiqueta="Servicios" valor={totalServicios} />
            <MiniDato etiqueta="Reservas" valor={totalReservas} />
          </div>
        </div>
      </section>

      {mensaje && <Alerta tono={mensaje.includes('correctamente') ? 'exito' : 'peligro'}>{mensaje}</Alerta>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Acceso titulo="Configuración global" texto="Comisiones, cancelaciones, reputación y reglas de plataforma." href="/admin/configuracion" icono="⚙" />
        <Acceso titulo="Equipo administrativo" texto="Crear, revisar y retirar cuentas de administración y fundadoras." href="/admin/administradores" icono="♛" />
        <Acceso titulo="Operación" texto="Reservas, solicitudes, profesionales y organizaciones en una sola administración." href="/admin" icono="▦" />
        <Acceso titulo="Moderación" texto="Controlar comentarios y contenido que aparece públicamente." href="/admin/moderacion" icono="✓" />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Tarjeta className="fundador-card">
          <CabeceraGestion titulo="Organizaciones" descripcion="Administración directa de cuentas empresa." href="/admin/organizaciones" />
          <div className="mt-4 flex flex-col gap-2">
            {(organizaciones.datos ?? []).slice(0, 5).map((org) => (
              <div key={org.id} className="fundador-fila">
                <div className="min-w-0"><p className="truncate font-medium">{org.razonSocial}</p><p className="truncate text-xs text-tinta-suave">{org.rut} · {org.emailContacto}</p></div>
                <Boton tamano="sm" variante="peligro" disabled={ocupada === `org-${org.id}`} onClick={() => void ejecutar(`org-${org.id}`, () => eliminarOrganizacionFundador(org.id), 'Organización eliminada correctamente.')}>Borrar</Boton>
              </div>
            ))}
            {!organizaciones.datos && <Esqueleto className="h-14 w-full" />}
          </div>
        </Tarjeta>

        <Tarjeta className="fundador-card">
          <CabeceraGestion titulo="Profesionales" descripcion="Control de perfiles, publicaciones y cuentas relacionadas." href="/admin/profesionales" />
          <div className="mt-4 flex flex-col gap-2">
            {(profesionales.datos ?? []).slice(0, 5).map(({ profesional }) => (
              <div key={profesional.id} className="fundador-fila">
                <div className="min-w-0"><p className="truncate font-medium">{profesional.nombre} {profesional.apellido}</p><p className="truncate text-xs text-tinta-suave">{profesional.titulo || 'Sin título'}</p></div>
                <Boton tamano="sm" variante="peligro" disabled={ocupada === `prof-${profesional.id}`} onClick={() => void ejecutar(`prof-${profesional.id}`, () => eliminarProfesionalFundador(profesional.id), 'Profesional eliminado correctamente.')}>Borrar</Boton>
              </div>
            ))}
          </div>
        </Tarjeta>

        <Tarjeta className="fundador-card">
          <CabeceraGestion titulo="Servicios" descripcion="Publicaciones que forman parte de la vitrina de Skilly." href="/admin/profesionales" />
          <div className="mt-4 flex flex-col gap-2">
            {(servicios.datos ?? []).slice(0, 5).map((servicio) => (
              <div key={servicio.id} className="fundador-fila">
                <div className="min-w-0"><p className="truncate font-medium">{servicio.titulo}</p><p className="truncate text-xs text-tinta-suave">${servicio.precio.toLocaleString('es-CL')} · {servicio.publicado === false ? 'Pausado' : 'Publicado'}</p></div>
                <Boton tamano="sm" variante="peligro" disabled={ocupada === `srv-${servicio.id}`} onClick={() => void ejecutar(`srv-${servicio.id}`, () => eliminarServicioFundador(servicio.id), 'Servicio eliminado correctamente.')}>Borrar</Boton>
              </div>
            ))}
          </div>
        </Tarjeta>

        <Tarjeta className="fundador-card">
          <CabeceraGestion titulo="Reservas" descripcion="Las contrataciones no se borran: se cancelan o rechazan y quedan en el historial." href="/admin/reservas" />
          <div className="mt-4 flex flex-col gap-2">
            {(reservas.datos ?? []).slice(0, 5).map(({ reserva, servicio }) => (
              <div key={reserva.id} className="fundador-fila">
                <div className="min-w-0"><p className="truncate font-medium">{servicio}</p><p className="text-xs text-tinta-suave">{reserva.codigo} · {reserva.estado} · {formatearFechaCorta(reserva.inicio)}</p></div>
                <Link to="/admin/reservas" className="text-sm font-medium text-primario-700 underline-offset-2 hover:underline">Ver historial</Link>
              </div>
            ))}
          </div>
        </Tarjeta>

        <Tarjeta className="fundador-card">
          <CabeceraGestion titulo="Equipo fundador y administración" descripcion="Las cuentas con mayor nivel de acceso." href="/admin/administradores" />
          <div className="mt-4 flex flex-col gap-2">
            {(administradores.datos ?? []).map((admin) => (
              <div key={admin.id} className="fundador-fila">
                <div className="min-w-0"><p className="truncate font-medium">{admin.nombre}</p><p className="truncate text-xs text-tinta-suave">{admin.email}</p></div>
                <Insignia tono={admin.rol === 'fundador' ? 'primario' : 'neutro'}>{admin.rol === 'fundador' ? 'Fundadora' : 'Admin'}</Insignia>
              </div>
            ))}
          </div>
        </Tarjeta>
      </div>

      <Tarjeta className="border-peligro-600/30 bg-peligro-50/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold text-peligro-700">Zona de acciones críticas</h2><p className="mt-1 text-sm text-tinta-suave">Las cuentas fundadoras tienen control sobre datos sensibles. En esta demo las eliminaciones piden confirmación y quedan fuera del alcance del administrador operativo.</p></div>
          <Link to="/admin/configuracion" className="shrink-0 text-sm font-semibold text-peligro-700 underline">Revisar parámetros</Link>
        </div>
      </Tarjeta>
      <Dialogo
        abierto={pendiente !== null}
        titulo="¿Confirmas esta acción?"
        onCerrar={() => setPendiente(null)}
        textoConfirmar="Sí, eliminar"
        textoCancelar="Cancelar"
        varianteConfirmar="peligro"
        onConfirmar={() => void confirmarPendiente()}
        confirmando={ocupada !== null}
      >
        Esta acción es administrativa y puede eliminar datos relacionados. No se puede deshacer.
      </Dialogo>
    </div>
  );
}

function MiniDato({ etiqueta, valor }: { etiqueta: string; valor?: number }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur"><p className="text-[10px] uppercase tracking-wider text-white/45">{etiqueta}</p><p className="mt-1 text-xl font-semibold">{valor ?? '—'}</p></div>;
}

function Acceso({ titulo, texto, href, icono }: { titulo: string; texto: string; href: string; icono: string }) {
  return <Link to={href} className="fundador-acceso"><span className="fundador-acceso__icon">{icono}</span><span><strong>{titulo}</strong><small>{texto}</small></span><span aria-hidden="true">→</span></Link>;
}

function CabeceraGestion({ titulo, descripcion, href }: { titulo: string; descripcion: string; href: string }) {
  return <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{titulo}</h2><p className="mt-1 text-xs text-tinta-suave">{descripcion}</p></div><Link to={href} className="text-xs font-semibold text-primario-700 underline">Ver todo</Link></div>;
}

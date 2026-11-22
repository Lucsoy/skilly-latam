import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { hrefSeguro } from '@/lib/enlaces';
import { Building2, Check, Globe2, Mail, MapPin, Phone, ShieldCheck, Sparkles, UserRound, Save, ExternalLink } from 'lucide-react';
import { useRecurso } from '@/lib/useRecurso';
import { mensajeParaUsuario } from '@/services/errores';
import { actualizarMiOrganizacion, obtenerMiOrganizacion } from '@/services/organizacion';
import { useSesion } from '@/modules/auth/sesionStore';
import { Alerta, Boton, CampoSelect, CampoTexto, CampoTextarea, EstadoError, Esqueleto, Insignia, Tarjeta } from '@/components/ui';
import { ETIQUETA_TAMANO } from '@/lib/formato';
import type { TamanoOrganizacion } from '@/types';
import { CambiarContrasena } from '@/components/cuenta/CambiarContrasena';

const OPCIONES_TAMANO = (Object.keys(ETIQUETA_TAMANO) as TamanoOrganizacion[]).map((valor) => ({
  valor,
  etiqueta: ETIQUETA_TAMANO[valor] ?? valor,
}));

type Formulario = {
  razonSocial: string;
  giro: string;
  tamano: TamanoOrganizacion;
  nombreContacto: string;
  emailContacto: string;
  telefono: string;
  sitioWeb: string;
  direccion: string;
  descripcion: string;
};

function iniciales(nombre: string): string {
  const partes = nombre.split(/\s+/).filter(Boolean);
  return (partes.slice(0, 2).map((p) => p[0]).join('') || 'SK').toUpperCase();
}

function camposCompletos(form: Formulario): number {
  const campos = [form.razonSocial, form.giro, form.nombreContacto, form.emailContacto, form.telefono, form.sitioWeb, form.direccion, form.descripcion];
  return Math.round((campos.filter((x) => x.trim().length > 0).length / campos.length) * 100);
}

export function PaginaMiOrganizacion() {
  const recurso = useRecurso(obtenerMiOrganizacion, []);
  const actualizarSesion = useSesion((s) => s.actualizarOrganizacion);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState<Formulario | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tono: 'exito' | 'peligro'; texto: string } | null>(null);

  useEffect(() => {
    if (!recurso.datos) return;
    setForm({
      razonSocial: recurso.datos.razonSocial,
      giro: recurso.datos.giro,
      tamano: recurso.datos.tamano,
      nombreContacto: recurso.datos.nombreContacto,
      emailContacto: recurso.datos.emailContacto,
      telefono: recurso.datos.telefono ?? '',
      sitioWeb: recurso.datos.sitioWeb ?? '',
      direccion: recurso.datos.direccion ?? '',
      descripcion: recurso.datos.descripcion ?? '',
    });
  }, [recurso.datos]);

  const completitud = useMemo(() => (form ? camposCompletos(form) : 0), [form]);

  const moverPanel = (e: PointerEvent<HTMLDivElement>) => {
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--org-mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--org-my', `${e.clientY - rect.top}px`);
  };

  const guardar = async () => {
    if (!form) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const actualizada = await actualizarMiOrganizacion({
        razonSocial: form.razonSocial.trim(),
        giro: form.giro.trim(),
        tamano: form.tamano,
        nombreContacto: form.nombreContacto.trim(),
        emailContacto: form.emailContacto.trim().toLowerCase(),
        telefono: form.telefono.trim() || undefined,
        sitioWeb: form.sitioWeb.trim() || undefined,
        direccion: form.direccion.trim() || undefined,
        descripcion: form.descripcion.trim() || undefined,
      });
      recurso.establecer(actualizada);
      actualizarSesion(actualizada);
      setMensaje({ tono: 'exito', texto: 'Los datos de tu organización se guardaron correctamente.' });
    } catch (e) {
      setMensaje({ tono: 'peligro', texto: mensajeParaUsuario(e) });
    } finally {
      setGuardando(false);
    }
  };

  if (recurso.error) return <EstadoError mensaje={recurso.error} reintentar={recurso.recargar} />;
  if (recurso.cargando || !recurso.datos || !form) return <Esqueleto className="h-[760px] w-full rounded-3xl" />;

  const org = recurso.datos;

  return (
    <div ref={panelRef} onPointerMove={moverPanel} className="organizacion-panel-vivo flex flex-col gap-6">
      <section className="organizacion-hero revelar es-visible">
        <div className="organizacion-hero__brillo" />
        <div className="organizacion-hero__contenido">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="organizacion-avatar" aria-hidden="true">{iniciales(org.razonSocial)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Insignia tono="primario" icono={<Building2 className="h-3.5 w-3.5" />}>Cuenta empresa</Insignia>
                <Insignia tono="exito" icono={<ShieldCheck className="h-3.5 w-3.5" />}>Cuenta activa</Insignia>
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Mi organización</h1>
              <p className="mt-1 text-sm text-tinta-suave">Administra la información con la que Skilly identifica y coordina a tu empresa.</p>
              <p className="mt-3 text-lg font-semibold text-tinta">{org.razonSocial}</p>
              <p className="text-sm text-tinta-suave">RUT {org.rut} · {org.giro}</p>
            </div>
          </div>

          <div className="organizacion-completitud">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Perfil de empresa</p>
                <p className="text-xs text-tinta-suave">{completitud}% de información complementaria completada</p>
              </div>
              <span className="text-lg font-bold text-primario-700">{completitud}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-tinta/10">
              <div className="h-full rounded-full bg-gradient-to-r from-primario-500 via-amarillo-400 to-info-400 transition-all duration-700" style={{ width: `${completitud}%` }} />
            </div>
          </div>
        </div>
      </section>

      {mensaje && <Alerta tono={mensaje.tono}>{mensaje.texto}</Alerta>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Tarjeta className="organizacion-card-viva">
            <div className="mb-5 flex items-start gap-3">
              <div className="organizacion-icono bg-primario-50 text-primario-800"><Building2 className="h-5 w-5" /></div>
              <div>
                <h2 className="font-semibold">Identidad de la organización</h2>
                <p className="mt-1 text-sm text-tinta-suave">Los datos principales de tu empresa y su actividad.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <CampoTexto etiqueta="Razón social" value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} />
              <CampoTexto etiqueta="RUT" value={org.rut} disabled ayuda="El RUT identifica de forma única a la organización y no se modifica desde aquí." />
              <CampoTexto etiqueta="Giro o actividad" value={form.giro} onChange={(e) => setForm({ ...form, giro: e.target.value })} />
              <CampoSelect etiqueta="Tamaño de organización" opciones={OPCIONES_TAMANO} value={form.tamano} onChange={(e) => setForm({ ...form, tamano: e.target.value as TamanoOrganizacion })} />
            </div>
          </Tarjeta>

          <Tarjeta className="organizacion-card-viva">
            <div className="mb-5 flex items-start gap-3">
              <div className="organizacion-icono bg-info-50 text-info-600"><UserRound className="h-5 w-5" /></div>
              <div>
                <h2 className="font-semibold">Persona de contacto</h2>
                <p className="mt-1 text-sm text-tinta-suave">Usaremos estos datos para coordinaciones, avisos y comunicaciones importantes.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <CampoTexto etiqueta="Nombre de contacto" value={form.nombreContacto} onChange={(e) => setForm({ ...form, nombreContacto: e.target.value })} />
              <CampoTexto etiqueta="Correo de contacto" type="email" value={form.emailContacto} onChange={(e) => setForm({ ...form, emailContacto: e.target.value })} />
              <CampoTexto etiqueta="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+56 9 ..." />
              <CampoTexto etiqueta="Sitio web" value={form.sitioWeb} onChange={(e) => setForm({ ...form, sitioWeb: e.target.value })} placeholder="https://..." />
            </div>
            <div className="mt-4"><CampoTexto etiqueta="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Comuna, ciudad" /></div>
          </Tarjeta>

          <Tarjeta className="organizacion-card-viva">
            <div className="mb-5 flex items-start gap-3">
              <div className="organizacion-icono bg-amarillo-50 text-aviso-700"><Sparkles className="h-5 w-5" /></div>
              <div>
                <h2 className="font-semibold">Sobre la organización</h2>
                <p className="mt-1 text-sm text-tinta-suave">Una descripción breve ayuda a que el equipo de Skilly entienda mejor tu contexto.</p>
              </div>
            </div>
            <CampoTextarea etiqueta="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} maximo={500} valorActual={form.descripcion} rows={6} placeholder="Cuéntanos brevemente quiénes son, qué hacen y qué necesidades suelen tener." />
          </Tarjeta>

          <div className="organizacion-acciones sticky bottom-4 z-20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="hidden text-sm text-tinta-suave sm:block"><Check className="mr-1 inline h-4 w-4 text-exito-700" />Los cambios se guardan en tu cuenta.</div>
              <Boton tamano="lg" cargando={guardando} onClick={guardar} icono={<Save className="h-4 w-4" />}>Guardar cambios</Boton>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <Tarjeta className="organizacion-side-card organizacion-side-card--accent">
            <div className="organizacion-side-card__icon"><ShieldCheck className="h-5 w-5" /></div>
            <h2 className="mt-4 font-semibold">Cuenta protegida</h2>
            <p className="mt-1 text-sm leading-6 text-tinta-suave">Tu organización está registrada en Skilly y el acceso está asociado al correo de contacto.</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-exito-700"><span className="h-2 w-2 rounded-full bg-exito-600" /> Cuenta activa</div>
          </Tarjeta>

          <Tarjeta className="organizacion-side-card">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-tinta-tenue">Datos de cuenta</p>
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-start gap-3"><Mail className="mt-0.5 h-4 w-4 text-primario-700" /><div className="min-w-0"><p className="text-xs text-tinta-tenue">Correo</p><p className="break-all text-sm font-medium">{org.emailContacto}</p></div></div>
              <div className="flex items-start gap-3"><Phone className="mt-0.5 h-4 w-4 text-info-600" /><div><p className="text-xs text-tinta-tenue">Teléfono</p><p className="text-sm font-medium">{org.telefono || 'Sin registrar'}</p></div></div>
              <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 text-primario-700" /><div><p className="text-xs text-tinta-tenue">Ubicación</p><p className="text-sm font-medium">{org.direccion || 'Sin registrar'}</p></div></div>
              {hrefSeguro(org.sitioWeb) && <a href={hrefSeguro(org.sitioWeb)} target="_blank" rel="noopener noreferrer" className="organizacion-enlace"><Globe2 className="h-4 w-4" /> Visitar sitio web <ExternalLink className="ml-auto h-3.5 w-3.5" /></a>}
            </div>
          </Tarjeta>

          <Tarjeta className="organizacion-side-card">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-tinta-tenue">Privacidad</p>
            <div className="mt-4 rounded-xl bg-crema p-3">
              <p className="text-sm font-medium">Consentimiento registrado</p>
              <p className="mt-1 text-xs leading-5 text-tinta-suave">Versión {org.consentimiento.version}. Tus datos se tratan según la política aceptada al crear la cuenta.</p>
              <Insignia className="mt-3" tono="exito" icono={<Check className="h-3.5 w-3.5" />}>Aceptado</Insignia>
            </div>
          </Tarjeta>
        </aside>
      </div>
      <CambiarContrasena />
    </div>
  );
}

import { CambiarContrasena } from '@/components/cuenta/CambiarContrasena';
import { useEffect, useMemo, useState } from 'react';
import { FileText, Plus, Trash2, Upload, UserRound, CheckCircle2 } from 'lucide-react';
import { useRecurso } from '@/lib/useRecurso';
import { abrirDocumento, agregarDocumento, actualizarMiPerfil, obtenerMiCuenta, solicitarValidacion } from '@/services/panelProfesional';
import { mensajeParaUsuario } from '@/services/errores';
import { Alerta, Boton, CampoSelect, CampoTexto, CampoTextarea, EstadoError, Esqueleto, Insignia, Tarjeta } from '@/components/ui';

const DIAS_DOCUMENTO = [
  { valor: 'curriculum', etiqueta: 'Currículum' },
  { valor: 'titulo', etiqueta: 'Título profesional' },
  { valor: 'certificado', etiqueta: 'Certificado / respaldo' },
];

export function MiPerfil() {
  const cuenta = useRecurso(obtenerMiCuenta, []);
  const [form, setForm] = useState({ titulo: '', ciudad: '', presentacion: '', linkedin: '', portafolio: '', formacion: [''], habilidades: [''], experiencia: [{ cargo: '', organizacion: '', periodo: '' }] });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tono: 'exito' | 'peligro'; texto: string } | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState('curriculum');

  useEffect(() => {
    if (!cuenta.datos) return;
    const p = cuenta.datos.profesional;
    setForm({
      titulo: p.titulo,
      ciudad: p.ciudad,
      presentacion: p.presentacion,
      linkedin: p.linkedin ?? '',
      portafolio: p.portafolio ?? '',
      formacion: p.formacion.length ? [...p.formacion] : [''],
      habilidades: p.habilidades.length ? [...p.habilidades] : [''],
      experiencia: p.experiencia.length ? p.experiencia.map((x) => ({ ...x })) : [{ cargo: '', organizacion: '', periodo: '' }],
    });
  }, [cuenta.datos]);

  const completitud = useMemo(() => {
    const campos = [form.titulo, form.ciudad, form.presentacion, form.formacion.filter(Boolean).join(''), form.habilidades.filter(Boolean).join('')];
    return Math.round((campos.filter((x) => x.trim().length > 0).length / campos.length) * 100);
  }, [form]);

  if (cuenta.error) return <EstadoError mensaje={cuenta.error} reintentar={cuenta.recargar} />;
  if (cuenta.cargando || !cuenta.datos) return <Esqueleto className="h-[650px] w-full rounded-2xl" />;
  const { privado } = cuenta.datos;

  const actualizarLista = (campo: 'formacion' | 'habilidades', indice: number, valor: string) => {
    setForm((f) => ({ ...f, [campo]: f[campo].map((x, i) => i === indice ? valor : x) }));
  };

  const guardar = async () => {
    setGuardando(true); setMensaje(null);
    try {
      await actualizarMiPerfil(form);
      await cuenta.recargar();
      setMensaje({ tono: 'exito', texto: 'Tu perfil quedó actualizado. Ahora puedes continuar con la validación de Skilly.' });
    } catch (e) { setMensaje({ tono: 'peligro', texto: mensajeParaUsuario(e) }); }
    finally { setGuardando(false); }
  };

  const enviarRevision = async () => {
    setGuardando(true); setMensaje(null);
    try { await solicitarValidacion(); await cuenta.recargar(); setMensaje({ tono: 'exito', texto: 'Tu perfil fue enviado a revisión. Verás el resultado en esta pantalla cuando Skilly termine de revisar tus antecedentes.' }); }
    catch (e) { setMensaje({ tono: 'peligro', texto: mensajeParaUsuario(e) }); }
    finally { setGuardando(false); }
  };

  const verDocumento = async (id: string) => {
    try { await abrirDocumento(id); }
    catch (e) { setMensaje({ tono: 'peligro', texto: mensajeParaUsuario(e) }); }
  };

  const subirDocumento = async (file: File) => {
    setGuardando(true); setMensaje(null);
    try { await agregarDocumento(file, tipoDocumento as 'curriculum' | 'titulo' | 'certificado'); await cuenta.recargar(); setMensaje({ tono: 'exito', texto: 'Documento cargado correctamente y pendiente de revisión.' }); }
    catch (e) { setMensaje({ tono: 'peligro', texto: mensajeParaUsuario(e) }); }
    finally { setGuardando(false); }
  };

  return <div className="flex flex-col gap-6">
    <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-medium text-primario-700">Tu presentación profesional</p><h1 className="text-2xl font-semibold tracking-tight">Mi perfil</h1><p className="mt-1 text-sm text-tinta-suave">Esta información alimenta tu ficha pública y ayuda a las organizaciones a entender qué haces.</p></div>
      <Insignia tono={privado.estadoValidacion === 'validado' ? 'exito' : privado.estadoValidacion === 'en_revision' ? 'aviso' : 'neutro'}>{privado.estadoValidacion === 'validado' ? 'Validado por Skilly' : privado.estadoValidacion === 'en_revision' ? 'En revisión' : 'Perfil incompleto'}</Insignia>
    </header>

    {mensaje && <Alerta tono={mensaje.tono}>{mensaje.texto}</Alerta>}
    {privado.comentarioValidacion && privado.estadoValidacion === 'perfil_incompleto' && <Alerta tono="aviso" titulo="Skilly te pidió completar o corregir tu perfil">{privado.comentarioValidacion} Cuando lo tengas listo, vuelve a enviarlo a revisión.</Alerta>}
    {privado.estadoValidacion === 'validado' && <Alerta tono="info" titulo="Tu perfil está validado">Puedes cambiar tu ciudad, presentación y habilidades cuando quieras. Si cambias tu formación, experiencia, LinkedIn o portafolio, Skilly debe revisarlos de nuevo y, mientras tanto, tus servicios no aparecen en el catálogo.</Alerta>}
    {privado.comentarioValidacion && privado.estadoValidacion === 'en_revision' && <Alerta tono="aviso">{privado.comentarioValidacion}</Alerta>}

    <Tarjeta><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primario-50 text-primario-800"><UserRound className="h-5 w-5" /></div><div className="flex-1"><p className="font-semibold">Completitud del perfil</p><p className="text-sm text-tinta-suave">{completitud}% de la información esencial</p></div><div className="h-2 w-32 overflow-hidden rounded-full bg-crema"><div className="h-full rounded-full bg-primario-600 transition-all" style={{ width: `${completitud}%` }} /></div></div></Tarjeta>

    <Tarjeta><div className="grid gap-5 md:grid-cols-2"><CampoTexto etiqueta="Título o rol profesional" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ej. Ingeniera comercial · Personas" /><CampoTexto etiqueta="Ciudad" value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} placeholder="Ej. Santiago" /><CampoTexto etiqueta="LinkedIn" nota="Opcional" value={form.linkedin} onChange={e => setForm({ ...form, linkedin: e.target.value })} /><CampoTexto etiqueta="Portafolio o sitio web" value={form.portafolio} onChange={e => setForm({ ...form, portafolio: e.target.value })} /></div><div className="mt-5"><CampoTextarea etiqueta="Presentación" value={form.presentacion} onChange={e => setForm({ ...form, presentacion: e.target.value })} rows={5} nota="Cuenta qué haces, para quién y qué tipo de problemas resuelves." /></div></Tarjeta>

    <Tarjeta><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Formación</h2><p className="text-sm text-tinta-suave">Agrega títulos, estudios o certificaciones relevantes.</p></div><Boton variante="secundario" tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setForm(f => ({ ...f, formacion: [...f.formacion, ''] }))}>Agregar</Boton></div><div className="mt-4 flex flex-col gap-3">{form.formacion.map((x, i) => <div className="flex gap-2" key={i}><CampoTexto aria-label={`Formación ${i + 1}`} etiqueta={`Formación ${i + 1}`} value={x} onChange={e => actualizarLista('formacion', i, e.target.value)} /><button type="button" className="mt-7 rounded-lg p-2 text-tinta-tenue hover:bg-crema" onClick={() => setForm(f => ({ ...f, formacion: f.formacion.filter((_, j) => j !== i) }))} aria-label="Eliminar formación"><Trash2 className="h-4 w-4" /></button></div>)}</div></Tarjeta>

    <Tarjeta><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Habilidades</h2><p className="text-sm text-tinta-suave">Competencias que quieras destacar en tu perfil.</p></div><Boton variante="secundario" tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setForm(f => ({ ...f, habilidades: [...f.habilidades, ''] }))}>Agregar</Boton></div><div className="mt-4 flex flex-col gap-3">{form.habilidades.map((x, i) => <div className="flex gap-2" key={i}><CampoTexto etiqueta={`Habilidad ${i + 1}`} value={x} onChange={e => actualizarLista('habilidades', i, e.target.value)} /><button type="button" className="mt-7 rounded-lg p-2 text-tinta-tenue hover:bg-crema" onClick={() => setForm(f => ({ ...f, habilidades: f.habilidades.filter((_, j) => j !== i) }))} aria-label="Eliminar habilidad"><Trash2 className="h-4 w-4" /></button></div>)}</div></Tarjeta>

    <Tarjeta><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Experiencia</h2><p className="text-sm text-tinta-suave">Puedes agregar hasta las experiencias más relevantes.</p></div><Boton variante="secundario" tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setForm(f => ({ ...f, experiencia: [...f.experiencia, { cargo: '', organizacion: '', periodo: '' }] }))}>Agregar</Boton></div><div className="mt-4 flex flex-col gap-4">{form.experiencia.map((x, i) => <div className="grid gap-3 rounded-xl border border-borde p-4 md:grid-cols-[1fr_1fr_180px_auto]" key={i}><CampoTexto etiqueta="Cargo" value={x.cargo} onChange={e => setForm(f => ({ ...f, experiencia: f.experiencia.map((v,j)=>j===i?{...v,cargo:e.target.value}:v) }))} /><CampoTexto etiqueta="Organización" value={x.organizacion} onChange={e => setForm(f => ({ ...f, experiencia: f.experiencia.map((v,j)=>j===i?{...v,organizacion:e.target.value}:v) }))} /><CampoTexto etiqueta="Periodo" value={x.periodo} onChange={e => setForm(f => ({ ...f, experiencia: f.experiencia.map((v,j)=>j===i?{...v,periodo:e.target.value}:v) }))} /><button type="button" className="mt-7 rounded-lg p-2 text-tinta-tenue hover:bg-crema" onClick={() => setForm(f => ({ ...f, experiencia: f.experiencia.filter((_,j)=>j!==i) }))} aria-label="Eliminar experiencia"><Trash2 className="h-4 w-4" /></button></div>)}</div></Tarjeta>

    <Tarjeta><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-primario-700" /><div><h2 className="font-semibold">Antecedentes</h2><p className="text-sm text-tinta-suave">Estos documentos son privados y solo sirven para la validación de Skilly. PDF, Word o imagen, hasta 5 MB.</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]"><CampoSelect etiqueta="Tipo" opciones={DIAS_DOCUMENTO} value={tipoDocumento} onChange={e=>setTipoDocumento(e.target.value)} /><label className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-borde-fuerte bg-crema px-4 text-sm font-medium hover:border-primario-300"><Upload className="h-4 w-4" />Seleccionar documento<input type="file" className="sr-only" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e=>{const f=e.target.files?.[0];if(f)void subirDocumento(f);e.currentTarget.value='';}} /></label></div><ul className="mt-4 flex flex-col gap-2">{privado.documentos.length ? privado.documentos.map(d=><li key={d.id} className="flex items-center justify-between rounded-xl border border-borde px-4 py-3 text-sm">{d.tieneArchivo ? <button type="button" className="truncate text-left text-primario-700 underline-offset-2 hover:underline" onClick={()=>void verDocumento(d.id)}>{d.nombreArchivo}</button> : <span className="truncate">{d.nombreArchivo}</span>}<Insignia tono={d.estado==='aprobado'?'exito':d.estado==='rechazado'?'peligro':'aviso'}>{d.estado==='pendiente_revision'?'Pendiente':d.estado==='aprobado'?'Aprobado':'Rechazado'}</Insignia></li>) : <li className="text-sm text-tinta-tenue">Todavía no has subido documentos.</li>}</ul></Tarjeta>

    <CambiarContrasena />

    <div className="sticky bottom-4 z-10 flex flex-col gap-2 rounded-2xl border border-borde bg-superficie/95 p-3 shadow-suave backdrop-blur sm:flex-row sm:justify-end"><Boton variante="secundario" onClick={guardar} cargando={guardando}>Guardar cambios</Boton>{privado.estadoValidacion !== 'validado' && <Boton onClick={enviarRevision} cargando={guardando} icono={<CheckCircle2 className="h-4 w-4" />}>Enviar a revisión</Boton>}</div>
  </div>;
}

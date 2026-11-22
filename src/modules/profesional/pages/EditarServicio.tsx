import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { useRecurso } from '@/lib/useRecurso';
import { crearServicio, actualizarServicio, listarMisServicios, obtenerMiCuenta } from '@/services/panelProfesional';
import { listarCategorias } from '@/services/catalogo';
import { mensajeParaUsuario } from '@/services/errores';
import { Alerta, Boton, CampoCheckbox, CampoSelect, CampoTexto, CampoTextarea, EstadoError, Esqueleto, Tarjeta } from '@/components/ui';

const modalidades = [
  { valor: 'remoto', etiqueta: 'Remoto' },
  { valor: 'presencial', etiqueta: 'Presencial' },
  { valor: 'hibrido', etiqueta: 'Híbrido' },
];

export function EditarServicio() {
  const { servicioId } = useParams();
  const editar = Boolean(servicioId);
  const servicios = useRecurso(listarMisServicios, []);
  const cuenta = useRecurso(obtenerMiCuenta, []);
  const validado = cuenta.datos?.privado.estadoValidacion === 'validado';
  const categoriasRecurso = useRecurso(listarCategorias, []);
  const categorias = categoriasRecurso.datos ?? [];
  const navegar = useNavigate();
  const [categoriaId, setCategoriaId] = useState('');
  const [subcategoriaId, setSubcategoriaId] = useState('');
  const [titulo, setTitulo] = useState(''); const [descripcion, setDescripcion] = useState('');
  const [entregables, setEntregables] = useState(['']); const [duracion, setDuracion] = useState('');
  const [minutos, setMinutos] = useState('60'); const [precio, setPrecio] = useState(''); const [etiquetas, setEtiquetas] = useState('');
  const [mods, setMods] = useState<string[]>(['remoto']); const [publicado, setPublicado] = useState(true);
  const [error, setError] = useState<string | null>(null); const [guardando, setGuardando] = useState(false);

  useEffect(() => { if (!servicioId || !servicios.datos) return; const s=servicios.datos.find(x=>x.id===servicioId); if(!s){setError('No encontramos ese servicio.');return;} setCategoriaId(s.categoriaId);setSubcategoriaId(s.subcategoriaId);setTitulo(s.titulo);setDescripcion(s.descripcion);setEntregables(s.entregables.length?s.entregables:['']);setDuracion(s.duracionEstimada);setMinutos(String(s.duracionSesionMinutos));setPrecio(String(s.precio));setEtiquetas(s.etiquetas.join(', '));setMods(s.modalidades);setPublicado(s.publicado!==false); }, [servicioId, servicios.datos]);
  // Un profesional sin validar parte con el servicio pausado (no puede publicarlo).
  useEffect(() => { if (!editar && cuenta.datos && cuenta.datos.privado.estadoValidacion !== 'validado') setPublicado(false); }, [editar, cuenta.datos]);
  const subcategorias = useMemo(()=>categorias.find(c=>c.id===categoriaId)?.subcategorias ?? [],[categoriaId, categorias]);
  useEffect(()=>{if(categorias.length && !subcategorias.some(s=>s.id===subcategoriaId))setSubcategoriaId('');},[categoriaId, subcategorias, subcategoriaId, categorias.length]);
  if (servicios.error) return <EstadoError mensaje={servicios.error} reintentar={servicios.recargar}/>;
  if (categoriasRecurso.error) return <EstadoError mensaje={categoriasRecurso.error} reintentar={categoriasRecurso.recargar}/>;
  if (servicios.cargando || !servicios.datos || categoriasRecurso.cargando || !categoriasRecurso.datos) return <Esqueleto className="h-[650px] w-full rounded-2xl"/>;

  const guardar = async () => { setGuardando(true);setError(null);try { const datos={categoriaId,subcategoriaId,titulo,descripcion,entregables,duracionEstimada:duracion,duracionSesionMinutos:Number(minutos),modalidades:mods as any,precio:Number(precio),etiquetas:etiquetas.split(',').map(x=>x.trim()).filter(Boolean),publicado}; if(editar) await actualizarServicio(servicioId!,datos); else await crearServicio(datos); navegar('/profesional/servicios',{replace:true}); }catch(e){setError(mensajeParaUsuario(e));}finally{setGuardando(false);} };
  const toggleModalidad=(m:string)=>setMods(v=>v.includes(m)?v.filter(x=>x!==m):[...v,m]);
  return <div className="mx-auto flex max-w-3xl flex-col gap-6"><header><p className="text-sm font-medium text-primario-700">Catálogo profesional</p><h1 className="text-2xl font-semibold tracking-tight">{editar?'Editar servicio':'Publicar un servicio'}</h1><p className="mt-1 text-sm text-tinta-suave">Define claramente qué entregas, cuánto cuesta y cómo puede contratarte una organización.</p></header>{error&&<Alerta tono="peligro">{error}</Alerta>}<Tarjeta><div className="grid gap-5 md:grid-cols-2"><CampoSelect key={`categoria-${categoriaId}`} etiqueta="Área" placeholder="Selecciona un área" opciones={categorias.map(c=>({valor:c.id,etiqueta:c.nombre}))} value={categoriaId} onChange={e=>setCategoriaId(e.target.value)}/><CampoSelect key={`subcategoria-${subcategoriaId}-${categoriaId}`} etiqueta="Subcategoría" placeholder="Selecciona una subcategoría" opciones={subcategorias.map(s=>({valor:s.id,etiqueta:s.nombre}))} value={subcategoriaId} onChange={e=>setSubcategoriaId(e.target.value)} disabled={!categoriaId}/><div className="md:col-span-2"><CampoTexto etiqueta="Título del servicio" value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Ej. Diseño de un sistema de onboarding"/></div><div className="md:col-span-2"><CampoTextarea etiqueta="Descripción" value={descripcion} onChange={e=>setDescripcion(e.target.value)} rows={6}/></div></div></Tarjeta><Tarjeta><div className="flex items-center justify-between"><div><h2 className="font-semibold">Qué recibe la organización</h2><p className="text-sm text-tinta-suave">Usa entregables concretos.</p></div><Boton variante="secundario" tamano="sm" onClick={()=>setEntregables(v=>[...v,''])}>Agregar</Boton></div><div className="mt-4 flex flex-col gap-3">{entregables.map((e,i)=><CampoTexto key={i} etiqueta={`Entregable ${i+1}`} value={e} onChange={ev=>setEntregables(v=>v.map((x,j)=>j===i?ev.target.value:x))}/>)}</div></Tarjeta><Tarjeta><div className="grid gap-5 md:grid-cols-3"><CampoTexto etiqueta="Duración estimada" value={duracion} onChange={e=>setDuracion(e.target.value)} placeholder="2 a 3 semanas"/><CampoSelect etiqueta="Sesión agendable" opciones={[45,60,90,120,240].map(x=>({valor:String(x),etiqueta:`${x} minutos`}))} value={minutos} onChange={e=>setMinutos(e.target.value)}/><CampoTexto etiqueta="Precio (CLP)" inputMode="numeric" value={precio} onChange={e=>setPrecio(e.target.value.replace(/\D/g,''))} placeholder="590000"/></div><div className="mt-5"><p className="text-sm font-medium">Modalidades</p><div className="mt-2 grid gap-2 sm:grid-cols-3">{modalidades.map(m=><CampoCheckbox key={m.valor} etiqueta={m.etiqueta} checked={mods.includes(m.valor)} onChange={()=>toggleModalidad(m.valor)}/>)}</div></div><div className="mt-5"><CampoTexto etiqueta="Etiquetas" value={etiquetas} onChange={e=>setEtiquetas(e.target.value)} placeholder="onboarding, personas, inducción" ayuda="Sepáralas con comas."/></div></Tarjeta><Tarjeta><CampoCheckbox etiqueta="Mostrar este servicio en el catálogo y aceptar nuevas solicitudes" checked={publicado} disabled={!validado && !(editar && servicios.datos?.find(x=>x.id===servicioId)?.publicado !== false)} onChange={e=>setPublicado(e.target.checked)} />{cuenta.datos && !validado && <p className="mt-2 text-xs text-aviso-700">Podrás publicarlo cuando Skilly valide tu perfil. Mientras tanto se guarda pausado.</p>}<p className="mt-2 text-xs text-tinta-tenue">Puedes pausarlo después sin eliminar su historial.</p></Tarjeta><div className="flex justify-end gap-2"><Boton variante="secundario" onClick={()=>navegar('/profesional/servicios')}>Cancelar</Boton><Boton cargando={guardando} onClick={()=>void guardar()} icono={<Save className="h-4 w-4"/>}>{editar?'Guardar cambios':'Crear servicio'}</Boton></div></div>;
}

export function NuevoServicio() { return <EditarServicio />; }

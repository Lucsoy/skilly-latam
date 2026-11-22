import { Link } from 'react-router-dom';
import { Briefcase, Calculator, FileText, GraduationCap, MapPin, Users, WalletCards, Zap } from 'lucide-react';
import type { ServicioEnCatalogo } from '@/services/catalogo';
import { ETIQUETA_MODALIDAD, formatearCLP, formatearFechaLarga } from '@/lib/formato';
import { Esqueleto, Insignia, Tarjeta } from '@/components/ui';
import { BotonFavorito } from './BotonFavorito';


const ESTILOS_VITRINA: Record<string, { fondo: string; borde: string; icono: string; etiqueta: string }> = {
  reclutamiento: { fondo: 'vitrina-reclutamiento', borde: 'border-vitrina-reclutamiento', icono: 'bg-white/80 text-naranja-700', etiqueta: 'Talento y personas' },
  cultura: { fondo: 'vitrina-cultura', borde: 'border-vitrina-cultura', icono: 'bg-white/80 text-naranja-700', etiqueta: 'Cultura y clima' },
  compensaciones: { fondo: 'vitrina-compensaciones', borde: 'border-vitrina-compensaciones', icono: 'bg-white/75 text-aviso-700', etiqueta: 'Compensaciones' },
  capacitacion: { fondo: 'vitrina-capacitacion', borde: 'border-vitrina-capacitacion', icono: 'bg-white/75 text-exito-700', etiqueta: 'Desarrollo' },
  administracion: { fondo: 'vitrina-administracion', borde: 'border-vitrina-administracion', icono: 'bg-white/75 text-tinta', etiqueta: 'Back Office' },
  finanzas: { fondo: 'vitrina-finanzas', borde: 'border-vitrina-finanzas', icono: 'bg-white/75 text-primario-800', etiqueta: 'Finanzas' },
};

const ICONOS_VITRINA: Record<string, typeof Briefcase> = {
  reclutamiento: Users,
  cultura: Briefcase,
  compensaciones: WalletCards,
  capacitacion: GraduationCap,
  administracion: FileText,
  finanzas: Calculator,
};

export function TarjetaServicio({ item }: { item: ServicioEnCatalogo }) {
  const { servicio, profesional, categoria, subcategoria, reputacion, proximoBloque } = item;
  const estilo = ESTILOS_VITRINA[categoria.id] ?? ESTILOS_VITRINA.administracion!;
  const IconoCategoria = ICONOS_VITRINA[categoria.id] ?? Briefcase;

  return (
    <Tarjeta
      relleno="ninguno"
      interactiva
      className={`tarjeta-vitrina relative flex h-full flex-col overflow-hidden gap-0 ${estilo.borde}`}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
        e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.setProperty('--mouse-x', '50%');
        e.currentTarget.style.setProperty('--mouse-y', '50%');
      }}
    >
      <div className={`vitrina-cabecera ${estilo.fondo}`}>
        <div className={`vitrina-icono ${estilo.icono}`} aria-hidden="true">
          <IconoCategoria className="h-5 w-5" strokeWidth={2.1} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-tinta-suave">{estilo.etiqueta}</p>
          <p className="mt-0.5 truncate text-xs text-tinta-suave">{subcategoria.nombre}</p>
        </div>
        <BotonFavorito servicioId={servicio.id} titulo={servicio.titulo} className="relative z-10 ml-auto -mr-1 -mt-1 bg-white/70" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-tinta-tenue">
            {categoria.nombre} <span aria-hidden="true">›</span> {subcategoria.nombre}
          </p>
          <span className="vitrina-señal" aria-hidden="true"><span /></span>
        </div>

        <h3 className="text-base font-semibold leading-snug">
          <Link to={`/servicios/${servicio.id}`} className="after:absolute after:inset-0 after:rounded-2xl">
            {servicio.titulo}
          </Link>
        </h3>

        <div className="profesional-identidad">
          <span aria-hidden="true" className="profesional-avatar profesional-avatar--anonimo">
            <UserIcono />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-tinta">Profesional independiente</p>
              {profesional.validadoPorSkilly && <span className="profesional-check" title="Identidad validada por Skilly">✓</span>}
            </div>
            <p className="truncate text-xs text-tinta-suave">{profesional.titulo.split('·')[0]?.trim() ?? 'Profesional independiente'}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-tinta-tenue"><MapPin className="h-3 w-3" /> {profesional.ciudad}</p>
          </div>
          <div className="profesional-experiencia" title="Antigüedad en Skilly">
            <span>{aniosEnSkilly(profesional.fechaIngreso)}</span>
            <small>años en Skilly</small>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {profesional.validadoPorSkilly && (
            <Insignia tono="exito" icono={<IconoEscudo />}>Validado por Skilly</Insignia>
          )}
          {servicio.modalidades.map((m) => (
            <Insignia key={m} tono="neutro">{ETIQUETA_MODALIDAD[m]}</Insignia>
          ))}
        </div>

        <div className="profesional-confianza profesional-confianza--neutral">
          <div className="profesional-score">
            <span className="profesional-confianza-icono" aria-hidden="true">✓</span>
            <div>
              <strong>{profesional.validadoPorSkilly ? 'Perfil validado' : 'Profesional publicado'}</strong>
              <span>sin ranking público</span>
            </div>
          </div>
          <div className="profesional-evaluaciones">
            <strong>{reputacion.totalConsideradas}</strong>
            <span>{reputacion.totalConsideradas === 1 ? 'evaluación reciente' : 'evaluaciones recientes'}</span>
          </div>
        </div>

        <p className="profesional-frase">
          “{fraseCorta(profesional.presentacion)}”
        </p>

        <div className="profesional-hover-panel" aria-hidden="true">
          <div className="profesional-hover-title"><Zap className="h-3.5 w-3.5" /> Lo que puedes esperar</div>
          <div className="profesional-hover-items">
            {servicio.entregables.slice(0, 3).map((entregable) => <span key={entregable}>✓ {entregable}</span>)}
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 border-t border-borde pt-3">
          <p className="text-sm">
            <span className="block text-[11px] text-tinta-tenue">Desde</span>
            <span className="font-bold tracking-tight">{formatearCLP(servicio.precio)}</span>
            <span className="ml-1 text-[11px] text-tinta-tenue">por proyecto</span>
          </p>
          <p className="text-right text-xs text-tinta-suave">
            {proximoBloque ? (
              <>Disponible desde el {formatearFechaLarga(proximoBloque)}</>
            ) : (
              <span className="text-tinta-tenue">Sin horas publicadas</span>
            )}
          </p>
        </div>

        <div className="vitrina-cta mt-1 flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-xs">
          <span className="font-semibold text-tinta-suave">Ver propuesta</span>
          <span aria-hidden="true">→</span>
        </div>
      </div>
    </Tarjeta>
  );
}

export function EsqueletoTarjetaServicio() {
  return (
    <Tarjeta relleno="sm" className="flex h-full flex-col gap-3">
      <Esqueleto className="h-3 w-2/3" />
      <Esqueleto className="h-5 w-full" />
      <Esqueleto className="h-5 w-4/5" />
      <div className="flex items-center gap-2.5">
        <Esqueleto className="h-9 w-9 rounded-full" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Esqueleto className="h-3.5 w-1/2" />
          <Esqueleto className="h-3 w-1/4" />
        </div>
      </div>
      <Esqueleto className="h-6 w-3/4 rounded-full" />
      <Esqueleto className="h-12 w-full" />
      <Esqueleto className="h-4 w-full" />
    </Tarjeta>
  );
}

function aniosEnSkilly(fechaIngreso: string) {
  const inicio = new Date(fechaIngreso);
  const hoy = new Date();
  const años = hoy.getFullYear() - inicio.getFullYear() - (
    hoy < new Date(hoy.getFullYear(), inicio.getMonth(), inicio.getDate()) ? 1 : 0
  );
  return Math.max(1, años);
}

function fraseCorta(texto: string) {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio.length > 118 ? `${limpio.slice(0, 115).trimEnd()}…` : limpio;
}

function UserIcono() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c.8-3.2 3-5 6.5-5s5.7 1.8 6.5 5" />
    </svg>
  );
}

function IconoEscudo() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

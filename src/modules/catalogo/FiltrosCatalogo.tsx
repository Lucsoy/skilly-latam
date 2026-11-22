import { useState } from 'react';
import type { Categoria, Modalidad } from '@/types';
import { ETIQUETA_MODALIDAD } from '@/lib/formato';
import { cn } from '@/lib/cn';
import { Boton, Esqueleto } from '@/components/ui';
import {
  FILTROS_VACIOS,
  OPCIONES_DISPONIBILIDAD,
  RANGOS_PRECIO,
  contarFiltrosActivos,
  type ClaveRangoPrecio,
  type FiltrosUi,
} from './filtrosUrl';

interface Props {
  filtros: FiltrosUi;
  onCambiar: (filtros: FiltrosUi) => void;
  categorias: Categoria[] | null;
  cargandoCategorias: boolean;
}

const MODALIDADES: Modalidad[] = ['remoto', 'presencial', 'hibrido'];

export function FiltrosCatalogo({ filtros, onCambiar, categorias, cargandoCategorias }: Props) {
  const activos = contarFiltrosActivos(filtros);

  const limpiar = () => onCambiar({ ...FILTROS_VACIOS, texto: filtros.texto, orden: filtros.orden });

  const categoriaActiva = categorias?.find((c) => c.id === filtros.categoriaId);
  const subcategoriaActiva = categoriaActiva?.subcategorias.find((s) => s.id === filtros.subcategoriaId);
  const disponibilidadActiva = OPCIONES_DISPONIBILIDAD.find((d) => d.valor === filtros.disponibilidad);
  const precioActivo = RANGOS_PRECIO.find((r) => r.clave === filtros.rangoPrecio);

  const quitarCategoria = () => onCambiar({ ...filtros, categoriaId: '', subcategoriaId: '' });
  const quitarSubcategoria = () => onCambiar({ ...filtros, subcategoriaId: '' });
  const quitarModalidad = (modalidad: Modalidad) =>
    onCambiar({ ...filtros, modalidades: filtros.modalidades.filter((m) => m !== modalidad) });

  return (
    <div
      className="filtros-skilly flex flex-col gap-6"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--filtro-mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
        e.currentTarget.style.setProperty('--filtro-my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
      }}
    >
      <div className="filtros-skilly__encabezado flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="filtros-skilly__punto" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold">Filtros</h2>
            <p className="mt-0.5 text-[11px] text-tinta-tenue">Afina tu búsqueda</p>
          </div>
          {activos > 0 && <span className="filtros-skilly__contador">{activos}</span>}
        </div>
        {activos > 0 && (
          <Boton variante="fantasma" tamano="sm" onClick={limpiar}>
            Limpiar todo
          </Boton>
        )}
      </div>

      {activos > 0 && (
        <div className="filtros-activos" aria-label="Filtros activos">
          <div className="filtros-activos__titulo">Aplicados ahora</div>
          <div className="filtros-activos__lista">
            {categoriaActiva && (
              <button type="button" className="filtro-chip filtro-chip--categoria" onClick={quitarCategoria}>
                <span>{categoriaActiva.nombre}</span><span aria-hidden="true">×</span>
              </button>
            )}
            {subcategoriaActiva && (
              <button type="button" className="filtro-chip filtro-chip--subcategoria" onClick={quitarSubcategoria}>
                <span>{subcategoriaActiva.nombre}</span><span aria-hidden="true">×</span>
              </button>
            )}
            {filtros.modalidades.map((m) => (
              <button type="button" key={m} className="filtro-chip filtro-chip--modalidad" onClick={() => quitarModalidad(m)}>
                <span>{ETIQUETA_MODALIDAD[m]}</span><span aria-hidden="true">×</span>
              </button>
            ))}
            {filtros.rangoPrecio !== 'cualquiera' && precioActivo && (
              <button type="button" className="filtro-chip filtro-chip--precio" onClick={() => onCambiar({ ...filtros, rangoPrecio: 'cualquiera' })}>
                <span>{precioActivo.etiqueta}</span><span aria-hidden="true">×</span>
              </button>
            )}
            {filtros.disponibilidad !== 'cualquiera' && disponibilidadActiva && (
              <button type="button" className="filtro-chip filtro-chip--disponibilidad" onClick={() => onCambiar({ ...filtros, disponibilidad: 'cualquiera' })}>
                <span>{disponibilidadActiva.etiqueta}</span><span aria-hidden="true">×</span>
              </button>
            )}
          </div>
        </div>
      )}

      <Grupo titulo="Categoría" clase="filtro-grupo--categoria">
        {cargandoCategorias || !categorias ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Esqueleto key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : (
          <ArbolCategorias
            categorias={categorias}
            categoriaId={filtros.categoriaId}
            subcategoriaId={filtros.subcategoriaId}
            onSeleccionar={(categoriaId, subcategoriaId) => onCambiar({ ...filtros, categoriaId, subcategoriaId })}
          />
        )}
      </Grupo>

      <Grupo titulo="Modalidad">
        <ul className="flex flex-col gap-2">
          {MODALIDADES.map((m) => (
            <li key={m}>
              <label className="filtro-opcion flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={filtros.modalidades.includes(m)}
                  onChange={(e) =>
                    onCambiar({
                      ...filtros,
                      modalidades: e.target.checked
                        ? [...filtros.modalidades, m]
                        : filtros.modalidades.filter((x) => x !== m),
                    })
                  }
                  className="filtro-control h-4 w-4 rounded border-borde-fuerte text-primario-600 focus:ring-primario-500"
                />
                {ETIQUETA_MODALIDAD[m]}
              </label>
            </li>
          ))}
        </ul>
      </Grupo>

      <Grupo titulo="Precio">
        <ul className="flex flex-col gap-2">
          {RANGOS_PRECIO.map((r) => (
            <li key={r.clave}>
              <label className="filtro-opcion flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="radio"
                  name="rango-precio"
                  checked={filtros.rangoPrecio === r.clave}
                  onChange={() => onCambiar({ ...filtros, rangoPrecio: r.clave as ClaveRangoPrecio })}
                  className="filtro-control h-4 w-4 border-borde-fuerte text-primario-600 focus:ring-primario-500"
                />
                {r.etiqueta}
              </label>
            </li>
          ))}
        </ul>
      </Grupo>

      <Grupo titulo="Disponibilidad">
        <ul className="flex flex-col gap-2">
          {OPCIONES_DISPONIBILIDAD.map((d) => (
            <li key={d.valor}>
              <label className="filtro-opcion flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="radio"
                  name="disponibilidad"
                  checked={filtros.disponibilidad === d.valor}
                  onChange={() => onCambiar({ ...filtros, disponibilidad: d.valor })}
                  className="filtro-control h-4 w-4 border-borde-fuerte text-primario-600 focus:ring-primario-500"
                />
                {d.etiqueta}
              </label>
            </li>
          ))}
        </ul>
      </Grupo>
    </div>
  );
}

function Grupo({ titulo, children, clase = "" }: { titulo: string; children: React.ReactNode; clase?: string }) {
  return (
    <fieldset className={cn("filtro-grupo border-t border-borde pt-4 first-of-type:border-t-0 first-of-type:pt-0", clase)}>
      <legend className="filtro-grupo__titulo mb-2.5 text-sm font-medium text-tinta"><span>{titulo}</span></legend>
      {children}
    </fieldset>
  );
}

interface PropsArbol {
  categorias: Categoria[];
  categoriaId: string;
  subcategoriaId: string;
  onSeleccionar: (categoriaId: string, subcategoriaId: string) => void;
}

/** Árbol de dos niveles: al abrir una categoría se ven sus subcategorías. */
function ArbolCategorias({ categorias, categoriaId, subcategoriaId, onSeleccionar }: PropsArbol) {
  const [abierta, setAbierta] = useState<string | null>(categoriaId || null);

  return (
    <ul className="flex flex-col gap-0.5">
      <li>
        <button
          type="button"
          onClick={() => onSeleccionar('', '')}
          className={cn(
            'filtro-categoria w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
            !categoriaId ? 'bg-primario-50 font-medium text-primario-700' : 'text-tinta-suave hover:bg-crema',
          )}
        >
          Todas las categorías
        </button>
      </li>
      {categorias.map((c) => {
        const estaAbierta = abierta === c.id;
        const seleccionada = categoriaId === c.id && !subcategoriaId;
        return (
          <li key={c.id}>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setAbierta(estaAbierta ? null : c.id);
                  onSeleccionar(c.id, '');
                }}
                className={cn(
                  'filtro-categoria flex-1 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                  seleccionada ? 'bg-primario-50 font-medium text-primario-700' : 'text-tinta hover:bg-crema',
                )}
              >
                {c.nombre}
              </button>
              <button
                type="button"
                aria-expanded={estaAbierta}
                aria-label={`${estaAbierta ? 'Ocultar' : 'Ver'} subcategorías de ${c.nombre}`}
                onClick={() => setAbierta(estaAbierta ? null : c.id)}
                className="filtro-chevron inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-tinta-tenue hover:bg-crema"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn('transition-transform', estaAbierta && 'rotate-90')}
                  aria-hidden="true"
                >
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </div>
            {estaAbierta && (
              <ul className="filtro-subcategorias ml-2 flex flex-col gap-0.5 border-l border-borde pl-2">
                {c.subcategorias.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => onSeleccionar(c.id, s.id)}
                      className={cn(
                        'filtro-subcategoria w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                        subcategoriaId === s.id
                          ? 'bg-primario-50 font-medium text-primario-700'
                          : 'text-tinta-suave hover:bg-crema',
                      )}
                    >
                      {s.nombre}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

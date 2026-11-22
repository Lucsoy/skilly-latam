import type { Insignia, Reputacion, ResumenDimension } from '@/types';
import { ETIQUETA_DIMENSION, ETIQUETA_NIVEL } from '@/lib/reputacion';
import { cn } from '@/lib/cn';
import { formatearFechaCorta, plural } from '@/lib/formato';
import { Insignia as Chip } from '@/components/ui';

/**
 * Presentación de reputación sin estrellas y sin promedio global.
 *
 * - Tres dimensiones separadas, cada una con su etiqueta textual.
 * - Bajo el umbral mínimo se muestra "Profesional nuevo en Skilly" con tono
 *   positivo, acompañado de las insignias de validación.
 */

const ETIQUETA_CORTA: Record<string, string> = {
  calidad: 'Calidad',
  plazos: 'Plazos',
  comunicacion: 'Comunicación',
};

/** Etiqueta compacta de un nivel, para no partir la línea en tarjetas angostas. */
const ETIQUETA_NIVEL_CORTA: Record<number, string> = {
  4: 'Superó lo esperado',
  3: 'Cumplió',
  2: 'Cumplió en parte',
  1: 'No cumplió',
};

export const ETIQUETA_INSIGNIA: Record<Insignia, string> = {
  identidad_verificada: 'Identidad verificada',
  titulo_verificado: 'Título verificado',
  entrevista_skilly: 'Entrevistado por Skilly',
  referencias_verificadas: 'Referencias verificadas',
};

/** Color por nivel. El 3 y el 4 son positivos; el 2 es de aviso y el 1, negativo. */
function claseNivel(nivel: number): string {
  if (nivel === 4) return 'text-exito-700';
  if (nivel === 3) return 'text-tinta';
  if (nivel === 2) return 'text-aviso-700';
  return 'text-peligro-700';
}

interface PropsNuevo {
  insignias: Insignia[];
  validadoPorSkilly: boolean;
  compacta?: boolean;
}

/**
 * Etiqueta neutra para quien aún no acumula evaluaciones. Usa el color primario
 * de la marca, no gris, para que se lea como "recién llegado" y no como "malo".
 */
export function EtiquetaProfesionalNuevo({ insignias, validadoPorSkilly, compacta = false }: PropsNuevo) {
  const verificaciones = insignias.map((i) => ETIQUETA_INSIGNIA[i]);
  return (
    <div className="flex flex-col gap-1.5">
      <Chip tono="primario" icono={<IconoBrote />}>
        Profesional nuevo en Skilly
      </Chip>
      {verificaciones.length > 0 && (
        <p className="text-xs text-tinta-suave">
          {validadoPorSkilly ? 'Perfil validado: ' : 'Perfil con '}
          {verificaciones.join(' · ')}
        </p>
      )}
      {!compacta && (
        <p className="text-xs text-tinta-suave">
          Todavía no tiene suficientes evaluaciones para mostrar indicadores. Revisamos su formación y
          experiencia antes de publicarlo.
        </p>
      )}
    </div>
  );
}

interface Props {
  reputacion: Reputacion;
  insignias: Insignia[];
  validadoPorSkilly: boolean;
  variante?: 'compacta' | 'completa';
  className?: string;
}

export function BloqueReputacion({ reputacion, insignias, validadoPorSkilly, variante = 'compacta', className }: Props) {
  if (reputacion.esNuevo || !reputacion.dimensiones) {
    return (
      <div className={className}>
        <EtiquetaProfesionalNuevo
          insignias={insignias}
          validadoPorSkilly={validadoPorSkilly}
          compacta={variante === 'compacta'}
        />
      </div>
    );
  }

  if (variante === 'compacta') {
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        {/* Una fila por dimensión: se lee mejor que tres columnas estrechas
            y deja claro que son medidas separadas, no un puntaje único. */}
        <ul className="flex flex-col gap-1 rounded-lg bg-crema px-2.5 py-2">
          {reputacion.dimensiones.map((d) => (
            <li key={d.dimension} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-tinta-tenue">{ETIQUETA_CORTA[d.dimension]}</span>
              <span className={cn('text-right font-semibold', claseNivel(d.nivelPredominante))}>
                {ETIQUETA_NIVEL_CORTA[d.nivelPredominante]}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-tinta-tenue">
          Según {plural(reputacion.totalConsideradas, 'evaluación reciente', 'evaluaciones recientes')}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-3">
        {reputacion.dimensiones.map((d) => (
          <BarraDimension key={d.dimension} resumen={d} />
        ))}
      </div>
      <p className="text-xs text-tinta-suave">
        Calculado con las últimas {reputacion.totalConsideradas} evaluaciones de los últimos 12 meses.
        {reputacion.totalHistoricas > reputacion.totalConsideradas &&
          ` Tiene ${reputacion.totalHistoricas} evaluaciones en total.`}{' '}
        No mostramos un promedio único: cada dimensión se lee por separado.
      </p>
      {reputacion.comentariosPublicos.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-borde pt-4">
          <h3 className="text-sm font-semibold">Lo que dicen otras organizaciones</h3>
          <ul className="flex flex-col gap-3">
            {reputacion.comentariosPublicos.map((c, i) => (
              <li key={i} className="rounded-xl bg-crema px-4 py-3">
                <p className="text-sm text-tinta">“{c.comentario}”</p>
                <p className="mt-1.5 text-xs text-tinta-tenue">
                  {c.organizacion} · {formatearFechaCorta(c.fecha)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Distribución de respuestas de una dimensión, sin convertirla en un número. */
function BarraDimension({ resumen }: { resumen: ResumenDimension }) {
  const niveles = [4, 3, 2, 1] as const;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">{ETIQUETA_DIMENSION[resumen.dimension]}</p>
        <p className={cn('text-sm font-semibold', claseNivel(resumen.nivelPredominante))}>
          {ETIQUETA_NIVEL[resumen.nivelPredominante]}
        </p>
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {niveles.map((nivel) => {
          const cantidad = resumen.conteo[nivel];
          const porcentaje = resumen.total ? (cantidad / resumen.total) * 100 : 0;
          if (cantidad === 0) return null;
          return (
            <div key={nivel} className="flex items-center gap-2 text-xs">
              <span className="w-40 shrink-0 text-tinta-suave">{ETIQUETA_NIVEL[nivel]}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-crema">
                <span
                  className={cn('block h-full rounded-full', nivel >= 3 ? 'bg-primario-400' : 'bg-borde-fuerte')}
                  style={{ width: `${porcentaje}%` }}
                />
              </span>
              <span className="w-6 shrink-0 text-right tabular-nums text-tinta-tenue">{cantidad}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ListaInsignias({ insignias, className }: { insignias: Insignia[]; className?: string }) {
  if (insignias.length === 0) return null;
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)}>
      {insignias.map((i) => (
        <li key={i}>
          <Chip tono="exito" icono={<IconoCheck />}>
            {ETIQUETA_INSIGNIA[i]}
          </Chip>
        </li>
      ))}
    </ul>
  );
}

function IconoCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconoBrote() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21v-8" />
      <path d="M12 13c0-3 2-5 5-5 0 3-2 5-5 5Z" />
      <path d="M12 15c0-3-2-5-5-5 0 3 2 5 5 5Z" />
    </svg>
  );
}

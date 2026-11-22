import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { ZONA_HORARIA, capitalizar } from '@/lib/formato';
import { cn } from '@/lib/cn';

interface Props {
  /** Claves "yyyy-MM-dd" (hora de Santiago) que tienen al menos un bloque libre. */
  diasConBloques: Set<string>;
  diaSeleccionado: string | null;
  onSeleccionarDia: (clave: string) => void;
}

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const NOMBRES_DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

function clave(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/**
 * Calendario mensual. Solo son clicables los días con bloques libres; los
 * demás se ven atenuados y no se anuncian como "ocupados".
 */
export function Calendario({ diasConBloques, diaSeleccionado, onSeleccionarDia }: Props) {
  const hoySantiago = useMemo(() => toZonedTime(new Date(), ZONA_HORARIA), []);
  const claveHoy = clave(hoySantiago.getFullYear(), hoySantiago.getMonth(), hoySantiago.getDate());

  // Mes inicial: el del día seleccionado o el del primer día con bloques, si no, el actual.
  const [mesVisible, setMesVisible] = useState(() => {
    const referencia = diaSeleccionado ?? [...diasConBloques].sort()[0] ?? claveHoy;
    const [a, m] = referencia.split('-').map(Number);
    return { anio: a as number, mes: (m as number) - 1 };
  });

  const ultimoDiaConBloques = useMemo(() => [...diasConBloques].sort().at(-1) ?? claveHoy, [diasConBloques, claveHoy]);
  const claveMes = (a: number, m: number) => `${a}-${String(m + 1).padStart(2, '0')}`;
  const puedeRetroceder = claveMes(mesVisible.anio, mesVisible.mes) > claveHoy.slice(0, 7);
  const puedeAvanzar = claveMes(mesVisible.anio, mesVisible.mes) < ultimoDiaConBloques.slice(0, 7);

  const cambiarMes = (delta: number) => {
    setMesVisible(({ anio, mes }) => {
      const fecha = new Date(anio, mes + delta, 1);
      return { anio: fecha.getFullYear(), mes: fecha.getMonth() };
    });
  };

  const celdas = useMemo(() => {
    const { anio, mes } = mesVisible;
    const primerDia = new Date(anio, mes, 1);
    const totalDias = new Date(anio, mes + 1, 0).getDate();
    // Lunes = 0 … Domingo = 6
    const desplazamiento = (primerDia.getDay() + 6) % 7;
    const lista: Array<{ dia: number; clave: string; diaSemana: number } | null> = [];
    for (let i = 0; i < desplazamiento; i++) lista.push(null);
    for (let d = 1; d <= totalDias; d++) {
      lista.push({ dia: d, clave: clave(anio, mes, d), diaSemana: (desplazamiento + d - 1) % 7 });
    }
    return lista;
  }, [mesVisible]);

  const titulo = capitalizar(format(new Date(mesVisible.anio, mesVisible.mes, 1), "MMMM 'de' yyyy", { locale: es }));
  const disponiblesEnMes = celdas.filter((c) => c && diasConBloques.has(c.clave)).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => cambiarMes(-1)}
          disabled={!puedeRetroceder}
          aria-label="Mes anterior"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-tinta hover:bg-crema disabled:opacity-30"
        >
          <IconoFlecha direccion="izq" />
        </button>
        <h3 className="text-base font-semibold" aria-live="polite">
          {titulo}
        </h3>
        <button
          type="button"
          onClick={() => cambiarMes(1)}
          disabled={!puedeAvanzar}
          aria-label="Mes siguiente"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-tinta hover:bg-crema disabled:opacity-30"
        >
          <IconoFlecha direccion="der" />
        </button>
      </div>

      <div role="grid" aria-label={`Calendario de ${titulo}`} className="grid grid-cols-7 gap-1">
        <div role="row" className="contents">
          {DIAS_SEMANA.map((d, i) => (
            <div key={i} role="columnheader" aria-label={NOMBRES_DIAS[i]} className="py-1 text-center text-xs font-medium text-tinta-tenue">
              {d}
            </div>
          ))}
        </div>
        <div role="row" className="contents">
          {celdas.map((celda, i) => {
            if (!celda) return <div key={`v-${i}`} role="gridcell" aria-hidden="true" />;
            const disponible = diasConBloques.has(celda.clave);
            const seleccionado = celda.clave === diaSeleccionado;
            const esHoy = celda.clave === claveHoy;
            return (
              <div key={celda.clave} role="gridcell" className="flex justify-center">
                <button
                  type="button"
                  disabled={!disponible}
                  aria-pressed={seleccionado}
                  aria-label={`${NOMBRES_DIAS[celda.diaSemana]} ${celda.dia}${disponible ? ', con horas disponibles' : ''}${esHoy ? ', hoy' : ''}`}
                  onClick={() => onSeleccionarDia(celda.clave)}
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-full text-sm transition-colors',
                    seleccionado && 'bg-primario-700 font-semibold text-white',
                    !seleccionado && disponible && 'font-medium text-tinta hover:bg-primario-50',
                    !disponible && 'text-tinta-tenue/50',
                    esHoy && !seleccionado && 'ring-1 ring-borde-fuerte',
                  )}
                >
                  {celda.dia}
                  {disponible && !seleccionado && (
                    <span aria-hidden="true" className="absolute bottom-1 h-1 w-1 rounded-full bg-primario-500" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-tinta-tenue">
        {disponiblesEnMes === 0
          ? 'Este mes no tiene horas disponibles. Prueba el siguiente.'
          : `${disponiblesEnMes} ${disponiblesEnMes === 1 ? 'día con horas disponibles' : 'días con horas disponibles'} este mes. Los días marcados con un punto tienen horas libres.`}
      </p>
    </div>
  );
}

function IconoFlecha({ direccion }: { direccion: 'izq' | 'der' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {direccion === 'izq' ? <path d="m15 6-6 6 6 6" /> : <path d="m9 6 6 6-6 6" />}
    </svg>
  );
}

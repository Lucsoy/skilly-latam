import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type MutableRefObject,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

interface PropsComunes {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  /** Texto pequeño a la derecha de la etiqueta, ej. "Opcional". */
  nota?: string;
}

const claseControl =
  'w-full rounded-xl border bg-superficie px-3.5 py-2.5 text-base text-tinta placeholder:text-tinta-tenue min-h-[44px] transition-colors focus:border-primario-500 disabled:bg-crema disabled:text-tinta-suave';

// Control con espacio superior para acomodar la etiqueta flotante.
const claseControlFlotante =
  'control w-full rounded-xl border bg-superficie px-3.5 pt-6 pb-2 text-base text-tinta min-h-[56px] transition-colors focus:border-primario-500 disabled:bg-crema disabled:text-tinta-suave';

function describedBy(id: string, error?: string, ayuda?: string): string | undefined {
  if (error) return `${id}-error`;
  if (ayuda) return `${id}-ayuda`;
  return undefined;
}

function PieCampo({ id, error, ayuda }: { id: string; error?: string; ayuda?: string }) {
  if (error) {
    return (
      <p id={`${id}-error`} role="alert" className="text-sm text-peligro-600">
        {error}
      </p>
    );
  }
  if (ayuda) {
    return (
      <p id={`${id}-ayuda`} className="text-sm text-tinta-suave">
        {ayuda}
      </p>
    );
  }
  return null;
}

// Etiqueta clásica arriba del control (para el dropdown personalizado).
// ---------------------------------------------------------------------------

type PropsCampoTexto = PropsComunes & InputHTMLAttributes<HTMLInputElement>;

export const CampoTexto = forwardRef<HTMLInputElement, PropsCampoTexto>(function CampoTexto(
  { etiqueta, ayuda, error, nota, id, className, placeholder, ...resto },
  ref,
) {
  const generado = useId();
  const idFinal = id ?? generado;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="campo-flotante">
        <input
          ref={ref}
          id={idFinal}
          // Placeholder no vacío para que funcione :placeholder-shown; queda
          // oculto por CSS hasta que el campo recibe foco.
          placeholder={placeholder ?? ' '}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(idFinal, error, ayuda)}
          className={cn(claseControlFlotante, error ? 'border-peligro-600' : 'border-borde-fuerte', className)}
          {...resto}
        />
        <label htmlFor={idFinal} className="etiqueta-flotante">
          {etiqueta}
        </label>
        {nota && <span className="nota-flotante">{nota}</span>}
      </div>
      <PieCampo id={idFinal} error={error} ayuda={ayuda} />
    </div>
  );
});

// ---------------------------------------------------------------------------

type PropsCampoTextarea = PropsComunes &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    /** Muestra contador "n / máximo" cuando se define. */
    maximo?: number;
    valorActual?: string;
  };

export const CampoTextarea = forwardRef<HTMLTextAreaElement, PropsCampoTextarea>(function CampoTextarea(
  { etiqueta, ayuda, error, nota, id, className, maximo, valorActual, placeholder, ...resto },
  ref,
) {
  const generado = useId();
  const idFinal = id ?? generado;
  const largo = valorActual?.length ?? 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="campo-flotante">
        <textarea
          ref={ref}
          id={idFinal}
          placeholder={placeholder ?? ' '}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(idFinal, error, ayuda)}
          maxLength={maximo}
          className={cn(
            claseControlFlotante,
            'min-h-[110px] resize-y',
            error ? 'border-peligro-600' : 'border-borde-fuerte',
            className,
          )}
          {...resto}
        />
        <label htmlFor={idFinal} className="etiqueta-flotante">
          {etiqueta}
        </label>
        {nota && <span className="nota-flotante">{nota}</span>}
      </div>
      <div className="flex items-center justify-between gap-2">
        <PieCampo id={idFinal} error={error} ayuda={ayuda} />
        {maximo !== undefined && (
          <span
            className={cn('ml-auto text-xs', largo >= maximo ? 'text-peligro-600' : 'text-tinta-tenue')}
            aria-live="polite"
          >
            {largo} / {maximo}
          </span>
        )}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------

type PropsCampoSelect = PropsComunes &
  SelectHTMLAttributes<HTMLSelectElement> & {
    opciones: Array<{ valor: string; etiqueta: string }>;
    placeholder?: string;
  };

/**
 * Dropdown personalizado.
 *
 * Mantiene un <select> nativo oculto que recibe el `ref` y los handlers de
 * react-hook-form (`register`), de modo que sigue siendo un reemplazo directo
 * de CampoSelect. El menú visible es propio para poder animar la apertura y
 * las opciones (hover que crece y se desplaza a la derecha), algo imposible
 * con el desplegable del sistema operativo.
 */
export const CampoSelect = forwardRef<HTMLSelectElement, PropsCampoSelect>(function CampoSelect(
  { etiqueta, ayuda, error, nota, id, className, opciones, placeholder, onChange, disabled, ...resto },
  refExterno,
) {
  const generado = useId();
  const idFinal = id ?? generado;
  const idLista = `${idFinal}-lista`;

  const refSelect = useRef<HTMLSelectElement | null>(null);
  const refDisparador = useRef<HTMLButtonElement | null>(null);
  const refContenedor = useRef<HTMLDivElement | null>(null);

  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState('');
  const [indiceActivo, setIndiceActivo] = useState(-1);

  const asignarRef = useCallback(
    (node: HTMLSelectElement | null) => {
      refSelect.current = node;
      if (typeof refExterno === 'function') refExterno(node);
      else if (refExterno) (refExterno as MutableRefObject<HTMLSelectElement | null>).current = node;
    },
    [refExterno],
  );

  // Refleja en el estado local el valor inicial que react-hook-form haya
  // fijado sobre el select tras montar.
  useEffect(() => {
    if (refSelect.current) setValor(refSelect.current.value);
  }, []);

  // Escribe el valor en el select nativo y dispara los eventos que espera
  // react-hook-form (change para el valor, focusout para marcar "tocado").
  const elegir = useCallback(
    (nuevo: string) => {
      const sel = refSelect.current;
      if (sel) {
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
        setter?.call(sel, nuevo);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        sel.dispatchEvent(new Event('focusout', { bubbles: true }));
      }
      setAbierto(false);
      refDisparador.current?.focus();
    },
    [],
  );

  // Cierre al hacer clic fuera.
  useEffect(() => {
    if (!abierto) return;
    function alClic(e: MouseEvent) {
      if (refContenedor.current && !refContenedor.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', alClic);
    return () => document.removeEventListener('mousedown', alClic);
  }, [abierto]);

  const indiceSeleccionado = opciones.findIndex((o) => o.valor === valor);

  function abrir() {
    setIndiceActivo(indiceSeleccionado >= 0 ? indiceSeleccionado : 0);
    setAbierto(true);
  }

  function alTeclado(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (!abierto) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIndiceActivo((i) => Math.min(i + 1, opciones.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setIndiceActivo((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setIndiceActivo(0);
        break;
      case 'End':
        e.preventDefault();
        setIndiceActivo(opciones.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (opciones[indiceActivo]) elegir(opciones[indiceActivo].valor);
        break;
      case 'Escape':
        e.preventDefault();
        setAbierto(false);
        break;
      case 'Tab':
        setAbierto(false);
        break;
    }
  }

  const opcionActual = opciones.find((o) => o.valor === valor);
  const textoDisparador = opcionActual?.etiqueta ?? placeholder ?? 'Selecciona una opción';
  const errorId = error ? `${idFinal}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label id={`${idFinal}-etiqueta`} htmlFor={`${idFinal}-boton`} className="text-sm font-medium text-tinta">
        {etiqueta}
      </label>
      {nota && <span className="-mt-1 text-xs text-tinta-tenue">{nota}</span>}

      {/* Select nativo oculto: fuente de verdad para react-hook-form. */}
      <select
        ref={asignarRef}
        id={idFinal}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          setValor(e.target.value);
          onChange?.(e);
        }}
        {...resto}
      >
        <option value="">{placeholder ?? ''}</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>

      <div ref={refContenedor} className="relative">
        <button
          ref={refDisparador}
          type="button"
          id={`${idFinal}-boton`}
          disabled={disabled}
          onClick={() => (abierto ? setAbierto(false) : abrir())}
          onKeyDown={alTeclado}
          aria-haspopup="listbox"
          aria-expanded={abierto}
          aria-controls={idLista}
          aria-labelledby={`${idFinal}-etiqueta ${idFinal}-boton`}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId ?? (ayuda ? `${idFinal}-ayuda` : undefined)}
          className={cn(
            claseControl,
            'flex items-center justify-between gap-2 text-left',
            !opcionActual && 'text-tinta-tenue',
            error ? 'border-peligro-600' : 'border-borde-fuerte',
            className,
          )}
        >
          <span className="truncate">{textoDisparador}</span>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-tinta-tenue transition-transform duration-200', abierto && 'rotate-180')}
            aria-hidden="true"
          />
        </button>

        <ul
          id={idLista}
          role="listbox"
          aria-labelledby={`${idFinal}-etiqueta`}
          data-abierto={abierto}
          className="menu-opciones absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 max-h-64 overflow-auto rounded-xl border border-borde-fuerte bg-superficie p-1.5 shadow-suave"
        >
          {opciones.map((o, i) => {
            const seleccionada = o.valor === valor;
            return (
              <li
                key={o.valor}
                role="option"
                aria-selected={seleccionada}
                data-activo={i === indiceActivo}
                onMouseEnter={() => setIndiceActivo(i)}
                onClick={() => elegir(o.valor)}
                className={cn(
                  'opcion-menu flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-base',
                  i === indiceActivo ? 'bg-primario-50 text-primario-800' : 'text-tinta',
                  seleccionada && 'font-medium',
                )}
              >
                <span className="truncate">{o.etiqueta}</span>
                {seleccionada && <span aria-hidden="true" className="text-primario-600">✓</span>}
              </li>
            );
          })}
        </ul>
      </div>

      <PieCampo id={idFinal} error={error} ayuda={ayuda} />
    </div>
  );
});

// ---------------------------------------------------------------------------

type PropsCampoCheckbox = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  etiqueta: ReactNode;
  error?: string;
};

export const CampoCheckbox = forwardRef<HTMLInputElement, PropsCampoCheckbox>(function CampoCheckbox(
  { etiqueta, error, id, className, ...resto },
  ref,
) {
  const generado = useId();
  const idFinal = id ?? generado;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={idFinal} className={cn('flex cursor-pointer items-start gap-3 text-sm text-tinta', className)}>
        <input
          ref={ref}
          id={idFinal}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${idFinal}-error` : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-borde-fuerte text-primario-600 focus:ring-primario-500"
          {...resto}
        />
        <span>{etiqueta}</span>
      </label>
      {error && (
        <p id={`${idFinal}-error`} role="alert" className="text-sm text-peligro-600">
          {error}
        </p>
      )}
    </div>
  );
});

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Boton, type VarianteBoton } from './Boton';

interface Props {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  /** Pie personalizado. Si no se entrega, se muestran los botones de confirmar/cancelar. */
  pie?: ReactNode;
  textoConfirmar?: string;
  textoCancelar?: string;
  varianteConfirmar?: VarianteBoton;
  onConfirmar?: () => void;
  confirmando?: boolean;
  confirmarDeshabilitado?: boolean;
}

/**
 * Diálogo modal sobre <dialog> nativo: trae foco atrapado, cierre con Escape y
 * semántica accesible sin dependencias.
 */
export function Dialogo({
  abierto,
  titulo,
  onCerrar,
  children,
  pie,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Volver',
  varianteConfirmar = 'primario',
  onConfirmar,
  confirmando = false,
  confirmarDeshabilitado = false,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (abierto && !el.open) el.showModal();
    if (!abierto && el.open) el.close();
  }, [abierto]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const manejarCancelar = (evento: Event) => {
      evento.preventDefault();
      if (!confirmando) onCerrar();
    };
    el.addEventListener('cancel', manejarCancelar);
    return () => el.removeEventListener('cancel', manejarCancelar);
  }, [onCerrar, confirmando]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      className="w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-borde bg-superficie p-0 text-tinta shadow-suave backdrop:bg-tinta/40"
      onClick={(e) => {
        // Clic en el fondo cierra (el contenido detiene la propagación).
        if (e.target === ref.current && !confirmando) onCerrar();
      }}
    >
      <div className="p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <h2 id={idTitulo} className="text-lg font-semibold">
          {titulo}
        </h2>
        <div className="mt-3 text-sm text-tinta-suave">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {pie ?? (
            <>
              <Boton variante="secundario" onClick={onCerrar} disabled={confirmando}>
                {textoCancelar}
              </Boton>
              {onConfirmar && (
                <Boton variante={varianteConfirmar} onClick={onConfirmar} cargando={confirmando} disabled={confirmarDeshabilitado}>
                  {textoConfirmar}
                </Boton>
              )}
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}

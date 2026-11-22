import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

interface Props {
  /** ISO 8601 del vencimiento de la retención. */
  expiraEn: string;
  onExpirar: () => void;
  className?: string;
}

function restante(expiraEn: string): number {
  return Math.max(0, Math.floor((new Date(expiraEn).getTime() - Date.now()) / 1000));
}

function formatear(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Cuenta regresiva discreta de la retención del bloque. Avisa por lector de
 * pantalla solo en hitos (5, 2 y 1 minutos) para no interrumpir cada segundo.
 */
export function CuentaRegresiva({ expiraEn, onExpirar, className }: Props) {
  const [segundos, setSegundos] = useState(() => restante(expiraEn));
  const [anuncio, setAnuncio] = useState('');
  const expiradoRef = useRef(false);
  const onExpirarRef = useRef(onExpirar);
  onExpirarRef.current = onExpirar;

  useEffect(() => {
    expiradoRef.current = false;
    setSegundos(restante(expiraEn));
    const id = setInterval(() => {
      const r = restante(expiraEn);
      setSegundos(r);
      if (r === 300 || r === 120) setAnuncio(`Te quedan ${r / 60} minutos para completar la reserva.`);
      if (r === 60) setAnuncio('Te queda 1 minuto para completar la reserva.');
      if (r === 0 && !expiradoRef.current) {
        expiradoRef.current = true;
        clearInterval(id);
        onExpirarRef.current();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiraEn]);

  const urgente = segundos <= 120;

  return (
    <>
      <p
        role="timer"
        aria-label={`Horario reservado para ti durante ${formatear(segundos)} más`}
        className={cn(
          'inline-flex items-center gap-1.5 text-xs tabular-nums',
          urgente ? 'font-medium text-aviso-700' : 'text-tinta-suave',
          className,
        )}
      >
        <IconoReloj />
        Horario reservado para ti por <span className="font-semibold">{formatear(segundos)}</span>
      </p>
      <span className="sr-only" aria-live="polite">
        {anuncio}
      </span>
    </>
  );
}

function IconoReloj() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

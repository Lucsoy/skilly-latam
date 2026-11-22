import { useEffect, useRef, useState, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type PropsRevelar = HTMLAttributes<HTMLDivElement> & {
  /**
   * Retraso en milisegundos para animaciones escalonadas. Alternativa
   * programática a las clases `delay-100` / `delay-200`.
   */
  retraso?: number;
  /** Umbral de visibilidad para disparar la animación (0 a 1). */
  umbral?: number;
};

/**
 * Envuelve contenido con un efecto de scroll reveal: arranca con opacity 0 y
 * un leve desplazamiento hacia abajo, y al entrar en el viewport transiciona
 * suavemente con la curva de aceleración personalizada (var --ease-suave).
 *
 * Para una cascada, agrega clases `delay-100`, `delay-200`, ... a elementos
 * consecutivos o usa la prop `retraso`.
 */
export function Revelar({ className, retraso, umbral = 0.12, style, children, ...resto }: PropsRevelar) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Sin soporte de IntersectionObserver mostramos el contenido de inmediato.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setVisible(true);
          observador.disconnect();
        }
      },
      { threshold: umbral, rootMargin: '0px 0px -8% 0px' },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, [umbral]);

  return (
    <div
      ref={ref}
      className={cn('revelar', visible && 'es-visible', className)}
      style={retraso ? { transitionDelay: `${retraso}ms`, ...style } : style}
      {...resto}
    >
      {children}
    </div>
  );
}

import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useSesion } from '@/modules/auth/sesionStore';
import { obtenerConfiguracion } from '@/services/configuracion';

export function App() {
  const restaurar = useSesion((s) => s.restaurar);

  useEffect(() => {
    // Carga la configuración de plataforma y recupera la sesión guardada.
    void obtenerConfiguracion();
    void restaurar();
  }, [restaurar]);

  useEffect(() => {
    // Luz ambiental que sigue al cursor por toda la aplicación.
    // El destino sigue al mouse y la luz lo alcanza con una pequeña inercia,
    // para que se sienta como un halo y no como un punto pegado al puntero.
    let raf = 0;
    let objetivoX = window.innerWidth * 0.5;
    let objetivoY = window.innerHeight * 0.35;
    let x = objetivoX;
    let y = objetivoY;

    const pintar = () => {
      x += (objetivoX - x) * 0.16;
      y += (objetivoY - y) * 0.16;

      document.documentElement.style.setProperty('--skilly-mouse-x', `${x}px`);
      document.documentElement.style.setProperty('--skilly-mouse-y', `${y}px`);

      raf = window.requestAnimationFrame(pintar);
    };

    const mover = (evento: PointerEvent) => {
      objetivoX = evento.clientX;
      objetivoY = evento.clientY;
    };

    window.addEventListener('pointermove', mover, { passive: true });
    raf = window.requestAnimationFrame(pintar);

    return () => {
      window.removeEventListener('pointermove', mover);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return <RouterProvider router={router} />;
}

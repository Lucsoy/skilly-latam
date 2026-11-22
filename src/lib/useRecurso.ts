import { useCallback, useEffect, useRef, useState } from 'react';
import { mensajeParaUsuario } from '@/services/errores';

export interface Recurso<T> {
  datos: T | null;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  /** Reemplaza los datos en memoria sin volver a pedirlos al servicio. */
  establecer: (datos: T) => void;
}

/**
 * Carga un recurso asíncrono con estados de carga y error.
 * Descarta respuestas que llegan fuera de orden, algo posible con la latencia
 * aleatoria de la capa mock y con cualquier backend real.
 */
export function useRecurso<T>(cargar: () => Promise<T>, deps: unknown[]): Recurso<T> {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const peticion = useRef(0);
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;

  useEffect(() => {
    const actual = ++peticion.current;
    setCargando(true);
    setError(null);
    cargarRef
      .current()
      .then((resultado) => {
        if (peticion.current !== actual) return;
        setDatos(resultado);
        setCargando(false);
      })
      .catch((e) => {
        if (peticion.current !== actual) return;
        setError(mensajeParaUsuario(e));
        setCargando(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, intento]);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);
  const establecer = useCallback((nuevos: T) => setDatos(nuevos), []);

  return { datos, cargando, error, recargar, establecer };
}

/** Retrasa la propagación de un valor; útil para no buscar en cada tecla. */
export function useRetardo<T>(valor: T, ms = 350): T {
  const [retrasado, setRetrasado] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setRetrasado(valor), ms);
    return () => clearTimeout(id);
  }, [valor, ms]);
  return retrasado;
}

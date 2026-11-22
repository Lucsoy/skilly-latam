import { EstadoVacio } from '@/components/ui';

/** Marcador temporal para rutas cuyo módulo se construye en un bloque posterior. */
export function PaginaEnConstruccion({ nombre }: { nombre: string }) {
  return (
    <EstadoVacio
      titulo={`${nombre}: en construcción`}
      descripcion="Esta pantalla se construye en un bloque posterior del plan de trabajo."
    />
  );
}

export function PaginaNoEncontrada() {
  return (
    <EstadoVacio
      titulo="No encontramos esta página"
      descripcion="Puede que el enlace esté mal escrito o que la página ya no exista."
    />
  );
}

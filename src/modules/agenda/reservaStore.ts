import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BloqueDisponible, Modalidad, RetencionBloque } from '@/types';

/**
 * Reserva en curso: lo que la organización va eligiendo entre el calendario y
 * la confirmación. Vive en sessionStorage para sobrevivir a una recarga sin
 * quedar colgado entre sesiones distintas del navegador.
 *
 * La retención real del bloque la controla el backend (aquí, el mock). Este
 * store solo recuerda cuál es y cuándo vence para mostrar la cuenta regresiva.
 */
interface EstadoReservaEnCurso {
  servicioId: string | null;
  bloque: BloqueDisponible | null;
  retencion: RetencionBloque | null;
  modalidad: Modalidad | null;
  mensaje: string;
  /** true cuando la retención venció y todavía no se avisó a la persona. */
  expirada: boolean;

  seleccionar: (servicioId: string, bloque: BloqueDisponible, retencion: RetencionBloque, modalidad: Modalidad) => void;
  establecerModalidad: (modalidad: Modalidad) => void;
  establecerMensaje: (mensaje: string) => void;
  marcarExpirada: () => void;
  descartarAvisoExpiracion: () => void;
  limpiar: () => void;
}

const VACIO = {
  servicioId: null,
  bloque: null,
  retencion: null,
  modalidad: null,
  mensaje: '',
  expirada: false,
};

export const useReservaEnCurso = create<EstadoReservaEnCurso>()(
  persist(
    (set) => ({
      ...VACIO,

      seleccionar: (servicioId, bloque, retencion, modalidad) =>
        set((s) => ({
          servicioId,
          bloque,
          retencion,
          // Se conserva la modalidad y el mensaje si la persona solo cambió de horario.
          modalidad: s.servicioId === servicioId && s.modalidad ? s.modalidad : modalidad,
          mensaje: s.servicioId === servicioId ? s.mensaje : '',
          expirada: false,
        })),

      establecerModalidad: (modalidad) => set({ modalidad }),
      establecerMensaje: (mensaje) => set({ mensaje }),

      marcarExpirada: () => set({ bloque: null, retencion: null, expirada: true }),
      descartarAvisoExpiracion: () => set({ expirada: false }),

      limpiar: () => set({ ...VACIO }),
    }),
    {
      name: 'skilly.reserva-en-curso.v1',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

/** true si la retención guardada sigue vigente en este instante. */
export function retencionVigente(retencion: RetencionBloque | null, ahora: Date = new Date()): boolean {
  return Boolean(retencion && new Date(retencion.expiraEn) > ahora);
}

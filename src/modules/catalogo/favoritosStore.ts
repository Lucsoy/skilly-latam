import { create } from 'zustand';
import * as favoritos from '@/services/favoritos';

interface EstadoFavoritos {
  ids: string[];
  cargado: boolean;
  /** Ids con una operación en curso, para deshabilitar el botón mientras responde. */
  enProceso: string[];
  cargar: () => Promise<void>;
  alternar: (servicioId: string) => Promise<boolean>;
  limpiar: () => void;
}

export const useFavoritos = create<EstadoFavoritos>((set, get) => ({
  ids: [],
  cargado: false,
  enProceso: [],

  cargar: async () => {
    if (get().cargado) return;
    try {
      const ids = await favoritos.listarFavoritos();
      set({ ids, cargado: true });
    } catch {
      // Los favoritos son accesorios: si fallan, la búsqueda sigue funcionando.
      set({ cargado: true });
    }
  },

  alternar: async (servicioId) => {
    set((s) => ({ enProceso: [...s.enProceso, servicioId] }));
    try {
      const { esFavorito, favoritos: ids } = await favoritos.alternarFavorito(servicioId);
      set({ ids });
      return esFavorito;
    } finally {
      set((s) => ({ enProceso: s.enProceso.filter((id) => id !== servicioId) }));
    }
  },

  limpiar: () => set({ ids: [], cargado: false, enProceso: [] }),
}));

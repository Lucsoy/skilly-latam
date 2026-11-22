import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Organizacion, Profesional, Rol, Sesion, Usuario } from '@/types';
import * as auth from '@/services/auth';
import { establecerSesion, sesionActual } from '@/services/sesionActual';

interface EstadoSesion {
  usuario: Usuario | null;
  organizacion: Organizacion | null;
  profesional: Profesional | null;
  token: string | null;
  /** true mientras se restaura la sesión guardada al cargar la app. */
  restaurando: boolean;
  iniciarSesion: (credenciales: auth.CredencialesIngreso) => Promise<Sesion>;
  registrar: (datos: auth.DatosRegistroOrganizacion) => Promise<Sesion>;
  registrarProfesional: (datos: auth.DatosRegistroProfesional) => Promise<Sesion>;
  cerrarSesion: () => Promise<void>;
  restaurar: () => Promise<void>;
  actualizarOrganizacion: (organizacion: Organizacion) => void;
  actualizarProfesional: (profesional: Profesional) => void;
}

function aEstado(sesion: Sesion) {
  return {
    usuario: sesion.usuario,
    organizacion: sesion.organizacion,
    profesional: sesion.profesional,
    token: sesion.token,
  };
}

const SIN_SESION = { usuario: null, organizacion: null, profesional: null, token: null };

export const useSesion = create<EstadoSesion>()(
  persist(
    (set, get) => ({
      ...SIN_SESION,
      restaurando: true,

      iniciarSesion: async (credenciales) => {
        const sesion = await auth.iniciarSesion(credenciales);
        set(aEstado(sesion));
        return sesion;
      },

      registrar: async (datos) => {
        const sesion = await auth.registrarOrganizacion(datos);
        set(aEstado(sesion));
        return sesion;
      },

      registrarProfesional: async (datos) => {
        const sesion = await auth.registrarProfesional(datos);
        set(aEstado(sesion));
        return sesion;
      },

      cerrarSesion: async () => {
        await auth.cerrarSesion();
        set(SIN_SESION);
      },

      restaurar: async () => {
        const { usuario, token } = get();
        if (!usuario || !token) {
          set({ restaurando: false });
          return;
        }
        const sesion = await auth.restaurarSesion(token);
        if (sesion) set({ ...aEstado(sesion), restaurando: false });
        else set({ ...SIN_SESION, restaurando: false });
      },

      actualizarOrganizacion: (organizacion) => {
        const actual = sesionActual();
        if (actual) establecerSesion({ ...actual, organizacion });
        set({ organizacion });
      },

      actualizarProfesional: (profesional) => {
        const actual = sesionActual();
        if (actual) establecerSesion({ ...actual, profesional });
        set({ profesional });
      },
    }),
    {
      name: 'skilly.sesion.v2',
      partialize: (estado) => ({
        usuario: estado.usuario,
        organizacion: estado.organizacion,
        profesional: estado.profesional,
        token: estado.token,
      }),
    },
  ),
);

const INICIO_POR_ROL: Record<Rol, string> = {
  organizacion: '/buscar',
  profesional: '/profesional',
  administrador: '/admin',
  fundador: '/admin/centro',
};

/** Ruta de inicio según el rol de la sesión. */
export function rutaInicio(usuario: Usuario | null): string {
  return usuario ? INICIO_POR_ROL[usuario.rol] : '/buscar';
}

/** true si una ruta interna corresponde al área del rol (para respetar el "volver a donde ibas"). */
export function rutaPerteneceARol(ruta: string, rol: Rol): boolean {
  const esAdmin = ruta === '/admin' || ruta.startsWith('/admin/');
  const esProfesional = ruta === '/profesional' || ruta.startsWith('/profesional/');
  if (rol === 'administrador' || rol === 'fundador') return esAdmin;
  if (rol === 'profesional') return esProfesional;
  return !esAdmin && !esProfesional;
}

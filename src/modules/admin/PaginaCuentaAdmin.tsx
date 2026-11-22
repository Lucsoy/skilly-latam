import { useSesion } from '@/modules/auth/sesionStore';
import { CambiarContrasena } from '@/components/cuenta/CambiarContrasena';
import { Tarjeta } from '@/components/ui';

/** Datos de la cuenta del administrador o fundador y cambio de contraseña. */
export function PaginaCuentaAdmin() {
  const usuario = useSesion((s) => s.usuario);
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Mi cuenta</h1>
        <p className="mt-1.5 text-sm text-tinta-suave">Tus datos de acceso al panel de Skilly.</p>
      </header>
      <Tarjeta>
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-tinta-tenue">Nombre</dt><dd className="mt-0.5">{usuario?.nombre}</dd></div>
          <div><dt className="text-xs text-tinta-tenue">Correo</dt><dd className="mt-0.5 break-all">{usuario?.email}</dd></div>
          <div><dt className="text-xs text-tinta-tenue">Rol</dt><dd className="mt-0.5">{usuario?.rol === 'fundador' ? 'Fundador/a' : 'Administración'}</dd></div>
        </dl>
      </Tarjeta>
      <CambiarContrasena />
    </div>
  );
}

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { rutaInicio, useSesion } from '@/modules/auth/sesionStore';
import { Cargando } from '@/components/ui';

function Restaurando() {
  return (
    <div className="flex justify-center py-20">
      <Cargando tamano="lg" etiqueta="Recuperando tu sesión" />
    </div>
  );
}

/** Rutas de la organización: exige sesión con rol 'organizacion'. */
export function RequiereSesion() {
  const usuario = useSesion((s) => s.usuario);
  const organizacion = useSesion((s) => s.organizacion);
  const restaurando = useSesion((s) => s.restaurando);
  const ubicacion = useLocation();

  if (restaurando) return <Restaurando />;
  if (!usuario) {
    return <Navigate to="/ingresar" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />;
  }
  if (usuario.rol !== 'organizacion' || !organizacion) {
    return <Navigate to={rutaInicio(usuario)} replace />;
  }
  return <Outlet />;
}

/** Rutas del panel de Skilly: exige rol 'administrador'. */
export function RequiereAdministrador() {
  const usuario = useSesion((s) => s.usuario);
  const restaurando = useSesion((s) => s.restaurando);
  const ubicacion = useLocation();

  if (restaurando) return <Restaurando />;
  if (!usuario) {
    return <Navigate to="/ingresar" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />;
  }
  if (usuario.rol !== 'administrador' && usuario.rol !== 'fundador') {
    return <Navigate to={rutaInicio(usuario)} replace />;
  }
  // Con la contraseña inicial publicada, la API solo permite cambiarla (T-07):
  // la interfaz lleva directo a "Mi cuenta" en vez de mostrar pantallas que fallarían.
  if (usuario.debeCambiarContrasena && ubicacion.pathname !== '/admin/cuenta') {
    return <Navigate to="/admin/cuenta" replace />;
  }
  return <Outlet />;
}


/** Rutas sensibles del panel: solo cuentas fundadoras. */
export function RequiereFundador() {
  const usuario = useSesion((s) => s.usuario);
  const restaurando = useSesion((s) => s.restaurando);
  const ubicacion = useLocation();

  if (restaurando) return <Restaurando />;
  if (!usuario) {
    return <Navigate to="/ingresar" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />;
  }
  if (usuario.rol !== 'fundador') {
    return <Navigate to="/admin" replace />;
  }
  return <Outlet />;
}

/** Rutas del profesional: exige rol 'profesional'. */
export function RequiereProfesional() {
  const usuario = useSesion((s) => s.usuario);
  const profesional = useSesion((s) => s.profesional);
  const restaurando = useSesion((s) => s.restaurando);
  const ubicacion = useLocation();

  if (restaurando) return <Restaurando />;
  if (!usuario) {
    return <Navigate to="/ingresar" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />;
  }
  if (usuario.rol !== 'profesional' || !profesional) {
    return <Navigate to={rutaInicio(usuario)} replace />;
  }
  return <Outlet />;
}

/** Para /ingresar y /registro: si ya hay sesión, va directo a su inicio. */
export function SoloSinSesion() {
  const usuario = useSesion((s) => s.usuario);
  const restaurando = useSesion((s) => s.restaurando);
  if (restaurando) return null;
  if (usuario) return <Navigate to={rutaInicio(usuario)} replace />;
  return <Outlet />;
}

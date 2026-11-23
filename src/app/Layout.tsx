import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTituloPagina } from './tituloPagina';
import { cn } from '@/lib/cn';
import { rutaInicio, useSesion } from '@/modules/auth/sesionStore';
import { useFavoritos } from '@/modules/catalogo/favoritosStore';
import { Boton, Insignia } from '@/components/ui';
import { LayoutProfesional } from '@/modules/profesional/components/LayoutProfesional';
import { Logo } from './Logo';

interface Enlace {
  a: string;
  texto: string;
  /** true si solo debe marcarse activo con la ruta exacta (ej. /admin). */
  exacto?: boolean;
}

const ENLACES_ORGANIZACION: Enlace[] = [
  { a: '/buscar', texto: 'Buscar profesionales' },
  { a: '/mis-servicios', texto: 'Mis servicios' },
  { a: '/favoritos', texto: 'Favoritos' },
  { a: '/perfil', texto: 'Mi organización' },
];

const ENLACES_ADMIN: Enlace[] = [
  { a: '/admin', texto: 'Resumen', exacto: true },
  { a: '/admin/reservas', texto: 'Reservas' },
  { a: '/admin/solicitudes', texto: 'Solicitudes' },
  { a: '/admin/profesionales', texto: 'Profesionales' },
  { a: '/admin/organizaciones', texto: 'Organizaciones' },
  { a: '/admin/moderacion', texto: 'Moderación' },
];

const ENLACES_FUNDADOR: Enlace[] = [
  { a: '/admin/centro', texto: 'Centro de mando', exacto: true },
  ...ENLACES_ADMIN,
  { a: '/admin/administradores', texto: 'Administradores' },
  { a: '/admin/configuracion', texto: 'Configuración' },
];

export { Logo };

export function Layout() {
  useTituloPagina();
  const usuario = useSesion((s) => s.usuario);
  const organizacion = useSesion((s) => s.organizacion);
  const cerrarSesion = useSesion((s) => s.cerrarSesion);
  const limpiarFavoritos = useFavoritos((s) => s.limpiar);
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const esAdmin = usuario?.rol === 'administrador' || usuario?.rol === 'fundador';
  const esFundador = usuario?.rol === 'fundador';
  const enlaces = esFundador ? ENLACES_FUNDADOR : esAdmin ? ENLACES_ADMIN : ENLACES_ORGANIZACION;
  const nombreCuenta = esAdmin ? usuario?.nombre : organizacion?.razonSocial;

  const salir = async () => {
    await cerrarSesion();
    // Los favoritos son por organización: no deben quedar en memoria tras salir.
    limpiarFavoritos();
    setMenuAbierto(false);
    navegar('/ingresar');
  };

  // El profesional tiene su propio espacio: sidebar en escritorio y barra inferior en móvil.
  if (usuario?.rol === 'profesional') {
    return <LayoutProfesional onSalir={salir} />;
  }

  const claseEnlace = (activo: boolean) =>
    cn(
      'shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      activo ? 'bg-primario-400 text-carbon' : 'text-white/85 hover:bg-white/10 hover:text-white',
    );

  return (
    <div className={cn('flex min-h-screen flex-col', esFundador && 'layout-fundador') }>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-superficie focus:px-3 focus:py-2">
        Ir al contenido
      </a>
      <header className={cn('site-header sticky top-0 z-40 border-b border-tinta-suave bg-tinta/95 text-white shadow-md backdrop-blur', esFundador && 'header-fundador') }>
        <div className={cn('site-header__inner mx-auto flex h-[4.5rem] items-center justify-between gap-4 px-4 sm:px-6', esAdmin ? 'max-w-screen-2xl' : 'max-w-6xl')}>
          <Link to={rutaInicio(usuario)} className="site-header__brand flex shrink-0 items-center gap-2 rounded-lg text-white">
            <Logo />
            {esFundador ? <Insignia tono="primario">Fundadoras</Insignia> : esAdmin ? <Insignia tono="primario">Administración</Insignia> : null}
          </Link>

          {usuario ? (
            <>
              {/* Con muchos enlaces (cuenta fundadora) el menú se desplaza dentro de la barra en vez de desbordar la página. */}
              <nav aria-label="Principal" className="site-header__nav hidden min-w-0 items-center gap-1 overflow-x-auto xl:flex">
                {enlaces.map((e) => (
                  <NavLink key={e.a} to={e.a} end={e.exacto} className={({ isActive }) => claseEnlace(isActive)}>
                    {e.texto}
                  </NavLink>
                ))}
              </nav>
              <div className="site-header__account hidden shrink-0 items-center gap-3 xl:flex">
                <Link
                  to={esAdmin ? '/admin/cuenta' : '/perfil'}
                  className="max-w-[160px] truncate text-sm text-white/80 underline-offset-2 hover:text-white hover:underline"
                  title={`${nombreCuenta ?? ''} · Mi cuenta`}
                >
                  {nombreCuenta}
                </Link>
                <Boton variante="fantasma" tamano="sm" onClick={salir}>
                  Salir
                </Boton>
              </div>
              <button
                type="button"
                className="site-header__menu-button inline-flex h-11 w-11 items-center justify-center rounded-lg text-white hover:bg-white/10 xl:hidden"
                aria-expanded={menuAbierto}
                aria-controls="menu-movil"
                aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
                onClick={() => setMenuAbierto((v) => !v)}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  {menuAbierto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
                </svg>
              </button>
            </>
          ) : (
            <div className="site-header__guest-actions flex items-center gap-2">
              <Link to="/buscar" className="rounded-lg px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">
                Ver vitrina
              </Link>
              <Link to="/ingresar" className="rounded-lg px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">
                Ingresar
              </Link>
              <Link to="/registro" className="rounded-xl bg-primario-700 px-4 py-2 text-sm font-medium text-white hover:bg-primario-800">
                Crear cuenta
              </Link>
            </div>
          )}
        </div>

        {usuario && menuAbierto && (
          <nav id="menu-movil" aria-label="Principal" className="border-t border-white/10 bg-tinta px-4 py-3 xl:hidden">
            <ul className="flex flex-col gap-1">
              {enlaces.map((e) => (
                <li key={e.a}>
                  <NavLink
                    to={e.a}
                    end={e.exacto}
                    onClick={() => setMenuAbierto(false)}
                    className={({ isActive }) =>
                      cn('block rounded-lg px-3 py-2.5 text-sm font-medium', isActive ? 'bg-primario-400 text-carbon' : 'text-white/90 hover:bg-white/10')
                    }
                  >
                    {e.texto}
                  </NavLink>
                </li>
              ))}
              <li className="mt-2 border-t border-white/10 pt-2">
                <Link to={esAdmin ? '/admin/cuenta' : '/perfil'} onClick={() => setMenuAbierto(false)} className="block truncate px-3 py-1 text-xs text-white/60 hover:text-white">{nombreCuenta} · Mi cuenta</Link>
                <button type="button" onClick={salir} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white hover:bg-white/10">
                  Salir
                </button>
              </li>
            </ul>
          </nav>
        )}
      </header>

      {ubicacion.pathname === '/ingresar' && (
        <section className="banner-login" aria-label="Espacio de trabajo Skilly">
          <img
            src="/images/skilly-login-banner.jpg"
            alt="Espacio de trabajo luminoso de Skilly"
            className="banner-login__imagen"
            width="1897"
            height="603"
            fetchPriority="high"
          />
        </section>
      )}

      <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 rounded-none bg-crema px-4 py-6 sm:px-6 sm:py-8">
        {usuario?.debeCambiarContrasena && (
          <div role="alert" className="mb-6 rounded-xl border border-peligro-600/30 bg-peligro-50 px-4 py-3 text-sm">
            <strong>Esta cuenta usa la contraseña inicial de instalación.</strong> Es pública en la documentación del
            proyecto, así que debes cambiarla en <Link to="/admin/cuenta" className="font-medium underline">Mi cuenta</Link> antes
            de usar el panel.
          </div>
        )}
        <Outlet />
      </main>

      <footer className="border-t border-tinta bg-tinta text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Skilly · Talent as a Service para Personas y Back Office · Chile</p>
          <p>
            ¿Necesitas ayuda? Escríbenos a <a href="mailto:hola@skilly.cl" className="underline">hola@skilly.cl</a>. Te responde una persona.
          </p>
        </div>
      </footer>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  House,
  Inbox,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Logo } from '@/app/Logo';
import { useSesion } from '@/modules/auth/sesionStore';
import { Avatar } from '@/components/ui';

interface EnlaceProfesional {
  a: string;
  texto: string;
  /** Etiqueta corta para la barra inferior en móvil. */
  corto: string;
  icono: LucideIcon;
  exacto?: boolean;
  /** Aparece en la barra inferior en móvil (máximo 5). */
  principal?: boolean;
}

const ENLACES: EnlaceProfesional[] = [
  { a: '/profesional', texto: 'Inicio', corto: 'Inicio', icono: House, exacto: true, principal: true },
  { a: '/profesional/servicios', texto: 'Mis servicios', corto: 'Servicios', icono: BriefcaseBusiness, principal: true },
  { a: '/profesional/disponibilidad', texto: 'Disponibilidad', corto: 'Agenda', icono: CalendarDays, principal: true },
  { a: '/profesional/solicitudes', texto: 'Solicitudes', corto: 'Solicitudes', icono: Inbox, principal: true },
  { a: '/profesional/ingresos', texto: 'Ingresos', corto: 'Ingresos', icono: Wallet, principal: true },
  { a: '/profesional/reputacion', texto: 'Reputación', corto: 'Reputación', icono: Award },
  { a: '/profesional/perfil', texto: 'Mi perfil', corto: 'Perfil', icono: UserRound },
];

const CLAVE_COLAPSADA = 'skilly.profesional.sidebarColapsada';

function leerColapsada(): boolean {
  try {
    return localStorage.getItem(CLAVE_COLAPSADA) === '1';
  } catch {
    return false;
  }
}

function guardarColapsada(valor: boolean): void {
  try {
    localStorage.setItem(CLAVE_COLAPSADA, valor ? '1' : '0');
  } catch {
    // Preferencia visual: si no se puede guardar, no pasa nada.
  }
}

/**
 * Espacio propio del profesional. En escritorio, sidebar colapsable; en móvil,
 * barra superior con menú de cuenta y barra inferior con las 5 secciones
 * principales.
 */
export function LayoutProfesional({ onSalir }: { onSalir: () => void }) {
  const profesional = useSesion((s) => s.profesional);
  const [colapsada, setColapsada] = useState(leerColapsada);
  const [menuCuenta, setMenuCuenta] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const ubicacion = useLocation();

  // Al navegar se cierra el menú de cuenta en móvil.
  useEffect(() => setMenuCuenta(false), [ubicacion.pathname]);

  useEffect(() => {
    if (!menuCuenta) return;
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && setMenuCuenta(false);
    const alHacerClic = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuCuenta(false);
    };
    document.addEventListener('keydown', alPresionar);
    document.addEventListener('mousedown', alHacerClic);
    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.removeEventListener('mousedown', alHacerClic);
    };
  }, [menuCuenta]);

  const alternarColapsada = () => {
    setColapsada((v) => {
      guardarColapsada(!v);
      return !v;
    });
  };

  const nombre = profesional ? `${profesional.nombre} ${profesional.apellido}` : '';
  const validado = profesional?.validadoPorSkilly ?? false;

  return (
    <div className="flex min-h-screen bg-crema">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-superficie focus:px-3 focus:py-2">
        Ir al contenido
      </a>

      {/* Sidebar de escritorio */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-borde bg-superficie transition-[width] duration-200 md:flex',
          colapsada ? 'w-[76px]' : 'w-64',
        )}
      >
        <div className={cn('flex h-16 items-center border-b border-borde', colapsada ? 'justify-center' : 'justify-between px-5')}>
          <Link to="/profesional" className="rounded-lg">
            <Logo soloIcono={colapsada} />
          </Link>
          {!colapsada && (
            <button
              type="button"
              onClick={alternarColapsada}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-tinta-tenue hover:bg-crema hover:text-tinta"
              aria-label="Contraer menú lateral"
            >
              <PanelLeftClose className="h-5 w-5" aria-hidden />
            </button>
          )}
        </div>

        <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {ENLACES.map(({ a, texto, icono: Icono, exacto }) => (
              <li key={a}>
                <NavLink
                  to={a}
                  end={exacto}
                  title={colapsada ? texto : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                      colapsada && 'justify-center px-0',
                      isActive ? 'bg-primario-50 text-primario-800' : 'text-tinta-suave hover:bg-crema hover:text-tinta',
                    )
                  }
                >
                  <Icono className="h-5 w-5 shrink-0" aria-hidden />
                  <span className={cn(colapsada && 'sr-only')}>{texto}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-borde p-3">
          {colapsada ? (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={alternarColapsada}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-tinta-tenue hover:bg-crema hover:text-tinta"
                aria-label="Expandir menú lateral"
              >
                <PanelLeftOpen className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={onSalir}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-tinta-tenue hover:bg-crema hover:text-tinta"
                aria-label="Salir"
                title="Salir"
              >
                <LogOut className="h-5 w-5" aria-hidden />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              {profesional && <Avatar nombre={profesional.nombre} apellido={profesional.apellido} tamano="sm" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-tinta" title={nombre}>
                  {nombre}
                </p>
                <p className={cn('flex items-center gap-1 text-xs', validado ? 'text-exito-700' : 'text-tinta-tenue')}>
                  {validado && <BadgeCheck className="h-3.5 w-3.5" aria-hidden />}
                  {validado ? 'Validado por Skilly' : 'Perfil en proceso'}
                </p>
              </div>
              <button
                type="button"
                onClick={onSalir}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-tinta-tenue hover:bg-crema hover:text-tinta"
                aria-label="Salir"
                title="Salir"
              >
                <LogOut className="h-5 w-5" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior en móvil */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-borde bg-crema/95 px-4 backdrop-blur md:hidden">
          <Link to="/profesional" className="rounded-lg">
            <Logo />
          </Link>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuCuenta((v) => !v)}
              aria-expanded={menuCuenta}
              aria-controls="menu-cuenta"
              aria-label="Menú de tu cuenta"
              className="flex min-h-[44px] items-center gap-1 rounded-xl px-1"
            >
              {profesional && <Avatar nombre={profesional.nombre} apellido={profesional.apellido} tamano="sm" />}
              <ChevronDown className={cn('h-4 w-4 text-tinta-tenue transition-transform', menuCuenta && 'rotate-180')} aria-hidden />
            </button>
            {menuCuenta && (
              <div
                id="menu-cuenta"
                className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-borde bg-superficie p-2 shadow-suave"
              >
                <p className="truncate px-3 pb-2 pt-1 text-sm font-medium text-tinta">{nombre}</p>
                <ul className="flex flex-col gap-0.5 border-t border-borde pt-2">
                  {ENLACES.filter((e) => !e.principal).map(({ a, texto, icono: Icono }) => (
                    <li key={a}>
                      <NavLink
                        to={a}
                        className={({ isActive }) =>
                          cn(
                            'flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium',
                            isActive ? 'bg-primario-50 text-primario-800' : 'text-tinta',
                          )
                        }
                      >
                        <Icono className="h-5 w-5" aria-hidden />
                        {texto}
                      </NavLink>
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      onClick={onSalir}
                      className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-tinta"
                    >
                      <LogOut className="h-5 w-5" aria-hidden />
                      Salir
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </header>

        <main id="contenido" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-10 md:pt-8">
          <Outlet />
        </main>

        <footer className="hidden border-t border-borde px-6 py-5 text-xs text-tinta-tenue md:block">
          ¿Necesitas ayuda? Escríbenos a{' '}
          <a href="mailto:hola@skilly.cl" className="underline">
            hola@skilly.cl
          </a>
          . Te responde una persona.
        </footer>
      </div>

      {/* Barra inferior en móvil */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-5">
          {ENLACES.filter((e) => e.principal).map(({ a, corto, texto, icono: Icono, exacto }) => (
            <li key={a}>
              <NavLink
                to={a}
                end={exacto}
                aria-label={texto}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium',
                    isActive ? 'text-primario-700' : 'text-tinta-tenue',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                        isActive && 'bg-primario-50',
                      )}
                    >
                      <Icono className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="truncate">{corto}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

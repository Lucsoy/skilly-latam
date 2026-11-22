import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SUFIJO = 'Skilly';

/**
 * Título de la pestaña según la ruta. Se evalúan en orden y gana la primera
 * coincidencia, así que las rutas más específicas van primero.
 */
const TITULOS: Array<[RegExp, string]> = [
  [/^\/ingresar/, 'Ingresar'],
  [/^\/registro\/profesional/, 'Registro de profesional'],
  [/^\/registro/, 'Crear cuenta'],
  [/^\/politica-datos/, 'Política de datos'],
  [/^\/buscar/, 'Buscar profesionales'],
  [/^\/servicios\//, 'Servicio'],
  [/^\/profesionales\//, 'Perfil profesional'],
  [/^\/agendar\/[^/]+\/condiciones/, 'Condiciones de contratación'],
  [/^\/agendar\//, 'Agendar servicio'],
  [/^\/reservas\/[^/]+\/pago/, 'Pago'],
  [/^\/reservas\//, 'Reserva confirmada'],
  [/^\/mis-servicios\/[^/]+\/evaluar/, 'Evaluar profesional'],
  [/^\/mis-servicios\/[^/]+\/chat/, 'Chat'],
  [/^\/mis-servicios\/.+/, 'Seguimiento de contratación'],
  [/^\/mis-servicios/, 'Mis servicios contratados'],
  [/^\/favoritos/, 'Favoritos'],
  [/^\/perfil/, 'Mi organización'],
  [/^\/profesional\/perfil/, 'Mi perfil'],
  [/^\/profesional\/servicios\/nuevo/, 'Nuevo servicio'],
  [/^\/profesional\/servicios\/.+/, 'Editar servicio'],
  [/^\/profesional\/servicios/, 'Mis servicios'],
  [/^\/profesional\/disponibilidad/, 'Disponibilidad'],
  [/^\/profesional\/solicitudes/, 'Solicitudes'],
  [/^\/profesional\/ingresos/, 'Ingresos'],
  [/^\/profesional\/reputacion/, 'Reputación'],
  [/^\/profesional\/?$/, 'Panel profesional'],
  [/^\/admin\/centro/, 'Centro de mando · Admin'],
  [/^\/admin\/reservas/, 'Reservas · Admin'],
  [/^\/admin\/solicitudes/, 'Solicitudes · Admin'],
  [/^\/admin\/profesionales\/.+/, 'Ficha del profesional · Admin'],
  [/^\/admin\/profesionales/, 'Profesionales · Admin'],
  [/^\/admin\/organizaciones/, 'Organizaciones · Admin'],
  [/^\/admin\/moderacion/, 'Moderación · Admin'],
  [/^\/admin\/configuracion/, 'Configuración · Admin'],
  [/^\/admin\/administradores/, 'Administradores · Admin'],
  [/^\/admin\/cuenta/, 'Mi cuenta · Admin'],
  [/^\/admin\/?$/, 'Resumen · Admin'],
];

export function tituloParaRuta(ruta: string): string {
  const encontrado = TITULOS.find(([patron]) => patron.test(ruta));
  return encontrado ? `${encontrado[1]} · ${SUFIJO}` : `${SUFIJO} · Talent as a Service`;
}

/** Actualiza document.title cada vez que cambia la ruta. */
export function useTituloPagina(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = tituloParaRuta(pathname);
  }, [pathname]);
}

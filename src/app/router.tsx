import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import { RequiereAdministrador, RequiereFundador, RequiereProfesional, RequiereSesion, SoloSinSesion } from './RequiereSesion';
import { PaginaRegistroProfesional } from '@/modules/auth/PaginaRegistroProfesional';
import { PaginaNoEncontrada } from './PaginaEnConstruccion';
import { PaginaEvaluar } from '@/modules/agenda/PaginaEvaluar';
import { PaginaIngresar } from '@/modules/auth/PaginaIngresar';
import { PaginaRegistro } from '@/modules/auth/PaginaRegistro';
import { PaginaPoliticaDatos } from '@/modules/auth/PaginaPoliticaDatos';
import { PaginaBuscar } from '@/modules/catalogo/PaginaBuscar';
import { PaginaFavoritos } from '@/modules/catalogo/PaginaFavoritos';
import { PaginaServicio } from '@/modules/catalogo/PaginaServicio';
import { PaginaProfesional } from '@/modules/catalogo/PaginaProfesional';
import { PaginaAgendar } from '@/modules/agenda/PaginaAgendar';
import { PaginaCondiciones } from '@/modules/agenda/PaginaCondiciones';
import { PaginaConfirmacion } from '@/modules/agenda/PaginaConfirmacion';
import { PaginaPago } from '@/modules/agenda/PaginaPago';
import { PaginaMisServicios } from '@/modules/agenda/PaginaMisServicios';
import { PaginaDetalleReserva } from '@/modules/agenda/PaginaDetalleReserva';
import { PaginaChat } from '@/modules/agenda/PaginaChat';
import { PaginaMiOrganizacion } from '@/modules/organizacion/PaginaMiOrganizacion';

import { Cargando } from '@/components/ui';

/**
 * Las áreas de administración y del profesional se cargan bajo demanda (INC-22): una
 * organización que solo busca y contrata no descarga el código de esos paneles.
 */
const areaProfesional = () => import('@/modules/profesional');
const perezosa =
  <M extends Record<string, unknown>>(cargar: () => Promise<M>, nombre: keyof M & string) =>
  async () => ({ Component: (await cargar())[nombre] as React.ComponentType });

function CargandoPagina() {
  return (
    <div className="flex justify-center py-20">
      <Cargando tamano="lg" etiqueta="Cargando" />
    </div>
  );
}

/**
 * Mapa de rutas de la experiencia de la organización.
 *
 *   /ingresar                              Inicio de sesión
 *   /registro                              Registro de organización
 *   /registro/profesional                  Registro de profesional (etapa 1: cuenta)
 *   /politica-datos                        Política de tratamiento de datos (pública)
 *   /buscar                                Catálogo con búsqueda y filtros
 *   /servicios/:servicioId                 Ficha del servicio y del profesional
 *   /profesionales/:profesionalId          Perfil del profesional
 *   /agendar/:servicioId                   Calendario y selección de bloque (retención 10 min)
 *   /agendar/:servicioId/condiciones       Condiciones, aceptación y confirmación
 *   /reservas/:reservaId/confirmacion      Reserva solicitada + contrato
 *   /mis-servicios                         Panel de gestión (próximos / en curso / finalizados)
 *   /mis-servicios/:reservaId              Detalle, historial y acciones de una reserva
 *   /mis-servicios/:reservaId/evaluar      Evaluación del profesional
 *   /favoritos                             Servicios guardados
 *   /perfil                                Datos de la organización
 *
 * Espacio del profesional (rol 'profesional'):
 *   /profesional                           Inicio (dashboard)
 *   /profesional/perfil                    Mi perfil (etapa 2) con vista previa pública
 *   /profesional/servicios                 Mis servicios
 *   /profesional/servicios/nuevo           Publicar un servicio
 *   /profesional/servicios/:servicioId     Editar, pausar o eliminar un servicio
 *   /profesional/disponibilidad            Horario semanal y bloqueos
 *   /profesional/solicitudes               Solicitudes por estado
 *   /profesional/solicitudes/:reservaId    Detalle, historial y acciones (aceptar, iniciar, entregar, reagendar)
 *   /profesional/solicitudes/:reservaId/evaluar  Evaluación de la organización
 *   /profesional/ingresos                  Ingresos con desglose de comisión
 *   /profesional/reputacion                Mi reputación
 *
 * Panel de administración (rol 'administrador'):
 *   /admin                                 Resumen
 *   /admin/reservas                        Todas las reservas con historial
 *   /admin/profesionales                   Profesionales publicados
 *   /admin/profesionales/:id               Ficha completa del profesional y revisión de sus servicios
 *   /admin/organizaciones                  Organizaciones registradas
 *   /admin/moderacion                      Comentarios pendientes de revisión
 *   /admin/configuracion                   Comisión y política de cancelación
 */
export const router = createBrowserRouter([
  {
    element: <Layout />,
    hydrateFallbackElement: <CargandoPagina />,
    children: [
      { path: '/', element: <Navigate to="/buscar" replace /> },
      { path: '/politica-datos', element: <PaginaPoliticaDatos /> },
      {
        element: <SoloSinSesion />,
        children: [
          { path: '/ingresar', element: <PaginaIngresar /> },
          { path: '/registro', element: <PaginaRegistro /> },
          { path: '/registro/profesional', element: <PaginaRegistroProfesional /> },
        ],
      },
      {
        element: <RequiereProfesional />,
        children: [
          { path: '/profesional', lazy: perezosa(areaProfesional, 'Dashboard') },
          { path: '/profesional/perfil', lazy: perezosa(areaProfesional, 'MiPerfil') },
          { path: '/profesional/servicios', lazy: perezosa(areaProfesional, 'MisServicios') },
          { path: '/profesional/servicios/nuevo', lazy: perezosa(areaProfesional, 'NuevoServicio') },
          { path: '/profesional/servicios/:servicioId', lazy: perezosa(areaProfesional, 'EditarServicio') },
          { path: '/profesional/disponibilidad', lazy: perezosa(areaProfesional, 'MiDisponibilidad') },
          { path: '/profesional/solicitudes', lazy: perezosa(areaProfesional, 'MisSolicitudes') },
          { path: '/profesional/solicitudes/:reservaId', lazy: perezosa(areaProfesional, 'DetalleSolicitud') },
          { path: '/profesional/solicitudes/:reservaId/chat', element: <PaginaChat /> },
          { path: '/profesional/solicitudes/:reservaId/evaluar', lazy: perezosa(areaProfesional, 'EvaluarOrganizacion') },
          { path: '/profesional/ingresos', lazy: perezosa(areaProfesional, 'MisIngresos') },
          { path: '/profesional/reputacion', lazy: perezosa(areaProfesional, 'MiReputacion') },
        ],
      },
      // La vitrina es pública: cualquier visitante puede buscar servicios y
      // consultar fichas sin crear una cuenta. Las acciones de contratación
      // siguen protegidas por RequiereSesion más abajo.
      { path: '/buscar', element: <PaginaBuscar /> },
      { path: '/servicios/:servicioId', element: <PaginaServicio /> },
      { path: '/profesionales/:profesionalId', element: <PaginaProfesional /> },
      {
        element: <RequiereSesion />,
        children: [
          { path: '/agendar/:servicioId', element: <PaginaAgendar /> },
          { path: '/agendar/:servicioId/condiciones', element: <PaginaCondiciones /> },
          { path: '/reservas/:reservaId/confirmacion', element: <PaginaConfirmacion /> },
          { path: '/reservas/:reservaId/pago', element: <PaginaPago /> },
          { path: '/mis-servicios', element: <PaginaMisServicios /> },
          { path: '/mis-servicios/:reservaId', element: <PaginaDetalleReserva /> },
          { path: '/mis-servicios/:reservaId/chat', element: <PaginaChat /> },
          { path: '/mis-servicios/:reservaId/evaluar', element: <PaginaEvaluar /> },
          { path: '/favoritos', element: <PaginaFavoritos /> },
          { path: '/perfil', element: <PaginaMiOrganizacion /> },
        ],
      },
      {
        element: <RequiereAdministrador />,
        children: [
          { path: '/admin', lazy: perezosa(() => import('@/modules/admin/PaginaResumenAdmin'), 'PaginaResumenAdmin') },
          { path: '/admin/centro', lazy: perezosa(() => import('@/modules/admin/PaginaCentroFundador'), 'PaginaCentroFundador') },
          { path: '/admin/reservas', lazy: perezosa(() => import('@/modules/admin/PaginaReservasAdmin'), 'PaginaReservasAdmin') },
          { path: '/admin/solicitudes', lazy: perezosa(() => import('@/modules/admin/PaginaSolicitudesAdmin'), 'PaginaSolicitudesAdmin') },
          { path: '/admin/profesionales', lazy: perezosa(() => import('@/modules/admin/PaginaProfesionalesAdmin'), 'PaginaProfesionalesAdmin') },
          { path: '/admin/profesionales/:id', lazy: perezosa(() => import('@/modules/admin/PaginaDetalleProfesionalAdmin'), 'PaginaDetalleProfesionalAdmin') },
          { path: '/admin/cuenta', lazy: perezosa(() => import('@/modules/admin/PaginaCuentaAdmin'), 'PaginaCuentaAdmin') },
          { path: '/admin/organizaciones', lazy: perezosa(() => import('@/modules/admin/PaginaOrganizacionesAdmin'), 'PaginaOrganizacionesAdmin') },
          { path: '/admin/moderacion', lazy: perezosa(() => import('@/modules/admin/PaginaModeracionAdmin'), 'PaginaModeracionAdmin') },
          {
            element: <RequiereFundador />,
            children: [
              { path: '/admin/configuracion', lazy: perezosa(() => import('@/modules/admin/PaginaConfiguracionAdmin'), 'PaginaConfiguracionAdmin') },
              { path: '/admin/administradores', lazy: perezosa(() => import('@/modules/admin/PaginaAdministradoresAdmin'), 'PaginaAdministradoresAdmin') },
            ],
          },
        ],
      },
      { path: '*', element: <PaginaNoEncontrada /> },
    ],
  },
]);

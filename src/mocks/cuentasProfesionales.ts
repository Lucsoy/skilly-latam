import type { PerfilPrivadoProfesional, Profesional } from '@/types';
import type { CuentaMock } from './organizaciones';

/**
 * Cuentas de profesionales para probar la experiencia del profesional.
 *
 *   - Validada:  camila.rojas@ejemplo.cl     / camila2026
 *                Usa la ficha pública de prof-01 (Camila Rojas), que ya existe
 *                en el catálogo con servicios, reservas y evaluaciones.
 *   - Pendiente: valentina.munoz@ejemplo.cl  / valentina2026
 *                Recién registrada: perfil incompleto, sin servicios.
 */

/**
 * Profesional recién registrada. No está en `profesionales.ts` porque esa
 * lista representa a quienes ya están publicados en el catálogo.
 */
export const profesionalPendiente: Profesional = {
  id: 'prof-13',
  nombre: 'Valentina',
  apellido: 'Muñoz Tapia',
  titulo: '',
  ciudad: '',
  presentacion: '',
  formacion: [],
  experiencia: [],
  habilidades: [],
  linkedin: 'https://www.linkedin.com/in/valentina-munoz-ejemplo',
  validadoPorSkilly: false,
  insignias: [],
  fechaIngreso: '2026-09-20T15:40:12.000Z',
};

export const perfilesPrivadosProfesionales: PerfilPrivadoProfesional[] = [
  {
    profesionalId: 'prof-01',
    email: 'camila.rojas@ejemplo.cl',
    areaPrincipal: 'reclutamiento',
    estadoValidacion: 'validado',
    validadoEn: '2024-03-19T13:00:00.000Z',
    documentos: [
      {
        id: 'doc-01',
        tipo: 'curriculum',
        nombreArchivo: 'CV-Camila-Rojas-2024.pdf',
        tamanoBytes: 412_800,
        subidoEn: '2024-03-12T12:05:00.000Z',
        estado: 'aprobado',
      },
      {
        id: 'doc-02',
        tipo: 'titulo',
        nombreArchivo: 'Titulo-Psicologa-UChile.pdf',
        tamanoBytes: 1_830_400,
        subidoEn: '2024-03-12T12:07:00.000Z',
        estado: 'aprobado',
      },
      {
        id: 'doc-03',
        tipo: 'certificado',
        nombreArchivo: 'Diplomado-Gestion-Personas-UAI.pdf',
        tamanoBytes: 958_100,
        subidoEn: '2024-03-12T12:09:00.000Z',
        estado: 'aprobado',
      },
    ],
    consentimiento: { aceptado: true, fecha: '2024-03-12T12:00:00.000Z', version: '2024-01' },
  },
  {
    profesionalId: 'prof-13',
    email: 'valentina.munoz@ejemplo.cl',
    areaPrincipal: 'cultura',
    estadoValidacion: 'perfil_incompleto',
    documentos: [],
    consentimiento: { aceptado: true, fecha: '2026-09-20T15:40:12.000Z', version: '2026-01' },
  },
];

export const cuentasProfesionales: CuentaMock[] = [
  {
    id: 'cta-prof-01',
    email: 'camila.rojas@ejemplo.cl',
    contrasena: 'camila2026',
    rol: 'profesional',
    nombre: 'Camila Rojas Fuentes',
    profesionalId: 'prof-01',
  },
  {
    id: 'cta-prof-13',
    email: 'valentina.munoz@ejemplo.cl',
    contrasena: 'valentina2026',
    rol: 'profesional',
    nombre: 'Valentina Muñoz Tapia',
    profesionalId: 'prof-13',
  },
];

import type { Organizacion, Rol } from '@/types';

/**
 * Organización de prueba para iniciar sesión sin pasar por el registro.
 * Credenciales: contacto@bloom.cl / skilly2026
 */
export const organizacionPrueba: Organizacion = {
  id: 'org-01',
  razonSocial: 'Bloom Tecnología SpA',
  rut: '76.543.210-3',
  giro: 'Desarrollo de software y servicios informáticos',
  tamano: '11-50',
  nombreContacto: 'Paula Sandoval',
  emailContacto: 'contacto@bloom.cl',
  telefono: '+56 9 8765 4321',
  sitioWeb: 'https://bloom.cl',
  descripcion:
    'Startup de software B2B con 32 personas. Crecimos rápido el último año y necesitamos ordenar la gestión de personas sin armar un área completa todavía.',
  direccion: 'Av. Apoquindo 4500, of. 1203, Las Condes',
  consentimiento: {
    aceptado: true,
    fecha: '2026-03-04T14:22:10.000Z',
    version: '2026-01',
  },
  creadaEn: '2026-03-04T14:22:10.000Z',
};

export interface CuentaMock {
  id: string;
  email: string;
  contrasena: string;
  rol: Rol;
  nombre: string;
  organizacionId?: string;
  profesionalId?: string;
}

/**
 * Cuentas de prueba:
 *   - Empresa:        contacto@bloom.cl / skilly2026
 *   - Administración operativa: admin@skilly.cl  / admin2026
 *   - Fundadora: fundadora@skilly.cl / Skilly#Fundadora2026 (igual que la cuenta inicial de skilly.sql)
 */
export const cuentas: CuentaMock[] = [
  {
    id: 'cta-org-01',
    email: 'contacto@bloom.cl',
    contrasena: 'skilly2026',
    rol: 'organizacion',
    nombre: 'Paula Sandoval',
    organizacionId: 'org-01',
  },
  {
    id: 'cta-admin-01',
    email: 'admin@skilly.cl',
    contrasena: 'admin2026',
    rol: 'administrador',
    nombre: 'Martín · Administración Skilly',
  },
  {
    id: 'cta-fundador-01',
    email: 'fundadora@skilly.cl',
    contrasena: 'Skilly#Fundadora2026',
    rol: 'fundador',
    nombre: 'Paula · Fundadora Skilly',
  },
];

/** Otras organizaciones que aparecen como autoras de evaluaciones públicas. */
export const nombresOtrasOrganizaciones: Record<string, string> = {
  'org-02': 'Clínica Dental Sonrisa Ltda.',
  'org-03': 'Logística Andes SpA',
  'org-04': 'Restaurante La Pica del Barrio',
  'org-05': 'Cowork Estación',
  'org-06': 'Ferretería El Tornillo',
  'org-07': 'Academia de Idiomas Puente',
  'org-08': 'Agencia Creativa Norte',
};

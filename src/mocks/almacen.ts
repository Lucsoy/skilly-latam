import type {
  BloqueDisponible,
  ConfiguracionPlataforma,
  Evaluacion,
  Organizacion,
  PerfilPrivadoProfesional,
  Profesional,
  Reserva,
  RetencionBloque,
  Servicio,
} from '@/types';
import { generarDisponibilidadInicial } from './disponibilidad';
import { generarReservasIniciales } from './reservas';
import { generarEvaluacionesIniciales } from './evaluaciones';
import { cuentas as cuentasIniciales, organizacionPrueba, type CuentaMock } from './organizaciones';
import { cuentasProfesionales, perfilesPrivadosProfesionales, profesionalPendiente } from './cuentasProfesionales';
import { profesionales as profesionalesIniciales } from './profesionales';
import { servicios as serviciosIniciales } from './servicios';
import { configuracionMock } from './configuracion';
import { claveDiaSantiago } from '@/lib/tiempo';

/**
 * Almacén en memoria para la etapa sin backend.
 *
 * Los datos que la organización o el profesional modifican (reservas,
 * evaluaciones, favoritos, cuentas, perfiles, servicios) se guardan en
 * localStorage para sobrevivir a una recarga. Como los mocks se generan
 * relativos a "hoy", el almacén se regenera al cambiar de día para que la demo
 * no se desordene con el paso del tiempo.
 */
interface EstadoAlmacen {
  generadoEl: string;
  reservas: Reserva[];
  evaluaciones: Evaluacion[];
  disponibilidad: BloqueDisponible[];
  retenciones: RetencionBloque[];
  favoritos: Record<string, string[]>;
  organizaciones: Organizacion[];
  cuentas: CuentaMock[];
  /** Fichas públicas. Los profesionales las editan desde su perfil. */
  profesionales: Profesional[];
  /** Solo visibles para el propio profesional y para Skilly. */
  perfilesProfesionales: PerfilPrivadoProfesional[];
  /** Los profesionales publican y editan sus servicios. */
  servicios: Servicio[];
  /** Editable desde el panel de administración. */
  configuracion: ConfiguracionPlataforma;
}

const CLAVE = 'skilly.almacen.v4';

function crearEstadoInicial(): EstadoAlmacen {
  const ahora = new Date();
  return {
    generadoEl: claveDiaSantiago(ahora),
    reservas: generarReservasIniciales(ahora),
    evaluaciones: generarEvaluacionesIniciales(ahora),
    disponibilidad: generarDisponibilidadInicial(ahora),
    retenciones: [],
    favoritos: { 'org-01': ['srv-09', 'srv-19'] },
    organizaciones: [organizacionPrueba],
    cuentas: [...cuentasIniciales, ...cuentasProfesionales].map((c) => ({ ...c })),
    profesionales: clonar([...profesionalesIniciales, profesionalPendiente]),
    perfilesProfesionales: clonar(perfilesPrivadosProfesionales),
    servicios: clonar(serviciosIniciales),
    configuracion: clonar(configuracionMock),
  };
}

function cargar(): EstadoAlmacen {
  try {
    const crudo = typeof localStorage !== 'undefined' ? localStorage.getItem(CLAVE) : null;
    if (crudo) {
      const guardado = JSON.parse(crudo) as EstadoAlmacen;
      if (guardado.generadoEl === claveDiaSantiago(new Date())) {
        return guardado;
      }
    }
  } catch {
    // Si el almacenamiento está bloqueado o corrupto, se parte de cero.
  }
  return crearEstadoInicial();
}

export const almacen: EstadoAlmacen = cargar();

export function persistir(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CLAVE, JSON.stringify(almacen));
    }
  } catch {
    // Sin persistencia disponible: se sigue trabajando en memoria.
  }
}

/** Reinicia los datos de demostración. Útil para pruebas manuales. */
export function reiniciarAlmacen(): void {
  Object.assign(almacen, crearEstadoInicial());
  persistir();
}

/** Copia profunda simple para no entregar referencias internas del almacén. */
export function clonar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

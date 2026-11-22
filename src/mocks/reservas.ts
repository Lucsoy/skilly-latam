import type { EventoHistorial, Reserva, EstadoReserva, Actor } from '@/types';
import { addHours, subDays, subHours, subMinutes } from 'date-fns';
import { fechaSantiago, sumarMinutosISO } from '@/lib/tiempo';

/**
 * 8 reservas de ejemplo de la organización de prueba, en distintos estados.
 * Se generan relativas a la fecha actual para que "próximos", "en curso" y
 * "finalizados" tengan contenido siempre.
 */

const ORG: Actor = { tipo: 'organizacion', nombre: 'Paula Sandoval (Bloom Tecnología SpA)' };
const SISTEMA: Actor = { tipo: 'sistema', nombre: 'Skilly (automático)' };
const COMISION = 15; // Coincide con el mock de configuración; se recalcula al crear reservas nuevas.

function prof(nombre: string): Actor {
  return { tipo: 'profesional', nombre };
}

interface PasoHistorial {
  estado: EstadoReserva;
  actor: Actor;
  fecha: Date;
  motivo?: string;
  detalle?: string;
}

function historial(codigo: string, pasos: PasoHistorial[]): EventoHistorial[] {
  return pasos.map((paso, i) => ({
    id: `${codigo}-h${i + 1}`,
    fecha: paso.fecha.toISOString(),
    actor: paso.actor,
    estadoAnterior: i === 0 ? null : (pasos[i - 1]?.estado ?? null),
    estadoNuevo: paso.estado,
    motivo: paso.motivo,
    detalle: paso.detalle,
  }));
}

function montos(precio: number) {
  const comision = Math.round((precio * COMISION) / 100);
  return { precio, comisionPorcentaje: COMISION, comision, total: precio + comision };
}

export function generarReservasIniciales(ahora: Date = new Date()): Reserva[] {
  // Próxima sesión en menos de 24 horas (para el recordatorio del panel).
  const inicioRes02 = addHours(ahora, 20).toISOString();
  // Distintos días futuros a horas fijas de Santiago.
  const inicioRes01 = fechaSantiago(ahora, 5, 10);
  const inicioRes03 = fechaSantiago(ahora, 6, 15);
  // Pasado.
  const inicioRes04 = fechaSantiago(ahora, -1, 10);
  const inicioRes05 = fechaSantiago(ahora, -4, 11);
  const inicioRes06 = fechaSantiago(ahora, -8, 10);
  const inicioRes07 = fechaSantiago(ahora, -30, 9);
  const inicioRes08 = fechaSantiago(ahora, -10, 9);

  const res01: Reserva = {
    id: 'res-01',
    codigo: 'SK-2026-0041',
    organizacionId: 'org-01',
    profesionalId: 'prof-07',
    servicioId: 'srv-13',
    inicio: inicioRes01,
    fin: sumarMinutosISO(inicioRes01, 45),
    modalidad: 'remoto',
    mensaje: 'Necesitamos un desarrollador backend senior (Python) para el equipo de integraciones. Idealmente con experiencia en fintech.',
    ...montos(590000),
    estado: 'SOLICITADA',
    estadoPago: 'pendiente_confirmacion',
    conformidadConfirmada: false,
    aceptacionCondiciones: { fecha: subHours(ahora, 3).toISOString(), usuario: ORG.nombre, version: '2026-01' },
    creadaEn: subHours(ahora, 3).toISOString(),
    historial: historial('res-01', [{ estado: 'SOLICITADA', actor: ORG, fecha: subHours(ahora, 3) }]),
  };

  const res02: Reserva = {
    id: 'res-02',
    codigo: 'SK-2026-0038',
    organizacionId: 'org-01',
    profesionalId: 'prof-06',
    servicioId: 'srv-11',
    inicio: inicioRes02,
    fin: sumarMinutosISO(inicioRes02, 60),
    modalidad: 'remoto',
    mensaje: 'Entran 6 personas nuevas en octubre y hoy el onboarding es un documento de Google que nadie lee.',
    ...montos(540000),
    estado: 'CONFIRMADA',
    estadoPago: 'pendiente_confirmacion',
    conformidadConfirmada: false,
    aceptacionCondiciones: { fecha: subDays(ahora, 3).toISOString(), usuario: ORG.nombre, version: '2026-01' },
    creadaEn: subDays(ahora, 3).toISOString(),
    historial: historial('res-02', [
      { estado: 'SOLICITADA', actor: ORG, fecha: subDays(ahora, 3) },
      { estado: 'CONFIRMADA', actor: prof('Sebastián Torres Vidal'), fecha: subMinutes(subDays(ahora, 3), -95) },
    ]),
  };

  const res03: Reserva = {
    id: 'res-03',
    codigo: 'SK-2026-0036',
    organizacionId: 'org-01',
    profesionalId: 'prof-02',
    servicioId: 'srv-03',
    inicio: inicioRes03,
    fin: sumarMinutosISO(inicioRes03, 60),
    modalidad: 'remoto',
    mensaje: 'Tenemos 32 personas y sueldos definidos caso a caso. Queremos ordenar antes de la próxima ronda de contrataciones.',
    ...montos(950000),
    estado: 'CONFIRMADA',
    estadoPago: 'pendiente_confirmacion',
    conformidadConfirmada: false,
    aceptacionCondiciones: { fecha: subDays(ahora, 5).toISOString(), usuario: ORG.nombre, version: '2026-01' },
    creadaEn: subDays(ahora, 5).toISOString(),
    historial: historial('res-03', [
      { estado: 'SOLICITADA', actor: ORG, fecha: subDays(ahora, 5) },
      { estado: 'CONFIRMADA', actor: prof('Matías Contreras Olivares'), fecha: subDays(ahora, 4) },
    ]),
  };

  const res04: Reserva = {
    id: 'res-04',
    codigo: 'SK-2026-0031',
    organizacionId: 'org-01',
    profesionalId: 'prof-05',
    servicioId: 'srv-09',
    inicio: inicioRes04,
    fin: sumarMinutosISO(inicioRes04, 90),
    modalidad: 'hibrido',
    mensaje: 'Notamos más rotación en el equipo de soporte y queremos entender qué pasa antes de tomar decisiones.',
    ...montos(890000),
    estado: 'EN_CURSO',
    estadoPago: 'confirmado',
    conformidadConfirmada: false,
    aceptacionCondiciones: { fecha: subDays(ahora, 12).toISOString(), usuario: ORG.nombre, version: '2026-01' },
    creadaEn: subDays(ahora, 12).toISOString(),
    historial: historial('res-04', [
      { estado: 'SOLICITADA', actor: ORG, fecha: subDays(ahora, 12) },
      { estado: 'CONFIRMADA', actor: prof('Javiera Espinoza Lagos'), fecha: subDays(ahora, 11) },
      { estado: 'EN_CURSO', actor: SISTEMA, fecha: new Date(inicioRes04), motivo: 'Inicio de la primera sesión agendada' },
    ]),
  };

  const res05: Reserva = {
    id: 'res-05',
    codigo: 'SK-2026-0027',
    organizacionId: 'org-01',
    profesionalId: 'prof-03',
    servicioId: 'srv-05',
    inicio: inicioRes05,
    fin: sumarMinutosISO(inicioRes05, 45),
    modalidad: 'remoto',
    ...montos(380000),
    estado: 'ENTREGADA',
    estadoPago: 'confirmado',
    conformidadConfirmada: false,
    aceptacionCondiciones: { fecha: subDays(ahora, 20).toISOString(), usuario: ORG.nombre, version: '2026-01' },
    creadaEn: subDays(ahora, 20).toISOString(),
    historial: historial('res-05', [
      { estado: 'SOLICITADA', actor: ORG, fecha: subDays(ahora, 20) },
      { estado: 'CONFIRMADA', actor: prof('Fernanda Aravena Soto'), fecha: subDays(ahora, 19) },
      { estado: 'EN_CURSO', actor: SISTEMA, fecha: new Date(inicioRes05), motivo: 'Inicio de la sesión agendada' },
      { estado: 'ENTREGADA', actor: prof('Fernanda Aravena Soto'), fecha: subDays(ahora, 2), motivo: 'Informe mensual y F29 enviados por correo' },
    ]),
  };

  const res06: Reserva = {
    id: 'res-06',
    codigo: 'SK-2026-0022',
    organizacionId: 'org-01',
    profesionalId: 'prof-04',
    servicioId: 'srv-07',
    inicio: inicioRes06,
    fin: sumarMinutosISO(inicioRes06, 60),
    modalidad: 'presencial',
    mensaje: 'Tenemos contratos de 2021 que nunca se actualizaron y varias personas en teletrabajo sin anexo.',
    ...montos(420000),
    estado: 'ENTREGADA',
    estadoPago: 'confirmado',
    conformidadConfirmada: true,
    conformidadFecha: subDays(ahora, 1).toISOString(),
    aceptacionCondiciones: { fecha: subDays(ahora, 25).toISOString(), usuario: ORG.nombre, version: '2026-01' },
    creadaEn: subDays(ahora, 25).toISOString(),
    historial: historial('res-06', [
      { estado: 'SOLICITADA', actor: ORG, fecha: subDays(ahora, 25) },
      { estado: 'CONFIRMADA', actor: prof('Rodrigo Muñoz Pizarro'), fecha: subDays(ahora, 24) },
      { estado: 'EN_CURSO', actor: SISTEMA, fecha: new Date(inicioRes06), motivo: 'Inicio de la sesión agendada' },
      { estado: 'ENTREGADA', actor: prof('Rodrigo Muñoz Pizarro'), fecha: subDays(ahora, 3), motivo: 'Modelos de contrato y guía entregados' },
      { estado: 'ENTREGADA', actor: ORG, fecha: subDays(ahora, 1), motivo: 'Conformidad confirmada por la organización' },
    ]),
  };

  const res07: Reserva = {
    id: 'res-07',
    codigo: 'SK-2026-0012',
    organizacionId: 'org-01',
    profesionalId: 'prof-01',
    servicioId: 'srv-01',
    inicio: inicioRes07,
    fin: sumarMinutosISO(inicioRes07, 60),
    modalidad: 'hibrido',
    mensaje: 'Buscamos un Head of Customer Success.',
    ...montos(650000),
    estado: 'EVALUADA',
    estadoPago: 'confirmado',
    conformidadConfirmada: true,
    conformidadFecha: subDays(ahora, 6).toISOString(),
    aceptacionCondiciones: { fecha: subDays(ahora, 40).toISOString(), usuario: ORG.nombre, version: '2026-01' },
    creadaEn: subDays(ahora, 40).toISOString(),
    historial: historial('res-07', [
      { estado: 'SOLICITADA', actor: ORG, fecha: subDays(ahora, 40) },
      { estado: 'CONFIRMADA', actor: prof('Camila Rojas Fuentes'), fecha: subDays(ahora, 39) },
      { estado: 'EN_CURSO', actor: SISTEMA, fecha: new Date(inicioRes07), motivo: 'Inicio de la sesión agendada' },
      { estado: 'ENTREGADA', actor: prof('Camila Rojas Fuentes'), fecha: subDays(ahora, 7), motivo: 'Terna final presentada y candidata contratada' },
      { estado: 'ENTREGADA', actor: ORG, fecha: subDays(ahora, 6), motivo: 'Conformidad confirmada por la organización' },
      { estado: 'EVALUADA', actor: ORG, fecha: subDays(ahora, 5) },
    ]),
  };

  const res08: Reserva = {
    id: 'res-08',
    codigo: 'SK-2026-0019',
    organizacionId: 'org-01',
    profesionalId: 'prof-10',
    servicioId: 'srv-17',
    inicio: inicioRes08,
    fin: sumarMinutosISO(inicioRes08, 240),
    modalidad: 'presencial',
    ...montos(680000),
    estado: 'CANCELADA',
    estadoPago: 'retenido_parcial',
    conformidadConfirmada: false,
    aceptacionCondiciones: { fecha: subDays(ahora, 18).toISOString(), usuario: ORG.nombre, version: '2026-01' },
    creadaEn: subDays(ahora, 18).toISOString(),
    historial: historial('res-08', [
      { estado: 'SOLICITADA', actor: ORG, fecha: subDays(ahora, 18) },
      { estado: 'CONFIRMADA', actor: prof('Cristóbal Navarro Ibáñez'), fecha: subDays(ahora, 17) },
      {
        estado: 'CANCELADA',
        actor: ORG,
        fecha: subHours(new Date(inicioRes08), 30),
        motivo: 'Se reprogramó la jornada interna de jefaturas',
        detalle: 'Cancelación con 30 horas de antelación: se retiene el 25 % del total ($195.500).',
      },
    ]),
  };

  return [res01, res02, res03, res04, res05, res06, res07, res08];
}

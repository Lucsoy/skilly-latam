import { describe, expect, it } from 'vitest';
import type { Reserva } from '@/types';
import {
  ESTADOS_CANCELABLES,
  ESTADOS_CHAT,
  ErrorTransicion,
  accionesDisponibles,
  accionesProfesional,
  esEstadoFinal,
  puedeTransicionar,
  transicionar,
} from './estadoReserva';

const base = {
  id: 'r1',
  codigo: 'SK-2026-0001',
  organizacionId: 'o',
  profesionalId: 'p',
  servicioId: 's',
  inicio: '2030-01-01T10:00:00',
  fin: '2030-01-01T11:00:00',
  modalidad: 'remoto',
  precio: 100,
  comisionPorcentaje: 15,
  comision: 15,
  total: 115,
  estado: 'SOLICITADA',
  estadoPago: 'pendiente_confirmacion',
  conformidadConfirmada: false,
  creadaEn: '2029-12-01T00:00:00',
  historial: [],
} as Reserva;

describe('máquina de estados de la reserva (CP-UNI-EST)', () => {
  it('CP-UNI-EST-01 recorre el ciclo feliz completo y registra cada evento', () => {
    const actor = { tipo: 'sistema' as const, nombre: 'Prueba' };
    let r = base;
    for (const e of ['APROBADA_ADMIN', 'PENDIENTE_PAGO', 'CONFIRMADA', 'EN_CURSO', 'ENTREGADA', 'EVALUADA'] as const) {
      r = transicionar(r, e, actor);
    }
    expect(r.estado).toBe('EVALUADA');
    expect(r.historial.map((h) => h.estadoNuevo)).toEqual(['APROBADA_ADMIN', 'PENDIENTE_PAGO', 'CONFIRMADA', 'EN_CURSO', 'ENTREGADA', 'EVALUADA']);
    expect(esEstadoFinal(r.estado)).toBe(true);
  });

  it('CP-UNI-EST-02 rechaza saltos inválidos (SOLICITADA → ENTREGADA)', () => {
    expect(() => transicionar(base, 'ENTREGADA', { tipo: 'sistema', nombre: 'x' })).toThrow(ErrorTransicion);
    expect(puedeTransicionar('EN_CURSO', 'CANCELADA')).toBe(false);
    expect(puedeTransicionar('EVALUADA', 'SOLICITADA')).toBe(false);
  });

  it('CP-UNI-EST-03 el reagendamiento vuelve a CONFIRMADA (aceptado o rechazado) o se cancela', () => {
    expect(puedeTransicionar('CONFIRMADA', 'REAGENDADA')).toBe(true);
    expect(puedeTransicionar('REAGENDADA', 'CONFIRMADA')).toBe(true);
    expect(puedeTransicionar('REAGENDADA', 'CANCELADA')).toBe(true);
    expect(puedeTransicionar('REAGENDADA', 'EN_CURSO')).toBe(false);
  });

  it('CP-UNI-EST-04 la organización solo cancela antes de que empiece el trabajo', () => {
    expect(ESTADOS_CANCELABLES).not.toContain('EN_CURSO');
    expect(accionesDisponibles({ ...base, estado: 'CONFIRMADA' })).toEqual(['cancelar', 'solicitar_reagendamiento']);
    expect(accionesDisponibles({ ...base, estado: 'EN_CURSO' })).toEqual([]);
    expect(accionesDisponibles({ ...base, estado: 'ENTREGADA', conformidadConfirmada: true })).toEqual(['evaluar']);
  });

  it('CP-UNI-EST-05 acciones del profesional por estado', () => {
    expect(accionesProfesional({ ...base, estado: 'APROBADA_ADMIN' })).toEqual(['responder_solicitud']);
    expect(accionesProfesional({ ...base, estado: 'CONFIRMADA' })).toEqual(['iniciar_trabajo']);
    expect(accionesProfesional({ ...base, estado: 'EN_CURSO' })).toEqual(['marcar_entregado']);
    expect(accionesProfesional({ ...base, estado: 'REAGENDADA' })).toEqual(['responder_reagendamiento']);
    expect(accionesProfesional({ ...base, estado: 'ENTREGADA', conformidadConfirmada: false })).toEqual([]);
    expect(accionesProfesional({ ...base, estado: 'EVALUADA', conformidadConfirmada: true })).toEqual(['evaluar_organizacion']);
    expect(accionesProfesional({ ...base, estado: 'EVALUADA', conformidadConfirmada: true }, true)).toEqual([]);
  });

  it('CP-UNI-EST-06 el chat está habilitado de CONFIRMADA a ENTREGADA', () => {
    expect([...ESTADOS_CHAT].sort()).toEqual(['CONFIRMADA', 'ENTREGADA', 'EN_CURSO', 'REAGENDADA']);
  });
});

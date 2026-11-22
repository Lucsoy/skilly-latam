import { beforeEach, describe, expect, it } from 'vitest';
import { almacen, clonar, reiniciarAlmacen } from '@/mocks/almacen';
import { cerrarSesion, iniciarSesion } from './auth';
import { cancelarReserva, obtenerReserva, simularCancelacion, solicitarReagendamiento } from './reservas';
import { iniciarTrabajo, marcarEntregado, obtenerSolicitudProfesional, responderReagendamiento } from './solicitudes';
import { enviarEvaluacion, obtenerEstadoEvaluacion } from './evaluaciones';
import { listarBloquesDisponibles } from './disponibilidad';

const ORG = { email: 'contacto@bloom.cl', contrasena: 'skilly2026' };
const CAMILA = { email: 'camila.rojas@ejemplo.cl', contrasena: 'camila2026' };
const RANGO = () => ({ desde: new Date().toISOString(), hasta: new Date(Date.now() + 60 * 86400000).toISOString() });

/** Crea una contratación CONFIRMADA de Camila (prof-01) con Bloom (org-01) para probar el ciclo. */
function contratacionConfirmadaDeCamila(): string {
  const plantilla = clonar(almacen.reservas.find((r) => r.id === 'res-02')!);
  const bloque = almacen.disponibilidad.find((b) => b.profesionalId === 'prof-01' && new Date(b.inicio) > new Date())!;
  almacen.disponibilidad = almacen.disponibilidad.filter((b) => b.id !== bloque.id);
  almacen.reservas.push({ ...plantilla, id: 'res-prueba', codigo: 'SK-2026-9999', profesionalId: 'prof-01', inicio: bloque.inicio, fin: bloque.fin, estado: 'CONFIRMADA' });
  return 'res-prueba';
}

describe('ciclo de contratación en modo demostración (CP-UNI-CON)', () => {
  beforeEach(async () => {
    reiniciarAlmacen();
    await cerrarSesion();
  });

  it('CP-UNI-CON-01 reagendar: la organización propone, el profesional acepta y el horario original se libera', async () => {
    const id = contratacionConfirmadaDeCamila();
    const original = almacen.reservas.find((r) => r.id === id)!.inicio;
    await iniciarSesion(ORG);
    const nuevo = (await listarBloquesDisponibles('prof-01', RANGO()))[0]!;
    const propuesta = await solicitarReagendamiento(id, nuevo.id, 'Cambio de agenda');
    expect(propuesta.estado).toBe('REAGENDADA');
    expect(propuesta.reagendamientoPropuesto?.inicio).toBe(nuevo.inicio);
    expect((await listarBloquesDisponibles('prof-01', RANGO())).some((b) => b.id === nuevo.id)).toBe(false);

    await iniciarSesion(CAMILA);
    const aceptada = await responderReagendamiento(id, 'aceptar');
    expect(aceptada.estado).toBe('CONFIRMADA');
    expect(aceptada.inicio).toBe(nuevo.inicio);
    expect(aceptada.reagendamientoPropuesto).toBeUndefined();
    expect(almacen.disponibilidad.some((b) => b.profesionalId === 'prof-01' && b.inicio === original)).toBe(true);
  }, 30_000);

  it('CP-UNI-CON-02 rechazar el cambio de fecha mantiene el horario original', async () => {
    const id = contratacionConfirmadaDeCamila();
    const original = almacen.reservas.find((r) => r.id === id)!.inicio;
    await iniciarSesion(ORG);
    const nuevo = (await listarBloquesDisponibles('prof-01', RANGO()))[0]!;
    await solicitarReagendamiento(id, nuevo.id, '');
    await iniciarSesion(CAMILA);
    const r = await responderReagendamiento(id, 'rechazar', 'No puedo ese día');
    expect(r.estado).toBe('CONFIRMADA');
    expect(r.inicio).toBe(original);
    await expect(responderReagendamiento(id, 'aceptar')).rejects.toMatchObject({ codigo: 'conflicto' });
  }, 30_000);

  it('CP-UNI-CON-03 el profesional inicia y entrega; no puede saltarse estados', async () => {
    const id = contratacionConfirmadaDeCamila();
    await iniciarSesion(CAMILA);
    await expect(marcarEntregado(id)).rejects.toMatchObject({ codigo: 'conflicto' });
    expect((await iniciarTrabajo(id)).estado).toBe('EN_CURSO');
    expect((await marcarEntregado(id)).estado).toBe('ENTREGADA');
    expect((await obtenerSolicitudProfesional(id)).historial.at(-1)?.estadoNuevo).toBe('ENTREGADA');
  }, 30_000);

  it('CP-UNI-CON-04 cancelar con simulación previa libera el horario', async () => {
    await iniciarSesion(ORG);
    const reserva = await obtenerReserva('res-03');
    const sim = await simularCancelacion('res-03');
    const cancelada = await cancelarReserva('res-03', 'Cambio de prioridades');
    expect(cancelada.estado).toBe('CANCELADA');
    // Sin pago previo no hay reembolso ni retención (A-12).
    const esperado = !sim.pagado ? 'sin_cobro' : sim.montoRetenido > 0 ? 'retenido_parcial' : 'reembolsado';
    expect(cancelada.estadoPago).toBe(esperado);
    if (reserva.estadoPago !== 'confirmado') {
      expect(sim.pagado).toBe(false);
      expect(sim.montoDevuelto).toBe(0);
    }
    if (new Date(reserva.inicio) > new Date()) {
      expect(almacen.disponibilidad.some((b) => b.profesionalId === reserva.profesionalId && b.inicio === reserva.inicio)).toBe(true);
    }
  }, 30_000);

  it('CP-UNI-CON-05 el profesional evalúa a la organización y, con ambas evaluaciones, se publican', async () => {
    // Los datos de demo ya traen la evaluación de Camila: se quita para partir de cero.
    almacen.evaluaciones = almacen.evaluaciones.filter((e) => !(e.reservaId === 'res-07' && e.autor === 'profesional'));
    await iniciarSesion(CAMILA);
    const antes = await obtenerEstadoEvaluacion('res-07');
    expect(antes.propia).toBeNull();
    const ev = await enviarEvaluacion({ reservaId: 'res-07', calidad: 4, plazos: 4, comunicacion: 4 });
    expect(ev.autor).toBe('profesional');
    const despues = await obtenerEstadoEvaluacion('res-07');
    expect(despues.propia?.id).toBe(ev.id);
    if (almacen.evaluaciones.some((e) => e.reservaId === 'res-07' && e.autor === 'organizacion')) {
      expect(despues.ambasEnviadas).toBe(true);
      expect(despues.contraparte?.autor).toBe('organizacion');
    }
    await expect(enviarEvaluacion({ reservaId: 'res-07', calidad: 4, plazos: 4, comunicacion: 4 })).rejects.toMatchObject({ codigo: 'conflicto' });
  }, 30_000);
});

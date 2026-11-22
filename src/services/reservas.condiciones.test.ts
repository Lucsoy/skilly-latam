import { expect, test, vi } from 'vitest';
import { almacen } from '@/mocks/almacen';
import { crearReserva, type DatosNuevaReserva } from './reservas';

vi.mock('./sesionActual', () => ({
  organizacionEnSesion: () => almacen.organizaciones[0],
}));

test('una solicitud sin condiciones conserva la retención y no crea la reserva', async () => {
  const bloque = almacen.disponibilidad[0];
  const organizacion = almacen.organizaciones[0];
  if (!bloque || !organizacion) throw new Error('La prueba requiere un bloque y una organización.');
  const servicio = almacen.servicios.find((s) => s.profesionalId === bloque.profesionalId);
  if (!servicio) throw new Error('La prueba requiere un servicio para el profesional.');
  const retencion = {
    id: 'ret-prueba-condiciones',
    bloqueId: bloque.id,
    servicioId: servicio.id,
    organizacionId: organizacion.id,
    expiraEn: new Date(Date.now() + 60000).toISOString(),
  };
  almacen.retenciones.push(retencion);
  const cantidad = almacen.reservas.length;
  try {
    // Simula datos recibidos en tiempo de ejecución que incumplen el tipo estático.
    const solicitud = {
      retencionId: retencion.id, bloqueId: bloque.id, servicioId: servicio.id,
      modalidad: servicio.modalidades[0], aceptaCondiciones: true,
    };
    await expect(crearReserva(solicitud as DatosNuevaReserva)).rejects.toMatchObject({ codigo: 'conflicto' });
    expect(almacen.reservas).toHaveLength(cantidad);
    expect(almacen.retenciones).toContain(retencion);
  } finally {
    almacen.retenciones = almacen.retenciones.filter((r) => r !== retencion);
  }
});

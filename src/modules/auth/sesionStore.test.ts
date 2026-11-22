import { describe, expect, it } from 'vitest';
import { rutaInicio, rutaPerteneceARol } from './sesionStore';

describe('rutaInicio', () => {
  it('lleva a cada rol a su espacio', () => {
    const base = { id: 'x', nombre: 'X', email: 'x@x.cl' };
    expect(rutaInicio({ ...base, rol: 'organizacion' })).toBe('/buscar');
    expect(rutaInicio({ ...base, rol: 'profesional' })).toBe('/profesional');
    expect(rutaInicio({ ...base, rol: 'administrador' })).toBe('/admin');
    expect(rutaInicio({ ...base, rol: 'fundador' })).toBe('/admin/centro');
  });
});

describe('rutaPerteneceARol', () => {
  it('solo respeta rutas del área del rol', () => {
    expect(rutaPerteneceARol('/profesional/solicitudes/r1', 'profesional')).toBe(true);
    expect(rutaPerteneceARol('/buscar', 'profesional')).toBe(false);
    expect(rutaPerteneceARol('/profesional', 'organizacion')).toBe(false);
    expect(rutaPerteneceARol('/profesionales/prof-01', 'organizacion')).toBe(true);
    expect(rutaPerteneceARol('/admin/reservas', 'administrador')).toBe(true);
    expect(rutaPerteneceARol('/admin/administradores', 'fundador')).toBe(true);
    expect(rutaPerteneceARol('/admin', 'organizacion')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { tituloParaRuta } from './tituloPagina';

describe('tituloParaRuta', () => {
  it('usa el título más específico de cada ruta', () => {
    expect(tituloParaRuta('/profesional/servicios')).toBe('Mis servicios · Skilly');
    expect(tituloParaRuta('/profesional/servicios/nuevo')).toBe('Nuevo servicio · Skilly');
    expect(tituloParaRuta('/mis-servicios/r1/evaluar')).toBe('Evaluar profesional · Skilly');
    expect(tituloParaRuta('/admin/profesionales/prof-01')).toBe('Ficha del profesional · Admin · Skilly');
    expect(tituloParaRuta('/admin')).toBe('Resumen · Admin · Skilly');
  });

  it('tiene un título por defecto', () => {
    expect(tituloParaRuta('/no-existe')).toBe('Skilly · Talent as a Service');
  });
});

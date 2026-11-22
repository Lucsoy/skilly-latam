import { describe, expect, it } from 'vitest';
import { hrefSeguro } from './enlaces';

describe('hrefSeguro (T-05)', () => {
  it('CP-UNI-ENL-01 acepta http y https y completa el esquema faltante', () => {
    expect(hrefSeguro('https://linkedin.com/in/ana')).toBe('https://linkedin.com/in/ana');
    expect(hrefSeguro('linkedin.com/in/ana')).toBe('https://linkedin.com/in/ana');
    expect(hrefSeguro('http://ejemplo.cl')).toBe('http://ejemplo.cl/');
  });
  it('CP-UNI-ENL-02 descarta esquemas peligrosos y valores vacíos', () => {
    for (const malo of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:msgbox(1)', '', '   ', null, undefined]) {
      expect(hrefSeguro(malo as string)).toBeUndefined();
    }
  });
});

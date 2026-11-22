import { describe, expect, it } from 'vitest';
import { calcularDigitoVerificador, formatearRut, validarRut } from './rut';
import { esquemaContrasena, esquemaEmail } from './validadores';

describe('RUT chileno (CP-UNI-RUT) — misma regla que rutValido() en backend/config/helpers.php', () => {
  it('CP-UNI-RUT-01 acepta RUT válidos con y sin puntos, incluida la K', () => {
    expect(validarRut('76.086.428-5')).toBe(true);
    expect(validarRut('76086428-5')).toBe(true);
    expect(calcularDigitoVerificador('10000013')).toBe('K');
    expect(validarRut('10000013-k')).toBe(true);
  });
  it('CP-UNI-RUT-02 rechaza dígito verificador incorrecto, vacío y texto', () => {
    expect(validarRut('76086428-4')).toBe(false);
    expect(validarRut('')).toBe(false);
    expect(validarRut('abc')).toBe(false);
  });
  it('CP-UNI-RUT-03 formatea con puntos y guion', () => {
    expect(formatearRut('760864285')).toBe('76.086.428-5');
  });
});

describe('validaciones de formulario (CP-UNI-VAL)', () => {
  it('CP-UNI-VAL-01 contraseña: mínimo 8, con letras y números (límite exacto)', () => {
    expect(esquemaContrasena.safeParse('abcd1234').success).toBe(true);
    expect(esquemaContrasena.safeParse('abc1234').success).toBe(false);
    expect(esquemaContrasena.safeParse('abcdefgh').success).toBe(false);
    expect(esquemaContrasena.safeParse('12345678').success).toBe(false);
  });
  it('CP-UNI-VAL-02 correo con formato válido', () => {
    expect(esquemaEmail.safeParse('persona@empresa.cl').success).toBe(true);
    expect(esquemaEmail.safeParse('persona@').success).toBe(false);
    expect(esquemaEmail.safeParse('').success).toBe(false);
  });
});

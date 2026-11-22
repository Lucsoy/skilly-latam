import { describe, expect, it } from 'vitest';
import { esquemaLinkedin, esquemaLinkedinOpcional, normalizarLinkedin } from './validadores';

describe('normalizarLinkedin', () => {
  it('agrega https:// y quita la barra final', () => {
    expect(normalizarLinkedin('linkedin.com/in/camila-rojas/')).toBe('https://linkedin.com/in/camila-rojas');
    expect(normalizarLinkedin('http://www.linkedin.com/in/camila')).toBe('https://www.linkedin.com/in/camila');
  });
});

describe('esquemaLinkedin', () => {
  it.each([
    'https://www.linkedin.com/in/camila-rojas-ejemplo',
    'linkedin.com/in/valentina_munoz',
    'https://cl.linkedin.com/in/matias',
  ])('acepta %s', (v) => {
    expect(esquemaLinkedin.safeParse(v).success).toBe(true);
  });

  it.each(['', 'https://www.linkedin.com/company/skilly', 'https://linkedln.com/in/falso', 'camila rojas'])(
    'rechaza "%s"',
    (v) => {
      expect(esquemaLinkedin.safeParse(v).success).toBe(false);
    },
  );
});

describe('esquemaLinkedinOpcional', () => {
  it('permite dejarlo vacío', () => {
    expect(esquemaLinkedinOpcional.safeParse('').success).toBe(true);
    expect(esquemaLinkedinOpcional.safeParse('   ').success).toBe(true);
  });

  it('si se escribe, sigue exigiendo un perfil válido', () => {
    expect(esquemaLinkedinOpcional.safeParse('linkedin.com/in/camila').success).toBe(true);
    expect(esquemaLinkedinOpcional.safeParse('camila rojas').success).toBe(false);
  });
});

import { z } from 'zod';
import { validarRut } from './rut';

export const esquemaRut = z
  .string()
  .min(1, 'Ingresa el RUT de la organización')
  .refine(validarRut, 'El RUT no es válido. Revisa el dígito verificador.');

export const esquemaEmail = z
  .string()
  .min(1, 'Ingresa un correo')
  .email('Ese correo no parece válido');

export const esquemaContrasena = z
  .string()
  .min(8, 'Usa al menos 8 caracteres')
  .regex(/[A-Za-z]/, 'Incluye al menos una letra')
  .regex(/\d/, 'Incluye al menos un número');

/** Acepta "linkedin.com/in/usuario" con o sin https:// y www; normaliza a URL completa. */
export function normalizarLinkedin(valor: string): string {
  const limpio = valor.trim().replace(/\/+$/, '');
  if (!limpio) return '';
  return /^https?:\/\//i.test(limpio) ? limpio.replace(/^http:\/\//i, 'https://') : `https://${limpio}`;
}

export const esquemaLinkedin = z
  .string()
  .trim()
  .min(1, 'Ingresa el enlace a tu perfil de LinkedIn')
  .refine(
    (v) => /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%.]+$/i.test(normalizarLinkedin(v)),
    'Usa el enlace de tu perfil, por ejemplo linkedin.com/in/tu-nombre',
  );

/** Igual que `esquemaLinkedin`, pero permite dejar el campo vacío. */
export const esquemaLinkedinOpcional = z
  .string()
  .trim()
  .refine(
    (v) => v === '' || /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%.]+$/i.test(normalizarLinkedin(v)),
    'Usa el enlace de tu perfil, por ejemplo linkedin.com/in/tu-nombre',
  );

export const esquemaTelefonoChile = z
  .string()
  .optional()
  .refine(
    (v) => !v || /^\+?56\s?9\s?\d{4}\s?\d{4}$/.test(v.replace(/[-.]/g, '')),
    'Usa el formato +56 9 1234 5678',
  );

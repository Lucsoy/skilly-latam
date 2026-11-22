import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { useRecurso } from '@/lib/useRecurso';
import { PaginaCondiciones } from './PaginaCondiciones';

vi.mock('@/lib/useRecurso', () => ({ useRecurso: vi.fn() }));

test('al fallar la configuración se informa el fallo y se ofrece reintentar', () => {
  const recurso = { datos: {}, cargando: false, error: null, recargar: vi.fn(), establecer: vi.fn() };
  vi.mocked(useRecurso)
    .mockReturnValueOnce(recurso)
    .mockReturnValueOnce({ ...recurso, datos: null, error: 'Error de configuración' });

  const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(PaginaCondiciones)));
  expect(html).not.toContain('animate-pulse');
  expect(html).toContain('Error de configuración');
  expect(html).toContain('Intentar de nuevo');
});

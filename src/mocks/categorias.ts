import type { Categoria } from '@/types';

export const categorias: Categoria[] = [
  {
    id: 'reclutamiento',
    nombre: 'Reclutamiento y selección',
    descripcion: 'Encuentra e incorpora a las personas correctas.',
    subcategorias: [
      { id: 'busqueda-perfiles', categoriaId: 'reclutamiento', nombre: 'Búsqueda y selección de perfiles' },
      { id: 'cargos-directivos', categoriaId: 'reclutamiento', nombre: 'Búsqueda de cargos directivos' },
      { id: 'procesos-masivos', categoriaId: 'reclutamiento', nombre: 'Procesos masivos' },
      { id: 'marca-empleadora', categoriaId: 'reclutamiento', nombre: 'Marca empleadora' },
    ],
  },
  {
    id: 'cultura',
    nombre: 'Cultura y clima',
    descripcion: 'Mide y mejora cómo se siente trabajar en tu organización.',
    subcategorias: [
      { id: 'clima', categoriaId: 'cultura', nombre: 'Diagnóstico de clima' },
      { id: 'valores', categoriaId: 'cultura', nombre: 'Definición de cultura y valores' },
      { id: 'liderazgo', categoriaId: 'cultura', nombre: 'Desarrollo de liderazgo' },
    ],
  },
  {
    id: 'compensaciones',
    nombre: 'Compensaciones y beneficios',
    descripcion: 'Estructuras salariales justas y beneficios que retienen.',
    subcategorias: [
      { id: 'bandas', categoriaId: 'compensaciones', nombre: 'Bandas salariales' },
      { id: 'beneficios', categoriaId: 'compensaciones', nombre: 'Diseño de beneficios' },
      { id: 'valoracion-cargos', categoriaId: 'compensaciones', nombre: 'Descripción y valoración de cargos' },
    ],
  },
  {
    id: 'capacitacion',
    nombre: 'Capacitación y desarrollo',
    descripcion: 'Onboarding, planes de formación y evaluación de desempeño.',
    subcategorias: [
      { id: 'onboarding', categoriaId: 'capacitacion', nombre: 'Onboarding e inducción' },
      { id: 'planes', categoriaId: 'capacitacion', nombre: 'Planes de capacitación' },
      { id: 'sence', categoriaId: 'capacitacion', nombre: 'Gestión SENCE' },
      { id: 'desempeno', categoriaId: 'capacitacion', nombre: 'Evaluación de desempeño' },
    ],
  },
  {
    id: 'administracion',
    nombre: 'Administración de personal',
    descripcion: 'Contratos, remuneraciones y cumplimiento laboral al día.',
    subcategorias: [
      { id: 'contratos', categoriaId: 'administracion', nombre: 'Contratos y documentación laboral' },
      { id: 'remuneraciones', categoriaId: 'administracion', nombre: 'Remuneraciones y Previred' },
      { id: 'desvinculaciones', categoriaId: 'administracion', nombre: 'Desvinculaciones y finiquitos' },
      { id: 'normativa', categoriaId: 'administracion', nombre: 'Cumplimiento normativo' },
    ],
  },
  {
    id: 'finanzas',
    nombre: 'Finanzas y contabilidad',
    descripcion: 'Contabilidad, impuestos y control de caja sin sorpresas.',
    subcategorias: [
      { id: 'contabilidad', categoriaId: 'finanzas', nombre: 'Contabilidad mensual' },
      { id: 'tributaria', categoriaId: 'finanzas', nombre: 'Asesoría tributaria' },
      { id: 'flujo-caja', categoriaId: 'finanzas', nombre: 'Flujo de caja y presupuesto' },
    ],
  },
];

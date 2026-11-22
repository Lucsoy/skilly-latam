import type { Profesional } from '@/types';

/**
 * 12 profesionales. Los marcados como "nuevo" en el comentario tienen menos de
 * 3 evaluaciones publicadas (ver evaluaciones.ts) y sirven para probar la regla
 * de visibilidad y la etiqueta "Profesional nuevo en Skilly".
 */
export const profesionales: Profesional[] = [
  {
    id: 'prof-01',
    nombre: 'Camila',
    apellido: 'Rojas Fuentes',
    titulo: 'Psicóloga organizacional · Reclutamiento y selección',
    ciudad: 'Santiago',
    presentacion:
      'Llevo 11 años ayudando a empresas en crecimiento a contratar bien y a tiempo. Me gusta entender el negocio antes de abrir cualquier proceso, así encontramos personas que se quedan.',
    formacion: [
      'Psicóloga, Universidad de Chile',
      'Diplomado en Gestión de Personas, Universidad Adolfo Ibáñez',
    ],
    experiencia: [
      { cargo: 'Jefa de Selección', organizacion: 'Cencosud', periodo: '2017 – 2021' },
      { cargo: 'Consultora senior', organizacion: 'People First Consultores', periodo: '2014 – 2017' },
    ],
    habilidades: ['Entrevista por competencias', 'Assessment center', 'Hunting', 'Informes psicolaborales', 'ATS'],
    linkedin: 'https://www.linkedin.com/in/camila-rojas-ejemplo',
    validadoPorSkilly: true,
    insignias: ['identidad_verificada', 'titulo_verificado', 'entrevista_skilly', 'referencias_verificadas'],
    fechaIngreso: '2024-03-12T12:00:00.000Z',
  },
  {
    id: 'prof-02',
    nombre: 'Matías',
    apellido: 'Contreras Olivares',
    titulo: 'Ingeniero comercial · Compensaciones',
    ciudad: 'Valparaíso',
    presentacion:
      'Diseño estructuras de compensación que las jefaturas entienden y que la gente percibe como justas. Trabajo con datos de mercado reales y con tu presupuesto real.',
    formacion: [
      'Ingeniero comercial, Pontificia Universidad Católica de Valparaíso',
      'Certificación en Compensaciones, Mercer',
    ],
    experiencia: [
      { cargo: 'Subgerente de Compensaciones', organizacion: 'Banco de Chile', periodo: '2018 – 2023' },
      { cargo: 'Analista de compensaciones', organizacion: 'Falabella', periodo: '2014 – 2018' },
    ],
    habilidades: ['Bandas salariales', 'Valoración de cargos', 'Encuestas de mercado', 'Excel avanzado', 'Equidad interna'],
    linkedin: 'https://www.linkedin.com/in/matias-contreras-ejemplo',
    validadoPorSkilly: true,
    insignias: ['identidad_verificada', 'titulo_verificado', 'entrevista_skilly'],
    fechaIngreso: '2024-06-02T12:00:00.000Z',
  },
  {
    id: 'prof-03',
    nombre: 'Fernanda',
    apellido: 'Aravena Soto',
    titulo: 'Contadora auditora · Finanzas para PyMEs',
    ciudad: 'Concepción',
    presentacion:
      'Ordeno la contabilidad de PyMEs para que sus dueños duerman tranquilos. Explico los números en simple y aviso con tiempo cuando hay algo que resolver.',
    formacion: ['Contadora auditora, Universidad de Concepción', 'Diplomado en Tributación, Universidad de Chile'],
    experiencia: [
      { cargo: 'Contadora general', organizacion: 'Constructora Bío Bío', periodo: '2016 – 2022' },
      { cargo: 'Asistente de auditoría', organizacion: 'Deloitte', periodo: '2013 – 2016' },
    ],
    habilidades: ['Contabilidad mensual', 'Declaración de renta', 'F29', 'Softland', 'Nubox', 'IFRS PyME'],
    linkedin: 'https://www.linkedin.com/in/fernanda-aravena-ejemplo',
    validadoPorSkilly: true,
    insignias: ['identidad_verificada', 'titulo_verificado', 'entrevista_skilly', 'referencias_verificadas'],
    fechaIngreso: '2024-04-20T12:00:00.000Z',
  },
  {
    id: 'prof-04',
    nombre: 'Rodrigo',
    apellido: 'Muñoz Pizarro',
    titulo: 'Abogado laboral · Administración de personal',
    ciudad: 'Santiago',
    presentacion:
      'Acompaño a equipos de Personas en contratos, desvinculaciones y fiscalizaciones. Prefiero prevenir problemas que litigarlos, y hablo en castellano, no en leguleyo.',
    formacion: ['Abogado, Universidad Diego Portales', 'Magíster en Derecho del Trabajo, Universidad de Chile'],
    experiencia: [
      { cargo: 'Abogado laboral senior', organizacion: 'Estudio Carey', periodo: '2015 – 2022' },
      { cargo: 'Asesor jurídico de Personas', organizacion: 'LATAM Airlines', periodo: '2012 – 2015' },
    ],
    habilidades: ['Contratos de trabajo', 'Finiquitos', 'Dirección del Trabajo', 'Ley Karin', 'Reglamento interno', 'Teletrabajo'],
    linkedin: 'https://www.linkedin.com/in/rodrigo-munoz-ejemplo',
    validadoPorSkilly: true,
    insignias: ['identidad_verificada', 'titulo_verificado', 'entrevista_skilly'],
    fechaIngreso: '2024-09-05T12:00:00.000Z',
  },
  {
    id: 'prof-05',
    nombre: 'Javiera',
    apellido: 'Espinoza Lagos',
    titulo: 'Psicóloga laboral · Cultura y clima',
    ciudad: 'Santiago',
    presentacion:
      'Trabajo con equipos que crecieron rápido y sienten que perdieron algo en el camino. Mido el clima con rigor y transformo los resultados en acciones concretas, no en informes que nadie lee.',
    formacion: ['Psicóloga, Pontificia Universidad Católica de Chile', 'Magíster en Desarrollo Organizacional, UAI'],
    experiencia: [
      { cargo: 'Gerenta de Cultura', organizacion: 'Cornershop', periodo: '2019 – 2023' },
      { cargo: 'Consultora de clima', organizacion: 'Great Place to Work Chile', periodo: '2015 – 2019' },
    ],
    habilidades: ['Encuestas de clima', 'Facilitación de talleres', 'Cultura organizacional', 'Gestión del cambio', 'Focus groups'],
    linkedin: 'https://www.linkedin.com/in/javiera-espinoza-ejemplo',
    portafolio: 'https://javieraespinoza.cl',
    validadoPorSkilly: true,
    insignias: ['identidad_verificada', 'titulo_verificado', 'entrevista_skilly', 'referencias_verificadas'],
    fechaIngreso: '2024-02-14T12:00:00.000Z',
  },
  {
    id: 'prof-06',
    nombre: 'Sebastián',
    apellido: 'Torres Vidal',
    titulo: 'Ingeniero industrial · Onboarding y desempeño',
    ciudad: 'Temuco',
    presentacion:
      'Diseño procesos de inducción y evaluación de desempeño que se pueden sostener sin un departamento de Personas gigante. Me importa que funcionen el segundo mes, no solo el primero.',
    formacion: ['Ingeniero civil industrial, Universidad de La Frontera', 'Certificación en Diseño Instruccional'],
    experiencia: [
      { cargo: 'Jefe de Desarrollo Organizacional', organizacion: 'Masisa', periodo: '2018 – 2024' },
      { cargo: 'Analista de procesos', organizacion: 'Agrosuper', periodo: '2015 – 2018' },
    ],
    habilidades: ['Onboarding', 'Evaluación de desempeño', 'OKR', 'Diseño de procesos', 'Notion', 'Capacitación'],
    linkedin: 'https://www.linkedin.com/in/sebastian-torres-ejemplo',
    validadoPorSkilly: true,
    insignias: ['identidad_verificada', 'titulo_verificado'],
    fechaIngreso: '2025-01-22T12:00:00.000Z',
  },
  {
    // Profesional nuevo (1 evaluación)
    id: 'prof-07',
    nombre: 'Valentina',
    apellido: 'Herrera Campos',
    titulo: 'Reclutadora especializada en perfiles tecnológicos',
    ciudad: 'Santiago',
    presentacion:
      'Vengo del mundo de las startups, donde reclutar rápido y bien no es opcional. Conozco el mercado tech chileno, sus sueldos y dónde encontrar a la gente que no está buscando pega.',
    formacion: ['Ingeniera comercial, Universidad de Santiago', 'Bootcamp Tech Recruiting, Talently'],
    experiencia: [
      { cargo: 'Tech Recruiter', organizacion: 'Fintual', periodo: '2022 – 2025' },
      { cargo: 'Analista de selección', organizacion: 'Buk', periodo: '2020 – 2022' },
    ],
    habilidades: ['Sourcing', 'LinkedIn Recruiter', 'Perfiles de desarrollo', 'Entrevistas técnicas', 'Employer branding'],
    linkedin: 'https://www.linkedin.com/in/valentina-herrera-ejemplo',
    validadoPorSkilly: true,
    insignias: ['identidad_verificada', 'titulo_verificado', 'entrevista_skilly'],
    fechaIngreso: '2026-07-01T12:00:00.000Z',
  },
  {
    // Profesional nuevo (0 evaluaciones)
    id: 'prof-08',
    nombre: 'Diego',
    apellido: 'Salazar Reyes',
    titulo: 'Contador · Remuneraciones y Previred',
    ciudad: 'Antofagasta',
    presentacion:
      'Me encargo de que las liquidaciones salgan bien y a tiempo todos los meses. Trabajé ocho años en empresas mineras con dotaciones grandes y turnos complejos.',
    formacion: ['Contador general, Instituto Profesional AIEP', 'Curso de Legislación Laboral, Sofofa'],
    experiencia: [
      { cargo: 'Analista de remuneraciones', organizacion: 'Minera Escondida (contratista)', periodo: '2018 – 2026' },
    ],
    habilidades: ['Liquidaciones de sueldo', 'Previred', 'Buk', 'Talana', 'Turnos', 'Finiquitos'],
    linkedin: 'https://www.linkedin.com/in/diego-salazar-ejemplo',
    validadoPorSkilly: true,
    insignias: ['identidad_verificada', 'entrevista_skilly'],
    fechaIngreso: '2026-08-18T12:00:00.000Z',
  },
  {
    // Profesional nuevo (2 evaluaciones)
    id: 'prof-09',
    nombre: 'Antonia',
    apellido: 'Fuentes Castillo',
    titulo: 'Relacionadora pública · Marca empleadora y selección masiva',
    ciudad: 'Viña del Mar',
    presentacion:
      'Ayudo a empresas que necesitan contratar mucha gente en poco tiempo, cuidando cómo se ven hacia afuera. Ferias, campañas y procesos ordenados de principio a fin.',
    formacion: ['Relacionadora pública, Universidad de Viña del Mar', 'Diplomado en Marketing Digital, UC'],
    experiencia: [
      { cargo: 'Coordinadora de selección masiva', organizacion: 'Sodexo Chile', periodo: '2021 – 2025' },
      { cargo: 'Community manager', organizacion: 'Agencia Latido', periodo: '2019 – 2021' },
    ],
    habilidades: ['Procesos masivos', 'Marca empleadora', 'Ferias laborales', 'Redes sociales', 'Onboarding masivo'],
    linkedin: 'https://www.linkedin.com/in/antonia-fuentes-ejemplo',
    portafolio: 'https://antoniafuentes.cl/portafolio',
    validadoPorSkilly: true,
    insignias: ['identidad_verificada', 'titulo_verificado', 'entrevista_skilly'],
    fechaIngreso: '2026-05-10T12:00:00.000Z',
  },
  {
    id: 'prof-10',
    nombre: 'Cristóbal',
    apellido: 'Navarro Ibáñez',
    titulo: 'Coach ejecutivo · Desarrollo de liderazgo',
    ciudad: 'La Serena',
    presentacion:
      'Trabajo con jefaturas que fueron ascendidas por ser buenas en lo técnico y ahora tienen que liderar personas. Talleres prácticos, con casos reales de tu empresa.',
    formacion: ['Psicólogo, Universidad de La Serena', 'Coach ontológico certificado, Newfield Network'],
    experiencia: [
      { cargo: 'Consultor de liderazgo', organizacion: 'Independiente', periodo: '2016 – actualidad' },
      { cargo: 'Jefe de Capacitación', organizacion: 'Compañía Minera del Pacífico', periodo: '2011 – 2016' },
    ],
    habilidades: ['Coaching ejecutivo', 'Talleres de liderazgo', 'Feedback', 'Conversaciones difíciles', 'Equipos'],
    linkedin: 'https://www.linkedin.com/in/cristobal-navarro-ejemplo',
    validadoPorSkilly: false,
    insignias: ['identidad_verificada'],
    fechaIngreso: '2025-03-03T12:00:00.000Z',
  },
  {
    // Profesional nuevo (0 evaluaciones)
    id: 'prof-11',
    nombre: 'Constanza',
    apellido: 'Pérez Villalobos',
    titulo: 'Administradora · Gestión SENCE y capacitación',
    ciudad: 'Rancagua',
    presentacion:
      'Hago que la franquicia SENCE deje de ser un dolor de cabeza. Armo el plan anual, gestiono los cursos con los OTEC y me encargo del papeleo para que recuperes lo que te corresponde.',
    formacion: ['Administradora de empresas, Universidad de Talca', 'Curso de Gestión de Capacitación, Sence'],
    experiencia: [
      { cargo: 'Encargada de capacitación', organizacion: 'Agrícola San Clemente', periodo: '2019 – 2026' },
    ],
    habilidades: ['Franquicia SENCE', 'Plan anual de capacitación', 'OTEC', 'Detección de necesidades', 'Excel'],
    linkedin: 'https://www.linkedin.com/in/constanza-perez-ejemplo',
    validadoPorSkilly: true,
    insignias: ['identidad_verificada', 'titulo_verificado', 'entrevista_skilly'],
    fechaIngreso: '2026-08-25T12:00:00.000Z',
  },
  {
    id: 'prof-12',
    nombre: 'Ignacio',
    apellido: 'Bravo Mardones',
    titulo: 'Ingeniero comercial · Finanzas y flujo de caja',
    ciudad: 'Santiago',
    presentacion:
      'Armo presupuestos y flujos de caja que sirven para decidir, no para archivar. He acompañado a más de 30 startups en su primera ronda de inversión.',
    formacion: ['Ingeniero comercial, Universidad Adolfo Ibáñez', 'MBA, Universidad de Chile'],
    experiencia: [
      { cargo: 'CFO fraccional', organizacion: 'Varias startups', periodo: '2020 – actualidad' },
      { cargo: 'Gerente de Finanzas', organizacion: 'Kaufmann', periodo: '2014 – 2020' },
    ],
    habilidades: ['Flujo de caja', 'Presupuesto', 'Modelamiento financiero', 'Levantamiento de capital', 'KPI financieros'],
    linkedin: 'https://www.linkedin.com/in/ignacio-bravo-ejemplo',
    validadoPorSkilly: true,
    insignias: ['identidad_verificada', 'titulo_verificado', 'entrevista_skilly', 'referencias_verificadas'],
    fechaIngreso: '2024-11-11T12:00:00.000Z',
  },
];

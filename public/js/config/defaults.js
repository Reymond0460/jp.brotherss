/**
 * Datos iniciales del negocio.
 *
 * Se usan en dos lugares:
 *   1. El modo demo (localStorage) los carga la primera vez que se abre el sitio.
 *   2. `scripts/seed-firestore.mjs` los sube a Firestore al preparar QA o producción.
 *
 * IMPORTANTE: precios, servicios y promos son EJEMPLOS. El barbero los cambia desde
 * el panel admin (no hace falta tocar código).
 */

export const DEFAULT_BUSINESS = {
  name: 'JP Brothers',
  // Número de pruebas. Cambiar por el WhatsApp real del barbero (solo dígitos, con código de país).
  whatsapp: '56940916058',
  instagram: 'jp.brotherss',
  street: 'Gran Av. José Miguel Carrera 9397',
  // Completar con la comuna cuando el cliente la confirme (mejora la precisión del mapa).
  area: 'Santiago, Chile',
  maxDaysAhead: 21, // hasta cuántos días hacia adelante se puede reservar
  minNoticeMinutes: 60, // anticipación mínima para reservar el mismo día
};

/** Horario semanal. Clave = día (0 domingo … 6 sábado). `breakStart/breakEnd` son opcionales. */
export const DEFAULT_SCHEDULE = {
  weekly: {
    0: { open: false, start: '10:00', end: '14:00', breakStart: '', breakEnd: '' },
    1: { open: true, start: '10:00', end: '20:00', breakStart: '14:00', breakEnd: '15:00' },
    2: { open: true, start: '10:00', end: '20:00', breakStart: '14:00', breakEnd: '15:00' },
    3: { open: true, start: '10:00', end: '20:00', breakStart: '14:00', breakEnd: '15:00' },
    4: { open: true, start: '10:00', end: '20:00', breakStart: '14:00', breakEnd: '15:00' },
    5: { open: true, start: '10:00', end: '20:00', breakStart: '', breakEnd: '' },
    6: { open: true, start: '10:00', end: '18:00', breakStart: '', breakEnd: '' },
  },
  // Días sin atención: [{ date: '2026-12-25', label: 'Navidad' }]
  closedDates: [],
};

export const DEFAULT_SERVICES = [
  { id: 'corte', name: 'Corte clásico', description: 'Tijera o máquina, terminación con navaja.', price: 8000, durationMin: 30, active: true, order: 1 },
  { id: 'degrade', name: 'Degradé / Fade', description: 'Degradado limpio con diseño a elección.', price: 10000, durationMin: 30, active: true, order: 2 },
  { id: 'corte-barba', name: 'Corte + barba', description: 'El combo completo: corte, perfilado y toalla caliente.', price: 12000, durationMin: 60, active: true, order: 3 },
  { id: 'barba', name: 'Perfilado de barba', description: 'Contorno, líneas y vapor para dejarla pareja.', price: 5000, durationMin: 30, active: true, order: 4 },
  { id: 'nino', name: 'Corte niño', description: 'Hasta 12 años.', price: 6000, durationMin: 30, active: true, order: 5 },
];

export const DEFAULT_PROMOS = [
  {
    id: 'combo-brothers',
    title: 'Combo Brothers',
    description: 'Corte + barba con toalla caliente a precio especial.',
    badge: '-$2.000',
    serviceId: 'corte-barba',
    promoPrice: 10000,
    validUntil: '', // vacío = sin fecha de término
    active: true,
  },
  {
    id: 'nino-semana',
    title: 'Día de los peques',
    description: 'Corte niño a precio especial.',
    badge: '$5.000',
    serviceId: 'nino',
    promoPrice: 5000,
    validUntil: '',
    active: true,
  },
  {
    id: 'trae-amigo',
    title: 'Trae a un amigo',
    description: 'Si vienen juntos, el perfilado de cejas es cortesía. Pregunta por WhatsApp.',
    badge: 'Cortesía',
    serviceId: '', // sin servicio asociado: solo informativa
    promoPrice: null,
    validUntil: '',
    active: true,
  },
];

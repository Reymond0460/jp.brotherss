/**
 * Datos de ejemplo para el modo demo.
 *
 * Genera reservas del mes pasado, de este mes y de la próxima semana para que el panel
 * admin (gráficos, ingresos, agenda) tenga con qué mostrarse desde el primer minuto.
 * Usa un generador pseudoaleatorio con semilla: los datos son "aleatorios" pero estables.
 */
import { DEMO_BOOKING_ID, DEMO_PHONE } from '../config/constants.js';
import { DEFAULT_BUSINESS, DEFAULT_PROMOS, DEFAULT_SCHEDULE, DEFAULT_SERVICES } from '../config/defaults.js';
import { addDays, dateTimeOf, monthOf, shiftMonth, todayISO } from '../core/dates.js';
import { generateBookingId } from '../core/booking-code.js';
import { computeSlots, getDayHours, parseSlotKey, slotKeysFor } from '../domain/availability.js';
import { priceFor } from '../domain/pricing.js';
import { STATUS } from '../domain/booking-status.js';


const FIRST_NAMES = ['Matías', 'Benjamín', 'Vicente', 'Joaquín', 'Felipe', 'Cristóbal', 'Diego', 'Sebastián', 'Nicolás', 'Tomás', 'Ignacio', 'Camilo', 'Franco', 'Bastián'];
const LAST_NAMES = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez'];

/** Generador pseudoaleatorio determinista (mulberry32). */
function createRandom(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fotos de EJEMPLO para el carrusel de la demo (tarjetas ilustradas, no son trabajos reales).
 * El barbero sube sus fotos reales desde el panel → Galería.
 */
function buildPlaceholderGallery() {
  const slides = [
    { caption: 'Degradé limpio', tint: '#d8e7f3', ink: '#2a5dc4' },
    { caption: 'Corte y barba', tint: '#fbe3e0', ink: '#d8443a' },
    { caption: 'Perfilado de barba', tint: '#fdf0c8', ink: '#9a7200' },
    { caption: 'Corte clásico', tint: '#dcf2e7', ink: '#1b7f53' },
    { caption: 'Diseño a navaja', tint: '#dce7fa', ink: '#1e479c' },
  ];
  return slides.map((s, index) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="${s.tint}"/><g fill="none" stroke="${s.ink}" stroke-width="10" stroke-linecap="round" transform="translate(120 150)"><circle cx="30" cy="30" r="26"/><circle cx="30" cy="150" r="26"/><path d="M50 48 L150 150M50 132 L150 30"/></g><text x="200" y="410" text-anchor="middle" font-family="sans-serif" font-size="20" fill="${s.ink}" opacity="0.75">Foto de ejemplo</text></svg>`;
    return { id: `ejemplo-${index + 1}`, src: `data:image/svg+xml,${encodeURIComponent(svg)}`, caption: s.caption, order: index + 1, active: true };
  });
}

/** Estado inicial completo de la demo. */
export function buildSeedState(now = new Date()) {
  const today = todayISO(now);
  const month = monthOf(today);
  const rand = createRandom(Number(month.replace('-', '')));
  const pick = (list) => list[Math.floor(rand() * list.length)];

  const schedule = structuredClone(DEFAULT_SCHEDULE);
  const services = structuredClone(DEFAULT_SERVICES);
  const promos = structuredClone(DEFAULT_PROMOS);
  const bookings = {};
  const slots = {};

  /** Registra una reserva y ocupa sus bloques (si sigue viva). */
  function addBooking({ id = generateBookingId(), date, time, service, status, promo = null, name, phone, source = 'web' }) {
    const slotKeys = slotKeysFor(date, time, service.durationMin);
    const price = priceFor(service, promo);
    const stamp = new Date(dateTimeOf(date, time).getTime() - 86_400_000).toISOString();
    bookings[id] = {
      id,
      serviceId: service.id,
      serviceName: service.name,
      durationMin: service.durationMin,
      price,
      promoId: promo?.id ?? '',
      promoTitle: promo?.title ?? '',
      date,
      time,
      clientName: name,
      clientPhone: phone,
      notes: '',
      status,
      source,
      slotKeys,
      createdAt: stamp,
      updatedAt: stamp,
    };
    if (status !== STATUS.CANCELLED) {
      for (const key of slotKeys) slots[key] = { key, ...parseSlotKey(key), kind: 'booking', bookingId: id };
    }
    return id;
  }

  const start = `${shiftMonth(month, -1)}-01`;
  const end = addDays(today, 6);

  for (let date = start; date <= end; date = addDays(date, 1)) {
    if (!getDayHours(schedule, date)) continue;
    const target = date >= today ? 2 + Math.floor(rand() * 3) : 3 + Math.floor(rand() * 5);

    for (let i = 0; i < target; i++) {
      const service = pick(services);
      const busy = new Set(Object.values(slots).filter((s) => s.date === date).map((s) => s.time));
      const free = computeSlots({ schedule, date, durationMin: service.durationMin, busy, now: new Date(0) }).filter((s) => s.status === 'free');
      if (!free.length) continue;

      const { time } = pick(free);
      const promo = service.id === 'corte-barba' && rand() < 0.3 ? promos[0] : null;
      const isPast = dateTimeOf(date, time) < now;
      const roll = rand();

      let status;
      if (isPast) status = roll < 0.84 ? STATUS.DONE : roll < 0.92 ? STATUS.CANCELLED : STATUS.NO_SHOW;
      else status = roll < 0.65 ? STATUS.CONFIRMED : STATUS.PENDING;

      addBooking({
        date,
        time,
        service,
        status,
        promo,
        name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
        phone: `569${String(Math.floor(rand() * 1e8)).padStart(8, '0')}`,
      });
    }
  }

  // Reserva de demostración conocida: próximo día de atención, a primera hora libre.
  let demoDate = addDays(today, 1);
  while (!getDayHours(schedule, demoDate)) demoDate = addDays(demoDate, 1);
  const demoService = services.find((s) => s.id === 'corte') ?? services[0];
  const busy = new Set(Object.values(slots).filter((s) => s.date === demoDate).map((s) => s.time));
  const demoSlot = computeSlots({ schedule, date: demoDate, durationMin: demoService.durationMin, busy, now: new Date(0) }).find((s) => s.status === 'free');
  if (demoSlot) {
    addBooking({ id: DEMO_BOOKING_ID, date: demoDate, time: demoSlot.time, service: demoService, status: STATUS.CONFIRMED, name: 'Cliente Demo', phone: DEMO_PHONE });
  }

  return {
    seedMonth: month,
    business: { ...DEFAULT_BUSINESS },
    schedule,
    services,
    promos,
    gallery: buildPlaceholderGallery(),
    bookings,
    slots,
  };
}

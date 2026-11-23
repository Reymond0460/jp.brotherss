/**
 * Casos de uso de reservas: une la lógica pura (domain/) con los datos (data/).
 * Lo usan tanto el sitio público como el panel admin.
 */
import { addDays, todayISO } from '../core/dates.js';
import { generateBookingId, parseBookingCode } from '../core/booking-code.js';
import { computeSlots, parseSlotKey, slotKeysFor } from '../domain/availability.js';
import { priceFor } from '../domain/pricing.js';
import { STATUS } from '../domain/booking-status.js';

/** Carga de una vez todo lo que el sitio necesita para pintarse. */
export async function loadCatalog(repo, { includeInactive = false } = {}) {
  const [business, schedule, services, promos] = await Promise.all([
    repo.getBusiness(),
    repo.getSchedule(),
    repo.listServices(),
    repo.listPromos(),
  ]);
  return {
    business,
    schedule,
    promos,
    services: includeInactive ? services : services.filter((s) => s.active !== false),
  };
}

/** Horas ocupadas agrupadas por fecha: Map<"YYYY-MM-DD", Set<"HH:MM">>. */
export async function fetchBusyByDate(repo, from, to) {
  const slots = await repo.listSlots(from, to);
  const map = new Map();
  for (const slot of slots) {
    if (!map.has(slot.date)) map.set(slot.date, new Set());
    map.get(slot.date).add(slot.time);
  }
  return map;
}

/**
 * Horas de un día para un servicio.
 * `ignoreBooking`: al reprogramar, los bloques de la propia reserva no cuentan como ocupados.
 */
export async function getDaySlots({ repo, catalog, service, date, ignoreBooking = null, now = new Date() }) {
  const busyMap = await fetchBusyByDate(repo, date, date);
  const busy = new Set(busyMap.get(date) ?? []);
  if (ignoreBooking?.date === date) {
    for (const key of ignoreBooking.slotKeys ?? []) busy.delete(parseSlotKey(key).time);
  }
  return computeSlots({
    schedule: catalog.schedule,
    date,
    durationMin: service.durationMin,
    busy,
    now,
    minNoticeMin: catalog.business.minNoticeMinutes,
  });
}

/** Primera hora libre de un servicio dentro de la ventana de reservas, o null. */
export async function findNextFreeSlot({ repo, catalog, service, now = new Date() }) {
  const from = todayISO(now);
  const to = addDays(from, catalog.business.maxDaysAhead);
  const busyMap = await fetchBusyByDate(repo, from, to);

  for (let date = from; date <= to; date = addDays(date, 1)) {
    const slots = computeSlots({
      schedule: catalog.schedule,
      date,
      durationMin: service.durationMin,
      busy: busyMap.get(date) ?? new Set(),
      now,
      minNoticeMin: catalog.business.minNoticeMinutes,
    });
    const free = slots.find((s) => s.status === 'free');
    if (free) return { date, time: free.time };
  }
  return null;
}

/**
 * Construye y guarda una reserva.
 * `source: 'web'` → la crea el cliente (queda por confirmar).
 * `source: 'admin'` → la crea el barbero (queda confirmada).
 * Lanza SlotTakenError si la hora ya no está libre.
 */
export async function createBooking({ repo, service, promo = null, date, time, client, source = 'web', price = null }) {
  const booking = {
    id: generateBookingId(),
    serviceId: service.id,
    serviceName: service.name,
    durationMin: service.durationMin,
    // `price` solo lo usa el barbero para cobrar un valor distinto al de la lista.
    price: price ?? priceFor(service, promo),
    promoId: promo?.id ?? '',
    promoTitle: promo?.title ?? '',
    date,
    time,
    clientName: client.name,
    clientPhone: client.phone,
    notes: client.notes ?? '',
    status: source === 'admin' ? STATUS.CONFIRMED : STATUS.PENDING,
    source,
    slotKeys: slotKeysFor(date, time, service.durationMin),
  };
  await repo.createBooking(booking);
  return { ...booking, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

/**
 * "Ver mi reserva": basta con el código. Es un código aleatorio de 8 caracteres
 * (≈ 850 mil millones de combinaciones) y Firestore no permite listar las reservas,
 * así que solo quien lo conoce puede consultarla.
 * @returns {Promise<{ok:true, booking:object} | {ok:false, reason:'invalid-code'|'not-found'}>}
 */
export async function lookupBooking(repo, codeInput) {
  const id = parseBookingCode(codeInput);
  if (!id) return { ok: false, reason: 'invalid-code' };

  const booking = await repo.getBooking(id);
  return booking ? { ok: true, booking } : { ok: false, reason: 'not-found' };
}

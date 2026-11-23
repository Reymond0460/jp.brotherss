/**
 * Cálculo de disponibilidad (lógica pura: sin red, sin DOM, fácil de testear).
 *
 * Idea central: la jornada se divide en bloques de `slotMin` minutos (30 por defecto).
 * Cada reserva ocupa uno o más bloques según la duración del servicio.
 * Cada bloque ocupado se guarda como un documento "slot" con id "YYYY-MM-DD_HHMM".
 * Que el id sea único es lo que impide reservar dos veces la misma hora.
 */
import { SLOT_MINUTES } from '../config/constants.js';
import { dateTimeOf, minutesToTime, timeToMinutes, weekdayOf } from '../core/dates.js';

/** "2026-11-25", "10:30" → "2026-11-25_1030" */
export const slotKey = (date, time) => `${date}_${time.replace(':', '')}`;

/** "2026-11-25_1030" → { date: "2026-11-25", time: "10:30" } */
export function parseSlotKey(key) {
  const [date, hhmm] = key.split('_');
  return { date, time: `${hhmm.slice(0, 2)}:${hhmm.slice(2)}` };
}

/** Cuántos bloques ocupa un servicio. */
export const unitsFor = (durationMin, slotMin = SLOT_MINUTES) => Math.max(1, Math.ceil(durationMin / slotMin));

/** Lista de claves de bloque que ocupa una reserva que parte a `time`. */
export function slotKeysFor(date, time, durationMin, slotMin = SLOT_MINUTES) {
  const start = timeToMinutes(time);
  return Array.from({ length: unitsFor(durationMin, slotMin) }, (_, i) => slotKey(date, minutesToTime(start + i * slotMin)));
}

/**
 * Horario de atención de una fecha, o null si ese día no se atiende
 * (día cerrado en la semana o fecha marcada como cerrada).
 */
export function getDayHours(schedule, date) {
  if (schedule.closedDates?.some((c) => (typeof c === 'string' ? c : c.date) === date)) return null;
  const hours = schedule.weekly?.[weekdayOf(date)];
  return hours?.open ? hours : null;
}

/** Horas de inicio de cada bloque del día, saltándose la pausa (colación). */
export function gridTimes(hours, slotMin = SLOT_MINUTES) {
  const start = timeToMinutes(hours.start);
  const end = timeToMinutes(hours.end);
  const breakStart = hours.breakStart ? timeToMinutes(hours.breakStart) : null;
  const breakEnd = hours.breakEnd ? timeToMinutes(hours.breakEnd) : null;

  const times = [];
  for (let m = start; m + slotMin <= end; m += slotMin) {
    const insideBreak = breakStart !== null && breakEnd !== null && m < breakEnd && m + slotMin > breakStart;
    if (!insideBreak) times.push(minutesToTime(m));
  }
  return times;
}

/**
 * Estado de cada hora de inicio posible para un servicio.
 *
 * @param {object} p
 * @param {object} p.schedule      { weekly, closedDates }
 * @param {string} p.date          "YYYY-MM-DD"
 * @param {number} p.durationMin   duración del servicio
 * @param {Set<string>} p.busy     horas "HH:MM" ya ocupadas ese día
 * @param {Date} [p.now]
 * @param {number} [p.minNoticeMin]  anticipación mínima (solo importa para hoy)
 * @returns {{time:string, status:'free'|'busy'|'past'}[]}  Las horas donde el servicio no cabe se omiten.
 */
export function computeSlots({ schedule, date, durationMin, busy, now = new Date(), minNoticeMin = 0, slotMin = SLOT_MINUTES }) {
  const hours = getDayHours(schedule, date);
  if (!hours) return [];

  const grid = gridTimes(hours, slotMin);
  const gridSet = new Set(grid);
  const units = unitsFor(durationMin, slotMin);
  const earliest = now.getTime() + minNoticeMin * 60_000;

  const result = [];
  for (const time of grid) {
    const start = timeToMinutes(time);
    const needed = Array.from({ length: units }, (_, i) => minutesToTime(start + i * slotMin));
    // El servicio debe caber completo dentro de la jornada y sin cruzar la pausa.
    if (!needed.every((t) => gridSet.has(t))) continue;

    let status = 'free';
    if (dateTimeOf(date, time).getTime() < earliest) status = 'past';
    else if (needed.some((t) => busy.has(t))) status = 'busy';
    result.push({ time, status });
  }
  return result;
}

/** Fechas reservables desde hoy: [{ date, open }] para `days` días corridos. */
export function bookableDates({ schedule, from, days }) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(`${from}T00:00:00`);
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { date: iso, open: getDayHours(schedule, iso) !== null };
  });
}

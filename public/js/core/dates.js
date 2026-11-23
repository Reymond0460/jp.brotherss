/**
 * Utilidades de fechas y horas.
 *
 * Convenciones:
 *  - Fecha  = string ISO local "YYYY-MM-DD"   (no se usa UTC: la barbería opera en hora de Chile).
 *  - Hora   = string "HH:MM" en 24 h.
 *  - Mes    = string "YYYY-MM".
 * Trabajar con strings evita los errores clásicos de zona horaria de `new Date('2026-11-22')`.
 */
import { WEEKDAYS, WEEKDAYS_SHORT } from '../config/constants.js';

const pad = (n) => String(n).padStart(2, '0');

export const toISODate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayISO = (now = new Date()) => toISODate(now);

export function addDays(iso, days) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export const weekdayOf = (iso) => parseISODate(iso).getDay();

export const timeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const minutesToTime = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** Momento exacto (Date) en que empieza una hora reservada. */
export function dateTimeOf(dateISO, time) {
  const d = parseISODate(dateISO);
  d.setHours(0, timeToMinutes(time), 0, 0);
  return d;
}

/* ---------- Meses ---------- */

export const monthOf = (iso) => iso.slice(0, 7);

/** Primer y último día de un mes "YYYY-MM". */
export function monthBounds(month) {
  const [y, m] = month.split('-').map(Number);
  return { from: `${month}-01`, to: `${month}-${pad(new Date(y, m, 0).getDate())}` };
}

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export const daysInMonth = (month) => Number(monthBounds(month).to.slice(8));

/* ---------- Formato para mostrar ---------- */

export const capitalize = (text) => (text ? text[0].toUpperCase() + text.slice(1) : text);

const longFormatter = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
const shortFormatter = new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
const monthFormatter = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' });

/** "lunes 23 de noviembre" */
export const formatLongDate = (iso) => longFormatter.format(parseISODate(iso));
/** "lun, 23 nov" */
export const formatShortDate = (iso) => shortFormatter.format(parseISODate(iso)).replace('.', '');
/** "Noviembre 2026" */
export const formatMonth = (month) => capitalize(monthFormatter.format(parseISODate(`${month}-01`)));

/** Partes sueltas para pintar un selector de días: { dow: "lun", day: "23", month: "nov" }. */
export function formatDayParts(iso) {
  const d = parseISODate(iso);
  return {
    dow: WEEKDAYS_SHORT[d.getDay()],
    day: String(d.getDate()),
    month: new Intl.DateTimeFormat('es-CL', { month: 'short' }).format(d).replace('.', ''),
  };
}

/** "Hoy", "Mañana" o "lunes 23 de noviembre". */
export function relativeDayLabel(iso, now = new Date()) {
  const today = todayISO(now);
  if (iso === today) return 'Hoy';
  if (iso === addDays(today, 1)) return 'Mañana';
  return capitalize(formatLongDate(iso));
}

export const weekdayName = (iso) => WEEKDAYS[weekdayOf(iso)];
export const weekdayShort = (iso) => WEEKDAYS_SHORT[weekdayOf(iso)];

/**
 * "¿Está abierto ahora?" a partir del horario semanal.
 * Devuelve un texto listo para mostrar en la portada.
 */
import { addDays, timeToMinutes, todayISO, weekdayName } from '../core/dates.js';
import { getDayHours } from './availability.js';

/** @returns {{open: boolean, label: string}} */
export function getOpenStatus(schedule, now = new Date()) {
  const today = todayISO(now);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const hours = getDayHours(schedule, today);

  if (hours) {
    const start = timeToMinutes(hours.start);
    const end = timeToMinutes(hours.end);

    if (minutes >= start && minutes < end) {
      const inBreak = hours.breakStart && hours.breakEnd && minutes >= timeToMinutes(hours.breakStart) && minutes < timeToMinutes(hours.breakEnd);
      return inBreak
        ? { open: false, label: `En colación · vuelve a las ${hours.breakEnd}` }
        : { open: true, label: `Abierto ahora · hasta las ${hours.end}` };
    }
    if (minutes < start) return { open: false, label: `Cerrado · abre hoy a las ${hours.start}` };
  }

  // Ya cerró (o hoy no se atiende): buscar el próximo día con atención.
  for (let i = 1; i <= 14; i++) {
    const date = addDays(today, i);
    const next = getDayHours(schedule, date);
    if (next) {
      const when = i === 1 ? 'mañana' : weekdayName(date).toLowerCase();
      return { open: false, label: `Cerrado · abre ${when} a las ${next.start}` };
    }
  }
  return { open: false, label: 'Cerrado por ahora' };
}

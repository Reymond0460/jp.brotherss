/**
 * Estados de una reserva y reglas asociadas.
 *
 *   pending   → el cliente la creó, falta que el barbero la confirme.
 *   confirmed → el barbero la confirmó.
 *   done      → el cliente fue atendido (aquí se registra el cobro).
 *   cancelled → anulada (libera la hora).
 *   noshow    → el cliente no llegó.
 */
import { dateTimeOf } from '../core/dates.js';

export const STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  DONE: 'done',
  CANCELLED: 'cancelled',
  NO_SHOW: 'noshow',
});

export const STATUS_LABEL = Object.freeze({
  pending: 'Por confirmar',
  confirmed: 'Confirmada',
  done: 'Atendida',
  cancelled: 'Cancelada',
  noshow: 'No asistió',
});

/** Reservas que todavía están "vivas" (ocupan agenda y pueden pasar a atendida). */
export const isActive = (booking) => booking.status === STATUS.PENDING || booking.status === STATUS.CONFIRMED;

/** Solo las atendidas cuentan como dinero ganado. */
export const isRevenue = (booking) => booking.status === STATUS.DONE;

/** Monto real cobrado: el precio final (si el barbero lo ajustó) o el precio de la reserva. */
export const revenueOf = (booking) => Number(booking.finalPrice ?? booking.price) || 0;

/** El cliente solo puede cancelar si la reserva está viva y aún no empieza. */
export function canClientCancel(booking, now = new Date()) {
  return isActive(booking) && dateTimeOf(booking.date, booking.time) > now;
}

/** Orden cronológico (fecha y hora). */
export const byDateTime = (a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);

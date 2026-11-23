/**
 * Estadísticas del panel admin (lógica pura sobre listas de reservas).
 *
 * Criterio de negocio:
 *   - "Cortes" y "dinero" cuentan SOLO reservas atendidas (status = done).
 *   - "Por cobrar" suma las reservas vivas (pendientes/confirmadas) de la fecha.
 */
import { daysInMonth, monthOf, weekdayOf } from '../core/dates.js';
import { isActive, isRevenue, revenueOf, STATUS } from './booking-status.js';

const sum = (list, fn) => list.reduce((total, item) => total + fn(item), 0);

/** Totales de un día. */
export function dayTotals(bookings, date) {
  const day = bookings.filter((b) => b.date === date);
  const done = day.filter(isRevenue);
  const upcoming = day.filter(isActive);
  return {
    total: day.length,
    cuts: done.length,
    revenue: sum(done, revenueOf),
    upcomingCount: upcoming.length,
    upcomingRevenue: sum(upcoming, (b) => Number(b.price) || 0),
  };
}

/**
 * Totales de un mes "YYYY-MM".
 * `untilDay` limita hasta ese día del mes: sirve para comparar el mes en curso con el mismo
 * período del mes anterior (y no con el mes anterior completo).
 */
export function monthTotals(bookings, month, { untilDay = 31 } = {}) {
  const inMonth = bookings.filter((b) => monthOf(b.date) === month && Number(b.date.slice(8)) <= untilDay);
  const done = inMonth.filter(isRevenue);
  const revenue = sum(done, revenueOf);
  return {
    total: inMonth.length,
    cuts: done.length,
    revenue,
    average: done.length ? Math.round(revenue / done.length) : 0,
    cancelled: inMonth.filter((b) => b.status === STATUS.CANCELLED).length,
    noShow: inMonth.filter((b) => b.status === STATUS.NO_SHOW).length,
    upcomingRevenue: sum(inMonth.filter(isActive), (b) => Number(b.price) || 0),
  };
}

/** Serie diaria del mes: un punto por cada día (también los sin atención, con 0). */
export function dailySeries(bookings, month) {
  const days = Array.from({ length: daysInMonth(month) }, (_, i) => ({
    date: `${month}-${String(i + 1).padStart(2, '0')}`,
    day: i + 1,
    revenue: 0,
    cuts: 0,
  }));
  for (const b of bookings.filter(isRevenue)) {
    const point = days[Number(b.date.slice(8)) - 1];
    if (point && monthOf(b.date) === month) {
      point.revenue += revenueOf(b);
      point.cuts += 1;
    }
  }
  return days;
}

/** Cortes e ingresos por servicio, de mayor a menor ingreso. */
export function serviceBreakdown(bookings, month) {
  const map = new Map();
  for (const b of bookings.filter((x) => isRevenue(x) && monthOf(x.date) === month)) {
    const row = map.get(b.serviceName) ?? { name: b.serviceName, count: 0, revenue: 0 };
    row.count += 1;
    row.revenue += revenueOf(b);
    map.set(b.serviceName, row);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

/** Cortes por día de la semana (índice 0 = domingo). */
export function weekdayBreakdown(bookings, month) {
  const counts = Array(7).fill(0);
  for (const b of bookings.filter((x) => isRevenue(x) && monthOf(x.date) === month)) counts[weekdayOf(b.date)] += 1;
  return counts;
}

/** Variación porcentual entre dos valores. null si no hay base de comparación. */
export function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Pruebas de la lógica pura (sin navegador). Ejecutar con:  npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { computeSlots, getDayHours, gridTimes, parseSlotKey, slotKey, slotKeysFor, unitsFor } from '../public/js/domain/availability.js';
import { priceFor, isPromoActive } from '../public/js/domain/pricing.js';
import { getOpenStatus } from '../public/js/domain/open-status.js';
import { niceScale } from '../public/js/ui/charts.js';
import { dailySeries, dayTotals, monthTotals, serviceBreakdown, weekdayBreakdown } from '../public/js/domain/stats.js';
import { validateClient, validateWeekly } from '../public/js/domain/validators.js';
import { normalizePhone, formatPhone, formatCLP } from '../public/js/core/format.js';
import { formatBookingCode, generateBookingId, parseBookingCode } from '../public/js/core/booking-code.js';
import { addDays, monthBounds, shiftMonth } from '../public/js/core/dates.js';
import { DEFAULT_SCHEDULE } from '../public/js/config/defaults.js';
import { buildSeedState } from '../public/js/data/local-seed.js';

const schedule = structuredClone(DEFAULT_SCHEDULE);
// 2026-11-23 es lunes (10:00–20:00 con pausa 14:00–15:00); 2026-11-22 es domingo (cerrado).
const MONDAY = '2026-11-23';
const SUNDAY = '2026-11-22';
const longBefore = new Date('2026-11-01T00:00:00');

test('slotKey y parseSlotKey son inversos', () => {
  assert.equal(slotKey('2026-11-23', '10:30'), '2026-11-23_1030');
  assert.deepEqual(parseSlotKey('2026-11-23_1030'), { date: '2026-11-23', time: '10:30' });
});

test('un servicio de 60 min ocupa 2 bloques consecutivos', () => {
  assert.equal(unitsFor(60), 2);
  assert.equal(unitsFor(45), 2);
  assert.deepEqual(slotKeysFor(MONDAY, '10:00', 60), ['2026-11-23_1000', '2026-11-23_1030']);
});

test('domingo cerrado y fechas cerradas no tienen horario', () => {
  assert.equal(getDayHours(schedule, SUNDAY), null);
  const withHoliday = { ...schedule, closedDates: [{ date: MONDAY, label: 'Feriado' }] };
  assert.equal(getDayHours(withHoliday, MONDAY), null);
});

test('la grilla salta la pausa de colación', () => {
  const times = gridTimes(getDayHours(schedule, MONDAY));
  assert.ok(times.includes('13:30'));
  assert.ok(!times.includes('14:00'));
  assert.ok(!times.includes('14:30'));
  assert.ok(times.includes('15:00'));
  assert.equal(times.at(-1), '19:30');
});

test('un servicio largo no puede cruzar la pausa ni pasar del cierre', () => {
  const slots = computeSlots({ schedule, date: MONDAY, durationMin: 60, busy: new Set(), now: longBefore });
  const times = slots.map((s) => s.time);
  assert.ok(!times.includes('13:30'), '13:30 + 60 min cruzaría la pausa');
  assert.ok(!times.includes('19:30'), '19:30 + 60 min pasaría del cierre');
  assert.ok(times.includes('18:30'));
});

test('las horas ocupadas se marcan busy y las que chocan con un servicio largo también', () => {
  const busy = new Set(['11:00']);
  const slots = computeSlots({ schedule, date: MONDAY, durationMin: 60, busy, now: longBefore });
  const status = Object.fromEntries(slots.map((s) => [s.time, s.status]));
  assert.equal(status['11:00'], 'busy');
  assert.equal(status['10:30'], 'busy', '10:30 necesita 11:00, que está ocupado');
  assert.equal(status['10:00'], 'free');
});

test('las horas pasadas y las que no cumplen la anticipación mínima quedan en past', () => {
  const now = new Date('2026-11-23T12:00:00');
  const slots = computeSlots({ schedule, date: MONDAY, durationMin: 30, busy: new Set(), now, minNoticeMin: 60 });
  const status = Object.fromEntries(slots.map((s) => [s.time, s.status]));
  assert.equal(status['12:30'], 'past');
  assert.equal(status['13:00'], 'free');
});

test('precios: la promo solo aplica al servicio asociado', () => {
  const corte = { id: 'corte', price: 8000 };
  const combo = { id: 'corte-barba', price: 12000 };
  const promo = { id: 'p', serviceId: 'corte-barba', promoPrice: 10000 };
  assert.equal(priceFor(combo, promo), 10000);
  assert.equal(priceFor(corte, promo), 8000);
  assert.equal(priceFor(combo, null), 12000);
});

test('vigencia de promos', () => {
  assert.equal(isPromoActive({ active: true, validUntil: '2026-11-30' }, '2026-11-23'), true);
  assert.equal(isPromoActive({ active: true, validUntil: '2026-11-01' }, '2026-11-23'), false);
  assert.equal(isPromoActive({ active: false }, '2026-11-23'), false);
  assert.equal(isPromoActive({ active: true, validUntil: '' }, '2026-11-23'), true);
});

test('estadísticas: solo las atendidas suman dinero y cortes', () => {
  const bookings = [
    { date: '2026-11-02', status: 'done', price: 8000, serviceName: 'Corte' },
    { date: '2026-11-02', status: 'done', price: 12000, finalPrice: 13000, serviceName: 'Combo' },
    { date: '2026-11-02', status: 'cancelled', price: 8000, serviceName: 'Corte' },
    { date: '2026-11-03', status: 'confirmed', price: 8000, serviceName: 'Corte' },
    { date: '2026-10-30', status: 'done', price: 5000, serviceName: 'Barba' },
  ];
  assert.deepEqual(dayTotals(bookings, '2026-11-02'), { total: 3, cuts: 2, revenue: 21000, upcomingCount: 0, upcomingRevenue: 0 });
  const month = monthTotals(bookings, '2026-11');
  assert.equal(month.revenue, 21000);
  assert.equal(month.cuts, 2);
  assert.equal(month.average, 10500);
  assert.equal(month.cancelled, 1);
  assert.equal(month.upcomingRevenue, 8000);
  const series = dailySeries(bookings, '2026-11');
  assert.equal(series.length, 30);
  assert.equal(series[1].revenue, 21000);
  assert.equal(serviceBreakdown(bookings, '2026-11')[0].name, 'Combo');
  assert.equal(weekdayBreakdown(bookings, '2026-11').reduce((a, b) => a + b, 0), 2);
});

test('teléfonos chilenos', () => {
  assert.equal(normalizePhone('+56 9 4091 6058'), '56940916058');
  assert.equal(normalizePhone('940916058'), '56940916058');
  assert.equal(normalizePhone('12345'), null);
  assert.equal(normalizePhone('+56 2 2345 6789'), null);
  assert.equal(formatPhone('56940916058'), '+56 9 4091 6058');
});

test('formato de dinero en pesos chilenos', () => {
  assert.match(formatCLP(12000), /12\.000/);
});

test('códigos de reserva', () => {
  const id = generateBookingId();
  assert.equal(id.length, 8);
  assert.equal(parseBookingCode(formatBookingCode(id)), id);
  assert.equal(parseBookingCode(`jp ${id.toLowerCase()}`), id);
  assert.equal(parseBookingCode('JP-0000-0000'), null, 'el 0 no existe en el alfabeto');
  assert.equal(parseBookingCode('abc'), null);
});

test('validación del cliente', () => {
  assert.equal(validateClient({ name: 'A', phone: '940916058' }).ok, false);
  const ok = validateClient({ name: '  Juan   Pérez ', phone: '9 4091 6058', notes: ' sin   prisa ' });
  assert.equal(ok.ok, true);
  assert.equal(ok.values.name, 'Juan Pérez');
  assert.equal(ok.values.phone, '56940916058');
  assert.equal(ok.values.notes, 'sin prisa');
});

test('validación del horario semanal', () => {
  assert.equal(validateWeekly(schedule.weekly).ok, true);
  const bad = structuredClone(schedule.weekly);
  bad[1].end = '09:00';
  assert.equal(validateWeekly(bad).ok, false);
});

test('estado abierto/cerrado', () => {
  assert.deepEqual(getOpenStatus(schedule, new Date('2026-11-23T11:00:00')), { open: true, label: 'Abierto ahora · hasta las 20:00' });
  assert.match(getOpenStatus(schedule, new Date('2026-11-23T14:30:00')).label, /colación/);
  assert.match(getOpenStatus(schedule, new Date('2026-11-23T08:00:00')).label, /abre hoy a las 10:00/);
  assert.match(getOpenStatus(schedule, new Date('2026-11-23T21:00:00')).label, /abre mañana/);
  assert.match(getOpenStatus(schedule, new Date('2026-11-22T12:00:00')).label, /abre mañana a las 10:00/, 'domingo cerrado');
});

test('escala de los gráficos', () => {
  assert.deepEqual(niceScale(0), { max: 1, ticks: [0, 1] });
  const { max, ticks } = niceScale(63000);
  assert.ok(max >= 63000 && ticks[0] === 0 && ticks.at(-1) === max);
});

test('fechas', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.deepEqual(monthBounds('2026-02'), { from: '2026-02-01', to: '2026-02-28' });
});

test('los datos demo son coherentes: sin bloques duplicados y con la reserva de prueba', () => {
  const state = buildSeedState(new Date('2026-11-18T12:00:00'));
  const booked = Object.values(state.bookings).filter((b) => b.status !== 'cancelled');
  const keys = booked.flatMap((b) => b.slotKeys);
  assert.equal(new Set(keys).size, keys.length, 'ningún bloque está asignado a dos reservas');
  assert.ok(state.bookings.PRUEBA23);
  assert.ok(Object.values(state.bookings).some((b) => b.status === 'done'));
});

/**
 * RESUMEN: cortes y dinero de hoy y del mes, agenda de hoy y gráficos de rendimiento.
 */
import { el, replaceContent } from '../../core/dom.js';
import { capitalize, formatLongDate, formatMonth, monthBounds, monthOf, shiftMonth, todayISO } from '../../core/dates.js';
import { formatCLP, plural } from '../../core/format.js';
import { WEEKDAYS, WEEKDAYS_SHORT } from '../../config/constants.js';
import { byDateTime, STATUS_LABEL } from '../../domain/booking-status.js';
import { dailySeries, dayTotals, monthTotals, percentChange, serviceBreakdown, weekdayBreakdown } from '../../domain/stats.js';
import { barChart, compactCLP, hbarChart } from '../../ui/charts.js';
import { icon } from '../../ui/icons.js';
import { pageHeader } from '../components/page-header.js';

export async function renderDashboard(host, ctx) {
  const today = todayISO();
  const state = { month: monthOf(today) };

  async function load() {
    const prev = shiftMonth(state.month, -1);
    const from = monthBounds(prev).from;
    const to = monthBounds(state.month).to;
    const [range, todayOnly] = await Promise.all([
      ctx.repo.listBookings(from, to),
      // "Hoy" siempre se muestra, aunque se esté mirando otro mes.
      today >= from && today <= to ? null : ctx.repo.listBookings(today, today),
    ]);
    return { range, todayBookings: (todayOnly ?? range).filter((b) => b.date === today), prev };
  }

  async function paint() {
    const { range, todayBookings, prev } = await load();
    const day = dayTotals(todayBookings, today);
    const month = monthTotals(range, state.month);
    // Mes en curso: se compara con el mismo tramo del mes anterior (días 1 al de hoy).
    const isCurrentMonth = state.month === monthOf(today);
    const before = monthTotals(range, prev, { untilDay: isCurrentMonth ? Number(today.slice(8)) : 31 });
    const change = percentChange(month.revenue, before.revenue);
    const compareText = isCurrentMonth ? 'vs mismo tramo del mes anterior' : 'vs mes anterior';

    const monthNav = el(
      'div',
      { class: 'month-nav' },
      el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Mes anterior', onclick: () => go(-1) }, icon('chevron-left')),
      el('strong', { class: 'month-nav__label' }, formatMonth(state.month)),
      el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Mes siguiente', disabled: state.month >= monthOf(today), onclick: () => go(1) }, icon('chevron-right')),
    );

    const kpis = el(
      'section',
      { class: 'kpis', 'aria-label': 'Indicadores' },
      kpi({ label: 'Cortes hoy', value: day.cuts, sub: day.upcomingCount ? `${plural(day.upcomingCount, 'pendiente', 'pendientes')} por atender` : `${plural(day.total, 'reserva', 'reservas')} hoy`, icon: 'scissors' }),
      kpi({ label: 'Dinero hoy', value: formatCLP(day.revenue), sub: day.upcomingRevenue ? `${formatCLP(day.upcomingRevenue)} por cobrar` : 'Cobrado', icon: 'money' }),
      kpi({ label: `Dinero ${formatMonth(state.month).split(' ')[0].toLowerCase()}`, value: formatCLP(month.revenue), sub: change === null ? 'Sin mes anterior para comparar' : `${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}% ${compareText}`, tone: change === null ? '' : change >= 0 ? 'up' : 'down', icon: 'chart' }),
      kpi({ label: 'Cortes del mes', value: month.cuts, sub: month.cuts ? `Promedio ${formatCLP(month.average)} por corte` : 'Aún sin atenciones', icon: 'scissors' }),
    );

    const todayList = buildTodayList(todayBookings);

    const dailyHost = el('div');
    const serviceHost = el('div');
    const weekdayHost = el('div');

    replaceContent(
      host,
      pageHeader('Resumen', 'Cómo va el negocio', monthNav),
      ctx.catalog.services.length ? null : el('p', { class: 'notice' }, icon('info', { size: 18 }), el('span', {}, 'Aún no hay servicios cargados. Ve a ', el('a', { href: '#ajustes' }, 'Ajustes'), ' y pulsa "Cargar datos de ejemplo".')),
      kpis,
      el('div', { class: 'dash-grid' }, card('Agenda de hoy', capitalize(formatLongDate(today)), todayList, { wide: false }), card('Ingresos por día', `${formatMonth(state.month)} · solo atenciones cobradas`, dailyHost, { wide: true })),
      el('div', { class: 'dash-grid dash-grid--two' }, card('Cortes por servicio', 'Ordenados por ingreso', serviceHost), card('Cortes por día de la semana', 'Qué días trabajas más', weekdayHost)),
      buildDailyTable(range, state.month),
    );

    // Los gráficos se dibujan después de insertar el contenedor, para medir su ancho real.
    const series = dailySeries(range, state.month);
    barChart(dailyHost, {
      data: series.map((d) => ({
        label: capitalize(formatLongDate(d.date)),
        shortLabel: String(d.day),
        value: d.revenue,
        tooltip: `${formatCLP(d.revenue)} · ${plural(d.cuts, 'corte', 'cortes')}`,
        highlight: d.date === today,
      })),
      formatValue: formatCLP,
      formatTick: compactCLP,
      ariaLabel: `Ingresos diarios de ${formatMonth(state.month)}`,
    });

    hbarChart(serviceHost, {
      data: serviceBreakdown(range, state.month).map((s) => ({ label: s.name, detail: plural(s.count, 'corte', 'cortes'), value: s.revenue })),
      formatValue: formatCLP,
      emptyText: 'Cuando atiendas clientes este mes, verás aquí qué servicio vende más.',
    });

    const counts = weekdayBreakdown(range, state.month);
    const order = [1, 2, 3, 4, 5, 6, 0];
    barChart(weekdayHost, {
      data: order.map((d) => ({ label: WEEKDAYS[d], shortLabel: WEEKDAYS_SHORT[d], value: counts[d], tooltip: plural(counts[d], 'corte', 'cortes'), highlight: false })),
      formatValue: (n) => plural(n, 'corte', 'cortes'),
      formatTick: String,
      ariaLabel: 'Cortes por día de la semana',
      height: 200,
    });
  }

  async function go(delta) {
    state.month = shiftMonth(state.month, delta);
    await paint();
  }

  await paint();
}

/* ---------- Piezas ---------- */

function kpi({ label, value, sub, tone = '', icon: iconName }) {
  return el('article', { class: 'kpi' }, el('p', { class: 'kpi__label' }, icon(iconName, { size: 16 }), label), el('p', { class: 'kpi__value num' }, String(value)), el('p', { class: `kpi__sub kpi__sub--${tone}` }, sub));
}

function card(title, subtitle, body, { wide = false } = {}) {
  return el('section', { class: `panel dash-card${wide ? ' dash-card--wide' : ''}` }, el('header', { class: 'dash-card__head' }, el('h2', { class: 'h3' }, title), el('p', { class: 'muted' }, subtitle)), body);
}

/** Resumen de las reservas de hoy, en orden de hora. */
function buildTodayList(bookings) {
  if (!bookings.length) return el('p', { class: 'empty' }, 'Hoy no hay reservas.');
  const live = bookings.filter((b) => b.status !== 'cancelled').sort(byDateTime);
  return el(
    'div',
    { class: 'stack' },
    el(
      'ul',
      { class: 'today-list' },
      live.map((b) =>
        el(
          'li',
          { class: 'today-item' },
          el('span', { class: 'today-item__time mono' }, b.time),
          el('span', { class: 'today-item__who' }, el('strong', {}, b.clientName), el('small', {}, b.serviceName)),
          el('span', { class: `pill pill--${b.status}` }, STATUS_LABEL[b.status]),
        ),
      ),
    ),
    el('a', { class: 'link-btn', href: '#agenda' }, 'Abrir la agenda completa'),
  );
}

/** Detalle diario (desplegable): para ver día por día cuánto se ganó. */
function buildDailyTable(bookings, month) {
  const rows = dailySeries(bookings, month).filter((d) => d.cuts > 0);
  const total = rows.reduce((sum, d) => sum + d.revenue, 0);
  return el(
    'details',
    { class: 'panel daily-details' },
    el('summary', {}, el('strong', {}, 'Detalle de dinero por día'), el('span', { class: 'muted' }, ` · ${rows.length} días con atenciones`)),
    rows.length
      ? el(
          'div',
          { class: 'table-wrap' },
          el(
            'table',
            { class: 'table' },
            el('thead', {}, el('tr', {}, el('th', {}, 'Día'), el('th', { class: 'num' }, 'Cortes'), el('th', { class: 'num' }, 'Dinero'))),
            el('tbody', {}, rows.map((d) => el('tr', {}, el('td', {}, capitalize(formatLongDate(d.date))), el('td', { class: 'num' }, d.cuts), el('td', { class: 'num' }, formatCLP(d.revenue))))),
            el('tfoot', {}, el('tr', {}, el('th', {}, 'Total del mes'), el('th', { class: 'num' }, rows.reduce((s, d) => s + d.cuts, 0)), el('th', { class: 'num' }, formatCLP(total)))),
          ),
        )
      : el('p', { class: 'empty' }, 'Todavía no hay atenciones cobradas este mes.'),
  );
}

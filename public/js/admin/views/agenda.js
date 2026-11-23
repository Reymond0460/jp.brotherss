/**
 * AGENDA: reservas de un día, con acciones para confirmar, cobrar, mover, cancelar y escribir al cliente.
 */
import { el, replaceContent } from '../../core/dom.js';
import { addDays, capitalize, formatLongDate, minutesToTime, timeToMinutes, todayISO } from '../../core/dates.js';
import { formatCLP, formatPhone, plural } from '../../core/format.js';
import { byDateTime, isActive, STATUS, STATUS_LABEL } from '../../domain/booking-status.js';
import { dayTotals } from '../../domain/stats.js';
import { barberToClientMessage, whatsappUrl } from '../../domain/whatsapp.js';
import { confirmDialog } from '../../ui/dialog.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { openCharge, openNewBooking, openReschedule } from '../components/booking-dialogs.js';
import { pageHeader } from '../components/page-header.js';

const FILTERS = [
  { id: 'all', label: 'Todas', match: () => true },
  { id: 'live', label: 'Por atender', match: (b) => isActive(b) },
  { id: 'done', label: 'Atendidas', match: (b) => b.status === STATUS.DONE },
  { id: 'closed', label: 'Canceladas / no vino', match: (b) => b.status === STATUS.CANCELLED || b.status === STATUS.NO_SHOW },
];

export async function renderAgenda(host, ctx) {
  const state = { date: todayISO(), filter: 'all' };

  async function paint() {
    const bookings = (await ctx.repo.listBookings(state.date, state.date)).sort(byDateTime);
    const totals = dayTotals(bookings, state.date);
    const visible = bookings.filter(FILTERS.find((f) => f.id === state.filter).match);

    const dateInput = el('input', { class: 'input', type: 'date', value: state.date, 'aria-label': 'Elegir día', onchange: (e) => e.target.value && setDate(e.target.value) });
    const controls = el(
      'div',
      { class: 'agenda-nav' },
      el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Día anterior', onclick: () => setDate(addDays(state.date, -1)) }, icon('chevron-left')),
      dateInput,
      el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Día siguiente', onclick: () => setDate(addDays(state.date, 1)) }, icon('chevron-right')),
      el('button', { class: 'btn btn--ghost btn--sm', type: 'button', disabled: state.date === todayISO(), onclick: () => setDate(todayISO()) }, 'Hoy'),
    );

    const filters = el(
      'div',
      { class: 'row', role: 'group', 'aria-label': 'Filtrar reservas' },
      FILTERS.map((f) =>
        el('label', { class: 'chip' }, el('input', { type: 'radio', name: 'agenda-filter', checked: state.filter === f.id, onchange: () => ((state.filter = f.id), paint()) }), el('span', {}, `${f.label} (${bookings.filter(f.match).length})`)),
      ),
    );

    const summary = el(
      'p',
      { class: 'agenda-summary' },
      el('strong', {}, capitalize(formatLongDate(state.date))),
      ` · ${plural(totals.total, 'reserva', 'reservas')} · ${plural(totals.cuts, 'atendida', 'atendidas')} · cobrado ${formatCLP(totals.revenue)}`,
      totals.upcomingRevenue ? ` · por cobrar ${formatCLP(totals.upcomingRevenue)}` : '',
    );

    replaceContent(
      host,
      pageHeader('Agenda', 'Las reservas de cada día', el('button', { class: 'btn btn--primary', type: 'button', onclick: () => openNewBooking(ctx, { date: state.date, onDone: paint }) }, icon('plus', { size: 18 }), 'Nueva reserva')),
      el('div', { class: 'stack agenda-bar' }, controls, summary, filters),
      visible.length ? el('ul', { class: 'appt-list' }, visible.map((b) => buildAppointment(b))) : el('p', { class: 'empty' }, bookings.length ? 'No hay reservas con este filtro.' : 'No hay reservas este día.'),
    );
  }

  function setDate(date) {
    state.date = date;
    return paint();
  }

  /** Aplica un cambio y vuelve a dibujar la agenda. */
  async function apply(action, okMessage) {
    try {
      await action();
      if (okMessage) toast(okMessage);
      await paint();
    } catch (error) {
      console.error(error);
      toast('No se pudo completar la acción. Intenta de nuevo.', 'error');
    }
  }

  function buildAppointment(b) {
    const end = minutesToTime(timeToMinutes(b.time) + b.durationMin);
    const live = isActive(b);
    const button = (label, iconName, handler, variant = 'btn--soft') => el('button', { class: `btn btn--sm ${variant}`, type: 'button', onclick: handler }, icon(iconName, { size: 16 }), label);
    const iconButton = (label, iconName, handler, danger = false) => el('button', { class: `icon-btn${danger ? ' icon-btn--danger' : ''}`, type: 'button', title: label, 'aria-label': label, onclick: handler }, icon(iconName, { size: 18 }));

    const actions = [];
    if (b.status === STATUS.PENDING) actions.push(button('Confirmar', 'check', () => apply(() => ctx.repo.updateBooking(b.id, { status: STATUS.CONFIRMED }), 'Reserva confirmada')));
    if (live) actions.push(button('Atendida', 'money', () => openCharge(ctx, b, { onDone: paint }), 'btn--primary'));
    if (b.status === STATUS.DONE) actions.push(button('Corregir cobro', 'edit', () => openCharge(ctx, b, { onDone: paint }), 'btn--ghost'));

    const tools = [];
    if (b.clientPhone) tools.push(el('a', { class: 'icon-btn', href: whatsappUrl(b.clientPhone, barberToClientMessage(b, ctx.catalog.business)), target: '_blank', rel: 'noopener', title: 'Escribir por WhatsApp', 'aria-label': 'Escribir por WhatsApp' }, icon('whatsapp', { size: 18 })));
    if (live) {
      tools.push(iconButton('Reprogramar', 'move', () => openReschedule(ctx, b, { onDone: paint })));
      tools.push(iconButton('No asistió', 'ban', () => apply(() => ctx.repo.updateBooking(b.id, { status: STATUS.NO_SHOW }), 'Marcada como "no asistió"')));
      tools.push(
        iconButton(
          'Cancelar reserva',
          'trash',
          async () => {
            const ok = await confirmDialog({ title: '¿Cancelar esta reserva?', message: `${b.clientName} · ${b.time}. La hora quedará libre para otros clientes.`, confirmLabel: 'Cancelar reserva', danger: true });
            if (ok) apply(() => ctx.repo.updateBooking(b.id, { status: STATUS.CANCELLED }), 'Reserva cancelada');
          },
          true,
        ),
      );
    }

    return el(
      'li',
      { class: `appt appt--${b.status}` },
      el('div', { class: 'appt__time' }, el('strong', { class: 'mono' }, b.time), el('small', { class: 'mono' }, `a ${end}`)),
      el(
        'div',
        { class: 'appt__body' },
        el('p', { class: 'appt__name' }, b.clientName, el('span', { class: `pill pill--${b.status}` }, STATUS_LABEL[b.status])),
        el('p', { class: 'appt__meta' }, `${b.serviceName} · ${formatCLP(b.finalPrice ?? b.price)}${b.promoTitle ? ` · Promo: ${b.promoTitle}` : ''}`),
        el('p', { class: 'appt__meta' }, b.clientPhone ? formatPhone(b.clientPhone) : 'Sin celular', b.source === 'admin' ? ' · Ingresada por ti' : ''),
        b.notes ? el('p', { class: 'appt__notes' }, `“${b.notes}”`) : null,
      ),
      el('div', { class: 'appt__actions' }, el('div', { class: 'row' }, actions), el('div', { class: 'row appt__tools' }, tools)),
    );
  }

  await paint();
}

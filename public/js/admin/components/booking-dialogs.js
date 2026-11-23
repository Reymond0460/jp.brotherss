/**
 * Ventanas del panel para trabajar con reservas:
 *   openNewBooking   → registrar una reserva o un cliente que llegó sin hora
 *   openReschedule   → mover una reserva a otro día/hora
 *   openCharge       → registrar el cobro (marcar como atendida) o corregirlo
 */
import { el } from '../../core/dom.js';
import { todayISO } from '../../core/dates.js';
import { cleanText, formatCLP, normalizePhone } from '../../core/format.js';
import { slotKeysFor } from '../../domain/availability.js';
import { revenueOf, STATUS } from '../../domain/booking-status.js';
import { createBooking } from '../../services/booking-service.js';
import { openModal } from '../../ui/dialog.js';
import { field, input, select, showFieldErrors } from '../../ui/form.js';
import { toast } from '../../ui/toast.js';
import { createSlotPicker } from './slot-picker.js';

/** Registra una reserva nueva hecha por el barbero. */
export function openNewBooking(ctx, { date = todayISO(), onDone }) {
  const services = ctx.catalog.services.filter((s) => s.active !== false);
  if (!services.length) return toast('Primero crea un servicio en la sección Servicios.', 'error');

  const serviceById = (id) => services.find((s) => s.id === id);
  const serviceSelect = select({ id: 'nb-service', name: 'service', options: services.map((s) => ({ value: s.id, label: `${s.name} · ${formatCLP(s.price)}` })), value: services[0].id });
  const dateInput = input({ id: 'nb-date', name: 'date', type: 'date', value: date });
  const priceInput = input({ id: 'nb-price', name: 'price', type: 'number', min: 0, step: 500, value: services[0].price, inputmode: 'numeric' });
  const picker = createSlotPicker({ ctx, onChange: () => {} });
  const statusSelect = select({ id: 'nb-status', name: 'status', options: [{ value: STATUS.CONFIRMED, label: 'Confirmada (viene más tarde)' }, { value: STATUS.DONE, label: 'Atendida (ya se cobró)' }], value: STATUS.CONFIRMED });
  const submit = el('button', { class: 'btn btn--primary', type: 'submit' }, 'Guardar reserva');

  const refresh = () => picker.update({ service: serviceById(serviceSelect.value), date: dateInput.value });
  serviceSelect.addEventListener('change', () => {
    priceInput.value = serviceById(serviceSelect.value).price;
    refresh();
  });
  dateInput.addEventListener('change', refresh);

  const form = el(
    'form',
    { class: 'stack', novalidate: true },
    el('div', { class: 'form-grid' }, field('nb-service', 'Servicio', serviceSelect), field('nb-date', 'Día', dateInput)),
    el('div', { class: 'field' }, el('span', { class: 'field__label' }, 'Hora'), picker.el),
    el('div', { class: 'form-grid' }, field('nb-name', 'Nombre del cliente', input({ id: 'nb-name', name: 'name', maxlength: 60, autocomplete: 'off' })), field('nb-phone', 'Celular (opcional)', input({ id: 'nb-phone', name: 'phone', type: 'tel', inputmode: 'tel', placeholder: '9 1234 5678' }))),
    el('div', { class: 'form-grid' }, field('nb-price', 'Precio', priceInput), field('nb-status', 'Estado', statusSelect)),
    el('div', { class: 'dialog__actions' }, submit),
  );

  const { close } = openModal({ title: 'Nueva reserva', body: form, wide: true });
  refresh();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const errors = {};
    const name = cleanText(form.elements.name.value);
    const phoneRaw = form.elements.phone.value.trim();
    const phone = phoneRaw ? normalizePhone(phoneRaw) : '';
    if (name.length < 2) errors.name = 'Escribe el nombre.';
    if (phoneRaw && !phone) errors.phone = 'Celular no válido.';
    if (!picker.time) toast('Elige una hora.', 'error');
    if (Object.keys(errors).length || !picker.time) return showFieldErrors(form, errors);

    submit.disabled = true;
    try {
      const status = statusSelect.value;
      const booking = await createBooking({
        repo: ctx.repo,
        service: serviceById(serviceSelect.value),
        date: dateInput.value,
        time: picker.time,
        client: { name, phone, notes: '' },
        source: 'admin',
        price: Number(priceInput.value) || 0,
      });
      if (status === STATUS.DONE) await ctx.repo.updateBooking(booking.id, { status: STATUS.DONE, finalPrice: booking.price });
      toast('Reserva guardada');
      close();
      onDone?.();
    } catch (error) {
      console.error(error);
      toast(error.name === 'SlotTakenError' ? 'Esa hora ya está ocupada.' : 'No se pudo guardar la reserva.', 'error');
      submit.disabled = false;
      refresh();
    }
  });
}

/** Mueve una reserva a otro día u hora. */
export function openReschedule(ctx, booking, { onDone }) {
  const service = { id: booking.serviceId, durationMin: booking.durationMin };
  const dateInput = input({ id: 'rs-date', name: 'date', type: 'date', value: booking.date });
  const picker = createSlotPicker({ ctx });
  const submit = el('button', { class: 'btn btn--primary', type: 'submit' }, 'Mover reserva');

  const refresh = () => picker.update({ service, date: dateInput.value, ignoreBooking: booking });
  dateInput.addEventListener('change', refresh);

  const form = el(
    'form',
    { class: 'stack' },
    el('p', {}, el('strong', {}, booking.clientName), ` · ${booking.serviceName} · hoy tiene hora el ${booking.date} a las ${booking.time}`),
    field('rs-date', 'Nuevo día', dateInput),
    el('div', { class: 'field' }, el('span', { class: 'field__label' }, 'Nueva hora'), picker.el),
    el('div', { class: 'dialog__actions' }, submit),
  );
  const { close } = openModal({ title: 'Reprogramar', body: form, wide: true });
  refresh();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!picker.time) return toast('Elige la nueva hora.', 'error');
    submit.disabled = true;
    try {
      await ctx.repo.moveBooking(booking.id, { date: dateInput.value, time: picker.time }, slotKeysFor(dateInput.value, picker.time, booking.durationMin));
      toast('Reserva movida');
      close();
      onDone?.();
    } catch (error) {
      console.error(error);
      toast('No se pudo mover la reserva.', 'error');
      submit.disabled = false;
    }
  });
}

/** Marca la reserva como atendida y registra cuánto se cobró (se puede ajustar el monto). */
export function openCharge(ctx, booking, { onDone }) {
  const amount = input({ id: 'ch-amount', name: 'amount', type: 'number', min: 0, step: 500, inputmode: 'numeric', value: revenueOf(booking), autofocus: true });
  const submit = el('button', { class: 'btn btn--primary', type: 'submit' }, 'Registrar cobro');
  const form = el(
    'form',
    { class: 'stack' },
    el('p', {}, el('strong', {}, booking.clientName), ` · ${booking.serviceName}`),
    field('ch-amount', 'Monto cobrado (CLP)', amount, { hint: `Precio de la reserva: ${formatCLP(booking.price)}. Cámbialo si cobraste distinto (propina, descuento).` }),
    el('div', { class: 'dialog__actions' }, submit),
  );
  const { close } = openModal({ title: booking.status === STATUS.DONE ? 'Corregir cobro' : 'Atención realizada', body: form });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = Number(amount.value);
    if (!Number.isFinite(value) || value < 0) return showFieldErrors(form, { amount: 'Ingresa un monto válido.' });
    submit.disabled = true;
    try {
      await ctx.repo.updateBooking(booking.id, { status: STATUS.DONE, finalPrice: value });
      toast(`Cobro registrado: ${formatCLP(value)}`);
      close();
      onDone?.();
    } catch (error) {
      console.error(error);
      toast('No se pudo registrar el cobro.', 'error');
      submit.disabled = false;
    }
  });
}

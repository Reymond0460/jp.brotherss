/**
 * "Ver mi reserva": el cliente escribe su código y su celular y ve el estado de su hora.
 * Desde aquí puede cancelarla (si aún no empieza) o escribir al barbero para cambiarla.
 */
import { DEMO_BOOKING_ID, DEMO_PHONE, STORAGE_KEYS } from '../../config/constants.js';
import { ENV } from '../../config/env.js';
import { $, el, replaceContent } from '../../core/dom.js';
import { listen } from '../../core/events.js';
import { formatBookingCode } from '../../core/booking-code.js';
import { relativeDayLabel } from '../../core/dates.js';
import { formatCLP, formatPhone } from '../../core/format.js';
import { safeStorage } from '../../core/safe-storage.js';
import { canClientCancel, STATUS_LABEL } from '../../domain/booking-status.js';
import { generalMessage, whatsappUrl } from '../../domain/whatsapp.js';
import { lookupBooking } from '../../services/booking-service.js';
import { confirmDialog } from '../../ui/dialog.js';
import { icon } from '../../ui/icons.js';
import { buildTicket } from '../../ui/ticket.js';
import { toast } from '../../ui/toast.js';

const ERRORS = {
  'invalid-code': 'El código no tiene el formato correcto. Ejemplo: JP-7K3M-9QXA.',
  'invalid-phone': 'Ingresa el celular con el que reservaste.',
  'not-found': 'No encontramos una reserva con esos datos. Revisa el código y el celular.',
};

export function initMyBooking({ repo, catalog }) {
  const root = $('#my-booking-root');
  if (!root) return;

  const result = el('div', { class: 'my-booking__result', 'aria-live': 'polite' });
  const message = el('p', { class: 'field__error', role: 'alert' });
  const codeInput = el('input', { class: 'input mono', id: 'mb-code', name: 'code', type: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'JP-XXXX-XXXX', required: true });
  const phoneInput = el('input', { class: 'input', id: 'mb-phone', name: 'tel', type: 'tel', autocomplete: 'tel', inputmode: 'tel', placeholder: '9 1234 5678', required: true });
  const submit = el('button', { class: 'btn btn--primary', type: 'submit' }, 'Buscar mi reserva');

  const form = el(
    'form',
    { class: 'my-booking__form stack', novalidate: true },
    el(
      'div',
      { class: 'form-grid' },
      el('div', { class: 'field' }, el('label', { class: 'field__label', for: 'mb-code' }, 'Código de reserva'), codeInput),
      el('div', { class: 'field' }, el('label', { class: 'field__label', for: 'mb-phone' }, 'Celular'), phoneInput),
    ),
    message,
    el('div', { class: 'row' }, submit),
  );

  const demoHint = ENV.demo
    ? el('p', { class: 'notice notice--blue' }, icon('info', { size: 18 }), el('span', {}, 'Modo demo. Prueba con el código ', el('strong', { class: 'mono' }, formatBookingCode(DEMO_BOOKING_ID)), ' y el celular ', el('strong', {}, formatPhone(DEMO_PHONE)), '.'))
    : null;

  replaceContent(root, el('div', { class: 'my-booking' }, el('div', { class: 'stack' }, form, demoHint), result));

  /** Recuerda la última reserva hecha en este navegador para no tener que escribir el código. */
  const remembered = safeStorage.get(STORAGE_KEYS.lastBookingCode);
  if (remembered) codeInput.value = formatBookingCode(remembered);
  listen('jp:booked', ({ id }) => {
    codeInput.value = formatBookingCode(id);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.textContent = '';
    submit.disabled = true;
    submit.textContent = 'Buscando…';
    try {
      const found = await lookupBooking(repo, codeInput.value, phoneInput.value);
      if (!found.ok) {
        message.textContent = ERRORS[found.reason];
        replaceContent(result);
      } else {
        show(found.booking);
      }
    } catch (error) {
      console.error(error);
      message.textContent = 'No pudimos consultar tu reserva. Intenta de nuevo en unos minutos.';
    }
    submit.disabled = false;
    submit.textContent = 'Buscar mi reserva';
  });

  /** Dibuja el ticket de la reserva encontrada y sus acciones. */
  function show(booking) {
    const ticket = buildTicket({
      label: 'Mi reserva',
      tag: STATUS_LABEL[booking.status],
      big: booking.time,
      list: [
        ['Día', relativeDayLabel(booking.date)],
        ['Servicio', booking.serviceName],
        ['Valor', formatCLP(booking.price)],
        ['A nombre de', booking.clientName],
      ],
      stubCode: formatBookingCode(booking.id),
      stubCaption: 'Código de reserva',
    });

    const actions = el('div', { class: 'stack' }, el('span', { class: `pill pill--${booking.status}` }, STATUS_LABEL[booking.status]));

    const change = generalMessage(catalog.business, `Quiero cambiar mi reserva ${formatBookingCode(booking.id)}.`);
    actions.append(el('a', { class: 'btn btn--whatsapp', href: whatsappUrl(catalog.business.whatsapp, change), target: '_blank', rel: 'noopener' }, icon('whatsapp', { size: 18 }), 'Pedir un cambio por WhatsApp'));

    if (canClientCancel(booking)) {
      actions.append(
        el(
          'button',
          {
            class: 'btn btn--ghost',
            type: 'button',
            onclick: async () => {
              const ok = await confirmDialog({
                title: '¿Cancelar tu reserva?',
                message: `Se liberará tu hora del ${relativeDayLabel(booking.date).toLowerCase()} a las ${booking.time}.`,
                confirmLabel: 'Sí, cancelar',
                danger: true,
              });
              if (!ok) return;
              try {
                show(await repo.cancelBooking(booking.id));
                toast('Reserva cancelada');
              } catch (error) {
                console.error(error);
                toast('No pudimos cancelar. Escríbenos por WhatsApp.', 'error');
              }
            },
          },
          icon('x', { size: 18 }),
          'Cancelar reserva',
        ),
      );
    }

    replaceContent(result, el('div', { class: 'my-booking__ticket' }, ticket, actions));
  }
}

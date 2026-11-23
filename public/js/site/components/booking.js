/**
 * Reserva en 3 pasos: Servicio → Día y hora → Tus datos.
 *
 * A la derecha, un "ticket de turno" se va llenando en vivo con lo que el cliente elige.
 * Al confirmar, la reserva se guarda (queda "por confirmar") y se ofrece enviar el
 * mensaje por WhatsApp al barbero.
 */
import { STORAGE_KEYS } from '../../config/constants.js';
import { ROUTES } from '../../config/routes.js';
import { $, el, replaceContent } from '../../core/dom.js';
import { emit, listen } from '../../core/events.js';
import { formatBookingCode } from '../../core/booking-code.js';
import { formatDayParts, relativeDayLabel, todayISO } from '../../core/dates.js';
import { formatCLP, formatDuration } from '../../core/format.js';
import { safeStorage } from '../../core/safe-storage.js';
import { bookableDates } from '../../domain/availability.js';
import { priceFor, promoForService } from '../../domain/pricing.js';
import { validateClient } from '../../domain/validators.js';
import { clientBookingMessage, whatsappUrl } from '../../domain/whatsapp.js';
import { SlotTakenError } from '../../data/errors.js';
import { createBooking, getDaySlots } from '../../services/booking-service.js';
import { icon } from '../../ui/icons.js';
import { buildTicket } from '../../ui/ticket.js';
import { toast } from '../../ui/toast.js';

const STEPS = ['Servicio', 'Día y hora', 'Tus datos'];

export function initBooking({ repo, catalog }) {
  const root = $('#booking-root');
  if (!root) return;

  const today = todayISO();
  const dates = bookableDates({ schedule: catalog.schedule, from: today, days: catalog.business.maxDaysAhead + 1 });

  /** Todo el estado del asistente vive aquí; render() lo dibuja. */
  const state = freshState();
  function freshState() {
    return { step: 1, service: null, date: null, time: null, slots: [], loading: false, client: { name: '', phone: '', notes: '', accepted: false }, errors: {}, booking: null };
  }

  const flow = el('div', { class: 'booking__flow panel' });
  const side = el('aside', { class: 'booking__side', 'aria-label': 'Resumen de tu reserva' });
  root.replaceChildren(el('div', { class: 'booking' }, flow, side));

  const promoOf = () => (state.service ? promoForService(catalog.promos, state.service, today) : null);

  /* ------------------------------------------------------------------ */
  /* Dibujo                                                              */
  /* ------------------------------------------------------------------ */

  function render({ focusHeading = false } = {}) {
    renderFlow();
    renderSide();
    if (focusHeading) flow.querySelector('[data-step-title]')?.focus({ preventScroll: true });
  }

  function renderFlow() {
    if (state.booking) return replaceContent(flow, renderDone());
    replaceContent(flow, renderStepper(), state.step === 1 ? renderServiceStep() : state.step === 2 ? renderWhenStep() : renderDetailsStep());
  }

  function renderStepper() {
    return el(
      'ol',
      { class: 'stepper' },
      STEPS.map((label, index) => {
        const number = index + 1;
        const status = number === state.step ? 'is-current' : number < state.step ? 'is-done' : '';
        const content = [el('span', { class: 'stepper__dot' }, number < state.step ? icon('check', { size: 14 }) : number), el('span', { class: 'stepper__label' }, label)];
        return el(
          'li',
          { class: `stepper__item ${status}`, 'aria-current': number === state.step ? 'step' : null },
          number < state.step
            ? el('button', { type: 'button', class: 'stepper__btn', onclick: () => goTo(number) }, content)
            : el('span', { class: 'stepper__btn' }, content),
        );
      }),
    );
  }

  /* ----- Paso 1: servicio ----- */
  function renderServiceStep() {
    const choices = catalog.services.map((service) => {
      const promo = promoForService(catalog.promos, service, today);
      const price = priceFor(service, promo);
      const input = el('input', { type: 'radio', name: 'service', value: service.id, checked: state.service?.id === service.id, onchange: () => selectService(service) });
      return el(
        'label',
        { class: 'choice' },
        input,
        el(
          'span',
          { class: 'choice__body' },
          el('span', { class: 'choice__name' }, service.name, promo ? el('span', { class: 'pill pill--pending' }, 'Promo') : null),
          el('span', { class: 'choice__meta' }, `${formatDuration(service.durationMin)}${service.description ? ` · ${service.description}` : ''}`),
        ),
        el('span', { class: 'choice__price' }, promo ? el('s', {}, formatCLP(service.price)) : null, formatCLP(price)),
      );
    });

    return el(
      'fieldset',
      { class: 'step' },
      el('legend', { class: 'step__title', tabindex: '-1', 'data-step-title': '' }, '¿Qué te vas a hacer?'),
      choices.length ? el('div', { class: 'choice-list' }, choices) : el('p', { class: 'empty' }, 'Aún no hay servicios disponibles para reservar online.'),
    );
  }

  /* ----- Paso 2: día y hora ----- */
  let slotsHost = null;

  function renderWhenStep() {
    const strip = el(
      'div',
      { class: 'day-strip', role: 'group', 'aria-label': 'Elige el día' },
      dates.map(({ date, open }) => {
        const parts = formatDayParts(date);
        return el(
          'button',
          {
            type: 'button',
            class: 'day-chip',
            'data-date': date,
            disabled: !open,
            'aria-pressed': String(state.date === date),
            title: open ? null : 'Sin atención',
            onclick: () => pickDate(date),
          },
          el('span', { class: 'day-chip__dow' }, date === today ? 'Hoy' : parts.dow),
          el('span', { class: 'day-chip__num' }, parts.day),
          el('span', { class: 'day-chip__mon' }, parts.month),
        );
      }),
    );
    slotsHost = el('div', { class: 'slots', 'aria-live': 'polite' });
    paintSlots();

    return el(
      'div',
      { class: 'step' },
      el('h3', { class: 'step__title', tabindex: '-1', 'data-step-title': '' }, '¿Qué día y a qué hora?'),
      strip,
      slotsHost,
      el('div', { class: 'step__actions' }, el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => goTo(1) }, icon('chevron-left', { size: 18 }), 'Cambiar servicio')),
    );
  }

  function paintSlots() {
    if (!slotsHost) return;
    if (state.loading) return replaceContent(slotsHost, el('p', { class: 'muted' }, 'Buscando horas disponibles…'));
    const visible = state.slots.filter((s) => s.status !== 'past');
    if (!state.date) return replaceContent(slotsHost, el('p', { class: 'muted' }, 'Elige un día para ver las horas.'));
    if (!visible.some((s) => s.status === 'free')) {
      return replaceContent(slotsHost, el('div', { class: 'notice' }, icon('info', { size: 18 }), 'No quedan horas libres este día. Prueba con otro día.'));
    }
    replaceContent(
      slotsHost,
      el('p', { class: 'slots__title' }, relativeDayLabel(state.date)),
      el(
        'div',
        { class: 'slot-grid' },
        visible.map((slot) =>
          el(
            'button',
            {
              type: 'button',
              class: `slot${state.time === slot.time ? ' is-selected' : ''}${slot.status === 'busy' ? ' is-busy' : ''}`,
              disabled: slot.status === 'busy',
              'aria-pressed': String(state.time === slot.time),
              onclick: () => pickTime(slot.time),
            },
            slot.time,
          ),
        ),
      ),
    );
  }

  /* ----- Paso 3: datos ----- */
  function renderDetailsStep() {
    const { errors, client } = state;
    const field = (id, label, control, hint) =>
      el(
        'div',
        { class: `field${errors[id] ? ' field--invalid' : ''}` },
        el('label', { class: 'field__label', for: `b-${id}` }, label),
        control,
        errors[id] ? el('p', { class: 'field__error', id: `b-${id}-error` }, errors[id]) : hint ? el('p', { class: 'field__hint' }, hint) : null,
      );

    const bind = (key) => (event) => {
      state.client[key] = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    };
    const attrs = (id) => ({ id: `b-${id}`, 'aria-invalid': errors[id] ? 'true' : null, 'aria-describedby': errors[id] ? `b-${id}-error` : null });

    const submit = el('button', { class: 'btn btn--primary btn--block', type: 'submit', id: 'b-submit' }, 'Confirmar reserva', icon('check', { size: 18 }));

    const form = el(
      'form',
      { class: 'step', novalidate: true, autocomplete: 'on' },
      el('h3', { class: 'step__title', tabindex: '-1', 'data-step-title': '' }, '¿A nombre de quién?'),
      el(
        'div',
        { class: 'form-grid' },
        field('name', 'Nombre', el('input', { class: 'input', type: 'text', name: 'name', autocomplete: 'name', maxlength: 60, value: client.name, oninput: bind('name'), ...attrs('name') })),
        field('phone', 'Celular', el('input', { class: 'input', type: 'tel', name: 'tel', autocomplete: 'tel', inputmode: 'tel', placeholder: '9 1234 5678', value: client.phone, oninput: bind('phone'), ...attrs('phone') }), 'Te escribiremos por WhatsApp a este número.'),
      ),
      field('notes', 'Comentario (opcional)', el('textarea', { class: 'textarea', name: 'notes', maxlength: 200, rows: 2, placeholder: 'Ej.: degradé bajo, traigo foto de referencia', oninput: bind('notes'), ...attrs('notes') }, client.notes)),
      // Campo trampa para bots: una persona no lo ve ni lo llena.
      el('input', { class: 'hp', type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' }),
      el(
        'div',
        { class: `field${errors.accepted ? ' field--invalid' : ''}` },
        el(
          'label',
          { class: 'switch' },
          el('input', { type: 'checkbox', id: 'b-accepted', checked: client.accepted, onchange: bind('accepted') }),
          el('span', { class: 'switch__track' }),
          el('span', {}, 'Acepto la ', el('a', { href: ROUTES.privacy, target: '_blank', rel: 'noopener' }, 'política de privacidad')),
        ),
        errors.accepted ? el('p', { class: 'field__error' }, errors.accepted) : null,
      ),
      el('div', { class: 'step__actions' }, el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => goTo(2) }, icon('chevron-left', { size: 18 }), 'Cambiar hora'), submit),
    );

    form.addEventListener('submit', (event) => submitBooking(event, form, submit));
    return form;
  }

  /* ----- Reserva realizada ----- */
  function renderDone() {
    const booking = state.booking;
    const message = clientBookingMessage(booking, catalog.business);
    const copyButton = el('button', { class: 'btn btn--ghost btn--block', type: 'button' }, icon('copy', { size: 18 }), 'Copiar código');
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(formatBookingCode(booking.id));
        toast('Código copiado');
      } catch {
        toast(`Tu código es ${formatBookingCode(booking.id)}`, 'info');
      }
    });

    return el(
      'div',
      { class: 'step done' },
      el('p', { class: 'done__mark' }, icon('check', { size: 28 })),
      el('h3', { class: 'step__title', tabindex: '-1', 'data-step-title': '' }, '¡Hora reservada!'),
      el('p', {}, 'Tu hora queda ', el('strong', {}, 'por confirmar'), '. Envía el mensaje por WhatsApp para que el barbero la confirme. Guarda tu código para ver o cancelar tu reserva.'),
      el(
        'div',
        { class: 'stack' },
        el('a', { class: 'btn btn--whatsapp btn--block', href: whatsappUrl(catalog.business.whatsapp, message), target: '_blank', rel: 'noopener' }, icon('whatsapp', { size: 18 }), 'Enviar por WhatsApp'),
        copyButton,
        el('a', { class: 'btn btn--soft btn--block', href: '#mi-reserva' }, icon('ticket', { size: 18 }), 'Ver mi reserva'),
        el('button', { class: 'link-btn', type: 'button', onclick: reset }, 'Reservar otra hora'),
      ),
    );
  }

  /* ----- Ticket lateral ----- */
  function renderSide() {
    const { booking, service, date, time } = state;
    const price = service ? priceFor(service, promoOf()) : null;
    const ticket = buildTicket({
      label: booking ? 'Turno reservado' : 'Tu turno',
      tag: booking ? 'Por confirmar' : '',
      big: (booking?.time ?? time) || '',
      list: [
        ['Servicio', booking?.serviceName ?? service?.name ?? '—'],
        ['Día', booking ? relativeDayLabel(booking.date) : date ? relativeDayLabel(date) : '—'],
        ['Valor', booking ? formatCLP(booking.price) : price != null ? formatCLP(price) : '—'],
      ],
      stubCode: booking ? formatBookingCode(booking.id) : 'JP BROTHERS',
      stubCaption: booking ? 'Código de reserva' : 'Barbería',
    });
    replaceContent(side, ticket);
  }

  /* ------------------------------------------------------------------ */
  /* Acciones                                                            */
  /* ------------------------------------------------------------------ */

  function goTo(step) {
    state.step = step;
    if (step <= 2) state.errors = {};
    render({ focusHeading: true });
  }

  function selectService(service) {
    state.service = service;
    state.time = null;
    state.step = 2;
    render({ focusHeading: true });
    // Si ya había un día elegido se recalculan sus horas (la duración cambió); si no, se busca el mejor día.
    if (state.date) loadSlots();
    else autoPickDate();
  }

  async function pickDate(date) {
    state.date = date;
    state.time = null;
    flow.querySelectorAll('.day-chip').forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.date === date)));
    renderSide();
    await loadSlots();
  }

  function pickTime(time) {
    state.time = time;
    state.step = 3;
    render({ focusHeading: true });
  }

  async function loadSlots() {
    state.loading = true;
    paintSlots();
    try {
      state.slots = await getDaySlots({ repo, catalog, service: state.service, date: state.date });
    } catch (error) {
      console.error(error);
      state.slots = [];
      toast('No pudimos cargar las horas. Intenta de nuevo.', 'error');
    }
    state.loading = false;
    paintSlots();
    scrollChipIntoView();
  }

  /** Elige automáticamente el primer día con horas libres (hasta 14 días) y lo marca. */
  async function autoPickDate() {
    const open = dates.filter((d) => d.open).slice(0, 14);
    for (const { date } of open) {
      state.date = date;
      state.loading = true;
      paintSlots();
      try {
        state.slots = await getDaySlots({ repo, catalog, service: state.service, date });
      } catch {
        state.slots = [];
      }
      if (state.slots.some((s) => s.status === 'free')) break;
    }
    state.loading = false;
    flow.querySelectorAll('.day-chip').forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.date === state.date)));
    paintSlots();
    renderSide();
    scrollChipIntoView();
  }

  function scrollChipIntoView() {
    const chip = flow.querySelector('.day-chip[aria-pressed="true"]');
    // Se desplaza solo el carrusel de días (no toda la página).
    const strip = chip?.parentElement;
    if (chip && strip) strip.scrollTo({ left: chip.offsetLeft - strip.offsetWidth / 2 + chip.offsetWidth / 2, behavior: 'smooth' });
  }

  async function submitBooking(event, form, submitButton) {
    event.preventDefault();
    if (form.elements.website?.value) return; // bot: se ignora en silencio

    const result = validateClient(state.client);
    state.errors = { ...result.errors };
    if (!state.client.accepted) state.errors.accepted = 'Debes aceptar la política de privacidad para reservar.';

    if (Object.keys(state.errors).length) {
      renderFlow();
      flow.querySelector('.field--invalid input, .field--invalid textarea')?.focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Reservando…';
    try {
      state.booking = await createBooking({ repo, service: state.service, promo: promoOf(), date: state.date, time: state.time, client: result.values });
      safeStorage.set(STORAGE_KEYS.lastBookingCode, state.booking.id);
      emit('jp:booked', { id: state.booking.id });
      render({ focusHeading: true });
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      if (error instanceof SlotTakenError) {
        toast('Esa hora acaba de ser tomada. Elige otra, por favor.', 'error');
        state.time = null;
        state.step = 2;
        render({ focusHeading: true });
        loadSlots();
      } else {
        console.error(error);
        toast('No pudimos guardar tu reserva. Intenta de nuevo o escríbenos por WhatsApp.', 'error');
        submitButton.disabled = false;
        submitButton.textContent = 'Confirmar reserva';
      }
    }
  }

  function reset() {
    Object.assign(state, freshState());
    render();
  }

  /** Otros componentes piden abrir la reserva con un servicio (y opcionalmente una hora). */
  listen('jp:book', ({ serviceId, date, time }) => {
    const service = catalog.services.find((s) => s.id === serviceId);
    if (!service) return;
    Object.assign(state, freshState(), { service });
    if (date && time) {
      Object.assign(state, { date, time, step: 3 });
      render({ focusHeading: false });
    } else {
      state.step = 2;
      render();
      autoPickDate();
    }
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  render();
}

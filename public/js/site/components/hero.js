/**
 * Portada: estado "abierto/cerrado" y tarjeta con la próxima hora libre.
 * El botón de la tarjeta abre la reserva con esa hora ya elegida.
 */
import { $, el, replaceContent } from '../../core/dom.js';
import { emit } from '../../core/events.js';
import { formatCLP } from '../../core/format.js';
import { relativeDayLabel, todayISO } from '../../core/dates.js';
import { getOpenStatus } from '../../domain/open-status.js';
import { priceFor, promoForService } from '../../domain/pricing.js';
import { findNextFreeSlot } from '../../services/booking-service.js';
import { icon } from '../../ui/icons.js';

export async function initHero({ repo, catalog }) {
  renderOpenStatus(catalog.schedule);
  // Se actualiza cada minuto por si el cliente deja la página abierta.
  setInterval(() => renderOpenStatus(catalog.schedule), 60_000);

  const host = $('#hero-ticket');
  if (!host) return;

  // La tarjeta muestra la próxima hora libre del servicio más corto (normalmente un corte).
  const service = [...catalog.services].sort((a, b) => a.durationMin - b.durationMin || a.order - b.order)[0];
  if (!service) {
    replaceContent(host, nextSlotCard({ title: 'Reservas', info: ['Servicios próximamente'] }));
    return;
  }

  replaceContent(host, nextSlotCard({ info: ['Buscando horas disponibles…'] }));

  let next = null;
  try {
    next = await findNextFreeSlot({ repo, catalog, service });
  } catch (error) {
    console.error('No se pudo calcular la próxima hora', error);
  }

  if (!next) {
    replaceContent(host, nextSlotCard({ title: 'Agenda completa', info: ['Sin horas por ahora', 'Escríbenos por WhatsApp'] }));
    return;
  }

  const price = priceFor(service, promoForService(catalog.promos, service, todayISO()));
  const action = el(
    'button',
    { class: 'btn btn--primary', type: 'button', onclick: () => emit('jp:book', { serviceId: service.id, date: next.date, time: next.time }) },
    'Tomar esta hora',
    icon('arrow-right', { size: 18 }),
  );
  replaceContent(host, nextSlotCard({ time: next.time, info: [`${relativeDayLabel(next.date)} · ${service.name}`, formatCLP(price)], action }));
}

/**
 * Tarjeta horizontal "próxima hora libre": hora grande, detalle y botón.
 * Mientras no hay hora, el espacio de la hora queda en blanco.
 */
function nextSlotCard({ title = 'Próxima hora libre', time = '', info = [], action = null }) {
  return el(
    'div',
    { class: 'next-slot' },
    el('div', { class: 'next-slot__time' }, el('small', {}, title), el('strong', {}, time)),
    el('div', { class: 'next-slot__info' }, info.map((line, index) => el('span', { class: index === 0 ? 'next-slot__line' : 'next-slot__price' }, line))),
    action,
  );
}

function renderOpenStatus(schedule) {
  const node = $('#open-status');
  if (!node) return;
  const { open, label } = getOpenStatus(schedule);
  node.classList.toggle('is-open', open);
  node.querySelector('.status-chip__text').textContent = label;
}

/**
 * Lista de servicios con formato de "pizarra de precios" de barbería:
 * nombre ........ precio, con puntos guía entre ambos.
 */
import { $, el, replaceContent } from '../../core/dom.js';
import { emit } from '../../core/events.js';
import { formatCLP, formatDuration } from '../../core/format.js';
import { todayISO } from '../../core/dates.js';
import { priceFor, promoForService } from '../../domain/pricing.js';
import { icon } from '../../ui/icons.js';

export function initServices({ catalog }) {
  const list = $('#services-list');
  if (!list) return;

  if (!catalog.services.length) {
    replaceContent(list, el('li', { class: 'empty' }, 'Estamos actualizando los servicios. Escríbenos por WhatsApp para reservar.'));
    return;
  }
  replaceContent(list, catalog.services.map((service) => buildRow(service, catalog)));
}

function buildRow(service, catalog) {
  const promo = promoForService(catalog.promos, service, todayISO());
  const price = priceFor(service, promo);

  const priceNode = promo
    ? el('span', { class: 'menu-row__price' }, el('s', {}, formatCLP(service.price)), el('strong', {}, formatCLP(price)))
    : el('span', { class: 'menu-row__price' }, el('strong', {}, formatCLP(price)));

  return el(
    'li',
    { class: 'menu-row' },
    el(
      'button',
      { class: 'menu-row__button', type: 'button', onclick: () => emit('jp:book', { serviceId: service.id }), 'aria-label': `Reservar ${service.name}, ${formatCLP(price)}` },
      el(
        'span',
        { class: 'menu-row__main' },
        el('span', { class: 'menu-row__name' }, service.name, promo ? el('span', { class: 'pill pill--pending' }, 'Promo') : null),
        service.description ? el('span', { class: 'menu-row__desc' }, service.description) : null,
      ),
      el('span', { class: 'menu-row__leader', 'aria-hidden': 'true' }),
      el('span', { class: 'menu-row__meta' }, icon('clock', { size: 14 }), formatDuration(service.durationMin)),
      priceNode,
      el('span', { class: 'menu-row__go', 'aria-hidden': 'true' }, icon('arrow-right', { size: 18 })),
    ),
  );
}

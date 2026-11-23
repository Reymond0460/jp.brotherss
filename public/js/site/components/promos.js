/**
 * Sección de promociones: tarjetas tipo "cupón". Solo se muestra si hay promos vigentes.
 */
import { $, el, replaceContent } from '../../core/dom.js';
import { emit } from '../../core/events.js';
import { formatCLP } from '../../core/format.js';
import { formatLongDate, todayISO } from '../../core/dates.js';
import { visiblePromos } from '../../domain/pricing.js';
import { generalMessage, whatsappUrl } from '../../domain/whatsapp.js';
import { icon } from '../../ui/icons.js';

export function initPromos({ catalog }) {
  const section = $('#promos');
  const list = $('#promos-list');
  if (!section || !list) return;

  const promos = visiblePromos(catalog.promos, todayISO());
  section.hidden = promos.length === 0;
  // El enlace del menú también se oculta si no hay promos.
  document.querySelectorAll('[data-nav="promos"]').forEach((link) => (link.hidden = promos.length === 0));
  if (!promos.length) return;

  replaceContent(list, promos.map((promo) => buildCoupon(promo, catalog)));
}

function buildCoupon(promo, catalog) {
  const service = catalog.services.find((s) => s.id === promo.serviceId);
  const hasPrice = service && promo.promoPrice != null;

  const action = service
    ? el('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: () => emit('jp:book', { serviceId: service.id }) }, 'Reservar con esta promo', icon('arrow-right', { size: 16 }))
    : el(
        'a',
        {
          class: 'btn btn--whatsapp btn--sm',
          href: whatsappUrl(catalog.business.whatsapp, generalMessage(catalog.business, `Quiero aprovechar la promo "${promo.title}".`)),
          target: '_blank',
          rel: 'noopener',
        },
        icon('whatsapp', { size: 16 }),
        'Consultar por WhatsApp',
      );

  return el(
    'li',
    { class: 'coupon' },
    promo.badge ? el('span', { class: 'coupon__badge' }, promo.badge) : null,
    el('h3', { class: 'coupon__title' }, promo.title),
    el('p', { class: 'coupon__text' }, promo.description),
    hasPrice
      ? el('p', { class: 'coupon__price' }, el('s', {}, formatCLP(service.price)), el('strong', {}, formatCLP(promo.promoPrice)), el('span', {}, service.name))
      : null,
    promo.validUntil ? el('p', { class: 'coupon__valid' }, icon('clock', { size: 14 }), `Hasta el ${formatLongDate(promo.validUntil)}`) : null,
    el('div', { class: 'coupon__action' }, action),
  );
}

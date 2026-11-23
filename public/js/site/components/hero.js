/**
 * Portada: estado "abierto/cerrado" y ticket con la próxima hora libre.
 * El botón del ticket abre la reserva con esa hora ya elegida.
 */
import { $, el, replaceContent } from '../../core/dom.js';
import { emit } from '../../core/events.js';
import { formatCLP } from '../../core/format.js';
import { relativeDayLabel, todayISO } from '../../core/dates.js';
import { getOpenStatus } from '../../domain/open-status.js';
import { promoForService, priceFor } from '../../domain/pricing.js';
import { findNextFreeSlot } from '../../services/booking-service.js';
import { icon } from '../../ui/icons.js';
import { buildTicket } from '../../ui/ticket.js';

export async function initHero({ repo, catalog }) {
  renderOpenStatus(catalog.schedule);
  // Se actualiza cada minuto por si el cliente deja la página abierta.
  setInterval(() => renderOpenStatus(catalog.schedule), 60_000);

  const host = $('#hero-ticket');
  if (!host) return;

  // El ticket muestra la próxima hora libre del servicio más corto (normalmente un corte).
  const service = [...catalog.services].sort((a, b) => a.durationMin - b.durationMin || a.order - b.order)[0];
  if (!service) {
    replaceContent(host, buildTicket({ label: 'Turno', big: '··:··', list: [['Estado', 'Servicios próximamente']] }));
    return;
  }

  replaceContent(host, buildTicket({ label: 'Próxima hora libre', big: '··:··', list: [['Día', 'Buscando…'], ['Servicio', service.name]] }));

  let next = null;
  try {
    next = await findNextFreeSlot({ repo, catalog, service });
  } catch (error) {
    console.error('No se pudo calcular la próxima hora', error);
  }

  if (!next) {
    replaceContent(host, buildTicket({ label: 'Agenda completa', big: '··:··', list: [['Estado', 'Sin horas por ahora'], ['Consulta', 'Escríbenos por WhatsApp']] }));
    return;
  }

  const promo = promoForService(catalog.promos, service, todayISO());
  const price = priceFor(service, promo);
  const ticket = buildTicket({
    label: 'Próxima hora libre',
    tag: 'Web',
    big: next.time,
    list: [
      ['Día', relativeDayLabel(next.date)],
      ['Servicio', service.name],
      ['Valor', formatCLP(price)],
    ],
  });
  const action = el(
    'button',
    { class: 'btn btn--primary btn--block hero__take', type: 'button', onclick: () => emit('jp:book', { serviceId: service.id, date: next.date, time: next.time }) },
    'Tomar esta hora',
    icon('arrow-right', { size: 18 }),
  );
  replaceContent(host, ticket, action);
}

function renderOpenStatus(schedule) {
  const node = $('#open-status');
  if (!node) return;
  const { open, label } = getOpenStatus(schedule);
  node.classList.toggle('is-open', open);
  node.querySelector('.status-chip__text').textContent = label;
}

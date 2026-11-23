/**
 * Ubicación: dirección, horarios y mapa.
 *
 * - Botones para abrir Google Maps, Apple Maps (iPhone) o Waze con la dirección.
 * - Mapa incrustado de Google: solo se carga si el visitante lo permite (cookie-banner) o pulsa
 *   "Cargar mapa", porque Google puede instalar cookies al mostrarlo.
 * - Mientras tanto se ve un mapa ilustrado, que no consulta a ningún tercero.
 */
import { ENV } from '../../config/env.js';
import { WEEK_ORDER, WEEKDAYS } from '../../config/constants.js';
import { $, el, replaceContent, svgEl } from '../../core/dom.js';
import { listen } from '../../core/events.js';
import { weekdayOf, todayISO } from '../../core/dates.js';
import { addressQuery, isAppleDevice, mapLinks } from '../../domain/maps.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { hasExternalConsent } from './cookie-banner.js';

export function initLocation({ catalog }) {
  const root = $('#location-root');
  if (!root) return;
  const { business, schedule } = catalog;
  const links = mapLinks(business);

  const mapHost = el('div', { class: 'map' });
  const showIllustration = () => replaceContent(mapHost, buildMapPlaceholder(business, () => loadEmbed()));
  const loadEmbed = () => {
    replaceContent(
      mapHost,
      el('iframe', {
        class: 'map__frame',
        title: `Mapa de ${business.name}`,
        src: links.embed,
        loading: 'lazy',
        referrerpolicy: 'no-referrer-when-downgrade',
        allowfullscreen: true,
      }),
    );
  };

  if (ENV.mapEmbed && hasExternalConsent()) loadEmbed();
  else showIllustration();
  listen('jp:consent', ({ external }) => {
    if (ENV.mapEmbed && external) loadEmbed();
  });

  /* Botones de navegación: se destaca la app más probable según el dispositivo. */
  const apple = isAppleDevice();
  const navButtons = [
    { label: 'Apple Maps', href: links.apple, primary: apple, show: true },
    { label: 'Google Maps', href: links.google, primary: !apple, show: true },
    { label: 'Waze', href: links.waze, primary: false, show: true },
  ].sort((a, b) => Number(b.primary) - Number(a.primary));

  const copyButton = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, icon('copy', { size: 16 }), 'Copiar dirección');
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(addressQuery(business));
      toast('Dirección copiada');
    } catch {
      toast(addressQuery(business), 'info');
    }
  });

  const todayIndex = weekdayOf(todayISO());
  const hoursRows = WEEK_ORDER.map((day) => {
    const h = schedule.weekly?.[day];
    const text = h?.open ? `${h.start} – ${h.end}${h.breakStart ? ` (pausa ${h.breakStart}–${h.breakEnd})` : ''}` : 'Cerrado';
    return el('li', { class: `hours__row${day === todayIndex ? ' is-today' : ''}${h?.open ? '' : ' is-closed'}` }, el('span', {}, WEEKDAYS[day]), el('span', { class: 'num' }, text));
  });

  replaceContent(
    root,
    el(
      'div',
      { class: 'location' },
      el('div', { class: 'location__map' }, mapHost),
      el(
        'div',
        { class: 'location__info stack' },
        el(
          'div',
          { class: 'stack' },
          el('h3', {}, 'Cómo llegar'),
          el('p', { class: 'location__address' }, icon('pin', { size: 20 }), el('span', {}, el('strong', {}, business.street), el('br'), business.area)),
          el(
            'div',
            { class: 'row' },
            navButtons.map((b) => el('a', { class: `btn btn--sm ${b.primary ? 'btn--primary' : 'btn--soft'}`, href: b.href, target: '_blank', rel: 'noopener' }, icon('navigation', { size: 16 }), b.label)),
          ),
          el('div', { class: 'row' }, copyButton),
        ),
        el('div', { class: 'stack' }, el('h3', {}, 'Horarios'), el('ul', { class: 'hours' }, hoursRows)),
      ),
    ),
  );
}

/** Mapa ilustrado (SVG): calles esquemáticas y un pin. No consulta servicios externos. */
function buildMapPlaceholder(business, onLoad) {
  const svg = svgEl('svg', { class: 'map__art', viewBox: '0 0 400 300', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true' });
  svg.innerHTML = `
    <rect width="400" height="300" class="map__land"/>
    <path d="M-10 70 L410 40" class="map__road map__road--minor"/>
    <path d="M-10 230 L410 250" class="map__road map__road--minor"/>
    <path d="M90 -10 L110 310" class="map__road map__road--minor"/>
    <path d="M300 -10 L280 310" class="map__road map__road--minor"/>
    <path d="M-10 160 C120 150 280 170 410 150" class="map__road map__road--main"/>
    <path d="M-10 160 C120 150 280 170 410 150" class="map__road-line"/>
    <rect x="130" y="85" width="60" height="45" rx="6" class="map__block"/>
    <rect x="215" y="90" width="50" height="40" rx="6" class="map__block"/>
    <rect x="130" y="190" width="70" height="38" rx="6" class="map__block"/>
    <rect x="320" y="85" width="55" height="50" rx="6" class="map__block"/>
    <rect x="25" y="95" width="45" height="40" rx="6" class="map__block"/>
    <rect x="225" y="195" width="45" height="40" rx="6" class="map__block"/>
    <g transform="translate(205 118)">
      <path d="M0 40 C-24 14 -24 -2 -24 -10 A24 24 0 0 1 24 -10 C24 -2 24 14 0 40Z" class="map__pin"/>
      <circle cx="0" cy="-10" r="9" fill="#fff"/>
    </g>`;

  const children = [svg, el('p', { class: 'map__label' }, icon('pin', { size: 16 }), business.street)];
  if (ENV.mapEmbed) {
    children.push(el('button', { class: 'btn btn--primary btn--sm map__load', type: 'button', onclick: onLoad }, 'Cargar mapa interactivo'));
    children.push(el('p', { class: 'map__note' }, 'Al cargarlo, Google puede usar cookies.'));
  }
  return el('div', { class: 'map__placeholder' }, children);
}

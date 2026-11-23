/**
 * Cabecera y pie compartidos por las páginas secundarias (privacidad, cookies, 404).
 * Así no se copia el mismo HTML en cada página: se edita aquí una sola vez.
 * La portada (index.html) tiene su propia cabecera porque lleva más contenido.
 */
import { LINKS } from '../config/constants.js';
import { ROUTES, homeAnchor } from '../config/routes.js';
import { $, el } from '../core/dom.js';
import { icon } from '../ui/icons.js';

function buildHeader() {
  return el(
    'header',
    { class: 'site-header' },
    el('div', { class: 'pole-band', 'aria-hidden': 'true' }),
    el(
      'div',
      { class: 'container site-header__inner' },
      el(
        'a',
        { class: 'brand', href: ROUTES.home, 'aria-label': 'JP Brothers, volver al inicio' },
        el('img', { class: 'brand__mark', src: '/assets/logo-jp-192.webp', width: 44, height: 44, alt: '' }),
        el('span', { class: 'brand__text' }, el('span', { class: 'brand__name' }, 'JP Brothers'), el('span', { class: 'brand__sub' }, 'Barbería')),
      ),
      el(
        'nav',
        { class: 'site-nav', id: 'site-nav', 'aria-label': 'Principal' },
        el('a', { href: homeAnchor('servicios') }, 'Servicios'),
        el('a', { href: homeAnchor('mi-reserva') }, 'Mi reserva'),
        el('a', { href: homeAnchor('ubicacion') }, 'Ubicación'),
        el('a', { class: 'btn btn--primary btn--sm site-nav__cta', href: homeAnchor('reservar') }, 'Reservar hora'),
      ),
      el(
        'div',
        { class: 'site-header__tools' },
        el('button', { class: 'theme-toggle', 'data-theme-toggle': '', type: 'button' }),
        el('button', { class: 'menu-toggle', id: 'menu-toggle', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'site-nav', 'aria-label': 'Abrir menú' }, icon('menu')),
      ),
    ),
  );
}

function buildFooter() {
  return el(
    'footer',
    { class: 'site-footer' },
    el('div', { class: 'pole-band', 'aria-hidden': 'true' }),
    el(
      'div',
      { class: 'container site-footer__legal' },
      el('p', {}, `© ${new Date().getFullYear()} JP Brothers Barbería · `, el('a', { href: ROUTES.privacy }, 'Privacidad'), ' · ', el('a', { href: ROUTES.cookies }, 'Cookies')),
      el('p', {}, 'Sitio web creado por ', el('a', { href: LINKS.tiforti, target: '_blank', rel: 'noopener' }, 'tiforti.cl')),
    ),
  );
}

/** Inserta la cabecera y el pie en los contenedores #site-header y #site-footer de la página. */
export function renderLayout() {
  $('#site-header')?.replaceWith(buildHeader());
  $('#site-footer')?.replaceWith(buildFooter());
}

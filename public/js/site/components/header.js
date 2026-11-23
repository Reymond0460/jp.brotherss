/**
 * Cabecera: menú móvil y sombra al hacer scroll.
 */
import { $, $$ } from '../../core/dom.js';

export function initHeader() {
  const header = $('.site-header');
  const toggle = $('#menu-toggle');
  const nav = $('#site-nav');
  if (!header || !toggle || !nav) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  // Al elegir una sección, el menú móvil se cierra.
  $$('a', nav).forEach((link) => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });

  const fabs = $('.fab-stack');
  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
    // Los botones flotantes aparecen al bajar de la portada, para no tapar el primer vistazo.
    fabs?.classList.toggle('is-visible', window.scrollY > 420);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/**
 * Carrusel "Nuestro trabajo": fotos de cortes que el barbero sube desde el panel (Galería).
 * Es una tira con desplazamiento táctil (scroll-snap) + flechas. Al tocar una foto se abre grande.
 * Si no hay fotos, la sección completa se oculta.
 */
import { $, el, replaceContent } from '../../core/dom.js';
import { openModal } from '../../ui/dialog.js';
import { icon } from '../../ui/icons.js';

export function initGallery({ catalog }) {
  const section = $('#trabajos');
  const host = $('#gallery-root');
  if (!section || !host) return;

  const items = catalog.gallery.filter((g) => g.active !== false && g.src).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  section.hidden = items.length === 0;
  document.querySelectorAll('[data-nav="trabajos"]').forEach((link) => (link.hidden = items.length === 0));
  if (!items.length) return;

  const track = el(
    'ul',
    { class: 'carousel__track', tabindex: '0', 'aria-label': 'Fotos de trabajos realizados' },
    items.map((item) =>
      el(
        'li',
        { class: 'carousel__item' },
        el(
          'button',
          { class: 'carousel__slide', type: 'button', 'aria-label': `Ver foto${item.caption ? `: ${item.caption}` : ''}`, onclick: () => openPhoto(item) },
          el('img', { src: item.src, alt: item.caption || 'Corte realizado en JP Brothers', loading: 'lazy', decoding: 'async' }),
          item.caption ? el('span', { class: 'carousel__caption' }, item.caption) : null,
        ),
      ),
    ),
  );

  const prev = el('button', { class: 'icon-btn carousel__nav', type: 'button', 'aria-label': 'Fotos anteriores', onclick: () => scrollBy(-1) }, icon('chevron-left', { size: 22 }));
  const next = el('button', { class: 'icon-btn carousel__nav', type: 'button', 'aria-label': 'Más fotos', onclick: () => scrollBy(1) }, icon('chevron-right', { size: 22 }));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function scrollBy(direction) {
    track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /** Desactiva las flechas en los extremos. */
  function updateNav() {
    prev.disabled = track.scrollLeft < 8;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
  }
  track.addEventListener('scroll', updateNav, { passive: true });
  window.addEventListener('resize', updateNav);

  // Flechas del teclado cuando la tira tiene el foco.
  track.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') scrollBy(1);
    if (event.key === 'ArrowLeft') scrollBy(-1);
  });

  const instagram = el('a', { class: 'btn btn--ghost btn--sm', 'data-link': 'instagram', href: '#', target: '_blank', rel: 'noopener' }, icon('instagram', { size: 16 }), 'Ver más en Instagram');
  instagram.href = `https://www.instagram.com/${catalog.business.instagram}/`;

  replaceContent(host, el('div', { class: 'carousel' }, track, el('div', { class: 'carousel__controls' }, instagram, el('div', { class: 'row' }, prev, next))));
  requestAnimationFrame(updateNav);
}

function openPhoto(item) {
  openModal({
    title: item.caption || 'Nuestro trabajo',
    body: el('img', { class: 'photo-modal', src: item.src, alt: item.caption || 'Corte realizado en JP Brothers' }),
    wide: true,
  });
}

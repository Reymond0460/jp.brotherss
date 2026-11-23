/**
 * Encabezado común de cada vista del panel: título, subtítulo y acciones a la derecha.
 */
import { el } from '../../core/dom.js';

export function pageHeader(title, subtitle, ...actions) {
  return el(
    'header',
    { class: 'page-header' },
    el('div', {}, el('h1', { class: 'page-header__title' }, title), subtitle ? el('p', { class: 'muted' }, subtitle) : null),
    actions.length ? el('div', { class: 'row' }, actions) : null,
  );
}

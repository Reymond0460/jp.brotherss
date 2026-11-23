/**
 * Avisos breves ("toasts") para confirmar acciones o mostrar errores.
 * Usa una región aria-live para que los lectores de pantalla los anuncien.
 */
import { el } from '../core/dom.js';
import { icon } from './icons.js';

const ICONS = { success: 'check', error: 'alert', info: 'info' };
let region = null;

function getRegion() {
  if (!region) {
    region = el('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(region);
  }
  return region;
}

/**
 * @param {string} message
 * @param {'success'|'error'|'info'} [type]
 */
export function toast(message, type = 'success') {
  const node = el('div', { class: `toast toast--${type}` }, icon(ICONS[type], { size: 18 }), el('span', {}, message));
  getRegion().append(node);
  setTimeout(() => node.remove(), type === 'error' ? 6000 : 3800);
}

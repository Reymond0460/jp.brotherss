/**
 * Construye el "ticket de turno" (ver css/components/ticket.css).
 * Se reutiliza en la portada, en el resumen de la reserva y en "Mi reserva".
 */
import { el } from '../core/dom.js';

/**
 * @param {object} options
 * @param {string} [options.label]        texto pequeño superior izquierdo
 * @param {string} [options.tag]          texto pequeño superior derecho
 * @param {string} options.big            dato principal (normalmente la hora)
 * @param {[string, string|Node][]} [options.list]  pares etiqueta / valor
 * @param {string} [options.stubCode]     texto del talón (ej. código de reserva)
 * @param {string} [options.stubCaption]  etiqueta sobre el código
 */
export function buildTicket({ label = 'Turno', tag = '', big, list = [], stubCode = 'JP BROTHERS', stubCaption = 'Barbería' }) {
  return el(
    'div',
    { class: 'ticket-wrap' },
    el(
      'article',
      { class: 'ticket' },
      el(
        'div',
        { class: 'ticket__main' },
        el('div', { class: 'ticket__label' }, el('span', {}, label), el('span', {}, tag)),
        el('p', { class: 'ticket__big' }, big),
        el('dl', { class: 'ticket__list' }, list.map(([term, value]) => el('div', {}, el('dt', {}, term), el('dd', {}, value)))),
      ),
      el(
        'div',
        { class: 'ticket__stub' },
        el('div', { class: 'ticket__code' }, el('small', {}, stubCaption), stubCode),
        el('div', { class: 'barcode', 'aria-hidden': 'true' }),
      ),
    ),
  );
}

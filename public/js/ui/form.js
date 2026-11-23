/**
 * Piezas reutilizables de formulario (campo con etiqueta y error, interruptor).
 */
import { el } from '../core/dom.js';

/**
 * Campo con etiqueta, ayuda y mensaje de error.
 * @param {string} id        id del control (enlaza la etiqueta)
 * @param {string} label
 * @param {Node} control
 * @param {{hint?: string, error?: string}} [extra]
 */
export function field(id, label, control, { hint, error } = {}) {
  return el(
    'div',
    { class: `field${error ? ' field--invalid' : ''}` },
    el('label', { class: 'field__label', for: id }, label),
    control,
    error ? el('p', { class: 'field__error', id: `${id}-error` }, error) : hint ? el('p', { class: 'field__hint' }, hint) : null,
  );
}

/** <input> con la clase de estilo del proyecto. */
export const input = (props) => el('input', { class: 'input', ...props });

/** <select> con opciones [{ value, label }]. */
export function select({ options, value, ...props }) {
  return el(
    'select',
    { class: 'select', ...props },
    options.map((o) => el('option', { value: o.value, selected: String(o.value) === String(value) }, o.label)),
  );
}

/** Interruptor (checkbox con apariencia de switch). */
export function switchControl({ id, label, checked = false, onchange }) {
  return el(
    'label',
    { class: 'switch', for: id },
    el('input', { type: 'checkbox', id, checked, onchange }),
    el('span', { class: 'switch__track' }),
    label ? el('span', {}, label) : null,
  );
}

/** Muestra errores de validación `{campo: mensaje}` dentro de un formulario y enfoca el primero. */
export function showFieldErrors(form, errors) {
  form.querySelectorAll('.field__error').forEach((n) => n.remove());
  form.querySelectorAll('.field--invalid').forEach((n) => n.classList.remove('field--invalid'));
  let first = null;
  for (const [name, message] of Object.entries(errors)) {
    const control = form.elements[name];
    const wrapper = control?.closest?.('.field');
    if (!wrapper) continue;
    wrapper.classList.add('field--invalid');
    wrapper.append(el('p', { class: 'field__error' }, message));
    first ??= control;
  }
  first?.focus();
}

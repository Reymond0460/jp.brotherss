/**
 * Ventanas modales basadas en el elemento nativo <dialog> (accesible: foco atrapado, tecla Esc).
 * No se usa alert()/confirm() del navegador: no se pueden estilizar y algunos entornos los bloquean.
 */
import { el } from '../core/dom.js';
import { icon } from './icons.js';

/**
 * Abre un modal con un título y un contenido (nodo DOM).
 * @param {{title: string, body: Node, wide?: boolean}} options
 * @returns {{close: () => void, root: HTMLDialogElement}}
 */
export function openModal({ title, body, wide = false }) {
  const closeButton = el('button', { class: 'dialog__close', type: 'button', 'aria-label': 'Cerrar' }, icon('x', { size: 20 }));
  const root = el(
    'dialog',
    { class: `dialog${wide ? ' dialog--wide' : ''}`, 'aria-labelledby': 'dialog-title' },
    el('header', { class: 'dialog__header' }, el('h2', { id: 'dialog-title', class: 'dialog__title' }, title), closeButton),
    el('div', { class: 'dialog__body' }, body),
  );

  const close = () => root.close();
  closeButton.addEventListener('click', close);
  // Click en el fondo oscurecido (fuera de la tarjeta) cierra el modal.
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  root.addEventListener('close', () => root.remove());

  document.body.append(root);
  root.showModal();
  return { close, root };
}

/**
 * Pregunta de confirmación. Resuelve true si el usuario confirma.
 * @param {{title: string, message: string, confirmLabel?: string, danger?: boolean}} options
 */
export function confirmDialog({ title, message, confirmLabel = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    let answer = false;
    const cancel = el('button', { class: 'btn btn--ghost', type: 'button' }, 'Volver');
    const accept = el('button', { class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`, type: 'button' }, confirmLabel);
    const body = el('div', { class: 'stack' }, el('p', {}, message), el('div', { class: 'dialog__actions' }, cancel, accept));

    const { close, root } = openModal({ title, body });
    cancel.addEventListener('click', close);
    accept.addEventListener('click', () => {
      answer = true;
      close();
    });
    root.addEventListener('close', () => resolve(answer));
  });
}

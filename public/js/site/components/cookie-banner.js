/**
 * Aviso de cookies y gestión del consentimiento.
 *
 * El sitio solo usa almacenamiento TÉCNICO propio (recordar la última reserva y estas preferencias).
 * La única categoría opcional es "contenido externo": el mapa de Google Maps, que puede
 * instalar cookies de Google. Por eso el mapa solo se carga con permiso del visitante.
 */
import { STORAGE_KEYS } from '../../config/constants.js';
import { $, el } from '../../core/dom.js';
import { emit } from '../../core/events.js';
import { safeStorage } from '../../core/safe-storage.js';

/** ¿El visitante permitió contenido externo (mapa)? */
export const hasExternalConsent = () => safeStorage.get(STORAGE_KEYS.cookieConsent)?.external === true;

const hasAnswered = () => safeStorage.get(STORAGE_KEYS.cookieConsent) !== null;

function save(external) {
  safeStorage.set(STORAGE_KEYS.cookieConsent, { external, at: new Date().toISOString() });
  emit('jp:consent', { external });
}

export function initCookieBanner() {
  const host = $('#cookie-banner');
  if (!host) return;

  const close = () => host.replaceChildren();

  const open = () => {
    const only = el('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => (save(false), close()) }, 'Solo necesarias');
    const all = el('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: () => (save(true), close()) }, 'Aceptar todas');

    host.replaceChildren(
      el(
        'section',
        { class: 'cookie-banner', role: 'dialog', 'aria-labelledby': 'cookie-title' },
        el('h2', { id: 'cookie-title', class: 'cookie-banner__title' }, 'Cookies'),
        el(
          'p',
          {},
          'Usamos almacenamiento propio para que la web funcione y recordar tu última reserva. ',
          'Con tu permiso también mostramos el mapa de Google, que puede instalar sus propias cookies. ',
          el('a', { href: 'cookies.html' }, 'Más información'),
          '.',
        ),
        el('div', { class: 'row' }, only, all),
      ),
    );
    all.focus({ preventScroll: true });
  };

  if (!hasAnswered()) open();

  // El enlace "Preferencias de cookies" del pie vuelve a abrir el aviso.
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-open-cookies]')) {
      event.preventDefault();
      open();
    }
  });
}

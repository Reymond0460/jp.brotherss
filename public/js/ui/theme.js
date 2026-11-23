/**
 * Modo claro / oscuro.
 *
 * - Por defecto se respeta la preferencia del sistema del cliente (prefers-color-scheme en el CSS).
 * - Si el cliente pulsa el botón, su elección se guarda y se escribe como data-theme="light|dark" en <html>.
 * - Cualquier botón con el atributo data-theme-toggle funciona como interruptor.
 */
import { STORAGE_KEYS } from '../config/constants.js';
import { safeStorage } from '../core/safe-storage.js';
import { icon } from './icons.js';

const root = document.documentElement;
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

/** Tema que se está viendo ahora: la elección del cliente o, si no hay, la del sistema. */
export const effectiveTheme = () => root.dataset.theme ?? (systemDark.matches ? 'dark' : 'light');

/** Actualiza el icono y el texto accesible de todos los botones interruptor. */
export function refreshThemeToggles() {
  const dark = effectiveTheme() === 'dark';
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    const label = dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.setAttribute('aria-pressed', String(dark));
    const children = [icon(dark ? 'sun' : 'moon', { size: 20 })];
    // Los botones grandes (clase "btn") muestran también el texto.
    if (button.classList.contains('btn')) children.push(document.createTextNode(dark ? 'Modo claro' : 'Modo oscuro'));
    button.replaceChildren(...children);
  });
}

export function initTheme() {
  const saved = safeStorage.get(STORAGE_KEYS.theme);
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-theme-toggle]')) return;
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    safeStorage.set(STORAGE_KEYS.theme, next);
    refreshThemeToggles();
  });
  systemDark.addEventListener('change', refreshThemeToggles);
  refreshThemeToggles();
}

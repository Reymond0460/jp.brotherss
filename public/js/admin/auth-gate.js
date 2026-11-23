/**
 * Puerta de acceso del panel: muestra el login y avisa cuando hay (o deja de haber) sesión.
 * Solo entran cuentas registradas como administrador (el backend lo verifica).
 */
import { ENV } from '../config/env.js';
import { el, replaceContent } from '../core/dom.js';
import { NotAdminError } from '../data/errors.js';
import { field, input } from '../ui/form.js';
import { icon } from '../ui/icons.js';

/** Traduce los códigos de error de Firebase Authentication a mensajes claros. */
function loginErrorMessage(error) {
  if (error instanceof NotAdminError) return 'Esta cuenta no tiene permisos de administrador.';
  switch (error?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Correo o contraseña incorrectos.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu internet.';
    default:
      return 'No pudimos iniciar sesión. Intenta de nuevo.';
  }
}

/**
 * @param {object} options
 * @param {import('../data/contract.js').Repository} options.repo
 * @param {HTMLElement} options.loginRoot
 * @param {HTMLElement} options.appRoot
 * @param {(user: {email: string}) => void} options.onLogin
 */
export function initAuthGate({ repo, loginRoot, appRoot, onLogin }) {
  let loggedIn = false;

  const message = el('p', { class: 'field__error', role: 'alert' });
  const email = input({ id: 'login-email', name: 'email', type: 'email', autocomplete: 'username', required: true, autofocus: true });
  const password = input({ id: 'login-password', name: 'password', type: 'password', autocomplete: 'current-password', required: true });
  const submit = el('button', { class: 'btn btn--primary btn--block', type: 'submit' }, 'Entrar', icon('arrow-right', { size: 18 }));

  const form = el(
    'form',
    { class: 'login__form stack', novalidate: true },
    field('login-email', 'Correo', email),
    field('login-password', 'Contraseña', password),
    message,
    submit,
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.textContent = '';
    submit.disabled = true;
    try {
      await repo.signIn(email.value.trim(), password.value);
    } catch (error) {
      message.textContent = loginErrorMessage(error);
      password.value = '';
      password.focus();
    }
    submit.disabled = false;
  });

  replaceContent(
    loginRoot,
    el(
      'div',
      { class: 'login' },
      el('div', { class: 'pole-band', 'aria-hidden': 'true' }),
      el(
        'main',
        { class: 'login__card' },
        el('img', { class: 'login__logo', src: 'assets/logo-jp-192.webp', width: 64, height: 64, alt: '' }),
        el('h1', { class: 'login__title' }, 'Panel del barbero'),
        el('p', { class: 'muted' }, 'JP Brothers Barbería'),
        ENV.demo ? el('p', { class: 'notice notice--blue' }, icon('info', { size: 18 }), 'Modo demo: escribe cualquier correo y contraseña para entrar. Los datos son de ejemplo y quedan solo en este navegador.') : null,
        form,
        el('a', { class: 'muted', href: 'index.html' }, '← Volver al sitio'),
      ),
    ),
  );

  repo.onAuthChange((user) => {
    const active = Boolean(user);
    loginRoot.hidden = active;
    appRoot.hidden = !active;
    if (active && !loggedIn) onLogin(user);
    if (!active && loggedIn) location.hash = '';
    loggedIn = active;
  });
}

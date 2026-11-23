/**
 * Punto de entrada del PANEL DE ADMINISTRACIÓN (admin.html).
 */
import { $ } from '../core/dom.js';
import { getRepository } from '../data/repository.js';
import { hydrateIcons } from '../ui/icons.js';
import { initAuthGate } from './auth-gate.js';
import { startApp } from './shell.js';

async function boot() {
  hydrateIcons();
  const loginRoot = $('#login-root');
  const appRoot = $('#app-root');

  try {
    const repo = await getRepository();
    initAuthGate({ repo, loginRoot, appRoot, onLogin: (user) => startApp({ repo, user, appRoot }) });
  } catch (error) {
    console.error(error);
    loginRoot.textContent = 'No se pudo conectar con la base de datos. Recarga la página.';
  }
}

boot();

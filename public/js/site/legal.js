/**
 * Script de las páginas legales (privacidad.html y cookies.html).
 * Solo necesitan iconos, el menú, el año y el aviso de cookies: no cargan datos.
 */
import { $ } from '../core/dom.js';
import { hydrateIcons } from '../ui/icons.js';
import { initCookieBanner } from './components/cookie-banner.js';
import { initHeader } from './components/header.js';

hydrateIcons();
$('#year').textContent = new Date().getFullYear();
initHeader();
initCookieBanner();

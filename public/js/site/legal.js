/**
 * Script de las páginas secundarias (/privacidad/, /cookies/ y la página 404).
 * Solo necesitan la cabecera y el pie compartidos, el menú móvil y el aviso de cookies: no cargan datos.
 */
import { hydrateIcons } from '../ui/icons.js';
import { initTheme } from '../ui/theme.js';
import { initCookieBanner } from './components/cookie-banner.js';
import { initHeader } from './components/header.js';
import { renderLayout } from './layout.js';

renderLayout();
hydrateIcons();
initTheme();
initHeader();
initCookieBanner();

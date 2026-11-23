/**
 * Estructura del panel: menú lateral (escritorio) / barra inferior (móvil) y zona de contenido.
 */
import { ENV } from '../config/env.js';
import { $, el, replaceContent } from '../core/dom.js';
import { loadCatalog } from '../services/booking-service.js';
import { icon } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import { createRouter } from './router.js';
import { renderAgenda } from './views/agenda.js';
import { renderDashboard } from './views/dashboard.js';
import { renderPromos } from './views/promos.js';
import { renderSchedule } from './views/schedule.js';
import { renderServices } from './views/services.js';
import { renderSettings } from './views/settings.js';

/** Secciones del panel: id (hash), texto, icono y función que dibuja la vista. */
const SECTIONS = [
  { id: 'resumen', label: 'Resumen', icon: 'chart', render: renderDashboard },
  { id: 'agenda', label: 'Agenda', icon: 'calendar', render: renderAgenda },
  { id: 'horarios', label: 'Horarios', icon: 'clock', render: renderSchedule },
  { id: 'servicios', label: 'Servicios', icon: 'scissors', render: renderServices },
  { id: 'promos', label: 'Promos', icon: 'tag', render: renderPromos },
  { id: 'ajustes', label: 'Ajustes', icon: 'sliders', render: renderSettings },
];

const ENV_LABEL = { prod: 'Producción', qa: 'QA (pruebas)', dev: 'Desarrollo', demo: 'Demo' };

let activeRouter = null;

export async function startApp({ repo, user, appRoot }) {
  /** Contexto compartido con todas las vistas. */
  const ctx = {
    repo,
    user,
    catalog: null,
    /** Vuelve a leer servicios, promos, horarios y datos del negocio. */
    async refresh() {
      ctx.catalog = await loadCatalog(repo, { includeInactive: true });
    },
  };

  try {
    await ctx.refresh();
  } catch (error) {
    console.error(error);
    toast('No pudimos cargar los datos del negocio.', 'error');
    return;
  }

  const outlet = el('main', { class: 'admin-main', id: 'view-outlet' });
  const links = SECTIONS.map((s) => el('a', { class: 'admin-nav__link', href: `#${s.id}`, 'data-section': s.id }, icon(s.icon, { size: 20 }), el('span', {}, s.label)));

  const logout = el('button', { class: 'btn btn--ghost btn--sm btn--block', type: 'button', onclick: () => repo.signOut() }, icon('logout', { size: 16 }), 'Cerrar sesión');

  const nav = el(
    'aside',
    { class: 'admin-nav' },
    el('a', { class: 'brand admin-nav__brand', href: '#resumen' }, el('img', { class: 'brand__mark', src: 'assets/logo.svg', width: 36, height: 36, alt: '' }), el('span', { class: 'brand__text' }, el('span', { class: 'brand__name' }, 'JP Brothers'), el('span', { class: 'brand__sub' }, 'Panel'))),
    el('nav', { class: 'admin-nav__links', 'aria-label': 'Secciones del panel' }, links),
    el(
      'div',
      { class: 'admin-nav__foot' },
      el('span', { class: `env-badge env-badge--${ENV.name}` }, ENV_LABEL[ENV.name]),
      el('p', { class: 'admin-nav__user' }, user.email),
      el('a', { class: 'link-btn', href: 'index.html' }, 'Ver sitio público'),
      logout,
    ),
  );

  replaceContent(appRoot, el('div', { class: 'admin-shell' }, nav, outlet));

  activeRouter?.destroy(); // si se vuelve a iniciar sesión, no se duplican los listeners
  activeRouter = createRouter({
    routes: Object.fromEntries(SECTIONS.map((s) => [s.id, s.render])),
    defaultRoute: 'resumen',
    outlet,
    ctx,
    onChange: (name) => {
      links.forEach((link) => link.toggleAttribute('aria-current', link.dataset.section === name));
      $('.admin-nav__link[aria-current]')?.setAttribute('aria-current', 'page');
      window.scrollTo({ top: 0 });
    },
  });
  await activeRouter.render();
}

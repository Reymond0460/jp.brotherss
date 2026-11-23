/**
 * Punto de entrada del SITIO PÚBLICO (index.html).
 *
 * Orden: 1) cosas que no dependen de datos, 2) cargar datos, 3) iniciar cada componente.
 * Cada componente vive en site/components/ y recibe { repo, catalog }.
 */
import { $, replaceContent, el } from '../core/dom.js';
import { getRepository } from '../data/repository.js';
import { loadCatalog } from '../services/booking-service.js';
import { hydrateIcons } from '../ui/icons.js';
import { bindBusiness } from './components/business-bind.js';
import { initBooking } from './components/booking.js';
import { initCookieBanner } from './components/cookie-banner.js';
import { initHeader } from './components/header.js';
import { initGallery } from './components/gallery.js';
import { initHero } from './components/hero.js';
import { initLocation } from './components/location.js';
import { initMyBooking } from './components/my-booking.js';
import { initPromos } from './components/promos.js';
import { initServices } from './components/services.js';

async function boot() {
  hydrateIcons();
  $('#year').textContent = new Date().getFullYear();
  initHeader();
  initCookieBanner();

  let repo;
  let catalog;
  try {
    repo = await getRepository();
    catalog = await loadCatalog(repo);
  } catch (error) {
    console.error('No se pudieron cargar los datos', error);
    showLoadError();
    return;
  }

  const context = { repo, catalog };
  bindBusiness(catalog.business);
  initGallery(context);
  initPromos(context);
  initServices(context);
  initBooking(context);
  initMyBooking(context);
  initLocation(context);
  initHero(context);
}

/** Si falla la carga, se deja un camino alternativo claro: WhatsApp. */
function showLoadError() {
  const host = $('#hero-ticket');
  if (host) {
    replaceContent(host, el('p', { class: 'notice notice--red' }, 'No pudimos cargar la agenda. Recarga la página o escríbenos por WhatsApp para reservar.'));
  }
}

boot();

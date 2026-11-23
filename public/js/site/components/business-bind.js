/**
 * Rellena en el HTML los datos del negocio (editables desde el panel), para que
 * el barbero pueda cambiarlos sin tocar código.
 *
 *   <span data-business="street"></span>     → texto
 *   <a data-link="whatsapp"></a>             → href de WhatsApp
 *   <a data-link="instagram"></a>            → href de Instagram
 *   <a data-link="maps"></a>                 → href de Google Maps
 */
import { $$ } from '../../core/dom.js';
import { formatPhone } from '../../core/format.js';
import { mapLinks } from '../../domain/maps.js';
import { generalMessage, whatsappUrl } from '../../domain/whatsapp.js';

export function bindBusiness(business) {
  const text = {
    name: business.name,
    street: business.street,
    area: business.area,
    instagram: `@${business.instagram}`,
    whatsapp: formatPhone(business.whatsapp),
  };
  $$('[data-business]').forEach((node) => {
    const value = text[node.dataset.business];
    if (value) node.textContent = value;
  });

  const links = {
    whatsapp: whatsappUrl(business.whatsapp, generalMessage(business)),
    instagram: `https://www.instagram.com/${business.instagram}/`,
    maps: mapLinks(business).google,
  };
  $$('[data-link]').forEach((node) => {
    const href = links[node.dataset.link];
    if (href) node.setAttribute('href', href);
  });
}

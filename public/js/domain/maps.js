/**
 * Enlaces a mapas para una dirección.
 * No requieren API key: son URLs públicas que abren la app de mapas del dispositivo.
 */

/** Texto que se envía a los buscadores de mapas. */
export const addressQuery = (business) => [business.street, business.area].filter(Boolean).join(', ');

export function mapLinks(business) {
  const q = encodeURIComponent(addressQuery(business));
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${q}`,
    apple: `https://maps.apple.com/?q=${q}`,
    waze: `https://waze.com/ul?q=${q}&navigate=yes`,
    // Mapa incrustado (iframe). Solo se carga con permiso del usuario (ver cookie-banner).
    embed: `https://www.google.com/maps?q=${q}&output=embed`,
  };
}

/** Detecta si el dispositivo es de Apple, para destacar Apple Maps. */
export const isAppleDevice = () => /iPhone|iPad|iPod|Macintosh/.test(globalThis.navigator?.userAgent ?? '');

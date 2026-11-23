/**
 * Precios y promociones.
 */

/** Una promo se muestra si está activa y hoy está dentro de su vigencia. */
export function isPromoActive(promo, today) {
  if (promo.active === false) return false;
  if (promo.validFrom && promo.validFrom > today) return false;
  if (promo.validUntil && promo.validUntil < today) return false;
  return true;
}

export const visiblePromos = (promos, today) => promos.filter((p) => isPromoActive(p, today));

/** La promo vigente más barata asociada a un servicio (con precio fijo), o null. */
export function promoForService(promos, service, today) {
  const candidates = visiblePromos(promos, today).filter((p) => p.serviceId === service.id && p.promoPrice != null);
  return candidates.sort((a, b) => a.promoPrice - b.promoPrice)[0] ?? null;
}

/** Precio a cobrar: el de la promo si corresponde a este servicio, si no el normal. */
export function priceFor(service, promo = null) {
  const applies = promo && promo.serviceId === service.id && promo.promoPrice != null;
  return applies ? Number(promo.promoPrice) : Number(service.price);
}

/** Ahorro que representa una promo respecto del precio normal (0 si no hay). */
export function savingsOf(promo, service) {
  if (!service || promo.promoPrice == null) return 0;
  return Math.max(0, Number(service.price) - Number(promo.promoPrice));
}

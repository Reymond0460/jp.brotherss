/**
 * Generación de ids legibles para servicios y promos (ej. "corte-barba-k3f9").
 */

/** "Corte + Barba" → "corte-barba" */
export function slugify(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // quita las marcas de acento separadas por normalize()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
}

export function newId(text = 'item') {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const suffix = [...bytes].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 4);
  return `${slugify(text) || 'item'}-${suffix}`;
}

/**
 * Formato y normalización de valores (dinero, teléfonos, textos).
 */

const clpFormatter = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

/** 8000 → "$8.000" */
export const formatCLP = (amount) => clpFormatter.format(Number(amount) || 0);

/**
 * Normaliza un teléfono chileno a solo dígitos con código de país: "56940916058".
 * Acepta "+56 9 4091 6058", "940916058", "9 4091 6058", "56940916058".
 * @returns {string|null} null si no es un celular chileno válido.
 */
export function normalizePhone(input) {
  let digits = String(input ?? '').replace(/\D/g, '');
  if (digits.startsWith('56') && digits.length === 11) digits = digits.slice(2);
  return /^9\d{8}$/.test(digits) ? `56${digits}` : null;
}

/** "56940916058" → "+56 9 4091 6058" (si no calza, devuelve el original). */
export function formatPhone(phone) {
  const m = /^56(9)(\d{4})(\d{4})$/.exec(String(phone ?? ''));
  return m ? `+56 ${m[1]} ${m[2]} ${m[3]}` : String(phone ?? '');
}

/** Recorta y colapsa espacios de un texto ingresado por el usuario. */
export const cleanText = (text) => String(text ?? '').replace(/\s+/g, ' ').trim();

/** "1 corte" / "3 cortes" */
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Iniciales para avatares: "Juan Pérez" → "JP". */
export function initials(name) {
  return cleanText(name)
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Duración legible: 30 → "30 min", 90 → "1 h 30 min". */
export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

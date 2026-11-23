/**
 * Código de reserva.
 *
 * El código ES el id del documento en Firestore. Como no se puede listar la colección
 * (solo leer un documento por id), solo quien conoce el código puede ver una reserva.
 * 8 caracteres de un alfabeto de 31 símbolos ≈ 850 mil millones de combinaciones.
 *
 * El alfabeto omite 0, 1, I, L y O para que no se confundan al dictarlo por teléfono.
 */

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const LENGTH = 8;

export function generateBookingId() {
  const bytes = new Uint8Array(LENGTH);
  crypto.getRandomValues(bytes);
  // El módulo introduce un sesgo mínimo (256 % 31), irrelevante para un código de consulta.
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** "7K3M9QXA" → "JP-7K3M-9QXA" */
export const formatBookingCode = (id) => `JP-${id.slice(0, 4)}-${id.slice(4)}`;

/**
 * Convierte lo que escribe el cliente en un id válido, o null.
 * Acepta mayúsculas/minúsculas, con o sin guiones y con o sin el prefijo "JP".
 */
export function parseBookingCode(input) {
  let clean = String(input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length === LENGTH + 2 && clean.startsWith('JP')) clean = clean.slice(2);
  const valid = clean.length === LENGTH && [...clean].every((c) => ALPHABET.includes(c));
  return valid ? clean : null;
}

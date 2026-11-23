/**
 * Validación de formularios. Cada función devuelve:
 *   { ok: boolean, errors: { campo: "mensaje" }, values: { ...valores limpios } }
 * Los mensajes están pensados para mostrarse tal cual al usuario.
 */
import { cleanText, normalizePhone } from '../core/format.js';
import { timeToMinutes } from '../core/dates.js';

const result = (errors, values) => ({ ok: Object.keys(errors).length === 0, errors, values });

/** Datos de contacto del cliente al reservar. */
export function validateClient({ name, phone, notes = '' }) {
  const errors = {};
  const cleanName = cleanText(name);
  const normalizedPhone = normalizePhone(phone);

  if (cleanName.length < 2) errors.name = 'Escribe tu nombre.';
  else if (cleanName.length > 60) errors.name = 'El nombre es demasiado largo.';
  if (!normalizedPhone) errors.phone = 'Ingresa un celular chileno válido, por ejemplo 9 1234 5678.';

  const cleanNotes = cleanText(notes).slice(0, 200);
  return result(errors, { name: cleanName, phone: normalizedPhone, notes: cleanNotes });
}

export function validateService({ name, description = '', price, durationMin }) {
  const errors = {};
  const cleanName = cleanText(name);
  const priceNum = Number(price);
  const duration = Number(durationMin);

  if (!cleanName) errors.name = 'Ponle un nombre al servicio.';
  if (!Number.isFinite(priceNum) || priceNum < 0) errors.price = 'Ingresa un precio válido.';
  if (!Number.isInteger(duration) || duration < 10 || duration > 240) errors.durationMin = 'La duración debe estar entre 10 y 240 minutos.';

  return result(errors, { name: cleanName, description: cleanText(description).slice(0, 140), price: priceNum, durationMin: duration });
}

export function validatePromo({ title, description = '', badge = '', serviceId = '', promoPrice = '', validUntil = '' }) {
  const errors = {};
  const cleanTitle = cleanText(title);
  const hasPrice = String(promoPrice).trim() !== '';
  const priceNum = hasPrice ? Number(promoPrice) : null;

  if (!cleanTitle) errors.title = 'Ponle un título a la promo.';
  if (hasPrice && (!Number.isFinite(priceNum) || priceNum < 0)) errors.promoPrice = 'Ingresa un precio válido.';
  if (hasPrice && !serviceId) errors.serviceId = 'Para fijar un precio, elige el servicio.';

  return result(errors, {
    title: cleanTitle,
    description: cleanText(description).slice(0, 160),
    badge: cleanText(badge).slice(0, 16),
    serviceId,
    promoPrice: priceNum,
    validUntil,
  });
}

/** Horario semanal: cada día abierto debe tener inicio < término y pausa dentro de la jornada. */
export function validateWeekly(weekly) {
  const errors = {};
  for (const [day, h] of Object.entries(weekly)) {
    if (!h.open) continue;
    if (!h.start || !h.end || timeToMinutes(h.start) >= timeToMinutes(h.end)) {
      errors[day] = 'La hora de cierre debe ser posterior a la de apertura.';
    } else if (h.breakStart || h.breakEnd) {
      const ok = h.breakStart && h.breakEnd
        && timeToMinutes(h.breakStart) < timeToMinutes(h.breakEnd)
        && timeToMinutes(h.breakStart) >= timeToMinutes(h.start)
        && timeToMinutes(h.breakEnd) <= timeToMinutes(h.end);
      if (!ok) errors[day] = 'La pausa debe quedar dentro de la jornada (o déjala vacía).';
    }
  }
  return result(errors, weekly);
}

export function validateBusiness({ whatsapp, instagram, street, area, maxDaysAhead, minNoticeMinutes }) {
  const errors = {};
  const phone = normalizePhone(whatsapp);
  const days = Number(maxDaysAhead);
  const notice = Number(minNoticeMinutes);

  if (!phone) errors.whatsapp = 'Ingresa un celular chileno válido.';
  if (!cleanText(street)) errors.street = 'Falta la dirección.';
  if (!Number.isInteger(days) || days < 1 || days > 90) errors.maxDaysAhead = 'Entre 1 y 90 días.';
  if (!Number.isInteger(notice) || notice < 0 || notice > 1440) errors.minNoticeMinutes = 'Entre 0 y 1.440 minutos.';

  return result(errors, {
    whatsapp: phone,
    instagram: cleanText(instagram).replace(/^@/, ''),
    street: cleanText(street),
    area: cleanText(area),
    maxDaysAhead: days,
    minNoticeMinutes: notice,
  });
}

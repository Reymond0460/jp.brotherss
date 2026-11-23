/**
 * Mensajes y enlaces de WhatsApp.
 *
 * Hoy el cliente (o el barbero) abre WhatsApp con el mensaje ya escrito (enlace wa.me).
 * Más adelante, esta misma información alimentará la automatización con la API de WhatsApp.
 */
import { formatLongDate } from '../core/dates.js';
import { formatBookingCode } from '../core/booking-code.js';
import { formatCLP } from '../core/format.js';

export const whatsappUrl = (number, text = '') => `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

/** Mensaje que el cliente le envía al barbero para confirmar su reserva. */
export function clientBookingMessage(booking, business) {
  return [
    `Hola ${business.name}! Reservé una hora en la web:`,
    '',
    `• Servicio: ${booking.serviceName} (${formatCLP(booking.price)})`,
    `• Día: ${formatLongDate(booking.date)}`,
    `• Hora: ${booking.time}`,
    `• Nombre: ${booking.clientName}`,
    `• Código: ${formatBookingCode(booking.id)}`,
    '',
    'Quedo atento a la confirmación.',
  ].join('\n');
}

/** Consulta general (botón flotante, promos sin servicio, cambios de hora). */
export function generalMessage(business, topic = '') {
  return topic ? `Hola ${business.name}! ${topic}` : `Hola ${business.name}! Quisiera hacer una consulta.`;
}

/** Mensaje que el barbero le envía al cliente desde el panel. */
export function barberToClientMessage(booking, business) {
  return `Hola ${booking.clientName}! Te escribimos de ${business.name}. Tu hora de ${booking.serviceName} es el ${formatLongDate(booking.date)} a las ${booking.time}. ¡Te esperamos en ${business.street}!`;
}

/**
 * Constantes globales de la aplicación.
 * Cualquier "número mágico" que se use en más de un archivo vive aquí.
 */

/** Duración de cada bloque de la agenda, en minutos. Todas las horas se ofrecen en esta grilla. */
export const SLOT_MINUTES = 30;

/** Claves de localStorage (todas con prefijo para no chocar con otros sitios). */
export const STORAGE_KEYS = {
  cookieConsent: 'jp.cookies.v1',
  lastBookingCode: 'jp.lastBooking.v1',
  demoState: 'jp.demo.state.v1',
  demoSession: 'jp.demo.session.v1',
  theme: 'jp.theme.v1',
};

/** Reserva de ejemplo que existe siempre en el modo demo (para probar "Mi reserva"). */
export const DEMO_BOOKING_ID = 'PRUEBA23';
export const DEMO_PHONE = '56940916058';

/** Enlaces externos fijos. */
export const LINKS = {
  tiforti: 'https://tiforti.cl',
};

/** Nombres de los días de la semana. El índice coincide con Date#getDay() (0 = domingo). */
export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Orden de visualización de la semana (lunes primero). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

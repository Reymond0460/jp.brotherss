/**
 * Mini bus de eventos entre componentes (usa CustomEvent sobre `document`).
 * Permite que, por ejemplo, el botón "Reservar" de una promo le pida al formulario de reserva
 * que se abra con ese servicio, sin que un componente importe al otro.
 *
 * Eventos usados:
 *   jp:book     { serviceId, date?, time? }   → abrir la reserva con esos datos
 *   jp:consent  { external: boolean }         → el visitante cambió sus preferencias de cookies
 */
export const emit = (name, detail = {}) => document.dispatchEvent(new CustomEvent(name, { detail }));

/** @returns {() => void} función para dejar de escuchar */
export function listen(name, handler) {
  const wrapped = (event) => handler(event.detail);
  document.addEventListener(name, wrapped);
  return () => document.removeEventListener(name, wrapped);
}

/**
 * Errores propios de la capa de datos. La interfaz los distingue con `instanceof`
 * para mostrar mensajes claros en vez de errores técnicos.
 */

/** Alguien más tomó la hora mientras el cliente completaba el formulario. */
export class SlotTakenError extends Error {
  constructor() {
    super('Esa hora acaba de ser tomada por otra persona.');
    this.name = 'SlotTakenError';
  }
}

/** El usuario inició sesión pero su cuenta no es de administrador. */
export class NotAdminError extends Error {
  constructor() {
    super('Esta cuenta no tiene permisos de administrador.');
    this.name = 'NotAdminError';
  }
}

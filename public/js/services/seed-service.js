/**
 * Carga los datos iniciales (negocio, horario, servicios y promos de ejemplo) en la base de datos.
 * Se usa desde el panel (Ajustes) la primera vez, con la sesión del administrador:
 * así no hace falta ningún script con credenciales especiales.
 */
import { DEFAULT_BUSINESS, DEFAULT_PROMOS, DEFAULT_SCHEDULE, DEFAULT_SERVICES } from '../config/defaults.js';

/** @param {import('../data/contract.js').Repository} repo */
export async function seedDefaults(repo) {
  await repo.saveBusiness(DEFAULT_BUSINESS);
  await repo.saveSchedule(structuredClone(DEFAULT_SCHEDULE));
  for (const service of DEFAULT_SERVICES) await repo.saveService(service);
  for (const promo of DEFAULT_PROMOS) await repo.savePromo(promo);
}

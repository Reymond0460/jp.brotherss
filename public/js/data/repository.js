/**
 * Punto de entrada único a los datos.
 *
 *   const repo = await getRepository();
 *   const services = await repo.listServices();
 *
 * Elige la implementación según el entorno (ver config/env.js).
 * El módulo de Firebase se carga solo si hace falta, así el modo demo no descarga el SDK.
 */
import { ENV } from '../config/env.js';
import { FIREBASE_CONFIG, isFirebaseConfigured } from '../config/firebase-config.js';

let instance = null;

/** @returns {Promise<import('./contract.js').Repository>} */
export function getRepository() {
  instance ??= createRepository();
  return instance;
}

async function createRepository() {
  if (ENV.backend === 'firebase') {
    if (isFirebaseConfigured()) {
      const { createFirebaseBackend } = await import('./firebase-backend.js');
      return createFirebaseBackend({ config: FIREBASE_CONFIG, namespace: ENV.namespace });
    }
    console.warn('[JP Brothers] Firebase no está configurado: se usan datos locales de demo.');
  }
  const { createLocalBackend } = await import('./local-backend.js');
  return createLocalBackend();
}

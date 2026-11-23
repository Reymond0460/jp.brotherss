/**
 * Resolución del entorno de ejecución.
 *
 * El mismo código se publica en producción y QA. Lo que cambia es el "entorno",
 * que se decide por el dominio desde el que se abre el sitio:
 *
 *   prod  → sitio oficial      → Firestore, datos en  envs/prod/...
 *   qa    → sitio de pruebas   → Firestore, datos en  envs/qa/...
 *   dev   → localhost          → datos locales (demo). Con ?backend=firebase usa los de QA.
 *   demo  → cualquier otro     → datos locales (demo). Es el caso del artefacto de Claude.
 *
 * Cuando el cliente tenga dominio propio, agrégalo en HOSTS.prod.
 */

export const HOSTS = {
  prod: ['jpbrothers-cl.web.app', 'jpbrothers-cl.firebaseapp.com'],
  qa: ['jpbrothers-qa.web.app', 'jpbrothers-qa.firebaseapp.com'],
};

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/**
 * @param {Pick<Location,'hostname'|'search'>} [loc]
 * @returns {{name:'prod'|'qa'|'dev'|'demo', backend:'firebase'|'local', namespace:string, demo:boolean, mapEmbed:boolean}}
 */
export function resolveEnvironment(loc = globalThis.location) {
  const host = loc?.hostname ?? '';
  const params = new URLSearchParams(loc?.search ?? '');

  if (HOSTS.prod.includes(host)) {
    return { name: 'prod', backend: 'firebase', namespace: 'prod', demo: false, mapEmbed: true };
  }
  if (HOSTS.qa.includes(host)) {
    return { name: 'qa', backend: 'firebase', namespace: 'qa', demo: false, mapEmbed: true };
  }

  const isLocal = LOCAL_HOSTS.includes(host);
  if (isLocal && params.get('backend') === 'firebase') {
    return { name: 'dev', backend: 'firebase', namespace: 'qa', demo: false, mapEmbed: true };
  }

  // En el artefacto de Claude no se pueden incrustar mapas de terceros: se muestra la tarjeta con enlaces.
  return { name: isLocal ? 'dev' : 'demo', backend: 'local', namespace: 'local', demo: true, mapEmbed: isLocal };
}

export const ENV = resolveEnvironment();

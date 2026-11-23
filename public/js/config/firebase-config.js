/**
 * Configuración WEB de Firebase.
 *
 * Estos valores son públicos por diseño (identifican el proyecto, no dan acceso).
 * La seguridad real está en `firestore.rules` y en Authentication.
 * Se completan con: firebase apps:sdkconfig web
 */
export const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

export const isFirebaseConfigured = () => Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

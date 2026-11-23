/**
 * Configuración WEB de Firebase.
 *
 * Estos valores son públicos por diseño (identifican el proyecto, no dan acceso).
 * La seguridad real está en `firestore.rules` y en Authentication.
 * Se obtienen con: firebase apps:sdkconfig WEB <appId>
 */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBXAjVqTA0MyRhpUroLX7et_KE_sETa1RE',
  authDomain: 'jp-brotherss.firebaseapp.com',
  projectId: 'jp-brotherss',
  storageBucket: 'jp-brotherss.firebasestorage.app',
  messagingSenderId: '1082944203508',
  appId: '1:1082944203508:web:8d14f476206f235f780ca1',
};

export const isFirebaseConfigured = () => Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

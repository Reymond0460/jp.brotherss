/**
 * Único lugar donde se declara de dónde se descarga el SDK de Firebase y qué funciones se usan.
 *
 * Se carga como módulo ES directo desde el CDN oficial de Google (sin npm ni bundler).
 * Para actualizar la versión: cambiar FIREBASE_VERSION en las tres URLs de abajo
 * (los import estáticos no admiten variables) y revisar `Content-Security-Policy` en firebase.json
 * (el dominio www.gstatic.com ya está permitido).
 */

export { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';

export {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

export {
  initializeAuth,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';

/**
 * Backend FIREBASE: Firestore (datos) + Authentication (sesión del barbero).
 * Cumple el mismo contrato que local-backend.js (ver contract.js).
 *
 * Estructura en Firestore (ver también firestore.rules):
 *
 *   admins/{uid}                      → quién es administrador (se crea con scripts/create-admin.mjs)
 *   envs/{prod|qa}/settings/business  → datos del negocio
 *   envs/{prod|qa}/settings/schedule  → horario semanal y días cerrados
 *   envs/{prod|qa}/services/{id}
 *   envs/{prod|qa}/promos/{id}
 *   envs/{prod|qa}/bookings/{código}  → reservas (el id es el código, no se puede listar sin ser admin)
 *   envs/{prod|qa}/slots/{fecha_hhmm} → bloques ocupados (públicos, sin datos personales)
 *
 * `envs/prod` y `envs/qa` permiten que QA y producción compartan proyecto sin mezclar datos.
 */
import { DEFAULT_BUSINESS, DEFAULT_SCHEDULE } from '../config/defaults.js';
import { newId } from '../core/id.js';
import { parseSlotKey } from '../domain/availability.js';
import { STATUS } from '../domain/booking-status.js';
import { NotAdminError, SlotTakenError } from './errors.js';
import * as fb from './firebase-sdk.js';

/** Convierte Timestamp de Firestore → string ISO, para que la app maneje solo strings. */
const toISO = (value) => (value?.toDate ? value.toDate().toISOString() : value ?? '');

const normalizeBooking = (snap) => {
  const data = snap.data();
  return { ...data, id: snap.id, createdAt: toISO(data.createdAt), updatedAt: toISO(data.updatedAt) };
};

/** Quita las claves con valor undefined (Firestore no las acepta). */
const stripUndefined = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/**
 * @param {{config: object, namespace: 'prod'|'qa'}} options
 * @returns {import('./contract.js').Repository}
 */
export function createFirebaseBackend({ config, namespace }) {
  const app = fb.initializeApp(config);
  const db = fb.getFirestore(app);
  // initializeAuth (en vez de getAuth) evita cargar iframes y scripts de Google que no necesitamos
  // y mantiene la política de seguridad (CSP) estricta.
  const auth = fb.initializeAuth(app, { persistence: fb.browserLocalPersistence });

  const col = (name) => fb.collection(db, 'envs', namespace, name);
  const ref = (name, id) => fb.doc(db, 'envs', namespace, name, id);

  /** Comprueba en Firestore que el usuario autenticado figura como administrador. */
  async function isAdmin(user) {
    const snap = await fb.getDoc(fb.doc(db, 'admins', user.uid));
    return snap.exists();
  }

  /** Libera (borra) los bloques de una reserva dentro de un batch. */
  const releaseInBatch = (batch, slotKeys = []) => slotKeys.forEach((key) => batch.delete(ref('slots', key)));

  async function readBooking(id) {
    const snap = await fb.getDoc(ref('bookings', id));
    if (!snap.exists()) throw new Error('Reserva no encontrada.');
    return normalizeBooking(snap);
  }

  return {
    kind: 'firebase',

    /* ---------- Lectura pública ---------- */

    async getBusiness() {
      const snap = await fb.getDoc(ref('settings', 'business'));
      return { ...DEFAULT_BUSINESS, ...(snap.exists() ? snap.data() : {}) };
    },

    async getSchedule() {
      const snap = await fb.getDoc(ref('settings', 'schedule'));
      return snap.exists() ? { closedDates: [], ...snap.data() } : structuredClone(DEFAULT_SCHEDULE);
    },

    async listServices() {
      const snap = await fb.getDocs(col('services'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    },

    async listPromos() {
      const snap = await fb.getDocs(col('promos'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async listSlots(from, to) {
      const q = fb.query(col('slots'), fb.where('date', '>=', from), fb.where('date', '<=', to));
      const snap = await fb.getDocs(q);
      return snap.docs.map((d) => ({ key: d.id, ...d.data() }));
    },

    async getBooking(id) {
      const snap = await fb.getDoc(ref('bookings', id));
      return snap.exists() ? normalizeBooking(snap) : null;
    },

    /* ---------- Escritura pública ---------- */

    /**
     * Crea la reserva y ocupa sus bloques en UNA sola operación atómica.
     * Si algún bloque ya existe, las reglas de Firestore rechazan todo (permission-denied)
     * y se informa que la hora fue tomada.
     */
    async createBooking(booking) {
      const { id, ...data } = booking;
      const batch = fb.writeBatch(db);
      batch.set(ref('bookings', id), stripUndefined({ ...data, createdAt: fb.serverTimestamp(), updatedAt: fb.serverTimestamp() }));
      for (const key of booking.slotKeys) {
        const { date, time } = parseSlotKey(key);
        batch.set(ref('slots', key), { date, time, kind: 'booking', bookingId: id });
      }
      try {
        await batch.commit();
      } catch (error) {
        if (error.code === 'permission-denied') throw new SlotTakenError();
        throw error;
      }
    },

    async cancelBooking(id) {
      const booking = await readBooking(id);
      const batch = fb.writeBatch(db);
      batch.update(ref('bookings', id), { status: STATUS.CANCELLED, updatedAt: fb.serverTimestamp() });
      releaseInBatch(batch, booking.slotKeys);
      await batch.commit();
      return { ...booking, status: STATUS.CANCELLED };
    },

    /* ---------- Administrador ---------- */

    async listBookings(from, to) {
      const q = fb.query(col('bookings'), fb.where('date', '>=', from), fb.where('date', '<=', to));
      const snap = await fb.getDocs(q);
      return snap.docs.map(normalizeBooking);
    },

    async updateBooking(id, patch) {
      const booking = await readBooking(id);
      const batch = fb.writeBatch(db);
      batch.update(ref('bookings', id), stripUndefined({ ...patch, updatedAt: fb.serverTimestamp() }));
      if (patch.status === STATUS.CANCELLED) releaseInBatch(batch, booking.slotKeys);
      await batch.commit();
      return { ...booking, ...patch };
    },

    async moveBooking(id, { date, time }, newSlotKeys) {
      const booking = await readBooking(id);
      const batch = fb.writeBatch(db);
      releaseInBatch(batch, booking.slotKeys);
      for (const key of newSlotKeys) {
        const slot = parseSlotKey(key);
        batch.set(ref('slots', key), { date: slot.date, time: slot.time, kind: 'booking', bookingId: id });
      }
      batch.update(ref('bookings', id), { date, time, slotKeys: newSlotKeys, updatedAt: fb.serverTimestamp() });
      await batch.commit();
      return { ...booking, date, time, slotKeys: newSlotKeys };
    },

    async blockSlots(keys) {
      const batch = fb.writeBatch(db);
      for (const key of keys) {
        const { date, time } = parseSlotKey(key);
        batch.set(ref('slots', key), { date, time, kind: 'block' });
      }
      await batch.commit();
    },

    async unblockSlots(keys) {
      const batch = fb.writeBatch(db);
      keys.forEach((key) => batch.delete(ref('slots', key)));
      await batch.commit();
    },

    async saveBusiness(patch) {
      await fb.setDoc(ref('settings', 'business'), stripUndefined(patch), { merge: true });
      return this.getBusiness();
    },

    async saveSchedule(schedule) {
      await fb.setDoc(ref('settings', 'schedule'), schedule);
      return schedule;
    },

    async saveService(service) {
      const id = service.id || newId(service.name);
      const { id: _omit, ...data } = service;
      // merge: true permite cambiar solo algunos campos (ej. activar/desactivar) sin pisar el resto.
      await fb.setDoc(ref('services', id), stripUndefined(data), { merge: true });
      return id;
    },

    async deleteService(id) {
      await fb.deleteDoc(ref('services', id));
    },

    async savePromo(promo) {
      const id = promo.id || newId(promo.title);
      const { id: _omit, ...data } = promo;
      await fb.setDoc(ref('promos', id), stripUndefined(data), { merge: true });
      return id;
    },

    async deletePromo(id) {
      await fb.deleteDoc(ref('promos', id));
    },

    /* ---------- Sesión ---------- */

    async signIn(email, password) {
      const { user } = await fb.signInWithEmailAndPassword(auth, email, password);
      if (!(await isAdmin(user))) {
        await fb.signOut(auth);
        throw new NotAdminError();
      }
      return { email: user.email };
    },

    signOut: () => fb.signOut(auth),

    onAuthChange(callback) {
      return fb.onAuthStateChanged(auth, async (user) => {
        if (!user) return callback(null);
        try {
          callback((await isAdmin(user)) ? { email: user.email } : null);
        } catch {
          callback(null);
        }
      });
    },

    async changePassword(current, next) {
      const user = auth.currentUser;
      const credential = fb.EmailAuthProvider.credential(user.email, current);
      await fb.reauthenticateWithCredential(user, credential);
      await fb.updatePassword(user, next);
    },
  };
}

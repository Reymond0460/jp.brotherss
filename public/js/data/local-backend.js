/**
 * Backend LOCAL (demo): guarda todo en localStorage del navegador.
 * Cumple el mismo contrato que firebase-backend.js (ver contract.js).
 *
 * Sirve para: desarrollar sin internet, probar el flujo completo y el artefacto de Claude.
 * No es seguro ni compartido entre dispositivos: NUNCA se usa en QA ni producción.
 *
 * Sesión demo: acepta cualquier correo y contraseña (no hay secretos en el código).
 */
import { STORAGE_KEYS } from '../config/constants.js';
import { monthOf, todayISO } from '../core/dates.js';
import { newId } from '../core/id.js';
import { safeStorage } from '../core/safe-storage.js';
import { parseSlotKey } from '../domain/availability.js';
import { STATUS } from '../domain/booking-status.js';
import { SlotTakenError } from './errors.js';
import { buildSeedState } from './local-seed.js';

const clone = (value) => structuredClone(value);
const nowISO = () => new Date().toISOString();

/** Carga el estado guardado; si no existe (o es de otro mes) genera datos de ejemplo nuevos. */
function loadState() {
  const saved = safeStorage.get(STORAGE_KEYS.demoState);
  if (saved && saved.seedMonth === monthOf(todayISO()) && saved.gallery) return saved;
  const fresh = buildSeedState();
  safeStorage.set(STORAGE_KEYS.demoState, fresh);
  return fresh;
}

export function createLocalBackend() {
  let state = loadState();
  const listeners = new Set();

  const persist = () => safeStorage.set(STORAGE_KEYS.demoState, state);
  const session = () => safeStorage.get(STORAGE_KEYS.demoSession);
  const notifyAuth = () => listeners.forEach((cb) => cb(session()));

  function releaseSlots(booking) {
    for (const key of booking.slotKeys ?? []) delete state.slots[key];
  }

  function occupySlots(keys, extra) {
    for (const key of keys) {
      const { date, time } = parseSlotKey(key);
      state.slots[key] = { key, date, time, ...extra };
    }
  }

  const requireBooking = (id) => {
    const booking = state.bookings[id];
    if (!booking) throw new Error('Reserva no encontrada.');
    return booking;
  };

  return {
    kind: 'local',

    /** Solo demo: vuelve a los datos de ejemplo. */
    async resetDemo() {
      state = buildSeedState();
      persist();
    },

    /* ---------- Lectura pública ---------- */

    getBusiness: async () => clone(state.business),
    getSchedule: async () => clone(state.schedule),
    listServices: async () => clone(state.services).sort((a, b) => a.order - b.order),
    listPromos: async () => clone(state.promos),
    listGallery: async () => clone(state.gallery).sort((a, b) => (a.order ?? 99) - (b.order ?? 99)),

    async listSlots(from, to) {
      return clone(Object.values(state.slots).filter((s) => s.date >= from && s.date <= to));
    },

    async getBooking(id) {
      return state.bookings[id] ? clone(state.bookings[id]) : null;
    },

    /* ---------- Escritura pública ---------- */

    async createBooking(booking) {
      // Igual que en Firestore: si cualquier bloque ya existe, no se crea nada.
      if (booking.slotKeys.some((key) => state.slots[key])) throw new SlotTakenError();
      const stamp = nowISO();
      state.bookings[booking.id] = { ...clone(booking), createdAt: stamp, updatedAt: stamp };
      occupySlots(booking.slotKeys, { kind: 'booking', bookingId: booking.id });
      persist();
    },

    async cancelBooking(id) {
      const booking = requireBooking(id);
      booking.status = STATUS.CANCELLED;
      booking.updatedAt = nowISO();
      releaseSlots(booking);
      persist();
      return clone(booking);
    },

    /* ---------- Administrador ---------- */

    async listBookings(from, to) {
      return clone(Object.values(state.bookings).filter((b) => b.date >= from && b.date <= to));
    },

    async updateBooking(id, patch) {
      const booking = requireBooking(id);
      Object.assign(booking, clone(patch), { updatedAt: nowISO() });
      if (patch.status === STATUS.CANCELLED) releaseSlots(booking);
      persist();
      return clone(booking);
    },

    async moveBooking(id, { date, time }, newSlotKeys) {
      const booking = requireBooking(id);
      releaseSlots(booking);
      Object.assign(booking, { date, time, slotKeys: newSlotKeys, updatedAt: nowISO() });
      occupySlots(newSlotKeys, { kind: 'booking', bookingId: id });
      persist();
      return clone(booking);
    },

    async blockSlots(keys) {
      occupySlots(keys, { kind: 'block' });
      persist();
    },

    async unblockSlots(keys) {
      for (const key of keys) if (state.slots[key]?.kind === 'block') delete state.slots[key];
      persist();
    },

    async saveBusiness(patch) {
      state.business = { ...state.business, ...clone(patch) };
      persist();
      return clone(state.business);
    },

    async saveSchedule(schedule) {
      state.schedule = clone(schedule);
      persist();
      return clone(state.schedule);
    },

    async saveService(service) {
      const id = service.id || newId(service.name);
      const index = state.services.findIndex((s) => s.id === id);
      const next = { active: true, order: state.services.length + 1, ...(index >= 0 ? state.services[index] : {}), ...clone(service), id };
      if (index >= 0) state.services[index] = next;
      else state.services.push(next);
      persist();
      return id;
    },

    async deleteService(id) {
      state.services = state.services.filter((s) => s.id !== id);
      persist();
    },

    async savePromo(promo) {
      const id = promo.id || newId(promo.title);
      const index = state.promos.findIndex((p) => p.id === id);
      const next = { active: true, ...(index >= 0 ? state.promos[index] : {}), ...clone(promo), id };
      if (index >= 0) state.promos[index] = next;
      else state.promos.push(next);
      persist();
      return id;
    },

    async deletePromo(id) {
      state.promos = state.promos.filter((p) => p.id !== id);
      persist();
    },

    async saveGalleryItem(item) {
      const id = item.id || newId('foto');
      const index = state.gallery.findIndex((g) => g.id === id);
      const next = { active: true, ...(index >= 0 ? state.gallery[index] : {}), ...clone(item), id };
      if (index >= 0) state.gallery[index] = next;
      else state.gallery.push(next);
      persist();
      return id;
    },

    async deleteGalleryItem(id) {
      state.gallery = state.gallery.filter((g) => g.id !== id);
      persist();
    },

    /* ---------- Sesión ---------- */

    async signIn(email, password) {
      if (!email || !password) throw Object.assign(new Error('Faltan datos'), { code: 'auth/invalid-credential' });
      safeStorage.set(STORAGE_KEYS.demoSession, { email });
      notifyAuth();
      return { email };
    },

    async signOut() {
      safeStorage.remove(STORAGE_KEYS.demoSession);
      notifyAuth();
    },

    onAuthChange(callback) {
      listeners.add(callback);
      queueMicrotask(() => callback(session()));
      return () => listeners.delete(callback);
    },

    async changePassword() {
      /* En demo no hay contraseña real que cambiar. */
    },
  };
}

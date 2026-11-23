/**
 * Acceso seguro a localStorage.
 *
 * localStorage puede lanzar errores (modo privado, datos bloqueados, vista previa).
 * Este módulo nunca lanza: si falla, guarda en memoria durante la sesión.
 * Los valores se guardan como JSON.
 */

const memory = new Map();

export const safeStorage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw);
    } catch {
      /* se usa la memoria */
    }
    return memory.has(key) ? memory.get(key) : fallback;
  },

  set(key, value) {
    memory.set(key, value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* queda solo en memoria */
    }
  },

  remove(key) {
    memory.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {
      /* nada que hacer */
    }
  },
};

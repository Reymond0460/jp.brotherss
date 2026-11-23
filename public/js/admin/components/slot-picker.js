/**
 * Selector de hora para el panel: muestra las horas de un día para un servicio.
 * A diferencia del sitio público, el barbero puede elegir horas pasadas o con poca anticipación
 * (por ejemplo para registrar un corte que ya hizo).
 */
import { el, replaceContent } from '../../core/dom.js';
import { getDaySlots } from '../../services/booking-service.js';

/**
 * @param {{ctx: object, onChange?: (time: string|null) => void}} options
 */
export function createSlotPicker({ ctx, onChange }) {
  const root = el('div', { class: 'slot-picker', 'aria-live': 'polite' });
  const state = { service: null, date: '', ignoreBooking: null, time: null, slots: [], loading: false };

  /** El barbero no tiene "anticipación mínima": se la quitamos al catálogo para su cálculo. */
  const adminCatalog = () => ({ ...ctx.catalog, business: { ...ctx.catalog.business, minNoticeMinutes: 0 } });

  function paint() {
    if (!state.service || !state.date) return replaceContent(root, el('p', { class: 'muted' }, 'Elige un servicio y un día para ver las horas.'));
    if (state.loading) return replaceContent(root, el('p', { class: 'muted' }, 'Buscando horas…'));
    if (!state.slots.length) return replaceContent(root, el('p', { class: 'notice' }, 'Ese día no hay atención (revisa Horarios).'));

    replaceContent(
      root,
      el(
        'div',
        { class: 'slot-grid' },
        state.slots.map((slot) =>
          el(
            'button',
            {
              type: 'button',
              class: `slot${state.time === slot.time ? ' is-selected' : ''}${slot.status === 'busy' ? ' is-busy' : ''}`,
              disabled: slot.status === 'busy',
              'aria-pressed': String(state.time === slot.time),
              onclick: () => select(slot.time),
            },
            slot.time,
          ),
        ),
      ),
    );
  }

  function select(time) {
    state.time = time;
    paint();
    onChange?.(time);
  }

  return {
    el: root,
    get time() {
      return state.time;
    },
    /** Cambia el servicio/día y recalcula las horas. */
    async update({ service = state.service, date = state.date, ignoreBooking = state.ignoreBooking }) {
      Object.assign(state, { service, date, ignoreBooking, time: null, loading: true });
      onChange?.(null);
      paint();
      try {
        state.slots = date && service ? await getDaySlots({ repo: ctx.repo, catalog: adminCatalog(), service, date, ignoreBooking, now: new Date(0) }) : [];
      } catch (error) {
        console.error(error);
        state.slots = [];
      }
      state.loading = false;
      paint();
    },
  };
}

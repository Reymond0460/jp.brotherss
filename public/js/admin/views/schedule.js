/**
 * HORARIOS: días y horas en que trabaja el barbero.
 *   1. Horario semanal (apertura, cierre y pausa de cada día)
 *   2. Días cerrados (vacaciones, feriados)
 *   3. Bloqueo de horas sueltas de un día
 */
import { WEEK_ORDER, WEEKDAYS } from '../../config/constants.js';
import { el, replaceContent } from '../../core/dom.js';
import { formatLongDate, todayISO, capitalize } from '../../core/dates.js';
import { getDayHours, gridTimes, slotKey } from '../../domain/availability.js';
import { validateWeekly } from '../../domain/validators.js';
import { icon } from '../../ui/icons.js';
import { field, input, switchControl } from '../../ui/form.js';
import { toast } from '../../ui/toast.js';
import { pageHeader } from '../components/page-header.js';

export async function renderSchedule(host, ctx) {
  replaceContent(
    host,
    pageHeader('Horarios', 'Define cuándo atiendes. Los clientes solo podrán reservar dentro de estos horarios.'),
    el('div', { class: 'stack stack--lg' }, weeklySection(ctx), closedDatesSection(ctx), blockSection(ctx)),
  );
}

/* ---------- 1. Horario semanal ---------- */
function weeklySection(ctx) {
  const weekly = structuredClone(ctx.catalog.schedule.weekly);
  const errorBox = el('p', { class: 'field__error', role: 'alert' });

  const rows = WEEK_ORDER.map((day) => {
    const h = weekly[day] ?? { open: false, start: '10:00', end: '20:00', breakStart: '', breakEnd: '' };
    weekly[day] = h;
    const time = (key, label) => input({ type: 'time', 'aria-label': `${label} del ${WEEKDAYS[day]}`, value: h[key] ?? '', step: 900, oninput: (e) => (h[key] = e.target.value) });
    const fields = el('div', { class: 'week-row__times' }, time('start', 'Apertura'), time('end', 'Cierre'), time('breakStart', 'Inicio de pausa'), time('breakEnd', 'Fin de pausa'));
    const toggle = switchControl({
      id: `open-${day}`,
      label: WEEKDAYS[day],
      checked: h.open,
      onchange: (e) => {
        h.open = e.target.checked;
        fields.classList.toggle('is-off', !h.open);
      },
    });
    fields.classList.toggle('is-off', !h.open);
    return el('div', { class: 'week-row' }, toggle, fields);
  });

  const save = el('button', { class: 'btn btn--primary', type: 'button' }, 'Guardar horario');
  save.addEventListener('click', async () => {
    const check = validateWeekly(weekly);
    if (!check.ok) {
      errorBox.textContent = Object.entries(check.errors).map(([d, msg]) => `${WEEKDAYS[d]}: ${msg}`).join(' ');
      return;
    }
    errorBox.textContent = '';
    save.disabled = true;
    try {
      await ctx.repo.saveSchedule({ ...ctx.catalog.schedule, weekly });
      await ctx.refresh();
      toast('Horario guardado');
    } catch (error) {
      console.error(error);
      toast('No se pudo guardar el horario.', 'error');
    }
    save.disabled = false;
  });

  return el(
    'section',
    { class: 'panel stack' },
    el('h2', { class: 'h3' }, 'Horario semanal'),
    el('p', { class: 'muted' }, 'Activa los días que atiendes. La pausa es opcional (déjala vacía si no la tienes).'),
    el('div', { class: 'week' }, el('div', { class: 'week-head', 'aria-hidden': 'true' }, el('span', {}, 'Día'), el('div', { class: 'week-row__times' }, el('span', {}, 'Abre'), el('span', {}, 'Cierra'), el('span', {}, 'Pausa desde'), el('span', {}, 'Hasta'))), rows),
    errorBox,
    el('div', { class: 'row' }, save),
  );
}

/* ---------- 2. Días cerrados ---------- */
function closedDatesSection(ctx) {
  const listHost = el('div');
  const dateInput = input({ id: 'cd-date', type: 'date', min: todayISO() });
  const labelInput = input({ id: 'cd-label', maxlength: 40, placeholder: 'Ej.: Vacaciones, feriado' });

  async function persist(closedDates, message) {
    try {
      await ctx.repo.saveSchedule({ ...ctx.catalog.schedule, closedDates });
      await ctx.refresh();
      toast(message);
      paint();
    } catch (error) {
      console.error(error);
      toast('No se pudo guardar.', 'error');
    }
  }

  function paint() {
    const dates = [...(ctx.catalog.schedule.closedDates ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    replaceContent(
      listHost,
      dates.length
        ? el(
            'ul',
            { class: 'closed-list' },
            dates.map((c) =>
              el(
                'li',
                { class: 'closed-item' },
                el('span', {}, el('strong', {}, capitalize(formatLongDate(c.date))), c.label ? ` · ${c.label}` : ''),
                el('button', { class: 'icon-btn icon-btn--danger', type: 'button', 'aria-label': `Quitar ${c.date}`, onclick: () => persist(dates.filter((x) => x.date !== c.date), 'Día reabierto') }, icon('x', { size: 18 })),
              ),
            ),
          )
        : el('p', { class: 'muted' }, 'No hay días cerrados.'),
    );
  }
  paint();

  const add = el('button', { class: 'btn btn--soft', type: 'button' }, icon('plus', { size: 16 }), 'Cerrar este día');
  add.addEventListener('click', () => {
    if (!dateInput.value) return toast('Elige una fecha.', 'error');
    const current = ctx.catalog.schedule.closedDates ?? [];
    if (current.some((c) => c.date === dateInput.value)) return toast('Ese día ya está cerrado.', 'info');
    persist([...current, { date: dateInput.value, label: labelInput.value.trim() }], 'Día cerrado');
    dateInput.value = '';
    labelInput.value = '';
  });

  return el(
    'section',
    { class: 'panel stack' },
    el('h2', { class: 'h3' }, 'Días sin atención'),
    el('p', { class: 'muted' }, 'Vacaciones, feriados o cualquier día en que no abrirás. Los clientes no podrán reservar esos días.'),
    el('div', { class: 'form-grid form-grid--end' }, field('cd-date', 'Fecha', dateInput), field('cd-label', 'Motivo (opcional)', labelInput), el('div', { class: 'field' }, add)),
    listHost,
  );
}

/* ---------- 3. Bloquear horas sueltas ---------- */
function blockSection(ctx) {
  const state = { date: todayISO() };
  const gridHost = el('div');
  const dateInput = input({ id: 'bl-date', type: 'date', value: state.date, onchange: (e) => e.target.value && ((state.date = e.target.value), paint()) });

  async function paint() {
    const hours = getDayHours(ctx.catalog.schedule, state.date);
    if (!hours) return replaceContent(gridHost, el('p', { class: 'muted' }, 'Ese día no hay atención.'));

    const slots = await ctx.repo.listSlots(state.date, state.date);
    const byTime = new Map(slots.map((s) => [s.time, s]));

    replaceContent(
      gridHost,
      el(
        'div',
        { class: 'slot-grid' },
        gridTimes(hours).map((time) => {
          const slot = byTime.get(time);
          const blocked = slot?.kind === 'block';
          const booked = slot?.kind === 'booking';
          return el(
            'button',
            {
              type: 'button',
              class: `slot${blocked ? ' is-blocked' : ''}${booked ? ' is-busy' : ''}`,
              disabled: booked,
              title: booked ? 'Ocupada por una reserva' : blocked ? 'Bloqueada: toca para liberar' : 'Libre: toca para bloquear',
              'aria-pressed': String(blocked),
              onclick: async () => {
                try {
                  if (blocked) await ctx.repo.unblockSlots([slotKey(state.date, time)]);
                  else await ctx.repo.blockSlots([slotKey(state.date, time)]);
                  paint();
                } catch (error) {
                  console.error(error);
                  toast('No se pudo cambiar el bloqueo.', 'error');
                }
              },
            },
            blocked ? el('span', { class: 'slot__lock' }, icon('lock', { size: 12 }), time) : time,
          );
        }),
      ),
    );
  }
  paint();

  return el(
    'section',
    { class: 'panel stack' },
    el('h2', { class: 'h3' }, 'Bloquear horas'),
    el('p', { class: 'muted' }, 'Toca una hora para bloquearla (por ejemplo, un trámite) o para liberarla. Las horas con reserva no se pueden bloquear.'),
    el('div', { class: 'form-grid' }, field('bl-date', 'Día', dateInput)),
    gridHost,
  );
}

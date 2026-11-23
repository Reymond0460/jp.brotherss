/**
 * AJUSTES: datos del negocio (WhatsApp, dirección, reglas de reserva) y cuenta del administrador.
 */
import { ENV } from '../../config/env.js';
import { el, replaceContent } from '../../core/dom.js';
import { formatPhone } from '../../core/format.js';
import { validateBusiness } from '../../domain/validators.js';
import { seedDefaults } from '../../services/seed-service.js';
import { confirmDialog } from '../../ui/dialog.js';
import { field, input, showFieldErrors } from '../../ui/form.js';
import { refreshThemeToggles } from '../../ui/theme.js';
import { toast } from '../../ui/toast.js';
import { pageHeader } from '../components/page-header.js';

export async function renderSettings(host, ctx) {
  const b = ctx.catalog.business;

  /* ----- Datos del negocio ----- */
  const submit = el('button', { class: 'btn btn--primary', type: 'submit' }, 'Guardar cambios');
  const businessForm = el(
    'form',
    { class: 'stack', novalidate: true },
    el('div', { class: 'form-grid' }, field('bz-whatsapp', 'WhatsApp del negocio', input({ id: 'bz-whatsapp', name: 'whatsapp', type: 'tel', inputmode: 'tel', value: formatPhone(b.whatsapp) }), { hint: 'A este número llegan los mensajes de las reservas.' }), field('bz-instagram', 'Instagram', input({ id: 'bz-instagram', name: 'instagram', value: b.instagram, placeholder: 'usuario sin @' }))),
    el('div', { class: 'form-grid' }, field('bz-street', 'Dirección', input({ id: 'bz-street', name: 'street', value: b.street })), field('bz-area', 'Comuna y ciudad', input({ id: 'bz-area', name: 'area', value: b.area, placeholder: 'Ej.: El Bosque, Santiago' }), { hint: 'Ayuda a que el mapa encuentre el lugar exacto.' })),
    el('div', { class: 'form-grid' }, field('bz-days', 'Reservas hasta (días hacia adelante)', input({ id: 'bz-days', name: 'maxDaysAhead', type: 'number', min: 1, max: 90, value: b.maxDaysAhead })), field('bz-notice', 'Anticipación mínima (minutos)', input({ id: 'bz-notice', name: 'minNoticeMinutes', type: 'number', min: 0, max: 1440, step: 15, value: b.minNoticeMinutes }), { hint: 'Para reservas del mismo día. 60 = no se puede reservar con menos de 1 hora.' })),
    el('div', { class: 'row' }, submit),
  );

  businessForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const f = businessForm.elements;
    const result = validateBusiness({ whatsapp: f.whatsapp.value, instagram: f.instagram.value, street: f.street.value, area: f.area.value, maxDaysAhead: f.maxDaysAhead.value, minNoticeMinutes: f.minNoticeMinutes.value });
    if (!result.ok) return showFieldErrors(businessForm, result.errors);
    submit.disabled = true;
    try {
      await ctx.repo.saveBusiness(result.values);
      await ctx.refresh();
      toast('Datos guardados');
    } catch (error) {
      console.error(error);
      toast('No se pudieron guardar los datos.', 'error');
    }
    submit.disabled = false;
  });

  /* ----- Cambio de contraseña ----- */
  const passwordMessage = el('p', { class: 'field__error', role: 'alert' });
  const passSubmit = el('button', { class: 'btn btn--soft', type: 'submit' }, 'Cambiar contraseña');
  const passwordForm = el(
    'form',
    { class: 'stack', novalidate: true },
    el('input', { type: 'text', name: 'username', value: ctx.user.email, autocomplete: 'username', hidden: true, readOnly: true }),
    el('div', { class: 'form-grid' }, field('pw-current', 'Contraseña actual', input({ id: 'pw-current', name: 'current', type: 'password', autocomplete: 'current-password' })), field('pw-next', 'Contraseña nueva', input({ id: 'pw-next', name: 'next', type: 'password', autocomplete: 'new-password', minlength: 8 }), { hint: 'Mínimo 8 caracteres.' })),
    passwordMessage,
    el('div', { class: 'row' }, passSubmit),
  );
  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    passwordMessage.textContent = '';
    const { current, next } = passwordForm.elements;
    if (next.value.length < 8) {
      passwordMessage.textContent = 'La contraseña nueva debe tener al menos 8 caracteres.';
      return;
    }
    passSubmit.disabled = true;
    try {
      await ctx.repo.changePassword(current.value, next.value);
      passwordForm.reset();
      toast('Contraseña actualizada');
    } catch (error) {
      passwordMessage.textContent = ['auth/invalid-credential', 'auth/wrong-password'].includes(error?.code) ? 'La contraseña actual no es correcta.' : 'No se pudo cambiar la contraseña. Cierra sesión, vuelve a entrar e inténtalo otra vez.';
    }
    passSubmit.disabled = false;
  });

  /* ----- Solo demo: restablecer datos ----- */
  const demoBox = ctx.repo.resetDemo
    ? el(
        'section',
        { class: 'panel stack' },
        el('h2', { class: 'h3' }, 'Datos de demostración'),
        el('p', { class: 'muted' }, 'Estás en modo demo: todo se guarda solo en este navegador. Puedes volver a los datos de ejemplo cuando quieras.'),
        el(
          'div',
          { class: 'row' },
          el(
            'button',
            {
              class: 'btn btn--ghost',
              type: 'button',
              onclick: async () => {
                if (!(await confirmDialog({ title: '¿Restablecer la demo?', message: 'Se borrarán los cambios que hiciste y volverán los datos de ejemplo.', confirmLabel: 'Restablecer', danger: true }))) return;
                await ctx.repo.resetDemo();
                location.reload();
              },
            },
            'Restablecer datos de ejemplo',
          ),
        ),
      )
    : null;

  /* ----- Primera vez: cargar servicios y horarios de ejemplo ----- */
  const seedBox = ctx.catalog.services.length
    ? null
    : el(
        'section',
        { class: 'panel stack' },
        el('h2', { class: 'h3' }, 'Datos iniciales'),
        el('p', { class: 'muted' }, 'Aún no hay servicios. Carga los de ejemplo (servicios, promos y horario) y luego edítalos a tu gusto.'),
        el(
          'div',
          { class: 'row' },
          el(
            'button',
            {
              class: 'btn btn--primary',
              type: 'button',
              onclick: async (event) => {
                event.currentTarget.disabled = true;
                try {
                  await seedDefaults(ctx.repo);
                  await ctx.refresh();
                  toast('Datos iniciales cargados');
                  renderSettings(host, ctx);
                } catch (error) {
                  console.error(error);
                  toast('No se pudieron cargar los datos iniciales.', 'error');
                  event.currentTarget.disabled = false;
                }
              },
            },
            'Cargar datos de ejemplo',
          ),
        ),
      );

  replaceContent(
    host,
    pageHeader('Ajustes', `Entorno: ${ENV.name}`),
    el(
      'div',
      { class: 'stack stack--lg' },
      seedBox,
      el('section', { class: 'panel stack' }, el('h2', { class: 'h3' }, 'Datos del negocio'), businessForm),
      el('section', { class: 'panel stack' }, el('h2', { class: 'h3' }, 'Mi cuenta'), el('p', { class: 'muted' }, `Sesión iniciada como ${ctx.user.email}`), passwordForm),
      el('section', { class: 'panel stack' }, el('h2', { class: 'h3' }, 'Apariencia'), el('p', { class: 'muted' }, 'Elige el modo claro u oscuro del panel y del sitio en este dispositivo.'), el('div', { class: 'row' }, el('button', { class: 'btn btn--ghost', type: 'button', 'data-theme-toggle': '' }))),
      demoBox,
    ),
  );
  refreshThemeToggles();
}

/**
 * PROMOS: ofertas que se muestran a los clientes en el sitio.
 * Una promo puede estar ligada a un servicio con precio especial (se aplica sola al reservar)
 * o ser solo informativa (los clientes consultan por WhatsApp).
 */
import { el, replaceContent } from '../../core/dom.js';
import { formatLongDate, todayISO } from '../../core/dates.js';
import { formatCLP } from '../../core/format.js';
import { isPromoActive } from '../../domain/pricing.js';
import { validatePromo } from '../../domain/validators.js';
import { confirmDialog, openModal } from '../../ui/dialog.js';
import { field, input, select, showFieldErrors, switchControl } from '../../ui/form.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { pageHeader } from '../components/page-header.js';

export async function renderPromos(host, ctx) {
  const serviceName = (id) => ctx.catalog.services.find((s) => s.id === id)?.name;

  function paint() {
    const promos = ctx.catalog.promos;
    replaceContent(
      host,
      pageHeader('Promos y ofertas', 'Lo que ves aquí aparece en el sitio mientras esté activo y vigente.', el('button', { class: 'btn btn--primary', type: 'button', onclick: () => openEditor() }, icon('plus', { size: 18 }), 'Nueva promo')),
      promos.length ? el('ul', { class: 'item-list' }, promos.map(buildRow)) : el('p', { class: 'empty' }, 'No hay promos. Crea una para mostrarla a tus clientes.'),
    );
  }

  const reload = async (message) => {
    await ctx.refresh();
    if (message) toast(message);
    paint();
  };

  function buildRow(promo) {
    const live = isPromoActive(promo, todayISO());
    const detail = [promo.serviceId ? serviceName(promo.serviceId) ?? 'Servicio eliminado' : 'Solo informativa', promo.promoPrice != null ? formatCLP(promo.promoPrice) : null, promo.validUntil ? `hasta ${formatLongDate(promo.validUntil)}` : 'sin fecha de término'].filter(Boolean).join(' · ');
    return el(
      'li',
      { class: `item${promo.active === false ? ' is-off' : ''}` },
      el(
        'div',
        { class: 'item__main' },
        el('strong', {}, promo.title, promo.badge ? el('span', { class: 'pill pill--pending' }, promo.badge) : null),
        el('span', { class: 'muted' }, promo.description || 'Sin descripción'),
        el('span', { class: 'muted' }, detail),
      ),
      el('span', { class: `pill ${live ? 'pill--done' : ''}` }, live ? 'Visible en el sitio' : 'No visible'),
      switchControl({
        id: `promo-${promo.id}`,
        label: promo.active === false ? 'Pausada' : 'Activa',
        checked: promo.active !== false,
        onchange: async (e) => {
          try {
            await ctx.repo.savePromo({ id: promo.id, active: e.target.checked });
            await reload();
          } catch (error) {
            console.error(error);
            toast('No se pudo actualizar.', 'error');
          }
        },
      }),
      el(
        'div',
        { class: 'row' },
        el('button', { class: 'icon-btn', type: 'button', title: 'Editar', 'aria-label': `Editar ${promo.title}`, onclick: () => openEditor(promo) }, icon('edit', { size: 18 })),
        el(
          'button',
          {
            class: 'icon-btn icon-btn--danger',
            type: 'button',
            title: 'Eliminar',
            'aria-label': `Eliminar ${promo.title}`,
            onclick: async () => {
              if (!(await confirmDialog({ title: '¿Eliminar promo?', message: `"${promo.title}" se quitará del sitio.`, confirmLabel: 'Eliminar', danger: true }))) return;
              try {
                await ctx.repo.deletePromo(promo.id);
                await reload('Promo eliminada');
              } catch (error) {
                console.error(error);
                toast('No se pudo eliminar.', 'error');
              }
            },
          },
          icon('trash', { size: 18 }),
        ),
      ),
    );
  }

  function openEditor(promo = null) {
    const serviceOptions = [{ value: '', label: 'Sin servicio (solo informativa)' }, ...ctx.catalog.services.map((s) => ({ value: s.id, label: `${s.name} · ${formatCLP(s.price)}` }))];
    const submit = el('button', { class: 'btn btn--primary', type: 'submit' }, promo ? 'Guardar cambios' : 'Crear promo');
    const form = el(
      'form',
      { class: 'stack', novalidate: true },
      field('pr-title', 'Título', input({ id: 'pr-title', name: 'title', maxlength: 50, value: promo?.title ?? '', placeholder: 'Ej.: Combo Brothers' })),
      field('pr-description', 'Descripción', input({ id: 'pr-description', name: 'description', maxlength: 160, value: promo?.description ?? '', placeholder: 'Qué incluye y cualquier condición' })),
      el(
        'div',
        { class: 'form-grid' },
        field('pr-badge', 'Etiqueta destacada', input({ id: 'pr-badge', name: 'badge', maxlength: 16, value: promo?.badge ?? '', placeholder: 'Ej.: -$2.000' })),
        field('pr-until', 'Vigente hasta (opcional)', input({ id: 'pr-until', name: 'validUntil', type: 'date', min: todayISO(), value: promo?.validUntil ?? '' })),
      ),
      el(
        'div',
        { class: 'form-grid' },
        field('pr-service', 'Servicio', select({ id: 'pr-service', name: 'serviceId', options: serviceOptions, value: promo?.serviceId ?? '' })),
        field('pr-price', 'Precio con la promo (CLP)', input({ id: 'pr-price', name: 'promoPrice', type: 'number', min: 0, step: 500, inputmode: 'numeric', value: promo?.promoPrice ?? '' }), { hint: 'Se aplica automáticamente cuando el cliente reserva ese servicio.' }),
      ),
      el('div', { class: 'dialog__actions' }, submit),
    );
    const { close } = openModal({ title: promo ? 'Editar promo' : 'Nueva promo', body: form, wide: true });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const f = form.elements;
      const result = validatePromo({ title: f.title.value, description: f.description.value, badge: f.badge.value, serviceId: f.serviceId.value, promoPrice: f.promoPrice.value, validUntil: f.validUntil.value });
      if (!result.ok) return showFieldErrors(form, result.errors);
      submit.disabled = true;
      try {
        await ctx.repo.savePromo({ ...(promo ?? { active: true }), ...result.values, id: promo?.id });
        close();
        await reload(promo ? 'Promo actualizada' : 'Promo creada');
      } catch (error) {
        console.error(error);
        toast('No se pudo guardar la promo.', 'error');
        submit.disabled = false;
      }
    });
  }

  paint();
}

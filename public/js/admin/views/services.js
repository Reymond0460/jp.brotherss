/**
 * SERVICIOS: crear, editar, activar/desactivar y eliminar los servicios y sus precios.
 */
import { el, replaceContent } from '../../core/dom.js';
import { formatCLP, formatDuration } from '../../core/format.js';
import { validateService } from '../../domain/validators.js';
import { confirmDialog, openModal } from '../../ui/dialog.js';
import { field, input, showFieldErrors, switchControl } from '../../ui/form.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { pageHeader } from '../components/page-header.js';

export async function renderServices(host, ctx) {
  function paint() {
    const services = [...ctx.catalog.services].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    replaceContent(
      host,
      pageHeader('Servicios', 'Lo que ofreces y cuánto cuesta. Los cambios se ven al instante en el sitio.', el('button', { class: 'btn btn--primary', type: 'button', onclick: () => openEditor() }, icon('plus', { size: 18 }), 'Nuevo servicio')),
      services.length
        ? el('ul', { class: 'item-list' }, services.map(buildRow))
        : el('p', { class: 'empty' }, 'Aún no tienes servicios. Crea el primero para que los clientes puedan reservar.'),
    );
  }

  const reload = async (message) => {
    await ctx.refresh();
    if (message) toast(message);
    paint();
  };

  function buildRow(service) {
    const active = service.active !== false;
    return el(
      'li',
      { class: `item${active ? '' : ' is-off'}` },
      el('div', { class: 'item__main' }, el('strong', {}, service.name), el('span', { class: 'muted' }, `${formatDuration(service.durationMin)} · ${service.description || 'Sin descripción'}`)),
      el('span', { class: 'item__price num' }, formatCLP(service.price)),
      switchControl({
        id: `svc-${service.id}`,
        label: active ? 'Visible' : 'Oculto',
        checked: active,
        onchange: async (e) => {
          try {
            await ctx.repo.saveService({ id: service.id, active: e.target.checked });
            await reload(e.target.checked ? 'Servicio visible' : 'Servicio oculto');
          } catch (error) {
            console.error(error);
            toast('No se pudo actualizar.', 'error');
          }
        },
      }),
      el(
        'div',
        { class: 'row' },
        el('button', { class: 'icon-btn', type: 'button', title: 'Editar', 'aria-label': `Editar ${service.name}`, onclick: () => openEditor(service) }, icon('edit', { size: 18 })),
        el(
          'button',
          {
            class: 'icon-btn icon-btn--danger',
            type: 'button',
            title: 'Eliminar',
            'aria-label': `Eliminar ${service.name}`,
            onclick: async () => {
              const ok = await confirmDialog({ title: '¿Eliminar servicio?', message: `"${service.name}" dejará de aparecer en el sitio. Las reservas ya hechas se mantienen. Si solo quieres pausarlo, mejor ocúltalo.`, confirmLabel: 'Eliminar', danger: true });
              if (!ok) return;
              try {
                await ctx.repo.deleteService(service.id);
                await reload('Servicio eliminado');
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

  function openEditor(service = null) {
    const submit = el('button', { class: 'btn btn--primary', type: 'submit' }, service ? 'Guardar cambios' : 'Crear servicio');
    const form = el(
      'form',
      { class: 'stack', novalidate: true },
      field('sv-name', 'Nombre', input({ id: 'sv-name', name: 'name', maxlength: 40, value: service?.name ?? '', placeholder: 'Ej.: Corte clásico' })),
      field('sv-description', 'Descripción corta (opcional)', input({ id: 'sv-description', name: 'description', maxlength: 140, value: service?.description ?? '' })),
      el(
        'div',
        { class: 'form-grid' },
        field('sv-price', 'Precio (CLP)', input({ id: 'sv-price', name: 'price', type: 'number', min: 0, step: 500, inputmode: 'numeric', value: service?.price ?? '' })),
        field('sv-duration', 'Duración (minutos)', input({ id: 'sv-duration', name: 'durationMin', type: 'number', min: 10, max: 240, step: 5, inputmode: 'numeric', value: service?.durationMin ?? 30 }), { hint: 'La agenda se divide en bloques de 30 min.' }),
      ),
      el('div', { class: 'dialog__actions' }, submit),
    );
    const { close } = openModal({ title: service ? 'Editar servicio' : 'Nuevo servicio', body: form });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const result = validateService({ name: form.elements.name.value, description: form.elements.description.value, price: form.elements.price.value, durationMin: form.elements.durationMin.value });
      if (!result.ok) return showFieldErrors(form, result.errors);
      submit.disabled = true;
      try {
        await ctx.repo.saveService({ ...(service ?? { active: true, order: ctx.catalog.services.length + 1 }), ...result.values, id: service?.id });
        close();
        await reload(service ? 'Servicio actualizado' : 'Servicio creado');
      } catch (error) {
        console.error(error);
        toast('No se pudo guardar el servicio.', 'error');
        submit.disabled = false;
      }
    });
  }

  paint();
}

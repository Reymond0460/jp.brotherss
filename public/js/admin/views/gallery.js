/**
 * GALERÍA: fotos de trabajos que se muestran en el carrusel del sitio.
 * El barbero sube fotos desde el celular o el computador; se reducen solas antes de guardarse.
 */
import { el, replaceContent } from '../../core/dom.js';
import { resizeImageToDataUrl } from '../../core/image.js';
import { confirmDialog } from '../../ui/dialog.js';
import { switchControl } from '../../ui/form.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { pageHeader } from '../components/page-header.js';

/** Límite de fotos para que el sitio cargue rápido. */
const MAX_PHOTOS = 20;

export async function renderGallery(host, ctx) {
  const sorted = () => [...ctx.catalog.gallery].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  async function reload(message) {
    ctx.catalog.gallery = await ctx.repo.listGallery();
    if (message) toast(message);
    paint();
  }

  /** Procesa y guarda las fotos elegidas, una por una. */
  async function upload(files) {
    const room = MAX_PHOTOS - ctx.catalog.gallery.length;
    if (room <= 0) return toast(`Ya tienes ${MAX_PHOTOS} fotos. Elimina alguna para subir otras.`, 'error');
    const chosen = [...files].slice(0, room);
    if (files.length > room) toast(`Solo caben ${room} fotos más; se subirán las primeras.`, 'info');

    let order = Math.max(0, ...ctx.catalog.gallery.map((g) => g.order ?? 0));
    let saved = 0;
    for (const file of chosen) {
      try {
        const src = await resizeImageToDataUrl(file);
        await ctx.repo.saveGalleryItem({ src, caption: '', order: ++order, active: true });
        saved += 1;
      } catch (error) {
        console.error(error);
        toast(`No se pudo subir "${file.name}".`, 'error');
      }
    }
    if (saved) await reload(saved === 1 ? 'Foto subida' : `${saved} fotos subidas`);
  }

  /** Intercambia el orden de una foto con su vecina. */
  async function move(item, direction) {
    const list = sorted();
    const index = list.findIndex((g) => g.id === item.id);
    const other = list[index + direction];
    if (!other) return;
    await Promise.all([ctx.repo.saveGalleryItem({ id: item.id, order: other.order ?? index + direction }), ctx.repo.saveGalleryItem({ id: other.id, order: item.order ?? index })]);
    await reload();
  }

  function buildCard(item, index, total) {
    const caption = el('input', { class: 'input', type: 'text', maxlength: 60, value: item.caption ?? '', placeholder: 'Descripción (opcional)', 'aria-label': 'Descripción de la foto' });
    caption.addEventListener('change', async () => {
      try {
        await ctx.repo.saveGalleryItem({ id: item.id, caption: caption.value.trim() });
        item.caption = caption.value.trim();
        toast('Descripción guardada');
      } catch (error) {
        console.error(error);
        toast('No se pudo guardar.', 'error');
      }
    });

    const isExample = item.id.startsWith('ejemplo-');
    return el(
      'li',
      { class: `photo-card${item.active === false ? ' is-off' : ''}` },
      el('img', { class: 'photo-card__img', src: item.src, alt: item.caption || 'Foto de trabajo' }),
      isExample ? el('p', { class: 'muted photo-card__note' }, 'Foto de ejemplo') : null,
      caption,
      el(
        'div',
        { class: 'photo-card__bar' },
        switchControl({
          id: `photo-${item.id}`,
          label: item.active === false ? 'Oculta' : 'Visible',
          checked: item.active !== false,
          onchange: async (e) => {
            try {
              await ctx.repo.saveGalleryItem({ id: item.id, active: e.target.checked });
              await reload();
            } catch (error) {
              console.error(error);
              toast('No se pudo actualizar.', 'error');
            }
          },
        }),
        el(
          'div',
          { class: 'row photo-card__tools' },
          el('button', { class: 'icon-btn', type: 'button', title: 'Mover antes', 'aria-label': 'Mover antes', disabled: index === 0, onclick: () => move(item, -1) }, icon('chevron-left', { size: 18 })),
          el('button', { class: 'icon-btn', type: 'button', title: 'Mover después', 'aria-label': 'Mover después', disabled: index === total - 1, onclick: () => move(item, 1) }, icon('chevron-right', { size: 18 })),
          el(
            'button',
            {
              class: 'icon-btn icon-btn--danger',
              type: 'button',
              title: 'Eliminar',
              'aria-label': 'Eliminar foto',
              onclick: async () => {
                if (!(await confirmDialog({ title: '¿Eliminar esta foto?', message: 'Dejará de verse en el carrusel del sitio.', confirmLabel: 'Eliminar', danger: true }))) return;
                try {
                  await ctx.repo.deleteGalleryItem(item.id);
                  await reload('Foto eliminada');
                } catch (error) {
                  console.error(error);
                  toast('No se pudo eliminar.', 'error');
                }
              },
            },
            icon('trash', { size: 18 }),
          ),
        ),
      ),
    );
  }

  function paint() {
    const list = sorted();
    const fileInput = el('input', { class: 'visually-hidden', id: 'gallery-file', type: 'file', accept: 'image/*', multiple: true });
    fileInput.addEventListener('change', async () => {
      if (fileInput.files.length) await upload(fileInput.files);
      fileInput.value = '';
    });

    replaceContent(
      host,
      pageHeader('Galería', 'Las fotos del carrusel "Nuestro trabajo" del sitio.', el('label', { class: 'btn btn--primary', for: 'gallery-file' }, icon('upload', { size: 18 }), 'Subir fotos'), fileInput),
      el('p', { class: 'notice notice--blue' }, icon('info', { size: 18 }), `Puedes subir varias a la vez, directo desde la cámara o la galería del celular. Se reducen automáticamente. Máximo ${MAX_PHOTOS} fotos (${list.length} usadas). Las fotos "de ejemplo" se pueden eliminar.`),
      list.length ? el('ul', { class: 'photo-grid' }, list.map((item, i) => buildCard(item, i, list.length))) : el('p', { class: 'empty' }, 'Aún no hay fotos. Sube las primeras y aparecerá el carrusel en el sitio.'),
    );
  }

  paint();
}

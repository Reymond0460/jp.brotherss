/**
 * Router mínimo por hash (#resumen, #agenda…).
 * Se usa el hash (y no rutas reales) para que el panel funcione igual en Firebase Hosting,
 * en localhost y dentro del artefacto, sin configurar redirecciones.
 */
import { replaceContent, el } from '../core/dom.js';

/**
 * @param {object} options
 * @param {Record<string, (outlet: HTMLElement, ctx: object) => Promise<void>>} options.routes
 * @param {string} options.defaultRoute
 * @param {HTMLElement} options.outlet     dónde se dibuja la vista
 * @param {object} options.ctx             contexto compartido (repo, catálogo…)
 * @param {(name: string) => void} [options.onChange]
 */
export function createRouter({ routes, defaultRoute, outlet, ctx, onChange }) {
  let token = 0;

  async function render() {
    const name = location.hash.slice(1) in routes ? location.hash.slice(1) : defaultRoute;
    const current = ++token;
    onChange?.(name);
    replaceContent(outlet, el('p', { class: 'muted view-loading' }, 'Cargando…'));
    try {
      const view = el('div', { class: 'view' });
      await routes[name](view, ctx);
      // Si el usuario cambió de vista mientras cargaba, se descarta este resultado.
      if (current === token) replaceContent(outlet, view);
    } catch (error) {
      console.error(error);
      if (current === token) replaceContent(outlet, el('p', { class: 'notice notice--red' }, 'No pudimos cargar esta sección. Revisa tu conexión e intenta de nuevo.'));
    }
  }

  window.addEventListener('hashchange', render);
  return {
    render,
    go: (name) => (location.hash = name),
    destroy: () => window.removeEventListener('hashchange', render),
  };
}

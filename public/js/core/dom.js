/**
 * Utilidades mínimas para trabajar con el DOM sin librerías.
 *
 * Regla del proyecto: NUNCA se arma HTML concatenando texto del usuario (riesgo XSS).
 * Se construyen nodos con `el()`, que inserta los textos como nodos de texto seguros.
 */

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/** Propiedades que deben asignarse como propiedad del nodo y no como atributo. */
const PROPERTY_KEYS = new Set(['value', 'checked', 'disabled', 'selected', 'hidden', 'readOnly']);

/**
 * Crea un elemento HTML.
 * @param {string} tag
 * @param {Record<string, any>} [props]  class, dataset, on<Evento>, y cualquier atributo.
 * @param {...any} children              strings, nodos, arrays (se aplanan) o null.
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  applyProps(node, props);
  appendChildren(node, children);
  return node;
}

/** Igual que `el` pero para elementos SVG. */
export function svgEl(tag, props = {}, ...children) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.setAttribute('class', value);
    else node.setAttribute(key, String(value));
  }
  appendChildren(node, children);
  return node;
}

function applyProps(node, props) {
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (PROPERTY_KEYS.has(key)) node[key] = value;
    else node.setAttribute(key, value === true ? '' : String(value));
  }
}

function appendChildren(node, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Vacía un nodo y, opcionalmente, agrega hijos nuevos. */
export function replaceContent(node, ...children) {
  node.replaceChildren();
  appendChildren(node, children);
  return node;
}

/** Escucha un evento delegado: `on(root, 'click', '[data-action]', handler)`. */
export function delegate(root, eventName, selector, handler) {
  root.addEventListener(eventName, (event) => {
    const target = event.target.closest(selector);
    if (target && root.contains(target)) handler(event, target);
  });
}

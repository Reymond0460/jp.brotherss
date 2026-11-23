/**
 * Gráficos propios en SVG/HTML (sin librerías).
 *
 *   barChart(container, {...})   barras verticales (ingresos por día, cortes por día de la semana)
 *   hbarChart(container, {...})  barras horizontales en HTML (cortes por servicio)
 *
 * Criterios de diseño: marcas finas con el extremo superior redondeado, una sola escala (un eje),
 * grilla muy suave, tooltip al pasar el cursor y una tabla oculta con los mismos datos para
 * lectores de pantalla. Los colores salen de variables CSS (css/admin/charts.css).
 */
import { el, svgEl } from '../core/dom.js';

const MARGIN = { top: 14, right: 8, bottom: 28, left: 48 };

/** Escala "bonita": devuelve el máximo redondeado y las marcas del eje. */
export function niceScale(maxValue, count = 4) {
  if (!(maxValue > 0)) return { max: 1, ticks: [0, 1] };
  const rough = maxValue / count;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / pow;
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * pow;
  const max = Math.ceil(maxValue / step) * step;
  return { max, ticks: Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step) };
}

/** Texto compacto para el eje: 12000 → "12 mil", 1500000 → "1,5 M". */
export function compactCLP(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: 1 })} M`;
  if (value >= 1000) return `$${Math.round(value / 1000).toLocaleString('es-CL')} mil`;
  return `$${value}`;
}

/**
 * @param {HTMLElement} container
 * @param {object} options
 * @param {{label: string, shortLabel?: string, value: number, tooltip?: string, highlight?: boolean}[]} options.data
 * @param {(n:number)=>string} options.formatValue    formato del valor en tooltip/tabla
 * @param {(n:number)=>string} [options.formatTick]   formato del eje (por defecto igual a formatValue)
 * @param {string} options.ariaLabel                  descripción corta del gráfico
 * @param {number} [options.height]
 */
export function barChart(container, { data, formatValue, formatTick = formatValue, ariaLabel, height = 230 }) {
  const stage = el('div', { class: 'chart__stage' });
  const tip = el('div', { class: 'chart-tip', hidden: true });
  const table = el(
    'table',
    { class: 'visually-hidden' },
    el('caption', {}, ariaLabel),
    el('tbody', {}, data.map((d) => el('tr', {}, el('th', { scope: 'row' }, d.label), el('td', {}, formatValue(d.value))))),
  );
  container.classList.add('chart');
  container.replaceChildren(stage, tip, table);

  const draw = () => {
    const width = Math.max(280, Math.floor(stage.clientWidth || container.clientWidth || 600));
    const innerW = width - MARGIN.left - MARGIN.right;
    const innerH = height - MARGIN.top - MARGIN.bottom;
    const { max, ticks } = niceScale(Math.max(0, ...data.map((d) => d.value)));
    const y = (v) => MARGIN.top + innerH - (v / max) * innerH;
    const slot = innerW / data.length;
    const barW = Math.min(28, Math.max(4, slot * 0.62));
    const base = MARGIN.top + innerH;
    const labelEvery = Math.max(1, Math.ceil(data.length / Math.floor(innerW / 34)));

    const svg = svgEl('svg', { class: 'chart__svg', width, height, viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': ariaLabel });

    // Grilla y eje Y
    for (const tick of ticks) {
      svg.append(svgEl('line', { class: tick === 0 ? 'chart__axis' : 'chart__grid', x1: MARGIN.left, x2: width - MARGIN.right, y1: y(tick), y2: y(tick) }));
      svg.append(svgEl('text', { class: 'chart__tick', x: MARGIN.left - 8, y: y(tick) + 4, 'text-anchor': 'end' }, formatTick(tick)));
    }

    const bars = [];
    data.forEach((d, i) => {
      const cx = MARGIN.left + slot * i + slot / 2;
      const x = cx - barW / 2;
      const top = y(d.value);
      const h = base - top;

      if (h > 0.5) {
        const r = Math.min(4, barW / 2, h);
        const path = svgEl('path', { class: `chart__bar${d.highlight ? ' is-highlight' : ''}`, d: `M${x} ${base}V${top + r}a${r} ${r} 0 0 1 ${r} ${-r}H${x + barW - r}a${r} ${r} 0 0 1 ${r} ${r}V${base}Z` });
        svg.append(path);
        bars[i] = path;
      }
      if (i % labelEvery === 0) {
        svg.append(svgEl('text', { class: 'chart__label', x: cx, y: height - 8, 'text-anchor': 'middle' }, d.shortLabel ?? d.label));
      }

      // Zona de contacto más ancha que la barra, para que sea fácil de apuntar.
      const hit = svgEl('rect', { class: 'chart__hit', x: MARGIN.left + slot * i, y: MARGIN.top, width: slot, height: innerH + MARGIN.bottom - 6 });
      const show = () => {
        bars.forEach((b) => b?.classList.remove('is-hover'));
        bars[i]?.classList.add('is-hover');
        tip.replaceChildren(el('strong', {}, d.label), el('span', {}, d.tooltip ?? formatValue(d.value)));
        tip.hidden = false;
        const left = Math.min(Math.max(cx, tip.offsetWidth / 2 + 4), width - tip.offsetWidth / 2 - 4);
        tip.style.left = `${left}px`;
        tip.style.top = `${Math.max(top - 10, tip.offsetHeight + 4)}px`;
      };
      const hide = () => {
        tip.hidden = true;
        bars[i]?.classList.remove('is-hover');
      };
      hit.addEventListener('pointerenter', show);
      hit.addEventListener('pointermove', show);
      hit.addEventListener('pointerleave', hide);
      svg.append(hit);
    });

    stage.replaceChildren(svg);
  };

  draw();
  // Se redibuja si cambia el ancho disponible (rotar el teléfono, abrir/cerrar el menú).
  let lastWidth = stage.clientWidth;
  let frame = 0;
  new ResizeObserver(() => {
    if (Math.abs(stage.clientWidth - lastWidth) < 2) return;
    lastWidth = stage.clientWidth;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
  }).observe(container);
}

/**
 * Barras horizontales (ranking). Cada fila: nombre, barra proporcional y valor.
 * @param {{label: string, value: number, detail?: string}[]} options.data
 */
export function hbarChart(container, { data, formatValue, emptyText = 'Sin datos todavía.' }) {
  container.classList.add('chart');
  const max = Math.max(0, ...data.map((d) => d.value));
  if (!data.length || max === 0) {
    container.replaceChildren(el('p', { class: 'empty' }, emptyText));
    return;
  }
  container.replaceChildren(
    el(
      'ul',
      { class: 'hbars' },
      data.map((d) => {
        const fill = el('span', { class: 'hbar__fill' });
        fill.style.setProperty('--w', String(Math.max(2, (d.value / max) * 100)));
        return el(
          'li',
          { class: 'hbar' },
          el('span', { class: 'hbar__label' }, d.label, d.detail ? el('small', {}, d.detail) : null),
          el('span', { class: 'hbar__track' }, fill),
          el('span', { class: 'hbar__value num' }, formatValue(d.value)),
        );
      }),
    ),
  );
}

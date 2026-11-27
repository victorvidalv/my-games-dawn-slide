/** Utilidades de DOM compartidas por las vistas (antes repetidas en cada archivo de src/ui). */
import { numLocale } from '../i18n.js';

/** ¿El jugador pide menos movimiento? Se consulta cada vez: puede cambiar con el juego abierto. */
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Número con el formato de miles del idioma actual. */
export const fmtNum = (n) => n.toLocaleString(numLocale());

/** Crea un elemento con clase y, opcionalmente, texto / HTML / atributos. */
export function el(tag, className = '', { text, html, attrs } = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  if (html != null) node.innerHTML = html;
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/** Botones del contenedor que se pueden alcanzar con Tab. */
export const tabbables = (root) => [...root.querySelectorAll('button')].filter((b) => b.tabIndex >= 0);

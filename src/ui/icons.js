/**
 * Iconos propios del juego (SVG, 32×32). Mismo lenguaje visual que el resto: contorno de tinta oscura,
 * colores planos y apagados (latón, pergamino, hierro, cristal) y un brillo claro arriba a la izquierda.
 * Nada de emojis del sistema: así se ven igual en todos los móviles y encajan con el estilo del juego.
 *
 *   icon('hint')            → '<svg class="ic ic-hint">…</svg>'
 *   <i data-icon="hint">    → hydrateIcons() lo rellena (para el HTML estático)
 */
const INK = '#1c1208';
const BRASS = '#e6b04a';
const BRASS_DK = '#b57a22';
const BRASS_LT = '#fbe29a';
const IRON = '#8b939b';
const IRON_DK = '#5a636b';
const PAPER = '#f3e5c2';
const GLASS = '#bfefff';
const RED = '#d9604f';

const BODIES = {
  /** Sello de bronce: hexágono de cobre con un punto central (el premio pequeño). */
  seal1: `<path d="M9.5 4h13l6.5 12-6.5 12h-13L3 16z" fill="#b8703a" stroke="#172731" stroke-width="2"/><path d="M11.5 8h9l4.5 8-4.5 8h-9L7 16z" fill="#e0a468"/><circle cx="16" cy="16" r="3.4" fill="#7a4220" stroke="none"/><path d="M12 11.5h8" stroke="#f3c996" stroke-width="1.5"/>`,
  /** Sello de plata: rombo plateado con anillo y cruz (el premio medio). */
  seal2: `<path d="M16 2.5l13.5 13.5L16 29.5 2.5 16z" fill="#aebdc9" stroke="#172731" stroke-width="2"/><path d="M16 7l9 9-9 9-9-9z" fill="#e3edf5"/><circle cx="16" cy="16" r="4.6" fill="#5d7a90" stroke="#2b4352" stroke-width="1.6"/><path d="M16 11.5v9M11.5 16h9" stroke="#f4fbff" stroke-width="1.6"/>`,
  /** Sello de oro: estrella de ocho puntas con gema (el gran premio). */
  seal3: `<path d="M16 1.8l3.4 7.1 7.4-2.8-2.8 7.4 7.1 3.4-7.1 3.4 2.8 7.4-7.4-2.8L16 30.2l-3.4-7.1-7.4 2.8 2.8-7.4L1.8 16l7.1-3.4-2.8-7.4 7.4 2.8z" fill="#e9b73a" stroke="#172731" stroke-width="2"/><circle cx="16" cy="16" r="7" fill="#f8de8a" stroke="#9a6b16" stroke-width="1.6"/><path d="M16 11.2l3.4 4.8-3.4 4.8-3.4-4.8z" fill="#d6483f" stroke="#7a1e1a" stroke-width="1.2"/><path d="M14.2 14l1.2-1.6" stroke="#fff3d0" stroke-width="1.2"/>`,
  seal: `<path d="M10 3h12l7 7v12l-7 7H10l-7-7V10z" fill="#b58a4e" stroke="#172731" stroke-width="2"/><path d="M11.5 6.5h9l5 5v9l-5 5h-9l-5-5v-9z" fill="#e4cf9b"/><path d="M16 9l7 7-7 7-7-7z" fill="#344b50" stroke="#8f6336"/><circle cx="16" cy="14" r="2.2" fill="#d27c5d" stroke="none"/><path d="M16 16v4m0-1h2" stroke="#e8c884" stroke-width="1.5"/>`,
  /** Abanico de tres cartas con una estrella: las cartas del destino. */
  fate: `<rect x="5" y="8" width="13" height="19" rx="2" fill="#8e3b5f" transform="rotate(-18 11.5 17.5)"/>
    <rect x="14" y="8" width="13" height="19" rx="2" fill="#5fd0e6" transform="rotate(16 20.5 17.5)"/>
    <rect x="9.5" y="5" width="13" height="20" rx="2" fill="${PAPER}"/>
    <path d="M16 9.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="${BRASS}" stroke-width="1.2"/>
    <path d="M12 21h8" stroke="${BRASS_DK}" stroke-width="1.4"/>`,
  /** Farol con llama: la pista. */
  hint: `<path d="M16 2.8v3" /><circle cx="16" cy="3.3" r="1.5" fill="${BRASS}"/>
    <path d="M10.2 9h11.6l-2.2-3.6h-7.2z" fill="${BRASS_DK}"/>
    <path d="M10.6 9h10.8l1.1 14H9.5z" fill="#fff0b8"/>
    <path d="M13.3 9l-.4 14M18.7 9l.4 14" stroke-width="1" />
    <path d="M16 11.5c2.8 2.8 3.4 4.8 2.4 6.7-.6 1.2-1.9 1.9-2.4 1.9s-1.8-.7-2.4-1.9c-1-1.9-.4-3.9 2.4-6.7z" fill="#ff9a3c"/>
    <path d="M16 15c1.1 1.3 1.3 2.1.9 3-.2.4-.6.6-.9.6s-.7-.2-.9-.6c-.4-.9-.2-1.7.9-3z" fill="#ffe27a" stroke="none"/>
    <path d="M8.8 23h14.4l-1.1 3.8H9.9z" fill="${BRASS_DK}"/>`,

  /** Reloj de arena: los turnos. */
  hourglass: `<rect x="6.5" y="3" width="19" height="3.4" rx="1.3" fill="${BRASS_DK}"/>
    <rect x="6.5" y="25.6" width="19" height="3.4" rx="1.3" fill="${BRASS_DK}"/>
    <path d="M9.2 6.4h13.6c0 5.2-3.7 6.6-5.2 9.6 1.5 3 5.2 4.4 5.2 9.6H9.2c0-5.2 3.7-6.6 5.2-9.6-1.5-3-5.2-4.4-5.2-9.6z" fill="${GLASS}" fill-opacity=".9"/>
    <path d="M11.8 7.6h8.4c-.3 2.7-1.9 3.7-4.2 5.8-2.3-2.1-3.9-3.1-4.2-5.8z" fill="#f3b94d" stroke="none"/>
    <path d="M10.8 24.6c.7-2.7 2.7-3.9 5.2-3.9s4.5 1.2 5.2 3.9z" fill="#f3b94d" stroke="none"/>
    <path d="M16 13.4v7.2" stroke="#f3b94d" stroke-width="1.3"/>`,

  /** Flecha circular hacia atrás con un reloj: rehacer el tablero. */
  rewind: `<circle cx="16" cy="16" r="12.2" fill="#2f4553"/>
    <path d="M9.4 11.2A9 9 0 1 1 7.2 18" stroke="${BRASS_LT}" stroke-width="2.8"/>
    <path d="M4.2 8.4l2.2 6.9 5.6-3.8z" fill="${BRASS_LT}" stroke-width="1.2"/>
    <path d="M16 11v5.6l3.6 2.2" stroke="${BRASS_LT}" stroke-width="2.2"/>`,

  /** Doble flecha con barra: saltar el nivel. */
  skip: `<path d="M4.5 6.5l10 9.5-10 9.5z" fill="${BRASS}"/>
    <path d="M14.5 6.5l10 9.5-10 9.5z" fill="${BRASS}"/>
    <rect x="25" y="6.5" width="3.4" height="19" rx="1.2" fill="${BRASS_DK}"/>
    <path d="M7 11l4 4" stroke="${BRASS_LT}" stroke-width="1.6"/>`,

  /** Flecha curva: deshacer. */
  undo: `<path d="M12.5 6.5L4.5 13.5l8 7v-4c6.6-.4 10.4 1.6 13 7.2-.3-8.8-5.3-13.5-13-13.8z" fill="${GLASS}"/>
    <path d="M7.5 13.5l4.5-4" stroke="#ffffff" stroke-width="1.5"/>`,

  /** Bolsa de monedas: la tienda. */
  purse: `<path d="M16 10.5c-6.2 0-10.2 5.7-9.7 11.3.3 3.6 3.2 5.7 9.7 5.7s9.4-2.1 9.7-5.7C26.2 16.2 22.2 10.5 16 10.5z" fill="#a8663a"/>
    <path d="M11 8l2.9 3.2h4.2L21 8z" fill="#a8663a"/>
    <path d="M12.4 11.6h7.2" stroke="${BRASS}" stroke-width="2.4"/>
    <path d="M19.6 11.6l1.8 3M12.4 11.6l-1.8 3" stroke="${BRASS}" stroke-width="1.6"/>
    <circle cx="16" cy="20.2" r="4.4" fill="#f3c75a"/>
    <path d="M16 17.8v4.8M14.2 19.4h3.4M14.2 21.3h3.6" stroke="#8a5a14" stroke-width="1.1"/>
    <path d="M9.4 17.5c.5-2 1.6-3.2 3-3.9" stroke="#e0a070" stroke-width="1.3"/>`,

  /** Roca fija. */
  rock: `<path d="M5 12.5c0-4.2 3.3-7 7.2-7h7.6c3.9 0 7.2 2.8 7.2 7v7c0 4.2-3.3 7-7.2 7h-7.6C8.3 26.5 5 23.7 5 19.5z" fill="#9aa68a"/>
    <path d="M9 9c1.8-1.2 3.6-1.5 6-1.5" stroke="#d5deca" stroke-width="1.8"/>
    <path d="M19.5 5.8l-3 6.6 4.4 3.8-3.3 5.6" stroke-width="1.3"/>
    <circle cx="9" cy="22.5" r="1.3" fill="${INK}" stroke="none"/><circle cx="23.2" cy="22.5" r="1.3" fill="${INK}" stroke="none"/>`,

  /** Candado cerrado. */
  lock: `<path d="M10.5 14.5v-4a5.5 5.5 0 0 1 11 0v4" stroke="${INK}" stroke-width="4.6" fill="none"/>
    <path d="M10.5 14.5v-4a5.5 5.5 0 0 1 11 0v4" stroke="#d9dde0" stroke-width="2.2" fill="none"/>
    <rect x="6.2" y="13.8" width="19.6" height="14.2" rx="3.6" fill="${BRASS}"/>
    <path d="M9 17.2h14" stroke="${BRASS_LT}" stroke-width="1.5"/>
    <circle cx="16" cy="20.6" r="2.3" fill="${INK}" stroke="none"/><path d="M16 21.4v4" stroke="${INK}" stroke-width="2.4"/>`,

  /** Candado abierto. */
  unlock: `<path d="M10.5 14.5v-4a5.5 5.5 0 0 1 10.8-1.6" stroke="${INK}" stroke-width="4.6" fill="none"/>
    <path d="M10.5 14.5v-4a5.5 5.5 0 0 1 10.8-1.6" stroke="#d9dde0" stroke-width="2.2" fill="none"/>
    <rect x="6.2" y="13.8" width="19.6" height="14.2" rx="3.6" fill="#8fe3a8"/>
    <path d="M9 17.2h14" stroke="#d6ffe0" stroke-width="1.5"/>
    <circle cx="16" cy="20.6" r="2.3" fill="${INK}" stroke="none"/><path d="M16 21.4v4" stroke="${INK}" stroke-width="2.4"/>`,

  /** Pesa de hierro con un «1»: la pieza pesada. */
  weight: `<path d="M12.2 11.8V9.6a3.8 3.8 0 0 1 7.6 0v2.2" stroke="${INK}" stroke-width="4.4" fill="none"/>
    <path d="M12.2 11.8V9.6a3.8 3.8 0 0 1 7.6 0v2.2" stroke="${IRON}" stroke-width="2" fill="none"/>
    <path d="M8.6 11.8h14.8l4.4 14.6H4.2z" fill="${IRON}"/>
    <path d="M10 14.4h8" stroke="#d5dce2" stroke-width="1.6"/>
    <path d="M14.2 17.4l2.2-1.6v8" stroke="#ffffff" stroke-width="2.2"/>
    <path d="M6 24.2h20" stroke="${IRON_DK}" stroke-width="1.2"/>`,

  /** Bloque de hielo con destello glacial: la pieza deslizante. */
  ice: `<rect x="4.5" y="5.5" width="23" height="21" rx="4.5" fill="#90e3fb"/>
    <path d="M8 9.2l4.6-2.2M7.6 15.2l8-8" stroke="#ffffff" stroke-width="1.7"/>
    <path d="M16 9.5v13M10.4 12.7l11.2 6.6M21.6 12.7l-11.2 6.6" stroke="#185978" stroke-width="1.8"/>
    <circle cx="16" cy="16" r="2.2" fill="#e9fcff" stroke="#185978" stroke-width="1.2"/>`,

  /** Corona: la zona perfecta del medidor. */
  crown: `<path d="M4.6 24.2L3.2 10.6l6.6 5.6L16 6.4l6.2 9.8 6.6-5.6-1.4 13.6z" fill="#f3c75a"/>
    <rect x="4.6" y="24.2" width="22.8" height="3.6" rx="1.4" fill="${BRASS_DK}"/>
    <circle cx="16" cy="19.6" r="1.8" fill="${RED}"/><circle cx="9.8" cy="20.6" r="1.3" fill="#7fd8e8"/><circle cx="22.2" cy="20.6" r="1.3" fill="#7fd8e8"/>
    <circle cx="3.2" cy="10.4" r="1.5" fill="${BRASS_LT}"/><circle cx="16" cy="6" r="1.5" fill="${BRASS_LT}"/><circle cx="28.8" cy="10.4" r="1.5" fill="${BRASS_LT}"/>`,

  /** Triángulo de aviso. */
  alert: `<path d="M16 3.8l13.2 23.4H2.8z" fill="#f3b94d"/>
    <path d="M16 11.6v8" stroke-width="2.8"/><circle cx="16" cy="23.4" r="1.7" fill="${INK}" stroke="none"/>
    <path d="M9.6 24.5l5-9" stroke="#fff1b8" stroke-width="1.3" />`,

  /** Corazón: el poder de Lía. */
  heart: `<path d="M16 27.2C5.6 19.6 4.2 13 7.8 9.4c3.1-3 6.6-1.6 8.2 1.5 1.6-3.1 5.1-4.5 8.2-1.5 3.6 3.6 2.2 10.2-8.2 17.8z" fill="${RED}"/>
    <path d="M9.2 12.2c.8-1.2 2-1.8 3.2-1.6" stroke="#ffd0c4" stroke-width="1.8"/>`,

  /** Reloj: el poder de Jean. */
  clock: `<circle cx="16" cy="17" r="11" fill="${PAPER}"/>
    <circle cx="16" cy="17" r="11" stroke="${BRASS_DK}" stroke-width="2.4" fill="none"/>
    <rect x="13.6" y="2.4" width="4.8" height="3" rx="1" fill="${BRASS}"/>
    <path d="M16 17V10.6M16 17l4.4 2.6" stroke-width="2"/>
    <path d="M16 7.2v1.6M16 25.2v1.6M6.2 17h1.6M24.2 17h1.6" stroke-width="1.3"/>
    <path d="M5.4 7.4l2.2 2" stroke="${BRASS_DK}" stroke-width="1.6"/>`,

  /** Dos luces: el poder de Juth. */
  stars: `<path d="M12.4 4.6l2.4 7 7 2.4-7 2.4-2.4 7-2.4-7-7-2.4 7-2.4z" fill="#d7c3ff"/>
    <path d="M23.4 17.6l1.5 4.2 4.2 1.5-4.2 1.5-1.5 4.2-1.5-4.2-4.2-1.5 4.2-1.5z" fill="#fbe29a"/>
    <path d="M12.4 8.4v3.6" stroke="#ffffff" stroke-width="1.4"/>`,

  /** Cristal de hielo: los turnos comprados. */
  crystal: `<path d="M16 2.8l7.4 7.6-2.6 17-4.8 1.8-4.8-1.8-2.6-17z" fill="#bfefff"/>
    <path d="M16 2.8v26M8.6 10.4h14.8" stroke="#ffffff" stroke-width="1.2"/>
    <path d="M12.4 8l-2.2 6" stroke="#ffffff" stroke-width="1.6"/>`,

  /** Trofeo (fin del camino Normal). */
  trophy: `<path d="M9 4.5h14v8.6c0 4.2-3.2 7.2-7 7.2s-7-3-7-7.2z" fill="#f3c75a"/>
    <path d="M9 7H4.6c0 5 2 7.2 5 8M23 7h4.4c0 5-2 7.2-5 8" fill="none" stroke-width="1.8"/>
    <path d="M16 20.4V25M11 27.6h10" stroke-width="2.4"/><rect x="10" y="25" width="12" height="3.4" rx="1.2" fill="${BRASS_DK}"/>
    <path d="M12 7.5v4.5" stroke="${BRASS_LT}" stroke-width="1.8"/>`,

  /** Bandera sobre un montículo: el nivel. */
  flag: `<path d="M5.5 27.6c1-3.2 4.6-4.4 8-4.4s7 1.2 8 4.4z" fill="${IRON}"/>
    <path d="M12 24V4.6" stroke-width="2.4"/><path d="M12 5.6l15 4.6-15 5.4z" fill="${RED}"/>
    <path d="M14.4 8.2l8 2.4" stroke="${BRASS_LT}" stroke-width="1.6"/><circle cx="12" cy="4.4" r="1.9" fill="${BRASS}"/>`,

  /** Medalla (fin del camino Difícil). */
  medal: `<path d="M9.6 3l5 9.2M22.4 3l-5 9.2" stroke-width="3.4" fill="none"/>
    <path d="M9.6 3l5 9.2M22.4 3l-5 9.2" stroke="${RED}" stroke-width="1.6" fill="none"/>
    <circle cx="16" cy="19.4" r="9" fill="#f3c75a"/><circle cx="16" cy="19.4" r="5.6" fill="none" stroke="${BRASS_DK}" stroke-width="1.6"/>
    <path d="M16 15.2l1.4 3 3.2.4-2.4 2.2.7 3.2-2.9-1.7-2.9 1.7.7-3.2-2.4-2.2 3.2-.4z" fill="${BRASS_DK}" stroke-width="1"/>`,

  /** Llama (racha). */
  book: `<path d="M4 6.5c4-1.6 8-1.2 12 1.5 4-2.7 8-3.1 12-1.5v18.5c-4-1.4-8-1-12 1.6-4-2.6-8-3-12-1.6Z" /><path d="M16 8v18" />`,
  key: `<circle cx="10.5" cy="16" r="5" /><path d="M15.5 16H28M23 16v5M27 16v4" />`,
  flame: `<path d="M16 3.2c1 5 6.8 7.6 6.8 14.4 0 5.4-3 9.2-6.8 9.2s-6.8-3.8-6.8-9.2c0-3 1.4-5 3-6.8.2 2.2 1 3.2 2 3.8-.4-3.8.2-7 1.8-11.4z" fill="#ff9a3c"/>
    <path d="M16 15c2.2 2.6 3.2 4.4 3.2 6.4 0 1.9-1.4 3.2-3.2 3.2s-3.2-1.3-3.2-3.2c0-2 1-3.8 3.2-6.4z" fill="#ffe27a" stroke="none"/>`,
};

/** SVG de un icono por nombre (cadena vacía si no existe). */
export function icon(name, extraClass = '') {
  const body = BODIES[name];
  if (!body) return '';
  return `<svg class="ic ic-${name} ${extraClass}" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><g stroke="${INK}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" fill="none">${body}</g></svg>`;
}

export const ICON_NAMES = Object.keys(BODIES);

/** Rellena los elementos del HTML estático marcados con data-icon="nombre". */
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon);
  });
}

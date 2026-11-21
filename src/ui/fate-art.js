/**
 * Ilustración propia de cada carta del destino (SVG 64×64). Mismo lenguaje que los iconos del juego: contorno de tinta
 * oscura, colores planos y un brillo claro arriba a la izquierda. Cada carta usa sus dos colores (`a` intenso, `b` claro).
 */
const INK = '#1c1208';
const GOLD = '#e6b04a';
const GOLD_LT = '#fbe29a';
const CREAM = '#f3e5c2';
const IRON = '#5a636b';

const ART = {
  /** Sol de ocho rayos con una gema: el brillo. */
  brillo: (a, b) =>
    `<g>${[0, 45, 90, 135, 180, 225, 270, 315].map((r) => `<path d="M32 6l4 10h-8z" transform="rotate(${r} 32 32)" fill="${a}"/>`).join('')}</g>
    <circle cx="32" cy="32" r="13" fill="${b}"/><circle cx="32" cy="32" r="7" fill="${a}"/><path d="M28 28l3-2" stroke="#fff" stroke-width="2"/>`,
  /** Monedas apiladas con un trébol: la fortuna. */
  fortuna: (a, b) =>
    `<ellipse cx="32" cy="48" rx="17" ry="6" fill="${a}"/><path d="M15 48v-6c0 3.3 7.6 6 17 6s17-2.7 17-6v6" fill="${a}"/>
    <ellipse cx="32" cy="40" rx="17" ry="6" fill="${b}"/><path d="M15 40v-6c0 3.3 7.6 6 17 6s17-2.7 17-6v6" fill="${b}"/>
    <ellipse cx="32" cy="32" rx="17" ry="6" fill="${GOLD_LT}"/>
    <path d="M32 32c-5-3-5-9 0-8 5-1 5 5 0 8zM32 32c3-5 9-5 8 0 1 5-5 5-8 0zM32 32c-3-5-9-5-8 0-1 5 5 5 8 0z" fill="#5fa05a" transform="translate(0 -14)"/>
    <path d="M32 18v6" transform="translate(0 0)"/>`,
  /** Estrellas unidas por líneas: la constelación. */
  constelacion: (a, b) =>
    `<circle cx="32" cy="32" r="26" fill="${a}" fill-opacity=".35"/>
    <path d="M14 42L24 22 38 28 50 14M38 28l6 20-22 2-8-8" fill="none" stroke="${b}" stroke-width="1.8" stroke-dasharray="3 2"/>
    ${[
      [14, 42],
      [24, 22],
      [38, 28],
      [50, 14],
      [44, 48],
      [22, 50],
    ]
      .map(
        ([x, y], i) =>
          `<path d="M${x} ${y - 5}l1.6 3.4 3.4 1.6-3.4 1.6L${x} ${y + 5}l-1.6-3.4L${x - 5} ${y}l3.4-1.6z" fill="${i === 3 ? GOLD_LT : b}"/>`,
      )
      .join('')}`,
  /** Diamante tallado con destellos: el bono de Perfecto. */
  destello: (a, b) =>
    `<path d="M20 22h24l8 10-20 24-20-24z" fill="${a}"/><path d="M20 22l12 34 12-34M12 32h40M26 22l6 10 6-10" fill="none" stroke-width="1.6"/>
    <path d="M20 22h24l-4 10H24z" fill="${b}"/>
    <path d="M52 8v10M47 13h10M10 46v8M6 50h8" stroke="${GOLD_LT}" stroke-width="2.6"/>`,
  /** Tres llamas en fila que crecen: la racha larga. */
  'racha-larga': (a, b) =>
    [
      [14, 0.7],
      [30, 0.85],
      [48, 1],
    ]
      .map(
        ([x, k]) =>
          `<g transform="translate(${x} 54) scale(${k}) translate(-9 -38)"><path d="M9 2c9 10 12 17 8 26-2 6-6 10-8 10s-6-4-8-10C-3 19 3 12 9 2z" fill="${a}"/><path d="M9 16c4 5 5 9 3 13-1 2-2 4-3 4s-2-2-3-4c-2-4-1-8 3-13z" fill="${b}" stroke="none"/></g>`,
      )
      .join(''),
  /** Eslabones de cadena: la racha firme. */
  'racha-firme': (a, b) =>
    `<g transform="rotate(-35 32 32)"><rect x="6" y="24" width="24" height="16" rx="8" fill="none" stroke="${INK}" stroke-width="7"/><rect x="6" y="24" width="24" height="16" rx="8" fill="none" stroke="${a}" stroke-width="4"/>
    <rect x="34" y="24" width="24" height="16" rx="8" fill="none" stroke="${INK}" stroke-width="7"/><rect x="34" y="24" width="24" height="16" rx="8" fill="none" stroke="${a}" stroke-width="4"/>
    <rect x="20" y="25" width="24" height="14" rx="7" fill="none" stroke="${INK}" stroke-width="7"/><rect x="20" y="25" width="24" height="14" rx="7" fill="none" stroke="${b}" stroke-width="4"/></g>`,
  /** Sello de oro de ocho puntas con lacre: los sellos. */
  'gilded-seal': (a, b) =>
    `<path d="M32 4l6.8 14.2 14.8-5.6-5.6 14.8L62.2 32 48 38.8l5.6 14.8-14.8-5.6L32 60l-6.8-14.2-14.8 5.6 5.6-14.8L1.8 32 16 25.2l-5.6-14.8 14.8 5.6z" fill="${a}"/>
    <circle cx="32" cy="32" r="14" fill="${b}"/><path d="M32 22l7 10-7 10-7-10z" fill="#d6483f"/><path d="M28 27l2-3" stroke="#fff3d0" stroke-width="1.6"/>`,
  /** Tablero grande con la llave roja: los tableros largos. */
  'long-board': (a, b) =>
    `<rect x="8" y="8" width="48" height="48" rx="5" fill="${a}"/>
    <path d="M20 8v48M32 8v48M44 8v48M8 20h48M8 32h48M8 44h48" stroke="${b}" stroke-width="1.4"/>
    <rect x="12" y="25" width="28" height="13" rx="4" fill="#d9604f"/><path d="M40 31.5h14l-4-4M54 31.5l-4 4" fill="none" stroke="${GOLD_LT}" stroke-width="2.6"/>`,
  /** Hoja que flota sobre un reloj de arena: el respiro. */
  respiro: (a, b) =>
    `<rect x="16" y="8" width="32" height="5" rx="2" fill="${IRON}"/><rect x="16" y="51" width="32" height="5" rx="2" fill="${IRON}"/>
    <path d="M20 13h24c0 9-7 12-9 19 2 7 9 10 9 19H20c0-9 7-12 9-19-2-7-9-10-9-19z" fill="${b}"/>
    <path d="M24 46c2-5 5-6 8-6s6 1 8 6z" fill="${GOLD}" stroke="none"/>
    <path d="M30 22c8-10 20-8 24-6-4 8-14 14-24 6z" fill="${a}"/><path d="M30 22c8-2 14-4 24-6" fill="none" stroke-width="1.4"/>`,
  /** Pesa y copo de hielo: la holgura. */
  holgura: (a, b) =>
    `<path d="M10 52l5-22h18l5 22z" fill="${IRON}"/><circle cx="24" cy="25" r="5" fill="none" stroke-width="3"/>
    <text x="24" y="47" text-anchor="middle" font-family="Georgia,serif" font-weight="900" font-size="15" fill="${CREAM}" stroke="none">1</text>
    <g transform="translate(46 22)"><circle r="13" fill="${a}"/><path d="M0-10v20M-8.7-5l17.4 10M8.7-5L-8.7 5" stroke="${b}" stroke-width="2.4"/><circle r="2.6" fill="#fff" stroke="none"/></g>`,
  /** Rayo dentro de un círculo: la carga del poder. */
  carga: (a, b) =>
    `<circle cx="32" cy="32" r="25" fill="${a}"/><circle cx="32" cy="32" r="19" fill="none" stroke="${b}" stroke-width="2" stroke-dasharray="4 3"/>
    <path d="M36 10L20 36h11l-4 18 17-26H33z" fill="${GOLD_LT}"/>`,
  /** Orbe con ondas que se repiten: el eco del poder. */
  'power-echo': (a, b) =>
    `<path d="M14 14a26 26 0 0 0 0 36M50 14a26 26 0 0 1 0 36" fill="none" stroke="${a}" stroke-width="4"/>
    <path d="M21 20a17 17 0 0 0 0 24M43 20a17 17 0 0 1 0 24" fill="none" stroke="${b}" stroke-width="4"/>
    <circle cx="32" cy="32" r="9" fill="${a}"/><circle cx="29" cy="29" r="3" fill="#fff" stroke="none"/>`,
  /** Balanza de latón: el mercader. */
  mercader: (a, b) =>
    `<path d="M32 10v40M20 54h24" stroke-width="3"/><path d="M12 18h40" stroke-width="3"/><circle cx="32" cy="10" r="3" fill="${GOLD}"/>
    <path d="M12 18l-7 16h14zM52 18l-7 16h14z" fill="none" stroke-width="1.6"/>
    <path d="M3 34c0 5 18 5 18 0z" fill="${a}"/><path d="M43 34c0 5 18 5 18 0z" fill="${b}"/>
    <circle cx="9" cy="31" r="2.4" fill="${GOLD_LT}"/><circle cx="14" cy="31" r="2.4" fill="${GOLD_LT}"/>`,
  /** Bolsa con un farol asomando: pistas al tomarla. */
  bolsillo: (a, b) =>
    `<path d="M20 22h24l6 26c1 6-4 10-10 10H24c-6 0-11-4-10-10z" fill="${a}"/><path d="M22 22c-2-6 4-8 10-6 6-2 12 0 10 6" fill="${b}"/>
    <path d="M20 26h24" stroke-width="3"/>
    <g transform="translate(40 10)"><path d="M0 0h12l-2 4H2z" fill="${GOLD}"/><path d="M1 4h10l1 12H0z" fill="#fff0b8"/><path d="M6 7c2 2 2 4 0 6-2-2-2-4 0-6z" fill="#ff9a3c" stroke="none"/></g>`,
  /** Rosa de los vientos: la brújula. */
  brujula: (a, b) =>
    `<circle cx="32" cy="32" r="26" fill="${a}"/><circle cx="32" cy="32" r="20" fill="${b}"/>
    <path d="M32 8l5 24-5 24-5-24z" fill="${CREAM}"/><path d="M32 8l5 24h-10z" fill="#d9604f"/>
    <path d="M8 32l24-4 24 4-24 4z" fill="${IRON}" fill-opacity=".7"/><circle cx="32" cy="32" r="3" fill="${GOLD}"/>`,
  /** Ave de fuego con las alas abiertas: el fénix. */
  fenix: (a, b) =>
    `<path d="M32 52c-4-8-4-14 0-20 4 6 4 12 0 20z" fill="${b}"/>
    <path d="M30 34C20 32 10 22 6 10c10 4 16 6 22 14-2-8 0-14 4-18 4 4 6 10 4 18 6-8 12-10 22-14-4 12-14 22-24 24z" fill="${a}"/>
    <path d="M28 24c2 4 6 4 8 0" fill="none" stroke="${GOLD_LT}" stroke-width="1.6"/><circle cx="32" cy="17" r="1.8" fill="${INK}" stroke="none"/>
    <path d="M24 56c4-3 12-3 16 0" fill="none" stroke="${GOLD}" stroke-width="2.4"/>`,
  /** Brasero con brasas tibias: el revivir más barato. */
  'ceniza-tibia': (a, b) =>
    `<path d="M14 34h36l-6 16H20z" fill="${IRON}"/><path d="M20 50l-4 8M44 50l4 8M32 50v8" stroke-width="2.6"/>
    <path d="M18 34c2-8 8-6 10-12 4 6 2 8 6 12 2-6 6-8 6-14 4 6 6 10 6 14z" fill="${a}"/>
    <circle cx="24" cy="32" r="2.4" fill="${b}"/><circle cx="34" cy="31" r="2" fill="${GOLD_LT}"/><circle cx="42" cy="32" r="2.4" fill="${b}"/>
    <path d="M26 16c-2-3 0-5 2-7M38 14c-2-3 0-5 2-7" fill="none" stroke="${b}" stroke-width="1.6" stroke-dasharray="2 2"/>`,
  /** Gavilla de trigo atada: la cosecha. */
  cosecha: (a, b) =>
    `${[-16, -8, 0, 8, 16]
      .map(
        (r) =>
          `<g transform="rotate(${r} 32 56)"><path d="M32 56V18" stroke-width="2"/><path d="M32 14c-4 3-4 8 0 10 4-2 4-7 0-10zM32 22c-4 3-4 7 0 9 4-2 4-6 0-9z" fill="${a}"/></g>`,
      )
      .join('')}
    <path d="M22 42h20" stroke="${b}" stroke-width="5"/><path d="M22 42h20" stroke-width="1.4"/>`,

  /* ───── Pactos ───── */
  /** Espada clavada sobre un ojo cerrado: el juramento (sin poder). */
  juramento: (a, b) =>
    `<circle cx="32" cy="40" r="18" fill="${a}"/><path d="M18 42c8 7 20 7 28 0" fill="none" stroke="${b}" stroke-width="2.6"/>
    <path d="M22 46l-2 4M32 49v4M42 46l2 4" stroke="${b}" stroke-width="2"/>
    <path d="M29 4h6v30l-3 6-3-6z" fill="${CREAM}"/><path d="M22 14h20v5H22z" fill="${GOLD}"/><circle cx="32" cy="8" r="2" fill="${GOLD_LT}" stroke="none"/>`,
  /** Cristal agrietado: la racha de vidrio. */
  vidrio: (a, b) =>
    `<path d="M14 6h36l6 52H8z" fill="${b}" fill-opacity=".85"/><path d="M14 6h36l6 52H8z" fill="none" stroke-width="2.6"/>
    <path d="M32 30L22 6M32 30l14-24M32 30L12 46M32 30l20 14M32 30l-2 28" fill="none" stroke="${a}" stroke-width="1.8"/>
    <path d="M18 12l4 10" stroke="#fff" stroke-width="2"/>`,
  /** Cofre con candado: la tienda cerrada. */
  'pacto-mercante': (a, b) =>
    `<path d="M8 28h48v26H8z" fill="${a}"/><path d="M8 28c0-12 10-18 24-18s24 6 24 18z" fill="${b}"/>
    <path d="M8 36h48M20 28v26M44 28v26" stroke-width="1.6"/>
    <rect x="24" y="32" width="16" height="14" rx="3" fill="${IRON}"/><path d="M27 32v-5a5 5 0 0 1 10 0v5" fill="none" stroke-width="3"/><circle cx="32" cy="39" r="2" fill="${INK}" stroke="none"/>`,
  /** Campana tachada: el silencio (sin pistas). */
  silencio: (a, b) =>
    `<path d="M32 8c-10 0-14 8-14 18v10l-6 8h40l-6-8V26c0-10-4-18-14-18z" fill="${b}"/><circle cx="32" cy="50" r="5" fill="${a}"/>
    <path d="M24 18c2-4 4-5 7-6" fill="none" stroke="#fff" stroke-width="1.8"/>
    <path d="M8 56L56 8" stroke="${INK}" stroke-width="8"/><path d="M8 56L56 8" stroke="#d9604f" stroke-width="4"/>`,
  /** Equilibrista sobre la cuerda: −2 turnos. */
  'cuerda-floja': (a, b) =>
    `<path d="M2 44c20 6 40 6 60 0" fill="none" stroke-width="2.2"/><path d="M4 44v16M60 44v16" stroke-width="3"/>
    <path d="M10 26h44" stroke="${a}" stroke-width="3"/><circle cx="10" cy="26" r="3" fill="${a}"/><circle cx="54" cy="26" r="3" fill="${a}"/>
    <circle cx="32" cy="14" r="5" fill="${b}"/><path d="M32 19v14l-5 13M32 33l5 13M24 28l8-4 8 4" fill="none" stroke-width="2.6"/>`,
  /** Yelmo con penacho: el temerario (sin revivir). */
  temerario: (a, b) =>
    `<path d="M32 4c10 2 16 8 18 14-6-4-12-4-18-2z" fill="${a}"/>
    <path d="M14 34c0-12 8-20 18-20s18 8 18 20v18H38V40H26v12H14z" fill="${IRON}"/>
    <path d="M20 32h24v6H20z" fill="${INK}"/><path d="M32 14v18" stroke="${b}" stroke-width="2.4"/>
    <path d="M18 28c1-5 4-8 8-10" fill="none" stroke="${b}" stroke-width="1.8"/>`,
  /** Cáliz que entrega gotas de oro: la ofrenda. */
  ofrenda: (a, b) =>
    `<path d="M16 10h32c0 14-6 22-16 22S16 24 16 10z" fill="${a}"/><path d="M28 32h8v12h-8zM20 52c0-6 6-8 12-8s12 2 12 8z" fill="${b}"/>
    <path d="M20 14h24" stroke="${GOLD_LT}" stroke-width="2.4"/>
    <path d="M50 30c3 4 3 6 0 8-3-2-3-4 0-8zM56 40c2 3 2 5 0 6-2-1-2-3 0-6z" fill="${GOLD}"/>`,
  /** Péndulo con el disco partido: más turnos, menos puntos. */
  'pendulo-roto': (a, b) =>
    `<path d="M10 6h44" stroke-width="3"/><path d="M32 6l-8 32" stroke="${IRON}" stroke-width="3"/>
    <circle cx="22" cy="46" r="13" fill="${a}"/><circle cx="22" cy="46" r="8" fill="${b}"/>
    <path d="M14 36l7 9-3 4 6 8" fill="none" stroke="${INK}" stroke-width="2.4"/>
    <path d="M44 34a14 14 0 0 1 10 10M40 40a8 8 0 0 1 6 6" fill="none" stroke="${b}" stroke-width="2" stroke-dasharray="3 2"/>`,
  /** Cofre abierto que rebosa monedas: el botín. */
  botin: (a, b) =>
    `<path d="M8 32h48v22H8z" fill="${a}"/><path d="M8 32L14 14h36l6 18z" fill="${b}"/>
    <path d="M8 40h48M32 32v22" stroke-width="1.6"/>
    ${[
      [18, 28],
      [27, 25],
      [36, 26],
      [45, 28],
      [23, 20],
      [40, 20],
      [32, 17],
    ]
      .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="3.4" fill="${GOLD_LT}"/>`)
      .join('')}
    <rect x="28" y="36" width="8" height="8" rx="2" fill="${GOLD}"/>`,
};

/** SVG de la carta (sin marco): su emblema propio con sus colores. */
export function fateArt(card) {
  const draw = ART[card.id];
  const [a, b] = card.hue;
  return `<svg class="fate-art" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${draw ? draw(a, b) : ''}</svg>`;
}

/** Ids con ilustración (los tests comprueban que no falte ninguna). */
export const FATE_ART_IDS = Object.keys(ART);

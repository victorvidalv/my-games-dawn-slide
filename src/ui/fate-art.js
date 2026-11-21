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
  /** Anillos enlazados con gema: vínculo con los Pactos. */
  vinculo: (a, b) =>
    `<circle cx="24" cy="34" r="14" fill="none" stroke="${a}" stroke-width="6"/><circle cx="24" cy="34" r="14" fill="none" stroke="${INK}" stroke-width="2"/>
    <circle cx="40" cy="30" r="14" fill="none" stroke="${b}" stroke-width="6"/><circle cx="40" cy="30" r="14" fill="none" stroke="${INK}" stroke-width="2"/>
    <path d="M32 18l4 6-4 6-4-6z" fill="${GOLD_LT}"/>`,
  /** Ojo de cristal luminoso: lucidez (puntos por pistas guardadas). */
  lucidez: (a, b) =>
    `<path d="M6 32c8-13 18-18 26-18s18 5 26 18c-8 13-18 18-26 18S14 45 6 32z" fill="${b}"/>
    <circle cx="32" cy="32" r="11" fill="${a}"/><circle cx="32" cy="32" r="5" fill="${GOLD_LT}"/>
    <path d="M32 6v6M32 52v6M14 14l4 4M46 46l4 4M50 14l-4 4M18 46l-4 4" stroke="${a}" stroke-width="2"/>`,

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
  /** Vórtice oscuro con estrella final: el abismo (tramo final). */
  abismo: (a, b) =>
    `<circle cx="32" cy="32" r="24" fill="${a}"/><circle cx="32" cy="32" r="16" fill="#1a0b24"/>
    <path d="M12 24c8-10 32-10 40 0M12 40c8 10 32 10 40 0" fill="none" stroke="${b}" stroke-width="2.2"/>
    <path d="M32 19l3.2 9.8L45 32l-9.8 3.2L32 45l-3.2-9.8L19 32l9.8-3.2z" fill="${GOLD_LT}"/>`,
  /** Llamas gemelas cruzadas por un rayo: el frenesí (tableros largos, menos turnos). */
  frenesi: (a, b) =>
    `<path d="M32 6c12 10 20 20 18 34-1 10-8 18-18 18S15 50 14 40C12 26 20 16 32 6z" fill="${a}"/>
    <path d="M32 18c7 7 11 14 10 23-1 6-5 11-10 11s-9-5-10-11c-1-9 3-16 10-23z" fill="${b}"/>
    <path d="M36 10L24 32h10l-6 22 16-26H33z" fill="${GOLD_LT}"/>`,

  /* ───── Nuevas ───── */
  /** Flecha de fuego que sube por tres escalones: el impulso de la racha. */
  impulso: (a, b) =>
    `<path d="M8 54h14v-10h12v-10h12v-10h10v30H8z" fill="${b}"/><path d="M8 54h14v-10h12v-10h12v-10h10" fill="none" stroke-width="2.4"/>
    <path d="M14 40l22-22" stroke="${a}" stroke-width="5"/><path d="M28 14h12v12z" fill="${a}"/>
    <path d="M12 46c2-6 6-8 10-8-2 4-2 6 0 10-4 0-8-1-10-2z" fill="${GOLD_LT}"/>`,
  /** Pluma sobre un pergamino con una estrella: la maestría. */
  maestria: (a, b) =>
    `<path d="M12 18h34c4 0 6 3 6 6v28H18c-4 0-6-3-6-6z" fill="${CREAM}"/><path d="M12 18c0 4 3 6 6 6h34" fill="none" stroke-width="2"/>
    <path d="M20 34h18M20 41h14" stroke="${b}" stroke-width="2.4"/>
    <path d="M58 6C46 10 38 20 34 34l4 2C44 24 52 16 58 6z" fill="${a}"/><path d="M34 34l-2 6 6-4" fill="${INK}"/>
    <path d="M44 42l1.8 3.8 4.2.6-3 2.9.7 4.2-3.7-2-3.7 2 .7-4.2-3-2.9 4.2-.6z" fill="${GOLD}"/>`,
  /** Cuenco vacío bajo una hoja: el ascetismo (sin ayudas). */
  ascetismo: (a, b) =>
    `<path d="M10 34h44c0 12-10 20-22 20S10 46 10 34z" fill="${a}"/><path d="M10 34h44" stroke-width="2.6"/>
    <ellipse cx="32" cy="34" rx="20" ry="4" fill="${b}"/>
    <path d="M32 28c-8-2-12-10-10-20 8 2 12 10 10 20z" fill="#7fae62"/><path d="M32 28c-2-6-4-11-9-17" fill="none" stroke-width="1.4"/>
    <path d="M24 60h16" stroke-width="3"/>`,
  /** Llama que renace de un cráneo de ceniza: la reencarnación. */
  reencarnacion: (a, b) =>
    `<path d="M18 40c0-9 6-14 14-14s14 5 14 14c0 5-3 8-6 9v7H24v-7c-3-1-6-4-6-9z" fill="${CREAM}"/>
    <circle cx="26" cy="40" r="3.5" fill="${INK}" stroke="none"/><circle cx="38" cy="40" r="3.5" fill="${INK}" stroke="none"/>
    <path d="M28 56v-4M32 56v-4M36 56v-4" stroke-width="1.6"/>
    <path d="M32 2c8 7 11 13 8 19-2 4-5 6-8 6s-6-2-8-6c-3-6 0-12 8-19z" fill="${a}"/><path d="M32 12c3 4 4 7 2 10-1 2-1 2-2 2s-1 0-2-2c-2-3-1-6 2-10z" fill="${b}" stroke="none"/>`,
  /** Bolsa de oro rebosante con una pista que se escapa: la codicia. */
  codicia: (a, b) =>
    `<path d="M22 20c-10 8-14 18-12 26 2 8 10 12 22 12s20-4 22-12c2-8-2-18-12-26z" fill="${a}"/>
    <path d="M22 20l4-8h12l4 8z" fill="${b}"/><path d="M22 20h20" stroke-width="3"/>
    <circle cx="32" cy="40" r="7" fill="${GOLD_LT}"/><path d="M32 36v8M29 38h5a2 2 0 0 1 0 4h-5" fill="none" stroke-width="1.6"/>
    <path d="M50 8l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" fill="${CREAM}" fill-opacity=".7"/>`,
};

/** SVG de la carta (sin marco): su emblema propio con sus colores. */
export function fateArt(card) {
  const draw = ART[card.id];
  const [a, b] = card.hue;
  return `<svg class="fate-art" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${draw ? draw(a, b) : ''}</svg>`;
}

/** Ids con ilustración (los tests comprueban que no falte ninguna). */
export const FATE_ART_IDS = Object.keys(ART);

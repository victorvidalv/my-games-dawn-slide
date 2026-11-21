/* ============================ Cartas del destino ============================
 * Al cerrar cada ciudad (niveles 10, 20 … 90) se elige 1 carta entre 2 o 3 (según el héroe). Hay 27 cartas y 9 elecciones:
 *   · al empezar la aventura se baraja el mazo con la semilla de la partida (`run.fateDeck`);
 *   · la ciudad k (1..9) muestra las siguientes 2 o 3 cartas del mazo: se descartan elijas la que elijas, así que ninguna
 *     carta se repite en una partida (con 3 por ciudad pasan las 27; con 2, 18 de ellas) y el orden cambia cada vez;
 *   · las elegidas (`run.fate`) se acumulan hasta el final y sus efectos se suman.
 * Solo en Aventura (ni Diario, ni Práctica, ni Desafío). Todo son funciones puras sobre `run` (sin DOM).
 *
 * Efectos (`fx`), todos sumables:
 *   points        fracción extra de puntos en cada tablero (negativa en los costos)
 *   pointsPerCard fracción extra por cada carta que tengas (Constelación)
 *   longBoard     fracción extra en tableros con mínimo ≥ LONG_BOARD
 *   perfect       bono de Perfecto (sustituye el +20 % base por el valor más alto)
 *   streakCap     tope de la racha (5 = ×1,5; 7 = ×1,7)
 *   streakEff     eficiencia mínima para mantener la racha (0,9 base)
 *   perfectStreak la racha solo sigue con Perfecto
 *   seal          fracción extra de los sellos
 *   turns         turnos extra en cada tablero
 *   heavyIce      turnos extra en tableros con pieza pesada o de hielo
 *   powerShare    parte extra de tableros con el poder listo
 *   lastPower     usos extra del poder en el último tablero de cada ciudad
 *   shop          cambio de precio de la tienda (−0,15 = 15 % más barata; +0,25 = 25 % más cara)
 *   revives       revivir extra en la partida
 *   reviveShare   parte de los puntos que cuesta revivir (se usa la más baja)
 *   noPower · noShop · noSeals · noRevive   lo que apaga un Pacto
 *   pickHints · pickScore · pickBases        al tomar la carta: pistas, % de tus puntos, puntos base del tablero
 *   cityHints · cityBases                    al cerrar cada ciudad siguiente
 */
import { hash32, mulberry32 } from '../engine/rng.js';
import { baseScore } from '../engine/scoring.js';

export const FATE_PICKS = 9;
export const FATE_OFFER = 3;
/**
 * Cartas que ve cada héroe en cada cierre de ciudad (equilibrio de poderes, ver `npm run simulate`): el héroe más fuerte
 * elige entre menos cartas. Siempre se elige una; las que no se eligen se descartan.
 */
export const FATE_OFFER_BY_HERO = { lia: 2, jean: 3, van: 3 };
export const offerSize = (run) => FATE_OFFER_BY_HERO[run?.hero] ?? FATE_OFFER;
export const LONG_BOARD = 14;
/** Límites de la suma de todas las cartas. */
export const FATE_POINTS_RANGE = [-0.3, 0.75];
export const FATE_TURNS_RANGE = [-2, 3];

/**
 * Las 27 cartas. `art` es la ilustración propia de cada una (ver `ui/fate-art.js`) y `hue` sus dos colores.
 * `kind`: 'blessing' (solo beneficio) o 'pact' (beneficio con costo). `gain` y `cost` son los textos de la carta.
 */
export const FATE_CARDS = [
  /* ───── Bendiciones: puntaje ───── */
  {
    id: 'brillo',
    kind: 'blessing',
    name: 'Brillo',
    gain: '+5 % de puntos',
    hue: ['#f2c14e', '#fff1c1'],
    fx: { points: 0.05 },
  },
  {
    id: 'fortuna',
    kind: 'blessing',
    name: 'Fortuna',
    gain: '+8 % de puntos',
    hue: ['#e3a33b', '#ffe3a1'],
    fx: { points: 0.08 },
  },
  {
    id: 'constelacion',
    kind: 'blessing',
    name: 'Constelación',
    gain: '+2 % de puntos por cada carta del destino que tengas',
    hue: ['#7b84e8', '#dfe2ff'],
    fx: { pointsPerCard: 0.02 },
  },
  {
    id: 'destello',
    kind: 'blessing',
    name: 'Destello',
    gain: 'El bono de Perfecto sube de +20 % a +35 %',
    hue: ['#5fd0e6', '#e0fbff'],
    fx: { perfect: 0.35 },
  },
  {
    id: 'racha-larga',
    kind: 'blessing',
    name: 'Racha larga',
    gain: 'El tope de racha sube de ×1,5 a ×1,7',
    hue: ['#ef8a4b', '#ffe0c7'],
    fx: { streakCap: 7 },
  },
  {
    id: 'racha-firme',
    kind: 'blessing',
    name: 'Racha firme',
    gain: 'La racha sigue con 80 % de eficiencia (antes 90 %)',
    hue: ['#d96c6c', '#ffd8d2'],
    fx: { streakEff: 0.8 },
  },
  {
    id: 'gilded-seal',
    kind: 'blessing',
    name: 'Sello dorado',
    gain: 'Los sellos dan +50 %',
    hue: ['#c9a227', '#fbeaa5'],
    fx: { seal: 0.5 },
  },
  {
    id: 'long-board',
    kind: 'blessing',
    name: 'Gran tablero',
    gain: `Tableros de ${LONG_BOARD} movimientos mínimos o más: +15 % de puntos`,
    hue: ['#5f9e7a', '#d5f2df'],
    fx: { longBoard: 0.15 },
  },
  /* ───── Bendiciones: turnos ───── */
  {
    id: 'respiro',
    kind: 'blessing',
    name: 'Respiro',
    gain: '+1 turno en cada tablero',
    hue: ['#68c3a3', '#dbf7ec'],
    fx: { turns: 1 },
  },
  {
    id: 'holgura',
    kind: 'blessing',
    name: 'Holgura',
    gain: 'Tableros con pieza pesada o de hielo: +2 turnos',
    hue: ['#79a9d6', '#e0efff'],
    fx: { heavyIce: 2 },
  },
  /* ───── Bendiciones: poder del héroe ───── */
  {
    id: 'carga',
    kind: 'blessing',
    name: 'Carga',
    gain: 'El poder del héroe está listo en más tableros',
    hue: ['#a77ee0', '#eee0ff'],
    fx: { powerShare: 0.15 },
  },
  {
    id: 'power-echo',
    kind: 'blessing',
    name: 'Eco del poder',
    gain: '+1 uso del poder en el último tablero de cada ciudad',
    hue: ['#c26fd1', '#f7dcff'],
    fx: { lastPower: 1 },
  },
  /* ───── Bendiciones: tienda, pistas y revivir ───── */
  {
    id: 'mercader',
    kind: 'blessing',
    name: 'Mercader',
    gain: 'Tienda −15 %',
    hue: ['#b7874f', '#f6e0c0'],
    fx: { shop: -0.15 },
  },
  {
    id: 'bolsillo',
    kind: 'blessing',
    name: 'Bolsillo',
    gain: '+3 pistas al tomarla',
    hue: ['#e0b04a', '#fff0c4'],
    fx: { pickHints: 3 },
  },
  {
    id: 'brujula',
    kind: 'blessing',
    name: 'Brújula',
    gain: '+1 pista al cerrar cada ciudad',
    hue: ['#4fa6b8', '#d4f3f9'],
    fx: { cityHints: 1 },
  },
  {
    id: 'fenix',
    kind: 'blessing',
    name: 'Fénix',
    gain: '+1 revivir en la partida',
    hue: ['#e8633a', '#ffd5b8'],
    fx: { revives: 1 },
  },
  {
    id: 'ceniza-tibia',
    kind: 'blessing',
    name: 'Ceniza tibia',
    gain: 'Revivir cuesta el 20 % de tus puntos (antes 33 %)',
    hue: ['#b06a5a', '#f5d6cc'],
    fx: { reviveShare: 0.2 },
  },
  {
    id: 'cosecha',
    kind: 'blessing',
    name: 'Cosecha',
    gain: 'Al cerrar cada ciudad ganas los puntos base de 1 tablero',
    hue: ['#9bb043', '#eef6c8'],
    fx: { cityBases: 1 },
  },
  /* ───── Pactos: beneficio con costo ───── */
  {
    id: 'juramento',
    kind: 'pact',
    name: 'Juramento',
    gain: '+20 % de puntos',
    cost: 'El poder del héroe se apaga',
    hue: ['#8e3b5f', '#f2c6d8'],
    fx: { points: 0.2, noPower: true },
  },
  {
    id: 'vidrio',
    kind: 'pact',
    name: 'Vidrio',
    gain: '+25 % de puntos',
    cost: 'La racha solo sigue con Perfecto',
    hue: ['#4c8fa8', '#d6f1fb'],
    fx: { points: 0.25, perfectStreak: true },
  },
  {
    id: 'pacto-mercante',
    kind: 'pact',
    name: 'Pacto mercante',
    gain: '+15 % de puntos',
    cost: 'Tienda cerrada (revivir sigue)',
    hue: ['#8a6a2f', '#f0dcae'],
    fx: { points: 0.15, noShop: true },
  },
  {
    id: 'eclipse',
    kind: 'pact',
    name: 'Eclipse',
    gain: '+12 % de puntos',
    cost: 'Los sellos no dan puntos',
    hue: ['#5a5f86', '#dcdff5'],
    fx: { points: 0.12, noSeals: true },
  },
  {
    id: 'cuerda-floja',
    kind: 'pact',
    name: 'Cuerda floja',
    gain: '+30 % de puntos',
    cost: '−2 turnos en cada tablero',
    hue: ['#b84a3a', '#ffd3c9'],
    fx: { points: 0.3, turns: -2 },
  },
  {
    id: 'temerario',
    kind: 'pact',
    name: 'Temerario',
    gain: '+15 % de puntos',
    cost: 'No puedes revivir',
    hue: ['#a1322f', '#ffc9c2'],
    fx: { points: 0.15, noRevive: true },
  },
  {
    id: 'ofrenda',
    kind: 'pact',
    name: 'Ofrenda',
    gain: '+12 % de puntos el resto de la partida',
    cost: 'Pierdes el 15 % de tus puntos ahora',
    hue: ['#7d4a9e', '#ead6f7'],
    fx: { points: 0.12, pickScore: -0.15 },
  },
  {
    id: 'pendulo-roto',
    kind: 'pact',
    name: 'Péndulo roto',
    gain: '+3 turnos en cada tablero',
    cost: '−15 % de puntos',
    hue: ['#4a7a6a', '#d3efe4'],
    fx: { turns: 3, points: -0.15 },
  },
  {
    id: 'botin',
    kind: 'pact',
    name: 'Botín',
    gain: 'Ganas ahora los puntos base de 3 tableros',
    cost: 'La tienda cuesta +25 %',
    hue: ['#b3832a', '#ffe6a8'],
    fx: { pickBases: 3, shop: 0.25 },
  },
];

const BY_ID = new Map(FATE_CARDS.map((c) => [c.id, c]));
export const fateById = (id) => BY_ID.get(id);

/** ¿Lleva cartas del destino esta partida? (solo Aventura) */
export const usesFate = (run) => !!run && !run.daily && !run.survival && run.mode !== 'p';

/** Mazo barajado de la partida (orden de las 27 cartas), siempre el mismo para la misma semilla. */
export function fateDeck(seed) {
  const rng = mulberry32(hash32(seed | 0, 0x4fa7e));
  const ids = FATE_CARDS.map((c) => c.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

/** Mazo de la partida (lo crea si falta: partidas guardadas de antes de las cartas). */
export function deckOf(run) {
  const valid =
    Array.isArray(run.fateDeck) && run.fateDeck.length === FATE_CARDS.length && run.fateDeck.every(fateById);
  if (!valid) run.fateDeck = fateDeck(run.seed);
  return run.fateDeck;
}

/** Cartas elegidas (objetos), en el orden en que se tomaron. */
export const fateCards = (run) => (run?.fate || []).map(fateById).filter(Boolean);
export const hasFate = (run, id) => !!run?.fate?.includes(id);

/**
 * Las cartas que ofrece el cierre de la ciudad `city` (1..9 = tras los niveles 10..90): 2 o 3 según el héroe (`size`).
 * Cada ciudad toma las siguientes del mazo barajado, así que nunca se repite una carta en la misma partida.
 */
export function fateOffer(run, city, size = offerSize(run)) {
  if (city < 1 || city > FATE_PICKS) return [];
  const from = (city - 1) * size;
  return deckOf(run)
    .slice(from, from + size)
    .map(fateById);
}

/** ¿Toca elegir carta al superar el nivel `level`? (10, 20 … 90, y aún no se eligió en esa ciudad) */
export const needsFatePick = (run, level) =>
  usesFate(run) && level % 10 === 0 && level / 10 <= FATE_PICKS && (run.fatePicked || 0) < level / 10;

const clamp = (x, [lo, hi]) => Math.max(lo, Math.min(hi, x));

/** Suma de los efectos de todas las cartas de la partida. */
export function fateTotals(run) {
  const t = {
    points: 0,
    pointsPerCard: 0,
    longBoard: 0,
    perfect: 0,
    streakCap: 0,
    streakEff: 0,
    perfectStreak: false,
    seal: 0,
    turns: 0,
    heavyIce: 0,
    powerShare: 0,
    lastPower: 0,
    shop: 0,
    revives: 0,
    reviveShare: 0,
    noPower: false,
    noShop: false,
    noSeals: false,
    noRevive: false,
    cityHints: 0,
    cityBases: 0,
  };
  if (!usesFate(run)) return t;
  for (const card of fateCards(run))
    for (const [k, v] of Object.entries(card.fx)) {
      if (!(k in t)) continue;
      if (typeof v === 'boolean') t[k] ||= v;
      else if (k === 'perfect' || k === 'streakCap') t[k] = Math.max(t[k], v);
      else if (k === 'streakEff' || k === 'reviveShare') t[k] = t[k] ? Math.min(t[k], v) : v;
      else t[k] += v;
    }
  return t;
}

/** Tablero de mecánicas pesadas o de hielo (para Holgura). */
const heavyOrIce = (G) => !!G?.pieces?.some((p) => p.kind === 'heavy' || p.kind === 'ice');

/** Fracción extra de puntos de las cartas en el tablero `G` (con los límites de la suma). */
export function fatePoints(run, G) {
  const t = fateTotals(run);
  const count = fateCards(run).length;
  const long = G && G.opt >= LONG_BOARD ? t.longBoard : 0;
  return clamp(t.points + t.pointsPerCard * count + long, FATE_POINTS_RANGE);
}

/** Turnos extra (o menos) de las cartas en el tablero `G`. Nunca deja el límite por debajo de mínimo + 1 (eso lo hace quien suma). */
export function fateTurns(run, G) {
  const t = fateTotals(run);
  return clamp(t.turns + (heavyOrIce(G) ? t.heavyIce : 0), FATE_TURNS_RANGE);
}

/** Reglas del puntaje que cambian las cartas (bono de Perfecto, tope y umbral de la racha). */
export function fateRules(run) {
  const t = fateTotals(run);
  return {
    perfect: Math.max(0.2, t.perfect),
    streakCap: Math.max(5, t.streakCap),
    streakEff: t.perfectStreak ? 1 : t.streakEff || 0.9,
  };
}

/** ¿Sigue la racha con esta eficiencia? */
export const keepsStreak = (run, eff) => eff >= fateRules(run).streakEff;

/** Cambio de precio de la tienda por las cartas (negativo = descuento). */
export const fateShop = (run) => fateTotals(run).shop;

/** ¿Apaga un Pacto esta ayuda? kind: 'power' | 'shop' | 'seals' | 'revive' */
export function fateBlocks(run, kind) {
  const t = fateTotals(run);
  return { power: t.noPower, shop: t.noShop, seals: t.noSeals, revive: t.noRevive }[kind] || false;
}

/** Parte extra de tableros con el poder listo. */
export const fatePowerShare = (run) => fateTotals(run).powerShare;
/** Usos extra del poder en el tablero `level` (Eco del poder: el último de cada ciudad). */
export const fatePowerUses = (run, level) => (level % 10 === 0 ? fateTotals(run).lastPower : 0);
/** Revivir extra de la partida y parte de los puntos que cuesta (0 = la normal). */
export const fateRevives = (run) => fateTotals(run).revives;
export const fateReviveShare = (run) => fateTotals(run).reviveShare;
/** Fracción extra de los sellos. */
export const fateSeal = (run) => fateTotals(run).seal;

/** ¿Deja una carta sin efecto a otra ya elegida o futura? (Eclipse con Sello dorado, Juramento con las de poder…) */
const MUTED_BY = {
  noPower: ['carga', 'power-echo'],
  noSeals: ['gilded-seal'],
  noShop: ['mercader', 'botin'],
  noRevive: ['fenix', 'ceniza-tibia'],
};
export function fateMuted(run, id) {
  const t = fateTotals(run);
  return Object.entries(MUTED_BY).some(([flag, ids]) => t[flag] && ids.includes(id));
}

/**
 * Elige la carta `id` de la oferta de la ciudad `city`: la suma a la partida y aplica lo inmediato.
 * `base` = puntos base del último tablero (para Botín). Devuelve lo que cambió ({hints, score}) o null si no vale.
 */
export function pickFate(run, id, city, base = 0) {
  if (!usesFate(run) || (run.fatePicked || 0) >= city) return null;
  if (!fateOffer(run, city).some((c) => c.id === id)) return null;
  run.fate = [...(run.fate || []), id];
  run.fatePicked = city;
  const fx = fateById(id).fx;
  const out = { hints: 0, score: 0 };
  if (fx.pickHints) out.hints += fx.pickHints;
  if (fx.pickScore) out.score += Math.round((run.score || 0) * fx.pickScore);
  if (fx.pickBases) out.score += fx.pickBases * base;
  run.hints = (run.hints || 0) + out.hints;
  run.score = Math.max(0, (run.score || 0) + out.score);
  return out;
}

/**
 * Lo que dan las cartas ya elegidas al cerrar la ciudad `city` (Brújula, Cosecha), una sola vez por ciudad (sobrevive a
 * recargas). Se cobra ANTES de elegir la carta nueva. `opt` = mínimo del último tablero. Devuelve null si ya se cobró.
 */
export function fateCityRewards(run, city, opt) {
  if (!usesFate(run) || (run.fateCityPaid || 0) >= city) return null;
  run.fateCityPaid = city;
  const t = fateTotals(run);
  const out = { hints: t.cityHints, score: t.cityBases * baseScore(opt) };
  run.hints = (run.hints || 0) + out.hints;
  run.score = (run.score || 0) + out.score;
  return out;
}

/** Resumen de lo que suman todas las cartas (para el panel de cartas activas). */
export function fateSummary(run, G) {
  const t = fateTotals(run);
  return {
    cards: fateCards(run),
    points: fatePoints(run, G),
    turns: fateTurns(run, G),
    totals: t,
  };
}

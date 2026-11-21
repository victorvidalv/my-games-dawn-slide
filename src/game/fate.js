/* ============================ Cartas del destino ============================
 * Al cerrar cada tramo (niveles 3, 6, 9, 12, 15 y 18) se elige 1 carta entre 3. Hay 24 cartas (16 bendiciones y 8 pactos) y 6 elecciones:
 *   · al empezar la aventura se baraja el mazo con la semilla de la partida (`run.fateDeck`);
 *   · el tramo k (1..6) muestra las siguientes 3 cartas del mazo: se descartan elijas la que elijas, así que ninguna
 *     carta se repite en una partida (pasan 18 de las 24) y el orden cambia cada vez;
 *   · las elegidas (`run.fate`) se acumulan hasta el final y sus efectos se suman.
 * Solo en Aventura (ni Diario, ni Práctica, ni Desafío). Todo son funciones puras sobre `run` (sin DOM).
 */
import { hash32, mulberry32 } from '../engine/rng.js';
import { baseScore } from '../engine/scoring.js';
import { hasCurse } from '../engine/calibration.js';

export const FATE_EVERY = 3;
export const FATE_PICKS = 6;
export const FATE_OFFER = 3;
export const FATE_OFFER_BY_HERO = { lia: 3, jean: 3, van: 3 };
export const offerSize = (run) => FATE_OFFER_BY_HERO[run?.hero] ?? FATE_OFFER;
export const LONG_BOARD = 14;
export const FINAL_LEG_START = 19;
/** Límites de la suma de todas las cartas. */
export const FATE_POINTS_RANGE = [-0.3, 0.9];
export const FATE_TURNS_RANGE = [-2, 3];

/**
 * Las 24 cartas (16 bendiciones, 8 pactos). `hue` son sus dos colores; el arte vive en `ui/fate-art.js`.
 */
export const FATE_CARDS = [
  /* ───── Bendiciones: puntaje ───── */
  {
    id: 'brillo',
    kind: 'blessing',
    name: 'Brillo',
    gain: '+15 % de puntos si no usas pistas en el tablero',
    hue: ['#f2c14e', '#fff1c1'],
    fx: { noHintPoints: 0.15 },
  },
  {
    id: 'fortuna',
    kind: 'blessing',
    name: 'Fortuna',
    gain: '+12 % de puntos en cada tablero',
    hue: ['#e3a33b', '#ffe3a1'],
    fx: { points: 0.12 },
  },
  {
    id: 'constelacion',
    kind: 'blessing',
    name: 'Constelación',
    gain: '+3 % de puntos por cada carta que tengas',
    hue: ['#7b84e8', '#dfe2ff'],
    fx: { pointsPerCard: 0.03 },
  },
  {
    id: 'destello',
    kind: 'blessing',
    name: 'Destello',
    gain: 'Bono de Perfecto sube de +20 % a +40 %',
    hue: ['#5fd0e6', '#e0fbff'],
    fx: { perfect: 0.4 },
  },
  {
    id: 'racha-larga',
    kind: 'blessing',
    name: 'Racha larga',
    gain: 'La racha llega hasta ×1,8 (antes ×1,5)',
    hue: ['#ef8a4b', '#ffe0c7'],
    fx: { streakCap: 8 },
  },
  {
    id: 'racha-firme',
    kind: 'blessing',
    name: 'Racha firme',
    gain: 'Mantienes racha con 80 % de eficiencia (antes 90 %)',
    hue: ['#d96c6c', '#ffd8d2'],
    fx: { streakEff: 0.8 },
  },
  {
    id: 'long-board',
    kind: 'blessing',
    name: 'Gran tablero',
    gain: `+20 % de puntos en tableros de ${LONG_BOARD}+ mov. mínimos`,
    hue: ['#5f9e7a', '#d5f2df'],
    fx: { longBoard: 0.2 },
  },
  {
    id: 'ceniza-tibia',
    kind: 'blessing',
    name: 'Ceniza tibia',
    gain: '+25 % de puntos en tableros con maleficio',
    hue: ['#b06a5a', '#f5d6cc'],
    fx: { cursePoints: 0.25 },
  },
  /* ───── Bendiciones: turnos ───── */
  {
    id: 'respiro',
    kind: 'blessing',
    name: 'Respiro',
    gain: '+1 turno extra en cada tablero',
    hue: ['#68c3a3', '#dbf7ec'],
    fx: { turns: 1 },
  },
  {
    id: 'holgura',
    kind: 'blessing',
    name: 'Holgura',
    gain: '+2 turnos extra si hay pieza pesada o hielo',
    hue: ['#79a9d6', '#e0efff'],
    fx: { heavyIce: 2 },
  },
  /* ───── Bendiciones: poder del héroe ───── */
  {
    id: 'carga',
    kind: 'blessing',
    name: 'Carga',
    gain: 'Tu poder nunca descansa (Lía: +1 turno en cada tablero)',
    hue: ['#a77ee0', '#eee0ff'],
    fx: { powerShare: 1, liaTurns: 1 },
  },
  {
    id: 'power-echo',
    kind: 'blessing',
    name: 'Eco del poder',
    gain: '+1 uso de poder en el 3.er tablero (Lía: +2 turnos allí)',
    hue: ['#c26fd1', '#f7dcff'],
    fx: { lastPower: 1, liaLastTurns: 2 },
  },
  /* ───── Bendiciones: pistas, revivir y cierre ───── */
  {
    id: 'bolsillo',
    kind: 'blessing',
    name: 'Bolsillo',
    gain: '+3 pistas inmediatas al elegirla',
    hue: ['#e0b04a', '#fff0c4'],
    fx: { pickHints: 3 },
  },
  {
    id: 'brujula',
    kind: 'blessing',
    name: 'Brújula',
    gain: '+1 pista ahora y +1 al cerrar cada tramo',
    hue: ['#4fa6b8', '#d4f3f9'],
    fx: { pickHints: 1, cityHints: 1 },
  },
  {
    id: 'fenix',
    kind: 'blessing',
    name: 'Fénix',
    gain: 'Desbloquea 1 revivir en esta partida',
    hue: ['#e8633a', '#ffd5b8'],
    fx: { revives: 1 },
  },
  {
    id: 'cosecha',
    kind: 'blessing',
    name: 'Cosecha',
    gain: '+1,5 tableros de puntos al cerrar cada tramo (incluye el 21)',
    hue: ['#9bb043', '#eef6c8'],
    fx: { cityBases: 1.5 },
  },
  {
    id: 'vinculo',
    kind: 'blessing',
    name: 'Vínculo',
    gain: '+10 % de puntos por cada Pacto que lleves',
    hue: ['#b83a7c', '#ffd6eb'],
    fx: { pactPoints: 0.1 },
  },
  {
    id: 'lucidez',
    kind: 'blessing',
    name: 'Lucidez',
    gain: '+5 % de puntos por cada pista guardada (máx. +30 %)',
    hue: ['#1e8ea8', '#c6f6ff'],
    fx: { hintPoints: 0.05, hintCap: 0.3 },
  },
  /* ───── Pactos: beneficio con costo ───── */
  {
    id: 'juramento',
    kind: 'pact',
    name: 'Juramento',
    gain: '+25 % de puntos',
    cost: 'Apaga el poder de tu héroe',
    hue: ['#8e3b5f', '#f2c6d8'],
    fx: { points: 0.25, noPower: true },
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
    gain: '+20 % de puntos',
    cost: 'No puedes usar pistas',
    hue: ['#a1322f', '#ffc9c2'],
    fx: { points: 0.2, noHints: true },
  },
  {
    id: 'ofrenda',
    kind: 'pact',
    name: 'Ofrenda',
    gain: '+18 % de puntos el resto de la partida',
    cost: 'Pierdes 15 % de tus puntos ahora',
    hue: ['#7d4a9e', '#ead6f7'],
    fx: { points: 0.18, pickScore: -0.15 },
  },
  {
    id: 'pendulo-roto',
    kind: 'pact',
    name: 'Péndulo roto',
    gain: '+3 turnos extra en cada tablero',
    cost: '−15 % de puntos en cada tablero',
    hue: ['#4a7a6a', '#d3efe4'],
    fx: { turns: 3, points: -0.15 },
  },
  {
    id: 'abismo',
    kind: 'pact',
    name: 'Abismo',
    gain: '+40 % de puntos en los 3 últimos tableros (19–21)',
    cost: 'Pierdes 20 % de tus puntos ahora',
    hue: ['#5c2a6e', '#e5c8f7'],
    fx: { finalPoints: 0.4, pickScore: -0.2 },
  },
  {
    id: 'frenesi',
    kind: 'pact',
    name: 'Frenesí',
    gain: `+25 % de puntos en tableros de ${LONG_BOARD}+ mov. mínimos`,
    cost: '−1 turno en cada tablero',
    hue: ['#c9532b', '#ffd8c4'],
    fx: { longBoard: 0.25, turns: -1 },
  },
];

const BY_ID = new Map(FATE_CARDS.map((c) => [c.id, c]));
export const fateById = (id) => BY_ID.get(id);

/** ¿Lleva cartas del destino esta partida? (solo Aventura) */
export const usesFate = (run) => !!run && !run.daily && !run.survival && run.mode !== 'p';

/** Mazo barajado de la partida (orden de las 24 cartas), siempre el mismo para la misma semilla. */
export function fateDeck(seed) {
  const rng = mulberry32(hash32(seed | 0, 0x4fa7e));
  const ids = FATE_CARDS.map((c) => c.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

/** Mazo de la partida (lo crea si falta: partidas guardadas de otra versión del mazo). */
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
 * Las cartas que ofrece el cierre del tramo `city` (1..6 = tras los niveles 3, 6, 9, 12, 15, 18): 3 cartas.
 * Si se usó el cambio de cartas en este tramo, saca 3 cartas nuevas de la reserva al final del mazo.
 */
export function fateOffer(run, city, size = offerSize(run)) {
  if (city < 1 || city > FATE_PICKS) return [];
  const from = run?.fateRerollCity === city ? FATE_PICKS * size : (city - 1) * size;
  return deckOf(run)
    .slice(from, from + size)
    .map(fateById);
}

/** ¿Puede cambiar las 3 cartas ofrecidas en este tramo? (1 vez por partida) */
export const canRerollFate = (run, city) =>
  usesFate(run) && !run.fateRerollCity && city >= 1 && city <= FATE_PICKS && (run.fatePicked || 0) < city;

/** Usa el cambio único de la partida en el tramo `city` y devuelve la nueva oferta de 3 cartas. */
export function rerollFate(run, city) {
  if (!canRerollFate(run, city)) return null;
  run.fateRerollCity = city;
  return fateOffer(run, city);
}

/** ¿Toca elegir carta al superar el nivel `level`? (3, 6, 9, 12, 15, 18, y aún no se eligió en ese tramo) */
export const needsFatePick = (run, level) =>
  usesFate(run) &&
  level % FATE_EVERY === 0 &&
  level / FATE_EVERY <= FATE_PICKS &&
  (run.fatePicked || 0) < level / FATE_EVERY;

const clamp = (x, [lo, hi]) => Math.max(lo, Math.min(hi, x));

/** Suma de los efectos de todas las cartas de la partida. */
export function fateTotals(run) {
  const t = {
    points: 0,
    pointsPerCard: 0,
    pactPoints: 0,
    hintPoints: 0,
    hintCap: 0,
    noHintPoints: 0,
    longBoard: 0,
    cursePoints: 0,
    finalPoints: 0,
    perfect: 0,
    streakCap: 0,
    streakEff: 0,
    perfectStreak: false,
    turns: 0,
    heavyIce: 0,
    liaTurns: 0,
    liaLastTurns: 0,
    powerShare: 0,
    lastPower: 0,
    revives: 0,
    noPower: false,
    noHints: false,
    cityHints: 0,
    cityBases: 0,
  };
  if (!usesFate(run)) return t;
  for (const card of fateCards(run))
    for (const [k, v] of Object.entries(card.fx)) {
      if (!(k in t)) continue;
      if (typeof v === 'boolean') t[k] ||= v;
      else if (k === 'perfect' || k === 'streakCap' || k === 'hintCap') t[k] = Math.max(t[k], v);
      else if (k === 'streakEff') t[k] = t[k] ? Math.min(t[k], v) : v;
      else t[k] += v;
    }
  return t;
}

/** Tablero de mecánicas pesadas o de hielo (para Holgura). */
const heavyOrIce = (G) => !!G?.pieces?.some((p) => p.kind === 'heavy' || p.kind === 'ice');

/** Fracción extra de puntos de las cartas en el tablero `G` (con los límites de la suma). */
export function fatePoints(run, G) {
  const t = fateTotals(run);
  const cards = fateCards(run);
  const count = cards.length;
  const pacts = cards.filter((c) => c.kind === 'pact').length;
  const pactBonus = t.pactPoints * pacts;
  const hintBonus = t.hintPoints && !t.noHints ? Math.min(t.hintCap || 0.3, (run?.hints || 0) * t.hintPoints) : 0;
  const noHint = !G?.n || run?.helpAt !== G.n ? t.noHintPoints : 0;
  const long = G && G.opt >= LONG_BOARD ? t.longBoard : 0;
  const curse = G && Number.isFinite(G.n) && hasCurse(G.n) ? t.cursePoints : 0;
  const finalLeg = G && Number.isFinite(G.n) && G.n >= FINAL_LEG_START ? t.finalPoints : 0;
  return clamp(t.points + t.pointsPerCard * count + pactBonus + hintBonus + noHint + long + curse + finalLeg, FATE_POINTS_RANGE);
}

/** Turnos extra (o menos) de las cartas en el tablero `G`. Nunca deja el límite por debajo de mínimo + 1 (eso lo hace quien suma). */
export function fateTurns(run, G) {
  const t = fateTotals(run);
  const isLia = run?.hero === 'lia' && !t.noPower;
  const liaExtra = isLia ? t.liaTurns + (G && Number.isFinite(G.n) && G.n % FATE_EVERY === 0 ? t.liaLastTurns : 0) : 0;
  return clamp(t.turns + (heavyOrIce(G) ? t.heavyIce : 0) + liaExtra, FATE_TURNS_RANGE);
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

/** ¿Apaga un Pacto esta ayuda? kind: 'power' | 'hints' */
export function fateBlocks(run, kind) {
  const t = fateTotals(run);
  return { power: t.noPower, hints: t.noHints }[kind] || false;
}

/** Parte extra de tableros con el poder listo. */
export const fatePowerShare = (run) => fateTotals(run).powerShare;
/** Usos extra del poder en el tablero `level` (Eco del poder: el último de cada tramo). */
export const fatePowerUses = (run, level) => (level % FATE_EVERY === 0 ? fateTotals(run).lastPower : 0);
/** Revivir extra de la partida (Fénix suma uno). */
export const fateRevives = (run) => fateTotals(run).revives;

/** ¿Deja una carta sin efecto a otra ya elegida o futura? (Juramento con las de poder, Temerario con las de pistas…) */
const MUTED_BY = {
  noPower: ['carga', 'power-echo'],
  noHints: ['bolsillo', 'brujula', 'lucidez'],
};
export function fateMuted(run, id) {
  const t = fateTotals(run);
  return Object.entries(MUTED_BY).some(([flag, ids]) => t[flag] && ids.includes(id));
}

/**
 * Elige la carta `id` de la oferta del tramo `city`: la suma a la partida y aplica lo inmediato.
 * Devuelve lo que cambió ({hints, score}) o null si no vale.
 */
export function pickFate(run, id, city, base = 0) {
  if (!usesFate(run) || (run.fatePicked || 0) >= city) return null;
  if (!fateOffer(run, city).some((c) => c.id === id)) return null;
  run.fate = [...(run.fate || []), id];
  run.fatePicked = city;
  const fx = fateById(id).fx;
  const out = { hints: 0, score: 0 };
  if (fx.pickHints && !fateBlocks(run, 'hints')) out.hints += fx.pickHints;
  if (fx.pickScore) out.score += Math.round((run.score || 0) * fx.pickScore);
  if (fx.pickBases) out.score += Math.round(fx.pickBases * base);
  run.hints = (run.hints || 0) + out.hints;
  run.score = Math.max(0, (run.score || 0) + out.score);
  return out;
}

/**
 * Lo que dan las cartas ya elegidas al cerrar el tramo `city` (Brújula, Cosecha), una sola vez por tramo (sobrevive a
 * recargas). Se cobra ANTES de elegir la carta nueva (y también al cerrar el tramo final 7).
 */
export function fateCityRewards(run, city, opt) {
  if (!usesFate(run) || (run.fateCityPaid || 0) >= city) return null;
  run.fateCityPaid = city;
  const t = fateTotals(run);
  const out = {
    hints: fateBlocks(run, 'hints') ? 0 : t.cityHints,
    score: Math.round(t.cityBases * baseScore(opt)),
  };
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

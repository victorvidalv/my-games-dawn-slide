/**
 * Genera src/game/unlock-plan.js: lo que hay que hacer en el juego para desbloquear cada objeto de Personalizar
 * (explicado con detalle en docs/desbloqueos.md). Principios:
 *   · Ningún desbloqueo es trivial: hasta los comunes piden esfuerzo real (decenas de tableros, varios días de retos…).
 *   · Cuentan todos los modos: Aventura, Desafío y Retos diarios (con sus rachas); cada categoría los mezcla.
 *   · Lo complejo es de las legendarias: piden VARIAS condiciones a la vez, una de cada modo, y hitos grandes
 *     (completar Experto, rango S+, racha de 30 días, las 3 rutas de Desafío…).
 *   · Cada rareza tiene su ventana de tiempo para el jugador regular (scripts/lib/unlock-model.mjs):
 *       común 1–5 días · rara 6–22 · épica 28–70 (2 condiciones) · legendaria 75–220 (3 condiciones).
 *   · Dentro de una categoría las metas crecen de un objeto al siguiente y no se repite la misma acción en vecinos.
 *
 * Ojo: el plan versionado se retocó a mano después (atuendos que piden ganar Difícil con su héroe, las estelas del tablero 14/15
 * del Desafío…), así que volver a generar lo pisa: revisa el diff antes de guardarlo.
 *
 *   node scripts/plan-unlocks.mjs        → reescribe src/game/unlock-plan.js
 *   node scripts/analyze-unlocks.mjs     → cuándo llegaría cada objeto un jugador casual, regular y dedicado
 */
import { writeFileSync } from 'node:fs';
import { OUTFITS, REWARDS } from '../src/game/achievements.js';
import { dayToReach, nice, REGULAR } from './lib/unlock-model.mjs';

const BAND = { common: [1.2, 5], rare: [6, 22], epic: [28, 70], legendary: [75, 220] };
/** Cada acción solo sirve en un tramo de días y tiene una meta mínima (nada trivial). */
const RULE = {
  boardsSolved: { r: [0, 200], min: 20 },
  maxLevel: { r: [1, 9], min: 6 },
  perfects: { r: [2.5, 200], min: 10 },
  iceRock: { r: [5, 160], min: 10 },
  locks: { r: [6, 160], min: 10 },
  heavyBoards: { r: [6, 160], min: 10 },
  cleanCity: { r: [3, 130], min: 4 },
  fateCards: { r: [5, 170], min: 6 },
  powersUsed: { r: [3, 170], min: 20 },
  pacts: { r: [9, 170], min: 2 },
  completed: { r: [7, 200], min: 1 },
  hardLevel: { r: [13, 35], min: 5 },
  expertLevel: { r: [26, 63], min: 4 },
  bestRunStreak: { r: [4, 19], min: 6 },
  fateSeenCount: { r: [14, 150], min: 8 },
  heroBoardsLia: { r: [4, 170], min: 15 },
  heroBoardsJean: { r: [4, 170], min: 15 },
  heroBoardsVan: { r: [4, 170], min: 15 },
  challengeBoards: { r: [2.5, 170], min: 6 },
  challengeBest: { r: [6, 70], min: 5 },
  dailySolved: { r: [2.5, 160], min: 4 },
  dailyGold: { r: [25, 190], min: 3 }, // el oro (15 tableros sin un turno de más) sale ≈ 1 de cada 8 días: 3 oros ≈ día 25
  bestStreak: { r: [3, 100], min: 3 },
  masterSolved: { r: [12, 160], min: 3 },
};
/** Mezcla de acciones de cada categoría y modo (en orden de preferencia). */
const POOL = {
  board: {
    aventura: ['boardsSolved', 'maxLevel', 'hardLevel', 'perfects', 'expertLevel', 'completed'],
    desafio: ['challengeBoards', 'challengeBest'],
    diario: ['dailySolved', 'bestStreak', 'dailyGold'],
  },
  pieces: {
    aventura: ['iceRock', 'locks', 'heavyBoards', 'perfects', 'cleanCity', 'powersUsed', 'bestRunStreak'],
    desafio: ['challengeBoards', 'challengeBest'],
    diario: ['dailySolved', 'dailyGold', 'bestStreak'],
  },
  key: {
    aventura: ['pacts', 'fateCards', 'completed', 'perfects', 'boardsSolved'],
    desafio: ['challengeBoards', 'challengeBest'],
    diario: ['dailySolved', 'bestStreak', 'dailyGold', 'masterSolved'],
  },
  card: {
    aventura: ['fateCards', 'pacts', 'cleanCity', 'fateSeenCount', 'bestRunStreak', 'powersUsed'],
    desafio: ['challengeBoards', 'challengeBest'],
    diario: ['dailySolved', 'dailyGold', 'bestStreak'],
  },
  music: {
    aventura: ['maxLevel', 'boardsSolved', 'fateCards', 'hardLevel', 'completed', 'expertLevel'],
    desafio: ['challengeBoards', 'challengeBest'],
    diario: ['dailySolved', 'bestStreak', 'dailyGold'],
  },
  cover: {
    aventura: ['completed', 'powersUsed', 'boardsSolved', 'hardLevel', 'perfects', 'expertLevel'],
    desafio: ['challengeBoards', 'challengeBest'],
    diario: ['dailyGold', 'dailySolved', 'bestStreak'],
  },
  bg: {
    aventura: ['maxLevel', 'boardsSolved', 'hardLevel', 'perfects', 'expertLevel', 'completed'],
    desafio: ['challengeBest', 'challengeBoards'],
    diario: ['dailySolved', 'dailyGold', 'bestStreak'],
  },
  /* Estelas (lo que dejan las fichas al moverse): premian el juego táctico — tableros, mínimos, rocas, hielo, poderes */
  trail: {
    aventura: ['boardsSolved', 'perfects', 'iceRock', 'powersUsed', 'heavyBoards', 'bestRunStreak', 'locks'],
    desafio: ['challengeBoards', 'challengeBest'],
    diario: ['dailySolved', 'dailyGold', 'bestStreak'],
  },
  /* Celebración de la llave que sale: premia terminar bien (mínimos, tramos limpios, rachas, aventuras completas) */
  fx: {
    aventura: ['perfects', 'bestRunStreak', 'boardsSolved', 'cleanCity', 'completed', 'maxLevel', 'hardLevel'],
    desafio: ['challengeBest', 'challengeBoards'],
    diario: ['dailyGold', 'dailySolved', 'bestStreak'],
  },
  /* Clima de la portada: premia avanzar por el mundo (niveles, caminos, cartas) y volver cada día */
  aura: {
    aventura: ['maxLevel', 'boardsSolved', 'fateCards', 'hardLevel', 'expertLevel', 'completed'],
    desafio: ['challengeBoards', 'challengeBest'],
    diario: ['bestStreak', 'dailySolved', 'dailyGold'],
  },
  /* Tema de interfaz: premia la constancia y completar aventuras */
  ui: {
    aventura: ['completed', 'maxLevel', 'powersUsed', 'fateSeenCount', 'boardsSolved', 'hardLevel', 'expertLevel'],
    desafio: ['challengeBest', 'challengeBoards'],
    diario: ['bestStreak', 'dailySolved', 'dailyGold'],
  },
};
const heroPool = (H) => ({
  aventura: [
    `heroBoards${H}`,
    'boardsSolved',
    'maxLevel',
    'perfects',
    'hardLevel',
    'powersUsed',
    'completed',
    'expertLevel',
  ],
  desafio: ['challengeBoards', 'challengeBest'],
  diario: ['dailySolved', 'bestStreak', 'dailyGold'],
});
/** Hitos de las legendarias, por modo (de menor a mayor esfuerzo). */
const FEATS = {
  aventura: [
    ['hardDone', 1],
    ['maxPactsWin', 3],
    ['expertDone', 1],
    ['paths', 3],
    ['bestGrade', 5],
    ['fateSeenCount', 28],
    ['completed', 20],
    ['perfects', 450],
  ],
  desafio: [
    ['challengeBest', 12],
    ['challengeWonCount', 2],
    ['challengeBest', 14],
    ['challengeWonCount', 3],
  ],
  diario: [
    ['bestStreak', 14],
    ['dailyGold', 11],
    ['bestStreak', 21],
    ['masterSolved', 75],
    ['bestStreak', 30],
    ['dailyGold', 17],
  ],
};
const heroFeats = (H) => ({
  ...FEATS,
  aventura: [
    [`heroBoards${H}`, 250],
    ['hardDone', 1],
    ['expertDone', 1],
    [`heroBoards${H}`, 450],
    ['bestGrade', 5],
  ],
});
const HERO_STAT = { lia: 'Lia', jean: 'Jean', van: 'Van' };
const HERO_WIN = { lia: 'heroWinLia', jean: 'heroWinJean', van: 'heroWinVan' };
const geo = (lo, hi, i, n) => (n <= 1 ? Math.sqrt(lo * hi) : lo * (hi / lo) ** (i / (n - 1)));
const dayOf = ([stat, goal]) => dayToReach(stat, goal);

/** Meta de una acción que debe alcanzarse hacia el día `day` (con su mínimo para que nunca sea trivial). */
function goalFor(stat, day) {
  const min = RULE[stat].min;
  const v = REGULAR[stat](day);
  if (['maxLevel', 'hardLevel', 'expertLevel', 'challengeBest', 'bestRunStreak'].includes(stat)) {
    const cap = { maxLevel: 21, hardLevel: 21, expertLevel: 21, challengeBest: 14, bestRunStreak: 21 }[stat];
    return Math.max(min, Math.min(cap, Math.round(v)));
  }
  if (stat === 'bestStreak') return Math.max(min, Math.round(v));
  return Math.max(min, nice(v));
}
const eligible = (stat, day) => RULE[stat] && day >= RULE[stat].r[0] && day <= RULE[stat].r[1];

/** Elige una acción del modo pedido para el día `day`, repartiendo el uso entre las de la categoría. */
function pickReq(pools, mode, day, used, avoid, cap = Infinity) {
  let list = pools[mode].filter((s) => eligible(s, day) && s !== avoid && dayToReach(s, RULE[s].min) <= cap);
  // Si ninguna sirve para ese día, la que antes puede hacerse (con su meta mínima)
  if (!list.length)
    list = [...pools[mode].filter((s) => RULE[s] && s !== avoid)]
      .sort((x, y) => dayToReach(x, RULE[x].min) - dayToReach(y, RULE[y].min))
      .slice(0, 1);
  const stat = [...list].sort(
    (a, b) => (used.get(a) || 0) - (used.get(b) || 0) || pools[mode].indexOf(a) - pools[mode].indexOf(b),
  )[0];
  used.set(stat, (used.get(stat) || 0) + 1);
  return [stat, goalFor(stat, Math.max(day, RULE[stat].r[0]))];
}

function planList(items, pools, feats, variant = 0) {
  const by = {};
  for (const it of items) (by[it.rarity] ||= []).push(it);
  const used = new Map();
  const out = {};
  let prev = '';
  // Común y rara: una sola condición, rotando de modo (Aventura, Diario, Desafío…); épica: dos, de dos modos distintos
  const MODES = ['aventura', 'diario', 'desafio', 'aventura', 'diario'];
  let m = 0;
  for (const rarity of ['common', 'rare', 'epic']) {
    const list = by[rarity] || [];
    list.forEach((it, i) => {
      const day = geo(BAND[rarity][0], BAND[rarity][1], i, list.length);
      const first = rarity === 'epic' ? 'aventura' : MODES[m++ % MODES.length];
      const reqs = [pickReq(pools, first, day, used, prev, rarity === 'common' ? BAND.common[1] * 1.1 : Infinity)];
      prev = reqs[0][0];
      if (rarity === 'epic') reqs.push(pickReq(pools, i % 2 ? 'desafio' : 'diario', day * 0.85, used, ''));
      out[it.id] = reqs;
    });
  }
  // Legendarias: tres condiciones, una de cada modo, con hitos grandes (cada legendaria sube un peldaño)
  const leg = by.legendary || [];
  const taken = new Set();
  leg.forEach((it, i) => {
    const target = geo(BAND.legendary[0], BAND.legendary[1], i, leg.length);
    const reqs = ['aventura', 'desafio', 'diario'].map((mode) => {
      const list = feats[mode].filter((f) => !taken.has(f.join()));
      const best = [...(list.length ? list : feats[mode])].sort(
        (a, b) => Math.abs(dayOf(a) - target) - Math.abs(dayOf(b) - target),
      )[0];
      taken.add(best.join());
      return best;
    });
    out[it.id] = reqs;
  });
  return out;
}

const plan = {};
Object.keys(POOL).forEach((type, v) => (plan[type] = planList(REWARDS[type].slice(1), POOL[type], FEATS, v)));
// Atuendos: cada héroe tiene su lista (jugar con él, ganar con él…)
plan.outfit = {};
Object.entries(OUTFITS).forEach(([hero, list], v) => {
  const items = list.slice(1);
  const p = planList(items, heroPool(HERO_STAT[hero]), heroFeats(HERO_STAT[hero]), v);
  const rare = items.find((it) => it.rarity === 'rare');
  if (rare) p[rare.id] = [[HERO_WIN[hero], 1]]; // su primera victoria con ese héroe
  // Cada traje pide jugar con SU héroe (tableros resueltos con él), de modo que nunca se abren los de un héroe que no usas.
  // Las épicas y legendarias conservan además sus condiciones de otros modos; la primera victoria con el héroe abre un raro.
  const own = `heroBoards${HERO_STAT[hero]}`;
  let last = 0;
  for (const it of items) {
    if (it === rare) continue;
    const day = Math.max(...p[it.id].map(dayOf));
    // las metas suben siempre de un traje al siguiente (nunca dos iguales)
    const goal = Math.max(
      goalFor(own, Math.max(day * 0.9, RULE[own].r[0])),
      last + Math.max(4, Math.round(last * 0.18)),
    );
    last = Math.min(600, goal);
    p[it.id][0] = [own, last];
    p[it.id] = p[it.id].filter(([stat], i) => i === 0 || stat !== own);
  }
  for (const [id, r] of Object.entries(p)) plan.outfit[`${hero}:${id}`] = r;
});

const lines = Object.entries(plan).map(
  ([type, items]) =>
    `  ${type}: {\n${Object.entries(items)
      .map(([id, reqs]) => `    '${id}': [${reqs.map(([s, g]) => `['${s}', ${g}]`).join(', ')}],`)
      .join('\n')}\n  },`,
);
writeFileSync(
  new URL('../src/game/unlock-plan.js', import.meta.url),
  `/**
 * Lo que hay que hacer para desbloquear cada objeto de Personalizar: lista de condiciones [estadística, meta] que deben
 * cumplirse TODAS. GENERADO por scripts/plan-unlocks.mjs a partir del modelo de progresión (scripts/lib/unlock-model.mjs);
 * explicado en docs/desbloqueos.md. Se puede retocar a mano, pero conviene volver a pasar scripts/analyze-unlocks.mjs.
 */
export const PLAN = {\n${lines.join('\n')}\n};\n`,
);
console.log('plan escrito:', Object.fromEntries(Object.entries(plan).map(([t, v]) => [t, Object.keys(v).length])));

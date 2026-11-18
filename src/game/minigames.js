/**
 * Minijuegos de las paradas (niveles 15, 25, …, 95): TRES por héroe, cada uno una mecánica clásica distinta.
 *
 *   Lía  (reflejos, fuego)      catch  – atrapar lo que cae          whack – golpear lo que asoma      stack – apilar a tiempo
 *   Jean (tiempo, precisión)    clock  – parar la aguja en la zona   rhythm – tocar al compás          order – tocar los números en orden
 *   Juth (memoria, runas)       pairs  – parejas                     simon – repetir la secuencia      shell – seguir el cubilete
 *
 * Cada héroe recorre sus tres juegos en ciclo (parada 1 → juego 1, parada 2 → juego 2, …), de modo que juega cada uno tres veces
 * a lo largo de la aventura; cada vuelta sube un escalón de dificultad (`tier` 0-2).
 *
 * Todos los juegos se puntúan igual: una NOTA de 0 a 5 estrellas. 0 = sin premio; 5 = el premio máximo de esa parada, que crece
 * con el nivel (`maxPrize`: 5 pistas en el 15 → 10 en el 95, algo menos en los caminos difíciles).
 *
 * Este módulo es lógica pura (sin DOM): genera cada partida de forma determinista a partir de la semilla de la aventura y decide
 * la nota. La interfaz (src/ui/bonus.js y src/ui/minigames/) solo dibuja y llama a estas funciones.
 */
import { hash32, mulberry32 } from '../engine/rng.js';
import { byPath } from '../engine/difficulty.js';

export const BONUS_KINDS = ['catch', 'whack', 'stack', 'clock', 'rhythm', 'order', 'pairs', 'simon', 'shell'];
export const GAMES_PER_HERO = 3;
export const MAX_GRADE = 5;
export const HERO_GAMES = {
  lia: [
    { kind: 'catch', title: 'Lluvia de Brasas' },
    { kind: 'whack', title: 'Sombras Fuera' },
    { kind: 'stack', title: 'La Torre de la Forja' },
  ],
  jean: [
    { kind: 'clock', title: 'La Última Campanada' },
    { kind: 'rhythm', title: 'El Compás del Péndulo' },
    { kind: 'order', title: 'Las Horas en Orden' },
  ],
  van: [
    { kind: 'pairs', title: 'El Códice de los Nombres' },
    { kind: 'simon', title: 'El Nombre de las Estrellas' },
    { kind: 'shell', title: 'El Sello Errante' },
  ],
};
export const isBonusLevel = (level) => level >= 15 && level < 100 && level % 10 === 5;
export const bonusIndex = (level) => Math.max(0, Math.floor((level - 15) / 10));
/** Escalón de dificultad (0-2): cada vuelta completa a los tres juegos del héroe sube uno. */
export const bonusTier = (level) => Math.min(2, Math.floor(bonusIndex(level) / GAMES_PER_HERO));
export const gameFor = (hero, level) => {
  const list = HERO_GAMES[hero] || HERO_GAMES.lia;
  return list[bonusIndex(level) % list.length];
};

/* ───────────────────────────── Premios: nota 0-5 → pistas según el nivel ───────────────────────────── */

/** El premio máximo crece con el nivel (5 pistas en el 15 → 10 en el 95) y es más escaso en los caminos difíciles. */
const PRIZE_PATH_SCALE = { 1: 1, 50: 0.8, 75: 0.6 };
export const maxPrize = (level = 15, start = 1) => Math.max(2, Math.min(10, Math.round((5 + (5 * (level - 15)) / 80) * byPath(PRIZE_PATH_SCALE, start))));
const clampGrade = (g) => Math.max(0, Math.min(MAX_GRADE, Math.round(Number(g) || 0)));
/**
 * Pistas que da una nota: 0 → nada; 5 → `maxPrize`; entre medias, la parte proporcional (cualquier nota ≥ 1 da al menos 1).
 * La misma nota vale lo mismo, en proporción, en cualquier nivel: el reparto es equitativo y solo crece el tamaño del premio.
 */
export const bonusPrize = (grade, level = 15, start = 1) => {
  const g = clampGrade(grade);
  return g === 0 ? 0 : Math.max(1, Math.round((g * maxPrize(level, start)) / MAX_GRADE));
};
/** Tabla completa de premios de una parada: [pistas con 0★, 1★, …, 5★]. */
export const prizeTable = (level = 15, start = 1) => Array.from({ length: MAX_GRADE + 1 }, (_, g) => bonusPrize(g, level, start));

/** Nota por proporción de aciertos (0-1): los umbrales dejan el 5 para un juego casi perfecto y el 0 para quien apenas acierta. */
const RATIO_STEPS = [0.15, 0.35, 0.55, 0.75, 0.9];
export const gradeOf = (ratio) => RATIO_STEPS.filter((s) => ratio >= s - 1e-9).length;

/* ───────────────────────────── Ajustes por juego y escalón ───────────────────────────── */

export const TUNING = {
  // secs: duración · embers/drops: brasas que atrapar y gotas que esquivar · fall: segundos que tarda en caer · basket: ancho del farol (0-1)
  catch: [{ secs: 19, embers: 18, drops: 4, fall: 2.5, basket: 0.26 }, { secs: 20, embers: 22, drops: 7, fall: 2.15, basket: 0.24 }, { secs: 21, embers: 26, drops: 10, fall: 1.85, basket: 0.22 }],
  // shadows/friends: sombras que golpear y llamas amigas que respetar · stay: ms que asoman · gap: ms entre apariciones
  whack: [{ shadows: 16, friends: 3, stay: 1150, gap: 880 }, { shadows: 20, friends: 5, stay: 980, gap: 740 }, { shadows: 24, friends: 7, stay: 850, gap: 640 }],
  // blocks: lingotes · period: ms de un vaivén completo · perfect: margen (0-1) que cuenta como encaje perfecto
  stack: [{ blocks: 8, period: 2300, perfect: 0.035 }, { blocks: 9, period: 2000, perfect: 0.03 }, { blocks: 10, period: 1750, perfect: 0.026 }],
  // period: ms por vuelta de la aguja · zone: tamaño de la zona dorada (fracción de la esfera)
  clock: [{ rounds: 5, period: 2300, zone: 0.2 }, { rounds: 5, period: 2000, zone: 0.17 }, { rounds: 5, period: 1750, zone: 0.145 }],
  // notes: notas · beat: ms entre notas · travel: ms de caída · window: margen de acierto (± ms)
  rhythm: [{ notes: 16, beat: 620, travel: 1500, window: 170 }, { notes: 20, beat: 540, travel: 1400, window: 150 }, { notes: 24, beat: 470, travel: 1300, window: 130 }],
  // count: números · cols: columnas · secs: tiempo · penalty: ms que cuesta un toque equivocado
  order: [{ count: 12, cols: 4, secs: 20, penalty: 1500 }, { count: 16, cols: 4, secs: 26, penalty: 1500 }, { count: 20, cols: 5, secs: 32, penalty: 1500 }],
  // pairs: parejas · cols: columnas · peek: ms que se ven todas al empezar
  pairs: [{ pairs: 6, cols: 4, peek: 2600 }, { pairs: 8, cols: 4, peek: 2800 }, { pairs: 10, cols: 5, peek: 3000 }],
  // start: longitud de la primera secuencia (crece 1 por ronda, 5 rondas) · show: ms de cada luz
  simon: [{ rounds: 5, start: 2, show: 520 }, { rounds: 5, start: 3, show: 440 }, { rounds: 5, start: 4, show: 370 }],
  // cups: cubiletes · swaps: cambios en la primera ronda (+1 por ronda) · ms: duración del primer cambio (cada ronda, más rápido)
  shell: [{ rounds: 5, cups: 3, swaps: 3, ms: 520 }, { rounds: 5, cups: 3, swaps: 5, ms: 430 }, { rounds: 5, cups: 4, swaps: 6, ms: 380 }],
};
export const tuningFor = (kind, tier = 0) => (TUNING[kind] || TUNING.catch)[Math.max(0, Math.min(2, tier))];

/* ───────────────────────────── Plan de la parada (lo único que se guarda) ───────────────────────────── */

const heroIndex = (hero) => Math.max(0, Object.keys(HERO_GAMES).indexOf(hero));
/** El plan solo guarda qué juego toca, su escalón y la nota final: la partida se regenera siempre igual desde `key`. */
export function createBonusPlan(hero, level, seed = 0, start = 1) {
  const heroId = HERO_GAMES[hero] ? hero : 'lia';
  return {
    version: 3, hero: heroId, level, start, kind: gameFor(heroId, level).kind, tier: bonusTier(level),
    key: hash32(seed, level, heroIndex(heroId), 907), phase: 'ready',
  };
}
export function ensureBonusPlan(run) {
  const old = run.bonusPlan;
  if (old?.version === 3 && BONUS_KINDS.includes(old.kind)) return old;
  const level = old?.level || Math.max(15, run.level - 1);
  const plan = createBonusPlan(run.hero, level, run.seed, run.start);
  if (old?.prize !== undefined) {                      // un premio ya ganado con una versión anterior se respeta tal cual
    plan.prize = old.prize;
    plan.grade = Math.max(1, Math.min(MAX_GRADE, Math.round((old.prize * MAX_GRADE) / maxPrize(level, run.start))));
    plan.phase = 'done';
  }
  run.bonusPlan = plan;
  return plan;
}
/** Cierra la parada con una nota (0-5). Es idempotente: el premio se decide una sola vez. */
export function finishBonus(plan, grade = 0) {
  if (plan.prize === undefined) {
    plan.grade = clampGrade(grade);
    plan.prize = bonusPrize(plan.grade, plan.level, plan.start);
  }
  plan.phase = 'done';
  return plan.prize;
}
/** Cobro atómico: reanudar la aventura no suma el premio dos veces. */
export function claimBonus(run) {
  const plan = run.bonusPlan;
  if (!plan || plan.prize === undefined) return 0;
  const prize = run.lastBonusClaim >= plan.level ? 0 : plan.prize;
  run.hints = (run.hints || 0) + prize;
  run.lastBonusClaim = Math.max(run.lastBonusClaim || 0, plan.level);
  run.bonus = 0;
  delete run.bonusPlan;
  return prize;
}

/* ───────────────────────────── Utilidades deterministas ───────────────────────────── */

const rngOf = (plan, salt = 0) => mulberry32(hash32(plan.key, salt, 31));
const shuffled = (rng, list) => {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = (rng, n) => Math.floor(rng() * n);

/* ═════════════════════════════ LÍA ═════════════════════════════ */

/* ---------- catch · «Lluvia de Brasas»: mueve el farol, atrapa brasas, esquiva gotas ---------- */

const CATCH_REACH = 0.65, CATCH_CENTRE = 0.2;
export function catchSetup(plan) {
  const cfg = tuningFor('catch', plan.tier), rng = rngOf(plan, 1);
  const first = 900, last = cfg.secs * 1000 - cfg.fall * 1000 - 500, step = (last - first) / (cfg.embers - 1);
  const items = [];
  // Las brasas recorren todo el ancho: cada una cae a cierta distancia de la anterior (hay que moverse siempre, pero nunca
  // cruzar la pantalla entera de golpe) y, como mucho, una de cada cuatro cae en la franja central: quedarse quieto no puntúa.
  const centreMax = Math.floor(cfg.embers / 4);
  let x = 0.5, centre = 0;
  for (let i = 0; i < cfg.embers; i++) {
    const lo = Math.max(0.08, x - CATCH_REACH), hi = Math.min(0.92, x + CATCH_REACH);
    const fits = (v) => Math.abs(v - x) >= 0.18 && (centre < centreMax || Math.abs(v - 0.5) > CATCH_CENTRE);
    let nx = lo + rng() * (hi - lo);
    for (let k = 0; k < 24 && !fits(nx); k++) nx = lo + rng() * (hi - lo);
    if (!fits(nx)) nx = x >= 0.5 ? Math.max(lo, 0.3 - rng() * 0.22) : Math.min(hi, 0.7 + rng() * 0.22);   // al otro lado, fuera de la franja central
    if (Math.abs(nx - 0.5) <= CATCH_CENTRE) centre++;
    x = nx;
    items.push({ t: Math.round(first + i * step + (rng() - 0.5) * step * 0.4), x, bad: false });
  }
  const embers = items.slice();
  for (let i = 0; i < cfg.drops; i++) {
    const t = Math.round(first + 1400 + rng() * (last - first - 1400));
    const near = embers.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a));
    let dx = 0.08 + rng() * 0.84;
    if (Math.abs(dx - near.x) < 0.3) dx = near.x < 0.5 ? near.x + 0.34 : near.x - 0.34;   // una gota nunca cae encima de una brasa
    items.push({ t, x: Math.max(0.08, Math.min(0.92, dx)), bad: true });
  }
  items.sort((a, b) => a.t - b.t);
  return { ...cfg, items, duration: cfg.secs * 1000 };
}
/** ¿El farol (centro `basketX`, ancho `basketW`, ambos 0-1) recoge lo que cae en `itemX`? */
export const catchHit = (itemX, basketX, basketW) => Math.abs(itemX - basketX) <= basketW / 2 + 0.035;
/** Umbrales propios: con el brasero quieto en el centro caen dentro hasta una de cada cuatro brasas, así que eso no da estrellas. */
const CATCH_STEPS = [0.36, 0.5, 0.64, 0.78, 0.9];
export const catchGrade = ({ caught = 0, soaked = 0 }, setup) => { const r = Math.max(0, caught - soaked) / setup.embers; return CATCH_STEPS.filter((v) => r >= v - 1e-9).length; };

/* ---------- whack · «Sombras Fuera»: toca las sombras, respeta las llamas amigas ---------- */

export const WHACK_HOLES = 9;
export function whackSetup(plan) {
  const cfg = tuningFor('whack', plan.tier), rng = rngOf(plan, 2);
  const total = cfg.shadows + cfg.friends;
  const friendAt = new Set(shuffled(rng, Array.from({ length: total - 2 }, (_, i) => i + 2)).slice(0, cfg.friends));   // las dos primeras siempre son sombras
  const busyUntil = new Array(WHACK_HOLES).fill(0), pops = [];
  let t = 900;
  for (let i = 0; i < total; i++) {
    let hole = pick(rng, WHACK_HOLES);
    for (let k = 0; k < WHACK_HOLES && busyUntil[hole] > t - 120; k++) hole = (hole + 1) % WHACK_HOLES;
    const stay = Math.round(cfg.stay * (0.9 + rng() * 0.25));
    busyUntil[hole] = t + stay;
    pops.push({ t: Math.round(t), hole, stay, friend: friendAt.has(i) });
    t += cfg.gap * (0.72 + rng() * 0.56);
  }
  return { ...cfg, pops, duration: Math.round(pops.at(-1).t + pops.at(-1).stay + 500) };
}
export const whackGrade = ({ hits = 0, friendHits = 0 }, setup) => gradeOf(Math.max(0, hits - friendHits) / setup.shadows);

/* ---------- stack · «La Torre de la Forja»: suelta cada lingote cuando esté sobre la torre ---------- */

export const STACK_BASE = { x: 0.25, w: 0.5 };
export function stackSetup(plan) {
  const cfg = tuningFor('stack', plan.tier), rng = rngOf(plan, 3);
  /** cada lingote entra por un lado distinto y un poco más rápido que el anterior */
  const blocks = Array.from({ length: cfg.blocks }, (_, i) => ({ period: Math.round(cfg.period * 0.955 ** i), fromRight: (i + (rng() < 0.5 ? 0 : 1)) % 2 === 1 }));
  return { ...cfg, list: blocks };
}
/** Borde izquierdo (0-1) de un lingote de ancho `w` que va y viene: onda triangular de 0 a 1−w. */
export function stackX(elapsed, w, period, fromRight = false) {
  const span = 1 - w, u = ((Math.max(0, elapsed) % period) / period) * 2, tri = u <= 1 ? u : 2 - u;
  return span * (fromRight ? 1 - tri : tri);
}
/**
 * Suelta un lingote en `x` sobre la base {x, w}. Devuelve la pieza que queda: recortada a lo que apoya, entera si encaja
 * dentro del margen `perfect`, o `miss` si cae fuera.
 */
export function stackDrop(base, x, w, perfect = 0.03) {
  if (Math.abs(x - base.x) <= perfect) return { x: base.x, w: Math.min(w, base.w), perfect: true, miss: false, cut: 0 };
  const left = Math.max(base.x, x), right = Math.min(base.x + base.w, x + w), keep = right - left;
  if (keep <= 0.012) return { x, w: 0, perfect: false, miss: true, cut: w };
  return { x: left, w: keep, perfect: false, miss: false, cut: w - keep, cutSide: x < base.x ? 'left' : 'right' };
}
export const stackGrade = ({ placed = 0 }, setup) => clampGrade((MAX_GRADE * placed) / setup.blocks);

/* ═════════════════════════════ JEAN ═════════════════════════════ */

/* ---------- clock · «La Última Campanada»: para la aguja dentro de la zona dorada ---------- */

export function clockSetup(plan) {
  const cfg = tuningFor('clock', plan.tier), rng = rngOf(plan, 4);
  const rounds = Array.from({ length: cfg.rounds }, (_, i) => {
    const center = rng();
    return { center, zone: cfg.zone * (1 - 0.07 * i), period: Math.round(cfg.period * (1 - 0.055 * i)), dir: i % 2 ? -1 : 1, from: (center + 0.5) % 1 };   // la aguja sale del lado opuesto: siempre da tiempo a verla venir
  });
  return { ...cfg, list: rounds };
}
const wrap1 = (v) => ((v % 1) + 1) % 1;
/** Posición de la aguja (0-1, 0 = las doce, sentido horario) tras `elapsed` ms. */
export const clockAngle = (round, elapsed) => wrap1(round.from + (round.dir * Math.max(0, elapsed)) / round.period);
/** 0 = fuera · 1 = dentro de la zona · 2 = en el centro (perfecto). */
export function clockScore(round, angle) {
  const d = Math.abs(wrap1(angle - round.center + 0.5) - 0.5);
  return d <= round.zone / 6 ? 2 : d <= round.zone / 2 ? 1 : 0;
}
export const clockGrade = ({ hits = 0 }) => clampGrade(hits);

/* ---------- rhythm · «El Compás del Péndulo»: toca cada nota cuando cruza la línea ---------- */

export const RHYTHM_LANES = 3;
export function rhythmSetup(plan) {
  const cfg = tuningFor('rhythm', plan.tier), rng = rngOf(plan, 5);
  const notes = [];
  let lane = 1, run = 0;
  for (let i = 0; i < cfg.notes; i++) {
    let next = pick(rng, RHYTHM_LANES);
    if (next === lane && ++run >= 2) { next = (lane + 1 + pick(rng, RHYTHM_LANES - 1)) % RHYTHM_LANES; run = 0; } else if (next !== lane) run = 0;
    lane = next;
    notes.push({ t: cfg.travel + 700 + i * cfg.beat, lane, pitch: [0, 2, 4, 2, 4, 7, 4, 2][i % 8] + (i % 16 >= 8 ? 2 : 0) });
  }
  return { ...cfg, list: notes, duration: notes.at(-1).t + 900 };
}
/** Índice de la nota pendiente más cercana en ese carril dentro del margen, o −1 (toque al aire). `done` marca las ya resueltas. */
export function rhythmJudge(setup, done, lane, time) {
  let best = -1, bestD = Infinity;
  setup.list.forEach((n, i) => {
    if (done[i] || n.lane !== lane) return;
    const d = Math.abs(n.t - time);
    if (d <= setup.window && d < bestD) { best = i; bestD = d; }
  });
  return best;
}
export const rhythmGrade = ({ hits = 0, strays = 0 }, setup) => gradeOf(Math.max(0, hits - strays * 0.5) / setup.notes);

/* ---------- order · «Las Horas en Orden»: toca los números de menor a mayor antes de que se acabe el tiempo ---------- */

export function orderSetup(plan) {
  const cfg = tuningFor('order', plan.tier), rng = rngOf(plan, 6);
  return { ...cfg, cells: shuffled(rng, Array.from({ length: cfg.count }, (_, i) => i + 1)), duration: cfg.secs * 1000 };
}
export const orderState = () => ({ next: 1, wrong: 0 });
/** 'ok' | 'done' | 'wrong' (cada error cuesta `penalty` ms de reloj). */
export function orderTap(setup, state, value) {
  if (state.next > setup.count) return null;
  if (value !== state.next) { state.wrong++; return 'wrong'; }
  state.next++;
  return state.next > setup.count ? 'done' : 'ok';
}
/** `elapsed` = ms reales transcurridos; el reloj efectivo suma las penalizaciones. */
export const orderClock = (setup, state, elapsed) => elapsed + state.wrong * setup.penalty;
export function orderGrade(setup, state, elapsed) {
  const found = state.next - 1;
  if (found >= setup.count) {
    const used = orderClock(setup, state, elapsed) / setup.duration;
    return used <= 0.55 ? 5 : used <= 0.78 ? 4 : 3;
  }
  const part = found / setup.count;
  return part >= 0.66 ? 2 : part >= 0.33 ? 1 : 0;
}

/* ═════════════════════════════ JUTH ═════════════════════════════ */

/* ---------- pairs · «El Códice de los Nombres»: encuentra las parejas ---------- */

export function pairsSetup(plan) {
  const cfg = tuningFor('pairs', plan.tier), rng = rngOf(plan, 7);
  const deck = shuffled(rng, Array.from({ length: cfg.pairs * 2 }, (_, i) => i >> 1));
  return { ...cfg, deck, maxMiss: cfg.pairs * 2 };
}
export const pairsState = () => ({ matched: [], open: [], misses: 0 });
/** Abre una carta: {type:'open'|'match'|'miss', indices}. Tras un 'miss' hay que llamar a `pairsClose` para seguir. */
export function pairsTap(setup, state, index) {
  if (!Number.isInteger(index) || index < 0 || index >= setup.deck.length || state.open.length >= 2 || state.matched.includes(index) || state.open.includes(index) || pairsOver(setup, state)) return null;
  state.open.push(index);
  if (state.open.length < 2) return { type: 'open', indices: [index] };
  const indices = state.open.slice();
  if (setup.deck[indices[0]] === setup.deck[indices[1]]) { state.matched.push(...indices); state.open = []; return { type: 'match', indices }; }
  state.misses++;
  return { type: 'miss', indices };
}
export const pairsClose = (state) => { state.open = []; };
export const pairsFound = (state) => state.matched.length / 2;
export const pairsOver = (setup, state) => state.matched.length === setup.deck.length || state.misses >= setup.maxMiss;
export function pairsGrade(setup, state) {
  const p = setup.pairs, m = state.misses;
  if (state.matched.length === setup.deck.length) return m <= p / 3 ? 5 : m <= (p * 2) / 3 ? 4 : m <= p ? 3 : 2;
  return pairsFound(state) >= p / 2 ? 1 : 0;
}

/* ---------- simon · «El Nombre de las Estrellas»: repite la secuencia, cada ronda una luz más ---------- */

export const SIMON_PADS = 4;
export function simonSetup(plan) {
  const cfg = tuningFor('simon', plan.tier), rng = rngOf(plan, 8);
  const sequence = [];
  while (sequence.length < cfg.start + cfg.rounds - 1) {
    const v = pick(rng, SIMON_PADS), n = sequence.length;
    if (n >= 2 && sequence[n - 1] === v && sequence[n - 2] === v) continue;      // nunca tres iguales seguidas
    sequence.push(v);
  }
  return { ...cfg, sequence };
}
export const simonState = () => ({ round: 0, input: 0, retried: false, over: false });
export const simonLength = (setup, state) => setup.start + state.round;
/** 'step' | 'round' (ronda superada) | 'win' | 'retry' (primer fallo: se repite la misma secuencia) | 'fail'. */
export function simonTap(setup, state, pad) {
  if (state.over || pad < 0 || pad >= SIMON_PADS) return null;
  if (pad !== setup.sequence[state.input]) {
    state.input = 0;
    if (!state.retried) { state.retried = true; return 'retry'; }
    state.over = true;
    return 'fail';
  }
  state.input++;
  if (state.input < simonLength(setup, state)) return 'step';
  state.round++;
  state.input = 0;
  if (state.round >= setup.rounds) { state.over = true; return 'win'; }
  return 'round';
}
export const simonGrade = (state) => clampGrade(state.round);

/* ---------- shell · «El Sello Errante»: sigue con la vista el cubilete que guarda la estrella ---------- */

export function shellSetup(plan) {
  const cfg = tuningFor('shell', plan.tier), rng = rngOf(plan, 9);
  const rounds = Array.from({ length: cfg.rounds }, (_, r) => {
    const swaps = [];
    let last = -1;
    for (let i = 0; i < cfg.swaps + r; i++) {
      let a = pick(rng, cfg.cups), b = (a + 1 + pick(rng, cfg.cups - 1)) % cfg.cups;
      if (Math.min(a, b) * 10 + Math.max(a, b) === last) { a = (a + 1) % cfg.cups; b = (a + 1 + pick(rng, cfg.cups - 1)) % cfg.cups; }   // no deshace el cambio anterior
      last = Math.min(a, b) * 10 + Math.max(a, b);
      swaps.push([a, b]);
    }
    return { star: pick(rng, cfg.cups), swaps, ms: Math.round(cfg.ms * 0.9 ** r) };
  });
  return { ...cfg, list: rounds };
}
/** Posición final de lo que empezó en `slot` tras una lista de intercambios de posiciones. */
export const shellTrack = (slot, swaps) => swaps.reduce((s, [a, b]) => (s === a ? b : s === b ? a : s), slot);
export const shellGrade = ({ hits = 0 }) => clampGrade(hits);

/* ───────────────────────────── Acceso común ───────────────────────────── */

const SETUPS = { catch: catchSetup, whack: whackSetup, stack: stackSetup, clock: clockSetup, rhythm: rhythmSetup, order: orderSetup, pairs: pairsSetup, simon: simonSetup, shell: shellSetup };
/** Partida completa (determinista) del juego que toca en este plan. */
export const setupFor = (plan) => SETUPS[plan.kind](plan);

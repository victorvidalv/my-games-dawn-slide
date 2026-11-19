import { hash32, mulberry32 } from '../engine/rng.js';
import { curve, rateAt, startHintsFor } from '../engine/difficulty.js';
import { PATHS, SKILLS, playBoard } from './balance.js';
import { BOSS_RULES, bossCapFor, bossRating, bossRule, bossTimeFor, reasonableSeconds } from './bosses.js';
import { levelPlan } from './mechanics.js';

/**
 * SEGUNDO SIMULADOR: los jefes, el tiempo y las piezas especiales. Completa a `balance.js` (que modela la partida de 100 niveles,
 * los poderes, la tienda y los sellos) con lo que ese modelo no tiene:
 *
 *  1. Reloj humano. Convierte los movimientos que da el jugador simulado en SEGUNDOS: cada movimiento cuesta ejecutarlo (arrastrar)
 *     y pensarlo; pensar cuesta más cuanto más largo es el tablero y menos habilidad se tiene. Así se puede medir la contrarreloj.
 *  2. Piezas especiales. Rocas, pesadas, candados e hielo hacen que un tablero del mismo largo sea más propenso a errores
 *     (`FAMILY_HARD`): se aplica sobre la habilidad efectiva en los tableros de jefe.
 *  3. Duelo de jefe. Se gana si se llega a la salida DENTRO del límite de turnos y, si el jefe tiene contrarreloj, del tiempo.
 *
 * Es un modelo sencillo y determinista para COMPARAR reglas entre sí y apuntar tasas de victoria; no un jugador real.
 * `npm run simulate:bosses` imprime las tablas; `suggestBossTime` propone el tiempo de cada jefe para una tasa objetivo.
 */

/** Cuánto más se equivoca el jugador en cada familia de tableros (multiplica su «1 − habilidad»). */
const MECH_HARD = { wall: 0.05, heavy: 0.1, gate: 0.15, ice: 0.15 };
/** Cuánto multiplica los errores un tablero con esas mecánicas: la suma de lo que añade cada una y un 10 % más por cada pieza extra mezclada. */
export const hardOfMechanics = (mechs) =>
  Math.round(
    (1 + mechs.reduce((a, m) => a + (MECH_HARD[m] ?? 0), 0) * (1 + 0.1 * Math.max(0, mechs.length - 1))) * 1000,
  ) / 1000;
export const FAMILY_HARD = {
  plain: 1,
  walls: hardOfMechanics(['wall']),
  heavy: hardOfMechanics(['heavy']),
  gates: hardOfMechanics(['gate']),
  ice: hardOfMechanics(['ice']),
  all: hardOfMechanics(['wall', 'heavy', 'gate', 'ice']),
};

/** Reloj humano: segundos por movimiento = ejecutar + pensar; con una dispersión natural entre partidas. */
export const HUMAN = {
  execBase: 1.3,
  execPerSkill: -0.3, // arrastrar una pieza: 1,3 s (principiante) a 1,0 s (experto)
  thinkBase: 0.4,
  thinkPerD: 0.07, // pensar un movimiento: crece con el largo del tablero…
  thinkSkill: 1.35, // …y se reduce con la habilidad: × (1,35 − habilidad)
  spread: 0.25, // ±25 % entre partidas (mejor o peor día)
};
export const secondsPerMove = (skill, d) =>
  HUMAN.execBase + HUMAN.execPerSkill * skill + (HUMAN.thinkBase + HUMAN.thinkPerD * d) * (HUMAN.thinkSkill - skill);
export const solveSeconds = (rng, skill, d, moves) =>
  moves * secondsPerMove(skill, d) * Math.exp((rng() * 2 - 1) * HUMAN.spread);

/** Mínimo de un tablero de jefe (igual que el juego: objetivo de la dificultad + 1 o 2 por ser jefe). */
export function bossBoardLength(level, start = 1) {
  const rating = bossRating(level, rateAt(start, level));
  return Math.max(1, curve(rating).target + (level >= 50 ? 2 : 1));
}

/**
 * Un duelo de jefe. Devuelve { ok, reason: 'turns' | 'time' | null, moves, seconds, limit, timeLimit }.
 * `rule` permite probar otra regla sin tocar el juego: { kind, cap, mult }.
 */
export function bossDuel({
  level,
  start = 1,
  skill,
  seed,
  hero = 'lia',
  hints = startHintsFor(start) + 2,
  rule = bossRule(level),
}) {
  const rng = mulberry32(seed);
  const d = bossBoardLength(level, start);
  const hard = hardOfMechanics(levelPlan(level).mechanics);
  const res = playBoard(rng, { hero, skill, d, start, level, hints, boss: rule.cap, hard });
  const seconds = solveSeconds(rng, skill, d, res.moves);
  const timeLimit = bossTimeFor(level, d, rule);
  const turnsOk = res.ok;
  const timeOk = !timeLimit || seconds <= timeLimit;
  return {
    ok: turnsOk && timeOk,
    reason: !turnsOk ? 'turns' : !timeOk ? 'time' : null,
    moves: res.moves,
    seconds,
    d,
    timeLimit,
  };
}

/** Tasa de victoria (0-1) y causas de derrota de un jefe para una habilidad. */
export function bossWinRate({ level, start = 1, skill, runs = 400, salt = 0, rule }) {
  let wins = 0,
    byTurns = 0,
    byTime = 0,
    secs = 0;
  for (let i = 0; i < runs; i++) {
    const r = bossDuel({ level, start, skill, rule, seed: hash32(i, level, Math.round(skill * 100), start + salt) });
    if (r.ok) wins++;
    else if (r.reason === 'turns') byTurns++;
    else byTime++;
    secs += r.seconds;
  }
  return { rate: wins / runs, byTurns: byTurns / runs, byTime: byTime / runs, avgSeconds: secs / runs };
}

export const BOSS_LEVELS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

/** Tabla completa: tasa de victoria de cada jefe por camino y habilidad. */
export function bossReport({ runs = 400, rules } = {}) {
  const rows = [];
  for (const start of PATHS)
    for (const skill of SKILLS) {
      rows.push({
        start,
        skill,
        rates: BOSS_LEVELS.map((level) => bossWinRate({ level, start, skill, runs, rule: rules?.[level] })),
      });
    }
  return rows;
}

/**
 * Jugador TÍPICO de cada jefe: quien llega hasta él en una partida normal (la habilidad sube con el nivel, porque la gente floja
 * ya cayó antes) y la tasa de victoria que se quiere al primer intento. Con esto se calibra cada regla.
 */
export const REP_SKILL = {
  10: 0.45,
  20: 0.5,
  30: 0.55,
  40: 0.6,
  50: 0.65,
  60: 0.7,
  70: 0.75,
  80: 0.8,
  90: 0.85,
  100: 0.9,
};
export const BOSS_TARGET = {
  10: 0.85,
  20: 0.85,
  30: 0.82,
  40: 0.82,
  50: 0.8,
  60: 0.8,
  70: 0.78,
  80: 0.78,
  90: 0.72,
  100: 0.66,
};

/**
 * Busca la regla que da la tasa objetivo (jugador típico, camino Normal): para los jefes de turnos baja el tope hasta que muerda;
 * para los de contrarreloj reduce el multiplicador; los de «ambas» reparten (turnos un poco más holgados y el resto en el tiempo).
 * Devuelve { cap, mult, rate } con los valores propuestos para BOSS_RULES.
 */
export function calibrateBoss(level, { start = 1, runs = 500 } = {}) {
  const kind = BOSS_RULES[level].kind;
  const skill = REP_SKILL[level];
  const target = BOSS_TARGET[level];
  const rate = (rule) => bossWinRate({ level, start, skill, runs, rule }).rate;
  const search = (make, from, to, step) => {
    let best = null;
    for (let v = from; (v >= to - 1e-9 && from > to) || (v <= to + 1e-9 && from < to); v += step) {
      const r = rate(make(v));
      if (!best || Math.abs(r - target) < Math.abs(best.rate - target)) best = { v: +v.toFixed(2), rate: r };
      if (from > to ? v - step < to - 1e-9 : v + step > to + 1e-9) break;
    }
    return best;
  };
  if (kind === 'turns') {
    const b = search((v) => ({ kind: 'turns', cap: v }), 1.9, 1.0, -0.05);
    return { cap: b.v, rate: b.rate };
  }
  if (kind === 'time') {
    const b = search((v) => ({ kind: 'time', cap: 1.6, mult: v }), 2.2, 0.6, -0.05);
    return { cap: 1.6, mult: b.v, rate: b.rate };
  }
  const cap = 1.1;
  const b = search((v) => ({ kind: 'both', cap, mult: v }), 2.2, 0.3, -0.05);
  return { cap, mult: b.v, rate: b.rate };
}
export { bossCapFor, bossTimeFor, reasonableSeconds };

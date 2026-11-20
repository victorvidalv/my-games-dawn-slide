/**
 * Unión de dos guardados sin perder avances. Antes de escribir, `persist()` (src/state.js) une lo que hay en memoria con lo que
 * ya está en localStorage: así, si hay dos pestañas abiertas (por ejemplo, una con la versión vieja y otra recién actualizada de
 * la PWA), la última en guardar no borra lo que consiguió la otra. Regla: cada dato de progreso solo puede crecer.
 *   paths  – mejor puntaje con su fecha, nivel máximo y partidas de cada camino.
 *   ach    – logros ganados: todos los de ambos (con la fecha más antigua).
 *   stats  – contadores: el mayor; colecciones (listas): la unión.
 *   daily  – retos resueltos, oros, mejor racha y cuenta por reto: el mayor; la racha vigente: la del último día jugado;
 *            resultados de cada día: el mejor.
 * Lo demás (partida en curso, aspecto elegido, avisos vistos…) es de la pestaña que guarda. Lógica pura (sin DOM).
 */
import { survivalBestLevel } from './survival.js';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

const recordTime = (record) =>
  Number.isFinite(record.recordAt) && record.recordAt > 0 && record.recordAt <= 8.64e15 ? record.recordAt : Infinity;

function betterRecord(a, b) {
  const diff = num(a.score) - num(b.score);
  if (diff) return diff > 0 ? a : b;
  return recordTime(a) <= recordTime(b) ? a : b;
}

/** El mejor puntaje de Aventura conserva la fecha del mismo récord. */
export function bestAdventureRecord(paths) {
  let best = {};
  for (const [key, entry] of Object.entries(obj(paths))) {
    if (/^c[0-9]+$/.test(key)) best = betterRecord(best, obj(entry));
  }
  if (num(best.score) <= 0) return null;
  return { score: num(best.score), recordAt: recordTime(best) === Infinity ? null : best.recordAt };
}

export function mergePaths(a = {}, b = {}) {
  const out = { ...obj(a) };
  for (const [k, y] of Object.entries(obj(b))) {
    const x = obj(out[k]),
      yy = obj(y);
    const best = betterRecord(x, yy);
    const merged = {
      ...yy,
      ...x,
      score: num(best.score),
      level: Math.max(num(x.level), num(yy.level)),
      runs: Math.max(num(x.runs), num(yy.runs)),
    };
    if (recordTime(best) === Infinity) delete merged.recordAt;
    else merged.recordAt = best.recordAt;
    out[k] = merged;
  }
  return out;
}
export function mergeAch(a = {}, b = {}) {
  const out = { ...obj(a) };
  for (const [id, t] of Object.entries(obj(b)))
    out[id] = id in out && num(out[id]) && num(t) ? Math.min(num(out[id]), num(t)) : out[id] || t;
  return out;
}
export function mergeStats(a = {}, b = {}) {
  const out = { ...obj(a) };
  for (const [k, y] of Object.entries(obj(b))) {
    const x = out[k];
    if (Array.isArray(x) || Array.isArray(y))
      out[k] = [...new Set([...(Array.isArray(x) ? x : []), ...(Array.isArray(y) ? y : [])])];
    else out[k] = Math.max(num(x), num(y));
  }
  return out;
}
const MEDAL_RANK = { bronze: 1, silver: 2, gold: 3 };
const better = (x, y) => {
  if (!x) return y;
  if (!y) return x;
  if (Boolean(x.boards) !== Boolean(y.boards)) return x.boards ? x : y;
  const rx = MEDAL_RANK[x.medal] || 0,
    ry = MEDAL_RANK[y.medal] || 0;
  return ry > rx || (ry === rx && num(y.moves) < num(x.moves)) ? y : x;
};
export function mergeDaily(a, b) {
  if (!a || typeof a !== 'object') return b && typeof b === 'object' ? b : a;
  if (!b || typeof b !== 'object') return a;
  const by = { ...obj(a.by) };
  for (const [id, n] of Object.entries(obj(b.by))) by[id] = Math.max(num(by[id]), num(n));
  const days = { ...obj(a.days) };
  for (const [day, res] of Object.entries(obj(b.days))) {
    const mine = { ...obj(days[day]) };
    for (const [id, r] of Object.entries(obj(res))) mine[id] = better(mine[id], r);
    days[day] = mine;
  }
  const latest = num(b.last) > num(a.last) || (num(b.last) === num(a.last) && num(b.streak) > num(a.streak)) ? b : a;
  return {
    ...b,
    ...a,
    solved: Math.max(num(a.solved), num(b.solved)),
    gold: Math.max(num(a.gold), num(b.gold)),
    best: Math.max(num(a.best), num(b.best)),
    streak: num(latest.streak),
    last: latest.last ?? -1,
    by,
    days,
  };
}
/** Une el guardado en memoria (`mine`) con el que ya está escrito (`disk`). Devuelve un objeto nuevo; no toca ninguno de los dos. */
export function mergeSaves(mine = {}, disk = {}) {
  const out = {
    ...mine,
    paths: mergePaths(mine.paths, disk?.paths),
    ach: mergeAch(mine.ach, disk?.ach),
    stats: mergeStats(mine.stats, disk?.stats),
  };
  const daily = mergeDaily(mine.daily, disk?.daily);
  if (daily) out.daily = daily;
  if (disk?.survival && (!mine.survival || disk.survival.updatedAt > mine.survival.updatedAt)) {
    out.survival = disk.survival;
  }
  const survivalBest = Math.max(survivalBestLevel(mine), disk ? survivalBestLevel(disk) : 0);
  if (survivalBest) out.survivalBest = survivalBest;
  const a = mine.dailyPlay,
    b = disk?.dailyPlay;
  if (!a || (b && b.day > a.day)) {
    if (b) out.dailyPlay = b;
  } else if (b?.day === a.day) {
    const challenges = { ...obj(b.challenges) };
    for (const [id, result] of Object.entries(obj(a.challenges))) {
      if (!challenges[id] || result.updatedAt >= challenges[id].updatedAt) challenges[id] = result;
    }
    out.dailyPlay = { day: a.day, challenges };
  }
  return out;
}

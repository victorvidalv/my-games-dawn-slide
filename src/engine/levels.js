import { decodeBoard, mutate } from './board.js';
import { analyze, maxDistance } from './solver.js';
import { mulberry32 } from './rng.js';
import { braveExtra, curve, WINDOW } from './difficulty.js';
import { hash32 } from './rng.js';
import { boardInterest, pickInteresting, INTEREST_MAX_TARGET } from './interest.js';

/**
 * Banco de tableros precalculados: `bank[rating-1]` es una lista de textos de tablero
 * (ver encodeBoard). Se generan con `npm run levels`, así cada nivel está garantizado
 * y se carga al instante, sin esperas ni diferencias entre dispositivos.
 * `special[familia][rating-1]` trae los mismos tableros decorados con muros, candados o piezas pesadas
 * (`npm run levels:decorate`); si falta una familia se usa el tablero normal.
 */
/** Letras (w h g i d) de una familia de tableros especiales, o null. */
const LETTERS = { walls: 'w', heavy: 'h', gates: 'g', ice: 'i', doors: 'd' };
const lettersOf = (f) => LETTERS[f] ?? /^combo_([whgid]+)$/.exec(f)?.[1] ?? null;
const keyOf = (l) => (l.length === 1 ? Object.keys(LETTERS).find((k) => LETTERS[k] === l) : `combo_${l}`);
/**
 * Si una familia no tiene tableros a esa dificultad se prueba con la más parecida: primero la misma, luego las combinaciones que contienen
 * la mayoría de sus mecánicas (de más a menos letras) y al final las piezas sueltas.
 */
export function fallbackChain(family, special = null) {
  if (family === 'plain') return ['plain'];
  const want = lettersOf(family);
  if (!want) return [family, 'plain'];
  const keys = Object.keys(special || {}).filter((k) => lettersOf(k));
  const overlap = (k) => [...lettersOf(k)].filter((c) => want.includes(c)).length;
  const rest = keys.filter((k) => k !== family && overlap(k) > 0)
    .sort((a, b) => overlap(b) - overlap(a) || Math.abs(lettersOf(a).length - want.length) - Math.abs(lettersOf(b).length - want.length) || a.localeCompare(b));
  return [family, ...rest, keyOf(want[0])].filter((v, i, a) => a.indexOf(v) === i);
}

export function pickBoard(bank, rating, seed, level, family = 'plain', special = null) {
  let used = 'plain';
  let list = bank[rating - 1];
  for (const f of fallbackChain(family, special)) {
    const l = f === 'plain' ? bank[rating - 1] : special?.[f]?.[rating - 1];
    if (l?.length) { used = f; list = l; break; }
  }
  if (!list || !list.length) throw new Error(`Sin tableros para la dificultad ${rating}`);
  const text = list[hash32(seed, level, rating) % list.length];
  return { ...decodeBoard(text), family: used };
}

/**
 * Variante nueva de un tablero del banco: cambia 1-3 piezas al azar y solo acepta el cambio si el tablero
 * sigue teniendo solución y alcanza el mínimo objetivo de la dificultad (se comprueba con el solver).
 * En las dificultades bajas tampoco puede perder interés (ver interest.js): la variante no vuelve fome un tablero pensado.
 * Así dos partidas nunca repiten tablero aunque el banco sea finito. Determinista para una semilla.
 */
export function varyBoard(board, rating, seed, { tries = 8, changes = 3 } = {}) {
  const rng = mulberry32(seed);
  const { target, pLong } = curve(rating);
  const walls = board.walls || [];
  const doors = board.doors || [];
  let cur = { pieces: board.pieces, pos: board.pos, walls, doors };
  let accepted = 0;
  const hasIce = board.pieces.some((p) => p.kind === 'ice');
  let quality = null;                                   // interés del tablero actual (solo se calcula en dificultades bajas)
  if (target <= INTEREST_MAX_TARGET) {
    const an0 = analyze(cur.pieces, cur.pos, 600000, walls, doors);
    if (an0) quality = boardInterest(cur.pieces, an0, target, walls, doors);
  }
  for (let t = 0; t < tries && accepted < changes; t++) {
    const cand = mutate(cur, rng, pLong);
    if (!cand) continue;
    const an = analyze(cand.pieces, cand.pos, 600000, walls, doors);
    if (an && (!hasIce || an.dist.size === an.list.length) && maxDistance(an) >= target) {
      if (quality !== null) {
        const q = boardInterest(cand.pieces, an, target, walls, doors);
        if (q < quality - 0.05) continue;
        quality = Math.max(quality, q);
      }
      cur = cand;
      accepted++;
    }
  }
  return { ...cur, family: board.family };
}

/**
 * Elige el estado inicial de un tablero para el nivel.
 *  - adj: ajuste adaptativo (-2..+2) según la eficiencia del jugador en niveles anteriores.
 *  - brave: ruta aventurera → usa la siguiente distancia mayor disponible.
 * Entre los estados con ese mínimo NO elige al azar: toma uno de los más interesantes (pickInteresting), así ningún nivel es «despeja y sal».
 * Devuelve {pieces, pos, walls, doors, opt} donde opt = movimientos mínimos reales del estado elegido.
 */
export function buildLevel(board, { rating, adj = 0, brave = false, rng = Math.random, boost = 0, withAnalysis = false }) {
  const walls = board.walls || [];
  const doors = board.doors || [];
  const an = analyze(board.pieces, board.pos, 600000, walls, doors);
  if (!an) throw new Error('Tablero sin solución');
  const target = curve(rating).target;
  let maxd = 0;
  for (const d of an.dist.values()) if (d > maxd) maxd = d;
  const lo = Math.max(1, Math.min(target, maxd) - WINDOW);
  const hi = Math.min(maxd, Math.max(target, lo) + WINDOW);
  const byDist = new Map();
  for (const k of an.list) {
    const d = an.dist.get(k);
    if (d === undefined || d < lo || d > hi) continue;
    if (!byDist.has(d)) byDist.set(d, []);
    byDist.get(d).push(k);
  }
  const ds = [...byDist.keys()];
  const want = Math.max(1, target + adj + boost);
  const normal = ds.reduce((a, b) => (Math.abs(b - want) < Math.abs(a - want) ? b : a));
  const higher = ds.filter((v) => v > normal);
  const wantBrave = normal + braveExtra(normal);                   // ruta aventurera: más movimientos, el más cercano disponible
  const opt = brave && higher.length ? higher.reduce((a, b) => (Math.abs(b - wantBrave) < Math.abs(a - wantBrave) ? b : a)) : normal;
  // entre los estados a esa distancia se queda con uno de los que más hacen pensar (dependencias, sentidos variados, trampas)
  const { key } = pickInteresting(board.pieces, byDist.get(opt), an, walls, doors, { rng });
  const pos = [];
  for (let i = 0, v = key; i < board.pieces.length; i++, v = Math.floor(v / 8)) pos.push(v % 8);
  return { pieces: board.pieces, pos, walls, doors, opt, ...(withAnalysis ? { analysis: an } : {}) };
}


import { N } from './board.js';
import { analyze } from './solver.js';
import { mulberry32 } from './rng.js';

/**
 * Piezas especiales que se añaden a un tablero del banco:
 *   gates   – una pieza pasa a ser candado con su placa;
 *   heavy   – una pieza pasa a ser pesada (avanza de a una casilla);
 *   ice     – una pieza pasa a ser de hielo (patina hasta el tope sin parar a medias);
 *   mixed   – combina muros + candado + pesada + hielo sobre un tablero de la familia «walls».
 * minGain = cuántos movimientos más debe costar la solución respecto al tablero sin decorar:
 * así el elemento especial IMPORTA (si no cambiara la solución, sería un adorno sin sentido).
 * Además, si lleva hielo se exige cero callejones sin salida (an.dist.size === an.list.length),
 * garantizando que el jugador nunca quede atrapado sin solución desde ningún estado alcanzable.
 */
export const FAMILIES = {
  gates: { gate: 1, minGain: 1 },
  heavy: { heavy: 1, minGain: 1 },
  ice: { ice: 1, minGain: 1 },
  duo: { duo: 1, minGain: 2 },
  mixed: { gate: 1, heavy: 1, ice: 1, minGain: 2, base: 'walls' },
  all: { gate: 1, heavy: 1, ice: 1, minGain: 2, base: 'walls' }, // las cuatro mecánicas a la vez (roca, candado, pesada e hielo)
};

/**
 * Familias exactas por combinación de mecánicas (las que decide el calibrador): `combo_<letras>` con las letras de
 * w = roca, h = pesada, g = candado, i = hielo, siempre en ese orden (p. ej. `combo_hg`, `combo_whgi`).
 * Con roca el tablero parte de uno con rocas (`base: 'walls'`); el resto se decora pieza a pieza.
 */
export const comboKey = (letters) => 'combo_' + [...'whgi'].filter((c) => letters.includes(c)).join('');
export function familySpec(name) {
  if (FAMILIES[name]) return FAMILIES[name];
  const m = /^combo_([whgi]+)$/.exec(name);
  if (!m) return null;
  const l = m[1];
  const spec = { minGain: l.replace('w', '').length >= 2 ? 2 : 1 };
  if (l.includes('h')) spec.heavy = 1;
  if (l.includes('g')) spec.gate = 1;
  if (l.includes('i')) spec.ice = 1;
  if (l.includes('w')) spec.base = 'walls';
  return spec;
}

const DUO_PAIRS = [
  ['heavy', 'ice'],
  ['gate', 'ice'],
  ['gate', 'heavy'],
];

/** Celdas por las que puede pasar alguna pieza (sus carriles), saltando la pieza `skip`. */
function laneCells(pieces, skip = -1) {
  const cells = new Set();
  pieces.forEach((p, i) => {
    if (i === skip) return;
    for (let k = 0; k < N; k++) cells.add(p.o === 'h' ? p.fix * N + k : k * N + p.fix);
  });
  return cells;
}

/** Piezas (sin contar la llave roja) que cumplen `ok`. */
const candidates = (pieces, ok) => pieces.map((p, i) => i).filter((i) => i > 0 && ok(pieces[i], i));

/** Una pieza de largo 2 pasa a ser pesada. Devuelve false si no hay ninguna. */
function placeHeavy(pieces, used, pick) {
  const cand = candidates(pieces, (p) => p.len === 2);
  if (!cand.length) return false;
  const i = pick(cand);
  pieces[i].kind = 'heavy';
  used.add(i);
  return true;
}

/** `count` piezas libres pasan a ser de hielo. Devuelve false si no queda ninguna libre. */
function placeIce(pieces, used, rng, count) {
  const cand = candidates(pieces, (p, i) => !used.has(i));
  if (!cand.length) return false;
  for (let m = 0; m < count && cand.length; m++) {
    const idx = Math.floor(rng() * cand.length);
    const i = cand[idx];
    pieces[i].kind = 'ice';
    used.add(i);
    cand.splice(idx, 1);
  }
  return true;
}

/** Casillas donde puede ir la placa del candado `i`: fuera de su carril, sin muro y en el carril de otra pieza. */
function plateOptions(pieces, i, walls) {
  const lanes = laneCells(pieces, i); // la placa debe poder ser cubierta por OTRA pieza
  const wallSet = new Set(walls.map(([r, c]) => r * N + c));
  const options = [];
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      const onGateLane = pieces[i].o === 'h' ? r === pieces[i].fix : c === pieces[i].fix; // nunca en el carril del candado
      if (!onGateLane && lanes.has(r * N + c) && !wallSet.has(r * N + c)) options.push([r, c]);
    }
  return options;
}

/** Una pieza libre pasa a ser candado, con su placa. Devuelve false si no se pudo. */
function placeGate(pieces, used, pick, walls) {
  const cand = candidates(pieces, (p, i) => !used.has(i));
  if (!cand.length) return false;
  const i = pick(cand);
  const options = plateOptions(pieces, i, walls);
  if (!options.length) return false;
  pieces[i].kind = 'gate';
  pieces[i].plate = pick(options);
  return true;
}

/** Qué mecánicas lleva el intento `t` (la familia «duo» rota entre parejas) y cuántas piezas de hielo. */
function attemptPlan(spec, seed, t, attempts) {
  const pair = spec.duo ? DUO_PAIRS[(seed + t) % DUO_PAIRS.length] : null;
  const has = (m) => !!(spec[m] || pair?.includes(m));
  // con hielo puro se prueban primero tableros con 1 pieza de hielo, luego con 2 y al final con 3
  const iceCount = spec.ice ? (t < attempts / 3 ? 1 : t < (attempts * 2) / 3 ? 2 : 3) : 1;
  return { heavy: has('heavy'), ice: has('ice'), gate: has('gate'), iceCount };
}

/** Decora una copia del tablero según el plan; null si alguna mecánica no cabe. */
function decorateOnce(board, plan, rng, pick, walls) {
  const pieces = board.pieces.map((p) => ({ ...p }));
  const used = new Set([0]);
  if (plan.heavy && !placeHeavy(pieces, used, pick)) return null;
  if (plan.ice && !placeIce(pieces, used, rng, plan.iceCount)) return null;
  if (plan.gate && !placeGate(pieces, used, pick, walls)) return null;
  return pieces;
}

/**
 * Añade mecánicas especiales a `board` ({pieces,pos,walls}) y comprueba con el solver que:
 *  - sigue teniendo solución desde la misma posición inicial,
 *  - cuesta al menos `minGain` movimientos más que sin decorar.
 * Devuelve {pieces, pos, walls, plain, opt} o null si no lo consigue en `tries` intentos. Determinista por semilla.
 */
export function decorateBoard(board, family, seed, { tries, minOpt = 0 } = {}) {
  const spec = familySpec(family);
  if (!spec) throw new Error(`Familia desconocida: ${family}`);
  const rng = mulberry32(seed);
  const walls = board.walls || [];
  const plainAn = analyze(board.pieces, board.pos, 600000, walls);
  if (!plainAn) return null;
  const plain = plainAn.dist.get(plainAn.k0);
  const targetOpt = Math.max(plain + spec.minGain, minOpt);
  const cap = Math.min(600000, Math.max(120000, plainAn.list.length * 2));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const attempts = tries ?? (spec.ice || spec.duo ? 90 : 48);

  for (let t = 0; t < attempts; t++) {
    const plan = attemptPlan(spec, seed, t, attempts);
    const pieces = decorateOnce(board, plan, rng, pick, walls);
    if (!pieces) continue;
    const an = analyze(pieces, board.pos, cap, walls);
    if (!an) continue;
    if (plan.ice && an.dist.size < an.list.length) continue; // cero callejones sin salida alcanzables
    const opt = an.dist.get(an.k0);
    if (opt === undefined || opt < targetOpt) continue;
    return { pieces, pos: board.pos.slice(), walls, plain, opt };
  }
  return null;
}

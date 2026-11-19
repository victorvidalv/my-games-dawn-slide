import { N, TONES } from './board.js';
import { analyze } from './solver.js';
import { mulberry32 } from './rng.js';

/**
 * Piezas especiales que se añaden a un tablero del banco:
 *   gates   – una pieza pasa a ser candado con su placa;
 *   heavy   – una pieza pasa a ser pesada (avanza de a una casilla);
 *   ice     – una pieza pasa a ser de hielo (patina hasta el tope sin parar a medias);
 *   doors   – un portón de color que solo deja pasar a la pieza de su mismo tinte;
 *   doorduo – combina portón de color con otra mecánica especial o un segundo portón;
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
  doors: { door: 1, minGain: 1 },
  doorduo: { doorDuo: 1, minGain: 2 },
  mixed: { gate: 1, heavy: 1, ice: 1, minGain: 2, base: 'walls' },
  all: { gate: 1, heavy: 1, ice: 1, door: 1, minGain: 2, base: 'walls' }, // las cinco piezas a la vez (roca, candado, pesada, hielo y portón)
};

/**
 * Familias exactas por combinación de mecánicas (las que decide el calibrador): `combo_<letras>` con las letras de
 * w = roca, h = pesada, g = candado, i = hielo, d = portón, siempre en ese orden (p. ej. `combo_hg`, `combo_gid`).
 * Con roca el tablero parte de uno con rocas (`base: 'walls'`); el resto se decora pieza a pieza.
 */
export const comboKey = (letters) => 'combo_' + [...'whgid'].filter((c) => letters.includes(c)).join('');
export function familySpec(name) {
  if (FAMILIES[name]) return FAMILIES[name];
  const m = /^combo_([whgid]+)$/.exec(name);
  if (!m) return null;
  const l = m[1];
  const spec = { minGain: l.replace('w', '').length >= 2 ? 2 : 1 };
  if (l.includes('h')) spec.heavy = 1;
  if (l.includes('g')) spec.gate = 1;
  if (l.includes('i')) spec.ice = 1;
  if (l.includes('d')) spec.door = 1;
  if (l.includes('w')) spec.base = 'walls';
  return spec;
}

const DUO_PAIRS = [
  ['heavy', 'ice'],
  ['gate', 'ice'],
  ['gate', 'heavy'],
];
const DOOR_COMBOS = [['door2'], ['door', 'heavy'], ['door', 'ice'], ['door', 'gate']];

/** Celdas por las que puede pasar alguna pieza (sus carriles), saltando la pieza `skip`. */
function laneCells(pieces, skip = -1) {
  const cells = new Set();
  pieces.forEach((p, i) => {
    if (i === skip) return;
    for (let k = 0; k < N; k++) cells.add(p.o === 'h' ? p.fix * N + k : k * N + p.fix);
  });
  return cells;
}

/**
 * Añade mecánicas especiales a `board` ({pieces,pos,walls,doors}) y comprueba con el solver que:
 *  - sigue teniendo solución desde la misma posición inicial,
 *  - cuesta al menos `minGain` movimientos más que sin decorar.
 * Devuelve {pieces, pos, walls, doors, plain, opt} o null si no lo consigue en `tries` intentos. Determinista por semilla.
 */
export function decorateBoard(board, family, seed, { tries, minOpt = 0 } = {}) {
  const spec = familySpec(family);
  if (!spec) throw new Error(`Familia desconocida: ${family}`);
  const rng = mulberry32(seed);
  const walls = board.walls || [];
  const baseDoors = board.doors || [];
  const plainAn = analyze(board.pieces, board.pos, 600000, walls, baseDoors);
  if (!plainAn) return null;
  const plain = plainAn.dist.get(plainAn.k0);
  const targetOpt = Math.max(plain + spec.minGain, minOpt);
  const cap = Math.min(600000, Math.max(120000, plainAn.list.length * 2));
  const n = board.pieces.length;
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const attempts = tries ?? (spec.ice || spec.duo || spec.doorDuo ? 90 : spec.door ? 120 : 48);

  for (let t = 0; t < attempts; t++) {
    const pieces = board.pieces.map((p) => ({ ...p }));
    const doors = baseDoors.map((d) => d.slice());
    const used = new Set([0]);
    const pair = spec.duo
      ? DUO_PAIRS[(seed + t) % DUO_PAIRS.length]
      : spec.doorDuo
        ? DOOR_COMBOS[(seed + t) % DOOR_COMBOS.length]
        : null;
    const useHeavy = spec.heavy || pair?.includes('heavy');
    const useIce = spec.ice || pair?.includes('ice');
    const useGate = spec.gate || pair?.includes('gate');
    const doorCount = pair?.includes('door2') ? 2 : spec.door || pair?.includes('door') ? 1 : 0;
    if (useHeavy) {
      const cand = [];
      for (let i = 1; i < n; i++) if (pieces[i].len === 2) cand.push(i);
      if (!cand.length) continue;
      const i = pick(cand);
      pieces[i].kind = 'heavy';
      used.add(i);
    }
    if (useIce) {
      const count = spec.ice ? (t < attempts / 3 ? 1 : t < (attempts * 2) / 3 ? 2 : 3) : 1;
      const cand = [];
      for (let i = 1; i < n; i++) if (!used.has(i)) cand.push(i);
      if (!cand.length) continue;
      for (let m = 0; m < count && cand.length; m++) {
        const idx = Math.floor(rng() * cand.length);
        const i = cand[idx];
        pieces[i].kind = 'ice';
        used.add(i);
        cand.splice(idx, 1);
      }
    }
    if (useGate) {
      const cand = [];
      for (let i = 1; i < n; i++) if (!used.has(i)) cand.push(i);
      if (!cand.length) continue;
      const i = pick(cand);
      const lanes = laneCells(pieces, i); // la placa debe poder ser cubierta por OTRA pieza
      const wallSet = new Set(walls.map(([r, c]) => r * N + c));
      const options = [];
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const onGateLane = pieces[i].o === 'h' ? r === pieces[i].fix : c === pieces[i].fix; // nunca en el carril del candado
          if (!onGateLane && lanes.has(r * N + c) && !wallSet.has(r * N + c)) options.push([r, c]);
        }
      }
      if (!options.length) continue;
      pieces[i].kind = 'gate';
      pieces[i].plate = pick(options);
    }
    if (doorCount > 0) {
      const blocked = new Set(walls.map(([r, c]) => r * N + c));
      for (const [r, c] of doors) blocked.add(r * N + c);
      for (const p of pieces) if (p.plate) blocked.add(p.plate[0] * N + p.plate[1]);
      // Mapa de ocupación inicial (cell -> índice de pieza); solo esa pieza con el mismo tinte podría estar encima al empezar
      const initAt = new Int8Array(N * N).fill(-1);
      pieces.forEach((p, idx) => {
        for (let k = 0; k < p.len; k++)
          initAt[p.o === 'h' ? p.fix * N + board.pos[idx] + k : (board.pos[idx] + k) * N + p.fix] = idx;
      });
      let okDoors = true;
      for (let d = 0; d < doorCount; d++) {
        const tone = TONES[(seed + t + d) % TONES.length];
        const toneCandidates = [];
        for (let i = 1; i < n; i++) {
          if (pieces[i].tone !== undefined && pieces[i].tone !== tone) continue;
          const otherLanes = laneCells(pieces, i);
          for (let k = 0; k < N; k++) {
            const r = pieces[i].o === 'h' ? pieces[i].fix : k;
            const c = pieces[i].o === 'h' ? k : pieces[i].fix;
            const cell = r * N + c;
            if (r === 2 && c >= board.pos[0]) continue; // nunca bloquear la salida directa de la llave
            if (blocked.has(cell) || (initAt[cell] >= 0 && initAt[cell] !== i) || !otherLanes.has(cell)) continue;
            toneCandidates.push({ i, r, c });
          }
        }
        if (!toneCandidates.length) {
          okDoors = false;
          break;
        }
        const chosen = pick(toneCandidates);
        pieces[chosen.i].tone = tone;
        doors.push([chosen.r, chosen.c, tone]);
        blocked.add(chosen.r * N + chosen.c);
      }
      if (!okDoors) continue;
    }
    const an = analyze(pieces, board.pos, cap, walls, doors);
    if (!an) continue;
    if (useIce && an.dist.size < an.list.length) continue; // cero callejones sin salida alcanzables
    const opt = an.dist.get(an.k0);
    if (opt === undefined || opt < targetOpt) continue;
    return { pieces, pos: board.pos.slice(), walls, doors, plain, opt };
  }
  return null;
}

import { N } from './board.js';
import { expand } from './solver.js';

/**
 * ¿Cuánto hay que PENSAR para resolver un estado? El mínimo de movimientos no lo dice: «tres bloques que se apartan
 * hacia el mismo lado» cuesta lo mismo que una cadena donde hay que soltar una pieza para poder mover otra.
 * Se recorre una solución óptima y se mide:
 *   locked  – fracción de movimientos (sin contar la salida final) que NO se podían hacer desde el estado inicial:
 *             son dependencias reales («primero esto, luego aquello»). Con 0 el nivel es «despeja y sal», en cualquier orden.
 *   dirs    – variedad de sentidos (arriba/abajo/izquierda/derecha) de esos movimientos, 0 = todos hacia el mismo lado.
 *   run     – la racha más larga de movimientos seguidos hacia el mismo lado (fracción del total).
 *   mix     – se mueven piezas horizontales y verticales (además de la llave).
 *   choice  – fracción media de movimientos posibles que NO acercan a la salida (trampas: cuánto se puede uno equivocar).
 *   revisit – piezas que hay que mover más de una vez (ir y volver).
 * `score` (0..1) las combina; `trivial` marca los niveles sin ninguna dependencia o con todo hacia el mismo lado.
 *
 * @param {object[]} pieces
 * @param {number} key        estado inicial (clave base 8)
 * @param {{dist: Map<number, number>}} an   análisis del solver de la componente
 */
export function interestOf(pieces, key, an, walls = []) {
  const total = an.dist.get(key);
  if (!total) return { score: 0, trivial: true, locked: 0, dirs: 0, run: 0, mix: 0, choice: 0, revisit: 0, moves: 0 };
  const pos = new Array(pieces.length).fill(0);
  const g = new Int8Array(N * N);
  const initial = new Set();
  expand(pieces, key, pos, g, (i, y) => initial.add(i * 8 + y), walls);

  const path = [];
  let cur = key;
  let choiceSum = 0;
  for (let d = total; d > 0; d--) {
    let legal = 0;
    let good = 0;
    let pick = null;
    expand(
      pieces,
      cur,
      pos,
      g,
      (i, y, nk) => {
        legal++;
        if (an.dist.get(nk) !== d - 1) return;
        good++;
        // entre los óptimos se prefiere seguir con una pieza distinta a la anterior (soluciones más «naturales» y estables)
        if (!pick || (path.length && pick.i === path[path.length - 1].i && i !== pick.i))
          pick = { i, from: pos[i], to: y, nk };
      },
      walls,
    );
    if (!pick) break;
    choiceSum += legal ? 1 - good / legal : 0;
    path.push(pick);
    cur = pick.nk;
  }
  const body = path.slice(0, -1); // la última es la llave saliendo: no cuenta
  const m = body.length;
  if (!m) return { score: 0, trivial: true, locked: 0, dirs: 0, run: 0, mix: 0, choice: 0, revisit: 0, moves: total };

  let locked = 0;
  const dirCount = [0, 0, 0, 0];
  const times = new Map();
  let h = false;
  let v = false;
  let run = 1;
  let best = 1;
  let prev = -1;
  for (const s of body) {
    if (!initial.has(s.i * 8 + s.to)) locked++;
    const p = pieces[s.i];
    const dir = (p.o === 'h' ? 0 : 2) + (s.to > s.from ? 1 : 0);
    dirCount[dir]++;
    run = dir === prev ? run + 1 : 1;
    if (run > best) best = run;
    prev = dir;
    times.set(s.i, (times.get(s.i) || 0) + 1);
    if (s.i !== 0) {
      if (p.o === 'h') h = true;
      else v = true;
    }
  }
  let entropy = 0;
  for (const c of dirCount) if (c) entropy -= (c / m) * Math.log(c / m);
  const dirs = m > 1 ? entropy / Math.log(Math.min(4, m)) : 0;
  let revisit = 0;
  for (const t of times.values()) if (t > 1) revisit++;
  const f = {
    locked: locked / m,
    dirs,
    run: m > 1 ? best / m : 1,
    mix: h && v ? 1 : 0,
    choice: choiceSum / path.length,
    revisit: Math.min(1, revisit / 2),
    moves: total,
  };
  const score = 0.34 * f.locked + 0.2 * f.dirs + 0.12 * (1 - f.run) + 0.12 * f.mix + 0.14 * f.choice + 0.08 * f.revisit;
  return { ...f, score, trivial: locked === 0 || (m >= 2 && dirs === 0) };
}

/** Hasta este mínimo objetivo se optimiza el interés al generar y variar tableros (más arriba las soluciones largas ya se entrelazan solas). */
export const INTEREST_MAX_TARGET = 16;

/**
 * La más interesante de una lista de claves de estado (se puntúan como mucho `sample`, repartidas por toda la lista).
 * Entre las casi empatadas con la mejor (a menos de `slack`) elige con `rng`, para que las partidas no se repitan.
 */
export function pickInteresting(pieces, keys, an, walls = [], { sample = 40, rng = null, slack = 0.04 } = {}) {
  const step = Math.max(1, keys.length / sample);
  const offset = rng ? Math.floor(rng() * step) : 0;
  const scored = [];
  for (let x = offset; x < keys.length; x += step) {
    const key = keys[Math.floor(x)];
    scored.push({ key, f: interestOf(pieces, key, an, walls) });
  }
  scored.sort((a, b) => b.f.score - a.f.score || a.key - b.key);
  const top = scored.filter((s) => s.f.score >= scored[0].f.score - slack && s.f.trivial === scored[0].f.trivial);
  return top[rng ? Math.floor(rng() * top.length) : 0];
}

/**
 * Interés de un TABLERO para un mínimo objetivo: media, sobre las distancias que el juego puede pedir (objetivo ± 1),
 * del mejor estado inicial de cada una. 0..1; una distancia sin estados o solo con estados triviales cuenta 0.
 */
export function boardInterest(pieces, an, target, walls = [], per = 14) {
  const lo = Math.max(2, target - 1);
  const hi = Math.max(lo, target + 1);
  const by = [];
  for (let d = lo; d <= hi; d++) by.push([]);
  for (const [k, d] of an.dist) if (d >= lo && d <= hi) by[d - lo].push(k);
  let sum = 0;
  for (const keys of by) {
    if (!keys.length) continue;
    const best = pickInteresting(pieces, keys, an, walls, { sample: per });
    if (!best.f.trivial) sum += best.f.score;
  }
  return sum / by.length;
}

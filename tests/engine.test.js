import { describe, it, expect } from 'vitest';
import {
  N,
  WIN_POS,
  encode,
  decode,
  encodeBoard,
  decodeBoard,
  isValidState,
  randomBoard,
  analyze,
  hintMove,
  minMoves,
  expand,
  curve,
  rateAt,
  moveLimit,
  MAX_LEVEL,
  generateBoard,
  mulberry32,
  calcGain,
  gainFor,
  baseScore,
  moveStatus,
  movesLeft,
  isWon,
  isLow,
} from '../src/engine/index.js';
import { runPoolCached as runPool } from './parallel/pool.js';

/** Tablero mínimo: llave roja sola → 1 movimiento (un arrastre largo hasta la salida). */
const solo = { pieces: [{ o: 'h', len: 2, fix: 2 }], pos: [0] };

/** Un coche vertical de largo 3 tapa la salida: hay que moverlo antes → 2 movimientos. */
const blocked = {
  pieces: [
    { o: 'h', len: 2, fix: 2 },
    { o: 'v', len: 3, fix: 4 },
  ],
  pos: [0, 1], // ocupa filas 1-3 de la columna 4
};

/** Primer tablero aleatorio que tiene solución (algunos tableros al azar no la tienen). */
function solvable(rng, others, pLong) {
  for (;;) {
    const b = randomBoard(rng, others, pLong);
    const an = analyze(b.pieces, b.pos);
    if (an) return { b, an };
  }
}

describe('solver', () => {
  it('cuenta un arrastre largo como un solo movimiento', () => {
    expect(minMoves(solo.pieces, solo.pos)).toBe(1);
  });
  it('calcula 2 movimientos cuando hay que apartar un bloque', () => {
    expect(minMoves(blocked.pieces, blocked.pos)).toBe(2);
  });
  it('un estado ya ganado tiene distancia 0 y no da pista', () => {
    expect(minMoves(solo.pieces, [WIN_POS])).toBe(0);
    expect(hintMove(solo.pieces, [WIN_POS])).toBeNull();
  });
  it('la pista siempre acorta la distancia en exactamente 1', () => {
    const h = hintMove(blocked.pieces, blocked.pos);
    expect(h.left).toBe(2);
    const next = blocked.pos.slice();
    next[h.i] = h.to;
    expect(minMoves(blocked.pieces, next)).toBe(1);
  });
  it('detecta tableros sin solución: una columna entera bloqueada', () => {
    const stuck = {
      pieces: [
        { o: 'h', len: 2, fix: 2 },
        { o: 'v', len: 3, fix: 2 },
        { o: 'v', len: 3, fix: 2 },
      ],
      pos: [0, 0, 3], // dos verticales de 3 llenan la columna 2 y no pueden moverse
    };
    expect(isValidState(stuck.pieces, stuck.pos)).toBe(true);
    expect(analyze(stuck.pieces, stuck.pos)).toBeNull();
    expect(minMoves(stuck.pieces, stuck.pos)).toBeNull();
  });
  it('los vecinos de un estado son simétricos (se puede volver con 1 movimiento)', () => {
    const rng = mulberry32(7);
    const { b, an } = solvable(rng, 8, 0.3);
    const g = new Int8Array(N * N);
    const pos = new Array(b.pieces.length).fill(0);
    for (const k of an.list.slice(0, 200)) {
      expand(b.pieces, k, pos, g, (i, y, nk) => {
        const back = [];
        expand(b.pieces, nk, new Array(b.pieces.length).fill(0), g, (j, z, bk) => back.push(bk));
        expect(back).toContain(k);
      });
    }
  });
  it('la distancia de cada vecino difiere como máximo en 1 (BFS exacto)', () => {
    const { b, an } = solvable(mulberry32(3), 7, 0.2);
    const g = new Int8Array(N * N);
    const pos = new Array(b.pieces.length).fill(0);
    for (const k of an.list.slice(0, 300)) {
      const d = an.dist.get(k);
      expand(b.pieces, k, pos, g, (i, y, nk) => {
        expect(Math.abs(an.dist.get(nk) - d)).toBeLessThanOrEqual(1);
      });
    }
  });
  it('seguir la pista desde cualquier estado llega a la victoria en `distancia` movimientos', () => {
    const { b, an } = solvable(mulberry32(11), 8, 0.3);
    const far = an.list.filter((k) => an.dist.get(k) >= 3).slice(0, 5);
    for (const k of far) {
      let pos = decode(k, b.pieces.length);
      const d0 = an.dist.get(k);
      let steps = 0;
      while (!isWon(pos)) {
        const h = hintMove(b.pieces, pos);
        pos = pos.slice();
        pos[h.i] = h.to;
        expect(isValidState(b.pieces, pos)).toBe(true);
        steps++;
        expect(steps).toBeLessThanOrEqual(d0);
      }
      expect(steps).toBe(d0);
    }
  });
});

describe('codificación', () => {
  it('encode/decode son inversos', () => {
    expect(decode(encode([3, 0, 5, 1]), 4)).toEqual([3, 0, 5, 1]);
  });
  it('encodeBoard/decodeBoard son inversos', () => {
    const b = randomBoard(mulberry32(5), 9, 0.3);
    expect(decodeBoard(encodeBoard(b.pieces, b.pos))).toEqual({ ...b, walls: [] });
  });
  it('randomBoard produce tableros válidos con la llave roja en la fila de salida', () => {
    for (let s = 1; s <= 50; s++) {
      const b = randomBoard(mulberry32(s), 3 + (s % 11), 0.3);
      expect(isValidState(b.pieces, b.pos)).toBe(true);
      expect(b.pieces[0]).toEqual({ o: 'h', len: 2, fix: 2 });
    }
  });
});

describe('dificultad', () => {
  it('rateAt sube desde la dificultad inicial de cada camino y nunca baja', () => {
    for (const start of [1, 50, 75]) {
      expect(rateAt(start, 1)).toBeGreaterThanOrEqual(start === 1 ? 1 : start === 50 ? 25 : 40); // Normal parte de 2 movimientos
      expect(rateAt(start, MAX_LEVEL)).toBeGreaterThanOrEqual(start === 1 ? 55 : start === 50 ? 75 : 95); // Normal termina en 22 movimientos
      for (let l = 2; l <= MAX_LEVEL; l++)
        if (start === 1 || l % 10 !== 1) expect(rateAt(start, l)).toBeGreaterThanOrEqual(rateAt(start, l - 1));
    }
  });
  it('los movimientos objetivo crecen con la dificultad (tutorial suave → 37)', () => {
    expect(curve(1).target).toBe(2);
    expect(curve(10).target).toBeLessThanOrEqual(3);
    expect(curve(20).target).toBe(6);
    expect(curve(30).target).toBe(11);
    expect(curve(50).target).toBe(19);
    expect(curve(75).target).toBe(29);
    expect(curve(100).target).toBe(37);
    for (let r = 2; r <= 100; r++) {
      expect(curve(r).target).toBeGreaterThanOrEqual(curve(r - 1).target);
      expect(curve(r).others).toBeGreaterThanOrEqual(curve(r - 1).others);
    }
  });
  it('el límite de movimientos al empezar Normal es ×2,0 del mínimo (con 4 de sobra como poco)', () => {
    expect(moveLimit(7)).toBe(14);
    expect(moveLimit(2)).toBe(6);
  });
});

describe('generador', () => {
  it('es determinista: misma semilla, mismo tablero', () => {
    // el determinismo no depende de cuántas vueltas dé la búsqueda: con pocas basta y el test tarda una fracción
    const a = generateBoard(12, 4242, { maxIters: 120 });
    const b = generateBoard(12, 4242, { maxIters: 120 });
    expect(encodeBoard(a.pieces, a.pos)).toBe(encodeBoard(b.pieces, b.pos));
    expect(a.maxd).toBe(b.maxd);
  });
  it('alcanza el mínimo objetivo y el estado devuelto está a esa distancia (en paralelo)', async () => {
    const rows = await runPool(
      'reach',
      [1, 8, 20, 28].map((rating) => ({ rating, seed: 1000 + rating })),
      { batch: 1 },
    );
    for (const g of rows) {
      expect(g.reached, `dif ${g.rating}`).toBe(true);
      expect(g.maxd).toBeGreaterThanOrEqual(g.target);
      expect(g.min).toBe(g.maxd);
      expect(g.far).toBe(g.maxd);
    }
  }, 120000);
});

describe('puntaje y límite de movimientos', () => {
  it('los puntos base dependen solo de los movimientos mínimos del tablero (55 por movimiento + 50)', () => {
    expect(baseScore(2)).toBe(160);
    expect(baseScore(11)).toBe(655);
    expect(baseScore(19)).toBe(1095);
    expect(baseScore(37)).toBe(2085);
    for (let opt = 2; opt < 37; opt++) expect(baseScore(opt + 1)).toBeGreaterThan(baseScore(opt));
    expect(calcGain(12, 12, 0).base).toBe(baseScore(12));
  });
  it('mínimo exacto = perfecto (+20%)', () => {
    const g = calcGain(5, 5, 0);
    expect(g.eff).toBe(1);
    expect(g.perfect).toBe(Math.round(baseScore(5) * 0.2));
  });
  it('al doble del mínimo no hay puntos', () => {
    expect(calcGain(10, 5, 0).pts).toBe(0);
  });
  it('la racha multiplica hasta ×1.5', () => {
    expect(calcGain(4, 4, 0).mult).toBeCloseTo(1.1);
    expect(calcGain(4, 4, 99).mult).toBeCloseTo(1.5);
  });
  it('las reglas de las cartas cambian el bono de Perfecto, el tope de la racha y la eficiencia que la mantiene', () => {
    expect(calcGain(4, 4, 0, { perfect: 0.35 }).perfect).toBe(Math.round(baseScore(4) * 0.35));
    expect(calcGain(4, 4, 99, { streakCap: 7 }).mult).toBeCloseTo(1.7);
    expect(calcGain(12, 10, 0).mult).toBe(1); // 80 % de eficiencia: sin racha normalmente
    expect(calcGain(12, 10, 0, { streakEff: 0.8 }).mult).toBeCloseTo(1.1);
  });
  it('el bono (positivo o negativo) suma ese porcentaje a los puntos', () => {
    const base = gainFor(4, 4, 0).total;
    expect(gainFor(4, 4, 0, { bonus: 0.25 }).total).toBe(base + Math.round(base * 0.25));
    expect(gainFor(4, 4, 0, { bonus: -0.15 }).total).toBe(base + Math.round(base * -0.15));
  });
  it('estado del contador: ok → pocos → último turno → sin turnos (ya no se puede mover)', () => {
    expect(moveStatus(3, 10)).toBe('ok');
    expect(moveStatus(6, 10)).toBe('ok');
    expect(moveStatus(7, 10)).toBe('warn'); // quedan 3: «piensa bien»
    expect(moveStatus(8, 10)).toBe('warn'); // quedan 2
    expect(moveStatus(9, 10)).toBe('last'); // queda 1
    expect(moveStatus(10, 10)).toBe('over'); // 0 turnos: terminó
    expect(moveStatus(11, 10)).toBe('over');
    expect(movesLeft(7, 10)).toBe(3);
    expect(movesLeft(12, 10)).toBe(0);
  });
  it('«pocos turnos» = quedan 3 movimientos (o el 20 % del límite si es más; en tableros cortos, no antes de gastar el 60 %) y aún se puede mover', () => {
    expect(isLow(6, 10)).toBe(false);
    expect(isLow(7, 10)).toBe(true); // quedan 3
    expect(isLow(17, 20)).toBe(true);
    expect(isLow(4, 6)).toBe(true); // límite 6: avisa con 2
    expect(isLow(3, 6)).toBe(false);
    expect(isLow(5, 8)).toBe(true); // límite 8: avisa con 3
    expect(isLow(27, 30)).toBe(true);
    expect(isLow(23, 30)).toBe(false); // 30: el 20 % son 6
    expect(isLow(24, 30)).toBe(true);
    expect(isLow(8, 10)).toBe(true);
    expect(isLow(9, 10)).toBe(true);
    expect(isLow(10, 10)).toBe(false); // sin turnos: ya no hay aviso, hay derrota
    expect(isLow(15, 20)).toBe(false);
    expect(isLow(16, 20)).toBe(true);
    expect(isLow(3, 4)).toBe(true); // límites pequeños: el último turno ya avisa
    expect(isLow(2, 4)).toBe(false);
  });
  it('al agotar los turnos no se puede seguir: todo estado con 0 turnos es «over»', () => {
    for (const limit of [4, 10, 33, 74]) {
      for (let moves = 0; moves <= limit + 2; moves++) {
        expect(moveStatus(moves, limit) === 'over').toBe(moves >= limit);
      }
    }
  });
});

import { describe, it, expect } from 'vitest';
import { MERCHANT_LINES, SHOP_NOTES } from '../src/data/merchant.js';
import { readFileSync } from 'node:fs';
import {
  SHOP_ITEMS,
  extraTurns,
  pathPrice,
  REVIVE_SHARE,
  MAX_REVIVES,
  reviveCost,
  canPaidRevive,
  payRevive,
  hasRevive,
  useRevive,
  bossRetriesLeft,
  freeRetry,
  useFreeRetry,
  FREE_RETRY_UNTIL,
  priceOf,
  availability,
  buy,
} from '../src/game/shop.js';
import { moveStatus } from '../src/engine/rules.js';
import { baseScore } from '../src/engine/scoring.js';

const mk = (score, over = {}) => ({
  run: { score, hints: 3, mode: 'c', spent: 0 },
  G: { n: 10, rate: 10, opt: 5, limit: 10, moves: 4, hist: [[1], [2]], pos: [3], start: [0], done: false, ...over },
});

describe('tienda: precios proporcionales', () => {
  it('incluye pista, +5 %, +10 % de turnos, rehacer y saltar (sin revivir)', () => {
    expect(SHOP_ITEMS.map((i) => i.id)).toEqual(['hint', 'moves3', 'moves', 'redo', 'skip']);
  });
  it('el precio es N niveles de esa dificultad: sube con el nivel y es proporcional a lo que se gana', () => {
    const levels = { hint: 0.6, redo: 0.8, moves3: 1.2, moves: 2, skip: 4 };
    for (const rating of [1, 25, 50, 100]) {
      for (const [id, n] of Object.entries(levels))
        expect(priceOf(id, rating)).toBe(Math.round((n * baseScore(rating) * pathPrice(1)) / 10) * 10);
    }
    for (const id of Object.keys(levels)) expect(priceOf(id, 80)).toBeGreaterThan(priceOf(id, 10));
    expect(priceOf('hint', 20)).toBeLessThan(priceOf('redo', 20));
    expect(priceOf('hint', 20)).toBeLessThan(priceOf('moves3', 20));
    expect(priceOf('moves3', 20)).toBeLessThan(priceOf('moves', 20));
    expect(priceOf('moves', 20)).toBeLessThan(priceOf('skip', 20));
  });
  it('cuesta más cuanto más difícil es el camino: Normal ×1, Difícil ×1,15, Experto ×1,30', () => {
    expect([1, 50, 75].map(pathPrice)).toEqual([1, 1.15, 1.3]);
    for (const id of ['hint', 'moves', 'skip']) {
      expect(priceOf(id, 40, 50)).toBeGreaterThan(priceOf(id, 40, 1));
      expect(priceOf(id, 40, 75)).toBeGreaterThan(priceOf(id, 40, 50));
    }
  });
  it('los turnos comprados son un % del límite del tablero (mínimo 1 y 2)', () => {
    expect(extraTurns('moves3', 4)).toBe(1);
    expect(extraTurns('moves', 4)).toBe(2);
    expect(extraTurns('moves3', 40)).toBe(2);
    expect(extraTurns('moves', 40)).toBe(4);
    expect(extraTurns('moves', 80)).toBe(8);
    expect(extraTurns('hint', 40)).toBe(0);
  });
});

describe('tienda: compras', () => {
  it('sin puntos suficientes no se compra nada y no se descuenta', () => {
    const { run, G } = mk(priceOf('moves', 10) - 1);
    const r = buy('moves', { run, G });
    expect(r.ok).toBe(false);
    expect(run.score).toBe(priceOf('moves', 10) - 1);
    expect(G.limit).toBe(10);
  });
  it('turnos extra pequeños (+5 %, mín. 1): suben el límite, descuentan el precio y registran bought', () => {
    const { run, G } = mk(100000, { moves: 10, limit: 10 });
    expect(moveStatus(G.moves, G.limit)).toBe('over');
    const r = buy('moves3', { run, G });
    expect(r).toEqual({ ok: true, price: priceOf('moves3', 10) });
    expect(G.limit).toBe(10 + 1);
    expect(G.bought).toBe(1);
    expect(run.score).toBe(100000 - priceOf('moves3', 10));
    expect(run.spent).toBe(priceOf('moves3', 10));
    expect(moveStatus(G.moves, G.limit)).not.toBe('over');
  });
  it('turnos extra grandes (+10 %, mín. 2): sube el límite, descuenta el precio y el jugador deja de estar eliminado', () => {
    const { run, G } = mk(100000, { moves: 11, limit: 10 });
    expect(moveStatus(G.moves, G.limit)).toBe('over');
    const r = buy('moves', { run, G });
    expect(r.ok).toBe(true);
    expect(G.limit).toBe(10 + extraTurns('moves', 10));
    expect(run.score).toBe(100000 - priceOf('moves', 10));
    expect(run.spent).toBe(priceOf('moves', 10));
    expect(moveStatus(G.moves, G.limit)).not.toBe('over');
  });
  it('pista: suma una pista', () => {
    const { run, G } = mk(100000);
    expect(buy('hint', { run, G }).ok).toBe(true);
    expect(run.hints).toBe(4);
  });
  it('permite comprar una pista por tablero y sigue exigiendo saldo suficiente', () => {
    const price = priceOf('hint', 10);
    const { run, G } = mk(price * 2);
    expect(buy('hint', { run, G })).toEqual({ ok: true, price });
    const reloaded = JSON.parse(JSON.stringify(run));
    expect(buy('hint', { run: reloaded, G }).ok).toBe(false);
    expect(reloaded.score).toBe(price);
    expect(buy('hint', { run, G: { ...G, n: G.n + 1 } })).toEqual({ ok: true, price });
    expect(run.score).toBe(0);
    expect(run.spent).toBe(price * 2);
    expect(run.hints).toBe(5);
    const poor = mk(price - 1);
    expect(buy('hint', poor).ok).toBe(false);
    expect(poor.run.score).toBe(price - 1);
  });
  it('el camino encarece la compra real', () => {
    const normal = mk(1e6);
    const expert = mk(1e6);
    expert.run.start = 75;
    buy('hint', normal);
    buy('hint', expert);
    expect(1e6 - expert.run.score).toBeGreaterThan(1e6 - normal.run.score);
  });
  it('rehacer: vuelve al inicio con 0 movimientos y conserva los turnos comprados', () => {
    const { run, G } = mk(100000);
    buy('moves', { run, G });
    const limit = G.limit;
    expect(buy('redo', { run, G }).ok).toBe(true);
    expect(G.moves).toBe(0);
    expect(G.hist).toEqual([]);
    expect(G.pos).toEqual(G.start);
    expect(G.limit).toBe(limit);
  });
  it('rehacer no está disponible si aún no has movido', () => {
    const { run, G } = mk(100000, { moves: 0 });
    expect(availability('redo', { run, G }).ok).toBe(false);
  });
  it('solo permite un paquete por tablero aunque se recargue o se reintente', () => {
    const session = mk(100000, { n: 11 });
    const first = buy('moves3', session);
    expect(first.ok).toBe(true);
    expect(buy('moves', session).ok).toBe(false);
    const reloaded = JSON.parse(JSON.stringify(session));
    reloaded.G.bought = 0;
    expect(buy('moves3', reloaded).ok).toBe(false);
    expect(reloaded.run.score).toBe(100000 - first.price);
    expect(buy('moves', { ...reloaded, G: { ...reloaded.G, n: 12 } }).ok).toBe(true);
  });
  it('un tablero de una versión anterior conserva su compra de turnos', () => {
    expect(buy('moves', mk(100000, { bought: 1 })).ok).toBe(false);
  });
  it('cobra un solo salto por ciudad y no deja saltar jefes', () => {
    const session = mk(100000, { n: 9 });
    const r = buy('skip', session);
    expect(r.ok).toBe(true);
    expect(session.run.score).toBe(100000 - priceOf('skip', 10));
    const { run } = JSON.parse(JSON.stringify(session));
    expect(buy('skip', { run, G: { ...session.G, n: 8 } }).ok).toBe(false);
    expect(buy('skip', { run, G: { ...session.G, n: 10 } }).ok).toBe(false);
    expect(buy('skip', { run, G: { ...session.G, n: 11 } }).ok).toBe(true);
    expect(buy('skip', { run, G: { ...session.G, n: 20 } }).ok).toBe(false);
  });
  it('en Práctica o sin tablero activo la tienda no vende', () => {
    expect(availability('hint', { ...mk(1e6), run: { ...mk(1e6).run, mode: 'p' } }).ok).toBe(false);
    expect(availability('hint', { run: mk(1e6).run, G: { ...mk(1e6).G, done: true } }).ok).toBe(false);
    expect(availability('hint', { run: null, G: null }).ok).toBe(false);
  });
  it('no se puede quedar en puntos negativos', () => {
    const { run, G } = mk(priceOf('hint', 10));
    expect(buy('hint', { run, G }).ok).toBe(true);
    expect(run.score).toBe(0);
    expect(buy('hint', { run, G }).ok).toBe(false);
    expect(run.score).toBe(0);
  });
});

describe('revivir al caer (fuera de la tienda)', () => {
  it('cuesta el 33 % de los puntos actuales y se permite máximo 1 vez por partida', () => {
    expect(REVIVE_SHARE).toBe(0.33);
    expect(MAX_REVIVES).toBe(1);
    expect(reviveCost(10000)).toBe(3300);
    expect(reviveCost(1001)).toBe(330);
    expect(reviveCost(0)).toBe(0);
  });
  it('cobra el 33 % de tus puntos actuales y bloquea un segundo revivir en la misma partida', () => {
    const run = { score: 10000, spent: 0, revivesBought: 0, mode: 'c' };
    expect(canPaidRevive(run)).toBe(true);
    expect(payRevive(run)).toEqual({ ok: true, cost: 3300 });
    expect(run.score).toBe(6700);
    expect(run.spent).toBe(3300);
    expect(run.revivesBought).toBe(1);
    expect(canPaidRevive(run)).toBe(false);
    expect(payRevive(run)).toEqual({ ok: false, cost: 0 });
    expect(run.score).toBe(6700);
  });
  it('no se puede revivir sin puntos ni en Práctica', () => {
    expect(canPaidRevive({ score: 0, revivesBought: 0, mode: 'c' })).toBe(false);
    expect(canPaidRevive({ score: 10000, revivesBought: 0, mode: 'p' })).toBe(false);
  });
  it('compatibilidad: si existe una carga antigua guardada, useRevive la consume sin quedar negativa', () => {
    const run = { revive: 1, hints: 3 };
    const G = { n: 12, rate: 12, pieces: [{ o: 'h', len: 2, fix: 2 }], walls: [[1, 1]], start: [1], opt: 5 };
    useRevive(run, G);
    expect(run.revive).toBe(0);
    expect(run.rescue).toMatchObject({ level: 12, opt: 5, kind: 'revive', start: [1], walls: [[1, 1]] });
    expect(run.rescue.pieces).not.toBe(G.pieces);
    useRevive(run, G);
    expect(run.revive).toBe(0);
    expect(hasRevive(run)).toBe(false);
  });
});

describe('tienda: textos sin porcentajes (solo «esto vale tanto»)', () => {
  it('ningún nombre ni descripción de la tienda habla de porcentajes', () => {
    for (const i of SHOP_ITEMS) expect(`${i.name} ${i.detail}`, i.id).not.toMatch(/%|porcentaje/i);
    const lines = [...Object.values(MERCHANT_LINES).flat(), ...Object.values(SHOP_NOTES)].join('\n');
    expect(lines).not.toMatch(/%/);
  });
});

describe('Don Dublón: vendedor sarcástico con frases variadas', () => {
  const pool = (name) => MERCHANT_LINES[name];
  it('al abrir la tienda hay 10 o más saludos distintos y al comprar 5 frases al azar', () => {
    const greet = pool('greet');
    expect(greet.length).toBeGreaterThanOrEqual(10);
    expect(new Set(greet).size).toBe(greet.length);
    expect(pool('bought')).toHaveLength(5);
    for (const k of ['hint', 'moves3', 'moves', 'redo', 'skip']) expect(pool(k).length, k).toBeGreaterThanOrEqual(3);
    expect(pool('poor').length).toBeGreaterThanOrEqual(4);
  });
  it('suena con campanilla, monedas y gesto de «no») y nunca repite la frase anterior', () => {
    for (const fn of ['merchantBell', 'merchantCoin', 'merchantNope'])
      expect(readFileSync(new URL('../src/audio/sound.js', import.meta.url), 'utf8')).toContain(fn);
    expect(readFileSync(new URL('../src/audio/sound.js', import.meta.url), 'utf8')).not.toContain('merchantTalk'); // sin balbuceo grave de fondo
    expect(readFileSync(new URL('../src/ui/shop.js', import.meta.url), 'utf8')).toMatch(/sin repetir la anterior/);
  });
});

describe('primeros pasos: en la primera ciudad del camino Normal se repite el tablero en vez de perder la partida', () => {
  it('los reintentos de aprendizaje solo se aplican a los niveles 1-9 de Normal', () => {
    const run = { start: 1, mode: 'c' };
    expect(FREE_RETRY_UNTIL).toBe(9);
    for (let l = 1; l <= 9; l++) expect(freeRetry(run, l)).toBe(true);
    expect(freeRetry(run, 10)).toBe(false);
    expect(freeRetry(run, 5, true)).toBe(false);
    expect(freeRetry({ start: 50, mode: 'c' }, 3)).toBe(false);
    expect(freeRetry({ start: 75, mode: 'c' }, 3)).toBe(false);
    expect(freeRetry({ start: 1, mode: 'p' }, 3)).toBe(false);
    expect(freeRetry(null, 3)).toBe(false);
  });
  it('repetir no cuesta puntos ni pistas, pero corta la racha, y deja el tablero listo para empezar de cero', () => {
    const run = { start: 1, mode: 'c', score: 900, hints: 2, streak: 4, revive: 0 };
    const G = { n: 3, rate: 5, pieces: [{ o: 'h', len: 2, fix: 2 }], start: [0], pos: [3], opt: 4, moves: 9, limit: 9 };
    useFreeRetry(run, G);
    expect(run).toMatchObject({ score: 900, hints: 2, streak: 0, revive: 0 });
    expect(run.rescue).toMatchObject({ kind: 'learn', level: 3, start: [0], opt: 4 });
  });
});

describe('reintentos gratis de jefe', () => {
  const boss = {
    n: 20,
    plan: { boss: true },
    rate: 15,
    pieces: [{ o: 'h', len: 2, fix: 2 }],
    start: [0],
    pos: [3],
    opt: 6,
    moves: 12,
    limit: 12,
    bought: 2,
    timeLimit: 180,
    timeLeft: 0,
  };
  it('comparte el cupo entre derrotas por tiempo y por turnos, conserva puntos y pistas, y cuenta por jefe', () => {
    const initial = { start: 50, mode: 'c', score: 900, hints: 2, streak: 4, revive: 1 };
    expect(bossRetriesLeft(initial, 20)).toBe(2);
    expect(useFreeRetry(initial, boss, 'time')).toBe(true);
    expect(initial).toMatchObject({
      score: 900,
      hints: 2,
      streak: 0,
      revive: 1,
      rescue: { level: 20, kind: 'boss', why: 'time', start: [0], limit: 10 },
    });
    const resumed = JSON.parse(JSON.stringify(initial));
    delete resumed.rescue;
    expect(bossRetriesLeft(resumed, 20)).toBe(1);
    expect(useFreeRetry(resumed, boss, 'limit')).toBe(true);
    expect(resumed.rescue.why).toBe('limit');
    expect(freeRetry(resumed, 20, true)).toBe(false);
    expect(useFreeRetry(resumed, boss, 'time')).toBe(false);
    expect(resumed.rescue.why).toBe('limit');
    expect(bossRetriesLeft(resumed, 30)).toBe(2);
  });
  it('excluye práctica, retos diarios y tableros que no son jefes', () => {
    expect(bossRetriesLeft({ mode: 'p' }, 20)).toBe(0);
    expect(bossRetriesLeft({ mode: 'c', daily: {} }, 20)).toBe(0);
    expect(bossRetriesLeft({ mode: 'c' }, 21)).toBe(0);
  });
});

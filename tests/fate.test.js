import { describe, it, expect } from 'vitest';
import {
  FATE_CARDS,
  FATE_PICKS,
  FATE_POINTS_RANGE,
  fateById,
  fateBlocks,
  fateCityRewards,
  fateDeck,
  fateMuted,
  fateOffer,
  fatePoints,
  fateRules,
  fateTurns,
  keepsStreak,
  needsFatePick,
  pickFate,
  usesFate,
} from '../src/game/fate.js';
import { runGain, shopDiscount } from '../src/game/run-points.js';
import { canHint, snapshotRescue, spendHint } from '../src/game/heroes.js';
import { availability, buy, canPaidRevive, payRevive, priceOf, reviveCost } from '../src/game/shop.js';
import { baseScore, calcGain } from '../src/engine/scoring.js';
import { moveLimit } from '../src/engine/difficulty.js';
import { buildAdventureLevel } from '../src/game/build-adventure.js';
import { applyAdventureWin, newAdventureRun } from '../src/game/run-logic.js';
import { TUTORIALS } from '../src/game/mechanics.js';
import { FATE_ART_IDS, fateArt } from '../src/ui/fate-art.js';
import levelBank from '../src/data/levels.json';
import special from '../src/data/special.json';

const run = (fate = [], extra = {}) => ({
  hero: 'jean',
  mode: 'c',
  start: 1,
  level: 11,
  seed: 46,
  hints: 3,
  score: 10000,
  fate,
  fatePicked: fate.length,
  ...extra,
});

describe('el mazo de 27 cartas del destino', () => {
  it('son 27 cartas distintas (9 elecciones × 3), 18 bendiciones y 9 pactos con costo', () => {
    expect(FATE_CARDS).toHaveLength(FATE_PICKS * 3);
    expect(new Set(FATE_CARDS.map((c) => c.id)).size).toBe(27);
    expect(new Set(FATE_CARDS.map((c) => c.name)).size).toBe(27);
    expect(FATE_CARDS.filter((c) => c.kind === 'pact')).toHaveLength(9);
    for (const c of FATE_CARDS) {
      expect(c.gain, c.id).toBeTruthy();
      expect(!!c.cost, `${c.id}: solo los pactos tienen costo`).toBe(c.kind === 'pact');
      expect(c.hue, c.id).toHaveLength(2);
      expect(Object.keys(c.fx).length, c.id).toBeGreaterThan(0);
    }
  });
  it('cada carta tiene su propia ilustración y sus propios colores', () => {
    expect(FATE_ART_IDS.sort()).toEqual(FATE_CARDS.map((c) => c.id).sort());
    const arts = FATE_CARDS.map((c) => fateArt(c));
    expect(new Set(arts).size).toBe(27);
    for (const a of arts) expect(a).toMatch(/^<svg[^>]*viewBox="0 0 64 64".*<\/svg>$/s);
    expect(new Set(FATE_CARDS.map((c) => c.hue.join())).size).toBe(27);
  });
  it('el mazo se baraja con la semilla: siempre igual para la misma partida y distinto entre partidas', () => {
    expect(fateDeck(7)).toEqual(fateDeck(7));
    expect(fateDeck(7)).not.toEqual(fateDeck(8));
    expect([...fateDeck(7)].sort()).toEqual(FATE_CARDS.map((c) => c.id).sort());
  });
  it('cada ciudad ofrece 3 cartas nuevas: en una partida pasan las 27, sin repetirse', () => {
    const r = run();
    const seen = [];
    for (let city = 1; city <= FATE_PICKS; city++) {
      const offer = fateOffer(r, city);
      expect(offer).toHaveLength(3);
      seen.push(...offer.map((c) => c.id));
    }
    expect(new Set(seen).size).toBe(27);
    expect(fateOffer(r, 0)).toEqual([]);
    expect(fateOffer(r, 10)).toEqual([]);
  });
  it('solo hay cartas en Aventura, al cerrar las ciudades 1 a 9, una vez cada una', () => {
    expect(usesFate(run())).toBe(true);
    expect(usesFate({ ...run(), mode: 'p' })).toBe(false);
    expect(usesFate({ ...run(), daily: {} })).toBe(false);
    expect(usesFate({ survival: {} })).toBe(false);
    const r = run();
    expect(needsFatePick(r, 10)).toBe(true);
    expect(needsFatePick(r, 11)).toBe(false);
    expect(needsFatePick(r, 100)).toBe(false);
    const id = fateOffer(r, 1)[0].id;
    expect(pickFate(r, id, 1)).toBeTruthy();
    expect(needsFatePick(r, 10)).toBe(false);
    expect(pickFate(r, fateOffer(r, 1)[1].id, 1), 'no se elige dos veces en la misma ciudad').toBeNull();
    expect(pickFate(r, fateOffer(r, 3)[0].id, 2), 'solo vale una carta de la oferta de esa ciudad').toBeNull();
    expect(r.fate).toEqual([id]);
  });
  it('una partida que empieza en el nivel 51 recibe cartas desde la ciudad 6', () => {
    const r = newAdventureRun({ seed: 3, start: 1, hero: 'lia', from: 51, hints: 3 });
    expect(needsFatePick(r, 50)).toBe(false);
    expect(needsFatePick(r, 60)).toBe(true);
  });
});

describe('efectos acumulativos', () => {
  it('los puntos de las cartas se suman (no se multiplican) y tienen tope', () => {
    expect(fatePoints(run(['brillo']))).toBeCloseTo(0.05);
    expect(fatePoints(run(['brillo', 'fortuna']))).toBeCloseTo(0.13);
    expect(fatePoints(run(['constelacion', 'brillo', 'respiro']))).toBeCloseTo(0.05 + 0.06);
    const greedy = [
      'juramento',
      'vidrio',
      'pacto-mercante',
      'silencio',
      'cuerda-floja',
      'temerario',
      'ofrenda',
      'fortuna',
    ];
    expect(fatePoints(run(greedy))).toBe(FATE_POINTS_RANGE[1]);
    expect(fatePoints(run(['pendulo-roto']))).toBeCloseTo(-0.15);
    expect(fatePoints(run(['long-board']), { opt: 13 })).toBe(0);
    expect(fatePoints(run(['long-board']), { opt: 14 })).toBeCloseTo(0.15);
  });
  it('el puntaje del tablero suma las cartas al bono y después la reliquia', () => {
    const base = calcGain(12, 10, 2).total;
    expect(runGain(run(), 12, 10, 2).total).toBe(base);
    expect(runGain(run(['fortuna']), 12, 10, 2).total).toBe(base + Math.round(base * 0.08));
    const withSun = runGain(run(['fortuna'], { relic: 'sun' }), 12, 10, 2).total;
    expect(withSun).toBe(Math.round(runGain(run(['fortuna']), 12, 10, 2).total * 1.15));
  });
  it('Destello, Racha larga, Racha firme y Vidrio cambian las reglas del puntaje', () => {
    expect(fateRules(run())).toEqual({ perfect: 0.2, streakCap: 5, streakEff: 0.9 });
    expect(fateRules(run(['destello'])).perfect).toBe(0.35);
    expect(fateRules(run(['racha-larga'])).streakCap).toBe(7);
    expect(keepsStreak(run(['racha-firme']), 0.8)).toBe(true);
    expect(keepsStreak(run(), 0.8)).toBe(false);
    expect(keepsStreak(run(['vidrio']), 0.95)).toBe(false);
    expect(keepsStreak(run(['vidrio', 'racha-firme']), 1)).toBe(true);
    const r = run(['vidrio'], { streak: 3, adj: 0 });
    applyAdventureWin(r, { n: 12, moves: 11, opt: 10 }, { total: 100, eff: 0.9 });
    expect(r.streak).toBe(0);
  });
  it('los turnos de las cartas se suman, con Holgura solo en tableros con pesadas o hielo, y con tope', () => {
    const plain = { opt: 10, pieces: [{}, {}] };
    const icy = { opt: 10, pieces: [{}, { kind: 'ice' }] };
    expect(fateTurns(run(['respiro']), plain)).toBe(1);
    expect(fateTurns(run(['holgura']), plain)).toBe(0);
    expect(fateTurns(run(['holgura']), icy)).toBe(2);
    expect(fateTurns(run(['respiro', 'holgura', 'pendulo-roto']), icy)).toBe(3);
    expect(fateTurns(run(['cuerda-floja']), plain)).toBe(-2);
  });
  it('el límite real del tablero incluye las cartas y nunca baja de mínimo + 1', () => {
    const tips = Object.fromEntries(Object.keys(TUTORIALS).map((id) => ['tut_' + id, true]));
    const banks = { levels: levelBank.ratings, special, tips };
    const base = buildAdventureLevel({ ...run(), level: 14, adj: 0 }, banks);
    const more = buildAdventureLevel({ ...run(['respiro']), level: 14, adj: 0 }, banks);
    const less = buildAdventureLevel({ ...run(['cuerda-floja']), level: 14, adj: 0 }, banks);
    expect(more.pieces).toEqual(base.pieces);
    expect(base.limit).toBe(moveLimit(base.opt, 1, 14));
    expect(more.limit).toBe(base.limit + 1);
    expect(less.limit).toBe(Math.max(base.opt + 1, base.limit - 2));
    const saved = { ...more, level: 14, limit: more.limit + 4, bought: 4 };
    const resumed = buildAdventureLevel({ ...run(['respiro']), level: 14, board: saved }, {});
    expect(resumed.limit).toBe(saved.limit);
    expect(buildAdventureLevel({ ...run(['respiro']), level: 14, rescue: snapshotRescue(saved) }, {}).limit).toBe(
      saved.limit - 4,
    );
  });
  it('Mercader abarata y Botín encarece la tienda; se combinan con la Bolsa mercante', () => {
    const price = priceOf('hint', 12, 1);
    expect(priceOf('hint', 12, 1, run(['mercader']))).toBe(Math.round(price * 0.85));
    expect(priceOf('hint', 12, 1, run(['botin']))).toBe(Math.round(price * 1.25));
    expect(priceOf('hint', 12, 1, run(['mercader'], { relic: 'purse' }))).toBe(Math.round(price * 0.7 * 0.85));
    expect(shopDiscount(run())).toBe(0);
  });
  it('los precios dependen de los movimientos mínimos del tablero', () => {
    expect(priceOf('hint', 20)).toBeGreaterThan(priceOf('hint', 8));
    expect(priceOf('skip', 10)).toBe(Math.round((4 * baseScore(10)) / 10) * 10);
  });
});

describe('pactos: beneficio con costo', () => {
  const G = { n: 12, opt: 10, moves: 1, limit: 20, done: false, hist: [[0]] };
  it('Pacto mercante cierra la tienda pero deja revivir', () => {
    const r = run(['pacto-mercante']);
    expect(availability('hint', { run: r, G })).toMatchObject({ ok: false });
    expect(buy('hint', { run: r, G }).ok).toBe(false);
    expect(fateBlocks(r, 'shop')).toBe(true);
    expect(canPaidRevive(r)).toBe(true);
  });
  it('Silencio apaga las pistas aunque queden en la reserva', () => {
    const r = run(['silencio']);
    expect(canHint(r, 'c')).toBe(false);
    expect(spendHint({ run: r, mode: 'c' })).toEqual({ ok: false, free: false });
    expect(r.hints).toBe(3);
    expect(canHint(r, 'p'), 'en Práctica las pistas siguen').toBe(true);
  });
  it('Temerario quita el revivir; Fénix da uno más y Ceniza tibia lo abarata', () => {
    expect(canPaidRevive(run(['temerario']))).toBe(false);
    const phoenix = run(['fenix']);
    expect(payRevive(phoenix).ok).toBe(true);
    expect(canPaidRevive(phoenix)).toBe(true);
    expect(payRevive(phoenix).ok).toBe(true);
    expect(canPaidRevive(phoenix)).toBe(false);
    expect(reviveCost(1000, run(['ceniza-tibia']))).toBe(200);
    expect(reviveCost(1000, run())).toBe(330);
  });
  it('Ofrenda cuesta el 15 % de los puntos al tomarla; Botín da 3 tableros de puntos base; Bolsillo da 3 pistas', () => {
    const r = run();
    const offer = (id) => {
      const city = [1, 2, 3, 4, 5, 6, 7, 8, 9].find((c) => fateOffer(r, c).some((x) => x.id === id));
      r.fatePicked = city - 1;
      return city;
    };
    pickFate(r, 'ofrenda', offer('ofrenda'));
    expect(r.score).toBe(8500);
    pickFate(r, 'botin', offer('botin'), baseScore(10));
    expect(r.score).toBe(8500 + 3 * baseScore(10));
    pickFate(r, 'bolsillo', offer('bolsillo'));
    expect(r.hints).toBe(6);
  });
  it('Brújula y Cosecha pagan al cerrar cada ciudad, una sola vez', () => {
    const r = run(['brujula', 'cosecha'], { score: 0, hints: 0 });
    expect(fateCityRewards(r, 2, 10)).toEqual({ hints: 1, score: baseScore(10) });
    expect(fateCityRewards(r, 2, 10)).toBeNull();
    expect(r).toMatchObject({ hints: 1, score: baseScore(10) });
  });
  it('un pacto deja sin efecto a las cartas que choca (se ven grises)', () => {
    expect(fateMuted(run(['silencio']), 'bolsillo')).toBe(true);
    expect(fateMuted(run(['juramento']), 'carga')).toBe(true);
    expect(fateMuted(run(['pacto-mercante']), 'mercader')).toBe(true);
    expect(fateMuted(run(['temerario']), 'fenix')).toBe(true);
    expect(fateMuted(run(), 'bolsillo')).toBe(false);
  });
  it('todas las cartas existen por id', () => {
    for (const c of FATE_CARDS) expect(fateById(c.id)).toBe(c);
  });
});

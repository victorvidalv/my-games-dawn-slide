import { describe, it, expect } from 'vitest';
import {
  FATE_CARDS,
  FATE_EVERY,
  FATE_OFFER_BY_HERO,
  FATE_PICKS,
  FATE_POINTS_RANGE,
  FATE_TURNS_RANGE,
  canRerollFate,
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
  rerollFate,
  usesFate,
} from '../src/game/fate.js';
import { boardPure, liaIntact, runGain } from '../src/game/run-points.js';
import { LIA_INTACT_POINTS, bonusTurns, canHint, snapshotRescue, spendHint } from '../src/game/heroes.js';
import { canPaidRevive, payRevive } from '../src/game/shop.js';
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

describe('el mazo de 31 cartas del destino (6 elecciones cada 3 niveles)', () => {
  it('son 31 cartas distintas, 21 bendiciones y 10 pactos con costo', () => {
    expect(FATE_EVERY).toBe(3);
    expect(FATE_PICKS).toBe(6);
    expect(FATE_CARDS).toHaveLength(31);
    expect(new Set(FATE_CARDS.map((c) => c.id)).size).toBe(31);
    expect(new Set(FATE_CARDS.map((c) => c.name)).size).toBe(31);
    expect(FATE_CARDS.filter((c) => c.kind === 'pact')).toHaveLength(10);
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
    expect(new Set(arts).size).toBe(31);
    for (const a of arts) expect(a).toMatch(/^<svg[^>]*viewBox="0 0 64 64".*<\/svg>$/s);
    expect(new Set(FATE_CARDS.map((c) => c.hue.join())).size).toBe(31);
  });
  it('el mazo se baraja con la semilla: siempre igual para la misma partida y distinto entre partidas', () => {
    expect(fateDeck(7)).toEqual(fateDeck(7));
    expect(fateDeck(7)).not.toEqual(fateDeck(8));
    expect([...fateDeck(7)].sort()).toEqual(FATE_CARDS.map((c) => c.id).sort());
  });
  it('cada tramo ofrece 3 cartas nuevas para todos los héroes (18 vistas de 31 sin repetirse)', () => {
    expect(FATE_OFFER_BY_HERO).toEqual({ lia: 3, jean: 3, van: 3 });
    for (const hero of ['lia', 'jean', 'van']) {
      const r = run([], { hero });
      const seen = [];
      for (let city = 1; city <= FATE_PICKS; city++) {
        const offer = fateOffer(r, city);
        expect(offer).toHaveLength(3);
        seen.push(...offer.map((c) => c.id));
      }
      expect(new Set(seen).size).toBe(18);
    }
    expect(fateOffer(run(), 0)).toEqual([]);
    expect(fateOffer(run(), 7)).toEqual([]);
  });
  it('solo hay cartas en Aventura, al cerrar los tramos 1 a 6 (niveles 3, 6, 9, 12, 15, 18), una vez cada uno', () => {
    expect(usesFate(run())).toBe(true);
    expect(usesFate({ ...run(), mode: 'p' })).toBe(false);
    expect(usesFate({ ...run(), daily: {} })).toBe(false);
    expect(usesFate({ survival: {} })).toBe(false);
    const r = newAdventureRun({ seed: 46, start: 1, hero: 'jean', hints: 3 });
    expect(needsFatePick(r, 3)).toBe(true);
    expect(needsFatePick(r, 4)).toBe(false);
    expect(needsFatePick(r, 21)).toBe(false);
    const id = fateOffer(r, 1)[0].id;
    expect(pickFate(r, id, 1)).toBeTruthy();
    expect(needsFatePick(r, 3)).toBe(false);
    expect(pickFate(r, fateOffer(r, 1)[1].id, 1), 'no se elige dos veces en el mismo tramo').toBeNull();
    expect(pickFate(r, fateOffer(r, 3)[0].id, 2), 'solo vale una carta de la oferta de ese tramo').toBeNull();
    expect(r.fate).toEqual([id]);
  });
});

describe('efectos acumulativos', () => {
  it('los puntos de las cartas se suman (no se multiplican) y tienen tope', () => {
    expect(fatePoints(run(['brillo']), { opt: 10, n: 5 })).toBeCloseTo(0.15);
    expect(fatePoints(run(['brillo'], { helpAt: 5 }), { opt: 10, n: 5 })).toBe(0);
    expect(fatePoints(run(['fortuna', 'constelacion', 'respiro']))).toBeCloseTo(0.12 + 0.12);
    const greedy = ['juramento', 'vidrio', 'cuerda-floja', 'temerario', 'ofrenda', 'fortuna'];
    expect(fatePoints(run(greedy))).toBe(FATE_POINTS_RANGE[1]);
    expect(fatePoints(run(['pendulo-roto']))).toBeCloseTo(-0.15);
    // Gran tablero y Frenesí cuentan desde el nivel 12 en los tres caminos (antes dependían del mínimo y en Difícil/Experto valían siempre)
    expect(fatePoints(run(['long-board']), { opt: 30, n: 11 })).toBe(0);
    expect(fatePoints(run(['long-board']), { opt: 10, n: 12 })).toBeCloseTo(0.22);
    expect(fatePoints(run(['frenesi']), { opt: 10, n: 21 })).toBeCloseTo(0.32);
    expect(fatePoints(run(['abismo']), { opt: 10, n: 18 })).toBe(0);
    expect(fatePoints(run(['abismo']), { opt: 10, n: 19 })).toBeCloseTo(0.6);
    expect(fatePoints(run(['ceniza-tibia']), { opt: 10, n: 6 })).toBe(0);
    expect(fatePoints(run(['ceniza-tibia']), { opt: 10, n: 7 })).toBeCloseTo(0.35);
    expect(fatePoints(run(['ascetismo']), { opt: 10, n: 5 })).toBe(0);
    expect(fatePoints(run(['ascetismo']), { opt: 10, n: 5, pure: true })).toBeCloseTo(0.2);
  });
  it('el puntaje del tablero suma las cartas al bono y después la reliquia', () => {
    const base = calcGain(12, 10, 2).total;
    expect(runGain(run(), 12, 10, 2).total).toBe(base);
    expect(runGain(run(['fortuna']), 12, 10, 2).total).toBe(base + Math.round(base * 0.12));
    const withSun = runGain(run(['fortuna'], { relic: 'sun' }), 12, 10, 2).total;
    expect(withSun).toBe(Math.round(runGain(run(['fortuna']), 12, 10, 2).total * 1.15));
  });
  it('Destello, Racha larga, Racha firme y Vidrio cambian las reglas del puntaje', () => {
    expect(fateRules(run())).toEqual({ perfect: 0.2, streakCap: 5, streakEff: 0.9 });
    expect(fateRules(run(['destello'])).perfect).toBe(0.4);
    expect(fateRules(run(['racha-larga'])).streakCap).toBe(8);
    expect(keepsStreak(run(['racha-firme']), 0.8)).toBe(true);
    expect(keepsStreak(run(), 0.8)).toBe(false);
    expect(keepsStreak(run(['vidrio']), 0.95)).toBe(false);
    expect(keepsStreak(run(['vidrio', 'racha-firme']), 1)).toBe(true);
    const r = run(['vidrio'], { streak: 3, adj: 0 });
    applyAdventureWin(r, { n: 12, moves: 11, opt: 10 }, { total: 100, eff: 0.9 });
    expect(r.streak).toBe(0);
  });
  it('los turnos de las cartas y la reliquia Reloj de arena se suman, con tope', () => {
    const plain = { opt: 10, pieces: [{}, {}] };
    const icy = { opt: 10, pieces: [{}, { kind: 'ice' }] };
    expect(fateTurns(run(['respiro']), plain)).toBe(2);
    expect(fateTurns(run(['holgura']), plain)).toBe(0);
    expect(fateTurns(run(['holgura']), icy)).toBe(3);
    expect(fateTurns(run(['respiro', 'holgura', 'pendulo-roto']), icy)).toBe(FATE_TURNS_RANGE[1]);
    expect(fateTurns(run(['cuerda-floja']), plain)).toBe(-2);
    expect(fateTurns(run(['frenesi']), plain)).toBe(-1);
    expect(fateTurns(run(['carga'], { hero: 'lia' }), plain)).toBe(2);
    expect(fateTurns(run(['carga'], { hero: 'jean' }), plain)).toBe(1);
    expect(fateTurns(run(['carga', 'juramento'], { hero: 'jean' }), plain), 'sin poder, Carga no da nada').toBe(0);
    expect(fateTurns(run(['power-echo'], { hero: 'lia' }), { ...plain, n: 6 })).toBe(1);
    expect(fateTurns(run(['power-echo'], { hero: 'lia' }), { ...plain, n: 5 })).toBe(1);
    expect(fateTurns(run(['ceniza-tibia']), { ...plain, n: 7 })).toBe(1);
    expect(fateTurns(run(['ceniza-tibia']), { ...plain, n: 8 })).toBe(0);
  });
  it('el límite real del tablero incluye las cartas y el Reloj de arena, y nunca baja de mínimo + 1', () => {
    const tips = Object.fromEntries(Object.keys(TUTORIALS).map((id) => ['tut_' + id, true]));
    const banks = { levels: levelBank.ratings, special, tips };
    const base = buildAdventureLevel({ ...run(), level: 14, adj: 0 }, banks);
    const more = buildAdventureLevel({ ...run(['respiro']), level: 14, adj: 0 }, banks);
    const hourglass = buildAdventureLevel({ ...run([], { relic: 'purse' }), level: 14, adj: 0 }, banks);
    const less = buildAdventureLevel({ ...run(['cuerda-floja']), level: 14, adj: 0 }, banks);
    expect(more.pieces).toEqual(base.pieces);
    expect(base.limit).toBe(moveLimit(base.opt, 1, 14));
    expect(more.limit).toBe(base.limit + 2);
    expect(hourglass.limit).toBe(base.limit + 2);
    expect(less.limit).toBe(Math.max(base.opt + 1, base.limit - 2));
    const saved = { ...more, level: 14, limit: more.limit + 4, bought: 4 };
    const resumed = buildAdventureLevel({ ...run(['respiro']), level: 14, board: saved }, {});
    expect(resumed.limit).toBe(saved.limit);
    expect(buildAdventureLevel({ ...run(['respiro']), level: 14, rescue: snapshotRescue(saved) }, {}).limit).toBe(
      saved.limit - 4,
    );
  });
});

describe('pactos: beneficio con costo', () => {
  it('Temerario apaga las pistas; Fénix habilita 1 revivir', () => {
    const r = run(['temerario']);
    expect(fateBlocks(r, 'hints')).toBe(true);
    expect(canHint(r, 'c')).toBe(false);
    expect(spendHint({ run: r, mode: 'c' })).toEqual({ ok: false, free: false });
    expect(canPaidRevive(run())).toBe(false);
    const phoenix = run(['fenix']);
    expect(payRevive(phoenix).ok).toBe(true);
    expect(canPaidRevive(phoenix)).toBe(false);
  });
  it('Ofrenda cuesta el 15 % de los puntos al tomarla; Bolsillo da 3 pistas', () => {
    const pick = (id) => {
      for (let seed = 1; seed < 50; seed++) {
        const r = run([], { seed });
        const city = [1, 2, 3, 4, 5, 6].find((c) => fateOffer(r, c).some((x) => x.id === id));
        if (city) {
          r.fatePicked = city - 1;
          return { r, city };
        }
      }
      throw new Error('card not found: ' + id);
    };
    const o = pick('ofrenda');
    pickFate(o.r, 'ofrenda', o.city);
    expect(o.r.score).toBe(8500);
    const p = pick('bolsillo');
    pickFate(p.r, 'bolsillo', p.city);
    expect(p.r.hints).toBe(6);
  });
  it('Brújula y Cosecha pagan al cerrar cada tramo, una sola vez', () => {
    const r = run(['brujula', 'cosecha'], { score: 0, hints: 0 });
    expect(fateCityRewards(r, 2, 10)).toEqual({ hints: 1, score: Math.round(0.8 * baseScore(10)) });
    expect(fateCityRewards(r, 2, 10)).toBeNull();
    expect(r).toMatchObject({ hints: 1, score: Math.round(0.8 * baseScore(10)) });
  });
  it('un pacto deja sin efecto a las cartas con las que choca (se ven grises)', () => {
    expect(fateMuted(run(['juramento']), 'carga')).toBe(true);
    expect(fateMuted(run(['temerario']), 'bolsillo')).toBe(true);
    expect(fateMuted(run(['temerario']), 'brujula')).toBe(true);
    expect(fateMuted(run(['temerario']), 'lucidez')).toBe(true);
    expect(fateMuted(run(), 'bolsillo')).toBe(false);
  });
  it('Vínculo y Lucidez escalan con Pactos y pistas guardadas, y el re-roll funciona una vez por partida', () => {
    expect(fatePoints(run(['vinculo', 'cuerda-floja', 'vidrio']), { n: 5, opt: 10 })).toBeCloseTo(0.72, 5);
    expect(fatePoints(run(['lucidez'], { hints: 4 }), { n: 5, opt: 10 })).toBeCloseTo(0.2, 5);
    expect(fatePoints(run(['lucidez'], { hints: 10 }), { n: 5, opt: 10 })).toBeCloseTo(0.3, 5);
    expect(fatePoints(run(['lucidez', 'temerario'], { hints: 4 }), { n: 5, opt: 10 })).toBeCloseTo(0.5, 5);
    const r = newAdventureRun({ seed: 77, start: 1, mode: 'c', hero: 'lia', hints: 3, relic: 'sun' });
    const first = fateOffer(r, 1).map((c) => c.id);
    expect(canRerollFate(r, 1)).toBe(true);
    const second = rerollFate(r, 1).map((c) => c.id);
    expect(second).toHaveLength(3);
    expect(second.some((id) => first.includes(id))).toBe(false);
    expect(fateOffer(r, 1).map((c) => c.id)).toEqual(second);
    expect(canRerollFate(r, 1)).toBe(false);
    expect(canRerollFate(r, 2)).toBe(false);
    expect(rerollFate(r, 2)).toBeNull();
  });
  it('Codicia quita 1 pista por tramo (nunca por debajo de 0); Juramento da 1 pista por tramo', () => {
    const greedy = run(['codicia'], { score: 0, hints: 1 });
    expect(fateCityRewards(greedy, 2, 10)).toEqual({ hints: -1, score: 0 });
    expect(fateCityRewards(greedy, 3, 10)).toEqual({ hints: 0, score: 0 });
    expect(greedy.hints).toBe(0);
    const oath = run(['juramento'], { score: 0, hints: 0 });
    expect(fateCityRewards(oath, 2, 10).hints).toBe(1);
    expect(fateCityRewards(run(['brujula', 'codicia'], { hints: 2 }), 2, 10).hints, 'se anulan').toBe(0);
  });
  it('Reencarnación habilita 1 revivir (2 con Fénix) a cambio de 2 turnos por tablero', () => {
    const r = run(['reencarnacion']);
    expect(payRevive(r).ok).toBe(true);
    expect(canPaidRevive(r)).toBe(false);
    const both = run(['reencarnacion', 'fenix']);
    expect(payRevive(both).ok).toBe(true);
    expect(payRevive(both).ok).toBe(true);
    expect(canPaidRevive(both)).toBe(false);
    expect(fateTurns(r, { opt: 10, pieces: [] })).toBe(-2);
  });
  it('Impulso da turnos con la racha; Maestría da pistas por Perfecto en tableros largos; Racha firme conserva la mitad', () => {
    const plain = { opt: 10, pieces: [] };
    expect(fateTurns(run(['impulso'], { streak: 1 }), plain)).toBe(0);
    expect(fateTurns(run(['impulso'], { streak: 2 }), plain)).toBe(1);
    expect(fateTurns(run(['impulso'], { streak: 5 }), plain)).toBe(2);
    expect(fateTurns(run(['impulso'], { streak: 12 }), plain)).toBe(3);
    const m = run(['maestria'], { hints: 0, streak: 0, adj: 0 });
    applyAdventureWin(m, { n: 10, moves: 15, opt: 15 }, { total: 100, eff: 1 });
    expect(m.hints).toBe(1);
    applyAdventureWin(m, { n: 11, moves: 14, opt: 14 }, { total: 100, eff: 1 });
    expect(m.hints, 'tablero corto: no cuenta').toBe(1);
    applyAdventureWin(m, { n: 13, moves: 17, opt: 15 }, { total: 100, eff: 0.87 });
    expect(m.hints, 'sin Perfecto: no cuenta').toBe(1);
    const firm = run(['racha-firme'], { streak: 5, adj: 0 });
    applyAdventureWin(firm, { n: 13, moves: 15, opt: 10 }, { total: 100, eff: 0.5 });
    expect(firm.streak).toBe(2);
    const plainStreak = run([], { streak: 5, adj: 0 });
    applyAdventureWin(plainStreak, { n: 13, moves: 15, opt: 10 }, { total: 100, eff: 0.5 });
    expect(plainStreak.streak).toBe(0);
  });
  it('Lía gana la Brasa intacta (+12 %) si termina sin entrar en su reserva; Ascetismo premia no usar ayudas', () => {
    const lia = run([], { hero: 'lia' });
    const reserve = bonusTurns('lia', 10, 1);
    const G = { n: 5, opt: 10, limit: 30, bought: 0 };
    expect(liaIntact(lia, G, 30 - reserve)).toBe(true);
    expect(liaIntact(lia, G, 31 - reserve)).toBe(false);
    expect(liaIntact(run([], { hero: 'jean' }), G, 10)).toBe(false);
    expect(liaIntact(run(['juramento'], { hero: 'lia' }), G, 10)).toBe(false);
    const base = runGain(run([], { hero: 'jean' }), 12, 10, 0, G).total;
    const ember = runGain(lia, 12, 10, 0, G);
    expect(ember.ember).toBe(true);
    expect(ember.total).toBe(base + Math.round(calcGain(12, 10, 0).total * LIA_INTACT_POINTS));
    const monk = run(['ascetismo'], { hero: 'jean' });
    expect(boardPure(monk, G, 12)).toBe(true);
    expect(boardPure({ ...monk, powerUsedLevel: 5 }, G, 12)).toBe(false);
    expect(boardPure({ ...monk, helpAt: 5 }, G, 12)).toBe(false);
    expect(boardPure({ ...monk, powerUsedLevel: 5, fate: ['ascetismo', 'juramento'] }, G, 12)).toBe(true);
  });
  it('todas las cartas existen por id', () => {
    for (const c of FATE_CARDS) expect(fateById(c.id)).toBe(c);
  });
});

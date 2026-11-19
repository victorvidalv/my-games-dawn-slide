import { describe, it, expect } from 'vitest';
import {
  HEROIC_PATHS,
  HEROIC_BENEFITS,
  heroicHintsLeft,
  isHeroic,
  routeGain,
  shopDiscount,
} from '../src/game/routes.js';
import { canHint, snapshotRescue, spendHint } from '../src/game/heroes.js';
import { SHOP_ITEMS, availability, buy, priceOf, reviveCost } from '../src/game/shop.js';
import { calcGain } from '../src/engine/scoring.js';
import { minMoves } from '../src/engine/solver.js';
import { buildAdventureLevel } from '../src/game/build-adventure.js';
import { bossTimeFor } from '../src/game/bosses.js';
import { TUTORIALS, levelPlan } from '../src/game/mechanics.js';
import levelBank from '../src/data/levels.json';
import special from '../src/data/special.json';
const run = (hero, route = 'brave') => ({ hero, route, mode: 'c', start: 1, level: 11, hints: 3, score: 10000 });

describe('camino heroico propio de cada héroe', () => {
  it('tres símbolos y acompañantes distintos, Jean conserva la elfa', () => {
    expect(new Set(Object.values(HEROIC_PATHS).map((p) => p.icon)).size).toBe(3);
    expect(new Set(Object.values(HEROIC_PATHS).map((p) => p.guide)).size).toBe(3);
    expect(HEROIC_PATHS.jean.guide).toBe('guia-elfa.webp');
  });
  it('cada héroe gana su porcentaje de puntos en el camino heroico', () => {
    const base = calcGain(30, 12, 10, 2).total;
    for (const hero of ['lia', 'jean', 'van']) expect(HEROIC_BENEFITS.points[hero]).toBeGreaterThan(0);
    for (const hero of ['lia', 'jean', 'van']) {
      const gain = routeGain(run(hero), 30, 12, 10, 2),
        extra = HEROIC_BENEFITS.points[hero];
      expect(gain.total).toBe(base + Math.round(base * extra));
      expect(routeGain(run(hero, 'normal'), 30, 12, 10, 2).total).toBe(base);
    }
  });
  it('Lía recibe una pista gratis cada pocos tableros: se consume antes que la reserva y se renueva', () => {
    const r = run('lia');
    const E = HEROIC_BENEFITS.liaEvery,
      L = E * 2;
    expect(heroicHintsLeft(r, L - 1)).toBe(0);
    expect(heroicHintsLeft(r, L)).toBe(1);
    expect(spendHint({ run: r, mode: 'c', level: L })).toEqual({ ok: true, free: true });
    expect(r.hints).toBe(3);
    expect(heroicHintsLeft(r, L)).toBe(0);
    expect(heroicHintsLeft(r, L + E)).toBe(1);
    expect(spendHint({ run: r, mode: 'c', level: L })).toEqual({ ok: true, free: false });
    expect(r.hints).toBe(2);
    expect(spendHint({ run: r, mode: 'c', level: L - 1 })).toEqual({ ok: true, free: false });
    expect(r.hints).toBe(1);
  });
  it('guardar/rehacer/revivir no recarga la pista gratis y no se acumula', () => {
    const E = HEROIC_BENEFITS.liaEvery,
      L = E * 2,
      r = run('lia');
    spendHint({ run: r, mode: 'c', level: L });
    const loaded = JSON.parse(JSON.stringify(r));
    expect(heroicHintsLeft(loaded, L)).toBe(0);
    expect(heroicHintsLeft(loaded, L + E)).toBe(1);
    loaded.route = 'normal';
    expect(heroicHintsLeft(loaded, L + E)).toBe(0);
    loaded.hints = 0;
    expect(canHint(loaded, 'c', L)).toBe(false);
    loaded.route = 'brave';
    expect(canHint(loaded, 'c', L + E)).toBe(true);
  });
  it('ni Jean ni Juth reciben las pistas de Lía', () => {
    for (const hero of ['jean', 'van']) expect(heroicHintsLeft(run(hero), HEROIC_BENEFITS.liaEvery)).toBe(0);
  });
  it('cada héroe tiene el descuento de tienda configurado en todos los productos y dificultades', () => {
    for (const start of [1, 50, 75])
      for (const item of SHOP_ITEMS) {
        const base = priceOf(item.id, 40, start);
        for (const hero of ['lia', 'jean', 'van']) {
          const r = { ...run(hero), start };
          expect(priceOf(item.id, 40, start, r)).toBe(Math.round(base * (1 - HEROIC_BENEFITS.shop[hero])));
          expect(priceOf(item.id, 40, start, { ...r, route: 'normal' })).toBe(base);
        }
      }
  });
  it('se cobra lo anunciado incluso cuando solo alcanza con el descuento', () => {
    const r = run('van'),
      G = { n: 11, rate: 1, moves: 1, limit: 10, done: false };
    r.score = priceOf('hint', 1, 1, r);
    const price = priceOf('hint', 1, 1, r);
    expect(r.score).toBe(price);
    expect(price).toBeLessThan(priceOf('hint', 1, 1));
    expect(availability('hint', { run: r, G })).toMatchObject({ ok: true, price });
    expect(buy('hint', { run: r, G })).toMatchObject({ ok: true, price });
    expect(r.score).toBe(0);
    expect(r.hints).toBe(4);
  });
  it('el descuento no se aplica al revivir fuera de la tienda', () => {
    expect(reviveCost(1000)).toBe(330);
    expect(shopDiscount(run('van'))).toBe(HEROIC_BENEFITS.shop.van);
  });
  it('en práctica o sin elegir camino no hay beneficios heroicos', () => {
    for (const hero of ['lia', 'jean', 'van']) {
      const r = { ...run(hero), mode: 'p' };
      expect(isHeroic(r)).toBe(false);
      expect(shopDiscount(r)).toBe(0);
      expect(heroicHintsLeft(r, 11)).toBe(0);
    }
  });
});

describe('tableros de los caminos heroicos', () => {
  const tips = Object.fromEntries(Object.keys(TUTORIALS).map((id) => ['tut_' + id, true]));
  const banks = { levels: levelBank.ratings, special, tips };
  const board = (hero, start, level, route) =>
    buildAdventureLevel({ ...run(hero, route), seed: 46, start, level, adj: 0 }, banks);

  it('Brasa conserva el tablero y su mínimo, pero reduce el límite de turnos en los tres caminos', () => {
    for (const start of [1, 50, 75]) {
      const normal = board('lia', start, 14, 'normal');
      const brave = board('lia', start, 14, 'brave');
      expect(brave.pieces).toEqual(normal.pieces);
      expect(brave.pos).toEqual(normal.pos);
      expect(brave.opt).toBe(normal.opt);
      expect(brave.limit).toBeLessThan(normal.limit);
      expect(brave.limit).toBeGreaterThan(brave.opt);
    }
  });

  it('Péndulo encuentra una solución más larga, también cuando el tablero original no alcanza', () => {
    for (const start of [1, 50, 75]) {
      const normal = board('jean', start, 11, 'normal');
      const brave = board('jean', start, 11, 'brave');
      expect(brave.family).toBe(normal.family);
      expect(brave.opt).toBeGreaterThan(normal.opt);
      expect(minMoves(brave.pieces, brave.pos, brave.walls)).toBe(brave.opt);
    }
  });

  it('Runas añade mecanismos aprendidos y conserva la familia de las lecciones y los jefes', () => {
    for (const start of [1, 50, 75]) {
      const normal = board('van', start, 24, 'normal');
      const brave = board('van', start, 24, 'brave');
      expect(normal.family).toBe('heavy');
      expect(brave.plan.mechanics).toEqual(['wall', 'heavy']);
      expect(minMoves(brave.pieces, brave.pos, brave.walls)).toBe(brave.opt);
    }
    const tutorialRun = { ...run('van'), seed: 46, level: TUTORIALS.wall.level, adj: 0 };
    expect(buildAdventureLevel(tutorialRun, { ...banks, tips: {} }).tutorial).toBe('wall');
    const boss = board('van', 1, 40, 'brave');
    expect(boss.family).toBe(levelPlan(40).family);
    expect(boss.timeLimit).toBe(bossTimeFor(40, boss.opt));
  });

  it('retomar y reintentar conservan el tablero y el límite que ya tenía la partida', () => {
    const level = 14;
    const game = board('lia', 1, level, 'brave');
    const saved = { ...game, level, limit: game.limit + 10, bought: 3 };
    const adventure = { ...run('lia'), level, board: saved };
    expect(buildAdventureLevel(adventure, {}).limit).toBe(saved.limit);
    const rescue = snapshotRescue(saved);
    const restored = buildAdventureLevel({ ...adventure, rescue }, {});
    expect(restored.limit).toBe(saved.limit - saved.bought);
    expect(restored.pos).toEqual(saved.start);
  });
});

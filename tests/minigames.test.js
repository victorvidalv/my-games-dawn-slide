import { describe, it, expect } from 'vitest';
import {
  BONUS_KINDS, HERO_GAMES, GAMES_PER_HERO, MAX_GRADE, TUNING, bonusIndex, bonusTier, isBonusLevel, gameFor,
  createBonusPlan, ensureBonusPlan, finishBonus, claimBonus, maxPrize, bonusPrize, prizeTable, gradeOf, setupFor,
  catchSetup, catchHit, catchGrade, whackSetup, whackGrade, WHACK_HOLES, stackSetup, stackX, stackDrop, stackGrade, STACK_BASE,
  clockSetup, clockAngle, clockScore, clockGrade, rhythmSetup, rhythmJudge, rhythmGrade, RHYTHM_LANES,
  orderSetup, orderState, orderTap, orderClock, orderGrade, pairsSetup, pairsState, pairsTap, pairsClose, pairsOver, pairsGrade,
  simonSetup, simonState, simonTap, simonLength, simonGrade, SIMON_PADS, shellSetup, shellTrack, shellGrade,
} from '../src/game/minigames.js';

const STOPS = [15, 25, 35, 45, 55, 65, 75, 85, 95];
const HEROES = ['lia', 'jean', 'van'];
const SEEDS = [1, 7, 42, 1234, 987654];
const plansOf = (kind) => HEROES.flatMap((h) => STOPS.flatMap((l) => SEEDS.map((s) => createBonusPlan(h, l, s)))).filter((p) => p.kind === kind);

describe('tres juegos por héroe, nueve mecánicas distintas, ciclo fijo', () => {
  it('nueve paradas; cada héroe recorre sus tres juegos en ciclo y cada vuelta sube un escalón de dificultad', () => {
    expect(Array.from({ length: 100 }, (_, i) => i + 1).filter(isBonusLevel)).toEqual(STOPS);
    expect(STOPS.map((l) => bonusIndex(l) % GAMES_PER_HERO)).toEqual([0, 1, 2, 0, 1, 2, 0, 1, 2]);
    expect(STOPS.map(bonusTier)).toEqual([0, 0, 0, 1, 1, 1, 2, 2, 2]);
    for (const h of HEROES) expect(STOPS.map((l) => gameFor(h, l).kind)).toEqual(STOPS.map((_, i) => HERO_GAMES[h][i % 3].kind));
  });
  it('cada héroe tiene exactamente 3 juegos y ningún juego se repite entre héroes (9 mecánicas, 9 nombres)', () => {
    const all = Object.values(HERO_GAMES).flat();
    for (const list of Object.values(HERO_GAMES)) expect(list).toHaveLength(3);
    expect(new Set(all.map((g) => g.kind)).size).toBe(9);
    expect(new Set(all.map((g) => g.title)).size).toBe(9);
    expect(all.map((g) => g.kind).sort()).toEqual(BONUS_KINDS.slice().sort());
    for (const k of BONUS_KINDS) expect(TUNING[k], k).toHaveLength(3);
  });
  it('la partida es determinista: misma semilla, mismo juego; otra semilla cambia el contenido pero nunca qué juego toca', () => {
    for (const h of HEROES) for (const l of STOPS) {
      const a = createBonusPlan(h, l, 42), b = createBonusPlan(h, l, 43);
      expect(createBonusPlan(h, l, 42)).toEqual(a);
      expect(a.kind).toBe(b.kind);
      expect(JSON.stringify(setupFor(a))).toBe(JSON.stringify(setupFor(createBonusPlan(h, l, 42))));
      expect(JSON.stringify(setupFor(a))).not.toBe(JSON.stringify(setupFor(b)));
    }
  });
  it('un héroe desconocido juega como Lía (partidas antiguas)', () => {
    expect(createBonusPlan('nadie', 15, 1).hero).toBe('lia');
  });
});

describe('premios: nota 0-5 proporcional y equitativa en cualquier nivel', () => {
  it('0 estrellas no da nada, 5 estrellas da el máximo de la parada y el máximo crece de 3 a 10', () => {
    expect(maxPrize(15)).toBe(3);
    expect(maxPrize(95)).toBe(10);
    for (const l of STOPS) for (const start of [1, 50, 75]) {
      const table = prizeTable(l, start);
      expect(table).toHaveLength(MAX_GRADE + 1);
      expect(table[0]).toBe(0);
      expect(table[5]).toBe(maxPrize(l, start));
      for (let g = 1; g <= 5; g++) {
        expect(table[g], `nivel ${l}, ${g}★`).toBeGreaterThanOrEqual(Math.max(1, table[g - 1]));   // nunca baja; con estrellas siempre hay premio
        expect(Math.abs(table[g] - (g * table[5]) / 5), `proporcional en ${l}`).toBeLessThanOrEqual(0.5 + 1e-9 + (table[5] < 5 ? 0.5 : 0));
      }
    }
  });
  it('la misma nota vale más cuanto más alto es el nivel (nunca menos) y los caminos difíciles reparten menos', () => {
    for (let g = 1; g <= 5; g++) {
      const byLevel = STOPS.map((l) => bonusPrize(g, l));
      for (let i = 1; i < byLevel.length; i++) expect(byLevel[i]).toBeGreaterThanOrEqual(byLevel[i - 1]);
      expect(bonusPrize(g, 95)).toBeGreaterThan(bonusPrize(g, 15) - (g === 1 ? 1 : 0));
    }
    expect(prizeTable(95)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(prizeTable(15)).toEqual([0, 1, 1, 2, 2, 3]);
    expect(maxPrize(95, 75)).toBeLessThan(maxPrize(95, 50));
    expect(maxPrize(95, 50)).toBeLessThan(maxPrize(95, 1));
  });
  it('notas fuera de rango o raras se acotan a 0-5', () => {
    expect(bonusPrize(-3, 55)).toBe(0);
    expect(bonusPrize(99, 55)).toBe(maxPrize(55));
    expect(bonusPrize(undefined, 55)).toBe(0);
    expect([0, 0.14, 0.15, 0.35, 0.55, 0.75, 0.89, 0.9, 1].map(gradeOf)).toEqual([0, 0, 1, 2, 3, 4, 4, 5, 5]);
  });
  it('se decide una sola vez, se cobra una sola vez y un plan viejo no duplica pistas', () => {
    const run = { hero: 'lia', level: 16, seed: 7, bonus: 1, hints: 3, start: 1 };
    const p = ensureBonusPlan(run);
    expect(p.version).toBe(3);
    expect(finishBonus(p, 5)).toBe(3);
    expect(finishBonus(p, 0)).toBe(3);                     // ya decidido
    expect(p.grade).toBe(5);
    const stale = JSON.parse(JSON.stringify(p));
    expect(ensureBonusPlan(JSON.parse(JSON.stringify(run)))).toEqual(p);   // guardar y cargar conserva la nota
    expect(claimBonus(run)).toBe(3);
    expect(run.hints).toBe(6);
    expect(run.bonus).toBe(0);
    expect(run.bonusPlan).toBeUndefined();
    expect(claimBonus(run)).toBe(0);
    run.bonusPlan = stale;
    expect(claimBonus(run)).toBe(0);
    expect(run.hints).toBe(6);
  });
  it('0 estrellas cierra la parada sin premio', () => {
    const run = { hero: 'jean', level: 26, seed: 3, bonus: 1, hints: 2, start: 1 };
    const p = ensureBonusPlan(run);
    expect(finishBonus(p, 0)).toBe(0);
    expect(claimBonus(run)).toBe(0);
    expect(run.hints).toBe(2);
    expect(run.bonus).toBe(0);
  });
  it('migra planes de versiones anteriores: respeta un premio ya ganado y rehace los que estaban a medias', () => {
    const won = { hero: 'jean', level: 26, seed: 5, start: 1, bonusPlan: { version: 2, kind: 'memory', level: 25, prize: 4 } };
    const p = ensureBonusPlan(won);
    expect(p).toMatchObject({ version: 3, kind: 'rhythm', prize: 4, phase: 'done' });
    expect(p.grade).toBeGreaterThanOrEqual(1);
    const half = { hero: 'van', level: 36, seed: 5, start: 1, bonusPlan: { version: 2, kind: 'sprint', level: 35, deck: [0, 0, 1, 1] } };
    const q = ensureBonusPlan(half);
    expect(q).toMatchObject({ version: 3, kind: 'shell', phase: 'ready', level: 35 });
    expect(q.prize).toBeUndefined();
  });
});

describe('Lía · Lluvia de Brasas (atrapar)', () => {
  it('todas las partidas son justas: brasas alcanzables, dentro del tiempo, y ninguna gota cae encima de su brasa vecina', () => {
    for (const plan of plansOf('catch')) {
      const s = catchSetup(plan), embers = s.items.filter((i) => !i.bad), drops = s.items.filter((i) => i.bad);
      expect(embers).toHaveLength(s.embers);
      expect(drops).toHaveLength(s.drops);
      for (const it of s.items) {
        expect(it.x).toBeGreaterThanOrEqual(0.08);
        expect(it.x).toBeLessThanOrEqual(0.92);
        expect(it.t).toBeGreaterThan(300);
        expect(it.t + s.fall * 1000).toBeLessThan(s.duration);
      }
      for (let i = 1; i < embers.length; i++) expect(Math.abs(embers[i].x - embers[i - 1].x)).toBeLessThanOrEqual(0.65 + 1e-9);
      for (const d of drops) {
        const near = embers.reduce((a, b) => (Math.abs(b.t - d.t) < Math.abs(a.t - d.t) ? b : a));
        expect(Math.abs(d.x - near.x)).toBeGreaterThan(s.basket);
      }
      expect(s.items.map((i) => i.t)).toEqual(s.items.map((i) => i.t).sort((a, b) => a - b));
    }
  });
  it('el farol recoge lo que cae sobre él y la nota va de 0 a 5', () => {
    expect(catchHit(0.5, 0.5, 0.24)).toBe(true);
    expect(catchHit(0.5, 0.63, 0.24)).toBe(true);
    expect(catchHit(0.5, 0.8, 0.24)).toBe(false);
    const s = catchSetup(createBonusPlan('lia', 15, 1));
    expect(catchGrade({ caught: s.embers, soaked: 0 }, s)).toBe(5);
    expect(catchGrade({ caught: 0, soaked: 0 }, s)).toBe(0);
    expect(catchGrade({ caught: 2, soaked: 4 }, s)).toBe(0);
    const grades = Array.from({ length: s.embers + 1 }, (_, c) => catchGrade({ caught: c, soaked: 0 }, s));
    expect(new Set(grades)).toEqual(new Set([0, 1, 2, 3, 4, 5]));
    expect(grades).toEqual(grades.slice().sort((a, b) => a - b));
    expect(catchGrade({ caught: s.embers, soaked: 2 }, s)).toBeLessThan(5);       // mojarse resta
  });
  it('quedarse quieto no da estrellas: con el brasero parado donde empieza (el centro) la nota es 0, y aparcado en otro sitio nunca pasa de 2', () => {
    for (const plan of plansOf('catch')) {
      const s = catchSetup(plan), embers = s.items.filter((i) => !i.bad), drops = s.items.filter((i) => i.bad);
      for (const bx of [0.5, 0.2, 0.35, 0.65, 0.8]) {
        const caught = embers.filter((e) => catchHit(e.x, bx, s.basket)).length, soaked = drops.filter((d) => catchHit(d.x, bx, s.basket)).length;
        expect(catchGrade({ caught, soaked }, s), `quieto en ${bx}`).toBeLessThanOrEqual(bx === 0.5 ? 0 : 2);
      }
      for (let i = 1; i < embers.length; i++) expect(Math.abs(embers[i].x - embers[i - 1].x), 'siempre hay que moverse').toBeGreaterThanOrEqual(0.18 - 1e-9);
    }
  });
});

describe('Lía · Sombras Fuera (golpear)', () => {
  it('nunca hay dos figuras en el mismo hueco a la vez y el recuento de sombras y amigas es exacto', () => {
    for (const plan of plansOf('whack')) {
      const s = whackSetup(plan);
      expect(s.pops.filter((p) => !p.friend)).toHaveLength(s.shadows);
      expect(s.pops.filter((p) => p.friend)).toHaveLength(s.friends);
      expect(s.pops[0].friend || s.pops[1].friend).toBe(false);
      for (const p of s.pops) {
        expect(p.hole).toBeGreaterThanOrEqual(0);
        expect(p.hole).toBeLessThan(WHACK_HOLES);
        expect(p.stay).toBeGreaterThanOrEqual(700);                                  // siempre da tiempo a reaccionar
        expect(p.t + p.stay).toBeLessThan(s.duration);
      }
      for (let i = 0; i < s.pops.length; i++) for (let j = i + 1; j < s.pops.length; j++) {
        const a = s.pops[i], b = s.pops[j];
        if (a.hole === b.hole) expect(b.t, 'mismo hueco, sin solaparse').toBeGreaterThanOrEqual(a.t + a.stay - 120);
      }
      expect(s.duration).toBeLessThan(32000);
    }
  });
  it('acertar todas da 5, no tocar nada da 0 y golpear a una llama amiga resta', () => {
    const s = whackSetup(createBonusPlan('lia', 25, 9));
    expect(whackGrade({ hits: s.shadows, friendHits: 0 }, s)).toBe(5);
    expect(whackGrade({ hits: 0, friendHits: 0 }, s)).toBe(0);
    expect(whackGrade({ hits: 0, friendHits: 3 }, s)).toBe(0);
    expect(whackGrade({ hits: s.shadows, friendHits: 3 }, s)).toBeLessThan(5);
  });
});

describe('Lía · La Torre de la Forja (apilar)', () => {
  it('el lingote va y viene sin salirse y cada uno es algo más rápido que el anterior', () => {
    for (const plan of plansOf('stack')) {
      const s = stackSetup(plan);
      expect(s.list).toHaveLength(s.blocks);
      for (let i = 1; i < s.list.length; i++) expect(s.list[i].period).toBeLessThan(s.list[i - 1].period);
      expect(s.list.at(-1).period).toBeGreaterThan(1000);
      for (const w of [0.5, 0.3, 0.1]) for (let t = 0; t < 5000; t += 37) for (const side of [false, true]) {
        const x = stackX(t, w, s.list[0].period, side);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x + w).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
    expect(stackX(0, 0.5, 2000)).toBe(0);
    expect(stackX(1000, 0.5, 2000)).toBeCloseTo(0.5, 5);
    expect(stackX(0, 0.5, 2000, true)).toBeCloseTo(0.5, 5);
  });
  it('encaje perfecto conserva el ancho, uno desviado se recorta y uno fuera es fallo', () => {
    expect(stackDrop(STACK_BASE, 0.26, 0.5, 0.03)).toMatchObject({ x: 0.25, w: 0.5, perfect: true, miss: false });
    const cut = stackDrop(STACK_BASE, 0.35, 0.5, 0.03);
    expect(cut.miss).toBe(false);
    expect(cut.x).toBeCloseTo(0.35, 6);
    expect(cut.w).toBeCloseTo(0.4, 6);
    expect(cut.cutSide).toBe('right');
    expect(stackDrop(STACK_BASE, 0.1, 0.5, 0.03)).toMatchObject({ cutSide: 'left' });
    expect(stackDrop(STACK_BASE, 0.8, 0.2, 0.03).miss).toBe(true);
    expect(stackDrop({ x: 0.4, w: 0.2 }, 0.0, 0.2, 0.03).miss).toBe(true);
  });
  it('la nota crece con la altura: torre completa 5, ninguna pieza 0', () => {
    const s = stackSetup(createBonusPlan('lia', 35, 1));
    const g = Array.from({ length: s.blocks + 1 }, (_, n) => stackGrade({ placed: n }, s));
    expect(g[0]).toBe(0);
    expect(g.at(-1)).toBe(5);
    expect(g).toEqual(g.slice().sort((a, b) => a - b));
    expect(new Set(g)).toEqual(new Set([0, 1, 2, 3, 4, 5]));
  });
});

describe('Jean · La Última Campanada (parar la aguja)', () => {
  it('cinco campanadas; la aguja sale lejos de la zona, que se estrecha y se acelera de forma razonable', () => {
    for (const plan of plansOf('clock')) {
      const s = clockSetup(plan);
      expect(s.list).toHaveLength(5);
      s.list.forEach((r, i) => {
        expect(clockScore(r, clockAngle(r, 0)), 'empieza fuera').toBe(0);
        expect((r.zone * r.period), 'ventana humana (ms)').toBeGreaterThan(110);
        if (i) { expect(r.zone).toBeLessThan(s.list[i - 1].zone); expect(r.period).toBeLessThan(s.list[i - 1].period); }
        // medio giro después la aguja está en el centro exacto
        expect(clockScore(r, clockAngle(r, r.period / 2))).toBe(2);
        expect(clockScore(r, clockAngle(r, r.period / 2 + r.period * r.zone * 0.4))).toBe(1);
        expect(clockScore(r, clockAngle(r, r.period / 2 + r.period * r.zone * 0.6))).toBe(0);
      });
    }
  });
  it('la esfera es circular: una zona que cruza las doce se puntúa bien', () => {
    const r = { center: 0.98, zone: 0.1, period: 2000, dir: 1, from: 0.48 };
    expect(clockScore(r, 0.01)).toBe(1);
    expect(clockScore(r, 0.985)).toBe(2);
    expect(clockScore(r, 0.5)).toBe(0);
    expect([0, 1, 2, 3, 4, 5, 9].map((hits) => clockGrade({ hits }))).toEqual([0, 1, 2, 3, 4, 5, 5]);
  });
});

describe('Jean · El Compás del Péndulo (ritmo)', () => {
  it('las notas caen a compás, nunca tres seguidas en el mismo carril, y todas son tocables', () => {
    for (const plan of plansOf('rhythm')) {
      const s = rhythmSetup(plan);
      expect(s.list).toHaveLength(s.notes);
      for (let i = 0; i < s.list.length; i++) {
        expect(s.list[i].lane).toBeLessThan(RHYTHM_LANES);
        if (i) expect(s.list[i].t - s.list[i - 1].t).toBe(s.beat);
        if (i >= 2) expect(s.list[i].lane === s.list[i - 1].lane && s.list[i].lane === s.list[i - 2].lane).toBe(false);
      }
      expect(s.list[0].t).toBeGreaterThanOrEqual(s.travel);                  // la primera nota se ve caer entera
      expect(s.window * 2).toBeLessThan(s.beat);                             // un toque nunca vale para dos notas
      expect(new Set(s.list.map((n) => n.lane)).size).toBe(3);
    }
  });
  it('juzga el toque por el instante real: dentro del margen acierta la nota más cercana, fuera es un toque al aire', () => {
    const s = rhythmSetup(createBonusPlan('jean', 25, 4)), done = [];
    const n0 = s.list[0];
    expect(rhythmJudge(s, done, n0.lane, n0.t + s.window - 1)).toBe(0);
    expect(rhythmJudge(s, done, n0.lane, n0.t + s.window + 1)).toBe(-1);
    expect(rhythmJudge(s, done, (n0.lane + 1) % 3, n0.t)).toBe(-1);
    done[0] = true;
    expect(rhythmJudge(s, done, n0.lane, n0.t)).toBe(-1);                    // una nota no se cobra dos veces
    expect(rhythmGrade({ hits: s.notes, strays: 0 }, s)).toBe(5);
    expect(rhythmGrade({ hits: 0, strays: 9 }, s)).toBe(0);
    expect(rhythmGrade({ hits: s.notes, strays: 8 }, s)).toBeLessThan(5);    // aporrear los botones no sale gratis
  });
});

describe('Jean · Las Horas en Orden (tocar en orden)', () => {
  it('el tablero trae cada número una vez, desordenado', () => {
    for (const plan of plansOf('order')) {
      const s = orderSetup(plan);
      expect(s.cells.slice().sort((a, b) => a - b)).toEqual(Array.from({ length: s.count }, (_, i) => i + 1));
      expect(s.cells).not.toEqual(Array.from({ length: s.count }, (_, i) => i + 1));
      expect(s.count % s.cols).toBe(0);
    }
  });
  it('solo cuenta el siguiente número; un error cuesta tiempo; la nota premia la rapidez', () => {
    const s = orderSetup(createBonusPlan('jean', 35, 2)), st = orderState();
    expect(orderTap(s, st, 2)).toBe('wrong');
    expect(orderClock(s, st, 1000)).toBe(1000 + s.penalty);
    expect(orderTap(s, st, 1)).toBe('ok');
    for (let v = 2; v < s.count; v++) expect(orderTap(s, st, v)).toBe('ok');
    expect(orderGrade(s, st, s.duration)).toBe(2);                           // se acabó el tiempo a falta de uno
    expect(orderTap(s, st, s.count)).toBe('done');
    expect(orderTap(s, st, 1)).toBeNull();
    const clean = { next: s.count + 1, wrong: 0 };
    expect(orderGrade(s, clean, s.duration * 0.5)).toBe(5);
    expect(orderGrade(s, clean, s.duration * 0.7)).toBe(4);
    expect(orderGrade(s, clean, s.duration * 0.95)).toBe(3);
    expect(orderGrade(s, { next: s.count + 1, wrong: 3 }, s.duration * 0.5)).toBeLessThan(5);
    expect(orderGrade(s, { next: 1, wrong: 0 }, s.duration)).toBe(0);
    expect(orderGrade(s, { next: Math.ceil(s.count * 0.4) + 1, wrong: 0 }, s.duration)).toBe(1);
  });
});

describe('Juth · El Códice de los Nombres (parejas)', () => {
  it('cada símbolo aparece exactamente dos veces y el tablero es una cuadrícula completa', () => {
    for (const plan of plansOf('pairs')) {
      const s = pairsSetup(plan), count = {};
      for (const v of s.deck) count[v] = (count[v] || 0) + 1;
      expect(Object.keys(count)).toHaveLength(s.pairs);
      expect(Object.values(count).every((n) => n === 2)).toBe(true);
      expect(s.deck.length % s.cols).toBe(0);
    }
  });
  it('no deja abrir la misma carta dos veces ni una tercera antes de cerrar el fallo', () => {
    const s = pairsSetup(createBonusPlan('van', 15, 1)), st = pairsState();
    expect(pairsTap(s, st, 0).type).toBe('open');
    expect(pairsTap(s, st, 0)).toBeNull();
    const bad = s.deck.findIndex((v) => v !== s.deck[0]);
    expect(pairsTap(s, st, bad).type).toBe('miss');
    expect(st.misses).toBe(1);
    expect(pairsTap(s, st, s.deck.length - 1)).toBeNull();
    pairsClose(st);
    expect(pairsTap(s, st, bad).type).toBe('open');
    expect(pairsTap(s, st, 99)).toBeNull();
  });
  it('sin fallos da 5; la nota baja con los errores; agotarlos termina el juego con nota parcial', () => {
    const s = pairsSetup(createBonusPlan('van', 15, 1)), st = pairsState();
    for (let sym = 0; sym < s.pairs; sym++) {
      const [a, b] = s.deck.map((v, i) => (v === sym ? i : -1)).filter((i) => i >= 0);
      expect(pairsTap(s, st, a).type).toBe('open');
      expect(pairsTap(s, st, b).type).toBe('match');
      expect(pairsTap(s, st, a)).toBeNull();
    }
    expect(pairsOver(s, st)).toBe(true);
    expect(pairsGrade(s, st)).toBe(5);
    const all = st.matched.slice();
    const g = Array.from({ length: s.maxMiss }, (_, m) => pairsGrade(s, { matched: all, open: [], misses: m }));
    expect(g).toEqual(g.slice().sort((a, b) => b - a));
    expect(g[0]).toBe(5);
    expect(g.at(-1)).toBe(2);
    expect(pairsOver(s, { matched: [], open: [], misses: s.maxMiss })).toBe(true);
    expect(pairsGrade(s, { matched: all.slice(0, s.pairs), open: [], misses: s.maxMiss })).toBe(1);
    expect(pairsGrade(s, { matched: [], open: [], misses: s.maxMiss })).toBe(0);
  });
});

describe('Juth · El Nombre de las Estrellas (secuencia)', () => {
  it('la secuencia crece una luz por ronda y nunca repite tres veces seguidas', () => {
    for (const plan of plansOf('simon')) {
      const s = simonSetup(plan);
      expect(s.sequence).toHaveLength(s.start + s.rounds - 1);
      for (let i = 2; i < s.sequence.length; i++) expect(s.sequence[i] === s.sequence[i - 1] && s.sequence[i] === s.sequence[i - 2]).toBe(false);
      for (const v of s.sequence) expect(v).toBeLessThan(SIMON_PADS);
    }
  });
  it('cinco rondas perfectas dan 5; la nota es el número de rondas superadas', () => {
    const s = simonSetup(createBonusPlan('van', 25, 2)), st = simonState();
    for (let r = 0; r < s.rounds; r++) {
      expect(simonLength(s, st)).toBe(s.start + r);
      for (let i = 0; i < s.start + r; i++) {
        const out = simonTap(s, st, s.sequence[i]);
        expect(out).toBe(i < s.start + r - 1 ? 'step' : r === s.rounds - 1 ? 'win' : 'round');
      }
    }
    expect(simonGrade(st)).toBe(5);
    expect(simonTap(s, st, 0)).toBeNull();
  });
  it('el primer fallo repite la misma secuencia; el segundo termina y conserva las rondas ganadas', () => {
    const s = simonSetup(createBonusPlan('van', 25, 2)), st = simonState();
    for (let i = 0; i < s.start; i++) simonTap(s, st, s.sequence[i]);
    expect(st.round).toBe(1);
    const wrong = (s.sequence[0] + 1) % SIMON_PADS;
    expect(simonTap(s, st, wrong)).toBe('retry');
    expect(st.input).toBe(0);
    expect(simonTap(s, st, s.sequence[0])).toBe('step');
    expect(simonTap(s, st, (s.sequence[1] + 1) % SIMON_PADS)).toBe('fail');
    expect(simonGrade(st)).toBe(1);
    expect(simonTap(s, st, s.sequence[0])).toBeNull();
  });
});

describe('Juth · El Sello Errante (cubiletes)', () => {
  it('cinco rondas, cada una con un cambio más y más rápida; los cambios siempre mueven dos cubiletes distintos', () => {
    for (const plan of plansOf('shell')) {
      const s = shellSetup(plan);
      expect(s.list).toHaveLength(5);
      s.list.forEach((r, i) => {
        expect(r.swaps).toHaveLength(s.swaps + i);
        expect(r.star).toBeLessThan(s.cups);
        for (const [a, b] of r.swaps) { expect(a).not.toBe(b); expect(Math.max(a, b)).toBeLessThan(s.cups); }
        if (i) expect(r.ms).toBeLessThan(s.list[i - 1].ms);
        expect(r.ms).toBeGreaterThanOrEqual(240);                              // nunca tan rápido que no se pueda seguir
        const end = shellTrack(r.star, r.swaps);
        expect(end).toBeGreaterThanOrEqual(0);
        expect(end).toBeLessThan(s.cups);
      });
    }
  });
  it('seguir la estrella: los intercambios la llevan donde toca y la nota son los aciertos', () => {
    expect(shellTrack(0, [[0, 1], [1, 2], [0, 2]])).toBe(0);
    expect(shellTrack(1, [[0, 2]])).toBe(1);
    expect(shellTrack(2, [[0, 2], [0, 1]])).toBe(1);
    // es una permutación: dos estrellas distintas nunca acaban en el mismo sitio
    const s = shellSetup(createBonusPlan('van', 95, 3));
    for (const r of s.list) expect(new Set(Array.from({ length: s.cups }, (_, c) => shellTrack(c, r.swaps))).size).toBe(s.cups);
    expect([0, 3, 5].map((hits) => shellGrade({ hits }))).toEqual([0, 3, 5]);
  });
});

describe('dificultad progresiva: cada escalón pide más que el anterior', () => {
  it('los ajustes se endurecen (o se mantienen) de escalón en escalón', () => {
    const harder = { catch: (a, b) => b.embers > a.embers && b.fall < a.fall, whack: (a, b) => b.shadows > a.shadows && b.stay < a.stay, stack: (a, b) => b.blocks > a.blocks && b.period < a.period,
      clock: (a, b) => b.zone < a.zone && b.period < a.period, rhythm: (a, b) => b.notes > a.notes && b.beat < a.beat, order: (a, b) => b.count > a.count,
      pairs: (a, b) => b.pairs > a.pairs, simon: (a, b) => b.start > a.start, shell: (a, b) => b.swaps > a.swaps && b.ms < a.ms };
    for (const k of BONUS_KINDS) for (let t = 1; t < 3; t++) expect(harder[k](TUNING[k][t - 1], TUNING[k][t]), `${k} escalón ${t}`).toBe(true);
  });
  it('todas las partidas duran poco: entre unos segundos y medio minuto largo', () => {
    for (const k of ['catch', 'whack', 'rhythm', 'order']) for (const plan of plansOf(k)) {
      const d = setupFor(plan).duration;
      expect(d, k).toBeGreaterThan(9000);
      expect(d, k).toBeLessThan(36000);
    }
  });
});

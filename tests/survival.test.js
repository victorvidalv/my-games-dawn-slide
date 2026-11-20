import { describe, expect, it } from 'vitest';
import { SURVIVAL_TRACKS, shuffleSurvivalTracks } from '../src/audio/themes-survival.js';
import { encode } from '../src/engine/board.js';
import { analyze, expand } from '../src/engine/solver.js';
import { mergeSaves } from '../src/game/save-merge.js';
import {
  CHALLENGE_RELICS,
  CHALLENGE_ROUTES,
  buildSurvival,
  canUseChallengeRelic,
  newSurvival,
  routeLevels,
  spendSurvivalTurn,
  survivalBestFor,
  survivalCompletedCount,
  useChallengeHint,
  useChallengeReset,
  useChallengeUndo,
  writeSurvival,
} from '../src/game/survival.js';

describe('modo desafío', () => {
  it('las tres rutas (150, 200 y 250 turnos) tienen tableros únicos, resolubles y suman exactamente su meta', () => {
    const allBoards = new Set();
    expect(CHALLENGE_ROUTES.map((r) => r.turns)).toEqual([150, 200, 250]);

    for (const route of CHALLENGE_ROUTES) {
      let progress = newSurvival(route.id, 'hint');
      const levels = routeLevels(route.id);
      expect(levels.length).toBe(route.levels);
      expect(levels.reduce((sum, l) => sum + l.opt, 0)).toBe(route.turns);

      for (let i = 0; i < levels.length; i++) {
        const G = buildSurvival(progress);
        const { pieces, pos, walls, opt } = G;
        allBoards.add(JSON.stringify({ pieces, pos, walls }));
        const graph = analyze(pieces, pos, 600000, walls);
        let key = encode(pos);
        expect(graph?.dist.get(key)).toBe(opt);
        const scratch = pos.slice();
        const cells = new Int8Array(36);
        for (let distance = opt; distance > 0; distance--) {
          let move;
          expand(
            pieces,
            key,
            scratch,
            cells,
            (idx, to, candidate) => {
              if (!move && graph.dist.get(candidate) === distance - 1) move = { i: idx, to, candidate };
            },
            walls,
          );
          const prev = pos.slice();
          pos[move.i] = move.to;
          key = move.candidate;
          progress = spendSurvivalTurn(progress, pos, distance === 1, prev);
        }
        expect(progress.cleared).toBe(i + 1);
      }
      expect(progress).toMatchObject({ route: route.id, cleared: route.levels, status: 'won', remaining: 0 });
    }
    expect(allBoards.size).toBe(CHALLENGE_ROUTES.reduce((s, r) => s + r.levels, 0));
  });

  it('un turno extra deja la reserva corta incluso al resolver los demás tableros en el mínimo', () => {
    let progress = spendSurvivalTurn(newSurvival('150', 'hint'), [], false, []);
    while (progress.status === 'active') {
      const { opt } = buildSurvival(progress);
      for (let i = 1; i <= opt && progress.status === 'active'; i++) {
        progress = spendSurvivalTurn(progress, [], i === opt, []);
      }
    }
    expect(progress).toMatchObject({ cleared: 14, status: 'lost', remaining: 0, pos: null });
  });

  it('las tres reliquias aplican sus reglas exactas: pista por tablero, rehacer 1 tablero por partida y deshacer 1 vez por tablero', () => {
    expect(CHALLENGE_RELICS.map((r) => r.id)).toEqual(['hint', 'reset', 'undo']);

    // 1. Pista por tablero (no acumulable)
    let pHint = newSurvival('150', 'hint');
    expect(canUseChallengeRelic(pHint).ok).toBe(true);
    pHint = useChallengeHint(pHint);
    expect(canUseChallengeRelic(pHint).ok).toBe(false);
    pHint = spendSurvivalTurn(pHint, [1], false, [0]);
    expect(canUseChallengeRelic(pHint).ok).toBe(false); // sigue usada en el mismo tablero
    pHint = spendSurvivalTurn(pHint, [4], true, [1]); // supera tablero
    expect(canUseChallengeRelic(pHint).ok).toBe(true); // vuelve a estar disponible en el tablero siguiente

    // 2. Rehacer tablero completo una vez por partida
    let pReset = newSurvival('200', 'reset');
    expect(canUseChallengeRelic(pReset).ok).toBe(false); // sin mover aún
    pReset = spendSurvivalTurn(pReset, [1], false, [0]);
    pReset = spendSurvivalTurn(pReset, [2], false, [1]);
    expect(pReset.remaining).toBe(198);
    expect(canUseChallengeRelic(pReset).ok).toBe(true);
    pReset = useChallengeReset(pReset);
    expect(pReset).toMatchObject({ remaining: 200, pos: null, resetUsed: true });
    pReset = spendSurvivalTurn(pReset, [1], false, [0]);
    expect(canUseChallengeRelic(pReset).ok).toBe(false); // solo una vez por partida

    // 3. Deshacer una vez por tablero
    let pUndo = newSurvival('250', 'undo');
    expect(canUseChallengeRelic(pUndo).ok).toBe(false);
    pUndo = spendSurvivalTurn(pUndo, [1, 2], false, [0, 2]);
    expect(pUndo.remaining).toBe(249);
    expect(canUseChallengeRelic(pUndo).ok).toBe(true);
    pUndo = useChallengeUndo(pUndo);
    expect(pUndo).toMatchObject({ remaining: 250, pos: [0, 2], undoUsedBoard: true });
    pUndo = spendSurvivalTurn(pUndo, [1, 2], false, [0, 2]);
    expect(canUseChallengeRelic(pUndo).ok).toBe(false); // ya usada en este tablero
    pUndo = spendSurvivalTurn(pUndo, [4, 2], true, [1, 2]); // supera tablero
    pUndo = spendSurvivalTurn(pUndo, [2, 3], false, [1, 3]); // mueve en tablero 2
    expect(canUseChallengeRelic(pUndo).ok).toBe(true); // vuelve a estar disponible
  });

  it('guarda récords por ruta y rutas completadas al reiniciar o fusionar guardados', () => {
    const store = {};
    writeSurvival(store, { ...newSurvival('150', 'hint'), cleared: 6, updatedAt: 1 });
    writeSurvival(store, { ...newSurvival('200', 'reset'), cleared: 16, remaining: 0, status: 'won', updatedAt: 2 });
    expect(survivalBestFor(store, '150')).toBe(7);
    expect(survivalCompletedCount(store)).toBe(1);

    const otherTab = {
      survival: { ...newSurvival('250', 'undo'), cleared: 3, updatedAt: Date.now() + 1000 },
      survivalBests: { 150: 4, 250: 4 },
      survivalWon: { 150: true },
    };
    const merged = mergeSaves(store, otherTab);
    expect(merged.survival.route).toBe('250');
    expect(survivalBestFor(merged, '150')).toBe(15);
    expect(survivalCompletedCount(merged)).toBe(2);
  });

  it('baraja el repertorio de melodías de desafío sin repetir la canción anterior', () => {
    expect(SURVIVAL_TRACKS.length).toBeGreaterThanOrEqual(12);
    const previous = SURVIVAL_TRACKS.at(-1);
    const cycle = shuffleSurvivalTracks(previous, () => 0);
    expect(cycle).toHaveLength(SURVIVAL_TRACKS.length);
    expect(new Set(cycle)).toEqual(new Set(SURVIVAL_TRACKS));
    expect(cycle[0]).not.toBe(previous);
    expect(new Set(cycle.map((track) => JSON.stringify(track.tune))).size).toBe(SURVIVAL_TRACKS.length);
  });
});

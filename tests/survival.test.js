import { describe, expect, it } from 'vitest';
import { SURVIVAL_TRACKS, shuffleSurvivalTracks } from '../src/audio/themes-survival.js';
import { encode } from '../src/engine/board.js';
import { analyze, expand } from '../src/engine/solver.js';
import { mergeSaves } from '../src/game/save-merge.js';
import {
  newSurvival,
  buildSurvival,
  spendSurvivalTurn,
  writeSurvival,
  SURVIVAL_LEVELS,
  SURVIVAL_TURNS,
} from '../src/game/survival.js';

describe('supervivencia', () => {
  it('cada tablero sube un movimiento y una partida perfecta termina justo en el turno 150', () => {
    let progress = newSurvival();
    const boards = new Set();
    for (let i = 0; i < SURVIVAL_LEVELS; i++) {
      const G = buildSurvival(progress);
      const { pieces, pos, walls, opt } = G;
      expect(opt).toBe(i + 3);
      boards.add(JSON.stringify({ pieces, pos, walls }));
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
          (i, to, candidate) => {
            if (!move && graph.dist.get(candidate) === distance - 1) move = { i, to, candidate };
          },
          walls,
        );
        pos[move.i] = move.to;
        key = move.candidate;
        progress = spendSurvivalTurn(progress, pos, distance === 1);
      }
      expect(progress.cleared).toBe(i + 1);
    }
    expect(SURVIVAL_TURNS).toBe(150);
    expect(boards.size).toBe(15);
    expect(progress).toMatchObject({ cleared: 15, status: 'won', remaining: 0 });
    const final = buildSurvival({ ...newSurvival(), cleared: 14 });
    expect(final.walls.length).toBeGreaterThan(0);
    expect(new Set(final.pieces.map((piece) => piece.kind).filter(Boolean))).toEqual(new Set(['ice', 'heavy', 'gate']));
  });

  it('un turno extra deja la reserva corta incluso al resolver los demás tableros en el mínimo', () => {
    let progress = spendSurvivalTurn(newSurvival(), [], false);
    while (progress.status === 'active') {
      const { opt } = buildSurvival(progress);
      for (let i = 1; i <= opt && progress.status === 'active'; i++) {
        progress = spendSurvivalTurn(progress, [], i === opt);
      }
    }
    expect(progress).toMatchObject({ cleared: 14, status: 'lost', remaining: 0, pos: null });
  });

  it('guarda el mayor nivel alcanzado aunque se reinicie o haya un guardado más reciente en otra pestaña', () => {
    const previous = { survival: { ...newSurvival(), cleared: 6, updatedAt: 1 } };
    const current = { ...previous };
    writeSurvival(current, newSurvival());
    expect(current.survivalBest).toBe(7);
    const otherTab = { survival: { ...newSurvival(), cleared: 1, updatedAt: Date.now() + 1000 }, survivalBest: 4 };
    const merged = mergeSaves(current, otherTab);
    expect(merged.survival.cleared).toBe(1);
    expect(merged.survivalBest).toBe(7);
  });

  it('baraja las diez melodías exclusivas sin repetir la canción anterior al cambiar de ciclo', () => {
    const previous = SURVIVAL_TRACKS.at(-1);
    const cycle = shuffleSurvivalTracks(previous, () => 0);
    expect(cycle).toHaveLength(10);
    expect(new Set(cycle)).toEqual(new Set(SURVIVAL_TRACKS));
    expect(cycle[0]).not.toBe(previous);
    expect(new Set(cycle.map((track) => JSON.stringify(track.tune))).size).toBe(10);
  });
});

import { describe, expect, it } from 'vitest';
import { S, closeRun, haltBoard, holdBusy, rememberConfig, setBoard, setBusy, setRun } from '../src/state.js';

describe('estado compartido', () => {
  it('detener el tablero bloquea la UI y no acepta más movimientos', () => {
    setBoard({ done: false });
    setBusy(false);
    haltBoard();
    expect(S.G.done).toBe(true);
    expect(S.busy).toBe(true);
  });

  it('cerrar la partida termina el tablero y libera la UI', () => {
    const G = { done: false };
    setBoard(G);
    setRun({ level: 3 });
    setBusy(true);
    closeRun();
    expect(G.done).toBe(true);
    expect(S.run).toBeNull();
    expect(S.busy).toBe(false);
  });

  it('holdBusy devuelve la UI al estado que tenía', () => {
    setBusy(false);
    const release = holdBusy();
    expect(S.busy).toBe(true);
    release();
    expect(S.busy).toBe(false);
  });

  it('recuerda el camino y el modo de la última partida', () => {
    rememberConfig({ start: 50, mode: 'c', level: 9 });
    expect(S.lastCfg).toEqual({ start: 50, mode: 'c' });
  });
});

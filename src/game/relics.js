/**
 * Reliquias: una al elegir héroe, para toda la aventura. Cada una apunta a un estilo:
 *   · Medallón solar: puntaje (+15 % en cada tablero).
 *   · Reloj de arena: margen (+2 turnos en cada tablero; se suma fuera del tope de las cartas).
 *   · Farol de pistas: precisión (+3 pistas al empezar; brilla en los caminos difíciles, donde escasean).
 * Calibradas con `node scripts/analyze-balance.mjs`.
 */
export const RELICS = [
  { id: 'sun', name: 'Medallón solar', label: '+15 % de puntos', points: 0.15 },
  { id: 'purse', name: 'Reloj de arena', label: '+2 turnos en cada tablero', turns: 2 },
  { id: 'lantern', name: 'Farol de pistas', label: '+3 pistas al empezar', hints: 3 },
];

export const relicFor = (run) =>
  run && !run.daily && run.mode !== 'p' ? RELICS.find((relic) => relic.id === run.relic) : undefined;

export const relicPoints = (run, points) => points + Math.round(points * (relicFor(run)?.points ?? 0));

export const relicTurns = (run) => relicFor(run)?.turns ?? 0;

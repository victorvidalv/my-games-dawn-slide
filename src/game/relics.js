/**
 * Reliquias: una al elegir héroe, para toda la aventura. Cada una apunta a un estilo:
 *   · Medallón solar: puntaje (+15 % en cada tablero).
 *   · Reloj de arena: margen (+2 turnos en cada tablero; se suma fuera del tope de las cartas).
 *   · Farol de pistas: precisión (+3 pistas al empezar, que brillan en los caminos difíciles, donde escasean, y +5 % de puntos
 *     en cada tablero resuelto sin pedir pista, que es lo que le da valor en Normal, donde las pistas sobran).
 * Calibradas con `node scripts/analyze-balance.mjs`.
 */
export const RELICS = [
  { id: 'sun', name: 'Medallón solar', label: '+15 % de puntos', points: 0.15 },
  { id: 'purse', name: 'Reloj de arena', label: '+2 turnos en cada tablero', turns: 2 },
  {
    id: 'lantern',
    name: 'Farol de pistas',
    label: '+3 pistas al empezar y +5 % de puntos en tableros sin pista',
    hints: 3,
    cleanPoints: 0.05,
  },
];

export const relicFor = (run) =>
  run && !run.daily && run.mode !== 'p' ? RELICS.find((relic) => relic.id === run.relic) : undefined;

/** Puntos del tablero con la reliquia: `hinted` = se pidió una pista en el tablero (el Farol solo premia los que no). */
export const relicPoints = (run, points, hinted = false) => {
  const relic = relicFor(run);
  return points + Math.round(points * ((relic?.points ?? 0) + (hinted ? 0 : (relic?.cleanPoints ?? 0))));
};

export const relicTurns = (run) => relicFor(run)?.turns ?? 0;

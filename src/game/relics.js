export const RELICS = [
  { id: 'sun', name: 'Medallón solar', label: '+15 % de puntos', points: 0.15 },
  { id: 'purse', name: 'Reloj de arena', label: '+1 turno en cada tablero', turns: 1 },
  { id: 'lantern', name: 'Farol de pistas', label: '+4 pistas al empezar', hints: 4 },
];

export const relicFor = (run) =>
  run && !run.daily && run.mode !== 'p' ? RELICS.find((relic) => relic.id === run.relic) : undefined;

export const relicPoints = (run, points) => points + Math.round(points * (relicFor(run)?.points ?? 0));

export const relicTurns = (run) => relicFor(run)?.turns ?? 0;

export const RELICS = [
  { id: 'sun', name: 'Medallón solar', label: '+15 % de puntos', points: 0.15 },
  { id: 'purse', name: 'Bolsa mercante', label: 'Tienda −30 % · revivir −20 %', discount: 0.3, revive: 0.2 },
  { id: 'lantern', name: 'Farol de pistas', label: '+7 pistas al empezar', hints: 7 },
];

export const relicFor = (run) =>
  run && !run.daily && run.mode !== 'p' ? RELICS.find((relic) => relic.id === run.relic) : undefined;

export const relicPoints = (run, points) => points + Math.round(points * (relicFor(run)?.points ?? 0));

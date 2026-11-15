import { gainFor } from '../engine/scoring.js';

// The saved value 'brave' is retained for existing adventures. All heroic paths share its difficulty.
export const HEROIC_PATHS = {
  lia: { name: 'Camino de la Brasa', icon: 'flame', benefit: '2 pistas gratis por tablero', guide: 'guia-brasa.webp', guideAlt: 'La forjadora, acompañante de Lía' },
  jean: { name: 'Camino del Péndulo', icon: 'clock', benefit: '+10 % de puntos', guide: 'guia-elfa.webp', guideAlt: 'La elfa, acompañante de Jean' },
  van: { name: 'Camino de las Runas', icon: 'stars', benefit: 'Tienda −33 %', guide: 'guia-runas.webp', guideAlt: 'El erudito, acompañante de Juth' },
};
export const heroicPath = hero => HEROIC_PATHS[hero] || HEROIC_PATHS.lia;
export const isHeroic = run => !!run && run.mode !== 'p' && run.route === 'brave';
export const shopDiscount = run => isHeroic(run) && run.hero === 'van' ? 0.33 : 0;

export function heroicHintsLeft(run, level) {
  if (!isHeroic(run) || run.hero !== 'lia') return 0;
  const used = run.heroicHintLevel === level ? Math.max(0, run.heroicHintCount || 0) : 0;
  return Math.max(0, 2 - used);
}

export function useHeroicHint(run, level) {
  if (!heroicHintsLeft(run, level)) return false;
  run.heroicHintCount = (run.heroicHintLevel === level ? run.heroicHintCount || 0 : 0) + 1;
  run.heroicHintLevel = level;
  return true;
}

export const routeGain = (run, rating, moves, opt, streak) => gainFor(rating, moves, opt, streak, {
  brave: isHeroic(run) && run.hero === 'jean',
});

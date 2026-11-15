import { gainFor, HEROIC_POINTS } from '../engine/scoring.js';

// The saved value 'brave' is retained for existing adventures. All heroic paths share its difficulty.
export const HEROIC_PATHS = {
  lia: { name: 'Camino de la Brasa', icon: 'flame', benefit: '1 pista gratis cada dos tableros', guide: 'guia-brasa.webp', guideAlt: 'La forjadora, acompañante de Lía' },
  jean: { name: 'Camino del Péndulo', icon: 'clock', benefit: '+25 % de puntos', guide: 'guia-elfa.webp', guideAlt: 'La elfa, acompañante de Jean' },
  van: { name: 'Camino de las Runas', icon: 'stars', benefit: 'Tienda −40 %', guide: 'guia-runas.webp', guideAlt: 'El erudito, acompañante de Juth' },
};
/** Ventajas numéricas del camino heroico (el modelo de equilibrio las usa: src/game/balance.js). */
export const HEROIC_BENEFITS = { liaHints: 1, liaEvery: 2, jeanPoints: HEROIC_POINTS, juthDiscount: .4 };
export const heroicPath = hero => HEROIC_PATHS[hero] || HEROIC_PATHS.lia;
export const isHeroic = run => !!run && run.mode !== 'p' && run.route === 'brave';
export const shopDiscount = run => isHeroic(run) && run.hero === 'van' ? HEROIC_BENEFITS.juthDiscount : 0;

export function heroicHintsLeft(run, level) {
  if (!isHeroic(run) || run.hero !== 'lia' || level % HEROIC_BENEFITS.liaEvery !== 0) return 0;      // una pista gratis cada dos tableros
  const used = run.heroicHintLevel === level ? Math.max(0, run.heroicHintCount || 0) : 0;
  return Math.max(0, HEROIC_BENEFITS.liaHints - used);
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

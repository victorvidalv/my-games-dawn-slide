import { gainFor } from '../engine/scoring.js';

/**
 * Camino heroico: tablero +10 %, límite más estricto y los poderes de los tres héroes valen la MITAD (`powerScale`).
 * A cambio, más puntos y una tienda más barata (o más cara) según lo fuerte que sea cada héroe en su camino: el más débil recibe más.
 * Los valores se calibraron con `npm run simulate` (sección «Camino heroico»).
 *   Lía  – una pista gratis cada `liaEvery` tableros
 */
export const HEROIC_BENEFITS = {
  powerScale: .5,
  points: { lia: .45, jean: .4, van: .35 },        // fracción extra de puntos
  shop: { lia: .3, jean: .3, van: .2 },           // descuento de la tienda (negativo = más cara)
  liaHints: 1, liaEvery: 4,
};
const pct = (n) => `${Math.round(n * 100)} %`;
const sign = (n) => (n < 0 ? `+${pct(-n)}` : `−${pct(n)}`);
const heroicBenefit = (hero) => `+${pct(HEROIC_BENEFITS.points[hero])} de puntos · poderes a la mitad · tienda ${sign(HEROIC_BENEFITS.shop[hero])}`;

// The saved value 'brave' is retained for existing adventures. All heroic paths share its difficulty.
export const HEROIC_PATHS = {
  lia: { name: 'Camino de la Brasa', icon: 'flame', benefit: `+${pct(HEROIC_BENEFITS.points.lia)} de puntos · poderes a la mitad · tienda ${sign(HEROIC_BENEFITS.shop.lia)} · pista gratis cada ${HEROIC_BENEFITS.liaEvery} tableros`, guide: 'guia-brasa.webp', guideAlt: 'La forjadora, acompañante de Lía' },
  jean: { name: 'Camino del Péndulo', icon: 'clock', benefit: heroicBenefit('jean'), guide: 'guia-elfa.webp', guideAlt: 'La elfa, acompañante de Jean' },
  van: { name: 'Camino de las Runas', icon: 'stars', benefit: heroicBenefit('van'), guide: 'guia-runas.webp', guideAlt: 'El erudito, acompañante de Juth' },
};
export const heroicPath = hero => HEROIC_PATHS[hero] || HEROIC_PATHS.lia;
export const isHeroic = run => !!run && run.mode !== 'p' && run.route === 'brave';
/** Fracción extra de puntos del camino heroico (0 fuera de él). */
export const heroicPoints = (run) => (isHeroic(run) ? HEROIC_BENEFITS.points[run.hero] ?? 0 : 0);
/** Multiplicador de los poderes del héroe: 1, o la mitad en el camino heroico. */
export const powerFactor = (run) => (isHeroic(run) ? HEROIC_BENEFITS.powerScale : 1);
/** Descuento de la tienda en el camino heroico (puede ser negativo: más cara). */
export const shopDiscount = run => (isHeroic(run) ? HEROIC_BENEFITS.shop[run.hero] ?? 0 : 0);

export function heroicHintsLeft(run, level) {
  if (!isHeroic(run) || run.hero !== 'lia' || level % HEROIC_BENEFITS.liaEvery !== 0) return 0;      // una pista gratis cada `liaEvery` tableros
  const used = run.heroicHintLevel === level ? Math.max(0, run.heroicHintCount || 0) : 0;
  return Math.max(0, HEROIC_BENEFITS.liaHints - used);
}

export function useHeroicHint(run, level) {
  if (!heroicHintsLeft(run, level)) return false;
  run.heroicHintCount = (run.heroicHintLevel === level ? run.heroicHintCount || 0 : 0) + 1;
  run.heroicHintLevel = level;
  return true;
}

import { isBossLevel } from './mechanics.js';

export const BOSS_POINTS_BONUS = 0.3;

export const routeGain = (run, rating, moves, opt, streak, level = run?.level || 1) =>
  gainFor(rating, moves, opt, streak, { bonus: heroicPoints(run) + (isBossLevel(level) ? BOSS_POINTS_BONUS : 0) });

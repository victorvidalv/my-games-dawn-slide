import { gainFor } from '../engine/scoring.js';

/**
 * Ventajas numéricas del camino heroico (el modelo de equilibrio las usa: src/game/balance.js; calibradas con `npm run simulate`).
 * El riesgo es común (tablero +10 %, límite más estricto) y también el premio base: `points` más puntos para todos.
 * Cada héroe suma además su ventaja, calibrada para que el riesgo compense lo mismo en los tres:
 *   Lía  – una pista gratis cada `liaEvery` tableros      Jean – `jeanPoints` más de puntos y Rebobinar `jeanRewind` movimientos más
 *   Juth – Destino de `juthDestiny` pasos (en vez de 3) y tienda −`juthDiscount`.
 */
export const HEROIC_BENEFITS = { points: .15, jeanPoints: .1, jeanRewind: 3, liaHints: 1, liaEvery: 6, juthDiscount: .4, juthDestiny: 6 };
const pct = (n) => `${Math.round(n * 100)} %`;

// The saved value 'brave' is retained for existing adventures. All heroic paths share its difficulty.
export const HEROIC_PATHS = {
  lia: { name: 'Camino de la Brasa', icon: 'flame', benefit: `+${pct(HEROIC_BENEFITS.points)} de puntos · pista gratis cada ${HEROIC_BENEFITS.liaEvery} tableros`, guide: 'guia-brasa.webp', guideAlt: 'La forjadora, acompañante de Lía' },
  jean: { name: 'Camino del Péndulo', icon: 'clock', benefit: `+${pct(HEROIC_BENEFITS.points + HEROIC_BENEFITS.jeanPoints)} de puntos · rebobina +${HEROIC_BENEFITS.jeanRewind}`, guide: 'guia-elfa.webp', guideAlt: 'La elfa, acompañante de Jean' },
  van: { name: 'Camino de las Runas', icon: 'stars', benefit: `+${pct(HEROIC_BENEFITS.points)} de puntos · Destino de ${HEROIC_BENEFITS.juthDestiny} pasos · tienda −${pct(HEROIC_BENEFITS.juthDiscount)}`, guide: 'guia-runas.webp', guideAlt: 'El erudito, acompañante de Juth' },
};
export const heroicPath = hero => HEROIC_PATHS[hero] || HEROIC_PATHS.lia;
export const isHeroic = run => !!run && run.mode !== 'p' && run.route === 'brave';
/** Fracción extra de puntos del camino heroico (0 fuera de él): la base común más la de Jean. */
export const heroicPoints = (run) => (isHeroic(run) ? HEROIC_BENEFITS.points + (run.hero === 'jean' ? HEROIC_BENEFITS.jeanPoints : 0) : 0);
/** Juth en su camino heroico (Destino más largo). */
export const juthHeroic = (run) => isHeroic(run) && run.hero === 'van';
export const shopDiscount = run => isHeroic(run) && run.hero === 'van' ? HEROIC_BENEFITS.juthDiscount : 0;

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

export const routeGain = (run, rating, moves, opt, streak) => gainFor(rating, moves, opt, streak, { bonus: heroicPoints(run) });

import { gainFor } from '../engine/scoring.js';

import { isBossLevel, lettersOfFamily, TUTORIALS } from './mechanics.js';

/** Premios compartidos y margen de movimientos de la Brasa. */
export const HEROIC_BENEFITS = {
  powerScale: .5,
  liaMargin: .85,
  points: { lia: .45, jean: .4, van: .35 },        // fracción extra de puntos
  shop: { lia: .3, jean: .3, van: .2 },           // descuento de la tienda (negativo = más cara)
  liaHints: 1, liaEvery: 4,
};
const heroicCopy = (hero, challenge) => ({
  summary: `Más puntos + ${challenge}`,
  benefit: `+${Math.round(HEROIC_BENEFITS.points[hero] * 100)} % de puntos · ${challenge}`,
});

// Las partidas guardadas conservan 'brave'. El héroe determina la variante.
export const HEROIC_PATHS = {
  lia: { name: 'Camino de la Brasa', icon: 'flame', ...heroicCopy('lia', 'menos turnos'), guide: 'guia-brasa.webp', guideAlt: 'La forjadora, acompañante de Lía' },
  jean: { name: 'Camino del Péndulo', icon: 'clock', ...heroicCopy('jean', 'solución más larga'), guide: 'guia-elfa.webp', guideAlt: 'La elfa, acompañante de Jean' },
  van: { name: 'Camino de las Runas', icon: 'stars', ...heroicCopy('van', 'más mecanismos'), guide: 'guia-runas.webp', guideAlt: 'El erudito, acompañante de Juth' },
};

const MECHANIC_LESSONS = { w: 'wall', h: 'heavy', g: 'gate', i: 'ice', d: 'door' };

/** Juth combina las mecánicas previstas con otras ya enseñadas si hay tableros de esa dificultad. */
export function juthHeroicFamily(plan, level, rating, special) {
  if (plan.boss || plan.intro) return plan.family;
  const learned = [...'whgid'].filter((letter) => TUTORIALS[MECHANIC_LESSONS[letter]].level < level);
  const candidates = Object.keys(special || {}).flatMap((family) => {
    const letters = lettersOfFamily(family);
    return letters && letters.length > plan.letters.length && special[family]?.[rating - 1]?.length
      && [...plan.letters].every((letter) => letters.includes(letter))
      && [...letters].every((letter) => learned.includes(letter))
      ? [{ family, count: letters.length }] : [];
  });
  candidates.sort((a, b) => a.count - b.count || a.family.localeCompare(b.family, 'en'));
  return candidates[0]?.family ?? plan.family;
}
export const heroicPath = hero => HEROIC_PATHS[hero] || HEROIC_PATHS.lia;
export const isHeroic = run => !!run && run.mode !== 'p' && run.route === 'brave';
/** Fracción extra de puntos del camino heroico (0 fuera de él). */
export const heroicPoints = (run) => (isHeroic(run) ? HEROIC_BENEFITS.points[run.hero] ?? 0 : 0);
/** La Brasa reduce el límite base. Lía conserva toda su reserva. */
export const heroicPowerFactor = (hero, heroic) => heroic && hero !== 'lia' ? HEROIC_BENEFITS.powerScale : 1;
export const powerFactor = (run) => heroicPowerFactor(run?.hero, isHeroic(run));
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


export const BOSS_POINTS_BONUS = 0.3;

export const routeGain = (run, rating, moves, opt, streak, level = run?.level || 1) =>
  gainFor(rating, moves, opt, streak, { bonus: heroicPoints(run) + (isBossLevel(level) ? BOSS_POINTS_BONUS : 0) });

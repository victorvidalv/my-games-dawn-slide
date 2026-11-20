import { gainFor } from '../engine/scoring.js';

import { isBossLevel, lettersOfFamily, TUTORIALS } from './mechanics.js';
import { relicFor, relicPoints } from './relics.js';

/** Premios compartidos y margen de movimientos de la Brasa. */
export const HEROIC_BENEFITS = {
  powerScale: 0.5,
  liaMargin: 0.85,
  points: { lia: 0.35, jean: 0.45, van: 0.45 }, // fracción extra de puntos (Lía conserva su reserva entera, por eso gana menos)
  shop: { lia: 0.2, jean: 0.25, van: 0.25 }, // descuento de la tienda (negativo = más cara)
  liaHints: 1,
  liaEvery: 4,
};
/** Cada camino heroico tiene un premio propio, además de los puntos: Lía, pista gratis; Jean, rebobinado extra en el jefe; Juth, runas a plena potencia. */
const heroicCopy = (hero, challenge, perk) => ({
  summary: `Más puntos + ${challenge}`,
  benefit: `+${Math.round(HEROIC_BENEFITS.points[hero] * 100)} % de puntos · ${challenge} · ${perk}`,
  perk,
});

// Las partidas guardadas conservan 'brave'. El héroe determina la variante.
export const HEROIC_PATHS = {
  lia: {
    name: 'Camino de la Brasa',
    icon: 'flame',
    ...heroicCopy('lia', 'menos turnos', 'pista gratis cada 4 tableros'),
  },
  jean: {
    name: 'Camino del Péndulo',
    icon: 'clock',
    ...heroicCopy('jean', 'solución más larga', 'rebobinado extra en el jefe'),
  },
  van: {
    name: 'Camino de las Runas',
    icon: 'stars',
    ...heroicCopy('van', 'más mecanismos', 'runas a plena potencia'),
  },
};

const MECHANIC_LESSONS = { w: 'wall', h: 'heavy', g: 'gate', i: 'ice' };

/** Juth combina las mecánicas previstas con otras ya enseñadas si hay tableros de esa dificultad. */
export function juthHeroicFamily(plan, level, rating, special) {
  if (plan.boss || plan.intro) return plan.family;
  const learned = [...'whgi'].filter((letter) => TUTORIALS[MECHANIC_LESSONS[letter]].level < level);
  const candidates = Object.keys(special || {}).flatMap((family) => {
    const letters = lettersOfFamily(family);
    return letters &&
      letters.length > plan.letters.length &&
      special[family]?.[rating - 1]?.length &&
      [...plan.letters].every((letter) => letters.includes(letter)) &&
      [...letters].every((letter) => learned.includes(letter))
      ? [{ family, count: letters.length }]
      : [];
  });
  candidates.sort((a, b) => a.count - b.count || a.family.localeCompare(b.family, 'en'));
  return candidates[0]?.family ?? plan.family;
}
export const heroicPath = (hero) => HEROIC_PATHS[hero] || HEROIC_PATHS.lia;
export const isHeroic = (run) => !!run && run.mode !== 'p' && run.route === 'brave';
/** Fracción extra de puntos del camino heroico (0 fuera de él). */
export const heroicPoints = (run) => (isHeroic(run) ? (HEROIC_BENEFITS.points[run.hero] ?? 0) : 0);
/** En su camino heroico Jean rebobina la mitad (a cambio, un uso extra en el jefe); Lía conserva su reserva y Juth sus runas enteras. */
export const heroicPowerFactor = (hero, heroic) => (heroic && hero === 'jean' ? HEROIC_BENEFITS.powerScale : 1);
export const powerFactor = (run) => heroicPowerFactor(run?.hero, isHeroic(run));
/** Los descuentos de la ruta y la reliquia se aplican sucesivamente al precio. */
export function shopDiscount(run) {
  const route = isHeroic(run) ? (HEROIC_BENEFITS.shop[run.hero] ?? 0) : 0;
  const relic = relicFor(run)?.discount ?? 0;
  return relic ? 1 - (1 - route) * (1 - relic) : route;
}

export function heroicHintsLeft(run, level) {
  if (!isHeroic(run) || run.hero !== 'lia' || level % HEROIC_BENEFITS.liaEvery !== 0) return 0; // una pista gratis cada `liaEvery` tableros
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

export function routeGain(run, rating, moves, opt, streak, level = run?.level || 1) {
  const gain = gainFor(rating, moves, opt, streak, {
    bonus: heroicPoints(run) + (isBossLevel(level) ? BOSS_POINTS_BONUS : 0),
  });
  gain.total = relicPoints(run, gain.total);
  return gain;
}

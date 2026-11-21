/** Etiqueta y diferencia firmada respecto de la solución óptima. */
export function resultRating(moves, opt) {
  const extra = Math.max(0, moves - opt);
  return {
    title: extra === 0 ? 'PERFECTO' : extra <= 2 ? 'CASI' : 'MEJORABLE',
    delta: extra === 0 ? '0' : `−${extra}`,
  };
}

/**
 * Puntos base de un tablero: dependen SOLO de sus movimientos mínimos (`opt`). Cada movimiento de la solución vale
 * 55 puntos, más 50 fijos: 2 mín. → 160 · 11 → 655 · 19 → 1.095 · 37 → 2.085.
 */
export const BASE_FIXED = 50;
export const BASE_PER_MOVE = 55;
export const baseScore = (opt) => BASE_FIXED + BASE_PER_MOVE * Math.max(1, Math.round(opt || 1));

/** Reglas del puntaje que pueden cambiar las cartas del destino (ver `fate.js`). */
export const SCORE_RULES = { perfect: 0.2, streakCap: 5, streakEff: 0.9 };

/**
 * Puntos: base × eficiencia (100 % en el mínimo, 0 % al doble de movimientos).
 * Perfecto (mínimo exacto): +20 %. Racha: ×1,1 por cada nivel seguido con ≥90 % (máx. ×1,5).
 * `rules` permite cambiar el bono de Perfecto, el tope de la racha y la eficiencia que la mantiene.
 */
export function calcGain(moves, opt, streak, rules = SCORE_RULES) {
  const { perfect: perfectShare, streakCap, streakEff } = { ...SCORE_RULES, ...rules };
  const base = baseScore(opt);
  const eff = Math.max(0, Math.min(1, 1 - (moves - opt) / opt));
  const pts = Math.round(base * eff);
  const perfect = moves <= opt ? Math.round(base * perfectShare) : 0;
  const mult = eff >= streakEff ? 1 + 0.1 * Math.min(streakCap, streak + 1) : 1;
  const total = Math.round((pts + perfect) * mult);
  return { base, eff, pts, perfect, mult, total, lost: Math.round(base * (1 - eff)) };
}

/** Igual que calcGain, más un bono proporcional (`bonus`, p. ej. 0,1 = +10 %; puede ser negativo). */
export function gainFor(moves, opt, streak, { bonus = 0, rules } = {}) {
  const gain = calcGain(moves, opt, streak, rules);
  gain.routeBonus = Math.round(gain.total * bonus);
  gain.total = Math.max(0, gain.total + gain.routeBonus);
  return gain;
}

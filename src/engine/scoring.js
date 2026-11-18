/** Etiqueta y diferencia firmada respecto de la solución óptima. */
export function resultRating(moves, opt) {
  const extra = Math.max(0, moves - opt);
  return { title: extra === 0 ? 'PERFECTO' : extra <= 2 ? 'CASI' : 'MEJORABLE', delta: extra === 0 ? '0' : `−${extra}` };
}

/** Puntos base de un nivel según su dificultad. */
export const baseScore = (rating) => 100 + 20 * (rating - 1);

/**
 * Puntos: base × eficiencia (100% en el mínimo, 0% al doble de movimientos).
 * Perfecto (mínimo exacto): +20%. Racha: ×1.1 por cada nivel seguido con ≥90% (máx ×1.5).
 */
export function calcGain(rating, moves, opt, streak) {
  const base = baseScore(rating);
  const eff = Math.max(0, Math.min(1, 1 - (moves - opt) / opt));
  const pts = Math.round(base * eff);
  const perfect = moves <= opt ? Math.round(base * 0.2) : 0;
  const mult = eff >= 0.9 ? 1 + 0.1 * Math.min(5, streak + 1) : 1;
  const total = Math.round((pts + perfect) * mult);
  return { base, eff, pts, perfect, mult, total, lost: Math.round(base * (1 - eff)) };
}

/** Igual que calcGain, más un bono proporcional (`bonus`, p. ej. 0,1 = +10 %) del camino heroico. */
export function gainFor(rating, moves, opt, streak, { bonus = 0 } = {}) {
  const gain = calcGain(rating, moves, opt, streak);
  gain.routeBonus = Math.round(gain.total * bonus);
  gain.total += gain.routeBonus;
  return gain;
}

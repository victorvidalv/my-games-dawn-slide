import { snapshotRescue } from './heroes.js';
import { fateRevives } from './fate.js';

/** Revivir al caer (solo con la carta Fénix): cuesta 33 % de tus puntos actuales. */
export const REVIVE_SHARE = 0.33;
/** Parte de los puntos que cuesta revivir en esta partida. */
export const reviveShare = () => REVIVE_SHARE;
export const MAX_REVIVES = 0;
/** Revivir pagados que permite la partida (0 por defecto; Fénix suma uno). */
const maxRevives = (run) => MAX_REVIVES + fateRevives(run);

/** Costo en puntos (33 %) de revivir tras perder con `score` puntos actuales. */
export const reviveCost = (score = 0) => Math.round(Math.max(0, score || 0) * reviveShare());

/** ¿Puede revivir pagando el 33 % de sus puntos actuales? (solo con Fénix, nunca en Práctica). */
export const canPaidRevive = (run, mode = run?.mode) =>
  !!run && mode !== 'p' && (run.revivesBought || 0) < maxRevives(run) && reviveCost(run.score) > 0;

/** Cobra el 33 % de los puntos actuales y marca el revivir usado. */
export function payRevive(run) {
  if (!canPaidRevive(run)) return { ok: false, cost: 0 };
  const cost = reviveCost(run.score);
  run.score -= cost;
  run.spent = (run.spent || 0) + cost;
  run.revivesBought = (run.revivesBought || 0) + 1;
  return { ok: true, cost };
}

export const FREE_RETRY_UNTIL = 3;

/** Los primeros niveles del camino Normal se pueden repetir gratis (para aprender). */
export const freeRetry = (run, level) =>
  !!run && !run.daily && run.mode !== 'p' && (run.start || 1) === 1 && level <= FREE_RETRY_UNTIL;

/** Prepara el mismo tablero para repetirlo sin coste. La derrota corta la racha de la aventura. */
export function useFreeRetry(run, G) {
  if (!freeRetry(run, G.n)) return false;
  run.streak = 0;
  run.rescue = { ...snapshotRescue(G), kind: 'learn' };
  return true;
}

/** ¿Tienes un revivir guardado? (compatibilidad con partidas guardadas antiguas). */
export const hasRevive = (run) => (run?.revive || 0) > 0;

/** Gasta un revivir guardado y prepara el tablero para repetirlo desde el principio. */
export function useRevive(run, G) {
  run.revive = Math.max(0, (run.revive || 0) - 1);
  run.rescue = { ...snapshotRescue(G), kind: 'revive' };
}

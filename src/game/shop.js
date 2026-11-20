import { zoneIdx } from '../data/zones.js';
import { isBossLevel } from './mechanics.js';
import { snapshotRescue } from './heroes.js';
import { byPath } from '../engine/difficulty.js';

import { shopDiscount } from './routes.js';
import { relicFor } from './relics.js';

import { baseScore } from '../engine/scoring.js';

/** Los precios se descuentan del puntaje y escalan con los puntos base del tablero. */
const PATH_PRICE = { 1: 1, 50: 1.15, 75: 1.3 };
export const pathPrice = (start = 1) => byPath(PATH_PRICE, start);
/** Revivir al caer (fuera de tienda): cuesta 33 % de tus puntos actuales (20 % con la Bolsa mercante) y solo 1 vez por partida. */
export const REVIVE_SHARE = 0.33;
/** Parte de los puntos que cuesta revivir en esta partida. */
export const reviveShare = (run) => relicFor(run)?.revive ?? REVIVE_SHARE;
export const MAX_REVIVES = 1;

export const SHOP_ITEMS = [
  { id: 'hint', icon: 'hint', name: 'Pista', levels: 0.6, detail: 'Una pista que te enseña el mejor movimiento.' },
  {
    id: 'moves3',
    icon: 'hourglass',
    name: 'Turnos extra',
    levels: 1,
    share: 0.06,
    min: 2,
    detail: 'Más turnos para este tablero.',
  },
  {
    id: 'moves',
    icon: 'hourglass',
    name: 'Muchos turnos extra',
    levels: 1.8,
    share: 0.15,
    min: 4,
    detail: 'Bastantes más turnos para este tablero.',
  },
  {
    id: 'redo',
    icon: 'rewind',
    name: 'Rehacer tablero',
    levels: 1,
    detail: 'Empieza este tablero de cero con 0 movimientos (conservas los turnos comprados). Una vez por tablero.',
  },
  {
    id: 'skip',
    icon: 'skip',
    name: 'Saltar nivel',
    levels: 4,
    detail: 'Pasa al siguiente nivel sin puntos y sin racha.',
  },
];

export const itemById = (id) => SHOP_ITEMS.find((i) => i.id === id);

/** Precio en puntos de un objeto: niveles × valor de un nivel de esa dificultad × camino (redondeado a la decena). */
export const priceOf = (id, rating = 1, start = 1, run = null) => {
  const normal = Math.round((itemById(id).levels * baseScore(rating) * pathPrice(start)) / 10) * 10;
  const discountBasisPoints = Math.round(shopDiscount(run) * 10000);
  return Math.round((normal * (10000 - discountBasisPoints)) / 10000);
};

/** Turnos que da un objeto de turnos sobre el límite actual del tablero (0 si no es de turnos). */
export const extraTurns = (id, limit) => {
  const item = itemById(id);
  return item?.share ? Math.max(item.min, Math.round(limit * item.share)) : 0;
};

/** Una lección y el tablero que le sigue pueden compartir el número de nivel. */
export const shopBoardKey = (G) => (G.tutorial ? `${G.n}:${G.tutorial}` : G.n);

/** ¿Se puede usar el objeto ahora mismo? (reason = por qué no) */
export function availability(id, { run, G }) {
  if (!run || !G || G.done) return { ok: false, reason: 'No hay un tablero en juego.' };
  if (run.mode === 'p') return { ok: false, reason: 'En Práctica todo es gratis.' };
  if (id === 'hint' && run.hintPurchaseBoard === shopBoardKey(G)) {
    return { ok: false, reason: 'Ya compraste una pista para este tablero.' };
  }
  if (itemById(id).share && (run.turnPackBoard === shopBoardKey(G) || G.bought > 0)) {
    return { ok: false, reason: 'Ya compraste turnos para este tablero.' };
  }
  if (id === 'skip') {
    if (isBossLevel(G.n)) return { ok: false, reason: 'Los jefes no se pueden saltar.' };
    if (run.lastSkipZone === zoneIdx(G.n)) return { ok: false, reason: 'Ya usaste el salto de esta ciudad.' };
  }
  if (id === 'redo' && run.redoBoard === shopBoardKey(G)) return { ok: false, reason: 'Ya rehiciste este tablero.' };
  if (id === 'redo' && !G.moves) return { ok: false, reason: 'Aún no has movido nada.' };
  const price = priceOf(id, G.rate, run.start, run);
  if ((run.score || 0) < price) return { ok: false, reason: 'No te alcanzan los puntos.', price };
  return { ok: true, price };
}

/**
 * Compra un objeto: descuenta los puntos y aplica el efecto sobre `run` y `G`.
 * Devuelve {ok, price, reason}. El salto de nivel solo cobra; avanzar lo hace la interfaz.
 */
export function buy(id, { run, G }) {
  const a = availability(id, { run, G });
  if (!a.ok) return a;
  run.score -= a.price;
  run.spent = (run.spent || 0) + a.price;
  const item = itemById(id);
  if (id === 'hint') {
    run.hints = (run.hints || 0) + 1;
    run.hintPurchaseBoard = shopBoardKey(G);
  } else if (id === 'skip') run.lastSkipZone = zoneIdx(G.n);
  else if (item?.share) {
    const moves = extraTurns(id, G.limit);
    G.limit += moves;
    run.turnPackBoard = shopBoardKey(G);
    G.bought = moves; // turnos comprados: se muestran congelados y se «derriten» al usarse
  } else if (id === 'redo') {
    run.redoBoard = shopBoardKey(G);
    G.pos = G.start.slice();
    G.hist = [];
    G.moves = 0;
  }
  return { ok: true, price: a.price };
}

/** Costo en puntos (33 %, o 20 % con la Bolsa) de revivir tras perder con `score` puntos actuales. */
export const reviveCost = (score = 0, run = null) => Math.round(Math.max(0, score || 0) * reviveShare(run));

/** ¿Puede revivir pagando el 33 % de sus puntos actuales? (una sola vez por aventura, nunca en Práctica). */
export const canPaidRevive = (run, mode = run?.mode) =>
  !!run && mode !== 'p' && (run.revivesBought || 0) < MAX_REVIVES && reviveCost(run.score, run) > 0;

/** Cobra el 33 % de los puntos actuales y marca el único revivir de la partida. */
export function payRevive(run) {
  if (!canPaidRevive(run)) return { ok: false, cost: 0 };
  const cost = reviveCost(run.score, run);
  run.score -= cost;
  run.spent = (run.spent || 0) + cost;
  run.revivesBought = (run.revivesBought || 0) + 1;
  return { ok: true, cost };
}

export const FREE_RETRY_UNTIL = 9;
export const BOSS_FREE_RETRIES = 2;

/** Cada jefe tiene su propio cupo de reintentos en esta aventura. */
export function bossRetriesLeft(run, level) {
  if (!run || run.daily || run.mode === 'p' || !isBossLevel(level)) return 0;
  const used = run.bossRetry?.level === level ? run.bossRetry.used || 0 : 0;
  return Math.max(0, BOSS_FREE_RETRIES - used);
}

export function freeRetry(run, level, boss = false) {
  if (boss) return bossRetriesLeft(run, level) > 0;
  return !!run && !run.daily && run.mode !== 'p' && (run.start || 1) === 1 && level <= FREE_RETRY_UNTIL;
}

/** Prepara el mismo tablero para repetirlo sin coste. La derrota corta la racha de la aventura. */
export function useFreeRetry(run, G, why) {
  const boss = !!G.plan?.boss && !G.tutorial;
  if (!freeRetry(run, G.n, boss)) return false;
  const snapshot = snapshotRescue(G);
  if (boss) {
    const used = BOSS_FREE_RETRIES - bossRetriesLeft(run, G.n);
    run.bossRetry = { level: G.n, used: used + 1 };
  }
  run.streak = 0;
  run.rescue = boss ? { ...snapshot, kind: 'boss', why } : { ...snapshot, kind: 'learn' };
  return true;
}

/** ¿Tienes un revivir guardado? (compatibilidad con partidas guardadas antiguas). */
export const hasRevive = (run) => (run?.revive || 0) > 0;

/** Gasta un revivir guardado y prepara el tablero para repetirlo desde el principio. */
export function useRevive(run, G) {
  run.revive = Math.max(0, (run.revive || 0) - 1);
  run.rescue = { ...snapshotRescue(G), kind: 'revive' };
}

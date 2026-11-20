/**
 * Héroes y poderes. Los datos (nombre, texto) y las reglas viven juntos aquí; las reglas son
 * funciones puras sobre el objeto `run` (la aventura en curso), sin DOM, y están cubiertas por tests.
 */
import { moveLimit, byPath } from '../engine/difficulty.js';
import { HEROIC_BENEFITS, heroicHintsLeft, heroicPowerFactor, useHeroicHint } from './routes.js';

/* Ojo: el identificador interno de Juth sigue siendo 'van' (imágenes heroes/van*.webp y partidas guardadas). Solo cambia el nombre que se ve. */
export const HEROES = [
  {
    id: 'lia',
    name: 'Lía',
    role: 'Portadora de la Brasa',
    icon: 'heart',
    color: '#68d8bd',
    power: 'Turnos de reserva',
    short: 'Más turnos en cada tablero',
    detail:
      'Cada tablero te da turnos extra (alrededor de un tercio del mínimo necesario; algo menos en los caminos difíciles) para perdonar los errores pequeños sin quitarte el reto.',
    quote: '«Incluso la ceniza recuerda el calor.»',
  },
  {
    id: 'jean',
    name: 'Jean',
    role: 'Vigía del Péndulo',
    icon: 'clock',
    color: '#8fb9ff',
    power: 'Rebobinar',
    short: 'Retrocede varios movimientos',
    detail:
      'Una vez por tablero (dos en los tableros largos), devuelve las piezas y los turnos cerca de un tercio de tus movimientos (mínimo tres). Si llevas menos, regresas al inicio.',
    quote: '«Todo error deja una grieta por donde volver.»',
  },
  {
    id: 'van',
    name: 'Juth',
    role: 'Escriba de las Runas',
    icon: 'stars',
    color: '#c5a2ff',
    power: 'Trazar destino',
    short: 'Ejecuta movimientos óptimos',
    detail:
      'Una vez por tablero, las runas mueven las piezas hacia la salida, cerca de un cuarto de los pasos que faltan (nunca el último). Consume turnos y requiere al menos cuatro pasos pendientes.',
    quote: '«Lo que no se nombra sigue buscando salida.»',
  },
];

export const heroById = (id) => HEROES.find((h) => h.id === id) || HEROES[0];

export const CITY_EVERY = 10; // niveles por ciudad
/** Cada cuántos niveles se gana una pista: Normal 5, Difícil 6, Experto 8 (cuanto más difícil el camino, más escasas). */
const HINT_EVERY_BY_PATH = { 1: 5, 50: 6, 75: 8 };
export const hintEvery = (start = 1) => byPath(HINT_EVERY_BY_PATH, start);

const isPractice = (mode) => mode === 'p';

/* ───────────── Lía: turnos de reserva (un % más de turnos en cada tablero) ───────────── */

/** +40 % del mínimo de movimientos del tablero en Normal, 20 % en Difícil y 25 % en Experto (su terreno: donde el límite aprieta). */
const LIA_TURNS_SHARE = { 1: 0.4, 50: 0.2, 75: 0.25 };
const LIA_MIN_TURNS = 1;

/** En los jefes la reserva de Lía se reduce a la mitad: si no, el límite de turnos ajustado de un jefe no apretaría nunca. */
export const BOSS_RESERVE = 0.5;
/** Turnos extra que da el héroe sobre el límite base (solo Lía): una parte del mínimo `opt` del tablero según el camino. */
export const bonusTurns = (heroId, opt, boss = false, power = 1, start = 1) => {
  if (heroId !== 'lia') return 0;
  const share = byPath(LIA_TURNS_SHARE, start);
  return Math.max(LIA_MIN_TURNS, Math.round(opt * share * power * (boss ? BOSS_RESERVE : 1)));
};

/** Lía pierde parte del margen base en la Brasa y conserva su reserva personal. */
export function heroBaseLimit(hero, opt, start, level, heroic, boss) {
  const base = moveLimit(opt, start, level, false, boss);
  if (!heroic || hero !== 'lia') return base;
  return opt + Math.min(base - opt - 1, Math.round((base - opt) * HEROIC_BENEFITS.liaMargin));
}

/** Límite de movimientos de un tablero de mínimo `opt` para ese héroe, camino y jefe. */
export const heroLimit = (heroId, opt, start = 1, level = 1, brave = false, boss = false) =>
  heroBaseLimit(heroId, opt, start, level, brave, boss) +
  bonusTurns(heroId, opt, boss, heroicPowerFactor(heroId, brave), start);

/** Foto del tablero para repetirlo desde el principio con 0 movimientos (la usa el revivir). */
export function snapshotRescue(G) {
  return {
    level: G.n,
    rate: G.rate,
    pieces: G.pieces.map((p) => ({ ...p })),
    walls: (G.walls || []).map((w) => w.slice()),
    start: G.start.slice(),
    opt: G.opt,
    limit: G.limit - (G.bought || 0),
    seal: G.seal ? { ...G.seal, cell: G.seal.cell.slice() } : null,
    family: G.family,
  };
}

/* ───────────── Pistas: reserva de todos + pistas del camino heroico de Lía ───────────── */

/**
 * Gasta primero una pista gratuita del camino heroico de Lía; después, la reserva.
 * El poder de Juth es independiente de las pistas.
 * Devuelve {ok, free}. (ok=false si no hay ninguna.) En Práctica no gasta nada.
 */
export function spendHint({ run, mode, level }) {
  if (isPractice(mode)) return { ok: true, free: true };
  if (useHeroicHint(run, level)) return { ok: true, free: true };
  if ((run.hints || 0) > 0) {
    run.hints--;
    return { ok: true, free: false };
  }
  return { ok: false, free: false };
}

/** ¿Se puede pedir una pista ahora? (gratis o de la reserva) */
export const canHint = (run, mode, level) =>
  isPractice(mode) || heroicHintsLeft(run, level) > 0 || (run?.hints || 0) > 0;

/**
 * Pistas ganadas al completar `level`; suma a run.hints y devuelve cuántas.
 * Todos los héroes: +1 cada 5 niveles.
 */
export function clearRewards(run, level) {
  const gained = level % hintEvery(run?.start) === 0 ? 1 : 0;
  run.hints = (run.hints || 0) + gained;
  return gained;
}

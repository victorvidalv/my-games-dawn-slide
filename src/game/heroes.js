/**
 * Héroes y poderes. Los datos (nombre, texto) y las reglas viven juntos aquí; las reglas son
 * funciones puras sobre el objeto `run` (la aventura en curso), sin DOM, y están cubiertas por tests.
 */
import { moveLimit, byPath } from '../engine/difficulty.js';
import { heroicHintsLeft, useHeroicHint } from './routes.js';

/* Ojo: el identificador interno de Juth sigue siendo 'van' (imágenes heroes/van*.webp y partidas guardadas). Solo cambia el nombre que se ve. */
export const HEROES = [
  { id: 'lia', name: 'Lía', role: 'Portadora de la Brasa', icon: 'heart', color: '#68d8bd', power: 'Turnos de reserva', short: 'Más turnos en cada tablero', detail: 'Cada tablero te da un margen extra de turnos para perdonar los errores pequeños sin quitarte el reto.', quote: '«Incluso la ceniza recuerda el calor.»' },
  { id: 'jean', name: 'Jean', role: 'Vigía del Péndulo', icon: 'clock', color: '#8fb9ff', power: 'Rebobinar', short: 'Retrocede varios movimientos', detail: 'Una vez por tablero, devuelve las piezas y los turnos unos movimientos atrás (más cuanto más difícil el camino). Si llevas menos, regresas al inicio.', quote: '«Todo error deja una grieta por donde volver.»' },
  { id: 'van', name: 'Juth', role: 'Escriba de las Runas', icon: 'stars', color: '#c5a2ff', power: 'Trazar destino', short: 'Ejecuta movimientos óptimos', detail: 'Una vez por tablero, las runas mueven las piezas unos pasos hacia la salida (nunca el último). Consume turnos y requiere varios pasos pendientes.', quote: '«Lo que no se nombra sigue buscando salida.»' },
];

export const heroById = (id) => HEROES.find((h) => h.id === id) || HEROES[0];

/** Qué parte de su reserva de turnos conserva Lía en cada camino: Normal 100 %, Difícil 55 %, Experto 35 %. */
const POWER_SCALE = { 1: 1, 50: 0.55, 75: 0.35 };
export const powerScale = (start = 1) => byPath(POWER_SCALE, start);

export const CITY_EVERY = 10; // niveles por ciudad
/** Cada cuántos niveles se gana una pista: Normal 5, Difícil 6, Experto 8 (cuanto más difícil el camino, más escasas). */
const HINT_EVERY_BY_PATH = { 1: 5, 50: 6, 75: 8 };
export const hintEvery = (start = 1) => byPath(HINT_EVERY_BY_PATH, start);

const isPractice = (mode) => mode === 'p';

/* ───────────── Lía: turnos de reserva (un % más de turnos en cada tablero) ───────────── */

const LIA_TURNS_SHARE = 0.25; // +23 % del límite de movimientos (calibrado con npm run simulate)
const LIA_MIN_TURNS = 2;     // y como mínimo 2 turnos

/** Turnos extra que da el héroe sobre un límite base (solo Lía). */
/** En los jefes la reserva de Lía se reduce a la mitad: si no, el límite de turnos ajustado de un jefe no apretaría nunca. */
export const BOSS_RESERVE = 0.5;
export const bonusTurns = (heroId, baseLimit, start = 1, boss = false) => {
  if (heroId !== 'lia') return 0;
  const k = powerScale(start) * (boss ? BOSS_RESERVE : 1);
  return Math.max(Math.max(1, Math.round(LIA_MIN_TURNS * k)), Math.round(baseLimit * LIA_TURNS_SHARE * k));
};

/** Límite de movimientos de un tablero de mínimo `opt` para ese héroe, camino y jefe. */
export const heroLimit = (heroId, opt, start = 1, level = 1, brave = false, boss = false) => {
  const base = moveLimit(opt, start, level, brave, boss);
  return base + bonusTurns(heroId, base, start, boss);
};

/** Foto del tablero para repetirlo desde el principio con 0 movimientos (la usa el revivir). */
export function snapshotRescue(G) {
  return {
    level: G.n,
    rate: G.rate,
    pieces: G.pieces.map((p) => ({ ...p })),
    walls: (G.walls || []).map((w) => w.slice()),
    doors: (G.doors || []).map((d) => d.slice()),
    start: G.start.slice(),
    opt: G.opt,
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
export const canHint = (run, mode, level) => isPractice(mode) || heroicHintsLeft(run, level) > 0 || (run?.hints || 0) > 0;

/**
 * Pistas ganadas al completar `level`; suma a run.hints y devuelve cuántas.
 * Todos los héroes: +1 cada 5 niveles.
 */
export function clearRewards(run, level) {
  const gained = level % hintEvery(run?.start) === 0 ? 1 : 0;
  run.hints = (run.hints || 0) + gained;
  return gained;
}

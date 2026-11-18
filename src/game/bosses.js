import { isBossLevel, levelPlan } from './mechanics.js';

/**
 * Los 10 guardianes de Vhorn al final de cada ciudad (niveles 10, 20, ..., 100).
 * Cada encuentro combina un tablero más exigente, una REGLA de presión propia (turnos ajustados, contrarreloj o ambas),
 * +30 % de puntos, una ilustración, un color de fase y una introducción antes de mover la primera pieza.
 *   (las piezas especiales de cada tablero las decide el calibrador: ver `bossMechLabel`)
 *   art    – ilustración en `public/jefes/<art>.jpg` (si falta, se usa `sentinel`)
 *   color  – [color principal, color secundario] de la fase: aura, destellos, vignette y resplandor del tablero
 */
export const BOSSES = {
  10: {
    city: 0, art: 'sentinel', color: ['#7fc9a4', '#d9f2c7'],
    name: 'El Vigía de la Bruma',
    title: 'Guardián del Primer Umbral',
    lore: '«Nadie cruza la niebla mientras mis piedras sigan en pie.»',
  },
  20: {
    city: 1, art: 'keeper', color: ['#5fb4d8', '#cdeeff'],
    name: 'El Farero Ciego',
    title: 'Guardián del Puerto Oscuro',
    lore: '«Cada bloque pesa como una nave anclada sin marea.»',
  },
  30: {
    city: 2, art: 'jailer', color: ['#e0a548', '#ffe2a8'],
    name: 'El Carcelero de Duna',
    title: 'Guardián de las Arenas',
    lore: '«Bajo la sal ningún cerrojo cede sin su tributo.»',
  },
  40: {
    city: 3, art: 'dusk', color: ['#e07a3c', '#ffd0a0'],
    name: 'La Dama del Ocaso',
    title: 'Guardián del Bosque Caído',
    lore: '«Un paso en falso y el hielo te lleva hasta el borde.»',
  },
  50: {
    city: 4, art: 'warden', color: ['#d8b24a', '#fff0b0'],
    name: 'El Maestro Relojero',
    title: 'Guardián de la Torre Parada',
    lore: '«Solo la gema exacta cruza el portón de su propia hora.»',
  },
  60: {
    city: 5, art: 'judge', color: ['#7ad6ff', '#e4f8ff'],
    name: 'El Juez de Escarcha',
    title: 'Guardián del Paso Helado',
    lore: '«Aquí los portones y la escarcha dictan un solo camino.»',
  },
  70: {
    city: 6, art: 'weaver', color: ['#e08aa8', '#ffd9e6'],
    name: 'El Tejedor de Cerezos',
    title: 'Guardián del Jardín Mudo',
    lore: '«Cada pétalo suspendido esconde dos mecanismos a la vez.»',
  },
  80: {
    city: 7, art: 'forger', color: ['#ff7a2f', '#ffd27a'],
    name: 'El Forjador de Ceniza',
    title: 'Guardián de la Fragua Fría',
    lore: '«Ni el hierro ni el color te abrirán paso si dudas.»',
  },
  90: {
    city: 8, art: 'scribe', color: ['#8a8cff', '#dcdcff'],
    name: 'El Escriba del Olvido',
    title: 'Guardián del Archivo Borrado',
    lore: '«Cuatro pruebas guardan el nombre que el mundo olvidó.»',
  },
  100: {
    city: 9, art: 'sovereign', color: ['#b06cff', '#f2d8ff'],
    name: 'Vhorn, la Sombra del Faro',
    title: 'Guardián del Último Umbral',
    lore: '«Si pronuncias mi nombre con tu último turno, el alba volverá.»',
  },
};

/** Dificultad del tablero de un jefe: sus turnos mínimos ya vienen calibrados (jefe = +2 sobre los vecinos), no hay suelo aparte. */
export const bossRating = (_level, rate) => rate;

/**
 * Regla de presión de cada jefe (se alternan para que cada duelo se sienta distinto):
 *   turns – límite de turnos más ajustado: `cap` = tope del factor del límite (como mucho mínimo × cap; más bajo = menos margen)
 *   time  – contrarreloj de `seconds` segundos, con turnos algo más holgados
 *   both  – las dos a la vez (los jefes finales)
 * El tiempo solo corre mientras puedes mover: se detiene en pausa, tienda, poderes, avisos y ventanas.
 */
export const BOSS_RULES = {
  10: { kind: 'turns', cap: 1.25 },
  20: { kind: 'time', cap: 1.6, seconds: 180 },
  30: { kind: 'turns', cap: 1.1 },
  40: { kind: 'time', cap: 1.6, seconds: 120 },
  50: { kind: 'time', cap: 1.6, seconds: 120 },
  60: { kind: 'turns', cap: 1.05 },
  70: { kind: 'time', cap: 1.6, seconds: 120 },
  80: { kind: 'turns', cap: 1.05 },
  90: { kind: 'both', cap: 1.1, seconds: 120 },
  100: { kind: 'both', cap: 1.17, seconds: 120 },
};

export const bossFor = (level) => (isBossLevel(level) ? BOSSES[level] || null : null);
export const bossRule = (level) => (isBossLevel(level) ? BOSS_RULES[level] || { kind: 'turns', cap: 1.3 } : null);
/** Tope del factor del límite de turnos del jefe (para `moveLimit`/`heroLimit`), o false si el nivel no es un jefe. */
export const bossCapFor = (level) => bossRule(level)?.cap ?? false;
/** Tiempo «razonable» (segundos) de un tablero de mínimo `opt`: lo que tarda un jugador medio con margen. Crece más que lineal con el largo. */
export const reasonableSeconds = (opt) => opt * (1.75 + 0.07 * opt);
/** Segundos de la contrarreloj del jefe para un tablero de mínimo `opt` (0 = sin contrarreloj). */
export function bossTimeFor(level, opt, rule = bossRule(level)) {
  if (!rule || rule.kind === 'turns') return 0;
  // El simulador también puede probar un multiplicador para calibrar tiempos futuros.
  return rule.seconds ?? Math.max(60, Math.round((20 + rule.mult * reasonableSeconds(opt)) / 5) * 5);
}
/** Cuántas piezas especiales lleva el tablero del jefe (según el calibrador), dicho en una frase. */
export function bossMechLabel(level) {
  const n = levelPlan(level).mechanics.length;
  return ['Sin piezas especiales', 'Una pieza especial', 'Dos piezas especiales', 'Tres piezas especiales', 'Cuatro piezas especiales', 'Todas las piezas juntas'][n] ?? 'Todas las piezas juntas';
}
/** Texto de la regla (español, se traduce en pantalla). */
export function bossRuleLabel(level, seconds = 0) {
  const kind = bossRule(level)?.kind;
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  if (kind === 'time') return `Contrarreloj ${clock}`;
  if (kind === 'both') return `Contrarreloj ${clock} y turnos ajustados`;
  return 'Turnos ajustados';
}

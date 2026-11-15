import { mulberry32, hash32 } from '../engine/rng.js';
import { curve, rateAt, moveLimit, braveExtra, startHintsFor, MAX_LEVEL } from '../engine/difficulty.js';
import { calcGain } from '../engine/scoring.js';
import { hintEvery, CITY_EVERY, bonusTurns } from './heroes.js';
import { MAX_REVIVES, REVIVE_SHARE, priceOf, extraTurns } from './shop.js';
import { rewindSteps as pathRewindSteps, DESTINY_STEPS, JUTH_MIN_REMAINING, powerReady } from './powers.js';
import { HEROIC_BENEFITS } from './routes.js';
import { SEAL_LEVELS, maxSealDetour, requestedSealTier, sealPoints } from './seals.js';
import { bonusPrize, isBonusLevel } from './minigames.js';

/**
 * Modelo de equilibrio: simula miles de partidas de jugadores de distinta habilidad para medir cómo se comportan la dificultad
 * de cada camino, los poderes de los héroes, el camino heroico, los sellos, la tienda y el revivir. NO es el juego real: es un
 * modelo simple y determinista con el que COMPARAR opciones entre sí. Lo que importa es la comparación, no los números absolutos.
 *
 * Modelo de un tablero con mínimo d: el jugador da d movimientos correctos; en cada uno se equivoca con probabilidad
 * err = (1 − habilidad) · MODEL.err · (1 + d/25). Un error son k movimientos erróneos (k ≥ 1, media 2); cada uno cuesta 2
 * movimientos (el movimiento y deshacerlo). Solo te das cuenta a tiempo con probabilidad MODEL.notice; si no, cuesta
 * MODEL.unnoticedCost. Una pista evita el error entero (y se gasta); se guardan para tableros duros (d ≥ MODEL.hintMinD).
 * Se pierde al agotar los turnos sin llegar a la salida. Poderes (una vez por tablero, como en el juego):
 *   Lía  – turnos de reserva (más límite) y, en su camino heroico, 1 pista gratis cada dos tableros;
 *   Jean – Rebobinar: devuelve hasta 5 movimientos (borra el primer error del tablero, hasta 5 movimientos erróneos);
 *   Juth – Trazar destino: 3 movimientos óptimos (si quedan más de 3 pasos y 3 turnos): sin error en esos 3 pasos.
 * Sellos (cada 3-4 niveles desde el 5): el jugador hábil rodea un poco para recogerlos y cobra puntos extra.
 * Minijuegos (niveles 15, 25…): pistas según habilidad, con el premio máximo proporcional al nivel.
 */
const MODEL = {
  err: 0.07,
  notice: 0.7,           // probabilidad de darte cuenta de que un movimiento fue un error y deshacerlo enseguida
  hintAware: 0.65,       // probabilidad de pedir la pista A TIEMPO (antes de equivocarte): una pista solo ayuda si la pides
  unnoticedCost: 3,      // si no te das cuenta, recuperarte cuesta ~3 movimientos
  hintMinD: 10,
  startHints: 3,
  shopReserve: 3,        // el jugador solo compra una pista si le quedan puntos para 3 más (no se arruina por ella)
  sealSkill: [0.4, 0.58, 0.72],   // habilidad mínima para ir a por un sello de bronce / plata / oro
};

/** El sello de un nivel según el modelo: el tipo que pide el calendario (limitado por lo que cabe en el tablero) y su rodeo en movimientos. */
function sealPlan(level, d, seed = 0) {
  const maxD = maxSealDetour(d);
  let tier = requestedSealTier(level, seed);
  if (tier === 3 && maxD < 4) tier = 2;
  const extra = tier === 1 ? 1 : tier === 2 ? Math.min(maxD, 2 + (hash32(seed, level, 9) % 2)) : Math.min(maxD, 4 + (hash32(seed, level, 9) % 3));
  return { tier, extra };
}


/** Parte del premio del minijuego (0-3) según la habilidad: los juegos son sencillos y previsibles. */
const minigamePart = (skill, u) => (u < 0.08 + 0.42 * skill ? 3 : u < 0.5 + 0.4 * skill ? 2 : u < 0.9 ? 1 : 0);

/**
 * Jugador que usa la tienda (`shop = {score, rating}`): al quedarse sin turnos compra los turnos más baratos que le alcancen,
 * y si no le quedan pistas en un tablero duro compra una, pero solo si le sobran puntos (MODEL.shopReserve veces el precio).
 */
function playBoard(rng, { hero, skill, d, start = 1, level = 1, hints, shop = null, brave = false, seal = false, powers = {} }) {
  const heroic = brave;
  const rewindSteps = powers.rewindSteps ?? pathRewindSteps(start) + (heroic && hero === 'jean' ? HEROIC_BENEFITS.jeanRewind : 0);
  const destinySteps = powers.destinySteps ?? (heroic && hero === 'van' ? HEROIC_BENEFITS.juthDestiny : DESTINY_STEPS);   // camino heroico de Juth: Destino más largo
  const baseLimit = moveLimit(d, start, level, brave);
  let limit = baseLimit + (powers.liaTurns && hero === 'lia' ? Math.max(1, Math.round(baseLimit * powers.liaTurns * (powers.liaScale?.[start] ?? 1))) : bonusTurns(hero, baseLimit, start));
  let extra = 0;
  if (seal) {                                                  // rodeo para recoger el sello: más movimientos y, si hace falta, más límite
    extra = seal.extra;
    limit = Math.max(limit, d + extra + 1);
  }
  const need = d + extra;                                      // pasos óptimos que va a dar
  let spent = 0;
  let boughtTurns = 0;
  let boughtHints = 0;
  const priceRun = { mode: 'c', hero, route: heroic ? 'brave' : 'normal' };
  const afford = (id, reserve = 1) => shop && shop.score - spent >= priceOf(id, shop.rating, start, priceRun) * reserve;
  const pay = (id) => { spent += priceOf(id, shop.rating, start, priceRun); };
  const err = Math.min(0.85, (1 - skill) * MODEL.err * (1 + need / 25));
  let moves = 0;
  let h = hints;
  let f = heroic && hero === 'lia' && level % HEROIC_BENEFITS.liaEvery === 0 ? HEROIC_BENEFITS.liaHints : 0;   // pistas gratis de ESTE tablero (camino heroico de Lía)
  const ready = powerReady(level, start);                      // en los caminos difíciles los poderes descansan en algunos tableros
  let rewind = hero === 'jean' && ready;                       // una vez por tablero
  let destiny = hero === 'van' && ready;
  let safe = 0;                                                // pasos protegidos por «Trazar destino»
  for (let step = 0; step < need; step++) {
    if (safe > 0) safe--;
    else if (rng() < err) {
      if (h === 0 && f === 0 && need >= MODEL.hintMinD && afford('hint', MODEL.shopReserve)) { pay('hint'); h++; boughtHints++; }
      if (f > 0 && rng() < MODEL.hintAware) {
        f--;                                                   // pista gratis del tablero: evita el error
      } else if (h > 0 && need >= MODEL.hintMinD && rng() < MODEL.hintAware) {
        h--;                                                   // la pista evita el error
      } else if (destiny && need - step > (powers.juthMin ?? JUTH_MIN_REMAINING) && limit - moves >= Math.min(destinySteps, need - step - 1)) {
        destiny = false;                                       // Juth traza el destino: hasta tres pasos sin error (nunca el último: deja siempre uno al jugador)
        safe = Math.min(destinySteps, need - step - 1) - 1;
      } else {
        const k = 1 + Math.floor(Math.log(1 - rng()) / Math.log(0.5)); // 1 + geométrica (media 2)
        let waste = 0;
        for (let j = 0; j < k; j++) waste += rng() >= MODEL.notice ? MODEL.unnoticedCost : 2;
        if (rewind) { rewind = false; waste = Math.max(0, waste - 2 * rewindSteps); }   // Jean rebobina hasta 5 movimientos erróneos
        moves += waste;
      }
    }
    moves += 1;
    const dead = () => moves > limit || (moves >= limit && step < need - 1);
    while (dead()) {
      const id = ['moves3', 'moves'].find((x) => afford(x));      // lo más barato que alcance
      if (!id) break;
      pay(id);
      limit += extraTurns(id, limit);
      boughtTurns++;
    }
    if (dead()) return { ok: false, moves, hints: h, spent, boughtTurns, boughtHints, extra };
  }
  return { ok: true, moves, hints: h, spent, boughtTurns, boughtHints, extra };
}

/**
 * Simula UNA partida de 100 niveles.
 * @param {object} o
 * @param {string} o.hero        'none' | 'lia' | 'jean' | 'van'
 * @param {number} o.start       dificultad inicial del camino (1, 50, 75)
 * @param {number} o.skill       habilidad 0-1
 * @param {number} o.seed
 * @param {string} [o.revive]    'none' | 'city': comprar un revivir al empezar cada ciudad (desde la 3ª) mientras queden
 * @param {boolean} [o.shop]     el jugador usa la tienda
 * @param {string} [o.route]     'normal' | 'brave' (camino heroico: tablero más largo, límite más estricto y la ventaja de su héroe)
 * @returns {{cleared:number, score:number, completed:boolean, revivesBought:number}}
 */
export function simulateRun({ hero, start, skill, seed, revive = 'none', shop = false, route = 'normal', seals = true, powers = {} }) {
  const rng = mulberry32(seed);
  const heroic = route === 'brave';
  let hints = startHintsFor(start);
  let score = 0;
  let streak = 0;
  let adj = 0;
  let charges = 0;
  let bought = 0;
  let spentTotal = 0;
  let turnsBought = 0;
  let hintsBought = 0;
  let sealPts = 0;
  for (let level = 1; level <= MAX_LEVEL; level++) {
    if (revive === 'city' && level % CITY_EVERY === 1 && level > 20 && bought < MAX_REVIVES && score > 0) {
      score -= Math.round(score * REVIVE_SHARE);
      charges++;
      bought++;
    }
    const rating = rateAt(start, level);
    const d0 = Math.max(1, curve(rating).target + adj);
    const d = heroic ? d0 + braveExtra(d0) : d0;
    const seal = seals && SEAL_LEVELS.includes(level) ? sealPlan(level, d, seed) : null;
    const goForSeal = seal && (powers.sealOnly ? seal.tier === powers.sealOnly : skill >= MODEL.sealSkill[seal.tier - 1]);
    let res;
    for (;;) {
      res = playBoard(rng, { hero, skill, d, start, level, brave: heroic, hints, shop: shop ? { score, rating } : null, seal: goForSeal ? seal : null, powers });
      hints = res.hints;
      score -= res.spent;
      spentTotal += res.spent;
      turnsBought += res.boughtTurns;
      hintsBought += res.boughtHints;
      if (res.ok) break;
      if (charges > 0) { charges--; continue; }
      return { cleared: level - 1, score, completed: false, revivesBought: bought, spent: spentTotal, turnsBought, hintsBought, sealPts };
    }
    const gain = calcGain(rating, res.moves, d, streak);
    const bonus = heroic ? HEROIC_BENEFITS.points + (hero === 'jean' ? HEROIC_BENEFITS.jeanPoints : 0) : 0;   // camino heroico: más puntos (más aún Jean)
    score += gain.total + Math.round(gain.total * bonus);
    if (goForSeal) {                                           // sello recogido: puntos extra (con el bono heroico)
      const pts = Math.round(sealPoints(rating, d, d + res.extra, seal.tier) * (1 + bonus));
      score += pts;
      sealPts += pts;
    }
    streak = gain.eff >= 0.9 ? streak + 1 : 0;
    adj = Math.max(-2, Math.min(level < 10 ? 1 : 2, adj + (gain.eff >= 0.9 ? 1 : gain.eff < 0.4 ? -1 : 0)));
    const rate = powers.hintMult?.[hero] ?? 1;                 // ritmo de pistas propio de cada héroe (Juth las encuentra más a menudo)
    if (Math.floor((level * rate) / hintEvery(start)) > Math.floor(((level - 1) * rate) / hintEvery(start))) hints++;
    if (isBonusLevel(level)) hints += bonusPrize(minigamePart(skill, rng()), level, start);
  }
  return { cleared: MAX_LEVEL, score, completed: true, revivesBought: bought, spent: spentTotal, turnsBought, hintsBought, sealPts };
}

/** Media de `runs` partidas (semillas deterministas) para una combinación héroe/camino/habilidad. */
export function averageRuns({ hero, start, skill, runs = 300, revive = 'none', salt = 0, shop = false, route = 'normal', seals = true, powers = {} }) {
  let cleared = 0;
  let score = 0;
  let spent = 0;
  let turns = 0;
  let hintsB = 0;
  let sealPts = 0;
  let done = 0;
  for (let i = 0; i < runs; i++) {
    // misma semilla para todos los héroes en la misma habilidad/camino: comparación justa (mismos «dados»)
    const r = simulateRun({ hero, start, skill, revive, shop, route, seals, powers, seed: hash32(i, start, Math.round(skill * 100), salt) });
    cleared += r.cleared;
    score += r.score;
    spent += r.spent;
    turns += r.turnsBought;
    hintsB += r.hintsBought;
    sealPts += r.sealPts;
    if (r.completed) done++;
  }
  return { cleared: cleared / runs, score: score / runs, completion: done / runs, spent: spent / runs, turnsBought: turns / runs, hintsBought: hintsB / runs, sealPts: sealPts / runs };
}

export const SKILLS = [0.4, 0.6, 0.8, 0.92];
export const PATHS = [1, 50, 75];

/** Tabla de ayuda: cuántos niveles extra aporta cada héroe frente a no tener poder, por camino y habilidad. */
export function balanceReport({ runs = 300, powers = {} } = {}) {
  const rows = [];
  for (const start of PATHS) {
    for (const skill of SKILLS) {
      const base = averageRuns({ hero: 'none', start, skill, runs, powers });
      const row = { start, skill, base: base.cleared };
      for (const hero of ['lia', 'jean', 'van']) {
        const r = averageRuns({ hero, start, skill, runs, powers });
        row[hero] = r.cleared - base.cleared;
        row[hero + 'Score'] = r.score - base.score;
      }
      rows.push(row);
    }
  }
  return rows;
}

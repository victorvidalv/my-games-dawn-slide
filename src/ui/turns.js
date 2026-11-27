import { reducedMotion } from './dom-utils.js';
import { sfx, tone, vib } from '../audio/sound.js';
import { $ } from '../dom.js';
import { isLow, isWon, movesLeft } from '../engine/rules.js';
import { S } from '../state.js';
import { bonusTurns } from '../game/heroes.js';
import { fateBlocks } from '../game/fate.js';
import { reserveState } from '../game/powers.js';
import { burst } from './fx.js';
import { freeRetry } from '../game/shop.js';

const center = (el) => {
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
};
const flash = (el, cls, ms) => {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
};

/** ¿Quedan pocos turnos (≈ 20 % o menos del límite)? `last` = es el último movimiento. */
export function lowState() {
  const G = S.G;
  const low = !!G && !!S.run && S.run.mode !== 'p' && !G.done && !isWon(G.pos) && isLow(G.moves, G.limit);
  return { low, last: low && movesLeft(G.moves, G.limit) === 1 };
}

/** Banner animado «quedan pocos turnos» (una vez al entrar en la zona de riesgo; vuelve a salir si deshaces y reentras). */
function announceLow(last) {
  const G = S.G;
  const left = movesLeft(G.moves, G.limit);
  const retry = freeRetry(S.run, G.n);
  $('lowTitle').textContent = last ? '¡Último movimiento!' : `Te quedan ${left} movimientos`;
  $('lowSub').textContent = last
    ? retry
      ? 'Si la llave no sale ahora, repites el tablero.'
      : 'Si la llave no sale ahora, la partida termina.'
    : retry
      ? 'Piensa bien cada paso: si se acaban, repites el tablero.'
      : 'Piensa bien cada paso: si se acaban, la partida termina.';
  $('lowBanner').classList.toggle('last', last);
  flash($('lowBanner'), 'show', 3000);
  flash($('meter'), 'low-hit', 600);
}

/**
 * Contador de turnos: «Restan N» y, si compraste turnos, una tira de cristales de hielo (uno por turno comprado).
 * Los cristales están congelados hasta que superas el límite original; entonces se van derritiendo uno a uno.
 */
/** Lía no tiene animación de poder: al entrar en su reserva aparece un aviso con brasas para que se note que se activó. */
function liaToast(left) {
  document.querySelectorAll('.power-toast').forEach((e) => e.remove());
  const t = document.createElement('div');
  t.className = 'power-toast';
  t.setAttribute('role', 'status');
  t.innerHTML = `<b>¡Brasa de Lía activada!</b><span>${left} turnos de reserva</span>`;
  document.body.appendChild(t);
  if (!reducedMotion()) {
    const [x, y] = center($('meter'));
    burst(x, y, 30, ['#f29f4b', '#ffcf6b', '#ff9a4a', '#fff'], 6);
  }
  vib([15, 25, 15]);
  setTimeout(() => t.remove(), 2400);
}
export function renderTurns() {
  const G = S.G;
  const bought = G.bought || 0;
  const reserve = bonusTurns(S.run.hero, G.opt, S.run.start, fateBlocks(S.run, 'power'));
  const segment = $('liaReserve'),
    label = $('liaReserveLabel');
  segment.hidden = label.hidden = !reserve;
  if (reserve) {
    const r = reserveState(G, reserve);
    segment.style.left = `${(r.start / G.limit) * 100}%`;
    segment.style.width = `${(reserve / G.limit) * 100}%`;
    segment.setAttribute('aria-label', `Reserva de Lía: ${r.left} de ${reserve} turnos`);
    label.textContent = `Brasa de Lía · ${r.left}/${reserve} turnos de reserva`;
    label.classList.toggle('active', G.moves >= r.start && r.left > 0);
    if (G.moves >= r.start && r.left > 0 && !G.reserveLit) {
      G.reserveLit = true;
      flash($('meter'), 'reserve-awaken', 800);
      liaToast(r.left);
      sfx.heroSig('lia');
    }
    if (G.moves < r.start) G.reserveLit = false;
  }
  const { low, last } = lowState();
  $('meter').classList.toggle('low', low);
  const chip = $('leftChip'),
    n = movesLeft(G.moves, G.limit); // contador fijo mientras dure el riesgo: «Quedan 3»
  chip.hidden = !low;
  chip.classList.toggle('last', last);
  if (low) {
    const text = n === 1 ? 'Queda 1' : `Quedan ${n}`;
    if (chip.textContent !== text) {
      chip.textContent = text;
      flash(chip, 'tick', 380);
    }
  }
  // El cartel sale al entrar en la zona de riesgo, otra vez cuando quedan exactamente 3 (si se entró antes) y en el último.
  if (!low) G.lowShown = 0;
  else if (!G.lowShown || (n === 3 && G.lowShown > 3) || (last && G.lowShown > 1)) {
    G.lowShown = n;
    announceLow(last);
  }
  const box = $('bought');
  box.hidden = !bought;
  if (!bought) {
    G.usedShown = 0;
    $('meter').style.setProperty('--bought', '0%');
    return;
  }
  const base = G.limit - bought;
  const used = Math.max(0, Math.min(bought, G.moves - base));
  const pips = $('boughtPips');
  if (pips.children.length !== bought) pips.innerHTML = '<i></i>'.repeat(bought);
  const shown = G.usedShown ?? 0;
  [...pips.children].forEach((p, k) => {
    p.classList.toggle('used', k < used);
    p.classList.toggle('melt', k < used && k >= shown);
  });
  $('boughtLeft').textContent = bought - used;
  $('meter').style.setProperty('--bought', `${((bought / G.limit) * 100).toFixed(1)}%`);
  box.classList.toggle('burning', used > 0 && used < bought);
  if (used > shown) {
    // se acaba de gastar un turno comprado
    flash(box, 'spend', 900);
    tone(1320, 0.18, 'sine', 0.08, 0, -500);
    tone(660, 0.25, 'triangle', 0.05, 0.08, -200);
    vib([15, 25, 15]);
    if (!reducedMotion()) {
      const [x, y] = center($('boughtPips'));
      burst(x, y, 14, ['#bfefff', '#7fd8ff', '#ffffff'], 4);
    }
    $('msg').textContent = `Usas un turno comprado. Quedan ${bought - used} de ${bought}.`;
  }
  G.usedShown = used;
}

/** Efecto destacado y simple al activar el poder de revivir: destello, onda expansiva y sonido épico. */
export function playReviveEffect(label = '¡PODER ACTIVADO!', hero = true) {
  const board = $('board');
  const fx = $('reviveFx');
  $('reviveFxLabel').textContent = label;
  fx.classList.toggle('is-hero', hero);
  board.classList.add('reviving');
  flash(fx, 'go', 1100);
  setTimeout(() => board.classList.remove('reviving'), 900);
  sfx.revive();
  vib([25, 35, 50]);
  if (!reducedMotion()) {
    const [x, y] = center(board);
    burst(
      x,
      y,
      48,
      hero ? ['#f29f4b', '#ffe29a', '#ffffff', '#f5a85a'] : ['#ffd98a', '#ff9c66', '#ffffff', '#f5b65c'],
      8,
    );
  }
}

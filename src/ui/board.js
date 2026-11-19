import { setTensionFx } from '../audio/music.js';
import { sfx, vib } from '../audio/sound.js';
import { isLocked, slideRange, snapDrag } from '../engine/board.js';
import { isLow, isWon, moveStatus, movesLeft } from '../engine/rules.js';
import { $ } from '../dom.js';
import { fail, saveRun, win } from '../game/session.js';
import { S, gainNow, pathOf, rkey, store } from '../state.js';
import { applyMove } from '../game/run-logic.js';
import { heroicPath, isHeroic } from '../game/routes.js';
import { icon } from './icons.js';
import { zoneIdx } from '../data/zones.js';
import { coachOnMove } from './coach.js';
import { updateHeroHud } from './heroes.js';
import { freeRetry } from '../game/shop.js';
import { lowState, renderTurns } from './turns.js';
import { renderSeal, processSealMove } from './seals.js';
import { numLocale } from '../i18n.js';
import { boardRotation, localDelta } from '../game/orientation.js';
import { hideCurse, showCurse } from './curse.js';
import { motes } from './fx.js';
export const boardEl = $('board'),
  cellPx = () => boardEl.clientWidth / 6;
/* Mide el espacio libre real y da al tablero el mayor tamaño posible (sin scroll) */
export function fitBoard() {
  const root = document.documentElement,
    app = $('app'),
    fr = document.querySelector('.frame'),
    cs = getComputedStyle(app);
  const padV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom),
    padH = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const framePad = 2 * parseFloat(getComputedStyle(fr).paddingLeft) || 28;
  const wide = matchMedia('(min-aspect-ratio: 13/10)').matches;
  for (let pass = 0; pass < 2; pass++) {
    // 2 pasadas: la altura del HUD depende del ancho
    let cell;
    if (wide) {
      const availH = innerHeight - padV - framePad - 8,
        availW = innerWidth - padH - framePad - 300 - 26;
      cell = Math.min(availH, availW) / 6;
    } else {
      const kids = [...app.children].filter((e) => e !== fr && getComputedStyle(e).display !== 'none');
      const gap = parseFloat(cs.rowGap) || 0,
        used = kids.reduce((s, e) => s + e.offsetHeight, 0) + gap * kids.length;
      const availH = innerHeight - padV - used - framePad - 4;
      const availW = Math.min(innerWidth, innerWidth >= 700 ? 760 : 520) - padH - framePad - 30; // 30px: flecha de salida
      cell = Math.min(availH, availW) / 6;
    }
    cell = Math.floor(Math.max(30, Math.min(cell, wide ? 150 : 120)));
    root.style.setProperty('--cell', cell + 'px');
  }
  layout();
  fitScore();
  app.style.overflowY = app.scrollHeight > app.clientHeight + 2 ? 'auto' : 'hidden'; // sin scroll accidental si todo cabe
}
addEventListener('resize', fitBoard);
addEventListener('orientationchange', () => setTimeout(fitBoard, 200));
if (window.visualViewport) visualViewport.addEventListener('resize', fitBoard);
const LOCK_SVG =
  '<svg class="lk shut" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="16" r="1.6" class="hole"/></svg>' +
  '<svg class="lk free" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/><circle cx="12" cy="16" r="1.6" class="hole"/></svg>';
const HEAVY_MARK =
  '<span class="mk heavy" title="Pesada: 1 casilla"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14.6" fill="#2b323a" stroke="#1c1208" stroke-width="1.4"/><circle cx="16" cy="16" r="12.6" fill="none" stroke="#f1e6c8" stroke-width="1.8"/><text x="16" y="19.6" text-anchor="middle" font-family="Georgia,serif" font-weight="900" font-size="17" fill="#fff3d0">1</text><path d="M8.2 25.4h5M10.6 23.6l-2.4 1.8 2.4 1.8M23.8 25.4h-5M21.4 23.6l2.4 1.8-2.4 1.8" fill="none" stroke="#ffd98a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
const ICE_MARK =
  '<span class="mk ice" title="Hielo: patina hasta el tope"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14.5" fill="#133d54" stroke="#091118" stroke-width="1.6"/><circle cx="16" cy="16" r="12.2" fill="none" stroke="#baf1ff" stroke-width="1.4"/><path d="M16 7.5v17M8.6 11.7l14.8 8.6M23.4 11.7L8.6 20.3" stroke="#e9fcff" stroke-width="2" stroke-linecap="round"/><path d="M14 9.8l2 2 2-2M14 22.2l2-2 2 2" fill="none" stroke="#8de2fc" stroke-width="1.4" stroke-linecap="round"/><circle cx="16" cy="16" r="2.5" fill="#ffffff"/></svg></span>';
const STRAPS = '<span class="strap h"></span><span class="strap v"></span>';
const TONE_SYM = ['◆', '●', '▲'];
const TONE_NAMES = ['azul ◆', 'ámbar ●', 'verde ▲'];
const toneMark = (t) => `<span class="mk tone t${t}" title="Gema ${TONE_NAMES[t]}">${TONE_SYM[t]}</span>`;
export function buildPieces() {
  boardEl.querySelectorAll('.piece,.wall,.door,.plate,.links,.seal-floor').forEach((e) => e.remove());
  boardEl.dataset.city = zoneIdx(S.G.n);
  boardEl.classList.remove('board-win');
  S.G.rot = boardRotation(S.run?.seed, S.G.n, S.G.tutorial || false); // la salida cambia de lado (derecha, abajo, izquierda, arriba)
  boardEl.parentElement.style.setProperty('--rot', S.G.rot + 'deg');
  boardEl.parentElement.dataset.rot = S.G.rot;
  if (S.G.rot && !S.G.moves) showCurse(S.G.rot);
  else hideCurse();
  boardEl.classList.toggle('is-boss', !!S.G.plan?.boss);
  S.G.gateLocked = {};
  S.G.wallEls = (S.G.walls || []).map(() => {
    const el = document.createElement('div');
    el.className = 'wall';
    el.innerHTML = '<i></i>';
    boardEl.appendChild(el);
    return el;
  });
  S.G.doorEls = (S.G.doors || []).map(([, , tone]) => {
    const el = document.createElement('div');
    el.className = `door tone-${tone}`;
    el.setAttribute('aria-label', `Portón ${TONE_NAMES[tone]}`);
    el.innerHTML = `<i>${TONE_SYM[tone]}</i><b></b>`;
    boardEl.appendChild(el);
    return el;
  });
  S.G.plateEls = S.G.pieces.map((p) => {
    if (p.kind !== 'gate') return null;
    const el = document.createElement('div');
    el.className = 'plate';
    el.innerHTML = '<i></i>';
    boardEl.appendChild(el);
    return el;
  });
  S.G.linkEls = {};
  if (S.G.plateEls.some(Boolean)) {
    // un hilo punteado une cada candado con su placa: se ve qué abre qué
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'links');
    svg.setAttribute('aria-hidden', 'true');
    S.G.pieces.forEach((p, i) => {
      if (p.kind !== 'gate') return;
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('class', 'link');
      svg.appendChild(ln);
      S.G.linkEls[i] = ln;
    });
    boardEl.appendChild(svg);
  }
  S.G.els = S.G.pieces.map((p, i) => {
    const el = document.createElement('div');
    const toneCls = p.tone !== undefined ? ` toned tone-${p.tone}` : '';
    el.className =
      'piece enter ' + p.o + ' ' + (i === 0 ? 'red' : 'c' + S.G.colors[i % 8]) + (p.kind ? ' ' + p.kind : '') + toneCls;
    el.style.setProperty('--dl', Math.min(i * 9, 110) + 'ms');
    const badge =
      p.kind === 'gate'
        ? STRAPS + '<span class="mk gate">' + LOCK_SVG + '</span>'
        : p.kind === 'heavy'
          ? HEAVY_MARK
          : p.kind === 'ice'
            ? ICE_MARK
            : '';
    el.innerHTML = '<div class="face"></div>' + badge + (p.tone !== undefined ? toneMark(p.tone) : '');
    el.addEventListener('animationend', (e) => {
      if (e.animationName === 'enter') el.classList.remove('enter');
    });
    boardEl.appendChild(el);
    attach(el, i);
    return el;
  });
  boardEl.classList.remove('board-lock');
  layout();
  boardEl.classList.remove('deal');
  void boardEl.offsetWidth;
  boardEl.classList.add('deal');
  setTimeout(() => boardEl.classList.remove('deal'), 320);
}
export function place(i, x = S.G.pos[i]) {
  const p = S.G.pieces[i],
    el = S.G.els[i],
    s = cellPx();
  el.style.width = (p.o === 'h' ? p.len : 1) * s + 'px';
  el.style.height = (p.o === 'v' ? p.len : 1) * s + 'px';
  setXY(el, p, x, s);
}
/** Posición de la pieza con `translate` (compuesta en la GPU; left/top se quedan en 0). */
const setXY = (el, p, x, s) => {
  el.style.translate = p.o === 'h' ? `${x * s}px ${p.fix * s}px` : `${p.fix * s}px ${x * s}px`;
};
function placeStatic() {
  const s = cellPx();
  (S.G.walls || []).forEach(([r, c], k) => {
    const el = S.G.wallEls?.[k];
    if (!el) return;
    el.style.left = c * s + 'px';
    el.style.top = r * s + 'px';
    el.style.width = el.style.height = s + 'px';
  });
  (S.G.doors || []).forEach(([r, c], k) => {
    const el = S.G.doorEls?.[k];
    if (!el) return;
    el.style.left = c * s + 'px';
    el.style.top = r * s + 'px';
    el.style.width = el.style.height = s + 'px';
  });
  S.G.pieces.forEach((p, i) => {
    const el = S.G.plateEls?.[i];
    if (!el) return;
    el.style.left = p.plate[1] * s + 'px';
    el.style.top = p.plate[0] * s + 'px';
    el.style.width = el.style.height = s + 'px';
  });
}
/** La pieza «aterriza»: rebote, aro de luz y un polvo de luz de su color alrededor (tras el deslizamiento). */
function landFx(el) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setTimeout(() => {
    if (!el.isConnected) return;
    flashEl(el, 'landed', 300);
    sfx.land();
    const r = el.getBoundingClientRect(),
      c = getComputedStyle(el);
    motes(0, 0, 10, [c.getPropertyValue('--a').trim() || '#fff', '#fff3cf', '#f1ce82'], 1.7, r);
  }, 150);
}
const flashEl = (el, cls, ms) => {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
};
/** Candados: se cierran o se abren según la placa; al abrirse suena y brilla. */
/** Redibuja el hilo que une cada candado con su placa (sigue al candado cuando se mueve). */
function updateLinks() {
  const G = S.G;
  if (!G || !G.linkEls) return;
  const s = cellPx();
  for (const i in G.linkEls) {
    const p = G.pieces[i],
      x = G.pos[i],
      ln = G.linkEls[i];
    const gx = (p.o === 'h' ? x + p.len / 2 : p.fix + 0.5) * s,
      gy = (p.o === 'h' ? p.fix + 0.5 : x + p.len / 2) * s;
    ln.setAttribute('x1', gx);
    ln.setAttribute('y1', gy);
    ln.setAttribute('x2', (p.plate[1] + 0.5) * s);
    ln.setAttribute('y2', (p.plate[0] + 0.5) * s);
    ln.classList.toggle('open', !G.gateLocked?.[i]);
  }
}
function syncSpecials(animate = true) {
  const G = S.G;
  if (!G || !G.plateEls) return;
  G.pieces.forEach((p, i) => {
    if (p.kind !== 'gate') return;
    const locked = isLocked(G.pieces, G.pos, i, G.walls),
      el = G.els[i],
      plate = G.plateEls[i],
      was = G.gateLocked[i];
    G.gateLocked[i] = locked;
    el.classList.toggle('locked', locked);
    el.classList.toggle('open', !locked);
    plate.classList.toggle('on', !locked);
    if (animate && was !== undefined && was !== locked) {
      if (!locked) {
        sfx.unlock();
        vib([15, 20, 15]);
        flashEl(el, 'just-open', 900);
        flashEl(plate, 'pulse', 900);
        $('msg').textContent = '¡Candado abierto! Ya puedes moverla mientras la placa siga cubierta.';
      } else {
        sfx.plate();
        $('msg').textContent = 'Sin nadie sobre la placa, el candado se cierra otra vez.';
      }
    }
  });
}
export const layout = () => {
  if (!S.G) return;
  S.G.els.forEach((_, i) => place(i));
  placeStatic();
  syncSpecials(false);
  updateLinks();
  renderSeal();
};

/** Hielo: dibuja el camino completo que recorrerá en cada sentido (hasta el tope); el del sentido del arrastre se resalta. */
function iceTrail(p, x0, lo, hi, s, before) {
  const mk = (from, to, dir) => {
    if (to <= from) return null; // sin recorrido por ese lado
    const t = document.createElement('div');
    t.className = 'ice-trail ' + p.o + ' ' + dir;
    t.setAttribute('aria-hidden', 'true');
    const a = from * s,
      len = (to - from) * s;
    t.style[p.o === 'h' ? 'left' : 'top'] = a + 'px';
    t.style[p.o === 'h' ? 'top' : 'left'] = p.fix * s + 'px';
    t.style[p.o === 'h' ? 'width' : 'height'] = len + 'px';
    t.style[p.o === 'h' ? 'height' : 'width'] = s + 'px';
    t.innerHTML = '<b></b>';
    boardEl.insertBefore(t, before);
    return t;
  };
  const back = mk(lo, x0, 'back'),
    fwd = mk(x0 + p.len, hi + p.len, 'fwd');
  return {
    aim(delta) {
      back?.classList.toggle('on', delta <= -0.05);
      fwd?.classList.toggle('on', delta >= 0.05);
    },
    clear(ms = 0) {
      const go = () => {
        back?.remove();
        fwd?.remove();
      };
      ms ? setTimeout(go, ms) : go();
    },
  };
}

function blockReasonDoor(p, posVal) {
  const doors = S.G?.doors;
  if (!doors?.length) return -1;
  const r = p.o === 'h' ? p.fix : posVal,
    c = p.o === 'h' ? posVal : p.fix;
  const k = doors.findIndex(([dr, dc, t]) => dr === r && dc === c && t !== p.tone);
  return k;
}
function crossedDoorIdx(p, x0, x) {
  const doors = S.G?.doors;
  if (!doors?.length) return -1;
  const a = Math.min(x0, x),
    b = Math.max(x0, x) + p.len - 1;
  return doors.findIndex(
    ([r, c, t]) => t === p.tone && (p.o === 'h' ? r === p.fix && c >= a && c <= b : c === p.fix && r >= a && r <= b),
  );
}
export function cancelDrag() {
  activeDrag?.cancel();
}
let activeDrag = null; // arrastre en curso: solo puede haber uno (evita dos dedos a la vez)
function attach(el, i) {
  el.addEventListener('pointerdown', (e) => {
    if (!S.G || S.G.done || S.busy) return;
    if (activeDrag) activeDrag.cancel(); // un arrastre anterior que no terminó nunca bloquea el tablero
    e.preventDefault();
    try {
      el.setPointerCapture(e.pointerId);
    } catch (_) {}
    const p = S.G.pieces[i],
      s = cellPx(),
      [lo, hi] = slideRange(S.G.pieces, S.G.pos, i, S.G.walls, S.G.doors),
      x0 = S.G.pos[i],
      rot = S.G.rot || 0,
      start = localDelta(e.clientX, e.clientY, rot, p.o);
    if (p.kind === 'gate' && isLocked(S.G.pieces, S.G.pos, i, S.G.walls)) {
      // candado cerrado: sacude, avisa y señala la placa
      flashEl(el, 'deny', 450);
      flashEl(boardEl.parentElement, 'board-shake', 260);
      flashEl(S.G.plateEls[i], 'hint', 1500);
      sfx.locked();
      vib([30, 30, 30]);
      $('msg').textContent = 'Está atrapada. Cubre la placa ▣ con otra pieza para abrirla.';
      return;
    }
    el.classList.remove('hint');
    el.classList.add('drag');
    let cur = x0,
      lastCell = x0,
      delta = 0,
      bumped = 0;
    const trail = p.kind === 'ice' ? iceTrail(p, x0, lo, hi, s, el) : null;
    const move = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      delta = (localDelta(ev.clientX, ev.clientY, rot, p.o) - start) / s;
      const raw = x0 + delta;
      cur = Math.max(lo, Math.min(hi, raw));
      setXY(el, p, cur, s);
      trail?.aim(delta);
      const c = Math.round(cur);
      if (c !== lastCell) {
        lastCell = c;
        sfx.tick(c);
        vib(4);
      }
      const hitDir = raw < lo - 0.14 ? -1 : raw > hi + 0.14 ? 1 : 0;
      if (hitDir && hitDir !== bumped) {
        bumped = hitDir;
        const stopPos = hitDir < 0 ? lo - 1 : hi + p.len;
        const dk = stopPos >= 0 && stopPos < 6 ? blockReasonDoor(p, stopPos) : -1;
        if (dk >= 0) {
          const dt = S.G.doors[dk][2];
          flashEl(el, 'deny', 320);
          flashEl(S.G.doorEls[dk], 'deny-door', 450);
          flashEl(boardEl.parentElement, 'board-shake', 200);
          sfx.doorDeny();
          vib([24, 30, 24]);
          $('msg').textContent = `Portón cerrado: solo pasa la gema ${TONE_NAMES[dt]}.`;
        } else {
          flashEl(el, 'bump-hit', 180);
          sfx.bump();
          vib(10);
        }
      } else if (!hitDir) {
        bumped = 0;
      }
    };
    let ended = false;
    const end = (commit) => {
      if (ended) return;
      ended = true;
      activeDrag = null;
      for (const t of ['pointermove', 'pointerup', 'pointercancel', 'lostpointercapture'])
        el.removeEventListener(t, handlers[t]);
      try {
        el.releasePointerCapture(e.pointerId);
      } catch (_) {}
      el.classList.remove('drag');
      const x = commit && S.G && !S.G.done ? snapDrag(x0, lo, hi, delta, p.kind) : x0;
      if (x !== x0) {
        applyMove(S.G, i, x);
        (p.kind === 'heavy'
          ? sfx.heavyMove
          : p.kind === 'gate'
            ? sfx.gateMove
            : p.kind === 'ice'
              ? sfx.iceMove
              : sfx.move)();
        landFx(el);
        const passDoor = crossedDoorIdx(p, x0, x);
        if (passDoor >= 0) {
          sfx.doorOpen();
          flashEl(S.G.doorEls[passDoor], 'door-pass', 550);
          vib([14, 18, 22]);
        } else if (p.kind === 'heavy') {
          flashEl(boardEl.parentElement, 'board-thud', 180);
          vib([24, 18]);
        } else if (p.kind === 'ice') {
          flashEl(el, 'sliding', 220);
          vib([8, 40, 20]);
          setTimeout(() => {
            flashEl(boardEl.parentElement, 'board-thud', 140);
          }, 120);
        } else vib(9);
      }
      trail?.clear(x !== x0 ? 380 : 0);
      if (S.G && S.G.els[i] === el) {
        place(i);
        syncSpecials();
        updateLinks();
      }
      if (x !== x0) afterMove();
    };
    const handlers = {
      pointermove: move,
      pointerup: (ev) => {
        if (ev.pointerId === e.pointerId) end(true);
      },
      pointercancel: () => end(true),
      lostpointercapture: () => end(true),
    };
    for (const t in handlers) el.addEventListener(t, handlers[t]);
    activeDrag = { cancel: () => end(false) };
  });
}
export function afterMove() {
  if (!S.run || !S.G || S.G.done) return;
  processSealMove();
  updateHud();
  if (!S.run.daily) saveRun();
  coachOnMove();
  const prac = S.run.mode === 'p';
  const status = prac ? 'ok' : moveStatus(S.G.moves, S.G.limit);
  if (isWon(S.G.pos)) {
    win();
    return;
  } // ganar en el último turno vale
  if (status === 'over') {
    fail('limit');
    return;
  }
  if (S.run.daily) saveRun(); // sin turnos: ya no se puede mover
  if (prac) {
    if (S.G.moves === S.G.opt + 1)
      $('msg').textContent = 'Vas por encima del mínimo. En práctica no pasa nada: ¡sigue!';
    return;
  }
  const retry = S.run.daily || freeRetry(S.run, S.G.n, !!S.G.plan?.boss && !S.G.tutorial);
  if (status === 'last') {
    $('msg').textContent = retry
      ? 'ÚLTIMO MOVIMIENTO: si la llave no sale ahora, repites el tablero.'
      : 'ÚLTIMO TURNO: si no sacas la llave con este movimiento, la aventura termina.';
    sfx.warn();
    vib([30, 40, 30]);
  } else if (status === 'warn') {
    $('msg').textContent = `Te quedan ${movesLeft(S.G.moves, S.G.limit)} movimientos. Piensa bien cada paso.`;
    sfx.warn();
  }
}
function fitScore() {
  const score = $('score');
  score.style.removeProperty('--score-size');
  if (!score.clientWidth || score.scrollWidth <= score.clientWidth) return;
  const style = getComputedStyle(score);
  const size = Math.floor((parseFloat(style.fontSize) * score.clientWidth) / score.scrollWidth);
  score.style.setProperty('--score-size', Math.max(10, size) + 'px');
}
new MutationObserver(fitScore).observe($('score'), { childList: true, characterData: true, subtree: true });
export function recLine() {
  // refresca camino, puntaje actual y máximo del camino en juego
  const prac = S.run.mode === 'p',
    rec = store.paths[rkey()] || { score: 0, level: 0 },
    p = pathOf(S.run.start);
  $('pchip').textContent = p.n.toUpperCase();
  $('pchip').style.color = p.c;
  if (prac) {
    $('scoreLbl').textContent = 'MODO';
    $('score').textContent = 'Práctica';
    $('maxLbl').textContent = 'NIVEL MÁX.';
    $('scoreMax').textContent = Math.max(rec.level, S.run.level);
    $('scMax').classList.remove('broken');
    return;
  }
  $('scoreLbl').textContent = 'PUNTOS';
  $('maxLbl').textContent = S.run.recBroken ? 'NUEVO RÉCORD' : 'RÉCORD';
  $('scoreMax').textContent = Math.max(rec.score, S.run.score).toLocaleString(numLocale());
  $('scMax').classList.toggle('broken', !!S.run.recBroken);
}
export function syncRouteStyle() {
  const brave = isHeroic(S.run),
    path = heroicPath(S.run?.hero);
  document.body.classList.toggle('adventure-route', brave);
  const level = S.run?.level || 1,
    first = Math.floor((level - 1) / 10) * 10 + 1,
    last = Math.min(100, first + 9);
  $('routeName').textContent = brave ? path.name : 'AVANZAR';
  $('routeIcon').innerHTML = brave ? icon(path.icon) : '⌁';
  $('routeScope').textContent = `NIV. ${first}–${last}`;
  $('routeReward').textContent = brave ? path.benefit : 'Habitual';
  $('routeStatus').setAttribute(
    'aria-label',
    brave ? `${path.name}. Más difícil. ${path.benefit}. Niveles ${first} a ${last}.` : 'Dificultad habitual',
  );
  $('heroicBadge').hidden = !brave;
  $('heroicIcon').innerHTML = icon(path.icon);
  $('heroicBenefit').textContent = `Camino heroico · ${path.benefit}`;
  $('heroicBadge').setAttribute('aria-label', brave ? `${path.name}: ${path.benefit}` : '');
}

export function updateHud() {
  syncRouteStyle();
  updateHeroHud();
  $('mv').textContent = S.G.moves;
  const f = $('fill'),
    pct = Math.min(100, (S.G.moves / S.G.limit) * 100);
  f.style.width = pct + '%';
  const pz = Math.min(100, (S.G.opt / S.G.limit) * 100);
  $('meter').style.setProperty('--pz', pz + '%'); // zona «perfecta»: hasta el mínimo de movimientos
  const over = Math.max(0, S.G.moves - S.G.opt) / S.G.opt,
    hue = 140 * (1 - Math.min(1, over));
  f.style.background = `hsl(${hue} 85% 52%)`;
  f.style.color = `hsl(${hue} 85% 52%)`;
  const prac = S.run.mode === 'p',
    cg = gainNow();
  $('pot').textContent = prac ? 'sin puntaje' : '+' + cg.total.toLocaleString(numLocale());
  $('meter').classList.toggle('danger', !prac && isLow(S.G.moves, S.G.limit));
  const { low, last } = lowState(); // pocos turnos: solo aviso visual, la música no cambia
  setTensionFx(low, last);
  renderTurns();
  renderSeal();
}

/* ---------- Victoria de nivel ---------- */

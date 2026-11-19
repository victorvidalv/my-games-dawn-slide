/**
 * Minijuegos de Jean (tiempo y precisión): parar la aguja, tocar al compás y ordenar las horas.
 * Cada juego exporta `mount(ctx)` y devuelve { start(), grade() }. La lógica y la nota viven en src/game/minigames.js.
 */
import {
  RHYTHM_LANES,
  clockAngle,
  clockGrade,
  clockScore,
  orderClock,
  orderGrade,
  orderState,
  orderTap,
  rhythmGrade,
  rhythmJudge,
} from '../../game/minigames.js';
import { numLocale } from '../../i18n.js';
import { el, floatText, pulse, ring, snd, sparks } from './kit.js';

/* ═════════════ La Última Campanada ═════════════ */

const pt = (a, r) =>
  `${(100 + r * Math.sin(a * 2 * Math.PI)).toFixed(2)} ${(100 - r * Math.cos(a * 2 * Math.PI)).toFixed(2)}`;
/** Arco de la esfera centrado en `center` (0-1, 0 = las doce) y de tamaño `size` (fracción de vuelta). */
const arc = (center, size, r) =>
  `M${pt(center - size / 2, r)}A${r} ${r} 0 ${size > 0.5 ? 1 : 0} 1 ${pt(center + size / 2, r)}`;
const TICKS = Array.from(
  { length: 12 },
  (_, i) =>
    `<path d="M${pt(i / 12, i % 3 ? 80 : 77)}L${pt(i / 12, 86)}" stroke="#150e0c" stroke-width="${i % 3 ? 2 : 3.6}" stroke-linecap="round"/>`,
).join('');
const dial = (extra = '') =>
  `<svg class="ck-dial" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="96" fill="#b57a22" stroke="#150e0c" stroke-width="4"/><circle cx="100" cy="100" r="96" fill="none" stroke="#fbe29a" stroke-width="1.5" opacity=".55" stroke-dasharray="2 7"/><circle cx="100" cy="100" r="87" fill="#f3e5c2" stroke="#150e0c" stroke-width="3"/><circle cx="100" cy="100" r="58" fill="none" stroke="#c9b68a" stroke-width="1.4"/>${TICKS}<path class="ck-zone" fill="none" stroke="#e9a52c" stroke-width="20"/><path class="ck-core" fill="none" stroke="#fff3b0" stroke-width="20"/>${extra}<g class="ck-hand"><path d="M100 112L96 100 100 22l4 78z" fill="#a63019" stroke="#150e0c" stroke-width="2.4" stroke-linejoin="round"/></g><circle cx="100" cy="100" r="8.5" fill="#e6b04a" stroke="#150e0c" stroke-width="3"/></svg>`;
const BELL =
  '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4c-6 0-9 5-9 11v6l-3 4h24l-3-4v-6c0-6-3-11-9-11z" fill="currentColor" stroke="#150e0c" stroke-width="2.4" stroke-linejoin="round"/><circle cx="16" cy="27.5" r="2.6" fill="#150e0c"/></svg>';

export const clockGame = {
  rule: 'Toca cuando la aguja pase por la zona dorada.',
  dos: [
    { ok: true, art: '<i class="chip-zone"></i>', text: 'Zona dorada: campanada' },
    { ok: false, art: '<i class="chip-zone off"></i>', text: 'Fuera: fallo' },
  ],
  hint: 'Cinco campanadas, cada una más rápida.',
  demo: `<div class="demo demo-clock">${dial()
    .replace('class="ck-zone"', `class="ck-zone" d="${arc(0.25, 0.22, 72)}"`)
    .replace('class="ck-core"', `class="ck-core" d="${arc(0.25, 0.07, 72)}"`)}<i class="d-hand"></i></div>`,
  mount(ctx) {
    const { field, setup, runner, hud } = ctx;
    field.innerHTML = `<div class="mg-clock"><div class="ck-bells">${setup.list.map(() => `<i class="ck-bell">${BELL}</i>`).join('')}</div><div class="ck-face">${dial()}</div><div class="ck-tap">Toca para parar</div></div>`;
    const zone = field.querySelector('.ck-zone'),
      core = field.querySelector('.ck-core'),
      hand = field.querySelector('.ck-hand'),
      face = field.querySelector('.ck-face');
    const bells = [...field.querySelectorAll('.ck-bell')],
      tapHint = field.querySelector('.ck-tap');
    let i = 0,
      hits = 0,
      state = 'idle',
      t0 = 0,
      round = null;
    const point = (a) => hand.setAttribute('transform', `rotate(${(a * 360).toFixed(2)} 100 100)`);
    const paint = () => {
      hud.left('Campanadas', `${hits}/${setup.rounds}`);
      hud.bar(i / setup.rounds, 'fill');
    };
    function begin() {
      round = setup.list[i];
      zone.setAttribute('d', arc(round.center, round.zone, 72));
      core.setAttribute('d', arc(round.center, round.zone / 3, 72));
      pulse(face, 'fresh', 420);
      point(round.from);
      bells[i].classList.add('cur');
      state = 'arming';
      snd.whoosh();
      runner.after(650, () => {
        state = 'spin';
        t0 = runner.now();
      });
    }
    function resolve(score, a) {
      state = 'show';
      bells[i].classList.remove('cur');
      bells[i].classList.add(score === 2 ? 'perfect' : score ? 'hit' : 'miss');
      const tip = { x: 50 + 34 * Math.sin(a * 2 * Math.PI), y: 54 - 30 * Math.cos(a * 2 * Math.PI) };
      if (score) {
        hits++;
        snd.bell(i, 1, 0.11);
        if (score === 2) snd.great();
        pulse(face, 'rang', 520);
        ring(field, tip.x, tip.y, 'gold');
        sparks(field, tip.x, tip.y, score === 2 ? 12 : 7);
        floatText(field, 50, 40, score === 2 ? '¡Perfecto!' : '¡Campanada!', 'gold');
      } else {
        snd.bad();
        pulse(field, 'mg-shake');
        floatText(field, 50, 40, 'Fallo', 'bad');
      }
      i++;
      paint();
      runner.after(900, () => {
        if (i >= setup.rounds) ctx.done(clockGrade({ hits }));
        else begin();
      });
    }
    function stop() {
      if (state !== 'spin' || runner.paused) return;
      tapHint.classList.add('gone');
      const a = clockAngle(round, runner.now() - t0);
      point(a);
      resolve(clockScore(round, a), a);
    }
    ctx.listen(field, 'pointerdown', (e) => {
      e.preventDefault();
      stop();
    });
    ctx.listen(document, 'keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        stop();
      }
    });
    function frame(t) {
      if (state !== 'spin') return;
      const a = clockAngle(round, t - t0);
      point(a);
      if (t - t0 > round.period * 3.5) resolve(0, a); // tres vueltas sin tocar: la campanada se pierde
    }
    return {
      start() {
        paint();
        runner.onFrame(frame);
        begin();
      },
      grade: () => clockGrade({ hits }),
    };
  },
};

/* ═════════════ El Compás del Péndulo ═════════════ */

const GEMS = [
  '<path d="M16 3 29 16 16 29 3 16z"/>',
  '<circle cx="16" cy="16" r="12.5"/>',
  '<path d="M16 3.5 29.5 27h-27z"/>',
];
const gem = (lane) =>
  `<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="currentColor" stroke="#150e0c" stroke-width="2.4" stroke-linejoin="round">${GEMS[lane]}</g></svg>`;

export const rhythmGame = {
  rule: 'Toca cada gema cuando llegue a su aro.',
  dos: [
    { ok: true, art: '<i class="chip-gem"></i>', text: 'En el aro: +1' },
    { ok: false, art: '<i class="chip-gem late"></i>', text: 'Tarde o al aire: nada' },
  ],
  hint: 'Toca la columna (o usa ← ↓ →).',
  demo: `<div class="demo demo-rhythm"><i class="d-lane"></i><i class="d-target"></i><i class="d-note">${gem(1)}</i><i class="d-hand"></i></div>`,
  mount(ctx) {
    const { field, setup, runner, hud } = ctx;
    const HIT = 82; // % de altura del aro dentro de la columna
    field.innerHTML = `<div class="mg-rhythm"><div class="rh-pendulum"><i></i></div><div class="rh-cols">${Array.from({ length: RHYTHM_LANES }, (_, l) => `<button type="button" class="rh-col lane-${l}" data-lane="${l}" aria-label="Columna ${l + 1}"><span class="rh-track"></span><span class="rh-target">${gem(l)}</span></button>`).join('')}</div></div>`;
    const cols = [...field.querySelectorAll('.rh-col')],
      tracks = cols.map((c) => c.querySelector('.rh-track')),
      pend = field.querySelector('.rh-pendulum i');
    const nodes = [],
      done = [];
    let hits = 0,
      strays = 0,
      combo = 0,
      next = 0,
      tick = 0,
      ended = false;
    const paint = () => hud.left('Notas', `${hits}/${setup.notes}`);
    const cx = (l) => ((l + 0.5) * 100) / RHYTHM_LANES;
    function tap(lane) {
      if (ended || runner.paused) return;
      const t = runner.now(),
        i = rhythmJudge(setup, done, lane, t);
      pulse(cols[lane], 'press', 160);
      if (i < 0) {
        strays++;
        combo = 0;
        snd.tap();
        pulse(cols[lane], 'stray', 260);
        return;
      }
      done[i] = 1;
      hits++;
      combo++;
      const exact = Math.abs(setup.list[i].t - t) <= setup.window * 0.4;
      nodes[i]?.remove();
      snd.bell(setup.list[i].pitch % 6, 1, 0.1);
      if (exact) snd.tick();
      ring(field, cx(lane), 78, exact ? 'gold' : '');
      sparks(field, cx(lane), 78, exact ? 9 : 5);
      floatText(
        field,
        cx(lane),
        66,
        exact ? '¡Perfecto!' : combo >= 4 ? `×${combo}` : '¡Bien!',
        exact ? 'gold' : 'good',
      );
      paint();
    }
    cols.forEach((c, l) => {
      ctx.listen(c, 'pointerdown', (e) => {
        e.preventDefault();
        tap(l);
      });
      ctx.listen(c, 'click', (e) => {
        if (e.detail === 0) tap(l);
      });
    });
    const KEYS = { ArrowLeft: 0, ArrowDown: 1, ArrowRight: 2, 1: 0, 2: 1, 3: 2 };
    ctx.listen(document, 'keydown', (e) => {
      if (e.key in KEYS && !e.repeat) {
        e.preventDefault();
        tap(KEYS[e.key]);
      }
    });
    function frame(t) {
      if (ended) return;
      pend.style.transform = `rotate(${(Math.sin((Math.PI * t) / setup.beat) * 26).toFixed(2)}deg)`;
      while (next < setup.list.length && setup.list[next].t - setup.travel <= t) {
        const n = setup.list[next];
        nodes[next] = el(`<i class="rh-note">${gem(n.lane)}</i>`);
        tracks[n.lane].appendChild(nodes[next]);
        next++;
      }
      while (tick < setup.list.length && setup.list[tick].t <= t) {
        snd.tick();
        tick++;
      }
      setup.list.forEach((n, i) => {
        const node = nodes[i];
        if (!node || !node.isConnected) return;
        const p = (t - (n.t - setup.travel)) / setup.travel;
        node.style.top = `${-12 + p * (HIT + 12)}%`;
        if (!done[i] && t > n.t + setup.window) {
          done[i] = 2;
          combo = 0;
          node.classList.add('missed');
        }
        if (p > 1.3) node.remove();
      });
      hud.bar(1 - t / setup.duration);
      if (t >= setup.duration) {
        ended = true;
        ctx.done(rhythmGrade({ hits, strays }, setup));
      }
    }
    return {
      start() {
        paint();
        runner.onFrame(frame);
      },
      grade: () => rhythmGrade({ hits, strays }, setup),
    };
  },
};

/* ═════════════ Las Horas en Orden ═════════════ */

export const orderGame = {
  rule: 'Toca los números en orden: 1, 2, 3…',
  dos: [
    { ok: true, art: '<i class="chip-num">1</i>', text: 'Rápido: más estrellas' },
    { ok: false, art: '<i class="chip-num bad">7</i>', text: 'Error: pierdes tiempo' },
  ],
  hint: 'Acaba antes de que se vacíe el reloj.',
  demo: '<div class="demo demo-order"><i class="d-num n1">1</i><i class="d-num n3">3</i><i class="d-num n2">2</i><i class="d-num n4">4</i><i class="d-hand"></i></div>',
  mount(ctx) {
    const { field, setup, runner, hud } = ctx;
    const state = orderState();
    let ended = false,
      lastSec = -1;
    field.innerHTML = `<div class="mg-order" style="--cols:${setup.cols}">${setup.cells.map((v) => `<button type="button" class="or-cell" data-v="${v}"><b>${v}</b></button>`).join('')}</div>`;
    const cells = [...field.querySelectorAll('.or-cell')];
    const paint = () => hud.left('Siguiente', state.next > setup.count ? '✓' : String(state.next));
    function tap(cell) {
      if (ended || runner.paused || cell.classList.contains('ok')) return;
      const r = cell.getBoundingClientRect(),
        f = field.getBoundingClientRect();
      const x = ((r.left + r.width / 2 - f.left) / f.width) * 100,
        y = ((r.top + r.height / 2 - f.top) / f.height) * 100;
      const out = orderTap(setup, state, Number(cell.dataset.v));
      if (!out) return;
      if (out === 'wrong') {
        snd.bad();
        pulse(cell, 'wrong', 380);
        floatText(field, x, y - 8, `−${(setup.penalty / 1000).toLocaleString(numLocale())} s`, 'bad');
        hud.flash();
        return;
      }
      cell.classList.add('ok');
      cell.disabled = true;
      snd.good(state.next - 2);
      ring(field, x, y);
      sparks(field, x, y, 5, ['#bfe0ff', '#8fb9ff', '#fff']);
      paint();
      if (out === 'done') {
        ended = true;
        const t = runner.now();
        snd.great();
        runner.after(500, () => ctx.done(orderGrade(setup, state, t)));
      }
    }
    cells.forEach((c) => {
      ctx.listen(c, 'pointerdown', (e) => {
        e.preventDefault();
        tap(c);
      });
      ctx.listen(c, 'click', (e) => {
        if (e.detail === 0) tap(c);
      });
    });
    function frame(t) {
      if (ended) return;
      const left = setup.duration - orderClock(setup, state, t);
      hud.bar(left / setup.duration);
      const sec = Math.max(0, Math.ceil(left / 1000));
      if (sec !== lastSec) {
        lastSec = sec;
        hud.right(`${sec} s`);
        if (sec <= 5 && sec > 0) snd.tick();
      }
      if (left <= 0) {
        ended = true;
        ctx.done(orderGrade(setup, state, t));
      }
    }
    return {
      start() {
        paint();
        field.querySelector('.mg-order').classList.add('live');
        runner.onFrame(frame);
      },
      grade: () => orderGrade(setup, state, runner.now()),
    };
  },
};

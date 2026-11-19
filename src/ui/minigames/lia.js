/**
 * Minijuegos de Lía (reflejos y fuego): atrapar brasas, espantar sombras y apilar lingotes.
 * Cada juego exporta `mount(ctx)` y devuelve { start(), grade() }. La lógica y la nota viven en src/game/minigames.js.
 */
import {
  WHACK_HOLES,
  STACK_BASE,
  catchGrade,
  catchHit,
  stackDrop,
  stackGrade,
  stackX,
  whackGrade,
} from '../../game/minigames.js';
import { icon } from '../icons.js';
import { clamp, el, floatText, pointerAt, pulse, ring, snd, sparks } from './kit.js';

const DROP =
  '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3c5 7 9 11 9 16a9 9 0 0 1-18 0c0-5 4-9 9-16z" fill="#6fc3ea" stroke="#150e0c" stroke-width="2.2" stroke-linejoin="round"/><path d="M11.5 19a5 5 0 0 0 4 5" stroke="#e4f6ff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';
const BRAZIER =
  '<svg viewBox="0 0 100 46" preserveAspectRatio="none" aria-hidden="true"><path d="M4 9h92l-11 27q-3 7-11 7H26q-8 0-11-7z" fill="#b57a22" stroke="#150e0c" stroke-width="3.2" stroke-linejoin="round"/><path d="M9 12h82l-3 7H12z" fill="#fbe29a" opacity=".55"/><rect x="2" y="3" width="96" height="9" rx="4" fill="#e6b04a" stroke="#150e0c" stroke-width="3"/><path class="ct-coals" d="M14 9q36-9 72 0" stroke="#ff8a3d" stroke-width="5" fill="none" stroke-linecap="round"/></svg>';
const SHADOW =
  '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M14 17 8 3l13 8M46 17l6-14-13 8" fill="#3d2556" stroke="#150e0c" stroke-width="3" stroke-linejoin="round"/><path d="M7 60V31C7 15 17 6 30 6s23 9 23 25v29z" fill="#3d2556" stroke="#150e0c" stroke-width="3"/><path d="M12 34c0-12 7-20 18-20" stroke="#6a4a8c" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M16 28l11 5-11 4zM44 28l-11 5 11 4z" fill="#ffd24a" stroke="#150e0c" stroke-width="1.2"/><path d="M21 47q9-7 18 0" stroke="#150e0c" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
const FRIEND =
  '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M30 3c3 12 19 18 19 35 0 13-8 22-19 22S11 51 11 38c0-8 4-13 8-17 1 5 3 8 6 8-1-9 2-18 5-26z" fill="#ffb24a" stroke="#150e0c" stroke-width="3" stroke-linejoin="round"/><path d="M30 26c2 7 10 10 10 18a10 10 0 0 1-20 0c0-4 2-7 4-9 1 2 2 3 4 3 0-4 1-8 2-12z" fill="#fff0b8"/><circle cx="25" cy="43" r="2.6" fill="#150e0c"/><circle cx="35" cy="43" r="2.6" fill="#150e0c"/><path d="M25.5 49q4.5 3.5 9 0" stroke="#150e0c" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="20.5" cy="47" r="2.2" fill="#ff7a5a" opacity=".7"/><circle cx="39.5" cy="47" r="2.2" fill="#ff7a5a" opacity=".7"/></svg>';

/* ═════════════ Lluvia de Brasas ═════════════ */

export const catchGame = {
  rule: 'Mueve el brasero y atrapa las brasas.',
  dos: [
    { ok: true, art: icon('flame'), text: 'Brasa: +1' },
    { ok: false, art: DROP, text: 'Gota: −1' },
  ],
  hint: 'Arrastra el dedo a los lados (o usa ← →).',
  demo: `<div class="demo demo-catch"><i class="d-ember">${icon('flame')}</i><i class="d-drop">${DROP}</i><i class="d-basket">${BRAZIER}</i><i class="d-hand"></i></div>`,
  mount(ctx) {
    const { field, setup, runner, hud } = ctx;
    const LINE = 80; // % de altura a la que el brasero recoge
    field.innerHTML = `<div class="mg-catch"><div class="ct-items"></div><div class="ct-basket" style="width:${setup.basket * 100}%">${BRAZIER}</div><div class="ct-floor"></div></div>`;
    const items = field.querySelector('.ct-items'),
      basket = field.querySelector('.ct-basket');
    let bx = 0.5,
      caught = 0,
      soaked = 0,
      next = 0,
      dir = 0,
      ended = false;
    const live = [];
    const half = setup.basket / 2;
    const place = () => {
      basket.style.left = `${bx * 100}%`;
    };
    const drag = (e) => {
      bx = clamp(pointerAt(e, field).x, half, 1 - half);
      place();
    };
    ctx.listen(field, 'pointerdown', (e) => {
      e.preventDefault();
      try {
        field.setPointerCapture(e.pointerId);
      } catch {
        /* sin captura */
      }
      drag(e);
    });
    ctx.listen(field, 'pointermove', (e) => {
      if (e.pointerType === 'mouse' || e.buttons || e.pressure > 0) drag(e);
    });
    ctx.listen(document, 'keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        dir = -1;
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        dir = 1;
        e.preventDefault();
      }
    });
    ctx.listen(document, 'keyup', (e) => {
      if ((e.key === 'ArrowLeft' && dir < 0) || (e.key === 'ArrowRight' && dir > 0)) dir = 0;
    });
    place();
    const paint = () => {
      hud.left('Brasas', `${caught}/${setup.embers}`);
    };
    function frame(t, dt) {
      if (ended) return;
      if (dir) {
        bx = clamp(bx + dir * dt * 0.0018, half, 1 - half);
        place();
      }
      while (next < setup.items.length && setup.items[next].t <= t) {
        const it = setup.items[next++];
        const node = el(
          `<i class="ct-item ${it.bad ? 'drop' : 'ember'}" style="left:${it.x * 100}%">${it.bad ? DROP : icon('flame')}</i>`,
        );
        items.appendChild(node);
        live.push({ it, node, state: 0 });
      }
      for (let i = live.length - 1; i >= 0; i--) {
        const o = live[i],
          p = (t - o.it.t) / (setup.fall * 1000);
        o.node.style.top = `${-8 + p * (LINE + 8)}%`;
        if (o.state === 0 && p >= 1) {
          o.state = 1;
          if (catchHit(o.it.x, bx, setup.basket)) {
            o.node.remove();
            live.splice(i, 1);
            if (o.it.bad) {
              soaked++;
              snd.splash();
              pulse(basket, 'soaked', 500);
              pulse(field, 'mg-shake');
              floatText(field, o.it.x * 100, LINE - 8, '−1', 'bad');
              sparks(field, o.it.x * 100, LINE, 6, ['#bfe9ff', '#6fc3ea', '#e4f6ff']);
            } else {
              caught++;
              snd.good(caught);
              pulse(basket, 'glow', 360);
              floatText(field, o.it.x * 100, LINE - 8, '+1');
              sparks(field, o.it.x * 100, LINE, 8);
            }
            paint();
            continue;
          }
          o.node.classList.add('lost');
        }
        if (p >= 1.32) {
          o.node.remove();
          live.splice(i, 1);
        }
      }
      hud.bar(1 - t / setup.duration);
      if (t >= setup.duration && !live.length && next >= setup.items.length) {
        ended = true;
        ctx.done(catchGrade({ caught, soaked }, setup));
      }
    }
    return {
      start() {
        paint();
        runner.onFrame(frame);
      },
      grade: () => catchGrade({ caught, soaked }, setup),
    };
  },
};

/* ═════════════ Sombras Fuera ═════════════ */

export const whackGame = {
  rule: 'Toca las sombras en cuanto asomen.',
  dos: [
    { ok: true, art: SHADOW, text: 'Sombra: +1' },
    { ok: false, art: FRIEND, text: 'Llama amiga: −1' },
  ],
  hint: 'Las llamas son amigas: no las toques.',
  demo: `<div class="demo demo-whack"><i class="d-pit"></i><i class="d-pit two"></i><i class="d-critter">${SHADOW}</i><i class="d-critter friend">${FRIEND}</i><i class="d-hand"></i></div>`,
  mount(ctx) {
    const { field, setup, runner, hud } = ctx;
    field.innerHTML = `<div class="mg-whack">${Array.from({ length: WHACK_HOLES }, (_, i) => `<button type="button" class="wh-hole" data-hole="${i}" aria-label="Hueco ${i + 1}"><span class="wh-clip"><span class="wh-critter"></span></span><span class="wh-rim"></span></button>`).join('')}</div>`;
    const holes = [...field.querySelectorAll('.wh-hole')],
      active = new Array(WHACK_HOLES).fill(null);
    let hits = 0,
      friendHits = 0,
      next = 0,
      ended = false;
    const paint = () => hud.left('Sombras', `${hits}/${setup.shadows}`);
    const centre = (i) => ({ x: 16.7 + (i % 3) * 33.3, y: 16.7 + Math.floor(i / 3) * 33.3 });
    function hide(i, cls) {
      const a = active[i];
      if (!a) return;
      active[i] = null;
      holes[i].classList.remove('up');
      if (cls) pulse(holes[i], cls, 380);
    }
    function whack(i) {
      if (ended || runner.paused) return;
      const a = active[i],
        c = centre(i);
      if (!a) {
        snd.tap();
        pulse(holes[i], 'empty', 200);
        return;
      }
      if (a.friend) {
        friendHits++;
        snd.bad();
        floatText(field, c.x, c.y - 10, '−1', 'bad');
        pulse(field, 'mg-shake');
        hide(i, 'ouch');
      } else {
        hits++;
        snd.thud();
        snd.good(hits);
        floatText(field, c.x, c.y - 10, '+1');
        sparks(field, c.x, c.y, 8, ['#c9a2ff', '#ffe9ad', '#7c4fb0']);
        ring(field, c.x, c.y);
        hide(i, 'bonk');
      }
      paint();
    }
    holes.forEach((b, i) => {
      ctx.listen(b, 'pointerdown', (e) => {
        e.preventDefault();
        whack(i);
      });
      ctx.listen(b, 'click', (e) => {
        if (e.detail === 0) whack(i);
      }); // teclado (Enter / Espacio)
    });
    ctx.listen(document, 'keydown', (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 9) {
        e.preventDefault();
        whack(n - 1);
      }
    });
    function frame(t) {
      if (ended) return;
      while (next < setup.pops.length && setup.pops[next].t <= t) {
        const p = setup.pops[next++],
          h = holes[p.hole];
        active[p.hole] = p;
        h.querySelector('.wh-critter').innerHTML = p.friend ? FRIEND : SHADOW;
        h.classList.toggle('friend', p.friend);
        h.classList.add('up');
        snd.pop();
      }
      active.forEach((p, i) => {
        if (p && t >= p.t + p.stay) hide(i);
      });
      hud.bar(1 - t / setup.duration);
      if (t >= setup.duration) {
        ended = true;
        ctx.done(whackGrade({ hits, friendHits }, setup));
      }
    }
    return {
      start() {
        paint();
        runner.onFrame(frame);
      },
      grade: () => whackGrade({ hits, friendHits }, setup),
    };
  },
};

/* ═════════════ La Torre de la Forja ═════════════ */

export const stackGame = {
  rule: 'Toca para soltar el lingote sobre la torre.',
  dos: [
    { ok: true, art: '<i class="chip-ingot"></i>', text: 'Encaja: sube la torre' },
    { ok: false, art: '<i class="chip-ingot cut"></i>', text: 'Lo que sobra se corta' },
  ],
  hint: 'Si cae fuera, se acaba.',
  demo: '<div class="demo demo-stack"><i class="d-base"></i><i class="d-block one"></i><i class="d-block two"></i><i class="d-hand"></i></div>',
  mount(ctx) {
    const { field, setup, runner, hud } = ctx;
    const ROW = 9.5,
      FLOOR = 12,
      VISIBLE = 5; // % de alto por lingote, alto del yunque y filas a la vista bajo el que se mueve
    field.innerHTML =
      '<div class="mg-stack"><div class="st-world"><div class="st-anvil"></div><div class="st-guide"></div></div><div class="st-tap">¡Toca!</div></div>';
    const world = field.querySelector('.st-world'),
      guide = field.querySelector('.st-guide'),
      tapHint = field.querySelector('.st-tap');
    let top = { ...STACK_BASE },
      placed = 0,
      t0 = 0,
      mover = null,
      busy = true,
      ended = false;
    const paint = () => {
      hud.left('Lingotes', `${placed}/${setup.blocks}`);
      hud.bar(placed / setup.blocks, 'fill');
    };
    const block = (x, w, row, cls = '') =>
      el(`<i class="st-block ${cls}" style="left:${x * 100}%;width:${w * 100}%;bottom:${FLOOR + row * ROW}%"></i>`);
    world.appendChild(block(top.x, top.w, 0, 'base'));
    const setGuide = () => {
      guide.style.left = `${top.x * 100}%`;
      guide.style.width = `${top.w * 100}%`;
      guide.style.bottom = `${FLOOR + (placed + 1) * ROW}%`;
    };
    function spawn() {
      if (ended) return;
      mover = block(0, top.w, placed + 1.6, 'mover');
      world.appendChild(mover);
      t0 = runner.now();
      busy = false;
      setGuide();
      world.style.transform = `translateY(${Math.max(0, placed - VISIBLE) * ROW}%)`;
    }
    const moverX = (t) => stackX(t - t0, top.w, setup.list[placed].period, setup.list[placed].fromRight);
    function drop(timedOut = false) {
      if (busy || ended || runner.paused || !mover) return;
      busy = true;
      tapHint.classList.add('gone');
      const x = moverX(runner.now()),
        w = top.w,
        res = timedOut ? { miss: true } : stackDrop(top, x, w, setup.perfect),
        node = mover;
      mover = null;
      node.classList.remove('mover');
      if (res.miss) {
        node.classList.add('fall');
        snd.bad();
        pulse(field, 'mg-shake');
        ended = true;
        runner.after(850, () => ctx.done(stackGrade({ placed }, setup)));
        return;
      }
      node.style.left = `${res.x * 100}%`;
      node.style.width = `${res.w * 100}%`;
      node.style.bottom = `${FLOOR + (placed + 1) * ROW}%`;
      node.classList.add('landed');
      if (res.cut > 0.004) {
        // el trozo que sobra se desprende
        const cx = res.cutSide === 'left' ? x : res.x + res.w;
        const scrap = block(cx, res.cut, placed + 1, `scrap ${res.cutSide}`);
        world.appendChild(scrap);
        setTimeout(() => scrap.remove(), 700);
      }
      placed++;
      top = { x: res.x, w: res.w };
      const yPct = 100 - (FLOOR + (placed + 0.5) * ROW - Math.max(0, placed - 1 - VISIBLE) * ROW);
      if (res.perfect) {
        snd.great();
        floatText(field, (res.x + res.w / 2) * 100, yPct - 6, '¡Perfecto!', 'gold');
        ring(field, (res.x + res.w / 2) * 100, yPct, 'gold');
        sparks(field, (res.x + res.w / 2) * 100, yPct, 10);
      } else {
        snd.clank();
        snd.good(placed);
        sparks(field, (res.x + res.w / 2) * 100, yPct, 5);
      }
      paint();
      if (placed >= setup.blocks) {
        ended = true;
        field.querySelector('.mg-stack').classList.add('complete');
        runner.after(700, () => ctx.done(stackGrade({ placed }, setup)));
        return;
      }
      runner.after(260, spawn);
    }
    ctx.listen(field, 'pointerdown', (e) => {
      e.preventDefault();
      drop();
    });
    ctx.listen(document, 'keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        drop();
      }
    });
    function frame(t) {
      if (!mover || busy) return;
      mover.style.left = `${moverX(t) * 100}%`;
      if (t - t0 > setup.list[placed].period * 6) drop(true); // seis vaivenes sin tocar: el lingote se enfría y se pierde
    }
    return {
      start() {
        paint();
        runner.onFrame(frame);
        spawn();
      },
      grade: () => stackGrade({ placed }, setup),
    };
  },
};

/**
 * Minijuegos de Juth (memoria y runas): parejas, secuencia de estrellas y cubiletes.
 * Cada juego exporta `mount(ctx)` y devuelve { start(), grade() }. La lógica y la nota viven en src/game/minigames.js.
 */
import {
  SIMON_PADS,
  pairsClose,
  pairsFound,
  pairsGrade,
  pairsOver,
  pairsState,
  pairsTap,
  shellGrade,
  shellTrack,
  simonGrade,
  simonLength,
  simonState,
  simonTap,
} from '../../game/minigames.js';
import { floatText, pulse, ring, snd, sparks } from './kit.js';

/* Diez runas inventadas (trazos gruesos, muy distintas entre sí) y su tinta: cada pareja se reconoce por forma Y por color. */
const RUNES = [
  'M11 4v24M11 8l11-4M11 16l11-4',
  'M9 28V5l14 10v13',
  'M10 4v24M10 9l12 7-12 7',
  'M10 28V4l12 6-12 7 12 11',
  'M23 5 9 16l14 11',
  'M7 5l18 22M25 5 7 27',
  'M9 4v24M23 4v24M9 11l14 10',
  'M16 4l10 9-10 9-10-9zM9 28l7-6 7 6',
  'M16 28V4M16 16 7 5M16 16l9-11',
  'M7 5v22L25 5v22z',
];
const INKS = [
  '#c2402a',
  '#1f7f96',
  '#6c4893',
  '#4f7a23',
  '#b9770f',
  '#2f4f9c',
  '#a8375c',
  '#16806a',
  '#7d4a1c',
  '#3b3f52',
];
const rune = (i) =>
  `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="${RUNES[i]}" fill="none" stroke="${INKS[i]}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const BACK =
  '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4l3.2 8.8L28 16l-8.8 3.2L16 28l-3.2-8.8L4 16l8.8-3.2z" fill="#d7c3ff" stroke="#150e0c" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="16" r="2.6" fill="#6c4893"/></svg>';
const STAR =
  '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2.5l4 8.6 9.4 1.2-6.9 6.5 1.8 9.3L16 23.5l-8.3 4.6 1.8-9.3-6.9-6.5L12 11.1z" fill="#ffd24a" stroke="#150e0c" stroke-width="2.2" stroke-linejoin="round"/><path d="M12.5 13.5l3.5-6" stroke="#fff6c9" stroke-width="2" stroke-linecap="round"/></svg>';

/* ═════════════ El Códice de los Nombres ═════════════ */

export const pairsGame = {
  rule: 'Encuentra las parejas de runas.',
  dos: [
    { ok: true, art: rune(2), text: 'Pocos fallos: más estrellas' },
    { ok: false, art: rune(5), text: 'Demasiados fallos: se acaba' },
  ],
  hint: 'Primero las verás todas un instante.',
  demo: `<div class="demo demo-pairs"><i class="d-card a"><b>${rune(0)}</b></i><i class="d-card b"><b>${rune(0)}</b></i><i class="d-card c"><b>${rune(5)}</b></i><i class="d-hand"></i></div>`,
  mount(ctx) {
    const { field, setup, runner, hud } = ctx;
    const state = pairsState();
    let live = false,
      busy = false;
    field.innerHTML = `<div class="mg-pairs" style="--cols:${setup.cols}">${setup.deck.map((v, i) => `<button type="button" class="pr-card" data-i="${i}" aria-label="Carta ${i + 1}, oculta"><span class="pr-inner"><span class="pr-back">${BACK}</span><span class="pr-face">${rune(v)}</span></span></button>`).join('')}</div>`;
    const cards = [...field.querySelectorAll('.pr-card')];
    const centre = (i) => {
      const r = cards[i].getBoundingClientRect(),
        f = field.getBoundingClientRect();
      return {
        x: ((r.left + r.width / 2 - f.left) / f.width) * 100,
        y: ((r.top + r.height / 2 - f.top) / f.height) * 100,
      };
    };
    function paint() {
      hud.left('Parejas', `${pairsFound(state)}/${setup.pairs}`);
      hud.right(`Fallos ${state.misses}/${setup.maxMiss}`);
      hud.bar(1 - state.misses / setup.maxMiss);
      cards.forEach((c, i) => {
        const matched = state.matched.includes(i),
          open = matched || state.open.includes(i);
        c.classList.toggle('open', open);
        c.classList.toggle('matched', matched);
        c.setAttribute(
          'aria-label',
          open ? `Runa ${setup.deck[i] + 1}${matched ? ', pareja encontrada' : ''}` : `Carta ${i + 1}, oculta`,
        );
      });
    }
    function finishSoon() {
      live = false;
      runner.after(650, () => ctx.done(pairsGrade(setup, state)));
    }
    function tap(i) {
      if (!live || busy || runner.paused) return;
      const res = pairsTap(setup, state, i);
      if (!res) return;
      snd.tap();
      paint();
      if (res.type === 'match') {
        snd.great();
        res.indices.forEach((k) => {
          const c = centre(k);
          ring(field, c.x, c.y, 'gold');
          sparks(field, c.x, c.y, 6, ['#d7c3ff', '#ffe9ad', '#a07bc6']);
          pulse(cards[k], 'pop', 420);
        });
        if (pairsOver(setup, state)) finishSoon();
      } else if (res.type === 'miss') {
        busy = true;
        snd.bad();
        res.indices.forEach((k) => pulse(cards[k], 'wrong', 420));
        hud.flash();
        runner.after(780, () => {
          pairsClose(state);
          busy = false;
          paint();
          if (pairsOver(setup, state)) finishSoon();
        });
      }
    }
    cards.forEach((c, i) => {
      ctx.listen(c, 'pointerdown', (e) => {
        e.preventDefault();
        tap(i);
      });
      ctx.listen(c, 'click', (e) => {
        if (e.detail === 0) tap(i);
      });
    });
    return {
      start() {
        hud.left('Parejas', `0/${setup.pairs}`);
        hud.right(`Fallos 0/${setup.maxMiss}`);
        ctx.say('Memoriza las runas');
        cards.forEach((c) => c.classList.add('open'));
        const t0 = runner.now();
        const off = runner.onFrame((t) => hud.bar(1 - (t - t0) / setup.peek));
        runner.after(setup.peek, () => {
          off();
          snd.whoosh();
          live = true;
          paint();
          ctx.say('Encuentra las parejas');
        });
      },
      grade: () => pairsGrade(setup, state),
    };
  },
};

/* ═════════════ El Nombre de las Estrellas ═════════════ */

const PAD_ART = [
  '<path d="M16 3l3.6 9.4L29 16l-9.4 3.6L16 29l-3.6-9.4L3 16l9.4-3.6z"/>',
  '<path d="M21 4a13 13 0 1 0 7 18A10.5 10.5 0 0 1 21 4z"/>',
  '<circle cx="16" cy="16" r="7"/><path d="M16 2v5M16 25v5M2 16h5M25 16h5M6 6l3.5 3.5M22.5 22.5 26 26M26 6l-3.5 3.5M9.5 22.5 6 26" stroke-linecap="round"/>',
  '<path d="M16 3 27 16 16 29 5 16z"/>',
];
const padArt = (i) =>
  `<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="currentColor" stroke="#150e0c" stroke-width="2.2" stroke-linejoin="round">${PAD_ART[i]}</g></svg>`;
const PAD_NAMES = ['Estrella', 'Luna', 'Sol', 'Rombo'];

export const simonGame = {
  rule: 'Mira las luces y repítelas en el mismo orden.',
  dos: [
    { ok: true, art: padArt(0), text: 'Cada ronda, una luz más' },
    { ok: false, art: padArt(3), text: 'Dos fallos: se acaba' },
  ],
  hint: 'Primero mira; después te toca a ti.',
  demo: `<div class="demo demo-simon"><i class="d-pad p0">${padArt(0)}</i><i class="d-pad p1">${padArt(1)}</i><i class="d-pad p2">${padArt(2)}</i><i class="d-pad p3">${padArt(3)}</i><i class="d-hand"></i></div>`,
  mount(ctx) {
    const { field, setup, runner, hud } = ctx;
    const state = simonState();
    let phase = 'idle';
    field.innerHTML = `<div class="mg-simon" data-phase="show">${Array.from({ length: SIMON_PADS }, (_, i) => `<button type="button" class="sm-pad pad-${i}" data-pad="${i}" aria-label="${PAD_NAMES[i]}">${padArt(i)}</button>`).join('')}<div class="sm-core"><b></b><small></small></div></div>`;
    const root = field.querySelector('.mg-simon'),
      pads = [...field.querySelectorAll('.sm-pad')],
      core = field.querySelector('.sm-core b'),
      coreSub = field.querySelector('.sm-core small');
    const centre = (i) => ({ x: i % 2 ? 73 : 27, y: i < 2 ? 27 : 73 });
    const light = (i, ms) => {
      pads[i].classList.add('lit');
      snd.bell(i, 1, 0.12);
      runner.after(ms, () => pads[i].classList.remove('lit'));
    };
    function paint() {
      hud.left('Ronda', `${Math.min(setup.rounds, state.round + 1)}/${setup.rounds}`);
      hud.bar(state.round / setup.rounds, 'fill');
      core.textContent = String(simonLength(setup, state));
      root.dataset.phase = phase;
    }
    async function show() {
      phase = 'show';
      paint();
      coreSub.textContent = 'Mira';
      ctx.say('Mira la secuencia');
      await runner.wait(700);
      const n = simonLength(setup, state);
      for (let k = 0; k < n; k++) {
        light(setup.sequence[k], setup.show);
        await runner.wait(setup.show + 170);
      }
      phase = 'input';
      paint();
      coreSub.textContent = 'Repite';
      ctx.say('Tu turno: repite el orden');
    }
    async function tap(i) {
      if (phase !== 'input' || runner.paused) return;
      const out = simonTap(setup, state, i);
      if (!out) return;
      const c = centre(i);
      if (out === 'retry' || out === 'fail') {
        phase = 'wait';
        paint();
        snd.bad();
        pulse(pads[i], 'wrong', 420);
        pulse(field, 'mg-shake');
        if (out === 'fail') {
          ctx.say('Se rompió la secuencia');
          await runner.wait(800);
          ctx.done(simonGrade(state));
          return;
        }
        coreSub.textContent = 'Otra vez';
        floatText(field, 50, 40, 'Última oportunidad', 'bad');
        await runner.wait(1000);
        show();
        return;
      }
      light(i, 220);
      ring(field, c.x, c.y);
      if (out === 'step') return;
      phase = 'wait';
      paint();
      snd.great();
      sparks(field, 50, 50, 12, ['#d7c3ff', '#ffe9ad', '#8fd8ff', '#ffb0a0']);
      floatText(field, 50, 40, out === 'win' ? '¡Perfecto!' : '¡Bien!', 'gold');
      await runner.wait(850);
      if (out === 'win') ctx.done(simonGrade(state));
      else show();
    }
    pads.forEach((p, i) => {
      ctx.listen(p, 'pointerdown', (e) => {
        e.preventDefault();
        tap(i);
      });
      ctx.listen(p, 'click', (e) => {
        if (e.detail === 0) tap(i);
      });
    });
    ctx.listen(document, 'keydown', (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= SIMON_PADS && !e.repeat) {
        e.preventDefault();
        tap(n - 1);
      }
    });
    return {
      start() {
        show();
      },
      grade: () => simonGrade(state),
    };
  },
};

/* ═════════════ El Sello Errante ═════════════ */

const CUP =
  '<svg viewBox="0 0 60 70" preserveAspectRatio="none" aria-hidden="true"><path d="M9 64 17 13q1.5-9 13-9t13 9l8 51z" fill="#8b5fb8" stroke="#150e0c" stroke-width="3" stroke-linejoin="round"/><path d="M15 55 21 15q1-5 6-6" stroke="#c9a8ef" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M13 46h34" stroke="#4d2d73" stroke-width="3"/><path d="M30 22l2.4 5.6 5.6 2.4-5.6 2.4L30 38l-2.4-5.6-5.6-2.4 5.6-2.4z" fill="#ffe9ad" stroke="#150e0c" stroke-width="1.6" stroke-linejoin="round"/><rect x="4" y="60" width="52" height="7.5" rx="3.6" fill="#e6b04a" stroke="#150e0c" stroke-width="2.6"/></svg>';

export const shellGame = {
  rule: 'Sigue con la vista el cubilete de la estrella.',
  dos: [
    { ok: true, art: STAR, text: 'Aciertas: +1 estrella' },
    { ok: false, art: '<i class="chip-cup"></i>', text: 'Cada ronda, más rápido' },
  ],
  hint: 'Cuando paren, toca el que la esconde.',
  demo: `<div class="demo demo-shell"><i class="d-star">${STAR}</i><i class="d-cup a">${CUP}</i><i class="d-cup b">${CUP}</i><i class="d-cup c">${CUP}</i></div>`,
  mount(ctx) {
    const { field, setup, runner, hud } = ctx;
    const n = setup.cups,
      pos = (slot) => ((slot + 0.5) * 100) / n;
    field.innerHTML = `<div class="mg-shell" style="--cups:${n}"><div class="sh-table"></div><i class="sh-star">${STAR}</i>${Array.from({ length: n }, (_, i) => `<button type="button" class="sh-cup" data-cup="${i}" style="left:${pos(i)}%" aria-label="Cubilete ${i + 1}"><span class="sh-body">${CUP}</span></button>`).join('')}</div>`;
    const root = field.querySelector('.mg-shell'),
      star = field.querySelector('.sh-star'),
      cups = [...field.querySelectorAll('.sh-cup')];
    const cupAt = Array.from({ length: n }, (_, i) => i); // qué cubilete hay en cada posición
    let round = 0,
      hits = 0,
      picking = false,
      answer = 0;
    const paint = () => {
      hud.left('Ronda', `${Math.min(setup.rounds, round + 1)}/${setup.rounds}`);
      hud.right(`Aciertos ${hits}`);
      hud.bar(round / setup.rounds, 'fill');
    };
    const lift = (slot, on) => cups[cupAt[slot]].classList.toggle('lift', on);
    const showStar = (slot, on) => {
      star.style.left = `${pos(slot)}%`;
      star.classList.toggle('show', on);
    };
    async function play() {
      const R = setup.list[round];
      picking = false;
      root.classList.remove('pick');
      paint();
      ctx.say('Mira dónde se esconde la estrella');
      await runner.wait(450);
      showStar(R.star, true);
      lift(R.star, true);
      snd.bell(2, 1, 0.09);
      await runner.wait(1150);
      lift(R.star, false);
      await runner.wait(380);
      showStar(R.star, false);
      ctx.say('¡No la pierdas de vista!');
      root.style.setProperty('--swap', `${R.ms}ms`);
      for (const [a, b] of R.swaps) {
        const ca = cups[cupAt[a]],
          cb = cups[cupAt[b]];
        ca.style.left = `${pos(b)}%`;
        cb.style.left = `${pos(a)}%`;
        pulse(ca, 'arc-up', R.ms);
        pulse(cb, 'arc-down', R.ms);
        snd.whoosh();
        [cupAt[a], cupAt[b]] = [cupAt[b], cupAt[a]];
        await runner.wait(R.ms + 70);
      }
      answer = shellTrack(R.star, R.swaps);
      picking = true;
      root.classList.add('pick');
      ctx.say('¿Dónde está la estrella? Toca un cubilete');
    }
    async function pick(cupId) {
      if (!picking || runner.paused) return;
      picking = false;
      root.classList.remove('pick');
      const slot = cupAt.indexOf(cupId),
        ok = slot === answer;
      lift(slot, true);
      showStar(answer, true);
      if (ok) {
        hits++;
        snd.great();
        ring(field, pos(slot), 62, 'gold');
        sparks(field, pos(slot), 62, 12, ['#ffd24a', '#fff6c9', '#d7c3ff']);
        floatText(field, pos(slot), 34, '¡Ahí está!', 'gold');
      } else {
        snd.bad();
        pulse(field, 'mg-shake');
        floatText(field, pos(slot), 34, 'Vacío', 'bad');
        await runner.wait(450);
        lift(answer, true);
      }
      round++;
      paint();
      await runner.wait(1150);
      for (let s = 0; s < n; s++) lift(s, false);
      await runner.wait(380);
      showStar(answer, false);
      if (round >= setup.rounds) ctx.done(shellGrade({ hits }));
      else play();
    }
    cups.forEach((c, i) => {
      ctx.listen(c, 'pointerdown', (e) => {
        e.preventDefault();
        pick(i);
      });
      ctx.listen(c, 'click', (e) => {
        if (e.detail === 0) pick(i);
      });
    });
    ctx.listen(document, 'keydown', (e) => {
      const k = Number(e.key);
      if (k >= 1 && k <= n && !e.repeat) {
        e.preventDefault();
        pick(cupAt[k - 1]);
      }
    });
    return {
      start() {
        play();
      },
      grade: () => shellGrade({ hits }),
    };
  },
};

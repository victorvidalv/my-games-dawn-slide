import { slideRange, snapDrag } from '../engine/board.js';
import { tone, vib } from '../audio/sound.js';
import { $, cssUrl } from '../dom.js';
import { saveRun } from '../game/session.js';
import { S, heroOf } from '../state.js';
import { zoneIdx } from '../data/zones.js';
import { BESTMOVE, GAME_SYMBOLS, SEQUENCE, SPRINT, bestMoveCurrent, bestMovePick, bonusIndex, claimBonus, ensureBonusPlan, earnedPart, finishBonus, gameFor, maxPrize, memoryDone, memoryTap, recordTiming, sequenceTap, sprintCurrent, sprintMove, sprintStart, sprintTimeout, timingPosition } from '../game/minigames.js';
import { heroArt } from './story.js';
import { icon } from './icons.js';
export { isBonusLevel } from '../game/minigames.js';

// Reduced motion removes decorative transitions, never the time needed to read or remember.
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const rules = {
  memory: 'Encuentra las 4 parejas. Toca dos cartas.',
  sequence: 'Mira las luces y repítelas en el mismo orden.',
  timing: 'Toca SELLAR cuando la marca esté en la zona dorada.',
  sprint: 'Resuelve 3 tableros miniatura en pocos segundos.',
  bestmove: 'Observa el tablero y elige la única jugada que acerca la salida.',
};
const fmt = n => `${n} pista${n === 1 ? '' : 's'}`;
const sounds = [392, 494, 587, 784];
const OPT_LETTERS = ['A', 'B', 'C'];

function renderMiniBoard(host, pieces, pos, { draggable = false, onMove, highlight = null } = {}) {
  host.innerHTML = '<div class="mini-board-grid"><div class="mini-slot-row"></div></div>';
  const grid = host.querySelector('.mini-board-grid');
  const cell = () => grid.clientWidth / 6;
  const els = pieces.map((p, i) => {
    const el = document.createElement('div');
    const cIdx = i === 0 ? 'red' : `c${(i + 1) % 7}`;
    const optMark = highlight?.get(i);
    el.className = `mini-piece ${p.o} ${cIdx}${optMark ? ' has-opt' : ''}`;
    el.innerHTML = `<div class="mini-face"></div>${optMark ? `<span class="mini-opt-badge">${optMark.label}</span>` : ''}`;
    grid.appendChild(el);
    return el;
  });
  const placeAll = () => {
    const s = cell();
    pieces.forEach((p, i) => {
      const el = els[i];
      el.style.width = `${(p.o === 'h' ? p.len : 1) * s}px`;
      el.style.height = `${(p.o === 'v' ? p.len : 1) * s}px`;
      el.style.left = `${(p.o === 'h' ? pos[i] : p.fix) * s}px`;
      el.style.top = `${(p.o === 'v' ? pos[i] : p.fix) * s}px`;
    });
  };
  placeAll();
  if (draggable && onMove) {
    pieces.forEach((p, i) => {
      const el = els[i];
      el.classList.add('is-live');
      el.addEventListener('pointerdown', e => {
        if (!draggable()) return;
        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
        const s = cell(), [lo, hi] = slideRange(pieces, pos, i), x0 = pos[i], start = p.o === 'h' ? e.clientX : e.clientY;
        el.classList.add('drag');
        let cur = x0, delta = 0, lastC = x0, done = false;
        const move = ev => {
          if (ev.pointerId !== e.pointerId) return;
          delta = ((p.o === 'h' ? ev.clientX : ev.clientY) - start) / s;
          cur = Math.max(lo, Math.min(hi, x0 + delta));
          el.style[p.o === 'h' ? 'left' : 'top'] = `${cur * s}px`;
          const c = Math.round(cur);
          if (c !== lastC) { lastC = c; vib(4); }
        };
        const end = commit => {
          if (done) return; done = true;
          for (const t of ['pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) el.removeEventListener(t, handlers[t]);
          try { el.releasePointerCapture(e.pointerId); } catch (_) {}
          el.classList.remove('drag');
          const x = commit ? snapDrag(x0, lo, hi, delta, p.kind) : x0;
          if (x !== x0) pos[i] = x;
          placeAll();
          if (x !== x0) onMove(i, x);
        };
        const handlers = { pointermove: move, pointerup: ev => { if (ev.pointerId === e.pointerId) end(true); }, pointercancel: () => end(false), lostpointercapture: () => end(false) };
        for (const t in handlers) el.addEventListener(t, handlers[t]);
      });
    });
  }
  return { grid, els, placeAll };
}

export function showBonus() {
  const run = S.run, plan = ensureBonusPlan(run), hero = heroOf(plan.hero), symbols = GAME_SYMBOLS[hero.id];
  if (plan.phase !== 'done') { plan.phase = 'ready'; plan.input = 0; }
  if (plan.flipped.length === 2) plan.flipped = [];
  saveRun();
  return new Promise(resolve => {
    const modal = $('bonus'), stage = $('bStage'), action = $('bAction'), go = $('bGo'), leave = $('bLeave');
    modal.dataset.hero = hero.id; modal.dataset.game = plan.kind;
    modal.style.setProperty('--mini-accent', hero.color);
    modal.style.setProperty('--mini-scene', cssUrl(`backgrounds/zone-${zoneIdx(plan.level) + 1}.webp`));
    $('bTag').textContent = `${hero.name} · Parada ${bonusIndex(plan.level) + 1} de 9`;
    $('bTitle').textContent = gameFor(hero.id, plan.level).title;
    $('bSub').textContent = rules[plan.kind];
    $('bHero').innerHTML = `<img src="${heroArt(hero.id, 'story')}" alt="${hero.name}">`;
    $('bSpeech').textContent = { lia: '«La brasa también necesita un respiro.»', jean: '«Tenemos un instante. Aprovechémoslo.»', van: '«Hasta las runas descansan entre páginas.»' }[hero.id];
    $('bHints').textContent = run.hints;
    $('bLegend').textContent = `Premio: 1–${maxPrize(plan.level, plan.start)} pistas · Sin perder tu reserva`;
    $('bRes').replaceChildren(); stage.replaceChildren(); stage.className = `bonus-stage mini-${plan.kind}`;
    action.hidden = plan.kind === 'memory' || plan.kind === 'bestmove'; action.disabled = false;
    go.hidden = true; go.disabled = false; leave.hidden = false;
    let busy = false, ended = false, token = 0, raf = 0, t0 = 0;
    const alive = () => S.run === run && run.bonusPlan === plan && !ended;
    const status = text => { $('bState').textContent = text; };
    const play = i => { tone(sounds[i], .16, 'triangle', .045); vib(6); };
    function finish(restore = false) {
      if (ended) return; ended = true; token++; cancelAnimationFrame(raf);
      const prize = finishBonus(plan); saveRun();
      stage.querySelectorAll('button').forEach(b => b.disabled = true);
      action.hidden = true; leave.hidden = true; go.hidden = false;
      $('bRes').innerHTML = `<b>+${fmt(prize)}</b><span>${earnedPart(plan) === 3 ? 'Dominio perfecto' : 'Luz para el camino'}</span>`;
      $('bHints').textContent = run.hints + prize; status('Reto terminado');
      if (!restore) { tone(523, .18, 'triangle', .05); tone(784, .25, 'sine', .04, .12); }
      go.textContent = 'Recoger y continuar'; go.focus();
    }
    const stats = (left, right) => `<div class="mini-stats"><span>${left}</span><span>${right}</span></div>`;
    const save = () => { if (S.run === run) saveRun(); };
    const restore = plan.prize !== undefined;

    if (plan.kind === 'memory') {
      stage.innerHTML = `${stats('<b id="mPairs">0</b>/4 parejas', '<b id="mMisses">0</b>/6 errores')}<div class="memory-grid"></div>`;
      const grid = stage.querySelector('.memory-grid');
      const cards = plan.deck.map((value, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'memory-card';
        b.innerHTML = `<span class="memory-back">${icon(hero.icon)}</span><span class="memory-face">${icon(symbols[value].icon)}<small>${symbols[value].name}</small></span>`;
        b.onclick = async () => {
          if (busy || !alive()) return;
          const result = memoryTap(plan, i); if (!result) return;
          play(value); render(); save();
          if (result.type === 'miss') {
            busy = true; status('No son pareja. Recuerda su lugar.');
            await wait(750); if (!alive()) return; plan.flipped = []; busy = false; render(); save();
          } else if (result.type === 'match') status('Pareja encontrada');
          else status('Elige otra carta');
          if (memoryDone(plan)) finish();
        };
        grid.appendChild(b); return b;
      });
      function render() {
        $('mPairs').textContent = plan.matched.length / 2; $('mMisses').textContent = plan.mistakes;
        cards.forEach((b, i) => {
          const matched = plan.matched.includes(i), face = matched || plan.flipped.includes(i);
          b.classList.toggle('revealed', face); b.classList.toggle('matched', matched); b.disabled = matched;
          b.setAttribute('aria-label', face ? `${symbols[plan.deck[i]].name}${matched ? ', pareja encontrada' : ''}` : `Carta ${i + 1}, oculta`);
        });
      }
      render(); status('Encuentra la primera pareja');
      if (!restore && memoryDone(plan)) finish();

    } else if (plan.kind === 'sequence') {
      stage.innerHTML = `${stats('Rondas <b id="sRound">0</b>/3', 'Errores <b id="sErrors">0</b>/2')}<div class="sequence-grid">${symbols.map((s, i) => `<button type="button" class="sequence-pad pad-${i}" data-pad="${i}" aria-label="${s.name}">${icon(s.icon)}<span>${s.name}</span><b>${i + 1}</b></button>`).join('')}</div><div id="sProgress" class="sequence-progress"></div>`;
      const pads = [...stage.querySelectorAll('.sequence-pad')];
      function render() {
        $('sRound').textContent = plan.round; $('sErrors').textContent = plan.mistakes;
        $('sProgress').textContent = plan.phase === 'input' ? `${plan.input}/${SEQUENCE.lengths[plan.round]} pasos` : 'Observa, recuerda y repite';
        pads.forEach(b => b.disabled = plan.phase !== 'input' || ended);
        action.textContent = plan.mistakes ? 'Ver de nuevo' : plan.round ? 'Siguiente secuencia' : 'Ver secuencia';
        action.hidden = plan.phase === 'watch' || plan.phase === 'input' || ended;
      }
      action.onclick = async () => {
        if (busy || !alive() || plan.phase !== 'ready') return;
        busy = true; const local = ++token; plan.phase = 'watch'; plan.input = 0; render(); save(); status('Mira la secuencia');
        await wait(450);
        for (const value of plan.sequence.slice(0, SEQUENCE.lengths[plan.round])) {
          if (!alive() || local !== token) return;
          pads[value].classList.add('lit'); play(value);
          await wait(500); pads[value].classList.remove('lit'); await wait(160);
        }
        if (!alive() || local !== token) return;
        plan.phase = 'input'; busy = false; render(); save(); status('Tu turno: repite el orden'); pads[0].focus();
      };
      pads.forEach((b, i) => b.onclick = async () => {
        if (busy || !alive()) return;
        const result = sequenceTap(plan, i); if (!result) return;
        b.classList.add(result === 'miss' ? 'wrong' : 'lit'); play(i); save(); render();
        if(result === 'step'){setTimeout(()=>b.classList.remove('lit'),160);return;}
        if (result !== 'step') {
          busy = true; action.disabled = true; status(result === 'miss' ? 'Otro intento. Puedes volver a mirar.' : 'Secuencia completada');
          await wait(350); busy = false; action.disabled = false;
        }
        b.classList.remove('lit', 'wrong');
        if (!alive()) return;
        if (plan.phase === 'done') finish(); else render();
      });
      render(); status('Pulsa Ver secuencia cuando estés listo');

    } else if (plan.kind === 'sprint') {
      stage.innerHTML = `${stats('Resueltos <b id="spSolved">0</b>/3', '<b id="spTime">10.0s</b>')}<div class="sprint-timer"><i id="spBar"></i></div><div class="mini-board-host" id="spBoard"></div><div class="mini-pips" id="spPips"></div>`;
      const host = $('spBoard');
      let timerStop = 0;
      const drawSprint = () => {
        const solved = plan.sprintSolved || 0;
        const round = plan.sprintRound || 0;
        $('spSolved').textContent = solved;
        $('spPips').innerHTML = Array.from({ length: SPRINT.rounds }, (_, i) => {
          const r = plan.sprintResults?.[i];
          return `<span class="${r === true ? 'hit' : r === false ? 'miss' : i === round ? 'cur' : ''}">${i + 1}</span>`;
        }).join('');
        const { pieces, pos } = sprintCurrent(plan);
        renderMiniBoard(host, pieces, pos, {
          draggable: () => plan.phase === 'running' && !busy && !ended && alive(),
          onMove: async (pi, to) => {
            vib(6); tone(sounds[pi % 4], .08, 'triangle', .035);
            const res = sprintMove(plan, pi, to);
            if (!res) return;
            save();
            if (res.won) {
              cancelAnimationFrame(raf); busy = true; vib([16, 20, 24]);
              tone(587, .14, 'triangle', .05); tone(880, .18, 'sine', .04, .08);
              status('¡Tablero resuelto!');
              await wait(480); busy = false;
              if (!alive()) return;
              if (res.done) finish(); else { drawSprint(); status('Pulsa Siguiente tablero'); }
            }
          },
        });
        const locked = plan.phase !== 'running';
        host.classList.toggle('board-locked', locked);
        if (locked) { $('spTime').textContent = `${SPRINT.seconds}.0s`; $('spBar').style.width = '100%'; }
        action.textContent = round ? 'Siguiente tablero' : 'Comenzar tablero';
        action.hidden = !locked || ended;
      };
      const tickSprint = () => {
        if (!alive() || plan.phase !== 'running' || ended) return;
        const left = Math.max(0, (timerStop - performance.now()) / 1000);
        $('spTime').textContent = `${left.toFixed(1)}s`;
        $('spBar').style.width = `${(left / SPRINT.seconds) * 100}%`;
        if (left <= 0) {
          const res = sprintTimeout(plan); save(); vib([30, 30]); tone(196, .22, 'sawtooth', .04);
          status('Tiempo agotado en este tablero');
          if (!res) return;
          if (res.done) finish(); else drawSprint();
          return;
        }
        raf = requestAnimationFrame(tickSprint);
      };
      action.onclick = () => {
        if (busy || !alive() || plan.phase !== 'ready') return;
        sprintStart(plan); timerStop = performance.now() + SPRINT.seconds * 1000;
        vib(8); drawSprint(); save(); status('¡Desliza la llave roja hasta la salida ➜!');
        tickSprint();
      };
      drawSprint(); status('Tres tableros cortos de 3 movimientos. Sin prisas para empezar.');

    } else if (plan.kind === 'bestmove') {
      stage.innerHTML = `${stats('Aciertos <b id="bmHits">0</b>/3', 'Ronda <b id="bmRound">1</b>/3')}<div class="mini-board-host" id="bmBoard"></div><div class="bestmove-opts" id="bmOpts"></div>`;
      const host = $('bmBoard'), optsHost = $('bmOpts');
      const dirArrow = (p, from, to) => p.o === 'h' ? (to > from ? '→' : '←') : (to > from ? '↓' : '↑');
      const dirText = (p, from, to) => `${dirArrow(p, from, to)} ${Math.abs(to - from)}`;
      const drawBestMove = () => {
        $('bmHits').textContent = plan.bestHits || 0;
        $('bmRound').textContent = Math.min(BESTMOVE.rounds, (plan.bestRound || 0) + 1);
        const cur = bestMoveCurrent(plan);
        const map = new Map();
        cur.options.forEach((o, idx) => map.set(o.i, { label: OPT_LETTERS[idx], opt: o }));
        const { els } = renderMiniBoard(host, cur.pieces, cur.pos, { highlight: map });
        optsHost.innerHTML = '';
        const pickOpt = async idx => {
          if (busy || !alive()) return;
          busy = true;
          const res = bestMovePick(plan, idx);
          if (!res) { busy = false; return; }
          const buttons = [...optsHost.querySelectorAll('button')];
          buttons.forEach((b, k) => {
            b.disabled = true;
            if (k === res.bestIdx) b.classList.add('is-right');
            else if (k === idx && !res.hit) b.classList.add('is-wrong');
          });
          if (res.hit) { tone(659, .18, 'triangle', .05); vib([12, 16]); status('¡Jugada óptima!'); }
          else { tone(196, .2, 'sawtooth', .045); vib([26, 26]); status(`La óptima era ${OPT_LETTERS[res.bestIdx]}`); }
          const s = host.querySelector('.mini-board-grid').clientWidth / 6;
          const p = cur.pieces[cur.options[res.bestIdx].i];
          els[cur.options[res.bestIdx].i].style[p.o === 'h' ? 'left' : 'top'] = `${cur.options[res.bestIdx].to * s}px`;
          save();
          await wait(700); busy = false;
          if (!alive()) return;
          if (res.done) finish(); else { drawBestMove(); status('Elige la pieza que abre el camino más corto'); }
        };
        cur.options.forEach((o, idx) => {
          const p = cur.pieces[o.i];
          const btn = document.createElement('button');
          btn.type = 'button'; btn.className = 'bestmove-btn';
          btn.innerHTML = `<b>${OPT_LETTERS[idx]}</b><span>${dirText(p, cur.pos[o.i], o.to)}</span>`;
          btn.onmouseenter = () => els[o.i]?.classList.add('opt-focus');
          btn.onmouseleave = () => els[o.i]?.classList.remove('opt-focus');
          btn.onclick = () => pickOpt(idx);
          optsHost.appendChild(btn);
          els[o.i].style.cursor = 'pointer';
          els[o.i].onclick = () => pickOpt(idx);
        });
      };
      drawBestMove(); status('¿Qué movimiento acerca más rápido la llave roja?');

    } else {
      stage.innerHTML = `${stats('Sellos <b id="tRound">0</b>/3', '<b id="tScore">0</b> puntos')}<div class="timing-emblem">${icon(hero.icon)}</div><div class="timing-track" aria-label="Zona dorada en el centro"><span class="timing-zone"><i></i></span><b id="timingMarker"></b></div><div class="timing-labels"><span>Zona dorada</span><b>Centro: doble</b></div><div class="timing-hits" id="timingHits"></div>`;
      const marker = $('timingMarker');
      function render() {
        $('tRound').textContent = plan.hits.length; $('tScore').textContent = plan.hits.reduce((a, b) => a + b, 0);
        $('timingHits').innerHTML = Array.from({ length: 3 }, (_, i) => `<span class="${plan.hits[i] === undefined ? '' : plan.hits[i] === 2 ? 'perfect' : plan.hits[i] ? 'hit' : 'miss'}">${plan.hits[i] === undefined ? i + 1 : plan.hits[i] === 2 ? '2' : plan.hits[i] ? '1' : '0'}</span>`).join('');
        action.textContent = plan.phase === 'running' ? '¡SELLAR!' : plan.hits.length ? 'Siguiente sello' : 'Comenzar';
      }
      function sweep() { if (!alive() || plan.phase !== 'running') return; marker.style.left = `${timingPosition(performance.now() - t0) * 100}%`; raf = requestAnimationFrame(sweep); }
      async function press() {
        if (busy || !alive()) return;
        if (plan.phase === 'ready') { plan.phase = 'running'; t0 = performance.now(); render(); save(); status('Toca cuando la marca cruce el oro'); sweep(); return; }
        if (plan.phase !== 'running') return;
        const elapsed = performance.now() - t0; cancelAnimationFrame(raf); marker.style.left = `${timingPosition(elapsed) * 100}%`;
        const points = recordTiming(plan, elapsed); render(); save(); play(points);
        status(points === 2 ? '¡Centro perfecto! +2' : points ? '¡Dentro de la zona! +1' : 'Fuera de la zona. Queda otra oportunidad.');
        busy = true; action.disabled = true; await wait(450); busy = false; action.disabled = false;
        if (!alive()) return; if (plan.phase === 'done') finish(); else render();
      }
      action.onpointerdown = e => { e.preventDefault(); press(); };
      action.onclick = e => { if (e.detail === 0) press(); };
      stage.querySelector('.timing-track').onpointerdown = e => { e.preventDefault(); if (plan.phase === 'running') press(); };
      render(); status('Tres intentos. Sin prisas para empezar.');
    }

    function suspend() {
      if (!document.hidden || !alive()) return;
      if (plan.phase === 'watch' || plan.phase === 'input' || plan.phase === 'running') {
        token++; cancelAnimationFrame(raf); busy = false; plan.phase = 'ready'; plan.input = 0; plan.sprintPos = null; save();
        action.disabled = false; action.hidden = plan.kind === 'memory' || plan.kind === 'bestmove';
        action.textContent = plan.kind === 'timing' ? 'Reanudar sello' : plan.kind === 'sprint' ? 'Reanudar tablero' : 'Ver secuencia';
        if(plan.kind==='sequence')stage.querySelectorAll('.sequence-pad').forEach(b=>b.disabled=true);
        stage.querySelectorAll('.lit,.wrong').forEach(b => b.classList.remove('lit', 'wrong')); status('En pausa. Continúa cuando quieras.');
      }
    }
    document.addEventListener('visibilitychange', suspend);
    modal.onkeydown = e => {
      if (e.key !== 'Tab') return;
      const buttons = [...modal.querySelectorAll('button')].filter(b => !b.disabled && !b.hidden && b.getClientRects().length);
      if (!buttons.length) return;
      if (e.shiftKey && document.activeElement === buttons[0]) { e.preventDefault(); buttons.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === buttons.at(-1)) { e.preventDefault(); buttons[0].focus(); }
    };
    leave.onclick = () => { if (alive()) finish(); };
    go.onclick = () => {
      if (go.disabled || plan.prize === undefined) return;
      go.disabled = true; token++; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', suspend);
      const prize = claimBonus(run); saveRun(); modal.classList.remove('show');
      action.onclick = action.onpointerdown = null; modal.onkeydown = null; resolve(prize);
    };
    modal.classList.add('show');
    if (restore || plan.phase === 'done') finish(restore);
    else if (!ended) (plan.kind === 'memory' ? stage.querySelector('button:not(:disabled)') : action)?.focus();
  });
}

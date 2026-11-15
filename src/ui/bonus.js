import { tone, vib } from '../audio/sound.js';
import { $, cssUrl } from '../dom.js';
import { saveRun } from '../game/session.js';
import { S, heroOf } from '../state.js';
import { zoneIdx } from '../data/zones.js';
import { GAME_SYMBOLS, SEQUENCE, bonusIndex, claimBonus, ensureBonusPlan, earnedPart, finishBonus, gameFor, maxPrize, memoryDone, memoryTap, recordTiming, sequenceTap, timingPosition } from '../game/minigames.js';
import { heroArt } from './story.js';
import { icon } from './icons.js';
export { isBonusLevel } from '../game/minigames.js';

// Reduced motion removes decorative transitions, never the time needed to read or remember.
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const rules = { memory: 'Encuentra las 4 parejas. Toca dos cartas.', sequence: 'Mira las luces y repítelas en el mismo orden.', timing: 'Toca SELLAR cuando la marca esté en la zona dorada.' };
const fmt = n => `${n} pista${n === 1 ? '' : 's'}`;
const sounds = [392, 494, 587, 784];

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
    action.hidden = plan.kind === 'memory'; action.disabled = false;
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
        token++; cancelAnimationFrame(raf); busy = false; plan.phase = 'ready'; plan.input = 0; save();
        action.disabled = false; action.hidden = false; action.textContent = plan.kind === 'timing' ? 'Reanudar sello' : 'Ver secuencia';
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

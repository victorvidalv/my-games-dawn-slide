import { sfx, vib } from '../audio/sound.js';
import { $ } from '../dom.js';
import { beginPower } from '../game/powers.js';
import { saveRun } from '../game/session.js';
import { S, heroOf } from '../state.js';
import { afterMove, cancelDrag, layout, updateHud } from './board.js';
import { icon } from './icons.js';
import { processSealMove } from './seals.js';
import { AWAKENING_MS, prepareAwakening } from './power-art.js';
import { burst } from './fx.js';

/** Chispas del color del hechizo sobre la pieza que el poder mueve, y una onda que cruza el tablero. */
function pulse(piece, colors) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !piece) return;
  const r = piece.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, 14, colors, 4);
  const board = $('board');
  board.classList.remove('wave'); void board.offsetWidth; board.classList.add('wave');
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function activatePower() {
  if (!S.run || !S.G || S.G.done || S.busy) return;
  cancelDrag();
  const action = beginPower(S.run, S.G);
  if (!action) { updateHud(); return; }
  const G = S.G, run = S.run, h = heroOf();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const board = $('board'), fx = $('heroPowerFx');
  S.busy = true; saveRun(); updateHud();
  $('bShop').disabled = true;
  const name = action.kind === 'rewind' ? 'Rebobinar' : 'Trazar destino';
  fx.dataset.hero = h.id; fx.dataset.kind = action.kind;
  let art;
  const rect=$('bPower').getBoundingClientRect();
  const height=Math.max(80,Math.min(380,rect.top-28,innerHeight-40)),width=height/2;
  fx.style.setProperty('--awakening-height',height+'px');
  fx.style.left=Math.max(width/2+12,Math.min(innerWidth-width/2-12,rect.left+rect.width/2))+'px';
  fx.style.top=Math.max(12,rect.top-height-12)+'px';
  $('powerSeal').innerHTML = icon(h.id === 'jean' ? 'clock' : 'stars');
  $('powerFxName').textContent = `${h.name} · ${name}`;
  $('powerStep').textContent = 'Poder activado';
  board.classList.add('hero-power', action.kind);
  board.setAttribute('aria-busy', 'true');
  // Sonido de poder: barrido grave + acorde brillante (hacia abajo al rebobinar, hacia arriba al trazar el destino).
  const up = action.kind !== 'rewind';
  const spell = h.id === 'van' ? ['#d1b2ec', '#ecd7ff', '#fff'] : ['#a5c8ed', '#d8eaff', '#fff'], spellColors = spell;
  sfx.power(up);
  vib([20, 30, 35]);
  try {
    try {
      art = await prepareAwakening(h.id, reduced);
      $('powerPortrait').replaceWith(art.img);
    } catch {
      // Keep the power usable if an asset failed to download.
      $('powerPortrait').src = `heroes/${h.id}-power.webp`;
    }
    fx.classList.add('show');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await wait(reduced ? 100 : AWAKENING_MS);
    // La carta sale disparada hacia el tablero y suelta chispas: el poder «viaja» hacia donde actúa.
    const br = board.getBoundingClientRect();
    if (!reduced) {
      fx.classList.add('launch');
      burst(fx.getBoundingClientRect().left + fx.offsetWidth / 2, fx.getBoundingClientRect().top + fx.offsetHeight / 2, 26, spell, 6);
      await wait(280);
      burst(br.left + br.width / 2, br.top + br.height / 2, 44, spell, 8);
    }
    fx.classList.remove('show', 'launch');
    for (let n = 0; n < action.steps.length; n++) {
      if (S.G !== G || S.run !== run || G.done) break;
      let i;
      if (action.kind === 'rewind') {
        const pos = action.steps[n];
        i = G.pos.findIndex((x, k) => x !== pos[k]);
        G.pos = pos.slice(); G.hist.pop(); G.moves = Math.max(0, G.moves - 1);
      } else {
        const step = action.steps[n]; i = step.i;
        G.hist.push(G.pos.slice()); G.pos[i] = step.to; G.moves++;processSealMove();
      }
      const piece = G.els[i];
      piece?.classList.add('power-piece');
      $('powerStep').textContent = `${action.kind === 'rewind' ? 'Pasado' : 'Destino'} · ${n + 1}/${action.steps.length}`;
      layout(); updateHud(); saveRun();
      sfx.powerStep(n, up);
      pulse(piece, spellColors);
      await wait(reduced ? 35 : 360);
      piece?.classList.remove('power-piece');
      if (action.kind === 'destiny') {
        afterMove();
        if (G.done) break;
      }
    }
    if (S.G === G && S.run === run && !G.done) {
      $('powerStep').textContent = action.kind === 'rewind' ? 'El tiempo vuelve a tus manos' : 'El destino está trazado';
      $('msg').textContent = `${name} usado. Se renueva en el próximo tablero.`;
      sfx.powerEnd(up);
      await wait(reduced ? 40 : 280);
    }
  } finally {
    art?.release();
    fx.classList.remove('show'); board.classList.remove('hero-power', 'rewind', 'destiny');
    board.removeAttribute('aria-busy'); G.els.forEach(el => el.classList.remove('power-piece'));
    if (S.G === G && S.run === run && !G.done) { S.busy = false; saveRun(); updateHud(); }
    $('bShop').disabled = false;
  }
}


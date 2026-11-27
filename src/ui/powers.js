import { reducedMotion } from './dom-utils.js';
import { sfx, vib } from '../audio/sound.js';
import { $ } from '../dom.js';
import { beginPower } from '../game/powers.js';
import { saveRun } from '../game/session.js';
import { S, heroOf, setBusy } from '../state.js';
import { afterMove, cancelDrag, layout, updateHud } from './board.js';
import { motes, warmMotes } from './fx.js';
import { countStat } from './achievements.js';

/** Chispas del color del hechizo sobre la pieza que el poder mueve, y una onda que cruza el tablero. */
function pulse(piece, colors) {
  if (reducedMotion() || !piece) return;
  const r = piece.getBoundingClientRect();
  motes(0, 0, 22, colors, 3.4, r);
  const board = $('board');
  board.classList.remove('wave');
  void board.offsetWidth;
  board.classList.add('wave');
}

/** Colores del hechizo; sus halos se preparan en un momento libre para que la descarga (160 chispas) no se trabe. */
const SPELL = { van: ['#d1b2ec', '#ecd7ff', '#fff'], jean: ['#a5c8ed', '#d8eaff', '#fff'] };
warmMotes([...new Set([...SPELL.van, ...SPELL.jean])]);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function activatePower() {
  if (!S.run || !S.G || S.G.done || S.busy) return;
  cancelDrag();
  const action = beginPower(S.run, S.G);
  if (!action) {
    updateHud();
    return;
  }
  const G = S.G,
    run = S.run,
    h = heroOf();
  const reduced = reducedMotion();
  const board = $('board');
  const name = action.kind === 'rewind' ? 'Rebobinar' : 'Trazar destino';
  setBusy(true);
  countStat('powersUsed');
  saveRun();
  updateHud();
  $('powerFxName').textContent = `${h.name} · ${name}`;
  $('powerStep').textContent = 'Poder activado';
  board.classList.add('hero-power', action.kind);
  board.dataset.hero = h.id;
  board.setAttribute('aria-busy', 'true');
  // Sin introducción: el poder actúa de inmediato. Cada pieza movida lleva su borde de poder y un golpe seco.
  const up = action.kind !== 'rewind';
  const spellColors = SPELL[h.id === 'van' ? 'van' : 'jean'];
  vib([25, 20, 40]);
  try {
    for (let n = 0; n < action.steps.length; n++) {
      if (S.G !== G || S.run !== run || G.done) break;
      let i;
      if (action.kind === 'rewind') {
        const pos = action.steps[n];
        i = G.pos.findIndex((x, k) => x !== pos[k]);
        G.pos = pos.slice();
        G.hist.pop();
        G.moves = Math.max(0, G.moves - 1);
      } else {
        const step = action.steps[n];
        i = step.i;
        G.hist.push(G.pos.slice());
        G.pos[i] = step.to;
        G.moves++;
      }
      const piece = G.els[i];
      piece?.classList.add('power-piece');
      $('powerStep').textContent =
        `${action.kind === 'rewind' ? 'Pasado' : 'Destino'} · ${n + 1}/${action.steps.length}`;
      layout();
      updateHud();
      saveRun();
      sfx.powerStep(n, up);
      pulse(piece, spellColors);
      await wait(reduced ? 35 : 300);
      piece?.classList.remove('power-piece');
      if (action.kind === 'destiny') {
        afterMove();
        if (G.done) break;
      }
    }
    if (S.G === G && S.run === run && !G.done) {
      $('powerStep').textContent =
        action.kind === 'rewind' ? 'El tiempo vuelve a tus manos' : 'El destino está trazado';
      $('msg').textContent = `${name} usado. Se renueva en el próximo tablero.`;
      sfx.powerEnd(up);
      await wait(reduced ? 40 : 200);
    }
  } finally {
    board.classList.remove('hero-power', 'rewind', 'destiny');
    delete board.dataset.hero;
    board.removeAttribute('aria-busy');
    G.els.forEach((el) => el.classList.remove('power-piece'));
    if (S.G === G && S.run === run && !G.done) {
      setBusy(false);
      saveRun();
      updateHud();
    }
  }
}

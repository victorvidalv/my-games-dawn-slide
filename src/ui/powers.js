import { sfx, vib } from '../audio/sound.js';
import { $ } from '../dom.js';
import { beginPower } from '../game/powers.js';
import { saveRun } from '../game/session.js';
import { S, heroOf, setBusy } from '../state.js';
import { afterMove, cancelDrag, layout, updateHud } from './board.js';
import { processSealMove } from './seals.js';
import { motes, warmMotes } from './fx.js';
import { openPowerStage } from './power-stage.js';
import { watchFrames } from './perf.js';

/** Chispas del color del hechizo sobre la pieza que el poder mueve, y una onda que cruza el tablero. */
function pulse(piece, colors) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !piece) return;
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

/** Carga del poder antes de la descarga (rótulo y rayos sobre el tablero). */
const POWER_CHARGE_MS = 850;
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
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const board = $('board');
  // Primero se leen las medidas (tablero) y se abre el escenario, y DESPUÉS se toca el HUD: al revés, cada lectura
  // obligaba a recalcular la maquetación de toda la página en mitad del frame (≈50 ms de tirón en un móvil lento).
  const br = board.getBoundingClientRect();
  const name = action.kind === 'rewind' ? 'Rebobinar' : 'Trazar destino';
  // sin retrato: el poder estalla SOBRE el tablero (rayos, haces de luz y el rótulo «Poder de …») y luego actúa
  const stage = reduced ? null : openPowerStage(h.id, action.kind, `Poder de ${h.name}`, name);
  if (!reduced) watchFrames(POWER_CHARGE_MS + 300 + action.steps.length * 360); // ¿va justo el móvil? (modo ligero)
  setBusy(true);
  saveRun();
  updateHud();
  $('bShop').disabled = true;
  $('powerFxName').textContent = `${h.name} · ${name}`;
  $('powerStep').textContent = 'Poder activado';
  board.classList.add('hero-power', action.kind);
  board.setAttribute('aria-busy', 'true');
  // Sonido de poder: barrido grave + acorde brillante (hacia abajo al rebobinar, hacia arriba al trazar el destino).
  const up = action.kind !== 'rewind';
  const spell = SPELL[h.id === 'van' ? 'van' : 'jean'],
    spellColors = spell;
  sfx.heroSig(h.id);
  sfx.powerCharge(up); // la firma sonora del héroe + la carga
  vib([20, 30, 35]);
  try {
    if (!reduced) {
      await wait(POWER_CHARGE_MS);
      stage.unleash();
      sfx.powerUnleash(up);
      vib([40, 20, 70]);
      motes(innerWidth / 2, innerHeight / 2, 90, spell, 22);
      motes(0, 0, 70, spell, 6, br);
      await wait(300);
      setTimeout(() => stage.close(), 340);
    }
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
        processSealMove();
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
      await wait(reduced ? 35 : 360);
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
      await wait(reduced ? 40 : 280);
    }
  } finally {
    stage?.close();
    board.classList.remove('hero-power', 'rewind', 'destiny');
    board.removeAttribute('aria-busy');
    G.els.forEach((el) => el.classList.remove('power-piece'));
    if (S.G === G && S.run === run && !G.done) {
      setBusy(false);
      saveRun();
      updateHud();
    }
    $('bShop').disabled = false;
  }
}

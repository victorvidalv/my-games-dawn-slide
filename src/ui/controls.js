import { sfx } from '../audio/sound.js';
import { $ } from '../dom.js';
import { hintMove } from '../engine/solver.js';
import { canHint, spendHint } from '../game/heroes.js';
import { updateHeroHud } from './heroes.js';
import { saveRun } from '../game/session.js';
import { S } from '../state.js';
import { markHelped } from '../game/run-logic.js';
import { burst } from './fx.js';
import { openMenu } from './menu.js';
import { activatePower } from './powers.js';
$('bPower').onclick = activatePower;
$('bToMenu').onclick = () => {
  $('over').classList.remove('show');
  openMenu();
};

/* ---------- Botones del juego ---------- */
$('bHint').onclick = () => {
  if (!S.run || !S.G || S.G.done || S.busy || !canHint(S.run, S.run.mode, S.G.n)) return;
  const h = hintMove(S.G.pieces, S.G.pos, S.G.walls);
  if (!h) {
    $('msg').textContent = 'No encuentro pista desde aquí.';
    return;
  }
  spendHint({ run: S.run, mode: S.run.mode, level: S.G.n });
  markHelped(S.run, S.G.n);
  saveRun();
  updateHeroHud();
  const p = S.G.pieces[h.i],
    n = Math.abs(h.to - h.from);
  const dir = p.o === 'h' ? (h.to > h.from ? 'derecha' : 'izquierda') : h.to > h.from ? 'abajo' : 'arriba';
  $('msg').textContent =
    `Mueve la pieza brillante ${n} casilla${n > 1 ? 's' : ''} hacia ${dir}. Quedan ${h.left} movimientos.`;
  const el = S.G.els[h.i];
  el.classList.remove('hint');
  void el.offsetWidth;
  el.classList.add('hint');
  sfx.hint();
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, 14, ['#fff', '#ffcf6b'], 3);
};

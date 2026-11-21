import { tone, vib } from '../audio/sound.js';
import { $ } from '../dom.js';
import { occupancy } from '../engine/board.js';
import { SEAL_TIERS, collectSeal, sealReward, sealTier } from '../game/seals.js';
import { recordBest } from '../game/session.js';
import { S } from '../state.js';
import { icon } from './icons.js';
import { burst } from './fx.js';
import { numLocale } from '../i18n.js';
import { countStat } from './achievements.js';

const TIER_COLORS = [
  ['#e0a468', '#f3c996', '#b8703a'],
  ['#e3edf5', '#aebdc9', '#7fa3bf'],
  ['#ffe9a0', '#f1ce82', '#e9b73a', '#d6483f'],
];
/** Un sonido por tipo: bronce corto y grave, plata con tres notas, oro con arpegio brillante y campanilla. */
function playSealTone(tier) {
  if (tier === 1) {
    tone(392, 0.14, 'triangle', 0.05);
    tone(523, 0.2, 'sine', 0.04, 0.06);
    return;
  }
  if (tier === 2) {
    tone(523, 0.16, 'triangle', 0.05);
    tone(784, 0.2, 'sine', 0.045, 0.07);
    tone(1047, 0.3, 'sine', 0.04, 0.14);
    return;
  }
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'sine', 0.05, i * 0.07));
  tone(2093, 0.5, 'triangle', 0.03, 0.35);
}
export function renderSeal() {
  const G = S.G,
    status = $('sealStatus');
  if (!G || !S.run) {
    status.hidden = true;
    return;
  }
  const seal = G.seal;
  status.hidden = !seal;
  if (!seal) return;
  const board = $('board'),
    size = board.clientWidth / 6;
  if (!G.sealArt?.floor.isConnected) {
    const floor = document.createElement('div');
    floor.className = 'seal-floor';
    floor.setAttribute('aria-hidden', 'true');
    const tier = sealTier(seal);
    floor.className = `seal-floor seal-t${tier}`;
    floor.innerHTML = `<span class="seal-ring"></span><span class="seal-glyph">${icon('seal' + tier)}</span>`;
    board.appendChild(floor);
    const marker = document.createElement('span');
    marker.className = `seal-piece-mark seal-t${tier}`;
    marker.setAttribute('aria-hidden', 'true');
    marker.innerHTML = icon('seal' + tier);
    G.els[seal.piece]?.appendChild(marker);
    G.sealArt = { floor, marker };
  }
  const { floor, marker } = G.sealArt;
  floor.style.left = seal.cell[1] * size + 'px';
  floor.style.top = seal.cell[0] * size + 'px';
  floor.style.width = floor.style.height = size + 'px';
  const covered = occupancy(G.pieces, G.pos, G.walls)[seal.cell[0] * 6 + seal.cell[1]] >= 0;
  floor.classList.toggle('covered', covered);
  floor.classList.toggle('collected', seal.collected);
  marker.hidden = seal.collected;
  G.els[seal.piece]?.classList.toggle('seal-carrier', !seal.collected);
  G.els[seal.piece]?.classList.remove('seal-t1', 'seal-t2', 'seal-t3');
  G.els[seal.piece]?.classList.add('seal-t' + sealTier(seal));
  const value = sealReward(S.run, seal).toLocaleString(numLocale());
  const labelKey = `${G.n}:${value}:${seal.collected}`;
  if (status.dataset.sealKey !== labelKey) {
    status.className = `seal-status seal-t${sealTier(seal)}`;
    status.innerHTML = `${icon('seal' + sealTier(seal))}<span>${seal.collected ? SEAL_TIERS[sealTier(seal) - 1].name + ' obtenido' : SEAL_TIERS[sealTier(seal) - 1].name} <b>+${value}</b>${seal.collected ? '' : '<small>Lleva la pieza de borde discontinuo al sello</small>'}</span>`;
    status.dataset.sealKey = labelKey;
  }
  status.classList.toggle('claimed', seal.collected);
  status.hidden = false;
  status.setAttribute(
    'aria-label',
    seal.collected
      ? `Sello obtenido, ${value} puntos.`
      : `Sello opcional: lleva la pieza de borde discontinuo sobre el sello con el mismo borde para ganar ${value} puntos. Puedes salir sin recogerlo.`,
  );
}

export function processSealMove(before = S.G?.hist.at(-1)) {
  if (!S.G || !S.run) return 0;
  const tier = S.G?.seal ? sealTier(S.G.seal) : 0;
  const value = collectSeal(S.run, S.G, before);
  if (!value) return 0;
  if (tier === 3) countStat('goldSeals');
  const G = S.G,
    board = $('board'),
    rect = board.getBoundingClientRect(),
    size = board.clientWidth / 6;
  const x = rect.left + (G.seal.cell[1] + 0.5) * size,
    y = rect.top + (G.seal.cell[0] + 0.5) * size;
  $('score').textContent = S.run.score.toLocaleString(numLocale());
  recordBest();
  $('msg').textContent = `Sello obtenido: +${value.toLocaleString(numLocale())} puntos.`;
  const pop = document.createElement('div');
  pop.className = `seal-points-pop seal-t${sealTier(G.seal)}`;
  pop.setAttribute('aria-hidden', 'true');
  pop.innerHTML = `${icon('seal' + sealTier(G.seal))}<b>+${value.toLocaleString(numLocale())}</b>`;
  pop.style.left = Math.max(72, Math.min(innerWidth - 72, x)) + 'px';
  pop.style.top = y + 'px';
  document.body.appendChild(pop);
  board.classList.add('seal-reward');
  setTimeout(() => {
    pop.remove();
    board.classList.remove('seal-reward');
  }, 1100);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
    burst(
      x,
      y,
      [14, 22, 38][sealTier(G.seal) - 1],
      TIER_COLORS[sealTier(G.seal) - 1],
      [3.4, 4.2, 5.4][sealTier(G.seal) - 1],
    );
  playSealTone(sealTier(G.seal));
  vib(
    [
      [10, 16, 10],
      [12, 22, 12],
      [16, 26, 16, 26, 22],
    ][sealTier(G.seal) - 1],
  );
  renderSeal();
  return value;
}

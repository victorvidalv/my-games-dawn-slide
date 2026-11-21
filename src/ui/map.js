import { ZONES, ZONE_LEVELS, zoneOf, zoneStep } from '../data/zones.js';
import { $, cssUrl } from '../dom.js';
import { S } from '../state.js';
let curZone = -1;

/** Fichas en tonos suaves: la saturación de la zona se atenúa (≈ 37–46 %) para que no resulten chillonas. */
const softSat = (s) => Math.round(s * 0.72);

function paintScenery(i) {
  const style = document.documentElement.style;
  style.setProperty('--scene', cssUrl(`backgrounds/zone-${i + 1}.webp`));
  style.setProperty('--scene-shade', ZONES[i].shade || 'transparent');
}
export function applyChallengeScenery() {
  const r = document.documentElement.style;
  curZone = -1;
  r.setProperty('--scene', cssUrl('backgrounds/challenge-dawn.webp'));
  r.setProperty('--scene-shade', 'transparent');
  const hues = [188, 38, 214, 152, 266, 18, 46, 174];
  for (let k = 0; k < 8; k++) {
    const l = 58 + (k % 2 ? 4 : -3);
    const s = softSat(58) - (k % 3 === 0 ? 4 : 0);
    r.setProperty(`--p${k}a`, `hsl(${hues[k]} ${s}% ${Math.min(l + 15, 86)}%)`);
    r.setProperty(`--p${k}b`, `hsl(${hues[k]} ${s}% ${l - 5}%)`);
    r.setProperty(`--p${k}d`, `hsl(${hues[k]} ${Math.max(24, s - 10)}% ${Math.max(16, l - 28)}%)`);
  }
  document.body.style.setProperty('--t1', '#141b2d');
  document.body.style.setProperty('--t2', '#1d2740');
  document.body.style.setProperty('--cc', '#f3c974');
}
export function applyZone(i) {
  const idx = Math.max(0, Math.min(ZONES.length - 1, i));
  paintScenery(idx);
  if (curZone === idx) return;
  curZone = idx;
  const z = ZONES[idx],
    r = document.documentElement.style;
  for (let k = 0; k < 8; k++) {
    if (!z.h) {
      ['a', 'b', 'd'].forEach((c) => r.removeProperty(`--p${k}${c}`));
      continue;
    }
    const l = z.l + 4 + (k % 2 ? 4 : -3),
      s = softSat(z.s) - (k % 3 === 0 ? 4 : 0);
    r.setProperty(`--p${k}a`, `hsl(${z.h[k]} ${s}% ${Math.min(l + 14, 88)}%)`);
    r.setProperty(`--p${k}b`, `hsl(${z.h[k]} ${s}% ${l - 5}%)`);
    r.setProperty(`--p${k}d`, `hsl(${z.h[k]} ${Math.max(20, s - 12)}% ${Math.max(14, l - 30)}%)`);
  }
  document.body.style.setProperty('--t1', z.t1);
  document.body.style.setProperty('--t2', z.t2);
  document.body.style.setProperty('--cc', z.cc);
}
export function renderStage() {
  // barra de 3 tramos de la zona actual
  const z = zoneOf(S.G.n),
    step = zoneStep(S.G.n);
  $('sname').textContent = z.n;
  const sg = $('segs');
  sg.innerHTML = '';
  for (let k = 1; k <= ZONE_LEVELS; k++) {
    const s = document.createElement('span');
    s.className = 'sg' + (k < step ? ' done' : k === step ? ' cur adv' : '');
    sg.appendChild(s);
  }
}

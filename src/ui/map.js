import { ZONES, ZONE_LEVELS, zoneOf, zoneStep } from '../data/zones.js';
import { $ } from '../dom.js';
import { S } from '../state.js';
let curZone = -1;

/** Fichas en tonos suaves: la saturación de la zona se atenúa (≈ 37–46 %) para que no resulten chillonas. */
const softSat = (s) => Math.round(s * 0.72);

function paintScenery(i) {
  const style = document.documentElement.style;
  document.body.dataset.zone = String(i + 1);
  style.setProperty('--scene', 'none');
  style.setProperty('--scene-shade', ZONES[i].shade || 'transparent');
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

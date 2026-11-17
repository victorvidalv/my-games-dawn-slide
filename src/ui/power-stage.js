/* ============================ Escenario del poder de héroe ============================
   El poder se ve SOBRE el tablero como un círculo mágico, distinto para cada héroe:
     Jean – retorcer el tiempo: una esfera de reloj con numerales y agujas que giran hacia atrás; al desatarse, el círculo
            se pliega hacia el centro, salen ondas de tiempo y el tablero se retuerce un instante.
     Juth – purificar: un sello de runas que se dibuja solo (estrella, anillos, glifos); al desatarse, una ola de luz
            barre el tablero y las runas ascienden.
   Encima, el rótulo «Poder de …». Nada tapa el tablero: solo se oscurecen los bordes. */
const NS = 'http://www.w3.org/2000/svg';
const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
let stage = null;
function node() {
  if (!stage) {
    stage = document.createElement('div');
    stage.id = 'powerStage';
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = '<div class="ps-sigil"><i class="ps-glow"></i><svg viewBox="-100 -100 200 200"></svg><i class="ps-wave"></i><i class="ps-wave two"></i></div><div class="ps-title"><b></b><span></span></div>';
    document.body.appendChild(stage);
  }
  return stage;
}
const mk = (parent, tag, attrs = {}, text = '') => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text) n.textContent = text;
  parent.appendChild(n);
  return n;
};
const polar = (r, deg) => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)];

/** Anillo de glifos (runas o numerales) mirando hacia fuera. */
function glyphRing(svg, cls, glyphs, r, size) {
  const g = mk(svg, 'g', { class: cls });
  glyphs.forEach((ch, i) => {
    const deg = (360 * i) / glyphs.length;
    const [x, y] = polar(r, deg);
    mk(g, 'text', { x: x.toFixed(1), y: y.toFixed(1), 'font-size': size, 'text-anchor': 'middle', 'dominant-baseline': 'central', transform: `rotate(${deg} ${x.toFixed(1)} ${y.toFixed(1)})` }, ch);
  });
  return g;
}
function drawClock(svg) {
  mk(svg, 'circle', { r: 95, class: 'ring thick' });
  mk(svg, 'circle', { r: 88, class: 'ring' });
  const ticks = mk(svg, 'g', { class: 'spin-back' });
  for (let i = 0; i < 60; i++) {
    const [x1, y1] = polar(88, i * 6);
    const [x2, y2] = polar(i % 5 ? 84 : 79, i * 6);
    mk(ticks, 'line', { x1, y1, x2, y2, class: i % 5 ? 'tick' : 'tick big' });
  }
  glyphRing(svg, 'spin-back slow glyphs', ROMAN, 68, 11);
  mk(svg, 'circle', { r: 54, class: 'ring dash spin' });
  mk(svg, 'circle', { r: 30, class: 'ring' });
  const spiral = mk(svg, 'g', { class: 'spin-back fast' });       // espiral: el tiempo que se enrosca hacia el centro
  let d = '';
  for (let k = 0; k <= 80; k++) { const [x, y] = polar(4 + k * 0.6, k * 13); d += `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }
  mk(spiral, 'path', { d, class: 'ring thin' });
  mk(mk(svg, 'g', { class: 'hand hour' }), 'path', { d: 'M0 6 L-3 0 L0 -40 L3 0Z' });
  mk(mk(svg, 'g', { class: 'hand minute' }), 'path', { d: 'M0 8 L-2 0 L0 -62 L2 0Z' });
  mk(svg, 'circle', { r: 4, class: 'hub' });
}
function drawRunes(svg) {
  mk(svg, 'circle', { r: 95, class: 'ring thick draw' });
  mk(svg, 'circle', { r: 80, class: 'ring draw' });
  glyphRing(svg, 'spin slow glyphs', [...RUNES], 87.5, 8.5);
  const star = mk(svg, 'g', { class: 'spin-back slow' });
  for (const turn of [0, 180]) {
    const pts = [0, 120, 240].map((a) => polar(78, a + turn).map((v) => v.toFixed(1)).join(',')).join(' ');
    mk(star, 'polygon', { points: pts, class: 'ring draw' });
  }
  mk(svg, 'circle', { r: 45, class: 'ring dash spin' });
  mk(svg, 'circle', { r: 26, class: 'ring draw' });
  const eye = mk(svg, 'g', { class: 'spin' });                    // la mira del destino, como en el libro de Juth
  for (const a of [0, 90, 180, 270]) { const [x1, y1] = polar(14, a); const [x2, y2] = polar(36, a); mk(eye, 'line', { x1, y1, x2, y2, class: 'tick big' }); }
  mk(svg, 'circle', { r: 9, class: 'ring thick' });
  mk(svg, 'circle', { r: 3, class: 'hub' });
}

/** Abre el escenario sobre el tablero; devuelve `unleash()` (la descarga) y `close()`. */
export function openPowerStage(hero, kind, title = '', sub = '') {
  const el = node();
  const svg = el.querySelector('svg');
  const sigil = el.querySelector('.ps-sigil');
  const frame = document.querySelector('.frame');
  const r = (document.getElementById('board') || document.body).getBoundingClientRect();
  const size = Math.min(Math.max(r.width, r.height) * 1.18, Math.min(innerWidth, innerHeight) * 1.25);
  sigil.style.width = sigil.style.height = `${size}px`;
  sigil.style.left = `${r.left + r.width / 2}px`;
  sigil.style.top = `${r.top + r.height / 2}px`;
  el.style.setProperty('--cx', `${r.left + r.width / 2}px`);
  el.style.setProperty('--cy', `${r.top + r.height / 2}px`);
  el.style.setProperty('--sz', `${size}px`);
  el.dataset.hero = hero;
  el.dataset.kind = kind;
  svg.replaceChildren();
  if (kind === 'rewind') drawClock(svg); else drawRunes(svg);
  el.querySelector('.ps-title b').textContent = title;
  el.querySelector('.ps-title span').textContent = sub;
  el.classList.remove('unleash');
  void el.offsetWidth;
  el.classList.add('show');
  const boardFx = kind === 'rewind' ? 'fx-twist' : 'fx-purify';
  let closed = false;
  return {
    unleash() {
      el.classList.add('unleash');
      frame?.classList.add(boardFx);
      setTimeout(() => frame?.classList.remove(boardFx), 700);
    },
    close() {
      if (closed) return;
      closed = true;
      el.classList.remove('show', 'unleash');
      frame?.classList.remove(boardFx);
    },
  };
}

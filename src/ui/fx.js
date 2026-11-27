import { $ } from '../dom.js';
import { numLocale } from '../i18n.js';
import { frameAt, isLite, onLiteChange } from './perf.js';
/* ============================ Partículas ============================ */
const cv = $('fx'),
  cx = cv.getContext('2d');
let parts = [],
  raf = 0,
  dpr = 1;
/* Halo de cada chispa pre-renderizado una vez (por color y radio, en pasos de ¼ px): el mismo halo que shadowBlur=10,
   pero sin desenfocar en cada frame, que es lo que hundía los móviles con 100+ chispas a la vez. El sprite guarda solo la
   sombra (el círculo queda fuera del lienzo); el núcleo se pinta encima con arc(), así el color suma igual que antes. */
const glows = new Map(),
  PAD = 16; // el halo de shadowBlur 10 (σ≈5 px de lienzo) se apaga a ~15 px
function glow(c, r) {
  const q = Math.max(1, Math.round(r * 4)),
    key = c + q;
  let s = glows.get(key);
  if (!s) {
    if (glows.size > 400) glows.clear();
    const rad = (q / 4) * dpr,
      half = Math.ceil(rad + PAD),
      g = document.createElement('canvas');
    g.width = g.height = half * 2;
    const k = g.getContext('2d');
    k.fillStyle = k.shadowColor = c;
    k.shadowBlur = 10;
    k.shadowOffsetX = half * 4;
    k.beginPath();
    k.arc(half - half * 4, half, rad, 0, Math.PI * 2);
    k.fill();
    s = { g, h: half / dpr };
    glows.set(key, s);
  }
  return s;
}
/** Prepara los halos de unos colores en un momento libre, para que la primera ráfaga grande no pague su creación. */
export function warmMotes(cols) {
  const run = () => {
    for (const c of cols) for (let q = 2; q <= 19; q++) glow(c, q / 4);
  };
  (self.requestIdleCallback || ((f) => setTimeout(f, 300)))(run);
}
// Lienzo a 2× como mucho (1,5× en modo ligero): en pantallas de 3× las chispas se ven igual y hay menos de la mitad de píxeles que pintar.
function fit() {
  dpr = Math.min(isLite() ? 1.5 : 2, devicePixelRatio || 1);
  cv.width = innerWidth * dpr;
  cv.height = innerHeight * dpr;
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  glows.clear();
}
addEventListener('resize', fit);
fit();
onLiteChange(fit);
/** En modo ligero sale la mitad de chispas (mismo reparto de colores y velocidades). */
const count = (n) => (isLite() ? Math.ceil(n / 2) : n);
export function burst(x, y, n = 40, cols = ['#ffcf6b', '#ff6a6a', '#43e0c1', '#6cb6ff', '#b18cff', '#ff9cc7'], sp = 7) {
  n = count(n);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2,
      s = sp * (0.3 + Math.random());
    parts.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 3,
      g: 0.22,
      life: 60 + Math.random() * 40,
      max: 100,
      c: cols[i % cols.length],
      r: 2 + Math.random() * 4,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}
/**
 * Chispas de luz: motas redondas que brillan (mezcla aditiva), se frenan solas y se apagan; sin gravedad ni papelitos.
 * `rect` opcional: nacen repartidas por el borde de ese rectángulo y se alejan de su centro (polvo de luz alrededor de una pieza).
 */
export function motes(x, y, n = 12, cols = ['#fff', '#ffe9ad'], sp = 3, rect = null) {
  n = count(n);
  for (let i = 0; i < n; i++) {
    let px = x,
      py = y,
      a = Math.random() * Math.PI * 2;
    if (rect) {
      const t = Math.random(),
        side = Math.floor(Math.random() * 4);
      px = side < 2 ? rect.left + rect.width * t : side === 2 ? rect.left : rect.right;
      py = side < 2 ? (side === 0 ? rect.top : rect.bottom) : rect.top + rect.height * t;
      a =
        Math.atan2(py - (rect.top + rect.height / 2), px - (rect.left + rect.width / 2)) + (Math.random() - 0.5) * 0.6;
    }
    const s = sp * (0.35 + Math.random() * 0.9),
      life = 16 + Math.random() * 18;
    parts.push({
      mote: 1,
      x: px,
      y: py,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 0.25,
      life,
      max: life,
      c: cols[i % cols.length],
      r: 1.2 + Math.random() * 2.6,
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}
/* ============================ Formas de las estelas (Personalizar → Estelas) ============================ */
const rnd = (a, b) => a + Math.random() * (b - a);
function shape(o) {
  parts.push({ sh: o.sh, x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 1, rot: 0, vr: 0, r: 3, add: false, ...o, max: o.life });
}
function star(r) {
  cx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5,
      rr = i % 2 ? r * 0.45 : r;
    cx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  cx.closePath();
}
function drawShape(p) {
  if (p.delay > 0) {
    p.delay--;
    return;
  }
  p.age = (p.age || 0) + 1;
  p.vx *= p.drag;
  p.vy = p.vy * p.drag + p.g;
  p.x += p.vx;
  p.y += p.vy;
  p.rot += p.vr;
  p.life--;
  const k = Math.max(0, p.life / p.max);
  cx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
  let a = Math.min(1, k * 1.6);
  if (p.sh === 'ember' || p.sh === 'star') a *= 0.55 + 0.45 * Math.sin(p.age * 0.35 + (p.ph || 0));
  cx.globalAlpha = Math.max(0, a);
  const c = Math.cos(p.rot) * dpr,
    n = Math.sin(p.rot) * dpr;
  cx.setTransform(c, n, -n, c, p.x * dpr, p.y * dpr);
  cx.fillStyle = cx.strokeStyle = p.c;
  switch (p.sh) {
    case 'ember': {
      const s = glow(p.c, p.r);
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.drawImage(s.g, p.x - s.h, p.y - s.h, s.h * 2, s.h * 2);
      break;
    }
    case 'streak': {
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.lineCap = 'round';
      cx.lineWidth = p.r;
      cx.beginPath();
      cx.moveTo(p.x, p.y);
      cx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
      cx.stroke();
      break;
    }
    case 'star':
      star(p.r * (0.8 + 0.2 * Math.sin(p.age * 0.3)));
      cx.fill();
      break;
  }
}
function tick(t) {
  frameAt(t); // el detector de modo ligero mide aquí, sin bucle propio
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life > 0);
  for (const p of [...parts]) {
    if (p.sh) {
      drawShape(p);
      continue;
    }
    if (p.mote) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.9;
      p.vy *= 0.9;
      p.life--;
      const k = Math.max(0, p.life / p.max),
        r = p.r * (0.5 + k * 0.7),
        s = glow(p.c, r);
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.globalCompositeOperation = 'lighter';
      cx.globalAlpha = k;
      cx.drawImage(s.g, p.x - s.h, p.y - s.h, s.h * 2, s.h * 2);
      cx.fillStyle = p.c;
      cx.beginPath();
      cx.arc(p.x, p.y, r, 0, Math.PI * 2);
      cx.fill();
      continue;
    }
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.g;
    p.vx *= 0.99;
    p.life--;
    p.rot += p.vr;
    const c = Math.cos(p.rot) * dpr,
      n = Math.sin(p.rot) * dpr; // giro y posición en una sola matriz (sin save/restore por papelito)
    cx.setTransform(c, n, -n, c, p.x * dpr, p.y * dpr);
    cx.globalCompositeOperation = 'source-over';
    cx.globalAlpha = Math.min(1, p.life / 30);
    cx.fillStyle = p.c;
    cx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
  }
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx.globalCompositeOperation = 'source-over';
  cx.globalAlpha = 1;
  raf = parts.length ? requestAnimationFrame(tick) : 0;
}
export function countUp(el, from, to, ms = 900, fmt = (v) => Math.round(v).toLocaleString(numLocale())) {
  const t0 = performance.now();
  (function f(t) {
    const k = Math.min(1, (t - t0) / ms),
      e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(f);
  })(t0);
}

/* ============================ Estelas (Personalizar → Tablero → Estelas) ============================ */
const rpick = (cols) => cols[Math.floor(Math.random() * cols.length)];
/** Una partícula de la estela `kind` en (x, y); `u` = dirección unitaria del movimiento; `d` = retraso en fotogramas. */
const TRAIL_STYLES = {
  starlight: (x, y, u, c, d) =>
    shape({
      sh: 'star',
      x: x + rnd(-7, 7),
      y: y + rnd(-7, 7),
      vx: rnd(-0.3, 0.3),
      vy: rnd(-0.4, 0.2),
      drag: 0.97,
      r: rnd(2, 4.4),
      rot: rnd(0, 1),
      vr: rnd(-0.05, 0.05),
      life: rnd(36, 58),
      c: rpick(c),
      add: true,
      ph: rnd(0, 6),
      delay: d,
    }),
  comet: (x, y, u, c, d) => {
    shape({ sh: 'ember', x, y, vx: 0, vy: 0, r: rnd(3.6, 5), life: 26, c: c[0], add: true, ph: rnd(0, 6), delay: d });
    shape({
      sh: 'streak',
      x,
      y,
      vx: -u.x * rnd(3, 6),
      vy: -u.y * rnd(3, 6),
      drag: 0.9,
      r: 1.6,
      life: rnd(14, 22),
      c: rpick(c),
      add: true,
      delay: d,
    });
  },
};
/**
 * Deja la estela `kind` a lo largo del tramo (ax, ay) → (bx, by), en píxeles de pantalla. En un arrastre llegan tramos cortos
 * (se dibujan al instante); en un deslizamiento largo las partículas se reparten en el tiempo siguiendo a la ficha.
 */
export function trailPath(kind, ax, ay, bx, by, cols) {
  const make = TRAIL_STYLES[kind];
  if (!make || !cols?.length || parts.length > 480) return;
  const dist = Math.hypot(bx - ax, by - ay);
  if (dist < 1) return;
  if (isLite() && Math.random() < 0.5) return;
  const u = { x: (bx - ax) / dist, y: (by - ay) / dist },
    steps = Math.max(1, Math.min(34, Math.round(dist / 9))),
    lag = dist > 30 ? 10 : 0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    make(ax + (bx - ax) * t, ay + (by - ay) * t, u, cols, Math.round(t * lag));
  }
  if (!raf) raf = requestAnimationFrame(tick);
}

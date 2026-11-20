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
/* ============================ Celebraciones de Canjear: cada una con su forma y su movimiento ============================ */
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (cols, i) => cols[i % cols.length];
function shape(o) {
  parts.push({ sh: o.sh, x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 1, rot: 0, vr: 0, r: 3, add: false, ...o, max: o.life });
}
/** Formas propias de cada celebración (src/game/achievements.js → REWARDS.fx). `w`: ancho de la zona (el tablero). */
const STYLES = {
  // Brasas: suben flotando, se mecen y titilan
  embers(x, y, w, cols) {
    for (let i = 0; i < count(30); i++)
      shape({
        sh: 'ember',
        x: x + rnd(-14, 6),
        y: y + rnd(-12, 12),
        vx: rnd(-1.6, 0.6),
        vy: rnd(-3.2, -1),
        g: -0.025,
        drag: 0.985,
        r: rnd(1.4, 3.2),
        life: rnd(60, 110),
        c: pick(cols, i),
        add: true,
        ph: rnd(0, 6),
      });
  },
  // Chispas: estelas rápidas que caen con fuerza
  sparks(x, y, w, cols) {
    for (let i = 0; i < count(42); i++) {
      const a = rnd(Math.PI * 0.55, Math.PI * 1.45) + Math.PI,
        s = rnd(5, 12);
      shape({
        sh: 'streak',
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 2,
        g: 0.32,
        drag: 0.965,
        r: rnd(1, 1.8),
        life: rnd(28, 46),
        c: pick(cols, i),
        add: true,
      });
    }
  },
  // Pétalos: caen desde arriba balanceándose y girando
  petals(x, y, w, cols) {
    for (let i = 0; i < count(28); i++)
      shape({
        sh: 'petal',
        x: x - rnd(0, w * 0.8),
        y: y - rnd(w * 0.25, w * 0.6),
        vx: rnd(-0.4, 0.4),
        vy: rnd(0.8, 1.8),
        sway: rnd(0.8, 1.8),
        ph: rnd(0, 6),
        r: rnd(4, 7),
        rot: rnd(0, 6),
        vr: rnd(-0.08, 0.08),
        life: rnd(100, 150),
        c: pick(cols, i),
      });
  },
  // Tinta: salpicadura que se frena en seco y deja manchas y gotas
  ink(x, y, w, cols) {
    for (let i = 0; i < count(9); i++) {
      const a = rnd(Math.PI * 0.5, Math.PI * 1.5),
        s = rnd(3, 9);
      shape({
        sh: 'blob',
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        drag: 0.8,
        r: rnd(5, 11),
        grow: 1.04,
        life: rnd(70, 95),
        c: i % 3 ? cols[0] : cols[1],
        ph: rnd(0, 6),
      });
    }
    for (let i = 0; i < count(26); i++) {
      const a = rnd(Math.PI * 0.45, Math.PI * 1.55),
        s = rnd(6, 15);
      shape({
        sh: 'blob',
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        drag: 0.84,
        g: 0.05,
        r: rnd(1.2, 3),
        life: rnd(60, 90),
        c: pick(cols, i + 1),
      });
    }
  },
  // Destello glaciar: onda de choque y copos de seis puntas que flotan girando
  frost(x, y, w, cols) {
    shape({ sh: 'ring', x, y, r: 6, grow: 1.09, life: 34, c: cols[1], add: true, lw: 3 });
    shape({ sh: 'ring', x, y, r: 3, grow: 1.12, life: 26, c: '#ffffff', add: true, lw: 1.5 });
    for (let i = 0; i < count(22); i++) {
      const a = rnd(0, Math.PI * 2),
        s = rnd(1.5, 5);
      shape({
        sh: 'flake',
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        drag: 0.95,
        g: 0.03,
        r: rnd(3, 6),
        rot: rnd(0, 1),
        vr: rnd(-0.06, 0.06),
        life: rnd(70, 110),
        c: pick(cols, i),
        add: true,
      });
    }
  },
  // Lluvia de estrellas: estrellas de cinco puntas que caen sobre el tablero y titilan
  stars(x, y, w, cols) {
    for (let i = 0; i < count(26); i++)
      shape({
        sh: 'star',
        x: x - rnd(0, w),
        y: y - rnd(w * 0.2, w * 0.7),
        vx: rnd(-1.2, -0.3),
        vy: rnd(2, 4.2),
        r: rnd(3, 6.5),
        rot: rnd(0, 1),
        vr: rnd(-0.05, 0.05),
        life: rnd(70, 110),
        c: pick(cols, i),
        add: true,
        ph: rnd(0, 6),
        delay: Math.floor(rnd(0, 30)),
      });
  },
  // Aurora: cintas de luz que ondulan hacia atrás por encima del tablero
  aurora(x, y, w, cols) {
    for (let i = 0; i < count(5); i++)
      shape({
        sh: 'ribbon',
        x,
        y: y + rnd(-w * 0.35, w * 0.25),
        vx: rnd(-6, -4),
        vy: 0,
        amp: rnd(14, 30),
        ph: rnd(0, 6),
        r: rnd(5, 9),
        life: rnd(70, 95),
        c: pick(cols, i),
        add: true,
        trail: [],
        delay: i * 6,
      });
  },
  // Prisma solar: anillo arcoíris, rayos que se abren y cristales que salen despedidos
  prism(x, y, w, cols) {
    shape({ sh: 'ring', x, y, r: 8, grow: 1.075, life: 40, c: 'rainbow', cols, add: true, lw: 5 });
    for (let i = 0; i < 12; i++)
      shape({
        sh: 'beam',
        x,
        y,
        rot: (i / 12) * Math.PI * 2,
        vr: 0.012,
        r: 4,
        grow: 1.12,
        life: 36,
        c: pick(cols, i),
        add: true,
      });
    for (let i = 0; i < count(20); i++) {
      const a = rnd(0, Math.PI * 2),
        s = rnd(3, 8);
      shape({
        sh: 'gem',
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        drag: 0.94,
        g: 0.08,
        r: rnd(3, 5),
        rot: rnd(0, 6),
        vr: rnd(-0.15, 0.15),
        life: rnd(55, 80),
        c: pick(cols, i),
        add: true,
      });
    }
  },
  // Fuegos artificiales: cohetes que suben con estela y estallan en coronas de colores
  fireworks(x, y, w, cols) {
    for (let i = 0; i < 4; i++)
      shape({
        sh: 'rocket',
        x: x - w * rnd(0.1, 0.9),
        y: y + w * 0.45,
        vx: rnd(-0.6, 0.6),
        vy: rnd(-10.5, -8),
        g: 0.17,
        r: 2,
        life: 120,
        c: pick(cols, i),
        cols,
        add: true,
        delay: i * 9,
      });
  },
};
function explode(p) {
  const n = count(38),
    base = rnd(0, Math.PI * 2);
  for (let i = 0; i < n; i++) {
    const a = base + (i / n) * Math.PI * 2,
      s = rnd(3.5, 5.5);
    shape({
      sh: 'streak',
      x: p.x,
      y: p.y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      g: 0.07,
      drag: 0.965,
      r: 1.4,
      life: rnd(45, 65),
      c: i % 5 ? p.c : '#ffffff',
      add: true,
      twinkle: i % 3 === 0,
    });
  }
  shape({ sh: 'ring', x: p.x, y: p.y, r: 3, grow: 1.16, life: 16, c: '#ffffff', add: true, lw: 2 });
}
/** Lanza la celebración `kind` saliendo del punto (x, y); `w` es el ancho del tablero (para repartir lluvias y cohetes). */
export function celebration(kind, x, y, w, cols) {
  const make = STYLES[kind];
  if (!make) return burst(x, y, 30, cols);
  make(x, y, w, cols);
  if (!raf) raf = requestAnimationFrame(tick);
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
  if (p.sway) p.vx += Math.sin(p.age * 0.08 + p.ph) * 0.06 * p.sway;
  if (p.sh === 'ribbon') p.vy = Math.cos(p.age * 0.12 + p.ph) * p.amp * 0.12;
  p.x += p.vx;
  p.y += p.vy;
  p.rot += p.vr;
  if (p.grow) p.r *= p.grow;
  p.life--;
  const k = Math.max(0, p.life / p.max);
  if (p.sh === 'rocket' && p.vy > -1.2) {
    p.life = 0;
    explode(p);
    return;
  }
  cx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
  let a = p.sh === 'blob' ? Math.min(1, p.life / 25) : Math.min(1, k * 1.6);
  if (p.sh === 'ember' || p.sh === 'star' || p.twinkle) a *= 0.55 + 0.45 * Math.sin(p.age * 0.35 + (p.ph || 0));
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
    case 'streak':
    case 'rocket': {
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.lineCap = 'round';
      cx.lineWidth = p.r * (p.sh === 'rocket' ? 1.6 : 1);
      cx.beginPath();
      cx.moveTo(p.x, p.y);
      cx.lineTo(p.x - p.vx * (p.sh === 'rocket' ? 3.5 : 2.2), p.y - p.vy * (p.sh === 'rocket' ? 3.5 : 2.2));
      cx.stroke();
      break;
    }
    case 'petal':
      cx.beginPath();
      cx.ellipse(0, 0, p.r, p.r * 0.48 * Math.abs(Math.cos(p.age * 0.06 + p.ph)) + 0.6, 0, 0, Math.PI * 2);
      cx.fill();
      cx.globalAlpha *= 0.5;
      cx.fillStyle = '#ffffff';
      cx.beginPath();
      cx.ellipse(-p.r * 0.3, 0, p.r * 0.35, p.r * 0.14, 0, 0, Math.PI * 2);
      cx.fill();
      break;
    case 'blob':
      cx.beginPath();
      cx.ellipse(0, 0, p.r, p.r * (0.75 + 0.25 * Math.sin(p.ph || 0)), 0, 0, Math.PI * 2);
      cx.fill();
      break;
    case 'flake':
      cx.lineWidth = 1.4;
      cx.lineCap = 'round';
      cx.beginPath();
      for (let i = 0; i < 6; i++) {
        const an = (i * Math.PI) / 3,
          ex = Math.cos(an) * p.r,
          ey = Math.sin(an) * p.r;
        cx.moveTo(0, 0);
        cx.lineTo(ex, ey);
        cx.moveTo(ex * 0.55 + Math.cos(an + 0.7) * p.r * 0.3, ey * 0.55 + Math.sin(an + 0.7) * p.r * 0.3);
        cx.lineTo(ex * 0.55, ey * 0.55);
      }
      cx.stroke();
      break;
    case 'star':
      star(p.r * (0.8 + 0.2 * Math.sin(p.age * 0.3)));
      cx.fill();
      break;
    case 'gem':
      cx.beginPath();
      cx.moveTo(0, -p.r);
      cx.lineTo(p.r * 0.6, 0);
      cx.lineTo(0, p.r);
      cx.lineTo(-p.r * 0.6, 0);
      cx.closePath();
      cx.fill();
      break;
    case 'ring':
      cx.lineWidth = p.lw * k + 0.5;
      if (p.c === 'rainbow') {
        p.cols.forEach((col, i) => {
          cx.strokeStyle = col;
          cx.beginPath();
          cx.arc(0, 0, p.r + i * 3, 0, Math.PI * 2);
          cx.stroke();
        });
      } else {
        cx.beginPath();
        cx.arc(0, 0, p.r, 0, Math.PI * 2);
        cx.stroke();
      }
      break;
    case 'beam':
      cx.lineWidth = 2.2 * k + 0.4;
      cx.lineCap = 'round';
      cx.beginPath();
      cx.moveTo(p.r * 0.3, 0);
      cx.lineTo(p.r, 0);
      cx.stroke();
      break;
    case 'ribbon': {
      p.trail.push(p.x, p.y);
      if (p.trail.length > 36) p.trail.splice(0, 2);
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.lineCap = cx.lineJoin = 'round';
      for (const [lw, al] of [
        [p.r * 2.2, 0.25],
        [p.r, 0.6],
      ]) {
        cx.globalAlpha = Math.max(0, a * al);
        cx.lineWidth = lw;
        cx.beginPath();
        for (let i = 0; i < p.trail.length; i += 2) cx.lineTo(p.trail[i], p.trail[i + 1]);
        cx.stroke();
      }
      break;
    }
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

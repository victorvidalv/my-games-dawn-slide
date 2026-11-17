/**
 * Caja de herramientas de los minijuegos: reloj de juego pausable, efectos («juice») y sonidos.
 * Los juegos nunca usan setTimeout ni performance.now directamente: todo va por el `runner`, así la pausa
 * (pestaña oculta, llamada entrante) congela el juego entero y nada se desincroniza.
 */
import { keyHz, noise, tone, vib } from '../../audio/sound.js';

export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Crea un elemento a partir de HTML. */
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/**
 * Reloj de juego: avanza solo mientras se dibuja y no está en pausa. `after`/`wait` programan tareas en tiempo de juego
 * y `onFrame` registra el bucle de dibujo. `stop` cancela todo (las promesas pendientes no se resuelven nunca).
 */
export function createRunner() {
  let t = 0, last = 0, raf = 0, running = false, paused = false;
  const tasks = [], frames = new Set();
  function frame(ts) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (paused) { last = ts; return; }
    const dt = Math.min(50, Math.max(0, ts - last));     // un tirón del navegador nunca hace saltar el juego
    last = ts;
    t += dt;
    if (tasks.length) {
      const due = tasks.filter((k) => k.at <= t).sort((a, b) => a.at - b.at);
      for (const k of due) { const i = tasks.indexOf(k); if (i >= 0) { tasks.splice(i, 1); k.fn(); } if (!running) return; }
    }
    for (const f of [...frames]) { f(t, dt); if (!running) return; }
  }
  const api = {
    now: () => t,
    get paused() { return paused; },
    get running() { return running; },
    start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); tasks.length = 0; frames.clear(); },
    pause() { paused = true; },
    resume() { paused = false; last = performance.now(); },
    after(ms, fn) { const k = { at: t + ms, fn }; tasks.push(k); return () => { const i = tasks.indexOf(k); if (i >= 0) tasks.splice(i, 1); }; },
    wait(ms) { return new Promise((res) => api.after(ms, res)); },
    onFrame(fn) { frames.add(fn); return () => frames.delete(fn); },
  };
  return api;
}

/* ───────────── efectos visuales (DOM, baratos: se borran solos) ───────────── */

/** Texto que sube y se desvanece (+1, ¡Perfecto!…). x, y en % del campo. */
export function floatText(field, x, y, text, kind = 'good') {
  const n = el(`<span class="mg-float ${kind}" style="left:${x}%;top:${y}%"></span>`);
  n.textContent = text;
  field.appendChild(n);
  setTimeout(() => n.remove(), 900);
}
/** Chispas que salen de un punto. x, y en % del campo. */
export function sparks(field, x, y, n = 8, colors = ['#ffe9ad', '#ffb24a', '#ff7a3d']) {
  if (reduceMotion()) n = Math.min(n, 3);
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.7, d = 9 + Math.random() * 13;
    const s = el(`<i class="mg-spark" style="left:${x}%;top:${y}%;--dx:${(Math.cos(a) * d).toFixed(1)}cqw;--dy:${(Math.sin(a) * d).toFixed(1)}cqw;background:${colors[i % colors.length]}"></i>`);
    field.appendChild(s);
    setTimeout(() => s.remove(), 620);
  }
}
/** Anillo que se abre (toque, acierto). */
export function ring(field, x, y, kind = '') {
  const r = el(`<i class="mg-ring ${kind}" style="left:${x}%;top:${y}%"></i>`);
  field.appendChild(r);
  setTimeout(() => r.remove(), 520);
}
/** Reinicia una animación CSS de una clase (sacudida, destello). */
export function pulse(node, cls, ms = 420) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
  setTimeout(() => node.classList.remove(cls), ms);
}
/** Posición de un evento de puntero dentro de un elemento, de 0 a 1. */
export function pointerAt(e, node) {
  const r = node.getBoundingClientRect();
  return { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) };
}

/* ───────────── sonidos: siempre en la tonalidad del tema que suena ───────────── */

export const snd = {
  /** Acierto: nota del arpegio (sube con `i`) y un brillo corto. */
  good(i = 0) { tone(keyHz(i % 6, 1), 0.14, 'triangle', 0.075, 0, 0, 3600); tone(keyHz((i % 6) + 2, 2), 0.09, 'sine', 0.03, 0.03, 0, 6000); vib(8); },
  /** Acierto perfecto: acorde luminoso. */
  great() { [0, 2, 4].forEach((k, i) => tone(keyHz(k, 2), 0.3, 'sine', 0.055, i * 0.035, 0, 6500)); noise(0.12, 0.03, 6000, 'highpass'); vib([10, 20, 14]); },
  /** Fallo: golpe sordo que cae. */
  bad() { tone(170, 0.2, 'sawtooth', 0.05, 0, -60, 900); noise(0.08, 0.06, 300, 'lowpass'); vib([28, 30, 28]); },
  /** Toque neutro (madera). */
  tap() { noise(0.03, 0.06, 1500, 'bandpass'); tone(keyHz(0, 0), 0.06, 'sine', 0.05, 0, -20, 900); },
  /** Nota concreta del tema (grado del arpegio) con timbre de campana. */
  bell(k = 0, oct = 1, v = 0.08) { const f = keyHz(k, oct); tone(f, 0.5, 'sine', v, 0, 0, 4200); tone(f * 2.76, 0.3, 'sine', v * 0.22, 0, 0, 7000); },
  /** Algo aparece / se mueve. */
  whoosh() { noise(0.16, 0.035, 900, 'bandpass', 0, 2200); },
  pop() { tone(keyHz(2, 1), 0.07, 'sine', 0.05, 0, 120, 3000); },
  splash() { noise(0.2, 0.07, 1800, 'bandpass', 0, -1200); tone(300, 0.15, 'sine', 0.04, 0, -160); },
  thud() { noise(0.09, 0.12, 420, 'lowpass'); tone(keyHz(0, -1), 0.16, 'sine', 0.12, 0, -14, 500); vib(12); },
  clank() { noise(0.05, 0.08, 3200, 'bandpass'); tone(keyHz(0, 1), 0.2, 'triangle', 0.06, 0, 0, 2400); tone(keyHz(2, 2), 0.12, 'square', 0.02, 0.01, 0, 3200); vib(10); },
  tick() { noise(0.016, 0.05, 3200, 'bandpass'); },
  /** Cuenta atrás (3, 2, 1) y salida. */
  count() { tone(keyHz(0, 1), 0.12, 'triangle', 0.08, 0, 0, 2600); vib(6); },
  go() { [0, 2, 3].forEach((k, i) => tone(keyHz(k, 1), 0.28, 'triangle', 0.075, i * 0.04, 0, 3600)); noise(0.2, 0.04, 1200, 'bandpass', 0, 3000); vib(16); },
  /** Estrella n (1-5) del resultado: cada una más aguda. */
  star(n) { tone(keyHz(n - 1, 1), 0.22, 'sine', 0.085, 0, 0, 5000); tone(keyHz(n + 1, 2), 0.14, 'triangle', 0.035, 0.04, 0, 7000); vib(8); },
  /** Estrella vacía: golpecito apagado. */
  starOff() { tone(keyHz(0, 0), 0.08, 'sine', 0.04, 0, -30, 600); },
  /** Cierre según la nota: de un suspiro (0) a una fanfarria (5). */
  result(grade) {
    if (grade <= 0) { tone(220, 0.5, 'triangle', 0.05, 0, -90); return; }
    const n = 2 + grade;
    for (let i = 0; i < n; i++) tone(keyHz(i, 1), 0.34, 'sine', 0.07, i * 0.07, 0, 5200);
    if (grade >= 4) { [0, 1, 2].forEach((k) => tone(keyHz(k, 1), 1.1, 'triangle', 0.05, n * 0.07)); noise(0.5, 0.03, 6000, 'highpass', n * 0.07); }
    vib(grade >= 4 ? [20, 40, 20, 40, 40] : 18);
  },
};

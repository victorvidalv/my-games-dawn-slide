/* Arranca el juego completo dentro de happy-dom con el HTML real (index.html), para probar la interfaz sin navegador. */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, vi } from 'vitest';

const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
let music;
afterEach(() => music?.background());

/** happy-dom no dibuja: un contexto 2D que acepta cualquier llamada basta para los efectos visuales. */
const noop = () => {};
const ctx2d = new Proxy(
  {},
  { get: (_, k) => (k === 'canvas' ? null : k === 'measureText' ? () => ({ width: 0 }) : noop), set: () => true },
);
HTMLCanvasElement.prototype.getContext = function getContext(kind) {
  return kind === '2d' ? ctx2d : null;
};

/** Audio de mentira: cualquier nodo, parámetro o método existe y no hace nada. */
const fakeNode = () =>
  new Proxy(function fake() {}, {
    get: (_, k) =>
      k === 'state'
        ? 'running'
        : k === 'currentTime'
          ? 0
          : k === 'sampleRate'
            ? 44100
            : k === 'value'
              ? 0
              : k === 'then'
                ? undefined
                : k === Symbol.toPrimitive
                  ? () => 0
                  : fakeNode(),
    set: () => true,
    apply: () => fakeNode(),
    construct: () => fakeNode(),
  });
globalThis.AudioContext = window.AudioContext = function AudioContext() {
  return fakeNode();
};
globalThis.Worker = undefined; // los tableros se generan en el mismo hilo
/* Sin red: las imágenes que el juego descarga por su cuenta (animaciones de poder) responden 404 al instante. */
window.fetch = globalThis.fetch = async () => new Response(null, { status: 404 });

export async function bootApp({ save } = {}) {
  music?.background();
  vi.resetModules();
  localStorage.clear();
  localStorage.setItem('slideslay.lang', 'es'); // textos de origen: los tests no dependen de las traducciones
  if (save) localStorage.setItem('desbloquea.rogue.v2', JSON.stringify(save));
  globalThis.__APP_VERSION__ = 'test';
  document.documentElement.innerHTML = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/^[\s\S]*?<html[^>]*>/i, '')
    .replace(/<\/html>[\s\S]*$/i, '');
  await import('../../src/main.js');
  ({ Music: music } = await import('../../src/audio/music.js'));
  const state = await import('../../src/state.js');
  const session = await import('../../src/game/session.js');
  return { ...state, session, $: (id) => document.getElementById(id) };
}

/** Espera a que se cumpla `check` (los tableros y las transiciones son asíncronos). */
export async function until(check, { timeout = 8000, step = 20 } = {}) {
  const end = Date.now() + timeout;
  for (;;) {
    const v = check();
    if (v) return v;
    if (Date.now() > end) throw new Error(`timeout esperando: ${check}`);
    await new Promise((r) => setTimeout(r, step));
  }
}

/** Espera a que el tablero `n` esté listo para jugar, cerrando las ventanas de ayuda (coach) que aparezcan. */
export async function untilPlayable(app, n, opts) {
  return until(() => {
    if (app.$('coach').classList.contains('show')) app.$('coachOk').click();
    return app.S.G?.n === n && !app.S.G.done && !app.S.busy;
  }, opts);
}

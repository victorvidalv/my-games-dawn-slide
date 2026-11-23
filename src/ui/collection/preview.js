/**
 * Probador de Personalizar: muestra un objeto en vivo (tablero de muestra, portada, carta, música…) antes de
 * equiparlo. Lo bloqueado se puede probar y enseña lo que falta para conseguirlo.
 */
import { Music } from '../../audio/music.js';
import { sfx } from '../../audio/sound.js';
import { DEFAULT_LOOK, lookOf, rewardById, rewardUnlocked, setLook } from '../../game/achievements.js';
import { HEROES } from '../../game/heroes.js';
import { persist, store } from '../../state.js';
import { fateCardHtml } from '../fate.js';
import { celebration, trailPath } from '../fx.js';
import { icon } from '../icons.js';
import { openOverlay } from '../overlay.js';
import { TYPE_HINT, TYPE_NAME, inRun, rarityOf, reducedMotion, rewardName } from './common.js';
import { applyLook, playEquippedMusic, themeOf } from './look.js';
import { unlockHtml } from './requirements.js';
import { DEFAULT_BG_SRC, SAMPLE_FATES, demoBoard, miniBoard } from './swatches.js';

/** Tipos que se prueban «puestos» sobre la página (atributos de <body>) mientras dura la vista previa. */
const WORN_TYPES = ['board', 'pieces', 'key', 'ui'];
/** Tipos que tienen probador. */
const PREVIEW_TYPES = ['board', 'pieces', 'key', 'card', 'trail', 'fx', 'cover', 'bg', 'music', 'aura', 'ui'];

const imageStage = (src, extra = '') => `<div class="look-pv-cover${extra}"><img src="/${src}" alt="">`;
const uiStage = (id) => `<div class="uim-stage" data-ui-scope="${id}">
      <div class="uim-menu"><b class="uim-logo">DAWN<i>SLIDE</i></b>
        <div class="uim-modes"><span class="uim-mode m1"><i></i><b>Aventura</b><small>Camino de 21 niveles</small></span><span class="uim-mode m2"><i></i><b>Desafío</b><small>Con límite de turnos</small></span><span class="uim-mode m3"><i></i><b>Retos diarios</b><small>Reto de hoy pendiente</small></span></div>
        <div class="uim-row"><span class="uim-pill">Personalizar</span><span class="uim-pill">Más</span></div>
      </div>
      <div class="uim-pick"><b>Elige tu compañero</b><div class="uim-heroes">${HEROES.map((h) => `<span class="uim-hero${h.id === 'lia' ? ' on' : ''}" style="--accent:${h.color}"><i></i><small>${h.name}</small></span>`).join('')}</div><span class="uim-go">Comenzar aventura ➜</span></div>
    </div>`;

/** Escena del probador según el tipo; por defecto, el tablero de muestra. */
const STAGES = {
  trail: () => demoBoard(),
  fx: (id) =>
    `${demoBoard()}<button type="button" class="look-pv-play" data-pv-fx>${id === 'none' ? 'Sin celebración' : 'Probar celebración'}</button>`,
  aura: (id) =>
    `${imageStage(rewardById('bg', lookOf(store).bg)?.src || DEFAULT_BG_SRC, ' look-pv-aura')}<i class="aura-fx" data-aura="${id}"><i></i></i></div>`,
  ui: uiStage,
  card: (id) =>
    `<div class="look-fates" data-card-scope="${id}">${SAMPLE_FATES.map((c, i) => fateCardHtml(c, { tag: 'span', index: i })).join('')}</div>`,
  cover: (id) => `${imageStage(rewardById('cover', id)?.src || '')}</div>`,
  bg: (id) => `${imageStage(rewardById('bg', id)?.src || '')}</div>`,
  music: () =>
    `<div class="look-pv-music"><div class="look-disc" aria-hidden="true"><i>${icon('stars')}</i></div><button type="button" class="look-pv-play" data-pv-play>Escuchar</button></div>`,
};
const stageFor = (type, id) => (STAGES[type] || miniBoard)(id);

function footerFor(type, id) {
  if (!rewardUnlocked(type, id, store)) return `<div class="unlock-foot pv-unlock">${unlockHtml(type, id)}</div>`;
  if (lookOf(store)[type] === id) return `<button type="button" class="shop-act equipped" disabled>Equipado ✓</button>`;
  return `<button type="button" class="shop-act equip" data-pv-equip>Equipar</button><small class="look-pv-sub">Ya es tuyo</small>`;
}

/** Pone el objeto «puesto» mientras dura la vista previa. */
function tryOn(type, id) {
  const look = { ...lookOf(store), [type]: id };
  for (const t of WORN_TYPES) document.body.dataset[t] = look[t];
}

/** Posición de la llave (0 → 4 → 0) en un vaivén suave de 3,2 s. */
const demoX = (seconds) => {
  const cyc = (seconds % 3.2) / 3.2,
    k = cyc < 0.5 ? cyc * 2 : 2 - cyc * 2;
  return 4 * (1 - Math.cos(Math.PI * k)) * 0.5;
};

/**
 * Demostración en vivo de una estela o una celebración sobre el tablero de muestra: la llave de la fila 3 va y viene
 * y, según el caso, deja su estela por el camino o lanza la celebración al llegar a la salida. Devuelve cómo pararla.
 */
function startDemo(el, type, id) {
  const key = el.querySelector('.look-mini .piece.red'),
    board = el.querySelector('.look-mini-board');
  if (!key || !board) return undefined;
  const item = rewardById(type, id),
    calm = reducedMotion();
  const fireFx = () => {
    if (!item?.burst) return;
    const b = board.getBoundingClientRect(),
      r = key.getBoundingClientRect();
    celebration(id, b.right - 8, r.top + r.height / 2, b.width, item.burst.colors);
  };
  const drawsTrail = type === 'trail' && item?.colors && !calm;
  const firesFx = type === 'fx' && item?.burst && !calm;
  let raf = 0,
    prev = null,
    lastX = -1;
  const t0 = performance.now();
  const leaveTrail = (x) => {
    const r = key.getBoundingClientRect(),
      px = lastX < 0 || x >= lastX ? r.left : r.right,
      py = r.top + r.height / 2;
    if (prev && Math.abs(x - lastX) > 0.002) trailPath(id, prev[0], prev[1], px, py, item.colors);
    prev = [px, py];
  };
  const frame = (now) => {
    const x = demoX((now - t0) / 1000);
    if (!calm) key.style.setProperty('--x', x.toFixed(3));
    if (drawsTrail) leaveTrail(x);
    // La celebración se lanza cuando la llave llega a la salida y no se repite hasta que vuelve
    if (firesFx && lastX < 3.9 && x >= 3.9) fireFx();
    lastX = x;
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  const btn = el.querySelector('[data-pv-fx]');
  if (btn) btn.onclick = fireFx;
  if (type === 'fx' && calm) setTimeout(fireFx, 300);
  return () => cancelAnimationFrame(raf);
}

let pv = null; // { type, id, el, close, playing, stopDemo, onChange }

function setPlaying(on) {
  pv.playing = on;
  const play = pv.el.querySelector('[data-pv-play]');
  if (play) play.textContent = on ? 'Detener' : 'Escuchar';
  pv.el.querySelector('.look-pv-music')?.classList.toggle('on', on);
}

function equipPreviewed() {
  const { type, id } = pv;
  if (!setLook(store, type, id)) return;
  persist();
  sfx.ui();
  if (!WORN_TYPES.includes(type)) applyLook();
  playEquippedMusic(type);
  if (type === 'music') setPlaying(true);
  paintFooter();
  pv.onChange?.(`Activado: ${rewardName(type, id)}`);
}

function paintFooter() {
  pv.el.querySelector('.look-pv-foot').innerHTML = footerFor(pv.type, pv.id);
  const equip = pv.el.querySelector('[data-pv-equip]');
  if (equip) equip.onclick = equipPreviewed;
}

function bindMusic(el, id) {
  const play = el.querySelector('[data-pv-play]');
  if (!play) return;
  if (inRun()) play.hidden = true;
  play.onclick = () => {
    if (!pv) return;
    if (pv.playing) Music.scene('menu');
    else Music.playTheme(themeOf(id));
    setPlaying(!pv.playing);
  };
}

/** Cierra el probador (si está abierto) y deja puesto lo equipado. */
export function closePreview() {
  pv?.close();
}

/**
 * Abre el probador de un objeto.
 * @param {(message: string) => void} [onChange] se llama al equipar, con el aviso para el jugador
 */
export function openPreview(type, id, { onChange } = {}) {
  const item = rewardById(type, id);
  if (!item || !PREVIEW_TYPES.includes(type)) return;
  closePreview();
  const rar = rarityOf(item);
  const chip =
    DEFAULT_LOOK[type] === id
      ? `<span class="rar-chip default-chip">Por defecto</span>`
      : `<span class="rar-chip">${rar.name}</span>`;
  const { el, close } = openOverlay({
    className: 'look-pv-ov',
    labelledBy: 'lookPvName',
    closeSelector: '[data-pv-close]',
    html: `<div class="look-pv r-${rar.id}${rewardUnlocked(type, id, store) ? ' unlocked' : ''}">
      <header class="look-pv-head">
        ${chip}${item.anim ? `<span class="anim-chip">Animado</span>` : ''}
        <small>${TYPE_NAME[type]}</small>
        <h3 id="lookPvName">${item.name}</h3>
        <button type="button" class="look-pv-x" data-pv-close aria-label="Cerrar">✕</button>
      </header>
      <div class="look-pv-stage" data-type="${type}">${stageFor(type, id)}</div>
      <p class="look-pv-note"><b>${TYPE_HINT[type]}</b><span>${rar.note}</span></p>
      <footer class="look-pv-foot"></footer>
    </div>`,
    onClose: () => {
      const { playing, stopDemo } = pv;
      pv = null;
      stopDemo?.();
      applyLook(); // quita lo que se estaba probando y deja lo equipado
      if (playing && !inRun() && lookOf(store).music !== id) Music.scene('menu'); // vuelve a la música equipada
    },
    returnFocus: () => document.querySelector(`[data-open-type="${type}"][data-open-id="${id}"]`),
  });
  pv = { type, id, el, close, playing: false, onChange };
  if (WORN_TYPES.includes(type)) tryOn(type, id);
  paintFooter();
  if (type === 'trail' || type === 'fx') pv.stopDemo = startDemo(el, type, id);
  bindMusic(el, id);
  sfx.ui();
  (el.querySelector('[data-pv-equip]') || el.querySelector('[data-pv-close]'))?.focus?.();
}

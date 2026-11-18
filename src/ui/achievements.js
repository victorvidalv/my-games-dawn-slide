/**
 * Logros: panel del menú (lista con progreso + recompensas que se activan con un toque), aviso al ganar uno
 * y aplicación del aspecto elegido (música del menú, llave, diseño de piezas y celebración).
 * Las reglas están en src/game/achievements.js.
 */
import { Music } from '../audio/music.js';
import { sfx } from '../audio/sound.js';
import { MENU_THEME, ZONE_THEMES, bossThemeFor } from '../audio/themes.js';
import { $ } from '../dom.js';
import { ACHIEVEMENTS, GROUPS, REWARDS, REWARD_TYPES, bumpStat, claimAchievements, lookOf, markStat as addToCollection, progressOf, rewardUnlocked, setLook, sourceOf, statsOf } from '../game/achievements.js';
import { S, persist, store } from '../state.js';
import { burst } from './fx.js';
import { icon } from './icons.js';

const TYPE_NAME = { music: 'Música del menú', key: 'Llave', pieces: 'Piezas', fx: 'Celebración' };
const TYPE_ICON = { music: 'stars', key: 'unlock', pieces: 'rock', fx: 'crown' };
const themeOf = (id) => (id === 'boss' ? bossThemeFor(0) : id?.startsWith('z') ? ZONE_THEMES[Number(id.slice(1))] : MENU_THEME) || MENU_THEME;
const rewardName = (type, id) => REWARDS[type].find((r) => r.id === id)?.name || '';

/** Aplica el aspecto guardado: clases en <body> para llave y piezas, y el tema del menú. */
export function applyLook() {
  const look = lookOf(store);
  document.body.dataset.key = look.key;
  document.body.dataset.pieces = look.pieces;
  Music.setMenuTheme(themeOf(look.music));
  return look;
}
/** Celebración elegida al sacar la llave (nada si es «Sin adornos»). */
export function celebrate(el) {
  const fx = REWARDS.fx.find((r) => r.id === lookOf(store).fx)?.burst;
  if (!fx || !el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const b = $('board').getBoundingClientRect(), r = el.getBoundingClientRect();
  burst(b.right - 8, r.top + r.height / 2, fx.n, fx.colors, fx.speed);
}

/* ---------- aviso «logro conseguido» (de uno en uno) ---------- */
const queue = [];
let activeToast = null;
let toastsPaused = false;
function nextToast() {
  if (toastsPaused || activeToast || !queue.length) return;
  const a = queue.shift();
  const t = document.createElement('div');
  t.className = 'ach-toast'; t.setAttribute('role', 'status');
  t.innerHTML = `<i aria-hidden="true">${icon('trophy')}</i><div><small>Logro conseguido</small><b></b><span></span></div>`;
  t.querySelector('b').textContent = a.name;
  t.querySelector('span').textContent = a.reward ? `Nuevo: ${rewardName(a.reward[0], a.reward[1])}` : '';
  document.body.appendChild(t);
  sfx.unlock();
  const timer = setTimeout(() => { t.remove(); activeToast = null; nextToast(); }, 3200);
  activeToast = { achievement: a, element: t, timer };
}

/** Guarda los avisos mientras el jugador elige el camino y viaja a la próxima ciudad. */
export function pauseAchievementToasts(paused) {
  toastsPaused = paused;
  if (paused && activeToast) {
    clearTimeout(activeToast.timer);
    activeToast.element.remove();
    queue.unshift(activeToast.achievement);
    activeToast = null;
  }
  if (!paused) nextToast();
}
/** Comprueba si se ha ganado algún logro, lo guarda y lo anuncia. Se puede llamar tantas veces como se quiera. */
export function checkAchievements({ silent = false } = {}) {
  const fresh = claimAchievements(store);
  if (!fresh.length) return fresh;
  persist();
  if (!silent) { queue.push(...fresh.slice(0, 3)); nextToast(); }
  $('tabAch')?.classList.add('has-news');
  return fresh;
}
/** Suma 1 a uno o varios contadores de logros (ver COUNTERS en src/game/achievements.js) y comprueba los logros. */
export function countStat(...names) {
  if (!names.length) return;
  for (const name of names) bumpStat(store, name);
  persist();
  checkAchievements();
}
/** Anota `key` en una colección de logros (héroes jugados, caminos completados…) y comprueba los logros si es nuevo. */
export function markStat(name, key) {
  if (!addToCollection(store, name, key)) return;
  persist();
  checkAchievements();
}

/* ---------- panel del menú ---------- */
const swatch = (type, id) => (type === 'key' ? `<i class="sw sw-key" data-key="${id}"></i>` : type === 'pieces' ? `<i class="sw sw-piece" data-pieces="${id}"></i>` : type === 'fx' ? `<i class="sw sw-fx" data-fx="${id}"></i>` : `<i class="sw sw-music">${icon('stars')}</i>`);
export function renderAchievements() {
  const box = $('panelAch');
  if (!box) return;
  const stats = statsOf(store), ach = store.ach || {}, look = lookOf(store);
  const done = ACHIEVEMENTS.filter((a) => ach[a.id]).length;
  const rewards = REWARD_TYPES.map((type) => `<div class="look-row"><span class="look-label">${icon(TYPE_ICON[type])}<b>${TYPE_NAME[type]}</b></span><div class="look-opts" role="radiogroup" aria-label="${TYPE_NAME[type]}">${REWARDS[type].map((r) => {
    const open = rewardUnlocked(type, r.id, ach), on = look[type] === r.id;
    return `<button type="button" class="look-opt${on ? ' on' : ''}${open ? '' : ' locked'}" role="radio" aria-checked="${on}" data-type="${type}" data-id="${r.id}" ${open ? '' : 'aria-disabled="true"'}>${swatch(type, r.id)}<span>${r.name}</span>${open ? '' : icon('lock')}</button>`;
  }).join('')}</div></div>`).join('');
  const list = (group) => ACHIEVEMENTS.filter((a) => a.group === group).map((a) => {
    const got = !!ach[a.id], p = got ? a.goal : progressOf(a, stats);
    return `<li class="ach${got ? ' got' : ''}"><i class="ach-ico" aria-hidden="true">${icon(got ? 'trophy' : 'lock')}</i><div class="ach-copy"><b>${a.name}</b><span>${a.desc}</span>${a.reward ? `<small>${icon(TYPE_ICON[a.reward[0]])}<em>${rewardName(a.reward[0], a.reward[1])}</em></small>` : ''}</div><div class="ach-prog" role="img" aria-label="${p}/${a.goal}"><u><i style="width:${(p / a.goal) * 100}%"></i></u><span>${p}/${a.goal}</span></div></li>`;
  }).join('');
  box.innerHTML = `<div class="ach-total"><p><b>${done}</b> / ${ACHIEVEMENTS.length} <span>logros</span></p><u role="img" aria-label="${done}/${ACHIEVEMENTS.length}"><i style="width:${(done / ACHIEVEMENTS.length) * 100}%"></i></u></div>
    ${GROUPS.map((g) => `<h3 class="panel-h">${g.name}</h3><ul class="ach-list">${list(g.id)}</ul>`).join('')}
    <h3 class="panel-h">Recompensas</h3><p class="look-note" id="lookNote" role="status">Toca una recompensa para activarla.</p>${rewards}`;
  box.querySelectorAll('.look-opt').forEach((b) => {
    b.onclick = () => {
      const { type, id } = b.dataset, note = $('lookNote');
      if (!setLook(store, type, id)) {
        const src = sourceOf(type, id);
        note.textContent = src ? `Se consigue con el logro «${src.name}»: ${src.desc}.` : '';
        b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
        return;
      }
      persist();
      applyLook();
      sfx.ui();
      note.textContent = `Activado: ${rewardName(type, id)}`;
      if (type === 'music' && !(S.run && S.G && !S.G.done)) Music.scene('menu');      // se oye al instante: es la vista previa
      box.querySelectorAll(`.look-opt[data-type="${type}"]`).forEach((o) => { const on = o === b; o.classList.toggle('on', on); o.setAttribute('aria-checked', String(on)); });
    };
  });
  $('tabAch')?.classList.remove('has-news');
}
// los logros de un jugador que ya tenía avance se anotan sin avisos al cargar; el aspecto guardado se aplica desde el principio
checkAchievements({ silent: true });
applyLook();

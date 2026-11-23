/** Visor de atuendos: el traje en grande sobre un fondo oscuro animado, con sus tres poses (también los bloqueados). */
import { sfx } from '../../audio/sound.js';
import { $ } from '../../dom.js';
import { DEFAULT_OUTFIT, OUTFITS, outfitArt, outfitOf, outfitUnlocked, setOutfit } from '../../game/achievements.js';
import { HEROES } from '../../game/heroes.js';
import { S, persist, store } from '../../state.js';
import { openOverlay } from '../overlay.js';
import { rarityOf } from './common.js';
import { unlockHtml } from './requirements.js';

const POSES = [
  ['adv', 'Aventura'],
  ['sel', 'Selección'],
  ['act', 'Pose'],
];

let showcase = null; // { el, close, hero, id, pose, onChange }

/** Equipa un atuendo y lo refleja en el HUD si su héroe está jugando. Devuelve false si no se pudo. */
export function wearOutfit(hero, id) {
  if (!setOutfit(store, hero, id)) return false;
  persist();
  if (S.run?.hero === hero && $('heroHudImg')) $('heroHudImg').src = outfitArt(hero, id, 'sel');
  sfx.ui();
  return true;
}

function footHtml(hero, id) {
  if (!outfitUnlocked(store, hero, id))
    return `<p class="os-locked">Bloqueado</p><div class="unlock-foot">${unlockHtml('outfit', `${hero}:${id}`)}</div>`;
  if (outfitOf(store, hero) === id)
    return `<button type="button" class="shop-act equipped" disabled>Equipado ✓</button>`;
  return `<button type="button" class="shop-act equip" data-os-equip>Equipar</button>`;
}

function paint() {
  const { el, hero, id, pose } = showcase;
  const h = HEROES.find((x) => x.id === hero);
  const o = OUTFITS[hero].find((x) => x.id === id);
  el.querySelector('.os-art').src = outfitArt(hero, id, pose);
  el.querySelector('.rar-chip').textContent = DEFAULT_OUTFIT[hero] === id ? 'Por defecto' : rarityOf(o).name;
  el.querySelector('#osName').textContent = o.name;
  el.querySelector('.os-hero').textContent = h.name;
  el.querySelectorAll('[data-os-pose]').forEach((b) => {
    const on = b.dataset.osPose === pose;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', String(on));
  });
  el.classList.toggle('is-locked', !outfitUnlocked(store, hero, id));
  el.querySelector('.os-foot').innerHTML = footHtml(hero, id);
  el.querySelector('[data-os-equip]')?.addEventListener('click', () => {
    if (!wearOutfit(hero, id)) return;
    paint();
    showcase.onChange?.(`Activado: ${o.name}`);
  });
}

/** Cierra el visor si está abierto. */
export function closeShowcase() {
  showcase?.close();
}

/**
 * Abre el visor de un traje.
 * @param {(message: string) => void} [onChange] se llama al equipar, con el aviso para el jugador
 */
export function openShowcase(hero, id, { pose = 'adv', onChange } = {}) {
  const h = HEROES.find((x) => x.id === hero);
  const o = OUTFITS[hero]?.find((x) => x.id === id);
  if (!h || !o) return;
  closeShowcase();
  const { el, close } = openOverlay({
    className: 'outfit-show-ov',
    labelledBy: 'osName',
    closeSelector: '[data-os-close]',
    html: `<div class="os-bg" aria-hidden="true"><i class="os-fog"></i><i class="os-fog os-fog-2"></i><i class="os-beam"></i><i class="os-dust"></i></div>
    <button type="button" class="os-close" data-os-close aria-label="Cerrar">✕</button>
    <figure class="os-stage"><img class="os-art" alt="" decoding="async"></figure>
    <div class="os-info">
      <span class="rar-chip r-${rarityOf(o).id}"></span>
      <h3 id="osName"></h3>
      <p class="os-hero"></p>
      <div class="os-poses" role="tablist" aria-label="Pose">${POSES.map(([p, label]) => `<button type="button" role="tab" data-os-pose="${p}">${label}</button>`).join('')}</div>
      <div class="os-foot"></div>
    </div>`,
    onClick: (e) => {
      const pb = e.target.closest('[data-os-pose]');
      if (!pb) return;
      showcase.pose = pb.dataset.osPose;
      sfx.ui();
      paint();
    },
    onClose: () => {
      showcase = null;
    },
  });
  el.style.setProperty('--accent', h.color);
  showcase = { el, close, hero, id, pose, onChange };
  paint();
  sfx.ui();
  el.querySelector('[data-os-close]').focus();
}

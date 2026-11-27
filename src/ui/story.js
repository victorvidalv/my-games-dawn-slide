import { HERO_LORE } from '../data/story.js';
import { $ } from '../dom.js';
import { outfitArt, outfitOf } from '../game/achievements.js';
import { heroOf, store } from '../state.js';
import { mountOutfitFx } from './outfit-fx.js';

/** Imagen del atuendo puesto (`adv` cuerpo entero, `sel` pose pasiva, `act` pose de combate). */
export const outfitImg = (id, pose) => outfitArt(id, outfitOf(store, id), pose);

export function endingStory(victory, id) {
  const h = heroOf(id),
    l = HERO_LORE[h.id];
  if (!victory) {
    $('overPortrait').src = outfitImg(h.id, 'act');
    $('overPortrait').alt = `${h.name}, sin fuerzas tras la derrota`;
    mountOutfitFx($('overPortrait'), h.id);
    return;
  }
  const port = $('fPortrait');
  port.parentElement.style.removeProperty('--ending-scene');
  port.src = outfitImg(h.id, 'act');
  port.alt = `${h.name} alcanza el final de su senda`;
  mountOutfitFx(port, h.id);
  $('fLore').textContent = '';
  $('fThanks').textContent = `${h.name}: ${l.thanksWin}`;
}

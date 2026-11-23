import { HERO_LORE } from '../data/story.js';
import { $ } from '../dom.js';
import { outfitArt, outfitOf } from '../game/achievements.js';
import { heroOf, store } from '../state.js';

/** Imagen del atuendo puesto (`adv` aventura, `sel` busto y `act` pose de selección). */
export const outfitImg = (id, pose) => outfitArt(id, outfitOf(store, id), pose);

export function endingStory(victory, id) {
  const h = heroOf(id),
    l = HERO_LORE[h.id];
  if (!victory) {
    $('overPortrait').src = outfitImg(h.id, 'act');
    $('overPortrait').alt = `${h.name}, sin fuerzas tras la derrota`;
    return;
  }
  const port = $('fPortrait');
  port.parentElement.style.removeProperty('--ending-scene');
  port.src = outfitImg(h.id, 'act');
  port.alt = `${h.name} alcanza el final de su senda`;
  $('fLore').textContent = '';
  $('fThanks').textContent = `${h.name}: ${l.thanksWin}`;
}

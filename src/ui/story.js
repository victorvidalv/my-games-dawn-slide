import { CHAPTERS, HERO_LORE } from '../data/story.js';
import { ZONES, zoneIdx } from '../data/zones.js';
import { $, cssUrl } from '../dom.js';
import { DEFAULT_OUTFIT, outfitArt, outfitOf } from '../game/achievements.js';
import { heroOf, store } from '../state.js';
export function heroArt(id, pose) {
  return `heroes/${id}-${pose}.webp`;
}
/** Imagen del atuendo puesto (`adv` aventura, `sel` busto y `act` pose de selección); la normal si lleva el de serie. */
export const outfitImg = (id, pose) => outfitArt(id, outfitOf(store, id), pose);
export function storyFor(id, level) {
  const i = zoneIdx(level),
    c = CHAPTERS[i],
    h = heroOf(id),
    l = HERO_LORE[h.id];
  return {
    chapter: i + 1,
    level: i * 10 + 1,
    city: ZONES[i].n,
    title: c.title,
    body: c.opening,
    cityLines: c.cityLines,
    vhorn: c.vhorn,
    action: l.chapterLines[i],
    quote: l.quote,
    seal: c.seal,
    inscription: c.inscription,
  };
}
export function endingStory(victory, id, level) {
  const h = heroOf(id),
    l = HERO_LORE[h.id],
    bg = `backgrounds/zone-${zoneIdx(level) + 1}.webp`;
  if (!victory) {
    // La imagen activa del héroe (con su traje) sobre un fondo CSS siniestro y en movimiento (47-defeat.css)
    $('overPortrait').src = outfitImg(h.id, 'act');
    $('overPortrait').alt = `${h.name}, sin fuerzas tras la derrota`;
    return;
  }
  const port = $('fPortrait');
  port.parentElement.style.setProperty('--ending-scene', cssUrl(bg));
  const custom = outfitOf(store, h.id) !== DEFAULT_OUTFIT[h.id];
  port.onerror = () => {
    port.onerror = null;
    port.src = heroArt(h.id, 'victory');
  };
  port.src = custom ? outfitImg(h.id, 'act') : heroArt(h.id, 'final');
  port.alt = `${h.name} alcanza el final de su senda`;
  $('fLore').textContent = l.endingLore;
  $('fThanks').textContent = `${h.name}: ${l.thanksWin}`;
}

/**
 * Escena de poder detrás del retrato del héroe cuando lleva un traje épico o legendario (Personalizar, selección de
 * héroe, cartas del destino, derrota y final). El marcado está aquí; los estilos en 57-legendary-storm.css (tormenta),
 * 58-epic-arcane.css (santuario arcano) y 59-outfit-fx.css (cómo se coloca en cada pantalla).
 */
import { OUTFITS, outfitOf } from '../game/achievements.js';
import { store } from '../state.js';

/** Legendario: nubes de tormenta, aura, anillo de energía, rayos con destello y chispas. */
const LEGEND_STORM =
  '<span class="lg-storm" aria-hidden="true"><i class="lg-clouds"></i><i class="lg-aura"></i><i class="lg-ring"></i><i class="lg-bolt lg-bolt-1"></i><i class="lg-bolt lg-bolt-2"></i><i class="lg-bolt lg-bolt-3"></i><i class="lg-flash"></i><i class="lg-sparks"></i></span>';
/** Épico: nebulosa, rayos de luz, sello arcano doble, cristales que flotan y estrellas. */
const EPIC_ARCANE =
  '<span class="ep-arcane" aria-hidden="true"><i class="ep-nebula"></i><i class="ep-rays"></i><i class="ep-sigil"></i><i class="ep-sigil ep-sigil-in"></i><i class="ep-shard ep-s1"></i><i class="ep-shard ep-s2"></i><i class="ep-shard ep-s3"></i><i class="ep-shard ep-s4"></i><i class="ep-shard ep-s5"></i><i class="ep-stars"></i></span>';

/** Escena según la rareza (`legendary`, `epic`); las demás no llevan. */
export const rarityBackdrop = (rarity) => ({ legendary: LEGEND_STORM, epic: EPIC_ARCANE })[rarity] || '';

/** Rareza del traje que lleva puesto un héroe. */
export function wornRarity(heroId) {
  const id = outfitOf(store, heroId);
  return OUTFITS[heroId]?.find((o) => o.id === id)?.rarity || 'common';
}

/** Pone (o quita) la escena de poder justo antes de `img`, según el traje que lleva `heroId`. */
export function mountOutfitFx(img, heroId) {
  if (!img) return;
  const prev = img.previousElementSibling;
  if (prev?.classList.contains('ofx')) prev.remove();
  const html = rarityBackdrop(wornRarity(heroId));
  if (!html) return;
  img.insertAdjacentHTML('beforebegin', html);
  img.previousElementSibling.classList.add('ofx');
}

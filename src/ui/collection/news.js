/** Novedades: objetos y entradas de Lore desbloqueados que aún no has visto, y sus avisos en el inicio. */
import { $ } from '../../dom.js';
import {
  CUSTOM_TYPES,
  DEFAULT_OUTFIT,
  OUTFITS,
  REWARDS,
  outfitUnlocked,
  rewardUnlocked,
  unlockOf,
} from '../../game/achievements.js';
import { loreUnlockedKeys } from '../../game/lore.js';
import { persist, store } from '../../state.js';

/* ---------- novedades: objetos desbloqueados que aún no has visto ---------- */
export const unseenKeys = () => {
  const seen = store.customSeen || {};
  const keys = [];
  for (const type of CUSTOM_TYPES)
    for (const item of REWARDS[type] || [])
      if (unlockOf(type, item.id) && rewardUnlocked(type, item.id, store) && !seen[`${type}:${item.id}`])
        keys.push(`${type}:${item.id}`);
  for (const [hero, list] of Object.entries(OUTFITS))
    for (const o of list)
      if (o.id !== DEFAULT_OUTFIT[hero] && outfitUnlocked(store, hero, o.id) && !seen[`outfit:${hero}:${o.id}`])
        keys.push(`outfit:${hero}:${o.id}`);
  for (const k of loreUnlockedKeys(store)) if (!seen[k]) keys.push(k);
  return keys;
};
export const unseenIn = (type) => unseenKeys().filter((k) => k.startsWith(`${type}:`)).length;
/** Entradas que eran nuevas al entrar en la vista actual: conservan su sello «Nuevo» aunque ya cuenten como vistas. */
let freshNow = new Set();
let freshView = '';
/** Empieza una vista (p. ej. «lore|world|lia»): si cambió, olvida qué era nuevo en la anterior. Devuelve si cambió. */
export function enterView(view) {
  if (view === freshView) return false;
  freshView = view;
  freshNow = new Set();
  return true;
}
/** Claves que deben llevar el sello «Nuevo» en la vista actual. */
export const freshKeys = () => new Set([...freshNow, ...unseenKeys()]);
/** Marca como vistas las novedades de un tipo (y actualiza los avisos). Devuelve 1 si había algo nuevo. */
export function markSeen(type) {
  const keys = unseenKeys().filter((k) => k.startsWith(`${type}:`));
  if (!keys.length) return 0;
  const seen = (store.customSeen ||= {});
  for (const k of keys) {
    seen[k] = 1;
    freshNow.add(k);
  }
  persist();
  paintAchBadge();
  return 1;
}

/** Actualiza las insignias numéricas de Personalizar y Lore en la pantalla principal. */
export function paintAchBadge() {
  const keys = unseenKeys();
  const lorePending = keys.filter((k) => k.startsWith('lore:')).length;
  const customPending = keys.length - lorePending;
  const badge = $('homeAchBadge');
  if (badge) {
    badge.hidden = customPending === 0;
    badge.textContent = customPending > 99 ? '99+' : String(customPending);
  }
  $('tabAch')?.classList.toggle('has-news', customPending > 0);
  const loreBadge = $('homeLoreBadge');
  if (loreBadge) {
    loreBadge.hidden = lorePending === 0;
    loreBadge.textContent = lorePending > 99 ? '99+' : String(lorePending);
  }
  $('tabLore')?.classList.toggle('has-news', lorePending > 0);
}

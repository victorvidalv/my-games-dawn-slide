/**
 * Personalizar → Lore: qué entradas del lore de Thyes están desbloqueadas. Todo sale de estadísticas que el juego ya guarda
 * (se calcula en vivo, no hay nada que reclamar): un jugador veterano entra y ya encuentra sus entradas abiertas.
 * Los textos están en src/data/lore-book.js. Lógica pura (sin DOM).
 */
import { STATS, unlockText } from './achievements.js';
import { BOOKS, CHARACTERS, PEOPLES_LORE, PLACES } from '../data/lore-book.js';

/** Avance de una entrada: cada condición [estadística, meta] con su texto; `done` cuando se cumplen todas. */
export function loreProgress(req, store = {}) {
  const reqs = req.map(([stat, goal]) => {
    const value = Math.min(goal, Number(STATS[stat]?.(store)) || 0);
    return { stat, goal, value, text: unlockText(stat, goal), done: value >= goal };
  });
  const done = reqs.every((r) => r.done);
  const pct = reqs.length ? (reqs.reduce((sum, r) => sum + r.value / r.goal, 0) / reqs.length) * 100 : 100;
  return { reqs, done, pct };
}
export const loreOpen = (req, store) => loreProgress(req, store).done;

/** Todas las entradas con su clave estable (`lore:<tipo>:…`), que es la que usa «Nuevo» (store.customSeen). */
export function loreItems() {
  const items = [];
  for (const c of CHARACTERS) for (const e of c.entries) items.push({ key: `lore:char:${c.id}:${e.id}`, req: e.req });
  for (const p of PLACES) {
    items.push({ key: `lore:place:${p.id}:main`, req: p.main.req });
    items.push({ key: `lore:place:${p.id}:secret`, req: p.secret.req });
  }
  for (const p of PEOPLES_LORE) items.push({ key: `lore:people:${p.id}`, req: p.req });
  for (const b of BOOKS) items.push({ key: `lore:book:${b.id}`, req: b.req });
  return items;
}
/** Claves de las entradas ya abiertas. */
export const loreUnlockedKeys = (store) =>
  loreItems()
    .filter((i) => loreOpen(i.req, store))
    .map((i) => i.key);
export const loreTotal = () => loreItems().length;

/** Cuántas líneas de La Frase de los Sellos están reveladas: cada ciudad alcanzada (su entrada principal) aporta las suyas. */
export function sealLinesRevealed(store) {
  return PLACES.reduce((n, p) => n + (loreOpen(p.main.req, store) ? p.lines : 0), 0);
}

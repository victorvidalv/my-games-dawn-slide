/**
 * Análisis de los desbloqueos de Personalizar: para cada objeto calcula en qué día lo conseguiría un jugador casual,
 * regular y dedicado (modelo de scripts/lib/unlock-model.mjs) y comprueba que cada rareza cae en su ventana.
 *
 *   node scripts/analyze-unlocks.mjs            → resumen por categoría y rareza (+ avisos)
 *   node scripts/analyze-unlocks.mjs --items    → además, cada objeto con su día y sus condiciones
 */
import { OUTFITS, REWARDS, UNLOCKS } from '../src/game/achievements.js';
import { dayToReach, modeOf, PERSONAS, scaleDays } from './lib/unlock-model.mjs';

const BAND = { common: [1, 5.5], rare: [5.5, 24], epic: [26, 75], legendary: [70, 230] }; // ventana esperada (jugador regular)
const ITEMS = process.argv.includes('--items');
const NAMES = {
  board: 'Borde',
  pieces: 'Fichas',
  key: 'Llave',
  card: 'Cartas',
  music: 'Música',
  cover: 'Héroes',
  bg: 'Fondo',
  trail: 'Estelas',
  fx: 'Celebración',
  aura: 'Clima',
  ui: 'Tema',
};
const RARITY = ['common', 'rare', 'epic', 'legendary'];
const label = { common: 'común', rare: 'rara', epic: 'épica', legendary: 'legendaria' };

const rows = []; // { cat, id, name, rarity, reqs, day }
for (const [type, list] of Object.entries(REWARDS)) {
  if (!NAMES[type]) continue;
  for (const it of list.slice(1)) {
    const u = UNLOCKS[`${type}:${it.id}`];
    if (u) rows.push({ cat: NAMES[type], id: it.id, name: it.name, rarity: it.rarity, reqs: u.reqs });
  }
}
for (const [hero, list] of Object.entries(OUTFITS))
  for (const it of list.slice(1)) {
    const u = UNLOCKS[`outfit:${hero}:${it.id}`];
    if (u) rows.push({ cat: `Atuendos ${hero}`, id: it.id, name: it.name, rarity: it.rarity, reqs: u.reqs });
  }
for (const r of rows) r.day = Math.max(...r.reqs.map((q) => dayToReach(q.stat, q.goal)));

const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const fmt = (d) => (!Number.isFinite(d) ? '∞' : d < 10 ? d.toFixed(1) : String(Math.round(d)));
const warnings = [];

console.log('Días hasta desbloquear (mediana · mín–máx), por rareza y perfil de jugador\n');
for (const p of Object.values(PERSONAS)) {
  console.log(`▸ ${p.label}`);
  const line = ['  categoría'.padEnd(18), ...RARITY.map((r) => label[r].padEnd(22))].join('');
  console.log(line);
  const cats = [...new Set(rows.map((r) => r.cat.replace(/ (lia|jean|van)$/, '')))];
  for (const cat of cats) {
    const cells = RARITY.map((rar) => {
      const ds = rows.filter((r) => r.cat.startsWith(cat) && r.rarity === rar).map((r) => scaleDays(r.day, p.k));
      return (
        ds.length ? `${fmt(median(ds))} · ${fmt(Math.min(...ds))}–${fmt(Math.max(...ds))} (${ds.length})` : '—'
      ).padEnd(22);
    });
    console.log(`  ${cat.padEnd(16)}${cells.join('')}`);
  }
  console.log();
}

// Ítems visibles curados a mano (VISIBLE_REWARDS / VISIBLE_OUTFITS en src/ui/achievements.js):
// objetivos directos y alcanzables (1 condición) a propósito, así que no cuentan como avisos.
const CURATED = new Set([
  'Fichas:silk',
  'Fichas:lava',
  'Llave:neon',
  'Llave:galaxy',
  'Estelas:starlight',
  'Estelas:comet',
  'Atuendos lia:ingeniera',
  'Atuendos lia:brasas',
  'Atuendos jean:oni',
  'Atuendos jean:sakura',
  'Atuendos van:carmesi',
  'Atuendos van:cuervos',
]);
const isCurated = (r) => CURATED.has(`${r.cat}:${r.id}`);

// Comprobaciones
for (const r of rows) {
  if (isCurated(r)) continue;
  const [lo, hi] = BAND[r.rarity];
  if (r.day < lo * 0.7 || r.day > hi * 1.3)
    warnings.push(`${r.cat}:${r.id} (${label[r.rarity]}) llega el día ${fmt(r.day)} (ventana ${lo}–${hi})`);
  const want = { common: 1, rare: 1, epic: 2, legendary: 3 }[r.rarity];
  if (r.reqs.length !== want)
    warnings.push(`${r.cat}:${r.id} (${label[r.rarity]}) pide ${r.reqs.length} condiciones (esperadas ${want})`);
  if (r.rarity === 'legendary' && new Set(r.reqs.map((q) => modeOf(q.stat))).size < 3)
    warnings.push(`${r.cat}:${r.id} legendaria sin los tres modos`);
}
for (const cat of new Set(rows.map((r) => r.cat))) {
  const list = rows.filter((r) => r.cat === cat && !isCurated(r));
  for (let i = 1; i < list.length; i++) {
    if (RARITY.indexOf(list[i].rarity) > RARITY.indexOf(list[i - 1].rarity) && list[i].day < list[i - 1].day * 0.8)
      warnings.push(
        `${cat}: ${list[i].id} (${label[list[i].rarity]}) llega antes que ${list[i - 1].id} (${label[list[i - 1].rarity]})`,
      );
  }
}
const modes = {};
for (const r of rows) for (const q of r.reqs) modes[modeOf(q.stat)] = (modes[modeOf(q.stat)] || 0) + 1;
console.log('Condiciones por modo de juego:', modes);
console.log(`${rows.length} objetos analizados · ${warnings.length} avisos`);
for (const w of warnings) console.log('  ⚠', w);

if (ITEMS) {
  console.log();
  for (const r of rows.sort((a, b) => a.cat.localeCompare(b.cat) || a.day - b.day))
    console.log(
      `${r.cat.padEnd(14)} ${label[r.rarity].padEnd(10)} día ${fmt(r.day).padStart(5)}  ${r.id.padEnd(16)} ${r.reqs.map((q) => q.text).join('  +  ')}`,
    );
}

/**
 * CALIBRADOR de DAWNSLIDE: programa aparte del juego (Node + SQLite, sin dependencias) para decidir, nivel a nivel,
 *   · qué mecánicas aparecen (y dónde hay tutorial aparte), el maleficio (giro) y los sellos con su tipo,
 *   · los turnos mínimos de cada camino (Normal · Difícil · Experto) y cómo quedan límite y puntos.
 * Guarda todo en tools/calibrator/calibration.db y, tras cada cambio, en calibration.json (ese JSON es el que se versiona y el que
 * se lee para adaptar el código del juego).      npm run calibrator      → http://localhost:5199
 */
import { DatabaseSync } from 'node:sqlite';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..', '..');
const DB_PATH = join(HERE, 'calibration.db');
const JSON_PATH = join(HERE, 'calibration.json');
const PORT = Number(process.env.PORT || 5199);

export const MECH_COLS = ['wall', 'heavy', 'gate', 'ice', 'door', 'curse', 'seal1', 'seal2', 'seal3'];
const FIELDS = [...MECH_COLS, 'min_normal', 'min_hard', 'min_expert', 'note'];

const db = new DatabaseSync(DB_PATH);
db.exec(`CREATE TABLE IF NOT EXISTS level_cfg (
  level INTEGER PRIMARY KEY,
  wall INTEGER NOT NULL DEFAULT 0, heavy INTEGER NOT NULL DEFAULT 0, gate INTEGER NOT NULL DEFAULT 0, ice INTEGER NOT NULL DEFAULT 0,
  door INTEGER NOT NULL DEFAULT 0, curse INTEGER NOT NULL DEFAULT 0, seal1 INTEGER NOT NULL DEFAULT 0, seal2 INTEGER NOT NULL DEFAULT 0, seal3 INTEGER NOT NULL DEFAULT 0,
  min_normal INTEGER NOT NULL, min_hard INTEGER NOT NULL, min_expert INTEGER NOT NULL, note TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, saved_at TEXT NOT NULL, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);

/** Calendario actual del juego (0 = no, 1 = aparece, 2 = aparece con tutorial aparte) como punto de partida. */
async function gameDefaults() {
  const src = (p) => import(new URL(`../../src/${p}`, import.meta.url));
  const { levelPlan, TUTORIALS } = await src('game/mechanics.js');
  const { rotatedLevels } = await src('game/orientation.js');
  const { SEAL_LEVELS, requestedSealTier } = await src('game/seals.js');
  const { rateAt, targetFor } = await src('engine/difficulty.js');
  const { bossRating } = await src('game/bosses.js');
  const curse = rotatedLevels(7);
  const rows = [];
  for (let level = 1; level <= 100; level++) {
    const p = levelPlan(level);
    const r = { level, note: '' };
    for (const id of MECH_COLS) {
      const seal = id.startsWith('seal') ? +id.slice(4) : 0;
      const present = seal ? SEAL_LEVELS.includes(level) && requestedSealTier(level, 7) === seal : id === 'curse' ? curse.has(level) : p.mechanics.includes(id);
      const tutorial = seal ? present && level === SEAL_LEVELS[0] : TUTORIALS[id]?.level === level;
      r[id] = tutorial ? 2 : present ? 1 : 0;
    }
    [r.min_normal, r.min_hard, r.min_expert] = [1, 50, 75].map((s) => targetFor(bossRating(level, rateAt(s, level))));
    rows.push(r);
  }
  return rows;
}

const upsert = db.prepare(`INSERT OR REPLACE INTO level_cfg (level, ${FIELDS.join(',')}) VALUES (?, ${FIELDS.map(() => '?').join(',')})`);
async function seed(force = false) {
  const n = db.prepare('SELECT COUNT(*) AS n FROM level_cfg').get().n;
  if (n && !force) return;
  db.exec('BEGIN');
  for (const r of await gameDefaults()) upsert.run(r.level, ...FIELDS.map((f) => r[f]));
  db.exec('COMMIT');
  db.prepare("INSERT OR REPLACE INTO meta VALUES ('seeded_at', ?)").run(new Date().toISOString());
}

const allRows = () => db.prepare('SELECT * FROM level_cfg ORDER BY level').all();
async function exportJson() {
  const rows = allRows();
  const out = {
    saved_at: new Date().toISOString(),
    note: 'Salida del calibrador. 0 = no, 1 = aparece, 2 = aparece y con tutorial aparte. Los mínimos son turnos mínimos objetivo por camino.',
    levels: Object.fromEntries(rows.map((r) => [r.level, {
      mechanics: Object.fromEntries(['wall', 'heavy', 'gate', 'ice'].map((k) => [k, r[k]])),
      curse: r.curse,
      seal: r.seal3 ? { tier: 3, tutorial: r.seal3 === 2 } : r.seal2 ? { tier: 2, tutorial: r.seal2 === 2 } : r.seal1 ? { tier: 1, tutorial: r.seal1 === 2 } : null,
      min: { normal: r.min_normal, hard: r.min_hard, expert: r.min_expert },
      note: r.note,
    }])),
  };
  await writeFile(JSON_PATH, JSON.stringify(out, null, 1) + '\n');
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css' };
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
const readBody = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => ok(b ? JSON.parse(b) : {})); });

await seed();
await exportJson();

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/levels' && req.method === 'GET') return send(res, 200, allRows());
    if (url.pathname === '/api/level' && req.method === 'POST') {
      const { level, field, value } = await readBody(req);
      if (!FIELDS.includes(field) || !(level >= 1 && level <= 100)) return send(res, 400, { error: 'campo o nivel no válido' });
      const v = field === 'note' ? String(value).slice(0, 300) : Math.max(0, Math.min(field.startsWith('min_') ? 99 : 2, Math.round(Number(value))));
      db.prepare(`UPDATE level_cfg SET ${field} = ? WHERE level = ?`).run(v, level);
      await exportJson();
      return send(res, 200, { ok: true, value: v });
    }
    if (url.pathname === '/api/result' && req.method === 'GET') {   // el calendario REAL del juego (src/data/calibration.json) tras `npm run calibrate`
      const file = join(ROOT, 'src', 'data', 'calibration.json');
      return send(res, 200, existsSync(file) ? await readFile(file) : { error: 'todavía no hay resultado: ejecuta npm run calibrate' });
    }
    if (url.pathname === '/api/clear' && req.method === 'POST') {   // limpia marcas de mecánicas y notas; los turnos mínimos se conservan
      db.exec(`UPDATE level_cfg SET ${MECH_COLS.map((c) => `${c} = 0`).join(', ')}, note = ''`);
      await exportJson();
      return send(res, 200, { ok: true });
    }
    if (url.pathname === '/api/save' && req.method === 'POST') {    // guarda una versión con fecha (además del guardado automático)
      await exportJson();
      const at = new Date().toISOString();
      db.prepare('INSERT INTO snapshots (saved_at, json) VALUES (?, ?)').run(at, JSON.stringify(allRows()));
      return send(res, 200, { ok: true, saved_at: at, versions: db.prepare('SELECT COUNT(*) AS n FROM snapshots').get().n });
    }
    if (url.pathname === '/api/reset' && req.method === 'POST') { await seed(true); await exportJson(); return send(res, 200, { ok: true }); }
    // el navegador importa los mismos módulos del juego (curvas, puntos…): así las cuentas de la pantalla son las del juego
    let file = url.pathname === '/' ? join(HERE, 'index.html') : url.pathname.startsWith('/src/') ? join(ROOT, normalize(url.pathname)) : null;
    if (file && file.startsWith(ROOT) && existsSync(file)) return send(res, 200, await readFile(file), MIME[extname(file)] || 'application/octet-stream');
    send(res, 404, { error: 'no encontrado' });
  } catch (e) { send(res, 500, { error: String(e) }); }
}).listen(PORT, () => console.log(`Calibrador: http://localhost:${PORT}   (datos: ${DB_PATH})`));

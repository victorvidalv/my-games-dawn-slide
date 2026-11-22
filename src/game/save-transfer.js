import { MAX_LEVEL } from '../engine/difficulty.js';
import { QR_MAX_BYTES } from '../qr.js';
import {
  ACHIEVEMENTS as ALL_ACHIEVEMENTS,
  COUNTERS as ALL_COUNTERS,
  LEGACY_REWARDS,
  lookOf,
  rewardKey,
} from './achievements.js';
import { dayNumber, emptyDaily } from './daily.js';
import { relicFor } from './relics.js';
import { MAX_REVIVES } from './shop.js';
import { FATE_CARDS, FATE_PICKS } from './fate.js';
import {
  CHALLENGE_RELICS,
  CHALLENGE_ROUTES,
  RESET_BONUS_TURNS,
  routeById,
  survivalBestFor,
  survivalProgress,
  survivalWonFor,
} from './survival.js';

const BASE_VERSION = 1;
const RELIC_VERSION = 2;
const V3_VERSION = 3;
/** v4 = v3 sin jefes ni camino heroico, con las cartas del destino de la partida en curso. */
const V4_VERSION = 4;
/** v5 = v4 con las listas vigentes de logros, contadores y Canjear (las de v3/v4 quedan fijas más abajo). */
const V5_VERSION = 5;
/* Lo que guardaban v1-v3 de los jefes y del camino heroico (ya no existen): se lee para validar y se descarta. */
const LEGACY_BOSS_RETRIES = 2;
const LEGACY_HEROIC_HINTS = 1;
const legacyBossLevel = (level) => level >= 10 && level % 10 === 0;
const FATE_IDS = FATE_CARDS.map((c) => c.id);
const BASE_URL = 'https://dawnslide.com/';
const PREFIX = '#s=';
const MAX_TOKEN_LENGTH = QR_MAX_BYTES - BASE_URL.length - PREFIX.length - 1;
const UINT32 = 0xffffffff;
const UINT16 = 0xffff;

// Orden fijo de los formatos v1/v2 (solo lectura para compatibilidad con QR antiguos).
const PATHS = [1, 50, 75];
const HEROES = ['lia', 'jean', 'van'];
const RELICS = ['sun', 'purse', 'lantern'];
const MINI_GAMES = ['catch', 'whack', 'stack', 'clock', 'rhythm', 'order', 'pairs', 'simon', 'shell'];
// El quinto hueco era el reto Maestro (retirado): ahora guarda las Rocas, así los códigos antiguos siguen leyéndose.
const CHALLENGES = ['classic', 'frost', 'gears', 'all', 'rocks'];
const LEGACY_COUNTERS = ['completed', 'perfects', 'mini5', 'iceRock', 'locks', 'bosses', 'cleanCity'];
// 'tut_door' ya no existe (se quitó el portón), pero se conserva su bit para que los enlaces antiguos sigan leyéndose igual.
const LESSONS = ['tut_wall', 'tut_heavy', 'tut_gate', 'tut_ice', 'tut_curse', 'tut_door'];
const LEGACY_ACHIEVEMENTS = [
  'city1',
  'lv25',
  'lv50',
  'lv75',
  'lv100',
  'done',
  'heroes',
  'hard50',
  'expert',
  'paths3',
  'perf10',
  'perf25',
  'perf50',
  'perf100',
  'icerock',
  'locks',
  'bosses',
  'clean',
  'mini1',
  'mini5',
  'mini9',
  'day1',
  'day7',
  'day100',
  'kinds',
  'streak3',
  'streak7',
  'streak30',
  'gold10',
  'master',
];
const LEGACY_LOOKS = {
  music: ['menu', 'z0', 'z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7', 'z8', 'z9', 'boss'],
  key: ['red', 'amber', 'gold', 'crystal', 'star', 'obsidian', 'iron', 'emerald'],
  pieces: ['paint', 'stone', 'glass', 'night', 'runic', 'oldgold'],
  fx: ['none', 'embers', 'sparks', 'petals', 'stars', 'aurora', 'ink', 'fireworks'],
};

// Tablas fijas del formato v3 (100 logros, tienda Canjear completa y Modo Desafío).
// Logros y contadores tal como estaban en v3 (los enlaces antiguos se leen con estas tablas fijas; v4 usa las actuales).
// prettier-ignore
const V3_ACH_IDS = ['firstWin','lv5','city1','lv20','heroes2','lv25','lv35','lv50','lv65','lv75','lv90','heroes','hard25','hard50','expert25','lv100','done','hard100','expert','paths3','perf1','perf5','fate1','icerock5','locks5','perf10','perf25','perf50','icerock','locks','heavy10','heavy25','fate9','fate27','clean','perf100','perf200','icerock75','fate81','clean5','chBoard1','chBoard3','chRelicUse','chLvl5','chRoutes2','chBoard10','chBoard20','chBoard30','chBoard50','chRelicUse10','chRelics3','chRoutes3','chLvl8','chLvl10','chLvl14','chBoard100','ch150','ch200','ch250','chAll','day1','day3','gold1','streak2','kinds2','day7','day15','day30','kinds','streak3','streak7','streak14','gold5','gold10','master','day100','streak30','gold25','day50','master5','boards10','power1','shop1','score1k','cosmetic1','mini1','mini3','mini5','boards50','boards100','power5','power25','shop5','score5k','cosmetic5','mini9','boards250','score25k','cosmetic15','cosmetic30'];
// v4 se escribía con las listas de entonces: 100 logros y 17 contadores (los nuevos van siempre al final).
const V4_ACH_IDS = ALL_ACHIEVEMENTS.slice(0, 100).map((a) => a.id);
const V5_ACH_IDS = ALL_ACHIEVEMENTS.map((a) => a.id);
/**
 * Orden histórico de los objetos en el código QR (v3-v5): cada objeto viaja por su POSICIÓN en estas listas, así que no se
 * pueden reordenar ni quitar. Personalizar ordena los objetos por rareza, pero eso no afecta a este formato.
 * Los objetos añadidos después (fichas 13-30, llaves 14-30, tableros 14-30…) no viajan: se vuelven a desbloquear jugando.
 * En `cover` la primera posición es la portada de serie (la de cada momento).
 */
const QR_LISTS = LEGACY_REWARDS;
/** Cuántos objetos de cada lista había en v3/v4. */
const V4_REWARD_COUNTS = { board: 10, pieces: 9, key: 10, fx: 10, music: 13, cover: 6 };
/** Y en v5 (la lista completa de QR_LISTS). */
const V5_REWARD_COUNTS = Object.fromEntries(Object.entries(QR_LISTS).map(([type, ids]) => [type, ids.length]));
/** Claves canjeadas que viajan en el QR: todos los de la lista menos el primero (el de serie). */
const shopKeys = (counts) =>
  Object.entries(QR_LISTS).flatMap(([type, ids]) => ids.slice(1, counts[type]).map((id) => rewardKey(type, id)));
const V3_SHOP_KEYS = shopKeys(V4_REWARD_COUNTS);
const V5_SHOP_KEYS = shopKeys(V5_REWARD_COUNTS);
// prettier-ignore
const V3_COUNTERS = ['completed','perfects','mini5','iceRock','locks','fateCards','cleanCity','boardsSolved','heavyBoards','shopBuys','powersUsed','challengeBoards','challengeRelicsUsed'];
const V4_COUNTERS = ALL_COUNTERS.slice(0, 17);
const V5_COUNTERS = ALL_COUNTERS;
const V3_CHALLENGE_ROUTES = CHALLENGE_ROUTES.map((r) => r.id);
const V3_CHALLENGE_RELICS = CHALLENGE_RELICS.map((r) => r.id);
const V3_LOOKS = QR_LISTS;

// 'brave' y 'routeChosen' eran del camino heroico: se conservan sus bits para leer los enlaces v1-v3.
const RUN_FLAGS = [
  'brave',
  'lifeUsed',
  'paidRevive',
  'pendingClear',
  'routeChosen',
  'sealClaimed',
  'bonus',
  'recBroken',
];

const bounded = (value, max) => (Number.isSafeInteger(value) ? Math.max(0, Math.min(value, max)) : 0);
const indexOf = (items, value) => Math.max(0, items.indexOf(value));
const maskOf = (items, selected) => items.reduce((m, item, i) => (selected(item) ? m | (1 << i) : m), 0);
const checksum = (bytes) => bytes.reduce((hash, byte) => Math.imul(hash ^ byte, 16777619) >>> 0, 2166136261);

function invalid() {
  throw new Error('Invalid save transfer');
}
function toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function writeVarint(bytes, value, max = UINT32) {
  let n = bounded(value, max);
  while (n >= 0x80) {
    bytes.push((n & 0x7f) | 0x80);
    n = Math.floor(n / 128);
  }
  bytes.push(n);
}

function writeBitset(bytes, items, selected) {
  for (let i = 0; i < items.length; i += 8) {
    let b = 0;
    for (let k = 0; k < 8 && i + k < items.length; k++) {
      if (selected(items[i + k])) b |= 1 << k;
    }
    bytes.push(b);
  }
}

/** Codifica estados ternarios (0 = pendiente, 1 = cumplido sin reclamar, 2 = reclamado): 5 logros por byte (3^5 = 243). */
function writeTrits(bytes, items, stateOf) {
  for (let i = 0; i < items.length; i += 5) {
    let val = 0;
    let mul = 1;
    for (let k = 0; k < 5 && i + k < items.length; k++) {
      val += stateOf(items[i + k]) * mul;
      mul *= 3;
    }
    bytes.push(val);
  }
}

export function exportSaveLink(store = {}) {
  const bytes = [];
  const write = (value, width = 1) => {
    const n = bounded(value, 2 ** (8 * width) - 1);
    for (let i = 0; i < width; i++) bytes.push((n >>> (8 * i)) & 255);
  };
  const writeV = (value, max = UINT32) => writeVarint(bytes, value, max);

  write(V5_VERSION);

  // 1. Caminos de Aventura (solo los que tienen avance)
  const pathRecords = PATHS.map((path) => store.paths?.['c' + path] || null);
  let pathMask = 0;
  pathRecords.forEach((rec, i) => {
    if (rec && (rec.score || rec.level || rec.runs)) {
      pathMask |= 1 << i;
      if (rec.recordAt) pathMask |= 1 << (i + 3);
    }
  });
  write(pathMask);
  pathRecords.forEach((rec, i) => {
    if ((pathMask & (1 << i)) === 0) return;
    writeV(rec.score, UINT32);
    write(bounded(rec.level, MAX_LEVEL));
    if (pathMask & (1 << (i + 3))) write(Math.floor(rec.recordAt / 1000), 4);
    writeV(rec.runs, UINT16);
  });

  // 2. Los logros (estado ternario: 0 = no, 1 = ganado, 2 = reclamado), 5 por byte
  writeTrits(bytes, V5_ACH_IDS, (id) => (store.achClaimed?.[id] ? 2 : store.ach?.[id] ? 1 : 0));

  // 3. Elementos canjeados en la Tienda (bitset) -> 7 bytes
  writeBitset(bytes, V5_SHOP_KEYS, (key) => Boolean(store.shopOwned?.[key]));

  // 4. Estadísticas: contadores (varint) + 5 colecciones (21 bits en 3 bytes)
  for (const stat of V5_COUNTERS) writeV(store.stats?.[stat], UINT32);
  const colBits =
    maskOf(HEROES, (id) => store.stats?.heroes?.includes(id)) |
    (maskOf(PATHS, (id) => store.stats?.paths?.includes(id)) << 3) |
    (maskOf(MINI_GAMES, (id) => store.stats?.mini5Kinds?.includes(id)) << 6) |
    (maskOf(V3_CHALLENGE_RELICS, (id) => store.stats?.challengeRelics?.includes(id)) << 15) |
    (maskOf(V3_CHALLENGE_ROUTES, (id) => store.stats?.challengeRoutesPlayed?.includes(id)) << 18);
  write(colBits, 3);

  // 5. Retos diarios (varints)
  const daily = store.daily || emptyDaily();
  writeV(daily.last + 1, UINT16);
  for (const stat of ['streak', 'best', 'solved', 'gold']) writeV(daily[stat], UINT16);
  for (const id of CHALLENGES) writeV(daily.by?.[id], UINT16);

  // 6. Aspecto equipado (board+pieces 1B, key+fx 1B, music+cover 1B) + lecciones (1B)
  const look = lookOf(store);
  write(indexOf(V3_LOOKS.board, look.board) | (indexOf(V3_LOOKS.pieces, look.pieces) << 4));
  write(indexOf(V3_LOOKS.key, look.key) | (indexOf(V3_LOOKS.fx, look.fx) << 4));
  write(indexOf(V3_LOOKS.music, look.music) | (indexOf(V3_LOOKS.cover, look.cover) << 4));
  write(maskOf(LESSONS, (id) => Boolean(store.tips?.[id])));

  // 7. Modo Desafío: récords por ruta, rutas completadas y partida activa opcional
  const activeSurv = survivalProgress(store);
  const hasSurvRun = activeSurv?.status === 'active';
  const survWonMask = maskOf(V3_CHALLENGE_ROUTES, (id) => survivalWonFor(store, id)) | (hasSurvRun ? 1 << 3 : 0);
  write(survWonMask);
  for (const route of CHALLENGE_ROUTES) write(bounded(survivalBestFor(store, route.id), route.levels));
  if (hasSurvRun) {
    const meta =
      indexOf(V3_CHALLENGE_ROUTES, activeSurv.route) |
      (indexOf(V3_CHALLENGE_RELICS, activeSurv.relic) << 2) |
      (activeSurv.resetUsed ? 1 << 4 : 0) |
      (activeSurv.undoUsedBoard || activeSurv.undoCount > 0 ? 1 << 5 : 0) |
      (activeSurv.hintUsedTurn ? 1 << 6 : 0);
    write(meta);
    const route = routeById(activeSurv.route);
    write(bounded(activeSurv.cleared, route.levels));
    writeV(activeSurv.boardStartRemaining ?? activeSurv.remaining, route.turns + RESET_BONUS_TURNS);
  }

  // 8. Partida de Aventura activa (opcional)
  const run = store.run;
  const level = !run?.daily && !run?.survival && run?.mode !== 'p' ? bounded(run?.level, MAX_LEVEL) : 0;
  write(level);
  if (level) {
    const relic = relicFor(run);
    const pending = run.pendingClear?.level === level;
    const flags = {
      lifeUsed: run.lifeUsed,
      paidRevive: run.revivesBought > 0,
      pendingClear: pending,
      sealClaimed: Object.hasOwn(run.sealClaims || {}, level),
      bonus: run.bonus,
      recBroken: run.recBroken,
    };
    const meta =
      indexOf(HEROES, run.hero) |
      (indexOf(PATHS, run.start) << 2) |
      (relic ? (1 << 4) | (indexOf(RELICS, relic.id) << 5) : 0);
    write(meta);
    write(maskOf(RUN_FLAGS, (flag) => flags[flag]));
    writeV(run.score, UINT32);
    writeV(bounded(run.seed, 0x7fffffff), 0x7fffffff);
    writeV(run.hints, UINT16);
    write(bounded((run.adj || 0) + 2, 4));
    write(bounded(run.firstLevel || level, level));
    write(bounded(run.helpAt, level));
    write(bounded(run.streak, MAX_LEVEL));
    write(bounded(run.fatePicked, FATE_PICKS));
    write(bounded(run.fateCityPaid, FATE_PICKS));
    write(run.revive);
    write(bounded(run.revivesBought, 2));
    const fate = (run.fate || []).filter((id) => FATE_IDS.includes(id)).slice(0, FATE_PICKS);
    write(fate.length);
    fate.forEach((id) => write(FATE_IDS.indexOf(id)));
  }

  write(checksum(bytes), 4);
  const token = toBase64(bytes);
  if (token.length > MAX_TOKEN_LENGTH) invalid();
  return BASE_URL + PREFIX + token;
}

export function readSaveLink(input, now = new Date()) {
  const text = input.trim();
  if (text.length >= QR_MAX_BYTES || !text.startsWith(BASE_URL + PREFIX)) invalid();
  return readSaveHash(text.slice(BASE_URL.length), now);
}

export function readSaveHash(hash, now = new Date()) {
  const token = hash.slice(PREFIX.length);
  if (!hash.startsWith(PREFIX) || token.length > MAX_TOKEN_LENGTH || !/^[A-Za-z0-9_-]+$/.test(token)) invalid();
  const bytes = Uint8Array.from(atob(token.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0));
  if (bytes.length < 5 || toBase64(bytes) !== token) invalid();
  const data = new DataView(bytes.buffer);
  const end = bytes.length - 4;
  if (data.getUint32(end, true) !== checksum(bytes.subarray(0, end))) invalid();
  let offset = 0;
  const read = (width = 1, max = UINT32, min = 0) => {
    if (offset + width > end) invalid();
    let value = 0;
    for (let i = 0; i < width; i++) value += bytes[offset++] * 256 ** i;
    if (value < min || value > max) invalid();
    return value;
  };
  const readV = (max = UINT32, min = 0) => {
    let value = 0;
    let mul = 1;
    for (let i = 0; i < 6; i++) {
      if (offset >= end) invalid();
      const b = bytes[offset++];
      value += (b & 0x7f) * mul;
      if ((b & 0x80) === 0) {
        if (value < min || value > max) invalid();
        return value;
      }
      mul *= 128;
    }
    invalid();
  };
  const selected = (items, width = 1) => {
    const bits = read(width, 2 ** items.length - 1);
    return items.filter((_, i) => (bits & (1 << i)) !== 0);
  };

  const version = read();
  if (version === V3_VERSION || version === V4_VERSION || version === V5_VERSION)
    return readV3(read, readV, () => offset === end, now, version);
  if (version !== BASE_VERSION && version !== RELIC_VERSION) invalid();

  // Decodificador heredado v1 / v2
  const paths = {};
  for (const path of PATHS) {
    const score = read(4),
      level = read(1, MAX_LEVEL);
    const recordAt = read(4, Math.floor(now.getTime() / 1000) + 86400) * 1000;
    const runs = read(2);
    if (score || level || runs) paths['c' + path] = { score, level, runs, ...(recordAt ? { recordAt } : {}) };
  }
  const ach = Object.fromEntries(selected(LEGACY_ACHIEVEMENTS, 4).map((id) => [id, now.getTime()]));
  const stats = Object.fromEntries(LEGACY_COUNTERS.map((stat) => [stat, read(4)]));
  stats.heroes = selected(HEROES);
  stats.paths = selected(PATHS);
  stats.mini5Kinds = selected(MINI_GAMES, 2);

  const daily = emptyDaily();
  daily.last = read(2, dayNumber(now) + 2) - 1;
  daily.streak = read(2);
  daily.best = read(2, UINT16, daily.streak);
  daily.solved = read(2);
  daily.gold = read(2, daily.solved);
  for (const id of CHALLENGES) {
    const count = read(2, daily.solved);
    if (count) daily.by[id] = count;
  }
  if ((daily.last === -1 && daily.streak) || daily.streak > daily.last + 1) invalid();

  const look = {
    board: 'wood',
    cover: 'classic',
    ...Object.fromEntries(
      Object.entries(LEGACY_LOOKS).map(([type, items]) => [type, items[read(1, items.length - 1)]]),
    ),
  };
  const tips = Object.fromEntries(selected(LESSONS).map((id) => [id, true]));
  const level = read(1, MAX_LEVEL);
  let run = null;
  if (level) {
    const hero = HEROES[read(1, HEROES.length - 1)],
      start = PATHS[read(1, PATHS.length - 1)];
    const flags = new Set(selected(RUN_FLAGS));
    const score = read(4),
      seed = read(4, 0x7fffffff),
      hints = read(2),
      adj = read(1, 4) - 2;
    const firstLevel = read(1, level, 1),
      helpAt = read(1, level),
      streak = read(1, MAX_LEVEL);
    read(1, legacyBossLevel(level) ? LEGACY_BOSS_RETRIES : 0);
    read(1, LEGACY_HEROIC_HINTS);
    const revive = read();
    if (flags.has('routeChosen') && (!flags.has('pendingClear') || !legacyBossLevel(level) || level === MAX_LEVEL))
      invalid();
    run = buildRun({
      hero,
      start,
      level,
      score,
      seed,
      hints,
      adj,
      firstLevel,
      helpAt,
      streak,
      revive,
      flags,
      relic: version === RELIC_VERSION ? RELICS[read(1, RELICS.length - 1)] : undefined,
    });
  } else if (version === RELIC_VERSION) invalid();
  if (offset !== end) invalid();
  return { paths, ach, stats, daily, look, tips, run };
}

function readV3(read, readV, atEnd, now, version = V3_VERSION) {
  const v4 = version >= V4_VERSION,
    v5 = version >= V5_VERSION;
  const achIds = v5 ? V5_ACH_IDS : v4 ? V4_ACH_IDS : V3_ACH_IDS,
    counters = v5 ? V5_COUNTERS : v4 ? V4_COUNTERS : V3_COUNTERS,
    shop = v5 ? V5_SHOP_KEYS : V3_SHOP_KEYS;
  const ts = now.getTime();
  const maxSec = Math.floor(ts / 1000) + 86400;

  // 1. Caminos
  const paths = {};
  const pathMask = read(1, 0x3f);
  PATHS.forEach((path, i) => {
    if ((pathMask & (1 << i)) === 0) return;
    const score = readV(UINT32);
    const level = read(1, MAX_LEVEL);
    const recordAt = pathMask & (1 << (i + 3)) ? read(4, maxSec) * 1000 : 0;
    const runs = readV(UINT16);
    paths['c' + path] = { score, level, runs, ...(recordAt ? { recordAt } : {}) };
  });

  // 2. Los logros (ternarios)
  const ach = {};
  const achClaimed = {};
  for (let i = 0; i < achIds.length; i += 5) {
    let val = read(1, 242);
    for (let k = 0; k < 5 && i + k < achIds.length; k++) {
      const state = val % 3;
      val = Math.floor(val / 3);
      const id = achIds[i + k];
      if (state >= 1) ach[id] = ts;
      if (state === 2) achClaimed[id] = ts;
    }
  }

  // 3. Tienda Canjear (objetos propios)
  const shopOwned = {};
  for (let i = 0; i < shop.length; i += 8) {
    const b = read(1, 255);
    for (let k = 0; k < 8 && i + k < shop.length; k++) {
      if ((b & (1 << k)) !== 0) shopOwned[shop[i + k]] = ts;
    }
  }

  // 4. Estadísticas
  const stats = Object.fromEntries(counters.map((stat) => [stat, readV(UINT32)]));
  const colBits = read(3, (1 << 21) - 1);
  stats.heroes = HEROES.filter((_, i) => (colBits & (1 << i)) !== 0);
  stats.paths = PATHS.filter((_, i) => (colBits & (1 << (i + 3))) !== 0);
  stats.mini5Kinds = MINI_GAMES.filter((_, i) => (colBits & (1 << (i + 6))) !== 0);
  stats.challengeRelics = V3_CHALLENGE_RELICS.filter((_, i) => (colBits & (1 << (i + 15))) !== 0);
  stats.challengeRoutesPlayed = V3_CHALLENGE_ROUTES.filter((_, i) => (colBits & (1 << (i + 18))) !== 0);

  // 5. Retos diarios
  const daily = emptyDaily();
  daily.last = readV(dayNumber(now) + 2) - 1;
  daily.streak = readV(UINT16);
  daily.best = readV(UINT16, daily.streak);
  daily.solved = readV(UINT16);
  daily.gold = readV(daily.solved);
  for (const id of CHALLENGES) {
    const count = readV(daily.solved);
    if (count) daily.by[id] = count;
  }
  if ((daily.last === -1 && daily.streak) || daily.streak > daily.last + 1) invalid();

  // 6. Aspecto y lecciones
  const bp = read();
  const kf = read();
  const mc = read();
  const boardIdx = bp & 0x0f;
  const piecesIdx = bp >> 4;
  const keyIdx = kf & 0x0f;
  const fxIdx = kf >> 4;
  const musicIdx = mc & 0x0f;
  const coverIdx = mc >> 4;
  if (
    boardIdx >= V3_LOOKS.board.length ||
    piecesIdx >= V3_LOOKS.pieces.length ||
    keyIdx >= V3_LOOKS.key.length ||
    fxIdx >= V3_LOOKS.fx.length ||
    musicIdx >= V3_LOOKS.music.length ||
    coverIdx >= V3_LOOKS.cover.length
  )
    invalid();
  const look = {
    board: V3_LOOKS.board[boardIdx],
    pieces: V3_LOOKS.pieces[piecesIdx],
    key: V3_LOOKS.key[keyIdx],
    fx: V3_LOOKS.fx[fxIdx],
    music: V3_LOOKS.music[musicIdx],
    cover: V3_LOOKS.cover[coverIdx],
  };
  if (Object.entries(lookOf({ look, shopOwned })).some(([type, id]) => type in V5_REWARD_COUNTS && id !== look[type]))
    invalid();
  const lessonBits = read(1, (1 << LESSONS.length) - 1);
  const tips = Object.fromEntries(LESSONS.filter((_, i) => (lessonBits & (1 << i)) !== 0).map((id) => [id, true]));

  // 7. Modo Desafío
  const survMask = read(1, 0x0f);
  const survivalWon = {};
  const survivalBests = {};
  CHALLENGE_ROUTES.forEach((route, i) => {
    if ((survMask & (1 << i)) !== 0) survivalWon[route.id] = true;
    const best = read(1, route.levels);
    if (best) survivalBests[route.id] = best;
  });
  let survival = null;
  if ((survMask & (1 << 3)) !== 0) {
    const meta = read(1, 0x7f);
    const routeIdx = meta & 0x03;
    const relicIdx = (meta >> 2) & 0x03;
    if (routeIdx >= V3_CHALLENGE_ROUTES.length || relicIdx >= V3_CHALLENGE_RELICS.length) invalid();
    const route = routeById(V3_CHALLENGE_ROUTES[routeIdx]);
    const cleared = read(1, route.levels - 1);
    const remaining = readV(route.turns + RESET_BONUS_TURNS, 1);
    survival = {
      routeVersion: 2,
      route: route.id,
      relic: V3_CHALLENGE_RELICS[relicIdx],
      cleared,
      remaining,
      boardStartRemaining: remaining,
      pos: null,
      lastPos: null,
      hintUsedTurn: (meta & (1 << 6)) !== 0,
      resetUsed: (meta & (1 << 4)) !== 0,
      undoUsedBoard: false,
      undoCount: (meta & (1 << 5)) !== 0 ? 1 : 0, // el código solo guarda si se usó: se cuenta como un uso
      undoStack: [],
      status: 'active',
      updatedAt: ts,
    };
  }
  const survivalBest = Math.max(0, ...Object.values(survivalBests));

  // 8. Partida de Aventura activa
  const level = read(1, MAX_LEVEL);
  let run = null;
  if (level) {
    const meta = read(1, 0x7f);
    const heroIdx = meta & 0x03;
    const startIdx = (meta >> 2) & 0x03;
    const hasRelic = (meta & (1 << 4)) !== 0;
    const relicIdx = (meta >> 5) & 0x03;
    if (heroIdx >= HEROES.length || startIdx >= PATHS.length || (hasRelic && relicIdx >= RELICS.length)) invalid();
    const flagBits = read(1, (1 << RUN_FLAGS.length) - 1);
    const flags = new Set(RUN_FLAGS.filter((_, i) => (flagBits & (1 << i)) !== 0));
    const score = readV(UINT32);
    const seed = readV(0x7fffffff);
    const hints = readV(UINT16);
    const adj = read(1, 4) - 2;
    const firstLevel = read(1, level, 1);
    const helpAt = read(1, level);
    const streak = read(1, MAX_LEVEL);
    let fatePicked, fateCityPaid, revivesBought, fate;
    if (v4) {
      fatePicked = read(1, FATE_PICKS);
      fateCityPaid = read(1, FATE_PICKS);
    } else {
      read(1, legacyBossLevel(level) ? LEGACY_BOSS_RETRIES : 0);
      read(1, LEGACY_HEROIC_HINTS);
    }
    const revive = read();
    if (v4) {
      revivesBought = read(1, 2);
      fate = Array.from({ length: read(1, FATE_PICKS) }, () => FATE_IDS[read(1, FATE_IDS.length - 1)]);
      if (new Set(fate).size !== fate.length || fate.length > fatePicked) invalid();
    } else if (
      flags.has('routeChosen') &&
      (!flags.has('pendingClear') || !legacyBossLevel(level) || level === MAX_LEVEL)
    )
      invalid();
    run = buildRun({
      hero: HEROES[heroIdx],
      start: PATHS[startIdx],
      level,
      score,
      seed,
      hints,
      adj,
      firstLevel,
      helpAt,
      streak,
      revive,
      flags,
      relic: hasRelic ? RELICS[relicIdx] : undefined,
      fate: v4 ? { fate, fatePicked, fateCityPaid, revivesBought } : null,
    });
  }
  if (!atEnd()) invalid();
  return {
    paths,
    ach,
    achClaimed,
    shopOwned,
    stats,
    daily,
    look,
    tips,
    ...(survival ? { survival } : {}),
    ...(Object.keys(survivalBests).length ? { survivalBests } : {}),
    ...(Object.keys(survivalWon).length ? { survivalWon } : {}),
    ...(survivalBest ? { survivalBest } : {}),
    run,
  };
}

function buildRun({
  hero,
  start,
  level,
  score,
  seed,
  hints,
  adj,
  firstLevel,
  helpAt,
  streak,
  revive,
  flags,
  relic,
  fate = null,
}) {
  const run = {
    mode: 'c',
    hero,
    start,
    level,
    score,
    seed,
    hints,
    adj,
    firstLevel,
    helpAt,
    streak,
    revive,
    lifeUsed: flags.has('lifeUsed'),
    revivesBought: flags.has('paidRevive') ? MAX_REVIVES : 0,
    recBroken: flags.has('recBroken'),
  };
  if (relic) run.relic = relic;
  if (flags.has('pendingClear')) run.pendingClear = { level };
  if (flags.has('bonus')) run.bonus = 1;
  if (flags.has('sealClaimed')) run.sealClaims = { [level]: 0 };
  if (fate) {
    Object.assign(run, { fate: fate.fate, fatePicked: fate.fatePicked, fateCityPaid: fate.fateCityPaid });
    if (fate.revivesBought) run.revivesBought = fate.revivesBought;
  } else {
    // Antes de las cartas: si ya se eligió la ruta de esta ciudad, su carta se da por elegida.
    const before = (level - 1) / 10;
    run.fate = [];
    run.fatePicked = Math.min(FATE_PICKS, Math.floor(flags.has('routeChosen') ? level / 10 : before));
  }
  return run;
}

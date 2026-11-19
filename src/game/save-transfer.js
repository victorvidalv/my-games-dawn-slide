import { zoneIdx } from '../data/zones.js';
import { MAX_LEVEL } from '../engine/difficulty.js';
import { QR_MAX_BYTES } from '../qr.js';
import { lookOf } from './achievements.js';
import { dayNumber, emptyDaily } from './daily.js';
import { isBossLevel } from './mechanics.js';
import { HEROIC_BENEFITS } from './routes.js';
import { BOSS_FREE_RETRIES, MAX_REVIVES } from './shop.js';

const VERSION = 1;
const BASE_URL = 'https://dawnslide.com/';
const PREFIX = '#s=';
const MAX_TOKEN_LENGTH = QR_MAX_BYTES - BASE_URL.length - PREFIX.length - 1;
const UINT32 = 0xffffffff;
const UINT16 = 0xffff;

// Orden fijo del formato v1. Los cambios en las tablas del juego no deben cambiar estas posiciones.
const PATHS = [1, 50, 75];
const HEROES = ['lia', 'jean', 'van'];
const MINI_GAMES = ['catch', 'whack', 'stack', 'clock', 'rhythm', 'order', 'pairs', 'simon', 'shell'];
const CHALLENGES = ['classic', 'frost', 'gears', 'all', 'master'];
const COUNTERS = ['completed', 'perfects', 'mini5', 'iceRock', 'locks', 'bosses', 'cleanCity'];
const LESSONS = ['tut_wall', 'tut_heavy', 'tut_gate', 'tut_ice', 'tut_curse', 'tut_door'];
const ACHIEVEMENTS = [
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
const LOOKS = {
  music: ['menu', 'z0', 'z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7', 'z8', 'z9', 'boss'],
  key: ['red', 'amber', 'gold', 'crystal', 'star', 'obsidian', 'iron', 'emerald'],
  pieces: ['paint', 'stone', 'glass', 'night', 'runic', 'oldgold'],
  fx: ['none', 'embers', 'sparks', 'petals', 'stars', 'aurora', 'ink', 'fireworks'],
};
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

export function exportSaveLink(store) {
  const bytes = [];
  const write = (value, width = 1) => {
    const n = bounded(value, 2 ** (8 * width) - 1);
    for (let i = 0; i < width; i++) bytes.push((n >>> (8 * i)) & 255);
  };
  write(VERSION);
  for (const path of PATHS) {
    const record = store.paths?.['c' + path];
    write(record?.score, 4);
    write(bounded(record?.level, MAX_LEVEL));
    write(Math.floor((record?.recordAt || 0) / 1000), 4);
    write(record?.runs, 2);
  }
  write(
    maskOf(ACHIEVEMENTS, (id) => Boolean(store.ach?.[id])),
    4,
  );
  for (const stat of COUNTERS) write(store.stats?.[stat], 4);
  write(maskOf(HEROES, (id) => store.stats?.heroes?.includes(id)));
  write(maskOf(PATHS, (id) => store.stats?.paths?.includes(id)));
  write(
    maskOf(MINI_GAMES, (id) => store.stats?.mini5Kinds?.includes(id)),
    2,
  );

  const daily = store.daily || emptyDaily();
  write(daily.last + 1, 2);
  for (const stat of ['streak', 'best', 'solved', 'gold']) write(daily[stat], 2);
  for (const id of CHALLENGES) write(daily.by?.[id], 2);
  const look = lookOf(store);
  for (const [type, items] of Object.entries(LOOKS)) write(indexOf(items, look[type]));
  write(maskOf(LESSONS, (id) => Boolean(store.tips?.[id])));

  const run = store.run;
  const level = !run?.daily && run?.mode !== 'p' ? bounded(run?.level, MAX_LEVEL) : 0;
  write(level);
  if (level) {
    const pending = run.pendingClear?.level === level;
    const flags = {
      brave: run.route === 'brave',
      lifeUsed: run.lifeUsed,
      paidRevive: run.revivesBought > 0,
      pendingClear: pending,
      routeChosen: pending && level % 10 === 0 && level < MAX_LEVEL && run.pendingClear.routeChosen,
      sealClaimed: Object.hasOwn(run.sealClaims || {}, level),
      bonus: run.bonus,
      recBroken: run.recBroken,
    };
    write(indexOf(HEROES, run.hero));
    write(indexOf(PATHS, run.start));
    write(maskOf(RUN_FLAGS, (flag) => flags[flag]));
    write(run.score, 4);
    write(bounded(run.seed, 0x7fffffff), 4);
    write(run.hints, 2);
    write(bounded((run.adj || 0) + 2, 4));
    write(bounded(run.firstLevel || level, level));
    write(bounded(run.helpAt, level));
    write(bounded(run.streak, MAX_LEVEL));
    write(isBossLevel(level) && run.bossRetry?.level === level ? bounded(run.bossRetry.used, BOSS_FREE_RETRIES) : 0);
    write(run.heroicHintLevel === level ? bounded(run.heroicHintCount, HEROIC_BENEFITS.liaHints) : 0);
    write(run.revive);
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
  const selected = (items, width = 1) => {
    const bits = read(width, 2 ** items.length - 1);
    return items.filter((_, i) => (bits & (1 << i)) !== 0);
  };

  if (read() !== VERSION) invalid();
  const paths = {};
  for (const path of PATHS) {
    const score = read(4),
      level = read(1, MAX_LEVEL);
    const recordAt = read(4, Math.floor(now.getTime() / 1000) + 86400) * 1000;
    const runs = read(2);
    if (score || level || runs) paths['c' + path] = { score, level, runs, ...(recordAt ? { recordAt } : {}) };
  }
  const ach = Object.fromEntries(selected(ACHIEVEMENTS, 4).map((id) => [id, now.getTime()]));
  const stats = Object.fromEntries(COUNTERS.map((stat) => [stat, read(4)]));
  stats.heroes = selected(HEROES);
  stats.paths = selected(PATHS);
  stats.mini5Kinds = selected(MINI_GAMES, 2);

  const daily = emptyDaily();
  daily.last = read(2, dayNumber(now) + 2) - 1; // tolera el día siguiente en otro huso horario
  daily.streak = read(2);
  daily.best = read(2, UINT16, daily.streak);
  daily.solved = read(2);
  daily.gold = read(2, daily.solved);
  for (const id of CHALLENGES) {
    const count = read(2, daily.solved);
    if (count) daily.by[id] = count;
  }
  if ((daily.last === -1 && daily.streak) || daily.streak > daily.last + 1) invalid();

  const look = Object.fromEntries(
    Object.entries(LOOKS).map(([type, items]) => [type, items[read(1, items.length - 1)]]),
  );
  if (Object.entries(lookOf({ look, ach })).some(([type, id]) => id !== look[type])) invalid();
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
    const bossRetries = read(1, isBossLevel(level) ? BOSS_FREE_RETRIES : 0);
    const heroicHints = read(1, HEROIC_BENEFITS.liaHints),
      revive = read();
    if (flags.has('routeChosen') && (!flags.has('pendingClear') || !isBossLevel(level) || level === MAX_LEVEL))
      invalid();
    run = {
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
      route: level > 10 ? (flags.has('brave') ? 'brave' : 'normal') : 'normal',
      routeZone: zoneIdx(level),
      lifeUsed: flags.has('lifeUsed'),
      revivesBought: flags.has('paidRevive') ? MAX_REVIVES : 0,
      recBroken: flags.has('recBroken'),
    };
    if (flags.has('pendingClear')) run.pendingClear = { level, routeChosen: flags.has('routeChosen') };
    if (flags.has('bonus')) run.bonus = 1;
    if (flags.has('sealClaimed')) run.sealClaims = { [level]: 0 };
    if (bossRetries) run.bossRetry = { level, used: bossRetries };
    if (heroicHints) Object.assign(run, { heroicHintLevel: level, heroicHintCount: heroicHints });
    if (level === 10 && flags.has('routeChosen') && flags.has('brave')) run.route = 'brave';
  }
  if (offset !== end) invalid();
  return { paths, ach, stats, daily, look, tips, run };
}

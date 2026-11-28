/* ============================ Flujo de la partida ============================
 * Orquesta la aventura y el reto diario: une el estado compartido (`S`, `store`), las reglas puras
 * (`run-logic.js`) y la vista (`ui/session-view.js` y el resto de pantallas). Las decisiones viven en run-logic.
 */
import { Music, setTensionFx } from '../audio/music.js';
import { sfx, tone } from '../audio/sound.js';
import { zoneIdx } from '../data/zones.js';
import { calcGain } from '../engine/scoring.js';
import { startHintsFor } from '../engine/difficulty.js';
import { buildLevelAsync } from './level-builder.js';
import {
  DAILY_CHALLENGE,
  DAILY_HINT_MILESTONES,
  DAILY_TURN_BUDGET,
  challengeById,
  challengeTargets,
  dailyProgress,
  dayNumber,
  emptyDaily,
  recordDaily,
  streakHintBonus,
  writeDailyProgress,
} from './daily.js';
import { adventureStartStats, boardStats, boardWinStats, flagStat } from './achievements.js';
import { boardPure } from './run-points.js';
import { canPaidRevive, payRevive } from './shop.js';
import {
  advanceRun,
  applyAdventureWin,
  applyDailyWin,
  canSaveBoard,
  clearKind,
  dailyAttempt,
  dailyEntry,
  newAdventureRun,
  newDailyRun,
  redoDailyBoard,
  resetBoardForRevive,
  resolveFail,
  restoreDailyAttempt,
  storeBoard,
  updateBest,
} from './run-logic.js';
import { S, closeRun, gainNow, haltBoard, heroOf, persist, rkey, setBoard, setBusy, setRun, store } from '../state.js';
import { playReviveEffect } from '../ui/turns.js';
import { startCoach } from '../ui/coach.js';
import { showDailyResult } from '../ui/daily.js';
import { countStat, markStat, pauseAchievementToasts, raiseStat, updateStats } from '../ui/achievements.js';
import { buildPieces, fitBoard, layout, updateHud } from '../ui/board.js';
import {
  FATE_CARDS,
  FATE_EVERY,
  FATE_POINTS_RANGE,
  canRerollFate,
  fateById,
  fatePoints,
  fateCityRewards,
  fateOffer,
  needsFatePick,
  pickFate,
  rerollFate,
} from './fate.js';
import { baseScore } from '../engine/scoring.js';
import { showFateDialog, syncFateHud } from '../ui/fate.js';
import { endRun } from '../ui/finale.js';
import { showResult } from '../ui/result.js';
import { chooseHero, showRescue, showReviveOffer, syncHero } from '../ui/heroes.js';
import { applyZone } from '../ui/map.js';
import { openMenu } from '../ui/menu.js';
import {
  dimBoard,
  levelBannerText,
  lockBoard,
  playKeyExit,
  reducedMotion,
  renderLevelHud,
  setDailyMode,
  setMessage,
  revivedMessage,
  showRevivedHud,
  unlockBoard,
  winMessage,
} from '../ui/session-view.js';
import { boardSwapDone, boardSwapOut, levelBanner, playLevelScenery, wipeOut } from '../ui/transitions.js';
import { weatherForBoard } from '../ui/weather.js';

/* ---------- Guardado ---------- */
export function saveRun() {
  const run = S.run,
    G = S.G;
  if (run?.daily) {
    const d = run.daily;
    if (G && !G.done) {
      d.attempt = dailyAttempt(d, G);
      writeDailyProgress(store, d, {
        seed: d.seed,
        boards: d.boards,
        used: d.used,
        remaining: d.remaining,
        finished: false,
        attempt: d.attempt,
        redo: !!d.redo,
      });
      persist();
    }
    return;
  }
  if (canSaveBoard(run, G)) storeBoard(run, G);
  store.run = run && { ...run };
  persist();
}
export function recordBest(final) {
  if (!S.run || S.run.daily) return;
  updateBest(store.paths, rkey(), S.run, { final });
  persist();
}

/* ---------- Inicio de partida ---------- */
export async function startRun(start, mode, preset) {
  mode = 'c';
  const picked = preset || (await chooseHero(start, mode));
  if (!picked) {
    openMenu('adv');
    return;
  }
  if (S.run) recordBest(true); // si abandonas, lo logrado cuenta
  const hints = startHintsFor(start) + streakHintBonus(store.daily, dayNumber(), start);
  setBoard(null);
  setRun(
    newAdventureRun({
      seed: Math.floor(Math.random() * 2 ** 31),
      start,
      mode,
      hero: picked.hero,
      hints,
      relic: picked.relic,
    }),
  );
  markStat('heroes', picked.hero);
  updateStats((st) => adventureStartStats(st, S.run));
  syncHero();
  syncFateHud();
  applyZone(zoneIdx(1));
  saveRun();
  await resumeAdventure();
}
/** Entra directo al Desafío diario de hoy (15 tableros · 152 turnos), retomando si estaba en curso. */
export async function startDaily(opts = {}) {
  const restart = typeof opts === 'object' && opts !== null ? !!opts.restart : false;
  const c = challengeById(DAILY_CHALLENGE.id),
    day = dayNumber();
  const entry = dailyEntry(dailyProgress(store, c.id, day), challengeTargets(c), { restart });
  if (S.run && !S.run.daily && S.G && !S.G.done) saveRun();
  if (S.G) S.G.done = true;
  setBoard(null);
  setRun(newDailyRun({ challenge: c, day, ...entry }));
  syncHero();
  syncFateHud();
  applyZone(zoneIdx(1));
  await startLevel();
}
/** «Rehacer tablero» del Desafío: devuelve los turnos gastados (con tope), reinicia el tablero y gasta el único uso del intento. */
export function redoDaily() {
  const run = S.run,
    G = S.G;
  if (!run?.daily || !G || S.busy) return null;
  const out = redoDailyBoard(run.daily, G);
  if (!out) return null;
  saveRun();
  layout();
  updateHud();
  setMessage(
    out.charged
      ? `Tablero reiniciado. Turnos recuperados: ${out.refund}; perdidos: ${out.charged}.`
      : `Tablero reiniciado. Turnos recuperados: ${out.refund}.`,
  );
  return out;
}
/** Sale del reto diario sin tocar la partida guardada de la aventura. */
export function leaveDaily() {
  if (!S.run?.daily) return;
  saveRun();
  closeRun();
  setDailyMode(false);
  Music.stop(0.2);
  setTensionFx(0, false);
}

/** Termina el intento actual del Desafío diario por rendición, conservando el avance logrado hoy. */
export function surrenderDaily() {
  if (!S.run?.daily) return;
  const d = S.run.daily;
  const cleared = d.boards.filter(Boolean).length;
  const used = Math.min(DAILY_TURN_BUDGET, (d.used || 0) + (S.G?.moves || 0));
  d.used = used;
  d.remaining = Math.max(0, DAILY_TURN_BUDGET - used);
  const out = recordDaily((store.daily ||= emptyDaily()), d.id, d.day, {
    cleared,
    used,
    boards: d.boards.slice(),
  });
  writeDailyProgress(store, d, {
    seed: d.seed,
    boards: d.boards.slice(),
    used,
    remaining: d.remaining,
    finished: true,
    attempt: null,
  });
  persist();
  if (S.G) {
    S.G.done = true;
    lockBoard();
    dimBoard(S.G);
  }
  setTensionFx(0, false);
  Music.stop(0.25);
  showDailyResult(d, { ...out, surrendered: true });
}

/* ---------- Tablero ---------- */
async function startLevel() {
  setBusy(true);
  const run = S.run;
  const G = await buildLevelAsync(run);
  if (S.run !== run) return; // se salió mientras se preparaba
  restoreDailyAttempt(G, run.daily);
  setDailyMode(!!run.daily);
  // Entre tableros las piezas se disuelven en su sitio.
  await boardSwapOut();
  if (S.run !== run) {
    wipeOut();
    boardSwapDone();
    return;
  }
  setBoard(G);
  G.colors ||= [0, 1, 2, 3, 4, 5, 6, 7].sort(() => Math.random() - 0.5);
  renderLevelHud(run, G, heroOf().id);
  applyZone(zoneIdx(G.n));
  syncFateHud();
  buildPieces();
  boardSwapDone();
  updateHud();
  setBusy(true);
  fitBoard();
  Music.setLevel(G.n, run.hero);
  setTensionFx(0, false);
  Music.duck(1);
  Music.muffle(false);
  Music.start();
  if (run.rescue) {
    wipeOut();
    showRescue();
    return;
  }
  if (run.pendingRevive && canPaidRevive(run, run.mode)) {
    wipeOut();
    offerPaidRevive(run.pendingRevive);
    return;
  }
  delete run.pendingRevive;
  wipeOut();
  sfx.levelIn();
  if (!G.moves) levelBanner(...levelBannerText(run, G));
  weatherForBoard(); // cada tablero trae su clima (lluvia, nieve, luciérnagas…)
  playLevelScenery();
  setBusy(false);
  unlockBoard();
  updateHud();
  saveRun();
  startCoach(); // avisos y guía de los primeros niveles / mecánicas nuevas
}

/* ---------- Avance entre niveles ---------- */
/**
 * Cierre de ciudad: primero pagan las cartas que ya tienes (Brújula, Cosecha) y después se elige 1 carta del destino (entre 2 o 3, según el héroe).
 * Las dos cosas se guardan al instante, así recargar a mitad de la elección no repite ni pierde nada.
 */
function fateDialog() {
  const session = S.run,
    done = session.pendingClear,
    city = done.level / FATE_EVERY;
  if (!needsFatePick(session, done.level)) return Promise.resolve();
  const rewards = fateCityRewards(session, city, done.opt);
  if (rewards) saveRun();
  return showFateDialog({
    run: session,
    hero: heroOf(),
    city,
    cards: fateOffer(session, city),
    canReroll: canRerollFate(session, city),
    rewards,
    isActive: () => S.run === session,
    onReroll: () => {
      const next = rerollFate(session, city);
      if (next) saveRun();
      return next;
    },
    onChoose: (id) => {
      const out = pickFate(session, id, city, baseScore(done.opt));
      if (out) {
        countStat('fateCards', ...(fateById(id)?.kind === 'pact' ? ['pacts'] : []));
        updateStats((st) =>
          flagStat(
            st,
            'fateSeen',
            FATE_CARDS.findIndex((c) => c.id === id),
          ),
        );
      }
      saveRun();
      syncFateHud();
      return out;
    },
  });
}
let advancingClear = false;
export async function resumeAdventure() {
  if (!S.run) return;
  setBusy(true);
  if (S.run.pendingClear) {
    await advanceClear();
    return;
  }
  await startLevel();
}
async function advanceClear() {
  if (advancingClear || !S.run?.pendingClear) return;
  advancingClear = true;
  setBusy(true);
  const done = S.run.pendingClear,
    n = done.level,
    kind = clearKind(n),
    crossing = kind === 'crossing';
  if (crossing) pauseAchievementToasts(true);
  try {
    if (kind === 'final') {
      fateCityRewards(S.run, n / FATE_EVERY, done.opt);
      saveRun();
      endRun(true);
      setBusy(false);
      return;
    }
    if (crossing) await fateDialog();
    advanceRun(S.run, n);
    saveRun();
    await resumeAdventure();
  } finally {
    if (crossing) pauseAchievementToasts(false);
    advancingClear = false;
  }
}

/* ---------- Victoria ---------- */
export function win() {
  // la voz del héroe NO se corta al ganar: termina su frase aunque el nivel sea rápido
  if (S.G.done) return;
  haltBoard();
  lockBoard();
  if (S.run.daily) return winDaily();
  const run = S.run,
    G = S.G;
  if (clearKind(G.n) === 'crossing') pauseAchievementToasts(true);
  countStat(...boardStats(G, run)); // logros: perfectos, mecánicas, ciudad sin ayuda
  const gain = gainNow(),
    previous = run.score;
  applyAdventureWin(run, G, gain);
  raiseStat('bestRunStreak', run.streak);
  const capped = fatePoints(run, { ...G, pure: boardPure(run, G, G.moves) }) >= FATE_POINTS_RANGE[1];
  updateStats((st) => boardWinStats(st, { ember: gain.ember, capped, hero: run.hero }));
  recordBest();
  saveRun();
  setTensionFx(0, false);
  Music.duck(0.55);
  if (G.moves > G.opt) sfx.success(); // si es perfecto suena la fanfarria especial al mostrar el resultado
  playKeyExit(G);
  setMessage(winMessage(G, gain, heroOf().id));
  setTimeout(
    async () => {
      // la llave sale → puntaje rápido → siguiente nivel
      try {
        await showResult({
          level: G.n,
          gain,
          moves: G.moves,
          opt: G.opt,
          previous,
          total: run.score,
          streakMult: gain.mult,
        });
      } catch (err) {
        console.error(err);
      } // si la animación falla, el juego sigue igual
      advanceClear();
    },
    reducedMotion() ? 100 : 450,
  );
}
function winDaily() {
  const run = S.run,
    G = S.G,
    d = run.daily;
  const gain = calcGain(G.moves, G.opt, 0);
  const { next, finished, cleared, used, remaining } = applyDailyWin(d, G, gain.total);
  const out =
    finished || cleared >= DAILY_HINT_MILESTONES[0].board
      ? recordDaily((store.daily ||= emptyDaily()), d.id, d.day, { cleared, used, boards: d.boards.slice() })
      : null;
  writeDailyProgress(store, d, {
    seed: d.seed,
    boards: d.boards.slice(),
    used,
    remaining,
    finished,
    attempt: null,
    redo: !!d.redo,
  });
  countStat('challengeBoards');
  if (finished) raiseStat('challengePure', 1);
  if (out && finished) raiseStat('dailyBestDay', 1);
  persist();
  setTensionFx(0, false);
  Music.duck(0.55);
  sfx.success();
  playKeyExit(G);
  setTimeout(
    async () => {
      if (S.run !== run) return;
      await showResult({ gain, moves: G.moves, opt: G.opt });
      if (S.run !== run) return;
      if (finished) {
        showDailyResult(d, out);
        return;
      }
      d.index = next;
      await startLevel();
    },
    reducedMotion() ? 100 : 450,
  );
}

/* ---------- Derrota ---------- */
export function fail(why) {
  if (S.G.done) return;
  switch (resolveFail(S.run, S.G, why)) {
    case 'daily_end': {
      const d = S.run.daily;
      const cleared = d.boards.filter(Boolean).length;
      const out = recordDaily((store.daily ||= emptyDaily()), d.id, d.day, {
        cleared,
        used: DAILY_TURN_BUDGET,
        boards: d.boards.slice(),
      });
      writeDailyProgress(store, d, {
        seed: d.seed,
        boards: d.boards.slice(),
        used: DAILY_TURN_BUDGET,
        remaining: 0,
        finished: true,
        attempt: null,
      });
      persist();
      S.G.done = true;
      lockBoard();
      dimBoard(S.G);
      setTensionFx(0, false);
      Music.stop(0.25);
      showDailyResult(d, out);
      return;
    }
    case 'retry':
      saveRun();
      showRescue();
      return;
    case 'revive':
      saveRun();
      showRescue('revive');
      return;
    case 'offer':
      saveRun();
      offerPaidRevive(why);
      return;
    default:
      triggerGameOver(why);
  }
}
/** Retirarse de la aventura: termina la partida y muestra el resultado con su rango (como al morir). */
export function retireRun() {
  if (!S.run || S.run.daily || !S.G) return;
  haltBoard();
  lockBoard();
  Music.stop(0.25);
  setTensionFx(0, false);
  S.G.done = true;
  endRun(false, 'retire');
  setBusy(false);
}
function triggerGameOver(why) {
  haltBoard();
  lockBoard();
  Music.stop(0.25);
  setTensionFx(0, false);
  tone(220, 0.25, 'sine', 0.045);
  dimBoard(S.G);
  setTimeout(() => {
    endRun(false, why);
    setBusy(false);
  }, 400);
}
async function offerPaidRevive(why) {
  const accepted = await showReviveOffer();
  if (!S.run || !S.G) return;
  delete S.run.pendingRevive;
  if (accepted) {
    const r = payRevive(S.run);
    if (r.ok) {
      resetBoardForRevive(S.G);
      showRevivedHud(S.run, S.G);
      saveRun();
      unlockBoard();
      setBusy(false);
      layout();
      updateHud();
      Music.duck(1);
      playReviveEffect('¡RENACER!', false);
      setMessage(revivedMessage(r.cost));
      return;
    }
  }
  triggerGameOver(why);
}

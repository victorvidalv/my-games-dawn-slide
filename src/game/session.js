/* ============================ Flujo de la partida ============================
 * Orquesta la aventura y el reto diario: une el estado compartido (`S`, `store`), las reglas puras
 * (`run-logic.js`) y la vista (`ui/session-view.js` y el resto de pantallas). Las decisiones viven en run-logic.
 */
import { Music, setTensionFx } from '../audio/music.js';
import { sfx, tone } from '../audio/sound.js';
import { zoneIdx } from '../data/zones.js';
import { calcGain } from '../engine/scoring.js';
import { canStartAt, startHintsAt } from './starts.js';
import { buildLevelAsync } from './level-builder.js';
import {
  DAILY_TARGETS,
  challengeById,
  currentStreak,
  dailyProgress,
  dayNumber,
  emptyDaily,
  recordDaily,
  streakHintBonus,
  writeDailyProgress,
} from './daily.js';
import { boardStats } from './achievements.js';
import { buildSurvival, newSurvival, spendSurvivalTurn, survivalProgress, writeSurvival } from './survival.js';
import { canPaidRevive, payRevive } from './shop.js';
import {
  advanceRun,
  applyAdventureWin,
  applyDailyWin,
  applySkip,
  canSaveBoard,
  chooseRoute,
  clearKind,
  dailyAttempt,
  dailyEntry,
  needsBossIntro,
  needsTravelChoice,
  newAdventureRun,
  newDailyRun,
  normalizeRoute,
  resetBoardForRevive,
  resolveFail,
  restoreDailyAttempt,
  storeBoard,
  updateBest,
} from './run-logic.js';
import { S, closeRun, gainNow, haltBoard, heroOf, persist, rkey, setBoard, setBusy, setRun, store } from '../state.js';
import { playReviveEffect, playSkipEffect } from '../ui/turns.js';
import { startCoach } from '../ui/coach.js';
import { showDailyResult } from '../ui/daily.js';
import { countStat, markStat, pauseAchievementToasts } from '../ui/achievements.js';
import { boardEl, buildPieces, fitBoard, layout, syncRouteStyle, updateHud } from '../ui/board.js';
import { isBonusLevel, showBonus } from '../ui/bonus.js';
import { showBossIntro } from '../ui/boss.js';
import { onBossTimeUp, preloadBossArt, syncBossPhase, syncBossTimer } from '../ui/boss-phase.js';
import { endRun } from '../ui/finale.js';
import { showResult } from '../ui/result.js';
import { chooseHero, showRescue, showReviveOffer, syncHero } from '../ui/heroes.js';
import { applyZone, renderStage, showMap } from '../ui/map.js';
import { openMenu } from '../ui/menu.js';
import { flashSurvivalTurns, setSurvivalMode, showSurvivalResult, updateSurvivalHud } from '../ui/survival.js';
import { $ } from '../dom.js';
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
  showTravelDialog,
  unlockBoard,
  winMessage,
} from '../ui/session-view.js';
import { boardSwapDone, boardSwapOut, levelBanner, playLevelScenery, wipeIn, wipeOut } from '../ui/transitions.js';

/* ---------- Guardado ---------- */
export function saveRun() {
  const run = S.run,
    G = S.G;
  if (run?.survival) return persist();
  if (run?.daily) {
    const d = run.daily;
    if (G && !G.done && d.day === dayNumber()) {
      d.attempt = dailyAttempt(d, G);
      writeDailyProgress(store, d, { boards: d.boards, attempt: d.attempt });
      persist();
    }
    return;
  }
  if (canSaveBoard(run, G)) storeBoard(run, G);
  store.run = run && { ...run };
  persist();
}
export function recordBest(final) {
  if (!S.run || S.run.daily || S.run.survival) return;
  updateBest(store.paths, rkey(), S.run, { final });
  persist();
}

/* ---------- Inicio de partida ---------- */
export async function startRun(start, mode) {
  mode = 'c';
  const picked = await chooseHero(start, mode);
  if (!picked) {
    openMenu('adv');
    return;
  }
  const from = canStartAt(store.paths['c' + start]?.level || 0, picked.from) ? picked.from : 1;
  if (S.run) recordBest(true); // si abandonas, lo logrado cuenta
  const hints = startHintsAt(start, from) + streakHintBonus(currentStreak(store.daily, dayNumber()));
  setBoard(null);
  setRun(
    newAdventureRun({
      seed: Math.floor(Math.random() * 2 ** 31),
      start,
      mode,
      hero: picked.hero,
      from,
      hints,
      relic: picked.relic,
    }),
  );
  markStat('heroes', picked.hero);
  syncHero();
  syncRouteStyle();
  applyZone(zoneIdx(from));
  saveRun();
  Object.assign(S.run, { route: 'normal', routeZone: zoneIdx(from), travelFrom: zoneIdx(from) });
  saveRun();
  await resumeAdventure();
}
/** Retoma el tablero en curso, o abre el tablero que se eligió para mejorar la marca. */
export async function startDaily(id, index) {
  const c = challengeById(id),
    day = dayNumber();
  const entry = dailyEntry(dailyProgress(store, c.id, day), DAILY_TARGETS, index);
  if (entry.index < 0) {
    showDailyResult({ id: c.id, day });
    return;
  }
  if (S.run && !S.run.daily && S.G && !S.G.done) saveRun();
  if (S.G) S.G.done = true;
  setBoard(null);
  setRun(newDailyRun({ challenge: c, day, ...entry }));
  syncHero();
  syncRouteStyle();
  applyZone(zoneIdx(c.level));
  await startLevel();
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

/* ---------- Supervivencia ---------- */
export function startSurvival({ restart = false } = {}) {
  if (S.run?.survival) return;
  if (S.run) saveRun();
  closeRun();
  const previous = survivalProgress(store);
  const progress =
    !restart && previous?.status === 'active'
      ? previous
      : writeSurvival(store, { ...newSurvival(), updatedAt: store.survival?.updatedAt });
  setRun({ survival: progress, level: progress.cleared + 1 });
  persist();
  setDailyMode(false);
  setSurvivalMode(true);
  setTensionFx(0, false);
  Music.survival();
  showSurvivalBoard();
}

export function leaveSurvival() {
  closeRun();
  setSurvivalMode(false);
  Music.stop(0.2);
}

function showSurvivalBoard() {
  const run = S.run;
  const G = buildSurvival(run.survival);
  G.colors = Array.from({ length: 8 }, (_, i) => (i + G.n - 1) % 8);
  run.level = G.n;
  setBoard(G);
  $('lvl').textContent = G.n;
  updateSurvivalHud(run.survival);
  applyZone(zoneIdx(G.n));
  syncBossPhase();
  buildPieces();
  setBusy(false);
  fitBoard();
}

export function playSurvivalTurn(won) {
  const { run, G } = S;
  run.survival = writeSurvival(store, spendSurvivalTurn(run.survival, G.pos, won));
  persist();
  updateSurvivalHud(run.survival);
  if (!won && run.survival.status === 'active') return;

  haltBoard();
  lockBoard();
  if (won) {
    sfx.success();
    playKeyExit(G, { party: false });
    boardEl.classList.add('survival-clear');
    if (run.survival.status === 'active') flashSurvivalTurns(run.survival.remaining);
  }
  const next = () => {
    boardEl.classList.remove('survival-clear');
    if (S.run !== run) return;
    if (run.survival.status === 'active') showSurvivalBoard();
    else {
      Music.stop(0.25);
      showSurvivalResult(run.survival);
      setBusy(false);
    }
  };
  if (won && !reducedMotion()) setTimeout(next, 220);
  else next();
}

/* ---------- Tablero ---------- */
async function startLevel() {
  setBusy(true);
  const run = S.run;
  const G = await buildLevelAsync(run, store.tips || {});
  if (S.run !== run) return; // se salió mientras se preparaba
  restoreDailyAttempt(G, run.daily);
  setSurvivalMode(false);
  setDailyMode(!!run.daily);
  // El telón dorado abre la presentación; entre tableros las piezas se disuelven en su sitio.
  if (needsBossIntro(run, G)) await wipeIn('gold');
  else await boardSwapOut();
  if (S.run !== run) {
    wipeOut();
    boardSwapDone();
    return;
  }
  setBoard(G);
  G.colors ||= [0, 1, 2, 3, 4, 5, 6, 7].sort(() => Math.random() - 0.5);
  renderLevelHud(run, G, heroOf().id);
  applyZone(zoneIdx(G.n));
  renderStage();
  syncBossPhase();
  if (G.n % 10 >= 7) preloadBossArt(Math.ceil(G.n / 10) * 10); // la ilustración del próximo jefe ya está lista cuando llegas
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
  if (needsBossIntro(run, G)) {
    run.bossSeen = G.n;
    saveRun();
    const intro = showBossIntro(G.n);
    wipeOut(); // la presentación aparece detrás del telón de alarma
    await intro;
    if (!S.run || S.G?.done) return;
  } else {
    wipeOut();
    sfx.levelIn();
    if (!G.moves) levelBanner(...levelBannerText(run, G), !!G.plan?.boss);
  }
  playLevelScenery();
  setBusy(false);
  unlockBoard();
  updateHud();
  saveRun();
  syncBossTimer();
  startCoach(); // avisos y guía de los primeros niveles / mecánicas nuevas
}

/* ---------- Avance entre niveles ---------- */
function travelDialog() {
  if (!needsTravelChoice(S.run)) return Promise.resolve();
  const session = S.run;
  return showTravelDialog({
    run: session,
    hero: heroOf(),
    isActive: () => S.run === session,
    onChoose: (choice, city) => {
      chooseRoute(session, choice, city);
      saveRun();
    },
  });
}
let advancingClear = false;
export async function resumeAdventure() {
  if (!S.run) return;
  setBusy(true);
  if (normalizeRoute(S.run)) saveRun();
  if (S.run.pendingClear) {
    await advanceClear();
    return;
  }
  if (S.run.bonus) {
    await showBonus();
    saveRun();
  }
  if (S.run.travelFrom !== undefined) {
    const from = S.run.travelFrom,
      to = zoneIdx(S.run.level);
    await showMap(from, to, { travel: from !== to });
    delete S.run.travelFrom;
    saveRun();
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
      endRun(true);
      setBusy(false);
      return;
    }
    if (crossing && !done.routeChosen) await travelDialog();
    advanceRun(S.run, n, { bonus: isBonusLevel(n) });
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
  if (S.G.tutorial) return winTutorial();
  if (S.run.daily) return winDaily();
  const run = S.run,
    G = S.G;
  if (clearKind(G.n) === 'crossing') pauseAchievementToasts(true);
  countStat(...boardStats(G, run)); // logros: perfectos, mecánicas, jefes, ciudad sin ayuda
  const gain = gainNow(),
    previous = run.score;
  applyAdventureWin(run, G, gain);
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
/** Nivel extra de tutorial: sin puntos ni avance; después empieza el nivel real. */
function winTutorial() {
  store.tips = store.tips || {};
  store.tips['tut_' + S.G.tutorial] = true;
  delete S.run.board;
  persist();
  setTensionFx(0, false);
  sfx.success();
  playKeyExit(S.G, { party: false });
  setMessage('¡Tutorial superado! Ahora, el nivel de verdad.');
  setTimeout(() => {
    setBusy(false);
    startLevel();
  }, 1400);
}
function winDaily() {
  const run = S.run,
    G = S.G,
    d = run.daily;
  const gain = calcGain(G.rate, G.moves, G.opt, 0);
  const { next, totals } = applyDailyWin(d, G, gain.total);
  const out =
    totals && recordDaily((store.daily ||= emptyDaily()), d.id, d.day, totals.moves, totals.opt, d.boards.slice());
  writeDailyProgress(store, d, { boards: d.boards.slice(), attempt: null });
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
      if (out) {
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
/** Los jefes comparten el flujo de derrota para tiempo y turnos. */
onBossTimeUp(() => fail('time'));
export function fail(why) {
  if (S.G.done) return;
  switch (resolveFail(S.run, S.G, why)) {
    case 'daily':
      writeDailyProgress(store, S.run.daily, { boards: S.run.daily.boards, attempt: S.run.daily.attempt });
      persist();
      showRescue('daily');
      return; // reto diario: se repite cuantas veces se quiera
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
/** Saltar nivel (tienda): sin puntos, sin racha; avanza como si se hubiera superado. */
export function skipLevel() {
  if (!S.G || S.G.done) return;
  haltBoard();
  lockBoard();
  applySkip(S.run, S.G);
  recordBest();
  saveRun();
  setTensionFx(0, false);
  setMessage('Nivel saltado. Sin puntos.');
  playSkipEffect().then(() => advanceClear());
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
      syncBossTimer();
      Music.duck(1);
      playReviveEffect('¡RENACER!', false);
      setMessage(revivedMessage(r.cost));
      return;
    }
  }
  triggerGameOver(why);
}

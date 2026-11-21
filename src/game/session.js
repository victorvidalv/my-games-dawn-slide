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
import { hintMove } from '../engine/solver.js';
import {
  buildSurvival,
  canUseChallengeRelic,
  newSurvival,
  routeById,
  spendSurvivalTurn,
  survivalProgress,
  useChallengeHint,
  useChallengeReset,
  useChallengeUndo,
  writeSurvival,
} from './survival.js';
import { canPaidRevive, payRevive } from './shop.js';
import {
  advanceRun,
  applyAdventureWin,
  applyDailyWin,
  applySkip,
  canSaveBoard,
  clearKind,
  dailyAttempt,
  dailyEntry,
  newAdventureRun,
  newDailyRun,
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
import { boardEl, buildPieces, fitBoard, layout, updateHud } from '../ui/board.js';
import { isBonusLevel, showBonus } from '../ui/bonus.js';
import { fateCityRewards, fateOffer, needsFatePick, pickFate } from './fate.js';
import { baseScore } from '../engine/scoring.js';
import { showFateDialog, syncFateHud } from '../ui/fate.js';
import { endRun } from '../ui/finale.js';
import { showResult } from '../ui/result.js';
import { chooseHero, showRescue, showReviveOffer, syncHero } from '../ui/heroes.js';
import { burst } from '../ui/fx.js';
import { applyChallengeScenery, applyZone, renderStage, showMap } from '../ui/map.js';
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
  unlockBoard,
  winMessage,
} from '../ui/session-view.js';
import { boardSwapDone, boardSwapOut, levelBanner, playLevelScenery, wipeOut } from '../ui/transitions.js';

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
  syncFateHud();
  applyZone(zoneIdx(from));
  S.run.travelFrom = zoneIdx(from);
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
  syncFateHud();
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

/* ---------- Desafío ---------- */
export function startSurvival({ restart = false, route, relic } = {}) {
  if (S.run?.survival) return;
  if (S.run) saveRun();
  closeRun();
  const previous = survivalProgress(store);
  const resume = !restart && !route && !relic && previous?.status === 'active';
  const progress = resume
    ? previous
    : writeSurvival(store, {
        ...newSurvival(route || previous?.route || '150', relic || previous?.relic || 'hint'),
        updatedAt: store.survival?.updatedAt,
      });
  setRun({ survival: progress, level: progress.cleared + 1 });
  markStat('challengeRoutesPlayed', progress.route);
  markStat('challengeRelics', progress.relic);
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
  const route = routeById(run.survival.route);
  G.colors = Array.from({ length: 8 }, (_, i) => (i + G.n - 1) % 8);
  run.level = G.n;
  setBoard(G);
  $('lvl').textContent = `${G.n}/${G.total}`;
  updateSurvivalHud(run.survival);
  applyChallengeScenery();
  syncFateHud();
  buildPieces();
  setMessage(
    G.n === 1
      ? `Desafío ${route.turns} turnos: saca la llave roja. Cada movimiento gasta 1 turno.`
      : `Tablero ${G.n} de ${G.total} · mínimo ${G.opt} movimientos.`,
  );
  setBusy(false);
  fitBoard();
}

export function activateChallengeRelic() {
  const { run, G } = S;
  if (!run?.survival || !G || G.done || S.busy) return;
  if (!canUseChallengeRelic(run.survival).ok) return;
  const kind = run.survival.relic;
  if (kind === 'hint') {
    const h = hintMove(G.pieces, G.pos, G.walls);
    if (!h) {
      setMessage('No encuentro pista desde aquí.');
      return;
    }
    run.survival = writeSurvival(store, useChallengeHint(run.survival));
    countStat('challengeRelicsUsed');
    persist();
    updateSurvivalHud(run.survival);
    const p = G.pieces[h.i];
    const n = Math.abs(h.to - h.from);
    const dir = p.o === 'h' ? (h.to > h.from ? 'derecha' : 'izquierda') : h.to > h.from ? 'abajo' : 'arriba';
    setMessage(`Mueve la pieza brillante ${n} casilla${n > 1 ? 's' : ''} hacia ${dir}. Quedan ${h.left} movimientos.`);
    const el = G.els[h.i];
    el.classList.remove('hint');
    void el.offsetWidth;
    el.classList.add('hint');
    sfx.hint();
    const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 14, ['#fff', '#ffcf6b'], 3);
    return;
  }
  if (kind === 'reset') {
    run.survival = writeSurvival(store, useChallengeReset(run.survival));
    countStat('challengeRelicsUsed');
    G.pos = G.start.slice();
    G.moves = 0;
    G.hist = [];
    persist();
    layout();
    updateSurvivalHud(run.survival);
    sfx.hint();
    boardEl.classList.remove('survival-clear');
    void boardEl.offsetWidth;
    boardEl.classList.add('survival-clear');
    setTimeout(() => boardEl.classList.remove('survival-clear'), 240);
    setMessage('Tablero reiniciado. Recuperaste los turnos de este tablero.');
    return;
  }
  if (kind === 'undo') {
    run.survival = writeSurvival(store, useChallengeUndo(run.survival));
    countStat('challengeRelicsUsed');
    G.pos = run.survival.pos.slice();
    G.moves = Math.max(0, G.moves - 1);
    G.hist.pop();
    persist();
    layout();
    updateSurvivalHud(run.survival);
    sfx.move();
    setMessage('Último movimiento deshecho (+1 turno).');
  }
}

export function playSurvivalTurn(won) {
  const { run, G } = S;
  const prevPos = G.hist.at(-1) || null;
  run.survival = writeSurvival(store, spendSurvivalTurn(run.survival, G.pos, won, prevPos));
  persist();
  updateSurvivalHud(run.survival);
  if (!won && run.survival.status === 'active') return;

  haltBoard();
  lockBoard();
  if (won) {
    countStat('challengeBoards');
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
  renderStage();
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
  playLevelScenery();
  setBusy(false);
  unlockBoard();
  updateHud();
  saveRun();
  startCoach(); // avisos y guía de los primeros niveles / mecánicas nuevas
}

/* ---------- Avance entre niveles ---------- */
/**
 * Cierre de ciudad: primero pagan las cartas que ya tienes (Brújula, Cosecha) y después se elige 1 de 3 cartas del destino.
 * Las dos cosas se guardan al instante, así recargar a mitad de la elección no repite ni pierde nada.
 */
function fateDialog() {
  const session = S.run,
    done = session.pendingClear,
    city = done.level / 10;
  if (!needsFatePick(session, done.level)) return Promise.resolve();
  const rewards = fateCityRewards(session, city, done.opt);
  if (rewards) saveRun();
  return showFateDialog({
    run: session,
    hero: heroOf(),
    city,
    cards: fateOffer(session, city),
    rewards,
    isActive: () => S.run === session,
    onChoose: (id) => {
      const out = pickFate(session, id, city, baseScore(done.opt));
      if (out) countStat('fateCards');
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
    if (crossing) await fateDialog();
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
  countStat(...boardStats(G, run)); // logros: perfectos, mecánicas, ciudad sin ayuda
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
  const gain = calcGain(G.moves, G.opt, 0);
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
      Music.duck(1);
      playReviveEffect('¡RENACER!', false);
      setMessage(revivedMessage(r.cost));
      return;
    }
  }
  triggerGameOver(why);
}

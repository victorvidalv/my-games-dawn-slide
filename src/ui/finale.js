import { Music } from '../audio/music.js';
import { tone } from '../audio/sound.js';
import { $ } from '../dom.js';
import { MAX_LEVEL } from '../engine/difficulty.js';
import { fateCards } from '../game/fate.js';
import { relicFor } from '../game/relics.js';
import { runGrade } from '../game/run-logic.js';
import { recordBest, startRun } from '../game/session.js';
import { S, discardRun, heroOf, pathOf, persist, rememberConfig, rkey, store } from '../state.js';
import { fateArt } from './fate-art.js';
import { icon } from './icons.js';
import { countUp } from './fx.js';
import { openMenu } from './menu.js';
import { countStat, markStat, updateStats } from './achievements.js';
import { victoryStats } from '../game/achievements.js';
import { endingStory } from './story.js';
import { WORLD } from '../data/lore.js';
import { numLocale } from '../i18n.js';
/* Final del camino (nivel 21): personaje, agradecimiento, puntaje obtenido y resumen de la build */
let crowdTimer = 0;
function stopCrowd() {
  clearInterval(crowdTimer);
  setTimeout(() => {
    $('crowd').innerHTML = '';
  }, 3600);
}
function renderBuildSummary(el, snapshot) {
  if (!el || !snapshot) return;
  const h = heroOf(snapshot.hero);
  const r = relicFor(snapshot);
  const cards = fateCards(snapshot);
  const chips = [
    `<span class="build-chip is-hero">${icon(h.icon)}<b>${h.name}</b></span>`,
    ...(r ? [`<span class="build-chip is-relic">${icon('trophy')}<b>${r.name}</b></span>`] : []),
  ].join('');
  const cardsHtml = cards.length
    ? `<ul class="build-cards">${cards
        .map(
          (c) =>
            `<li class="build-card is-${c.kind}" style="--fa:${c.hue[0]};--fb:${c.hue[1]}" title="${c.name}: ${c.gain}"><span class="build-card-art">${fateArt(c)}</span><small>${c.name}</small></li>`,
        )
        .join('')}</ul>`
    : '';
  el.innerHTML = `<span class="build-title">Tu combinación</span><div class="build-meta">${chips}</div>${cardsHtml}`;
  el.hidden = false;
}
function renderGradeAndStats({ gradeEl, statsEl, nearEl, victory, snapshot, bestScore }) {
  const boards = victory ? MAX_LEVEL : Math.max(0, (snapshot.level || 1) - 1);
  const perfects = snapshot.perfects || 0;
  const bestStreak = Math.max(snapshot.bestStreak || 0, snapshot.streak || 0);
  const pacts = fateCards(snapshot).filter((c) => c.kind === 'pact').length;
  const g = runGrade({
    victory,
    level: snapshot.level,
    score: snapshot.score || 0,
    perfects,
    start: snapshot.start,
  });
  if (gradeEl) {
    gradeEl.textContent = g.grade;
    gradeEl.dataset.grade = g.cls;
  }
  if (statsEl) {
    statsEl.innerHTML =
      `<div><small>PERFECTOS</small><b>${perfects}/${boards || MAX_LEVEL}</b></div>` +
      `<div><small>MEJOR RACHA</small><b>${bestStreak}</b></div>` +
      `<div><small>PACTOS</small><b>${pacts}</b></div>`;
    statsEl.hidden = false;
  }
  if (nearEl) {
    const gap = (bestScore || 0) - (snapshot.score || 0);
    const left = Math.max(1, MAX_LEVEL - boards);
    if (!snapshot.recBroken && gap > 0) {
      nearEl.textContent = `A ${gap.toLocaleString(numLocale())} pts de tu récord`;
      nearEl.hidden = false;
    } else if (!victory) {
      nearEl.textContent =
        left === 1 ? 'Te faltó solo 1 nivel para llegar al final' : `Te faltaron ${left} niveles para llegar al final`;
      nearEl.hidden = false;
    } else {
      nearEl.hidden = true;
    }
  }
}
function showFinale(prac, p, score, broken, snapshot, bestScore) {
  const heroId = snapshot?.hero || 'lia';
  endingStory(true, heroId, 21);
  const mode = prac ? 'p' : 'c';
  const F = {
    1: {
      ico: 'trophy',
      tag: 'SENDA NORMAL COMPLETADA',
      title: '¡El amanecer responde!',
      text: 'Cruzaste las siete ciudades y el Faro del Amanecer vuelve a encenderse. Pero Vhorn sigue ahí, olvidado y furioso, y Tri aún duerme.',
      chal: 'En la senda <b>Difícil</b> el margen se estrecha y los puntos crecen.',
      next: [[50, '⚔️ Ir al camino Difícil', 1]],
    },
    50: {
      ico: 'medal',
      tag: 'SENDA DIFÍCIL COMPLETADA',
      title: '¡Viajero de Thyes!',
      text: 'Recorriste otra vez las siete ciudades, ya con la hora y la palabra de tu lado. El Faro arde casi entero; falta pronunciar el nombre de Vhorn.',
      chal: 'Solo resta la prueba suprema: la senda <b>Experto</b>, hasta el trono vacío.',
      next: [[75, '🔥 Ir al camino Experto', 1]],
    },
    75: {
      ico: 'crown',
      tag: 'SENDA EXPERTO COMPLETADA',
      title: '¡Thyes amanece!',
      text: 'La brasa, la hora y la palabra encienden el Faro del Amanecer y nombran a Vhorn. Su sombra se calma y Tri, al fin, abre los ojos: año 4134, Thyes despierta.',
      chal: 'Gracias por jugar DAWNSLIDE hasta el final.',
      next: [[75, '↻ Jugar otra vez', 1]],
    },
  }[p.s] || {
    ico: 'trophy',
    tag: 'SENDA COMPLETADA',
    title: '¡Felicidades!',
    text: 'Superaste los 21 niveles.',
    chal: '',
    next: [[1, '↻ Jugar otra vez', 1]],
  };
  const legend = p.s === 75;
  $('fCard').classList.toggle('legend', legend);
  $('fIco').innerHTML = icon(F.ico);
  $('fTag').textContent = F.tag;
  $('fTitle').textContent = F.title;
  $('fText').textContent = F.text;
  $('fChal').innerHTML = F.chal;
  $('fScore').textContent = prac ? '' : '0';
  $('fRec').innerHTML = !prac && broken ? '<span class="rec">★ NUEVO RÉCORD ★</span>' : '';
  renderGradeAndStats({
    gradeEl: $('fGrade'),
    statsEl: $('fStats'),
    nearEl: $('fNear'),
    victory: true,
    snapshot,
    bestScore,
  });
  renderBuildSummary($('fBuild'), snapshot);
  const box = $('fBtns');
  box.innerHTML = '';
  F.next.forEach(([s, label, main]) => {
    const b = document.createElement('button');
    b.textContent = label;
    if (main) b.className = 'primary big';
    b.onclick = () => {
      $('finale').classList.remove('show');
      stopCrowd();
      Music.duck(1);
      store.mode = mode;
      persist();
      startRun(s, mode);
    };
    box.appendChild(b);
  });
  const m = document.createElement('button');
  m.textContent = 'Ir al inicio';
  if (!F.next.length) m.className = 'primary big';
  m.onclick = () => {
    $('finale').classList.remove('show');
    stopCrowd();
    Music.duck(1);
    openMenu();
  };
  box.appendChild(m);
  $('finale').classList.add('show');
  Music.duck(0.3);
  if (!prac) countUp($('fScore'), 0, score, 1600);
  tone(392, 0.35, 'sine', 0.045);
  tone(523, 0.45, 'sine', 0.035, 0.15);
}

export function endRun(victory, why) {
  const prac = S.run.mode === 'p',
    p = pathOf(S.run.start),
    endingHero = heroOf().id,
    snapshot = { ...S.run, hero: endingHero, fate: [...(S.run.fate || [])] };
  rememberConfig(S.run);
  recordBest(true);
  const rec = store.paths[rkey()];
  if (victory) {
    markStat('paths', S.run.start);
    countStat('completed');
    const pacts = fateCards(snapshot).filter((c) => c.kind === 'pact');
    const { grade } = runGrade({
      victory: true,
      level: snapshot.level,
      score: snapshot.score || 0,
      perfects: snapshot.perfects || 0,
      start: snapshot.start,
    });
    updateStats((st) =>
      victoryStats(st, {
        hero: endingHero,
        grade,
        pacts: pacts.length,
        oath: pacts.some((c) => c.id === 'juramento'),
        helped: !!snapshot.helped,
      }),
    );
    const sc = S.run.score,
      br = S.run.recBroken;
    discardRun();
    showFinale(prac, p, sc, br, snapshot, rec.score);
    return;
  }
  endingStory(false, endingHero, S.run.level);
  $('overTag').textContent = 'LA NOCHE SE CIERRA · ' + p.n.toUpperCase();
  const timeUp = why === 'time';
  $('overTitle').textContent = timeUp ? 'Sin tiempo' : 'Sin turnos';
  $('overTxt').textContent =
    `${timeUp ? 'Se agotó el tiempo' : 'Te quedaste sin movimientos'} en el nivel ${S.run.level} de 21. Thyes, año ${WORLD.year}.`;
  $('overRec').innerHTML = !prac && S.run.recBroken ? '<span class="rec">★ NUEVO RÉCORD ★</span>' : '';
  $('overLvl').textContent = S.run.level;
  $('overBest').textContent = rec.score.toLocaleString(numLocale());
  renderGradeAndStats({
    gradeEl: $('overGrade'),
    statsEl: $('overStats'),
    nearEl: $('overNear'),
    victory: false,
    snapshot,
    bestScore: rec.score,
  });
  renderBuildSummary($('overBuild'), snapshot);
  const retryBtn = $('bRetryOver');
  if (retryBtn) {
    retryBtn.onclick = () => {
      $('over').classList.remove('show');
      startRun(snapshot.start, snapshot.mode, { hero: snapshot.hero, relic: snapshot.relic });
    };
  }
  $('over').classList.add('show');
  countUp($('overScore'), 0, S.run.score, 1200);
  (retryBtn || $('bToMenu')).focus();
  discardRun();
}

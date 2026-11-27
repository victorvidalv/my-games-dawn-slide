import { Music } from '../audio/music.js';
import { tone } from '../audio/sound.js';
import { $ } from '../dom.js';
import { MAX_LEVEL } from '../engine/difficulty.js';
import { fateCards } from '../game/fate.js';
import { relicFor } from '../game/relics.js';
import { maxScoreFor, nextRank, rankScale, runRank } from '../game/rank.js';
import { recordBest, startRun } from '../game/session.js';
import { S, discardRun, heroOf, pathOf, persist, rememberConfig, rkey, store } from '../state.js';
import { fateArt } from './fate-art.js';
import { icon } from './icons.js';
import { countUp } from './fx.js';
import { openMenu } from './menu.js';
import { countStat, markStat, updateStats } from './achievements.js';
import { victoryStats } from '../game/achievements.js';
import { endingStory } from './story.js';
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
/**
 * Escala de rango: un bloque por letra (C, B, A, S, S+) con los puntos que pide; un marcador sube hasta tu puntaje
 * y se queda en su bloque. Debajo: cuánto te falta para la siguiente letra.
 */
function renderRankScale(el, snapshot) {
  if (!el) return;
  const nf = new Intl.NumberFormat(numLocale());
  const score = snapshot.score || 0;
  const g = runRank(snapshot);
  const blocks = rankScale(snapshot.start, snapshot.relic ?? null);
  const at = blocks.findIndex((b) => b.grade === g.grade);
  const b = blocks[at];
  const within = b.to > b.from ? Math.min(1, Math.max(0, (score - b.from) / (b.to - b.from))) : 1;
  const pos = ((at + (g.grade === 'S+' ? 0.5 : within)) / blocks.length) * 100;
  const up = nextRank(g.pct, snapshot.start);
  const need = up ? Math.max(0, blocks[at + 1].from - score) : 0;
  el.innerHTML =
    `<div class="rank-scale-track">${blocks
      .map(
        (x, i) =>
          `<div class="rank-step${i === at ? ' is-here' : ''}${i < at ? ' is-passed' : ''}" data-grade="${x.cls}">` +
          `<b>${x.grade}</b><small>${nf.format(x.from)}${i + 1 < blocks.length ? '' : '+'}</small></div>`,
      )
      .join(
        '',
      )}<span class="rank-marker" style="--to:${pos.toFixed(2)}%"><i></i><em>${nf.format(score)}</em></span></div>` +
    `<p class="rank-scale-note">${
      up
        ? `Estás en ${g.grade}: te faltan ${nf.format(need)} pts para ${up.grade}`
        : 'Rango S+: ¡puntaje casi perfecto!'
    }</p>` +
    `<p class="rank-scale-max">${`Máximo de este camino con tu reliquia: ${nf.format(maxScoreFor(snapshot.start, snapshot.relic ?? null))} pts (mejor héroe y cartas, con todo perfecto).`}</p>`;
  el.hidden = false;
  el.classList.remove('is-run');
  void el.offsetWidth; // reinicia la animación
  el.classList.add('is-run');
}
function renderGradeAndStats({ gradeEl, statsEl, nearEl, scaleEl, victory, snapshot, bestScore }) {
  const boards = victory ? MAX_LEVEL : Math.max(0, (snapshot.level || 1) - 1);
  const perfects = snapshot.perfects || 0;
  const bestStreak = Math.max(snapshot.bestStreak || 0, snapshot.streak || 0);
  const pacts = fateCards(snapshot).filter((c) => c.kind === 'pact').length;
  const g = runRank(snapshot);
  renderRankScale(scaleEl, snapshot);
  if (gradeEl) {
    gradeEl.textContent = g.grade;
    gradeEl.dataset.grade = g.cls;
    gradeEl.title = `${g.pct.toLocaleString(numLocale())} % del máximo`;
    gradeEl.classList.remove('rank-pop');
    void gradeEl.offsetWidth; // reinicia la animación de entrada
    gradeEl.classList.add('rank-pop');
  }
  if (statsEl) {
    statsEl.innerHTML =
      `<div><small>PERFECTOS</small><b>${perfects}/${boards || MAX_LEVEL}</b></div>` +
      `<div><small>MEJOR RACHA</small><b>${bestStreak}</b></div>` +
      `<div><small>PACTOS</small><b>${pacts}</b></div>` +
      `<div class="run-stats-wide"><small>DEL MÁXIMO POSIBLE</small><b>${g.pct.toLocaleString(numLocale())} %</b></div>`;
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
    scaleEl: $('fScale'),
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

/**
 * Derrota: los puntos cuentan desde 0 y, a la vez, una barra recorre las letras C → S+ de la dificultad del camino
 * (cada letra con los puntos que pide en esa dificultad). La letra grande cambia cuando la cuenta cruza cada tramo,
 * así se ve cómo llegaste a tu rango; al terminar aparece lo que falta para la siguiente.
 */
let rankAnim = 0;
function animateDefeatRank(snapshot) {
  const el = $('overRank'),
    scoreEl = $('overScore'),
    gradeEl = $('overGrade');
  const nf = new Intl.NumberFormat(numLocale());
  const score = Math.max(0, snapshot.score || 0);
  const blocks = rankScale(snapshot.start, snapshot.relic ?? null);
  const final = runRank(snapshot);
  const at = Math.max(
    0,
    blocks.findIndex((b) => b.grade === final.grade),
  );
  el.innerHTML = `<ol class="ovr-track">${blocks
    .map(
      (b) =>
        `<li data-grade="${b.cls}"><b>${b.grade}</b><span class="ovr-seg"><i></i></span><small>${nf.format(b.from)}</small></li>`,
    )
    .join('')}</ol><p class="ovr-next" hidden></p>`;
  const items = [...el.querySelectorAll('li')];
  const up = nextRank(final.pct, snapshot.start);
  const next = el.querySelector('.ovr-next');
  if (up) next.innerHTML = `+${nf.format(Math.max(1, blocks[at + 1].from - score))} pts → <b>${up.grade}</b>`;
  else next.textContent = '★ S+ ★';
  let shown = -1;
  const paint = (v, done) => {
    const idx = done
      ? at
      : Math.min(
          at,
          Math.max(
            0,
            blocks.findLastIndex((b) => v >= b.from),
          ),
        );
    items.forEach((li, i) => {
      const b = blocks[i];
      const fill =
        i < idx ? 1 : i > idx ? 0 : b.to > b.from ? Math.min(1, Math.max(0, (v - b.from) / (b.to - b.from))) : 1;
      li.querySelector('i').style.width = `${(fill * 100).toFixed(1)}%`;
      li.classList.toggle('is-on', i <= idx);
      li.classList.toggle('is-here', i === idx);
    });
    if (idx !== shown) {
      shown = idx;
      gradeEl.textContent = blocks[idx].grade;
      gradeEl.dataset.grade = blocks[idx].cls;
      gradeEl.classList.remove('rank-pop');
      void gradeEl.offsetWidth; // reinicia el salto de la letra
      gradeEl.classList.add('rank-pop');
      if (idx > 0) tone(392 * Math.pow(2, idx / 4), 0.18, 'sine', 0.03);
    }
    scoreEl.textContent = nf.format(Math.round(v));
  };
  gradeEl.title = `${final.pct.toLocaleString(numLocale())} % del máximo`;
  cancelAnimationFrame(rankAnim);
  const finish = () => {
    paint(score, true);
    next.hidden = false;
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !score) return finish();
  const ms = 1300 + 450 * at,
    t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    paint(score * (1 - Math.pow(1 - k, 3)), false);
    if (k < 1) rankAnim = requestAnimationFrame(step);
    else finish();
  };
  rankAnim = requestAnimationFrame(step);
}
/* Derrota: «Jugar de nuevo» vuelve a abrir el mismo camino (elige héroe y empieza) */
let retryStart = 1;
$('bRetry').onclick = () => {
  $('over').classList.remove('show');
  startRun(retryStart, 'c');
};
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
    const { grade } = runRank(snapshot);
    updateStats((st) =>
      victoryStats(st, {
        hero: endingHero,
        start: snapshot.start,
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
  $('overTitle').textContent = why === 'retire' ? 'Te retiraste' : 'Es el final';
  const reached = Math.min(MAX_LEVEL, Math.max(1, S.run.level || 1));
  $('overLvl').textContent = `${reached}/${MAX_LEVEL}`;
  $('overBar').style.width = `${(reached / MAX_LEVEL) * 100}%`;
  const near = $('overNear'),
    gap = (rec.score || 0) - (S.run.score || 0);
  near.classList.toggle('is-rec', !prac && !!S.run.recBroken);
  if (!prac && S.run.recBroken) near.textContent = '★ NUEVO RÉCORD ★';
  else if (gap > 0) near.textContent = `A ${gap.toLocaleString(numLocale())} pts de tu récord`;
  near.hidden = !near.classList.contains('is-rec') && !(gap > 0);
  retryStart = snapshot.start;
  $('over').classList.add('show');
  animateDefeatRank(snapshot);
  $('bRetry').focus();
  discardRun();
}

import { Music, setTensionFx } from '../audio/music.js';
import { $ } from '../dom.js';
import {
  leaveDaily,
  resumeAdventure,
  retireRun,
  saveRun,
  startDaily,
  startRun,
  surrenderDaily,
} from '../game/session.js';
import { DAILY_TOTAL_BOARDS } from '../game/daily.js';
import { closeCustomView, paintAchBadge, renderAchievements } from './achievements.js';
import { paintDailyHome } from './daily.js';
import { PATHS, S, closeRun, heroOf, pathOf, pathUnlockReq, pathUnlocked, persist, setRun, store } from '../state.js';
import { restoreRun } from '../game/run-logic.js';
import { bestAdventureRecord } from '../game/save-merge.js';
import { gradeIndex, rankFor } from '../game/rank.js';
import { MAX_LEVEL } from '../engine/difficulty.js';
import { syncHero } from './heroes.js';
import { outfitImg } from './story.js';
/* ---------- Menú: elegir camino ---------- */
const MODE_INFO = {
  c: 'Sube puntos nivel a nivel. Si agotas los turnos (el doble del mínimo) sin sacar la llave, la partida termina.',
  p: 'Sin puntos ni eliminación. Pistas ilimitadas y deshacer gratis. Ideal para aprender y relajarte.',
};
function renderPaths() {
  const mode = 'c',
    box = $('paths');
  box.innerHTML = '';

  $('modeInfo').textContent = MODE_INFO[mode];
  PATHS.forEach((p) => {
    const unlocked = pathUnlocked(store, p.s);
    const rec = store.paths[mode + p.s],
      lvl = Math.min(MAX_LEVEL, rec ? rec.level : 0),
      prog = lvl ? Math.max(4, Math.round((lvl / MAX_LEVEL) * 100)) : 0;
    const big = mode === 'c' ? (rec && rec.score ? rec.score.toLocaleString(numLocale()) : '—') : lvl ? lvl : '—';
    const lbl = mode === 'c' ? 'RÉCORD' : 'NIVEL MÁX.';
    const txt = `${lvl >= MAX_LEVEL ? '👑 ' : ''}Nivel máx. ${lvl}/${MAX_LEVEL}`;
    const d = document.createElement('div');
    d.className = `path${unlocked ? '' : ' locked'}`;
    d.dataset.start = String(p.s);
    d.style.setProperty('--pc', p.c);
    d.setAttribute('role', 'button');
    if (!unlocked) {
      const req = pathUnlockReq(p.s);
      d.setAttribute('aria-disabled', 'true');
      d.setAttribute('aria-label', `${p.n}. Bloqueado. ${req}`);
      d.tabIndex = -1;
      d.innerHTML = `<div class="pemo pemo-lock" aria-hidden="true">${icon('lock')}</div>
        <div class="pinfo"><b>${p.n}</b><small>${p.d}</small></div>
        <div class="pscore"><small>ESTADO</small><b class="path-locked-tag">Bloqueado</b></div>
        <div class="pach"><span class="path-lock-note">${icon('lock')}<span>${req}</span></span></div>`;
      box.appendChild(d);
      return;
    }
    d.tabIndex = 0;
    const pct = rec?.pct > 0 ? rec.pct : 0;
    const rank = pct ? rankFor(pct, p.s) : null;
    const badge = rank
      ? `<span class="rank-badge" data-grade="${rank.cls}" title="${pct} % del máximo">${rank.grade}</span><span class="rank-badge-pct">${pct} %</span>`
      : '';
    d.innerHTML = `<div class="pemo">${p.e}</div>
      <div class="pinfo"><b>${p.n}</b><small>${p.d}</small></div>
      <div class="pscore"><small>${lbl}</small><b>${big}</b></div>
      <div class="pach"><div class="pbar"><i style="width:${prog}%"></i></div><span class="prow"><em>${txt}</em>${badge}</span></div>`;
    d.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pickPath(p.s, mode);
      }
    };
    d.onclick = () => pickPath(p.s, mode);
    box.appendChild(d);
  });
}
/* ---------- Ventana de confirmación con diseño propio ---------- */
import { ICON_NAMES, icon } from './icons.js';
import { lang, numLocale, setLang } from '../i18n.js';
export function ask({ ico = '❓', title, text, yes = 'Aceptar', no = 'Cancelar', danger = false }) {
  return new Promise((res) => {
    $('askIco').innerHTML = ICON_NAMES.includes(ico) ? icon(ico) : ico;
    $('askTitle').textContent = title;
    $('askText').innerHTML = text;
    const y = $('askYes'),
      n = $('askNo');
    y.textContent = yes;
    n.textContent = no;
    y.className = danger ? 'danger' : 'primary';
    const done = (v) => {
      $('ask').classList.remove('show');
      y.onclick = n.onclick = null;
      res(v);
    };
    y.onclick = () => done(true);
    n.onclick = () => done(false);
    $('ask').classList.add('show');
  });
}
async function pickPath(s, mode) {
  if (!pathUnlocked(store, s)) return;
  mode = 'c';
  const active = S.run && S.G && !S.G.done,
    p = pathOf(s);
  if (active || store.run) {
    const cur = active ? S.run : store.run;
    const ok = await ask({
      ico: '🗺️',
      danger: true,
      yes: 'Sí, empezar',
      no: 'Volver',
      title: active ? '¿Abandonar esta partida?' : '¿Descartar la partida guardada?',
      text:
        (active ? 'Dejas la partida en curso.' : 'Se pierde la partida guardada.') +
        ` Lo conseguido (${cur.mode === 'p' ? 'nivel ' + cur.level : cur.score.toLocaleString(numLocale()) + ' pts, nivel ' + cur.level}) cuenta para tu máximo.<br><br>Empezarás <b>${p.n}</b> · Aventura.`,
    });
    if (!ok) return;
  }
  $('menu').classList.remove('show');
  $('pause').classList.remove('show');
  Music.muffle(false);
  startRun(s, mode);
}
/* ---------- Opciones (pausa) ---------- */
function openPause() {
  if (!S.run || !S.G || S.G.done) return;
  const { daily } = S.run;
  $('pauseContext').textContent = daily
    ? `Desafío · Tablero ${daily.index + 1}/${DAILY_TOTAL_BOARDS}`
    : `${heroOf().name} · Nivel ${S.run.level} de ${MAX_LEVEL}`;
  $('pauseHero').hidden = !!daily;
  $('pSave').hidden = false;
  $('pQuit').hidden = false;
  $('pauseSaveError').hidden = true;
  $('pQuit').firstElementChild.textContent = 'Rendirme';
  $('pauseHero').src = outfitImg(heroOf().id, 'act');
  $('pause').classList.add('show');
  Music.muffle(true);
  $('pResume').focus();
}
function closePause() {
  $('pause').classList.remove('show');
  Music.muffle(false);
}
$('bMenu').onclick = () => {
  if (S.busy) return;
  if (S.run && S.G && !S.G.done) openPause();
  else openMenu();
};
$('pResume').onclick = closePause;
$('pause').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    closePause();
    return;
  }
  if (e.key !== 'Tab') return;
  const buttons = [...$('pause').querySelectorAll('button:not([hidden])')],
    first = buttons[0],
    last = buttons.at(-1);
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});
$('pSave').onclick = () => {
  if (!S.run || !S.G || S.G.done) return;
  if (S.run.daily) {
    leaveDaily();
    $('pause').classList.remove('show');
    openMenu();
    return;
  }
  saveRun();
  closeRun();
  $('pause').classList.remove('show');
  Music.stop(0.2);
  setTensionFx(0, false);
  openMenu();
};
$('pQuit').onclick = async () => {
  if (!S.run) return;
  if (S.run.daily) {
    const ok = await ask({
      ico: '🏳️',
      danger: true,
      yes: 'Sí, rendirme',
      no: 'Seguir jugando',
      title: '¿Rendirse en el desafío?',
      text: 'Terminarás este intento del desafío de hoy con tu avance actual y podrás ver tus resultados o empezar de nuevo.',
    });
    if (!ok) return;
    $('pause').classList.remove('show');
    Music.muffle(false);
    surrenderDaily();
    return;
  }
  const ok = await ask({
    ico: '🏳️',
    danger: true,
    yes: 'Sí, rendirme',
    no: 'Seguir jugando',
    title: '¿Rendirse en la aventura?',
    text: 'Terminarás esta partida: verás tu puntaje y rango, y se guardará tu récord. Si quieres seguir más tarde, usa «Guardar y salir».',
  });
  if (!ok) return;
  $('pause').classList.remove('show');
  Music.muffle(false);
  retireRun();
};
const continueLabel = (sr) =>
  `<span class="cont-ico" aria-hidden="true">▶</span><span class="cont-copy"><b>Continuar</b><small>${pathOf(sr.start || 1).n} · Nivel ${sr.level} de ${MAX_LEVEL}` +
  (sr.mode === 'p' ? ' · Práctica' : ` · ${sr.score.toLocaleString(numLocale())} pts`) +
  '</small></span><i class="cont-go" aria-hidden="true">›</i>';
/* Cada entrada del menú abre su sección con «Volver». */
const VIEWS = {
  adv: { title: 'Aventura', panel: 'panelAdv' },
  ach: { title: 'Personalizar', panel: 'panelAch' },
  more: { title: 'Más opciones', panel: 'panelMore' },
};
let viewNow = 'home';

function paintHomeRecord() {
  const record = bestAdventureRecord(store.paths);
  $('homeRecord').hidden = !record;
  if (!record) return;
  $('homeRecordScore').textContent = record.score.toLocaleString(numLocale());
  const badge = $('homeRank');
  // mejor rango entre los caminos (cada uno con sus tramos); a igual letra gana el mayor porcentaje
  const top = Object.entries(store.paths || {})
    .filter(([k, e]) => /^c\d+$/.test(k) && Number(e?.pct) > 0)
    .map(([k, e]) => ({ pct: Number(e.pct), ...rankFor(Number(e.pct), Number(k.slice(1))) }))
    .sort((x, y) => gradeIndex(y.grade) - gradeIndex(x.grade) || y.pct - x.pct)[0];
  badge.hidden = !top;
  if (top) {
    badge.dataset.grade = top.cls;
    badge.textContent = top.grade;
    badge.title = `${top.pct} % del máximo`;
    badge.classList.remove('rank-pop');
    void badge.offsetWidth;
    badge.classList.add('rank-pop');
  }
  const age = $('homeRecordAge');
  age.hidden = record.recordAt === null;
  if (record.recordAt !== null) {
    const seconds = Math.max(0, Math.floor((Date.now() - record.recordAt) / 1000));
    const units = [
      ['year', 31536000],
      ['month', 2592000],
      ['day', 86400],
      ['hour', 3600],
      ['minute', 60],
    ];
    const [unit, size] = units.find(([, span]) => seconds >= span) || ['second', 1];
    age.dateTime = new Date(record.recordAt).toISOString();
    age.textContent = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(-Math.floor(seconds / size), unit);
  }
}

function paintHome() {
  paintHomeRecord();
  $('homeAdvSaved').hidden = true;
  $('homeAdvSaved').textContent = '';
  paintDailyHome();
  paintAchBadge();
}
function showView(view, { focus = false } = {}) {
  const prev = viewNow;
  viewNow = VIEWS[view] ? view : 'home';
  if (prev === 'ach' && viewNow !== 'ach') closeCustomView();
  const home = viewNow === 'home';
  $('menuCard').dataset.view = viewNow;
  $('menu').dataset.view = viewNow;
  $('menuHome').hidden = !home;
  $('homeShortcuts').hidden = !home;
  $('menuHead').hidden = home;
  Object.entries(VIEWS).forEach(([k, v]) => {
    $(v.panel).hidden = k !== viewNow;
  });
  if (home) paintHome();
  else {
    $('menuTitle').textContent = VIEWS[viewNow].title;
    if (viewNow === 'ach') renderAchievements();
  }
  $('menuCard').scrollTop = 0;
  Object.values(VIEWS).forEach((v) => {
    $(v.panel).scrollTop = 0;
  });
  if (focus) (home ? document.querySelector('.home-btn') : $('menuBack')).focus();
}
setInterval(() => {
  if (viewNow === 'home' && !document.hidden && $('menu').classList.contains('show')) paintHomeRecord();
}, 30000);

document.querySelectorAll('#menuHome [data-view], #homeShortcuts [data-view]').forEach((b) => {
  b.onclick = () => showView(b.dataset.view, { focus: true });
});
if ($('tabDaily'))
  $('tabDaily').onclick = () => {
    $('menu').classList.remove('show');
    Music.muffle(false);
    startDaily();
  };
if ($('bResetData'))
  $('bResetData').onclick = async () => {
    const ok = await ask({
      ico: '⚠️',
      danger: true,
      yes: 'Sí, borrar todo',
      no: 'Cancelar',
      title: '¿Borrar todos tus datos?',
      text: 'Se eliminarán tus partidas guardadas, récords, logros, personalización y tutoriales. Esta acción no se puede deshacer.',
    });
    if (!ok) return;
    try {
      localStorage.clear();
    } catch {
      /* sin almacenamiento */
    }
    location.reload();
  };
$('menuBack').onclick = () => {
  const from = viewNow;
  showView('home');
  document.querySelector(`button[data-view="${from}"]`)?.focus();
};
$('menu').addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || viewNow === 'home' || !$('menu').classList.contains('show')) return;
  if (document.querySelector('.modal.show:not(#menu)')) return; // una ventana encima (confirmación, compartir…) se cierra primero
  e.preventDefault();
  $('menuBack').click();
});
export function openMenu(view = 'home') {
  renderPaths();
  paintDailyHome();
  const active = S.run && S.G && !S.G.done,
    canCont = Number.isFinite(store.run?.level) && !active;
  const b = $('bContinue');
  b.style.display = canCont ? '' : 'none';
  if (canCont) b.innerHTML = continueLabel(store.run);
  $('bResume').style.display = active ? '' : 'none';
  showView(view);
  $('menu').classList.add('show');
  if (active)
    Music.muffle(true); // hay un nivel en pausa debajo: su música suena apagada
  else Music.scene('menu'); // sin partida: tema del menú principal
}

$('bResume').onclick = () => {
  $('menu').classList.remove('show');
  Music.muffle(false);
};
$('bContinue').onclick = () => {
  $('menu').classList.remove('show');
  Music.muffle(false);
  if (S.run && S.G && !S.G.done) return;
  if (!Number.isFinite(store.run?.level) || !Number.isFinite(store.run?.seed)) {
    store.run = null;
    persist();
    openMenu();
    $('menu').classList.add('show');
    return;
  } // sin partida guardada válida no hay nada que continuar
  setRun(restoreRun(store.run));
  syncHero();
  resumeAdventure();
};

/* Selector de idioma (bajo el menú): inglés por defecto; el cambio es instantáneo y la música sigue sonando */
const paintLang = () => {
  document
    .querySelectorAll('.lang-btn')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
};
document.querySelectorAll('.lang-btn').forEach((b) => {
  b.onclick = () => setLang(b.dataset.lang);
});
paintLang();
document.addEventListener('langchange', () => {
  paintLang();
  renderPaths(); // récords y niveles con el formato de números del idioma
  showView(viewNow);
  const sr = store.run;
  if ($('bContinue').style.display !== 'none' && sr) $('bContinue').innerHTML = continueLabel(sr);
});

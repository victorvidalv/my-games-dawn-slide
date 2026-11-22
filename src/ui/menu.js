import { Music, setTensionFx } from '../audio/music.js';
import { soundLabel, toggleSound } from '../audio/sound.js';
import { zoneIdx } from '../data/zones.js';
import { $, cssUrl } from '../dom.js';
import { leaveDaily, leaveSurvival, recordBest, resumeAdventure, saveRun, startRun } from '../game/session.js';
import { challengeById } from '../game/daily.js';
import { paintAchBadge, renderAchievements } from './achievements.js';
import { paintDailyHome, renderDaily } from './daily.js';
import { routeById } from '../game/survival.js';
import { paintSurvivalHome, renderSurvival } from './survival.js';
import {
  PATHS,
  S,
  closeRun,
  discardRun,
  heroOf,
  pathOf,
  pathUnlockReq,
  pathUnlocked,
  persist,
  setRun,
  store,
} from '../state.js';
import { restoreRun } from '../game/run-logic.js';
import { bestAdventureRecord } from '../game/save-merge.js';
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
    d.innerHTML = `<div class="pemo">${p.e}</div>
      <div class="pinfo"><b>${p.n}</b><small>${p.d}</small></div>
      <div class="pscore"><small>${lbl}</small><b>${big}</b></div>
      <div class="pach"><div class="pbar"><i style="width:${prog}%"></i></div><span class="prow"><em>${txt}</em></span></div>`;
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
  const { daily, survival } = S.run;
  $('pauseContext').textContent = survival
    ? `Desafío · ${routeById(survival.route).name} · Nivel ${S.run.level}`
    : daily
      ? `Reto diario · ${challengeById(daily.id).name}`
      : `${heroOf().name} · Nivel ${S.run.level} de ${MAX_LEVEL}`;
  $('pauseHero').hidden = !!(daily || survival);
  $('pSave').hidden = !!daily;
  $('pQuit').hidden = !!survival;
  $('pauseSaveError').hidden = true;
  $('pQuit').firstElementChild.textContent = daily ? 'Salir del reto' : 'Terminar';
  $('pauseHero').src = outfitImg(heroOf().id, 'act');
  $('pause').style.setProperty(
    '--pause-scene',
    cssUrl(survival ? 'backgrounds/challenge-dawn.webp' : `backgrounds/zone-${zoneIdx(S.run.level) + 1}.webp`),
  );
  soundLabel();
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
  if (S.run.survival) {
    if (!saveRun()) {
      $('pauseSaveError').hidden = false;
      return;
    }
    leaveSurvival();
    $('pause').classList.remove('show');
    openMenu('survival');
    return;
  }
  saveRun();
  closeRun();
  $('pause').classList.remove('show');
  Music.stop(0.2);
  setTensionFx(0, false);
  openMenu();
};
$('pQuit').onclick = () => {
  if (!S.run || S.run.survival) return;
  if (S.run.daily) {
    leaveDaily();
    $('pause').classList.remove('show');
    openMenu('daily');
    return;
  }
  recordBest(true);
  closeRun();
  discardRun();
  $('pause').classList.remove('show');
  Music.stop(0.2);
  setTensionFx(0, false);
  openMenu();
};
$('pSound').onclick = toggleSound;
const continueLabel = (sr) =>
  `<span class="cont-ico" aria-hidden="true">▶</span><span class="cont-copy"><b>Continuar</b><small>${pathOf(sr.start || 1).n} · Nivel ${sr.level} de ${MAX_LEVEL}` +
  (sr.mode === 'p' ? ' · Práctica' : ` · ${sr.score.toLocaleString(numLocale())} pts`) +
  '</small></span><i class="cont-go" aria-hidden="true">›</i>';
/* Cada entrada del menú abre su sección con «Volver». */
const VIEWS = {
  adv: { title: 'Aventura', panel: 'panelAdv' },
  survival: { title: 'Desafío', panel: 'panelSurvival' },
  daily: { title: 'Retos diarios', panel: 'panelDaily' },
  ach: { title: 'Personalizar', panel: 'panelAch' },
};
let viewNow = 'home';
const coverScene = $('menu').querySelector('.cover-scene');
const coverWorld = coverScene.querySelector('.cover-world');
const coverHeroes = coverScene.querySelector('.cover-heroes');
const decodeCover = (img) =>
  img.decode().then(
    () => true,
    () => false,
  );
// La portada se muestra cuando el fondo y los héroes ya están listos (sin saltos al cargar)
Promise.all([decodeCover(coverWorld), decodeCover(coverHeroes)]).then(([world, heroes]) => {
  if (world && heroes) coverScene.classList.add('cover-ready');
});

function paintHomeRecord() {
  const record = bestAdventureRecord(store.paths);
  $('homeRecord').hidden = !record;
  if (!record) return;
  $('homeRecordScore').textContent = record.score.toLocaleString(numLocale());
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
  paintSurvivalHome();
  paintAchBadge();
}
function showView(view, { focus = false } = {}) {
  viewNow = VIEWS[view] ? view : 'home';
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
    toggleHomeTools(false);
    $('menuTitle').textContent = VIEWS[viewNow].title;
    if (viewNow === 'daily') renderDaily();
    else if (viewNow === 'survival') renderSurvival();
    else if (viewNow === 'ach') renderAchievements();
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
  renderDaily(); // también fuera de su sección: marca si el reto de hoy está pendiente
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
  $('homeGuide').href = lang === 'es' ? './guia/' : `./guia/${lang}/`;
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

/* «Más opciones» del inicio: se pliega al tocar fuera o con Escape. */
function toggleHomeTools(open) {
  $('homeMore').setAttribute('aria-expanded', String(open));
  $('homeTools').hidden = !open;
}
$('homeMore').onclick = () => toggleHomeTools($('homeTools').hidden);
document.addEventListener('click', (e) => {
  if (!$('homeTools').hidden && e.target !== $('homeMore') && !$('homeTools').contains(e.target)) {
    toggleHomeTools(false);
  }
});
$('homeShortcuts').addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('homeTools').hidden) {
    toggleHomeTools(false);
    $('homeMore').focus();
  }
});

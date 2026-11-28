import { sfx } from '../audio/sound.js';
import { $ } from '../dom.js';
import { openModal } from './modal.js';
import { hintMove } from '../engine/solver.js';
import { MECHANICS } from '../game/mechanics.js';
import { hasCurse } from '../engine/calibration.js';
import { outfitImg } from './story.js';
import { S, heroOf, persist, store } from '../state.js';
import { icon } from './icons.js';

/**
 * Ayuda del jugador, sin ventanas que interrumpan: un botón «?» siempre a la vista abre la explicación completa
 * (cómo jugar, puntos y las piezas del nivel actual). La primera vez el botón late para que se vea, y la primera vez
 * que aparece una pieza especial se muestra, bajo el tablero, una nota breve con su dibujo que no bloquea el juego.
 * Además se dibuja la leyenda de piezas bajo el tablero mientras el nivel las tiene (tocarla abre la ayuda).
 */

/** Mecánicas presentes en el tablero actual. */
function mechanicsPresent(G) {
  const out = [];
  if ((G.walls || []).length) out.push('wall');
  if (G.pieces.some((p) => p.kind === 'gate')) out.push('gate');
  if (G.pieces.some((p) => p.kind === 'heavy')) out.push('heavy');
  if (G.pieces.some((p) => p.kind === 'ice')) out.push('ice');
  return out;
}

/** Leyenda de piezas especiales del nivel actual. */
function renderLegend() {
  const el = $('legend');
  const G = S.G;
  const chips = G
    ? mechanicsPresent(G).map(
        (m) => `<span class="chip chip-${m}"><i>${icon(MECHANICS[m].icon)}</i>${MECHANICS[m].chip}</span>`,
      )
    : [];
  el.innerHTML = chips.join('');
  el.hidden = !chips.length;
  dispatchEvent(new Event('resize')); // la leyenda ocupa sitio: el tablero se reajusta para no taparla
}

const DEMO = {
  drag: '<div class="mini"><div class="mp red"></div><div class="mexit">➜</div><span class="finger">👆</span></div>',
  score:
    '<div class="mini meter-demo"><div class="mbar"><i></i><u></u></div><div class="mlbl"><span>Mínimo 5</span><span>Límite 10</span></div></div>',
  hero: '<div class="mini hero-demo"></div>',
  fate: '<div class="mini fate-demo"><i></i><i></i><i></i></div>',
  seal: `<div class="mini tools-demo"><span>${icon('seal1')}</span><b>→</b><span>${icon('seal2')}</span><b>→</b><span>${icon('seal3')}</span></div>`,
  wall: '<div class="mini"><div class="wall demo"><i></i></div><div class="mp red bump"></div></div>',
  gate: '<div class="mini gate-demo"><div class="plate demo"><i><span class="lock-shut">🔒</span><span class="lock-free">🔓</span></i></div><div class="mp blk slide-onto"></div><div class="mp gate-p"><span class="lock-shut">🔒</span><span class="lock-free">🔓</span></div></div>',
  heavy: '<div class="mini heavy-demo"><div class="mp heavy-p"><b>1</b></div><span class="steps">▸ ▹ ▹</span></div>',
  ice: '<div class="mini ice-demo"><div class="mp ice-p">❄</div><div class="wall demo"><i></i></div><span class="glide">» »</span></div>',
  curse: '<div class="mini curse-demo"><div class="mp curse-p"></div><span class="curse-spin">➜</span></div>',
};

function tipFor(id) {
  if (MECHANICS[id]) {
    return {
      title: `${icon(MECHANICS[id].icon)} ${MECHANICS[id].name}`,
      text: MECHANICS[id].tip,
      demo: id,
    };
  }
  const h = heroOf();
  return {
    drag: {
      tag: 'PRIMEROS PASOS',
      title: '¡Saca la llave roja!',
      text: 'Desliza los bloques para abrirle camino a la llave roja 🔑 hasta la salida ➜. <b>Arrastra el bloque que brilla.</b>',
      demo: 'drag',
    },
    score: {
      tag: 'PUNTOS',
      title: 'Cada movimiento cuenta',
      text: '<b>Mínimo</b> es la mejor solución: si la igualas, ¡<b>PERFECTO</b>! y más puntos. Si agotas los turnos del <b>Límite</b> (el doble del mínimo) sin sacar la llave, ya no puedes mover más y la aventura termina.',
      demo: 'score',
      glow: '#meter',
    },
    seal: {
      tag: 'OBJETIVO OPCIONAL',
      title: `${icon('seal1')}${icon('seal2')}${icon('seal3')} Sellos de bronce, plata y oro`,
      text: 'Lleva la <b>pieza de borde discontinuo</b> hasta el sello del suelo con el <b>mismo borde</b> para ganar puntos. Cuanto más rodeo cuesta, mejor premio: el de <b>bronce</b> es pequeño, el de <b>plata</b> medio y el de <b>oro</b> el gran premio. Puedes salir sin recogerlo.',
      demo: 'seal',
      glow: '#sealStatus',
    },
    fate: {
      tag: 'CARTAS DEL DESTINO',
      title: 'Tu destino se acumula',
      text: 'Al cerrar cada ciudad eliges <b>1 carta entre 2 o 3</b> (según tu héroe). Sus efectos se <b>suman</b> hasta el final de la partida y las que no eliges no vuelven. Toca el botón de cartas, arriba, para ver las que tienes activas y lo que suman.',
      demo: 'fate',
      glow: '#bFate',
    },
    hero: {
      tag: 'TU HÉROE',
      title: `${icon(h.icon)} ${h.name}: ${h.power}`,
      text: `${h.detail} <b>${h.short}.</b>`,
      demo: 'hero',
    },
    hero_power_jean: {
      tag: 'PODER ACTIVO',
      title: `${icon(h.icon)} ${h.name}: ${h.power}`,
      text: 'Pulsa el botón <b>Poder</b> (abajo) para retroceder varios movimientos de golpe y recuperar esos turnos sin gastar pistas. Puedes usarlo <b>una vez por tablero</b> cuando ya hayas movido.',
      demo: 'hero',
      glow: '#bPower',
    },
    hero_power_van: {
      tag: 'PODER ACTIVO',
      title: `${icon(h.icon)} ${h.name}: ${h.power}`,
      text: 'Pulsa el botón <b>Poder</b> (abajo) para que Juth ejecute automáticamente varios pasos óptimos hacia la salida (si faltan 3 o más). Puedes usarlo <b>una vez por tablero</b>.',
      demo: 'hero',
      glow: '#bPower',
    },
  }[id];
}

/**
 * Entradas de la ayuda según el nivel: el 1 solo explica arrastrar, el 2 solo el límite de turnos y de ahí en
 * adelante solo las piezas que tiene este tablero (rocas, hielo…). Sin nada que explicar, la lista queda vacía.
 */
function helpIds() {
  const G = S.G;
  if (!G) return [];
  if (G.n === 1) return ['drag'];
  if (G.n === 2) return ['score'];
  const ids = [];
  if (G.seal) ids.push('seal');
  ids.push(...mechanicsPresent(G));
  if (hasCurse(G.n)) ids.push('curse');
  return ids;
}

/** El botón «?» se desactiva cuando este tablero no tiene nada que explicar. */
function syncHelpButton() {
  const none = !helpIds().length;
  const btn = $('bHelp');
  btn.disabled = none;
  btn.classList.toggle('help-off', none);
  if (none) btn.classList.remove('help-new', 'help-flash');
}

const entryHtml = (id) => {
  const t = tipFor(id);
  const demo =
    t.demo === 'hero'
      ? `<img class="hero-demo-img" src="${outfitImg(heroOf().id, 'adv')}" alt="">`
      : DEMO[t.demo] || '';
  return `<section class="help-item"><div class="coach-demo" aria-hidden="true">${demo}</div><h3>${t.title}</h3><p>${t.text}</p></section>`;
};

let closeHelp = null;
/** Abre la ayuda («?»): una sola ventana, con todo lo que hace falta saber para este tablero. */
export function openHelp() {
  if (closeHelp || !helpIds().length) return;
  $('helpList').innerHTML = helpIds().map(entryHtml).join('');
  $('helpList').scrollTop = 0;
  markSeen('help');
  $('bHelp').classList.remove('help-new');
  closeHelp = openModal($('help'), {
    focus: $('helpOk'),
    trap: 'cycle',
    onClose: () => {
      closeHelp = null;
    },
  });
  $('helpOk').onclick = () => closeHelp?.();
  sfx.hint();
}

function markSeen(id) {
  store.tips = store.tips || {};
  if (store.tips[id]) return;
  store.tips[id] = true;
  persist();
}

const hintEl = () => $('legend').querySelector('.piece-hint');
function dismissHint() {
  const el = hintEl();
  if (!el) return;
  if (el.dataset.id) markSeen(el.dataset.id);
  el.remove();
  dispatchEvent(new Event('resize'));
}

/** Nota breve con dibujo la primera vez que aparece una pieza: no bloquea; se va al mover o al tocarla. */
function showPieceHint(id) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'piece-hint';
  el.dataset.id = id;
  el.innerHTML = `<span class="coach-demo" aria-hidden="true">${DEMO[id]}</span><span><b>${icon(MECHANICS[id].icon)} ${MECHANICS[id].name}</b><br>${MECHANICS[id].brief}</span>`;
  el.onclick = dismissHint;
  $('legend').prepend(el);
}

/** Marca el mejor primer movimiento del primer tablero de una partida nueva (solo una vez, sin ventanas). */
function pointAtFirstMove() {
  const G = S.G;
  if (!G || G.done) return;
  const h = hintMove(G.pieces, G.pos, G.walls);
  if (!h) return;
  const p = G.pieces[h.i];
  const dir = p.o === 'h' ? (h.to > h.from ? 'derecha' : 'izquierda') : h.to > h.from ? 'abajo' : 'arriba';
  G.els[h.i].classList.add('hint');
  $('msg').textContent = `Arrastra el bloque que brilla hacia ${dir}.`;
}

/** Se llama al empezar cada nivel. */
export function startCoach() {
  const G = S.G;
  const run = S.run;
  renderLegend();
  syncHelpButton();
  if (!G || !run || G.done || run.mode === 'p') return;
  store.tips = store.tips || {};
  const first = !store.tips.help && !$('bHelp').disabled;
  $('bHelp').classList.toggle('help-new', first);
  const id = mechanicsPresent(G).find((m) => !store.tips[m]);
  if (id) {
    showPieceHint(id);
    const btn = $('bHelp');
    if (!btn.disabled) btn.classList.add('help-flash'); // destella, sin hacer falta pulsarlo
    setTimeout(() => btn.classList.remove('help-flash'), 6000);
  }
  if (G.n === 1 && !G.moves && !store.tips.drag) pointAtFirstMove();
}

/** Tras el primer movimiento se quita la nota de pieza nueva y se da por aprendido arrastrar. */
export function coachOnMove() {
  const G = S.G;
  if (!G || G.done || S.run?.mode === 'p' || !G.moves) return;
  dismissHint();
  markSeen('drag');
}

$('bHelp').addEventListener('click', openHelp);
$('legend').addEventListener('click', (e) => {
  if (e.target.closest('.chip')) openHelp();
});

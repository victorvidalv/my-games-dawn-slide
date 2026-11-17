import { sfx } from '../audio/sound.js';
import { $ } from '../dom.js';
import { hintMove } from '../engine/solver.js';
import { MECHANICS, TUTORIALS } from '../game/mechanics.js';
import { HERO_TUTORIAL_TALK } from '../data/story.js';
import { S, heroOf, persist, store } from '../state.js';
import { icon } from './icons.js';

/**
 * Guía del jugador: enseña a jugar en los primeros niveles y explica cada pieza especial la primera vez
 * que aparece. Cada aviso se muestra UNA vez (se recuerda en store.tips) y siempre se puede repasar
 * en «Cómo se juega». Además dibuja la leyenda de piezas bajo el tablero mientras el nivel las tiene.
 */

/** Mecánicas presentes en el tablero actual. */
function mechanicsPresent(G) {
  const out = [];
  if ((G.walls || []).length) out.push('wall');
  if (G.pieces.some((p) => p.kind === 'gate')) out.push('gate');
  if (G.pieces.some((p) => p.kind === 'heavy')) out.push('heavy');
  if (G.pieces.some((p) => p.kind === 'ice')) out.push('ice');
  if ((G.doors || []).length) out.push('door');
  return out;
}

/** Leyenda de piezas especiales del nivel actual. */
function renderLegend() {
  const el = $('legend');
  const G = S.G;
  const chips = G ? mechanicsPresent(G).map((m) => `<span class="chip chip-${m}"><i>${icon(MECHANICS[m].icon)}</i>${MECHANICS[m].chip}</span>`) : [];
  el.innerHTML = chips.join('');
  el.hidden = !chips.length;
  dispatchEvent(new Event('resize'));            // la leyenda ocupa sitio: el tablero se reajusta para no taparla
}

const DEMO = {
  drag: '<div class="mini"><div class="mp red"></div><div class="mexit">➜</div><span class="finger">👆</span></div>',
  score: '<div class="mini meter-demo"><div class="mbar"><i></i><u></u></div><div class="mlbl"><span>Mínimo 5</span><span>Límite 10</span></div></div>',
  tools: `<div class="mini tools-demo"><span>${icon('stars')}</span><span>${icon('hint')}</span><span>${icon('purse')}</span></div>`,
  hero: '<div class="mini hero-demo"></div>',
  boss: '<div class="mini boss-demo"><span class="bd-skull">☠</span><b>+30 %</b></div>',
  bosstime: '<div class="mini boss-demo"><span>⏳</span><div class="bd-bar"><i></i></div><b>1:30</b></div>',
  seal: `<div class="mini tools-demo"><span>${icon('seal1')}</span><b>→</b><span>${icon('seal2')}</span><b>→</b><span>${icon('seal3')}</span></div>`,
  wall: '<div class="mini"><div class="wall demo"><i></i></div><div class="mp red bump"></div></div>',
  gate: '<div class="mini gate-demo"><div class="plate demo"><i></i></div><div class="mp blk slide-onto"></div><div class="mp gate-p"><span class="lock-shut">🔒</span><span class="lock-free">🔓</span></div></div>',
  heavy: '<div class="mini heavy-demo"><div class="mp heavy-p"><b>1</b></div><span class="steps">▸ ▹ ▹</span></div>',
  ice: '<div class="mini ice-demo"><div class="mp ice-p">❄</div><div class="wall demo"><i></i></div><span class="glide">» »</span></div>',
  curse: '<div class="mini curse-demo"><div class="mp curse-p"></div><span class="curse-spin">➜</span></div>',
  door: '<div class="mini door-demo"><div class="door-arch"><i>◆</i></div><div class="mp door-p"><b>◆</b></div></div>',
};

function tipFor(id) {
  if (MECHANICS[id]) {
    const h = heroOf(), talk = HERO_TUTORIAL_TALK[h.id]?.[id];
    return { tag: id === 'curse' ? 'MALEFICIO' : 'PIEZA NUEVA', title: `${icon(MECHANICS[id].icon)} ${MECHANICS[id].name}`, text: MECHANICS[id].tip + (talk ? `<br><br><i><b>${h.name}:</b> «${talk}»</i>` : ''), demo: id };
  }
  const h = heroOf();
  return {
    drag: { tag: 'PRIMEROS PASOS', title: '¡Saca la llave roja!', text: 'Desliza los bloques para abrirle camino a la llave roja 🔑 hasta la salida ➜. <b>Arrastra el bloque que brilla.</b>', demo: 'drag' },
    score: { tag: 'PUNTOS', title: 'Cada movimiento cuenta', text: '<b>Mínimo</b> es la mejor solución: si la igualas, ¡<b>PERFECTO</b>! y más puntos. Si agotas los turnos del <b>Límite</b> (el doble del mínimo) sin sacar la llave, ya no puedes mover más y la aventura termina.', demo: 'score', glow: '#meter' },
    tools: { tag: 'AYUDAS', title: 'Si te atoras', text: `<b>Poder</b> es propio de tu héroe: Jean rebobina y Juth traza un cuarto de los pasos que faltan (si quedan 3 o más); un uso por tablero. ${icon('hint')} <b>Pista</b> te enseña el mejor movimiento. ${icon('purse')} <b>Tienda</b>: ayudas muy caras que se pagan con tus puntos.`, demo: 'tools', glow: '.controls' },
    seal: {tag:'OBJETIVO OPCIONAL',title:`${icon('seal1')}${icon('seal2')}${icon('seal3')} Sellos de bronce, plata y oro`,text:'Lleva la <b>pieza de borde discontinuo</b> hasta el sello del suelo con el <b>mismo borde</b> para ganar puntos. Cuanto más rodeo cuesta, mejor premio: el de <b>bronce</b> es pequeño, el de <b>plata</b> medio y el de <b>oro</b> el gran premio. Puedes salir sin recogerlo.',demo:'seal',glow:'#sealStatus'},
    boss: { tag: 'JEFE DE LA CIUDAD', title: 'Un guardián te cierra el paso', text: 'Cada ciudad termina con un jefe: un tablero más difícil, con menos margen y <b>+30 % de puntos</b>. Cada jefe presiona de una forma distinta: <b>turnos ajustados</b> o <b>contrarreloj</b>. Mira el aviso antes de empezar.', demo: 'boss' },
    bosstime: { tag: 'CONTRARRELOJ', title: 'La barra de tiempo', text: 'Este jefe tiene <b>tiempo limitado</b>: la barra baja mientras piensas y mueves, y se detiene en la pausa, la tienda, los poderes y los avisos. Si llega a cero, pierdes el tablero. Con menos de 10 segundos suena un tictac.', demo: 'bosstime' },
    hero: { tag: 'TU HÉROE', title: `${icon(h.icon)} ${h.name}: ${h.power}`, text: `${h.detail} <b>${h.short}.</b>`, demo: 'hero', glow: '#heroHudName' },
  }[id];
}

let showing = false;
/** Explicaciones que pueden esperar a otro nivel si en este ya hay algo más importante que enseñar. */
const CAN_WAIT = ['score', 'tools', 'hero', 'seal'];

function show(ids, done) {
  if (!ids.length) { done?.(); return; }
  const id = ids[0];
  const t = tipFor(id);
  const modal = $('coach');
  $('coachDemo').innerHTML = t.demo === 'hero' ? `<img class="hero-demo-img" src="heroes/${heroOf().id}.webp" alt="">` : DEMO[t.demo] || '';
  $('coachTag').textContent = t.tag;
  $('coachTitle').innerHTML = t.title;
  $('coachText').innerHTML = t.text;
  $('coachOk').textContent = ids.length > 1 ? 'Siguiente' : 'Entendido';
  const glow = t.glow ? document.querySelector(t.glow) : null;
  glow?.classList.add('coach-glow');
  modal.classList.add('show');
  sfx.hint();
  $('coachOk').focus();
  $('coachOk').onclick = () => {
    modal.classList.remove('show');
    glow?.classList.remove('coach-glow');
    store.tips = store.tips || {};
    store.tips[id] = true;
    persist();
    show(ids.slice(1), done);
  };
}

/** Marca el siguiente mejor movimiento con un brillo y lo describe (solo en el nivel de aprendizaje). */
function pointAtNextMove(prefix = '', custom = null) {
  const G = S.G;
  if (!G || G.done) return;
  const h = hintMove(G.pieces, G.pos, G.walls, G.doors);
  if (!h) return;
  const p = G.pieces[h.i];
  const dir = p.o === 'h' ? (h.to > h.from ? 'derecha' : 'izquierda') : (h.to > h.from ? 'abajo' : 'arriba');
  G.els.forEach((e) => e.classList.remove('hint'));
  G.els[h.i].classList.add('hint');
  $('msg').textContent = custom ?? `${prefix}Arrastra el bloque que brilla hacia ${dir}.`;
}

/** Guía del nivel de aprendizaje: señala el siguiente movimiento y explica el paso. */
function guide() {
  const G = S.G;
  if (!G || G.done) return;
  if (G.tutorial && TUTORIALS[G.tutorial]) {
    const steps = TUTORIALS[G.tutorial].steps;
    pointAtNextMove('', steps[Math.min(G.moves, steps.length - 1)]);
  } else if (G.n === 1 && !G.moves) pointAtNextMove();
}

/** Se llama al empezar cada nivel. */
export function startCoach() {
  const G = S.G;
  const run = S.run;
  renderLegend();
  if (!G || !run || G.done || run.mode === 'p' || showing) return;
  store.tips = store.tips || {};
  const queue = [];
  if (!run.daily) {                                 // los retos diarios no enseñan el juego: solo las piezas que traen
    if (G.n === 1) queue.push('drag');
    if (G.n >= 2) queue.push('score');
    if (G.n >= 3) queue.push('tools');
    if (G.n >= 4) queue.push('hero');
  }
  if (G.plan?.boss && !G.tutorial) queue.push('boss');
  if (G.timeLimit > 0) queue.push('bosstime');
  if (G.seal) queue.push('seal');
  queue.push(...mechanicsPresent(G));
  if (G.rot) queue.push('curse');                // tablero con maleficio: se explica la primera vez
  // Una sola explicación general por nivel: lo que hace falta YA para jugar este tablero (arrastrar, piezas nuevas, jefe, maleficio)
  // se enseña siempre; las demás (puntos, ayudas, héroe, sellos) esperan su turno si ya hay otra ventana en este nivel.
  const pending = queue.filter((id) => !store.tips[id]);
  const urgent = pending.filter((id) => !CAN_WAIT.includes(id));
  const todo = urgent.length ? urgent : pending.slice(0, 1);
  if (!todo.length) { guide(); return; }
  showing = true;
  const wasBusy = S.busy;
  S.busy = true;
  show(todo, () => {
    showing = false;
    S.busy = wasBusy;
    guide();
  });
}

/** Tras cada movimiento del nivel 1 se sigue señalando el siguiente (aprendizaje guiado). */
export function coachOnMove() {
  const G = S.G;
  if (!G || G.done || S.run?.mode === 'p' || !G.moves || G.pos[0] === 4) return;
  if (G.tutorial) { guide(); return; }
  if (G.n !== 1) return;
  pointAtNextMove('¡Muy bien! ');
}

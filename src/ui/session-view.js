/* ============================ Vista de la partida ============================
 * Todo lo que el flujo de partida (`game/session.js`) muestra en pantalla: HUD del nivel, mensajes, bloqueo del
 * tablero, celebración, derrota y el diálogo de viaje entre ciudades. Aquí no se decide nada del juego.
 */
import { HERO_TALK } from '../data/story.js';
import { LORE_PORTRAITS, WORLD, lorePortraitSrc } from '../data/lore.js';
import { ZONES, zoneIdx } from '../data/zones.js';
import { $ } from '../dom.js';
import { DAILY_TARGETS, challengeById } from '../game/daily.js';
import { heroicPath } from '../game/routes.js';
import { cityAfter } from '../game/run-logic.js';
import { baseScore } from '../engine/scoring.js';
import { numLocale } from '../i18n.js';
import { sfx } from '../audio/sound.js';
import { celebrate } from './achievements.js';
import { boardEl, place, recLine } from './board.js';
import { icon } from './icons.js';
import { heroArt, storyFor } from './story.js';
import { wipeIn, wipeOut } from './transitions.js';

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const TIPS = [
  'Piensa antes de mover: cada movimiento de más resta puntos.',
  'Los bloques largos bloquean más: libéralos primero.',
  'Un solo arrastre largo cuenta como 1 movimiento.',
  'Cada héroe abre el camino a su manera.',
  'La pista no cuesta movimientos, pero es limitada.',
];

/** Consejo que se muestra al empezar un tablero. */
export function tipFor(G, heroId) {
  if (heroId === 'jean') return 'Rebobinar devuelve varios movimientos. Un uso por tablero.';
  return TIPS[(G.n * 7) % TIPS.length];
}

export const setDailyMode = (on) => document.body.classList.toggle('daily-run', on);
export const setMessage = (text) => {
  $('msg').textContent = text;
};
export const lockBoard = () => boardEl.classList.add('board-lock');
export const unlockBoard = () => boardEl.classList.remove('board-lock');

/** Puntaje de la partida en el HUD ('—' en práctica). */
export function showScore(run) {
  $('score').textContent = run.mode === 'p' ? '—' : run.score.toLocaleString(numLocale());
  recLine();
}

/** HUD inicial de un tablero: nivel, mínimo, puntos base, puntaje, límite, deshacer y consejo. */
export function renderLevelHud(run, G, heroId) {
  const prac = run.mode === 'p';
  $('lvl').textContent = run.daily
    ? `${challengeById(run.daily.id).name} · ${run.daily.index + 1}/${DAILY_TARGETS.length}`
    : G.tutorial
      ? `${G.n} · TUTORIAL`
      : G.n;
  $('mn').textContent = G.opt;
  $('base').textContent = prac ? '—' : baseScore(G.rate);
  showScore(run);
  $('lim').textContent = prac ? '∞' : G.limit;
  $('bUndo').disabled = !G.hist.length;
  setMessage(
    run.daily
      ? 'Reto diario: saca la llave roja con los menos movimientos posibles.'
      : G.n === 1
        ? 'Desliza los bloques y saca la llave roja ➜ Cada movimiento cuenta.'
        : tipFor(G, heroId),
  );
}

/** Título y subtítulo del cartel con que entra un tablero. */
export function levelBannerText(run, G) {
  if (run.daily) return ['Reto diario', challengeById(run.daily.id).name];
  const title = G.tutorial ? 'Tutorial' : `${G.plan?.boss ? 'Jefe · ' : ''}Nivel ${G.n}`;
  return [title, ZONES[zoneIdx(G.n)].n];
}

/** La llave sale del tablero; con `party` las piezas celebran con una ola de saltos. */
export function playKeyExit(G, { party = true } = {}) {
  G.els[0].classList.add('exit');
  place(0, 7);
  if (party) {
    boardEl.classList.add('board-win');
    celebrate(G.els[0]);
  }
}

export const winMessage = (G, gain, heroId) =>
  `${G.moves <= G.opt ? 'Perfecto · ' : ''}+${gain.total} puntos · ${HERO_TALK[heroId].win[G.n % 3]}`;

/** Las piezas se apagan al perder la partida. */
export const dimBoard = (G) =>
  G.els.forEach((el) => {
    el.style.opacity = '.5';
  });

/** HUD tras renacer pagando: el tablero vuelve a empezar. */
export function showRevivedHud(run, G) {
  showScore(run);
  $('lim').textContent = G.limit;
  $('bUndo').disabled = true;
}
export const revivedMessage = (cost) =>
  `Renaciste (−${cost.toLocaleString(numLocale())} pts). ¡Este tablero empieza de nuevo!`;

/** Rellena el diálogo de viaje: capítulo, sello, retrato del mundo, líneas de la ciudad y beneficio de la ruta heroica. */
function fillTravel(run, hero, city) {
  const story = storyFor(hero.id, city * 10 + 1);
  const path = heroicPath(hero.id);
  $('travelHero').src = heroArt(hero.id, 'route');
  $('travelHero').alt = hero.name;
  $('routeBraveIcon').innerHTML = icon(path.icon);
  $('routeBraveName').textContent = path.name;
  $('routePerk').textContent = path.benefit;
  $('travelScene').src = `backgrounds/zone-${city + 1}.webp`;
  $('travelPortrait').src = heroArt(hero.id, 'story');
  $('travelPortrait').alt = hero.name;
  $('travelTag').textContent =
    `THYES · AÑO ${WORLD.year} · CAPÍTULO ${city + 1} DE 10 · NIVELES ${city * 10 + 1}–${(city + 1) * 10}`;
  $('travelSeal').textContent = `Sello de ${story.seal}`;
  $('travelInscription').textContent = `«${story.inscription}»`;
  const citySpan = document.createElement('span');
  citySpan.className = 'travel-city';
  citySpan.textContent = ZONES[city].n;
  $('travelTitle').replaceChildren(citySpan);
  $('travelPlace').src = `backgrounds/zone-${city + 1}.webp`;
  $('travelPlace').alt = ZONES[city].n;
  const portrait = LORE_PORTRAITS[city],
    loreBox = $('travelLore');
  loreBox.hidden = !portrait;
  if (portrait) {
    $('travelLoreImg').src = lorePortraitSrc(portrait.id);
    $('travelLoreImg').alt = portrait.name;
    $('travelLoreName').textContent = portrait.name;
    $('travelLoreCap').textContent = portrait.caption;
  }
  const chip = $('travelLoreChip'),
    chipLine = story.vhorn ? `Vhorn: «${story.vhorn}»` : story.cityLines?.[0] || story.body || '';
  chip.hidden = !portrait && !chipLine;
  if (portrait) {
    $('travelChipImg').src = lorePortraitSrc(portrait.id);
    $('travelChipImg').alt = portrait.name;
    // Dos nodos de texto: así el traductor reconoce el nombre y la leyenda por separado.
    const name = document.createElement('bdi'), // no <span>: el chip ya da estilo propio a sus <span>
      caption = document.createElement('bdi');
    name.textContent = portrait.name;
    caption.textContent = portrait.caption;
    $('travelChipName').replaceChildren(name, ' · ', caption);
  } else {
    $('travelChipImg').removeAttribute('src');
    $('travelChipName').textContent = ZONES[city].n;
  }
  $('travelChipLine').textContent = chipLine;
  const lines = [...(story.cityLines || [story.body]), ...(story.vhorn ? [`Vhorn: «${story.vhorn}»`] : [])];
  $('travelText').replaceChildren(
    ...lines.map((txt) => {
      const li = document.createElement('li');
      li.textContent = txt;
      return li;
    }),
  );
  $('travelHeroLine').textContent = `${hero.name}: «${story.action}»`;
  $('routeSummary').textContent =
    `Nivel ${run.pendingClear?.level || run.level} superado · +${run.pendingClear?.gain || 0} pts`;
}

/**
 * Diálogo de viaje entre ciudades: el jugador elige ruta normal o heroica. `onChoose(choice, city)` se llama en
 * cuanto elige (para guardar al instante); la promesa se resuelve cuando termina la animación de salida.
 * `isActive()` evita aplicar la elección si la partida cambió mientras tanto.
 */
export function showTravelDialog({ run, hero, onChoose, isActive }) {
  return new Promise((resolve) => {
    const modal = $('travel'),
      city = cityAfter(run.pendingClear.level);
    fillTravel(run, hero, city);
    let chosen = false;
    const buttons = [$('routeNormal'), $('routeBrave')];
    buttons.forEach((b) => {
      b.disabled = false;
    });
    const key = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        (document.activeElement === buttons[0] ? buttons[1] : buttons[0]).focus();
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === buttons[0]) {
        e.preventDefault();
        buttons[1].focus();
      } else if (!e.shiftKey && document.activeElement === buttons[1]) {
        e.preventDefault();
        buttons[0].focus();
      }
    };
    const choose = (choice) => {
      if (chosen || !isActive()) return;
      chosen = true;
      buttons.forEach((b) => {
        b.disabled = true;
      });
      onChoose(choice, city);
      modal.removeEventListener('keydown', key);
      const picked = buttons[choice === 'brave' ? 1 : 0];
      picked.classList.add('picked');
      buttons.forEach((b) => b !== picked && b.classList.add('unpicked'));
      sfx.routePick();
      setTimeout(
        async () => {
          await wipeIn('gold');
          modal.classList.remove('show');
          buttons.forEach((b) => b.classList.remove('picked', 'unpicked'));
          wipeOut();
          resolve();
        },
        reducedMotion() ? 0 : 420,
      );
    };
    buttons[0].onclick = () => choose('normal');
    buttons[1].onclick = () => choose('brave');
    wipeIn('gold').then(() => {
      modal.classList.add('show');
      modal.addEventListener('keydown', key);
      buttons[0].focus();
      wipeOut();
    });
  });
}

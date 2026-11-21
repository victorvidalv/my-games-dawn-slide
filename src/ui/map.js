import { Music } from '../audio/music.js';
import { sfx } from '../audio/sound.js';
import { CHAPTERS, HERO_LORE } from '../data/story.js';
import { WORLD } from '../data/lore.js';
import { ZONES, zoneOf, zoneStep } from '../data/zones.js';
import { $, cssUrl } from '../dom.js';
import { S, heroOf } from '../state.js';
import { motes } from './fx.js';
let curZone = -1;

/** Fichas en tonos suaves: la saturación de la zona se atenúa (≈ 37–46 %) para que no resulten chillonas. */
const softSat = (s) => Math.round(s * 0.72);

function paintScenery(i) {
  const style = document.documentElement.style;
  style.setProperty('--scene', cssUrl(`backgrounds/zone-${i + 1}.webp`));
  style.setProperty('--scene-shade', ZONES[i].shade || 'transparent');
}
export function applyChallengeScenery() {
  const r = document.documentElement.style;
  curZone = -1;
  r.setProperty('--scene', cssUrl('backgrounds/challenge-dawn.webp'));
  r.setProperty('--scene-shade', 'transparent');
  const hues = [188, 38, 214, 152, 266, 18, 46, 174];
  for (let k = 0; k < 8; k++) {
    const l = 58 + (k % 2 ? 4 : -3);
    const s = softSat(58) - (k % 3 === 0 ? 4 : 0);
    r.setProperty(`--p${k}a`, `hsl(${hues[k]} ${s}% ${Math.min(l + 15, 86)}%)`);
    r.setProperty(`--p${k}b`, `hsl(${hues[k]} ${s}% ${l - 5}%)`);
    r.setProperty(`--p${k}d`, `hsl(${hues[k]} ${Math.max(24, s - 10)}% ${Math.max(16, l - 28)}%)`);
  }
  document.body.style.setProperty('--t1', '#141b2d');
  document.body.style.setProperty('--t2', '#1d2740');
  document.body.style.setProperty('--cc', '#f3c974');
}
export function applyZone(i) {
  paintScenery(i);
  if (curZone === i) return;
  curZone = i;
  const z = ZONES[i],
    r = document.documentElement.style;
  for (let k = 0; k < 8; k++) {
    if (!z.h) {
      ['a', 'b', 'd'].forEach((c) => r.removeProperty(`--p${k}${c}`));
      continue;
    }
    const l = z.l + 4 + (k % 2 ? 4 : -3),
      s = softSat(z.s) - (k % 3 === 0 ? 4 : 0);
    r.setProperty(`--p${k}a`, `hsl(${z.h[k]} ${s}% ${Math.min(l + 14, 88)}%)`);
    r.setProperty(`--p${k}b`, `hsl(${z.h[k]} ${s}% ${l - 5}%)`);
    r.setProperty(`--p${k}d`, `hsl(${z.h[k]} ${Math.max(20, s - 12)}% ${Math.max(14, l - 30)}%)`);
  }
  document.body.style.setProperty('--t1', z.t1);
  document.body.style.setProperty('--t2', z.t2);
  document.body.style.setProperty('--cc', z.cc);
}
export function renderStage() {
  // barra de 10 tramos de la zona actual
  const z = zoneOf(S.G.n),
    step = zoneStep(S.G.n);
  $('sname').textContent = z.n;
  const sg = $('segs');
  sg.innerHTML = '';
  for (let k = 1; k <= 10; k++) {
    const s = document.createElement('span');
    s.className = 'sg' + (k < step ? ' done' : k === step ? ' cur adv' : '');
    sg.appendChild(s);
  }
}
/**
 * Tiempos del cruce de ciudad (ms): la torre aparece, la luz sube por el costado hasta la ciudad nueva, el piso se enciende
 * y la vista se queda un momento para que se note el avance (≈3 s en total; tocar la pantalla la cierra antes).
 */
const CLIMB_START = 450;
const CLIMB_TIME = 900;
const HOLD_AFTER = 1500;

/**
 * Torre del viaje: se muestra al empezar una aventura, al cerrar cada ciudad y desde el menú (vista general).
 * Diez pisos, uno por ciudad, de abajo (Valle) hacia arriba (el Faro): los pisos superados se llenan de luz, el actual
 * brilla y al lado de cada uno va el nombre de la ciudad y el nivel con que empieza. El héroe de la partida queda de fondo.
 * Al cruzar de ciudad una luz sube por el costado de la torre hasta el piso nuevo, que se enciende con chispas.
 */
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function buildTower(open) {
  const tower = $('mapTower');
  tower.innerHTML = ZONES.map((z, i) => {
    const state = i < open ? 'done' : i === open ? 'current' : 'locked';
    const tag = i < open ? 'Completada' : i === open ? 'Estás aquí' : `Nivel ${i * 10 + 1}`;
    return `<li class="floor is-${state}" style="--i:${i};--cc:${z.cc || '#f2c45c'};--city:url('backgrounds/zone-${i + 1}.webp')" data-city="${i}">
      <span class="floor-block" aria-hidden="true"><span class="floor-num">${i < open ? '✓' : i + 1}</span></span>
      <span class="floor-label"><b>${z.n}</b><small>${tag}</small></span>
    </li>`;
  }).join('');
  const rail = document.createElement('li');
  rail.className = 'tower-rail';
  rail.setAttribute('aria-hidden', 'true');
  rail.innerHTML = '<i></i>';
  tower.appendChild(rail);
  return [...tower.querySelectorAll('.floor')];
}

/** Altura de la barra de luz: desde la base de la torre hasta la mitad del piso `i`. */
function railTo(floors, i, animate) {
  const tower = $('mapTower'),
    bar = tower.querySelector('.tower-rail i'),
    base = tower.getBoundingClientRect().bottom,
    r = floors[i].getBoundingClientRect();
  bar.style.transition = animate ? '' : 'none';
  bar.style.height = `${Math.max(0, base - (r.top + r.height / 2))}px`;
}

/** Marca un piso como superado o actual (sin reconstruir la torre). */
function setFloor(floor, state, i) {
  floor.classList.remove('is-done', 'is-current', 'is-locked');
  floor.classList.add('is-' + state);
  floor.querySelector('.floor-num').textContent = state === 'done' ? '✓' : String(i + 1);
  floor.querySelector('small').textContent =
    state === 'done' ? 'Completada' : state === 'current' ? 'Estás aquí' : `Nivel ${i * 10 + 1}`;
}

export function showMap(fromI, toI, { travel = false, overview = false } = {}) {
  return new Promise((resolve) => {
    const el = $('journey'),
      hero = heroOf(),
      quick = reducedMotion();
    const open = travel ? fromI : toI;
    const floors = buildTower(open);
    $('mapTower').setAttribute(
      'aria-label',
      `Torre del viaje de ${hero.name}. Ciudad ${toI + 1} de 10: ${ZONES[toI].n}`,
    );
    $('towerHero').src = `heroes/${hero.id}-route.webp`;
    $('towerHero').alt = '';
    el.style.setProperty('--atlas-scene', cssUrl(`backgrounds/zone-${toI + 1}.webp`));
    $('mTag').textContent = `CIUDAD ${toI + 1} DE 10 · NIVEL ${toI * 10 + 1}`;
    $('mName').textContent = travel ? `Hasta pronto, ${ZONES[fromI].n}` : ZONES[toI].n;
    $('mSub').textContent = overview
      ? `Nivel actual ${S.run.level} de 100 · Umbral ${zoneStep(S.run.level)} de 10 en esta ciudad`
      : travel
        ? CHAPTERS[fromI].end
        : `Thyes, año ${WORLD.year} · Nivel ${S.run.level} de 100`;
    el.setAttribute('role', overview ? 'dialog' : 'status');
    if (overview) el.setAttribute('aria-modal', 'true');
    else el.removeAttribute('aria-modal');
    el.setAttribute('aria-labelledby', 'mName');
    $('mapClose').hidden = !overview;
    el.classList.remove('out', 'dive');
    el.classList.add('show');
    railTo(floors, open, false);
    Music.duck(0.35);
    let finished = false,
      timer = 0,
      climb = 0,
      ready = !travel;
    const end = () => {
      if (finished || !ready) return;
      finished = true;
      clearTimeout(timer);
      clearTimeout(climb);
      el.removeEventListener('pointerdown', end);
      el.removeEventListener('keydown', key);
      document.removeEventListener('keydown', key);
      el.classList.add('out');
      setTimeout(
        () => {
          el.classList.remove('show', 'out');
          $('mapClose').hidden = true;
          Music.duck(1);
          resolve();
        },
        quick ? 60 : 160,
      );
    };
    const key = (e) => {
      if (overview) {
        if (e.key === 'Escape') {
          e.preventDefault();
          end();
        } else if (e.key === 'Tab') {
          e.preventDefault();
          $('mapClose').focus();
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        end();
      }
    };
    if (!overview) {
      el.addEventListener('pointerdown', end);
      el.addEventListener('keydown', key);
    } else document.addEventListener('keydown', key);
    $('mapClose').onclick = end;
    if (overview) $('mapClose').focus();
    if (travel) {
      // 1) la ciudad que dejas se completa y la luz empieza a subir; 2) llega al piso nuevo, que se enciende.
      const arrive = () => {
        setFloor(floors[toI], 'current', toI);
        floors[toI].classList.add('arrived');
        $('mName').textContent = ZONES[toI].n;
        $('mSub').textContent = `${hero.name}: ${HERO_LORE[hero.id].quote}`;
        $('mName').parentElement.classList.remove('pop');
        void $('mName').offsetWidth;
        $('mName').parentElement.classList.add('pop');
        applyZone(toI);
        sfx.win();
        if (!quick)
          motes(
            0,
            0,
            46,
            ['#ffdb8f', '#fff3cf', '#fff', ZONES[toI].cc || '#ffdb8f'],
            5,
            floors[toI].getBoundingClientRect(),
          );
        ready = true;
        timer = setTimeout(end, quick ? 400 : HOLD_AFTER);
      };
      climb = setTimeout(
        () => {
          setFloor(floors[fromI], 'done', fromI);
          floors[fromI].classList.add('sealed');
          sfx.journey();
          railTo(floors, toI, !quick);
          climb = setTimeout(arrive, quick ? 0 : CLIMB_TIME);
        },
        quick ? 0 : CLIMB_START,
      );
    } else {
      applyZone(toI);
      if (!overview) {
        sfx.start();
        timer = setTimeout(end, quick ? 300 : 1200);
      }
    }
  });
}

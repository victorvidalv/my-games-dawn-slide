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
/* Mapa de zonas: se muestra al empezar un camino y al cambiar de zona (la llave roja viaja a la siguiente parada) */
/** Placa recortada a mano: rectángulo con cuatro radios distintos (como los paneles del menú). */
const blob = (x, y, w, h, [a, b, c, d]) =>
  `M${x + a} ${y}H${x + w - b}Q${x + w} ${y} ${x + w} ${y + b}V${y + h - c}Q${x + w} ${y + h} ${x + w - c} ${y + h}H${x + d}Q${x} ${y + h} ${x} ${y + h - d}V${y + a}Q${x} ${y} ${x + a} ${y}Z`;
const RADII = [
  [22, 14, 20, 12],
  [13, 20, 12, 19],
  [18, 12, 22, 15],
];
/* Colores del mapa (texto claro sobre tinta oscura: contraste ≥ 7:1 incluso sobre la ilustración más clara) */
const INK = '#150e0c',
  GOLD = '#f2c45c',
  CREAM = '#f6e6bd';
export function showMap(fromI, toI, { travel = false, overview = false } = {}) {
  return new Promise((resolve) => {
    const el = $('journey'),
      svg = $('mapSvg'),
      NS = 'http://www.w3.org/2000/svg';
    const wide = innerWidth / innerHeight > 1.3,
      W = wide ? 1000 : 480,
      H = wide ? 390 : 650;
    const mk = (tag, attrs, parent = svg) => {
      const n = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      parent.appendChild(n);
      return n;
    };
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `El atlas de ${heroOf().name}. Destino: ${ZONES[toI].n}`);
    const pts = ZONES.map((_, i) =>
      wide
        ? [100 + (i < 5 ? i : 9 - i) * 200, i < 5 ? 100 : 285]
        : [i % 4 < 2 ? 118 : 362, 60 + Math.floor(i / 2) * 130],
    );
    // Serpentine order: two cities per row on a hand-drawn constellation road.
    if (!wide)
      pts.forEach((p, i) => (p[0] = Math.floor(i / 2) % 2 === 0 ? (i % 2 === 0 ? 118 : 362) : i % 2 === 0 ? 362 : 118));
    const defs = mk('defs', {});
    const grad = mk('linearGradient', { id: 'atlasShade', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    mk('stop', { offset: 0, 'stop-color': INK, 'stop-opacity': 0 }, grad);
    mk('stop', { offset: 1, 'stop-color': INK, 'stop-opacity': 0.55 }, grad);
    const hatch = mk(
      'pattern',
      { id: 'atlasHatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(28)' },
      defs,
    );
    mk('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: '#fff', 'stroke-opacity': 0.06, 'stroke-width': 1 }, hatch);
    const open = travel ? fromI : toI,
      paths = [];
    mk('path', {
      d: blob(2, 2, W - 4, H - 4, [34, 28, 36, 26]),
      fill: '#15222b',
      'fill-opacity': 0.94,
      stroke: INK,
      'stroke-width': 5,
    });
    mk('path', {
      d: blob(2, 2, W - 4, H - 4, [34, 28, 36, 26]),
      fill: 'url(#atlasHatch)',
      stroke: GOLD,
      'stroke-opacity': 0.75,
      'stroke-width': 2,
    });
    mk('path', {
      d: blob(12, 12, W - 24, H - 24, [28, 22, 30, 20]),
      fill: 'none',
      stroke: GOLD,
      'stroke-opacity': 0.3,
      'stroke-width': 1.2,
      'stroke-dasharray': '2 6',
    });
    for (let i = 0; i < 45; i++)
      mk('circle', {
        cx: 18 + ((i * 137) % (W - 36)),
        cy: 16 + ((i * 83) % (H - 32)),
        r: i % 5 === 0 ? 2 : 1,
        fill: '#f5d99b',
        opacity: i % 3 === 0 ? 0.5 : 0.15,
      });
    for (let i = 0; i < 9; i++) {
      const [x, y] = pts[i],
        [nx, ny] = pts[i + 1],
        mx = (x + nx) / 2,
        my = (y + ny) / 2;
      const same = y === ny,
        c1 = wide ? (same ? [mx, y - 25] : [x + 95, my]) : same ? [mx, y + 35] : [x + (x < 240 ? -55 : 55), my],
        c2 = wide ? (same ? [mx, ny + 25] : [nx + 95, my]) : same ? [mx, ny + 35] : [nx + (nx < 240 ? -55 : 55), my];
      const d = `M${x} ${y} C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${nx} ${ny}`;
      mk('path', { d, fill: 'none', stroke: INK, 'stroke-width': 16, 'stroke-linecap': 'round' });
      mk('path', {
        d,
        fill: 'none',
        stroke: i < open ? '#7a5a24' : '#22343f',
        'stroke-width': 11,
        'stroke-linecap': 'round',
      });
      const road = mk('path', {
        d,
        fill: 'none',
        stroke: i < open ? GOLD : '#9fb4b0',
        'stroke-opacity': i < open ? 1 : 0.7,
        'stroke-width': i < open ? 4 : 3,
        'stroke-dasharray': i < open ? 'none' : '2 9',
        'stroke-linecap': 'round',
      });
      paths.push(road);
      const lx = (x + 3 * c1[0] + 3 * c2[0] + nx) / 8,
        ly = (y + 3 * c1[1] + 3 * c2[1] + ny) / 8; // farol a mitad de camino: se enciende al recorrerlo
      mk('circle', { cx: lx, cy: ly, r: 6, fill: INK, stroke: i < open ? GOLD : '#9fb4b0', 'stroke-width': 2 });
      mk('circle', { cx: lx, cy: ly, r: 2.6, fill: i < open ? GOLD : '#3d5560' });
    }
    const cards = ZONES.map((z, i) => {
      const [x, y] = pts[i],
        w = wide ? 162 : 176,
        h = 94,
        id = 'cityCrop' + i,
        rad = RADII[i % 3],
        accent = i === open ? '#ffdb8f' : i < open ? z.cc || '#58b3b8' : '#8fa6a6';
      const clip = mk('clipPath', { id }, defs);
      mk('path', { d: blob(x - w / 2, y - h / 2, w, h, rad) }, clip);
      const g = mk('g', {
        class: 'atlas-city' + (i === open ? ' current' : '') + (i > open ? ' undiscovered' : ''),
        style: `--i:${i}`,
      });
      mk(
        'path',
        {
          class: 'plaque',
          d: blob(
            x - w / 2 - 4,
            y - h / 2 - 4,
            w + 8,
            h + 8,
            rad.map((r) => r + 3),
          ),
          fill: INK,
          stroke: accent,
          'stroke-width': i === open ? 4 : 2.5,
        },
        g,
      );
      mk(
        'image',
        {
          href: `backgrounds/zone-${i + 1}.webp`,
          x: x - w / 2,
          y: y - h / 2,
          width: w,
          height: h,
          preserveAspectRatio: 'xMidYMid slice',
          'clip-path': `url(#${id})`,
          opacity: i > open ? 0.45 : 1,
        },
        g,
      );
      mk('path', { d: blob(x - w / 2, y - h / 2, w, h, rad), fill: 'url(#atlasShade)' }, g);
      mk(
        'path',
        {
          d: `M${x - w / 2} ${y + h / 2 - 40}H${x + w / 2}V${y + h / 2 - rad[2]}Q${x + w / 2} ${y + h / 2} ${x + w / 2 - rad[2]} ${y + h / 2}H${x - w / 2 + rad[3]}Q${x - w / 2} ${y + h / 2} ${x - w / 2} ${y + h / 2 - rad[3]}Z`,
          fill: INK,
          'fill-opacity': 0.9,
        },
        g,
      ); // cinta de tinta: el texto siempre se lee
      mk(
        'path',
        {
          d: `M${x - w / 2} ${y + h / 2 - 40}H${x + w / 2}`,
          stroke: accent,
          'stroke-width': 1.5,
          'stroke-opacity': 0.8,
        },
        g,
      );
      const label = mk(
        'text',
        {
          x,
          y: y + h / 2 - 23,
          'text-anchor': 'middle',
          fill: CREAM,
          'font-size': wide ? 12.5 : 13.5,
          'font-weight': 700,
          style: 'font-family:var(--font-title);letter-spacing:.04em',
        },
        g,
      );
      label.textContent = z.n;
      const sub = mk(
        'text',
        {
          x,
          y: y + h / 2 - 9,
          'text-anchor': 'middle',
          fill: i > open ? '#c9d6d2' : GOLD,
          'font-size': 9.5,
          'font-weight': 700,
          'letter-spacing': 1.2,
        },
        g,
      );
      sub.textContent = i < open ? 'COMPLETADA' : i === open ? 'ESTÁS AQUÍ' : `NIVELES ${i * 10 + 1}–${(i + 1) * 10}`;
      mk(
        'circle',
        { cx: x - w / 2 + 15, cy: y - h / 2 + 15, r: 11.5, fill: INK, stroke: accent, 'stroke-width': 1.8 },
        g,
      );
      const num = mk(
        'text',
        {
          x: x - w / 2 + 15,
          y: y - h / 2 + 19.5,
          'text-anchor': 'middle',
          fill: GOLD,
          'font-size': 11.5,
          'font-weight': 800,
        },
        g,
      );
      num.textContent = i < open ? '✓' : i + 1;
      mk(
        'circle',
        {
          cx: x + w / 2 - 15,
          cy: y - h / 2 + 15,
          r: 12,
          fill: INK,
          'fill-opacity': 0.92,
          stroke: accent,
          'stroke-width': 1.8,
        },
        g,
      );
      const emblem = mk(
        'text',
        {
          x: x + w / 2 - 15,
          y: y - h / 2 + 20,
          'text-anchor': 'middle',
          'font-size': 13,
          opacity: i > open ? 0.55 : 1,
        },
        g,
      );
      emblem.textContent = z.e;
      return g;
    });
    const hero = mk('g', { class: 'atlas-traveler' }),
      heroId = heroOf().id,
      still = `heroes/${heroId}-mapa.webp`;
    const art = mk(
      'image',
      { href: still, x: -24, y: -70, width: 48, height: 64, preserveAspectRatio: 'xMidYMax meet' },
      hero,
    );
    const place = (x, y) => hero.setAttribute('transform', `translate(${x} ${y - 27})`);
    place(...pts[open]);
    el.style.setProperty('--atlas-scene', cssUrl(`backgrounds/zone-${toI + 1}.webp`));
    $('mTag').textContent = travel
      ? `EL ATLAS DE ${heroOf().name.toUpperCase()} · UN NUEVO HORIZONTE`
      : `EL ATLAS DE ${heroOf().name.toUpperCase()} · CIUDAD ${toI + 1} DE 10`;
    $('mName').textContent = travel ? `Hasta pronto, ${ZONES[fromI].n}` : ZONES[toI].n;
    $('mSub').textContent = overview
      ? `Nivel actual ${S.run.level} de 100 · Umbral ${zoneStep(S.run.level)} de 10 en este reino`
      : travel
        ? CHAPTERS[fromI].end
        : `Thyes, año ${WORLD.year} · Nivel ${S.run.level} de 100 · Diez reinos, diez sellos`;
    el.setAttribute('role', overview ? 'dialog' : 'status');
    if (overview) el.setAttribute('aria-modal', 'true');
    else el.removeAttribute('aria-modal');
    el.setAttribute('aria-labelledby', 'mName');
    $('mapClose').hidden = !overview;
    el.classList.remove('out');
    el.classList.add('show');
    Music.duck(0.35);
    let finished = false,
      frame = 0,
      timer = 0,
      ready = !travel;
    const end = () => {
      if (finished || !ready) return;
      finished = true;
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      el.removeEventListener('pointerdown', end);
      el.removeEventListener('keydown', key);
      document.removeEventListener('keydown', key);
      const wrap = el.querySelector('.mapwrap'),
        slow = !overview && !matchMedia('(prefers-reduced-motion: reduce)').matches;
      wrap.style.transformOrigin = `${(pts[toI][0] / W) * 100}% ${(pts[toI][1] / H) * 100}%`;
      el.classList.toggle('dive', slow);
      el.classList.add('out');
      if (slow) sfx.whoosh(true);
      setTimeout(
        () => {
          el.classList.remove('show', 'out', 'dive');
          $('mapClose').hidden = true;
          Music.duck(1);
          resolve();
        },
        slow ? 380 : 150,
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
    el.removeAttribute('tabindex');
    $('mapClose').onclick = end;
    if (overview) $('mapClose').focus();
    if (travel) {
      sfx.journey();
      const path = paths[fromI],
        length = path.getTotalLength(),
        t0 = performance.now(),
        duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 3200;
      if (duration) art.setAttribute('href', `heroes/${heroId}-caminando.gif`);
      path.classList.add('road-walk');
      const x0 = pts[fromI][0],
        early = path.getPointAtLength(length * 0.2).x;
      let faceX = x0,
        face = Math.abs(early - x0) > 6 ? (early > x0 ? 1 : -1) : pts[toI][0] >= x0 ? 1 : -1; // los sprites miran a la DERECHA; a la izquierda se invierten
      art.setAttribute('transform', `scale(${face} 1)`);
      function step(t) {
        const k = duration ? Math.min(1, (t - t0) / duration) : 1,
          e = k * k * (3 - 2 * k),
          p = path.getPointAtLength(length * e);
        place(p.x, p.y);
        if (Math.abs(p.x - faceX) > 6) {
          const f = p.x > faceX ? 1 : -1;
          if (f !== face) {
            face = f;
            art.setAttribute('transform', `scale(${f} 1)`);
          }
          faceX = p.x;
        } // 6 px de margen: sin parpadeos en las curvas
        if (k < 1) frame = requestAnimationFrame(step);
        else {
          art.setAttribute('href', still);
          path.classList.remove('road-walk');
          path.setAttribute('stroke', GOLD);
          path.setAttribute('stroke-dasharray', 'none');
          path.setAttribute('stroke-opacity', 1);
          path.setAttribute('stroke-width', 4);
          cards[toI].classList.add('arrived');
          if (duration) {
            const r = cards[toI].getBoundingClientRect();
            motes(0, 0, 46, ['#ffdb8f', '#fff3cf', '#fff'], 4, r);
            sfx.routePick();
          }
          applyZone(toI);
          cards[fromI].classList.remove('current');
          cards[fromI].querySelectorAll('text')[1].textContent = 'COMPLETADA';
          cards[fromI].querySelector('.plaque').setAttribute('stroke', ZONES[fromI].cc || '#58b3b8');
          cards[toI].classList.remove('undiscovered');
          cards[toI].classList.add('current');
          const pic = cards[toI].querySelector('image');
          pic.setAttribute('opacity', 1);
          cards[toI].querySelector('.plaque').setAttribute('stroke', '#ffdb8f');
          const texts = cards[toI].querySelectorAll('text');
          texts[1].textContent = 'ESTÁS AQUÍ';
          $('mName').textContent = ZONES[toI].n;
          $('mSub').textContent = `${heroOf().name}: ${HERO_LORE[heroOf().id].quote}`;
          ready = true;
          timer = setTimeout(end, matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 1600);
          sfx.win();
        }
      }
      frame = requestAnimationFrame(step);
    } else {
      applyZone(toI);
      if (!overview) {
        sfx.start();
        timer = setTimeout(end, matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 2300);
      }
    }
  });
}

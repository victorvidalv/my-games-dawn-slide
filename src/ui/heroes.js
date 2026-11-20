import { Music, setTensionFx } from '../audio/music.js';
import { $, cssUrl } from '../dom.js';
import { saveRun } from '../game/session.js';
import { HEROES, canHint, bonusTurns } from '../game/heroes.js';
import { bossRetriesLeft, reviveCost, reviveShare } from '../game/shop.js';
import { S, haltBoard, heroOf, pathOf, persist, setBusy, store } from '../state.js';
import { acceptRescue } from '../game/run-logic.js';
import { boardEl, layout, updateHud } from './board.js';
import { syncBossTimer } from './boss-phase.js';
import { heroArt } from './story.js';
import { icon } from './icons.js';
import { playReviveEffect } from './turns.js';
import { powerState } from '../game/powers.js';
import { startOptions } from '../game/starts.js';
import { RELICS } from '../game/relics.js';
import { heroicPath, heroicHintsLeft, powerFactor } from '../game/routes.js';
import { bossCapFor } from '../game/bosses.js';
import { preloadAwakening } from './power-art.js';
import { numLocale } from '../i18n.js';
export function syncHero(id = S.run?.hero) {
  const h = heroOf(id);
  document.documentElement.style.setProperty('--hero-color', h.color);
  if (h.id !== 'lia' && !matchMedia('(prefers-reduced-motion: reduce)').matches) preloadAwakening(h.id).catch(() => {});
}
export function chooseHero(start, mode) {
  return new Promise((resolve) => {
    const modal = $('heroSelect'),
      cards = $('heroCards'),
      relics = $('heroRelics');
    let selected = heroOf(store.heroChoice || S.run?.hero).id;
    const selectedRelic = RELICS.find(({ id }) => id === S.run?.relic) ?? RELICS[0];
    relics.innerHTML = RELICS.map(
      (relic, i) =>
        `<label class="relic-option" style="--relic-x:${i * 50}%"><input type="radio" name="heroRelic" value="${relic.id}" ${relic.id === selectedRelic.id ? 'checked' : ''}><span class="relic-card"><span class="relic-art" aria-hidden="true"></span><span><b>${relic.name}</b><small>${relic.label}</small></span></span></label>`,
    ).join('');
    const reached = store.paths['c' + start]?.level || 0,
      options = startOptions(reached);
    let from = 1;
    const renderStarts = () => {
      const box = $('heroStarts');
      box.innerHTML = options
        .map(
          (o) =>
            `<button type="button" class="start-chip${o.level === from ? ' selected' : ''}${o.unlocked ? '' : ' locked'}" role="radio" aria-checked="${o.level === from}" data-level="${o.level}" ${o.unlocked ? '' : 'aria-disabled="true"'} aria-label="${o.level === 1 ? 'Desde el principio' : o.unlocked ? 'Empezar desde el nivel ' + o.level : 'Nivel ' + o.level + ' bloqueado: llega a él en este camino para desbloquearlo'}">${o.unlocked ? '' : icon('lock')}<b>${o.level === 1 ? 'Inicio' : 'Nivel ' + o.level}</b><small>${o.level === 1 ? 'Nivel 1' : o.unlocked ? 'Desbloqueado' : 'Alcanza el ' + o.level}</small></button>`,
        )
        .join('');
      const next = options.find((o) => !o.unlocked);
      $('heroStartNote').textContent = next
        ? `Llega al nivel ${next.level} en este camino para poder empezar desde ahí.`
        : 'Elige desde dónde quieres empezar.';
      box.querySelectorAll('button').forEach(
        (b) =>
          (b.onclick = () => {
            const o = options.find((x) => x.level === +b.dataset.level);
            if (!o.unlocked) {
              b.classList.remove('shake');
              void b.offsetWidth;
              b.classList.add('shake');
              $('heroStartNote').textContent = `Alcanza el nivel ${o.level} en este camino para desbloquearlo.`;
              return;
            }
            from = o.level;
            renderStarts();
            $('heroStarts').querySelector(`[data-level="${from}"]`).focus();
            $('heroConfirm').textContent = from === 1 ? 'Comenzar aventura ➜' : `Comenzar desde el nivel ${from} ➜`;
          }),
      );
    };
    $('heroPath').textContent = `${pathOf(start).n.toUpperCase()} · AVENTURA`;
    const render = () => {
      const h = heroOf(selected);
      modal.style.setProperty('--chosen', h.color);
      modal.style.setProperty('--hero-scene', cssUrl(heroArt(h.id, 'select')));
      cards.innerHTML = HEROES.map(
        (v) =>
          `<button class="hero-choice ${v.id === selected ? 'selected' : ''}" role="radio" aria-checked="${v.id === selected}" tabindex="${v.id === selected ? 0 : -1}" data-hero="${v.id}" style="--accent:${v.color}" aria-label="${v.name}: ${v.short}"><img src="${heroArt(v.id, v.id === selected ? 'ready' : 'select')}" alt="${v.name}, ${v.role}" width="640" height="853"><span class="hero-choice-name">${v.name}</span><span class="hero-check" aria-hidden="true">✓</span></button>`,
      ).join('');
      $('heroPowerIcon').innerHTML = icon(h.icon);
      $('heroPowerShort').textContent = h.id === 'lia' ? 'Más turnos' : h.power;
      const path = heroicPath(h.id);
      $('heroRouteIcon').innerHTML = icon(path.icon);
      $('heroRouteName').textContent = path.name;
      $('heroConfirm').textContent = from === 1 ? 'Comenzar aventura ➜' : `Comenzar desde el nivel ${from} ➜`;
      renderStarts();
      cards.querySelectorAll('button').forEach(
        (b) =>
          (b.onclick = () => {
            selected = b.dataset.hero;
            render();
            cards.querySelector(`[data-hero="${selected}"]`).focus();
          }),
      );
    };
    const close = (value) => {
      modal.classList.remove('show');
      modal.removeEventListener('keydown', keyboard);
      resolve(value);
    };
    const keyboard = (e) => {
      if (
        ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key) &&
        cards.contains(document.activeElement)
      ) {
        e.preventDefault();
        const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
        selected = HEROES[(HEROES.findIndex((h) => h.id === selected) + delta + 3) % 3].id;
        render();
        cards.querySelector(`[data-hero="${selected}"]`).focus();
      } else if (e.key === 'Escape') close(null);
      else if (e.key === 'Tab') {
        const bs = [...modal.querySelectorAll('button')].filter((b) => b.tabIndex >= 0);
        if (e.shiftKey && document.activeElement === bs[0]) {
          e.preventDefault();
          bs.at(-1).focus();
        } else if (!e.shiftKey && document.activeElement === bs.at(-1)) {
          e.preventDefault();
          bs[0].focus();
        }
      }
    };
    $('heroCancel').onclick = () => close(null);
    $('heroConfirm').onclick = () => {
      store.heroChoice = selected;
      persist();
      close({ hero: selected, from, relic: relics.querySelector('input:checked').value });
    };
    render();
    modal.classList.add('show');
    Music.scene('heroes');
    modal.addEventListener('keydown', keyboard);
    cards.querySelector('[aria-checked=true]').focus();
  });
}
export function updateHeroHud() {
  if (!S.run || !S.G) return;
  const h = heroOf(),
    prac = S.run.mode === 'p';
  $('heroHudImg').src = `heroes/${h.id}.webp`;
  $('heroHudImg').alt = h.name;
  $('heroHudName').textContent = h.name;
  const status = powerState(S.run, S.G);
  $('heroHudPower').textContent =
    h.id === 'lia'
      ? `+${bonusTurns('lia', S.G.opt, bossCapFor(S.G.n), powerFactor(S.run), S.run.start)} turnos de reserva`
      : status.reason;
  const free = heroicHintsLeft(S.run, S.G.n);
  $('hintN').textContent = prac ? '∞' : free ? `${free} gratis` : S.run.hints;
  $('bHint').setAttribute('aria-label', `Pista. ${free} gratis en este tablero y ${S.run.hints} en reserva.`);
  $('bHint').disabled = S.busy || !canHint(S.run, S.run.mode, S.G.n);
  $('bUndo').hidden = true;
  const button = $('bPower');
  button.hidden = h.id === 'lia';
  button.disabled = S.busy || !status.ok;
  button.dataset.hero = h.id;
  $('powerIcon').innerHTML = icon(h.id === 'jean' ? 'clock' : 'stars');
  $('powerName').textContent = h.power;
  $('powerNote').textContent = status.reason;
  button.setAttribute('aria-label', `${h.power}. ${status.reason}`);
}
/** Repite el tablero desde cero después de una derrota. */
export function showRescue(kind = S.run?.rescue?.kind || 'lia') {
  const revive = kind === 'revive',
    daily = kind === 'daily',
    boss = kind === 'boss',
    learn = kind === 'learn' || daily || boss,
    h = heroOf();
  haltBoard();
  boardEl.classList.add('board-lock');
  setTensionFx(0, false);
  Music.duck(0.3);
  $('rescueHero').src = heroArt(revive || learn ? h.id : 'lia', learn ? 'story' : 'defeat');
  $('rescueHero').hidden = daily;
  $('rescueHero').alt = learn ? h.name : revive ? `${h.name} te da otra oportunidad` : 'Lía protege la aventura';
  $('rescueIcon').innerHTML = icon(learn ? 'undo' : revive ? 'flame' : 'heart');
  if (boss) {
    const left = bossRetriesLeft(S.run, S.G.n);
    $('rescueTag').textContent = 'JEFE · REINTENTO GRATIS';
    $('rescueTitle').textContent = S.run.rescue.why === 'time' ? 'Se acabó el tiempo' : 'Te quedaste sin movimientos';
    $('rescueText').textContent =
      left === 1
        ? 'Después de este reintento te quedará uno gratis.'
        : 'Este es tu último reintento gratis contra este jefe.';
  } else {
    $('rescueTag').textContent = daily
      ? 'RETO DIARIO · SIN PENALIZACIÓN'
      : learn
        ? 'PRIMEROS PASOS · SIN PENALIZACIÓN'
        : revive
          ? 'REVIVIR · COMPRADO CON TUS PUNTOS'
          : 'PODER DE LÍA · UNA VEZ POR PARTIDA';
    $('rescueTitle').textContent = learn
      ? 'Te quedaste sin movimientos'
      : revive
        ? '¡Otra oportunidad!'
        : 'La aventura sigue';
    $('rescueText').textContent = daily
      ? 'Puedes repetir este tablero. Se conservan los que ya resolviste.'
      : learn
        ? 'En los primeros niveles puedes repetir el tablero sin gastar puntos ni pistas. Fíjate en el límite antes de mover.'
        : revive
          ? `Pagaste por revivir. Repites este mismo tablero desde cero y conservas tus puntos y tus pistas.${S.run.revive > 0 ? ` Te queda ${S.run.revive} revivir guardado.` : ''}`
          : 'Lía te da una segunda oportunidad. Repites este mismo tablero desde cero y conservas tus puntos y tus pistas.';
  }
  $('rescueContinue').textContent = boss
    ? 'Reintentar gratis'
    : learn
      ? 'Repetir tablero'
      : revive
        ? 'Revivir'
        : 'Activar poder';
  $('rescue').classList.add('show');
  $('rescueContinue').focus();
  $('rescueContinue').onclick = () => {
    if (!S.run?.rescue) return;
    acceptRescue(S.run, S.G);
    saveRun();
    $('rescue').classList.remove('show');
    boardEl.classList.remove('board-lock');
    setBusy(false);
    $('bUndo').disabled = true;
    layout();
    updateHud();
    syncBossTimer();
    Music.duck(1);
    playReviveEffect(learn ? '¡OTRA VEZ!' : revive ? '¡RENACER!' : '¡PODER DE LÍA!', !revive);
    $('msg').textContent = learn
      ? 'El tablero empieza de nuevo. Piensa cada movimiento.'
      : revive
        ? 'Revivir usado. ¡Este tablero empieza de nuevo!'
        : 'Poder de Lía activado. ¡Este tablero empieza de nuevo!';
  };
}

/** Oferta de la Guardiana del Amanecer tras perder. */
export function showReviveOffer() {
  const modal = $('reviveOffer'),
    accept = $('reviveAccept'),
    end = $('reviveEnd'),
    now = S.run?.score || 0,
    cost = reviveCost(now, S.run),
    pct = Math.round(reviveShare(S.run) * 100),
    after = Math.max(0, now - cost),
    fmt = (n) => n.toLocaleString(numLocale());
  // Sus ilustraciones solo se descargan la primera vez que aparece (no al abrir el juego)
  modal.querySelectorAll('img[data-src]').forEach((img) => {
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
  });
  haltBoard();
  boardEl.classList.add('board-lock');
  setTensionFx(0, false);
  Music.duck(0.3);
  modal.querySelector('.revive-rule').textContent = `Repite el tablero desde cero a cambio del ${pct} % de tus puntos.`;
  $('reviveCost').previousElementSibling.textContent = `PIERDES (−${pct} %)`;
  $('reviveNow').textContent = fmt(now);
  $('reviveCost').textContent = `−${fmt(cost)}`;
  $('reviveAfter').textContent = fmt(after);
  return new Promise((resolve) => {
    let picked = false;
    const pick = (yes) => {
      if (picked) return;
      picked = true;
      modal.classList.remove('show');
      modal.removeEventListener('keydown', onKey);
      resolve(yes);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') pick(false);
      if (e.key === 'Tab') {
        e.preventDefault();
        (document.activeElement === accept ? end : accept).focus();
      }
    };
    accept.onclick = () => pick(true);
    end.onclick = () => pick(false);
    modal.addEventListener('keydown', onKey);
    modal.classList.add('show');
    accept.focus();
  });
}

import { Music, setTensionFx } from '../audio/music.js';
import { $, cssUrl } from '../dom.js';
import { saveRun } from '../game/session.js';
import { HEROES, canHint, bonusTurns } from '../game/heroes.js';
import { reviveCost, reviveShare } from '../game/shop.js';
import { S, haltBoard, heroOf, pathOf, persist, setBusy, store } from '../state.js';
import { acceptRescue } from '../game/run-logic.js';
import { boardEl, layout, updateHud } from './board.js';
import { outfitImg } from './story.js';
import { icon } from './icons.js';
import { playReviveEffect } from './turns.js';
import { powerState } from '../game/powers.js';
import { RELICS } from '../game/relics.js';
import { fateBlocks } from '../game/fate.js';
import { numLocale } from '../i18n.js';
const HERO_POWER_TAG = { lia: '+ turnos', jean: 'Rebobinar', van: 'Ver destino' };
export function syncHero(id = S.run?.hero) {
  const h = heroOf(id);
  document.documentElement.style.setProperty('--hero-color', h.color);
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
        `<label class="relic-option" style="--relic-x:${i * 50}%"><input type="radio" name="heroRelic" value="${relic.id}" ${relic.id === selectedRelic.id ? 'checked' : ''}><span class="relic-card"><span class="relic-art" aria-hidden="true"></span><span><b>${relic.name}</b><small>${relic.label}</small><em class="relic-tip">${relic.tip}</em></span></span></label>`,
    ).join('');
    $('heroPath').textContent = `${pathOf(start).n.toUpperCase()} · AVENTURA`;
    const render = () => {
      const h = heroOf(selected);
      modal.style.setProperty('--chosen', h.color);
      modal.style.setProperty('--hero-scene', cssUrl(outfitImg(h.id, 'adv')));
      cards.innerHTML = HEROES.map((v) => {
        const powerTag = HERO_POWER_TAG[v.id] || v.power;
        return `<button class="hero-choice ${v.id === selected ? 'selected' : ''}" role="radio" aria-checked="${v.id === selected}" tabindex="${v.id === selected ? 0 : -1}" data-hero="${v.id}" style="--accent:${v.color}" aria-label="${v.name}: ${powerTag}"><img src="${v.id === selected ? outfitImg(v.id, 'act') : outfitImg(v.id, 'sel')}" alt="${v.name}, ${v.role}" width="640" height="853"><span class="hero-choice-name"><b>${v.name}</b><small class="hero-choice-power">${powerTag}</small></span><span class="hero-check" aria-hidden="true">✓</span></button>`;
      }).join('');
      $('heroConfirm').textContent = 'Comenzar aventura ➜';
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
      close({ hero: selected, relic: relics.querySelector('input:checked').value });
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
  $('heroHudImg').src = outfitImg(h.id, 'sel');
  $('heroHudImg').alt = h.name;
  $('heroHudName').textContent = h.name;
  const status = powerState(S.run, S.G);
  $('heroHudPower').textContent =
    h.id === 'lia'
      ? `+${bonusTurns('lia', S.G.opt, S.run.start, fateBlocks(S.run, 'power'))} turnos de reserva`
      : status.reason;
  const hintsBlocked = fateBlocks(S.run, 'hints');
  $('hintN').textContent = prac ? '∞' : hintsBlocked ? '✕' : S.run.hints;
  $('bHint').setAttribute(
    'aria-label',
    hintsBlocked ? 'Pistas bloqueadas por tu pacto Temerario.' : `Pista. ${S.run.hints} en reserva.`,
  );
  $('bHint').disabled = S.busy || !canHint(S.run, S.run.mode);
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
    learn = kind === 'learn' || daily,
    h = heroOf();
  haltBoard();
  boardEl.classList.add('board-lock');
  setTensionFx(0, false);
  Music.duck(0.3);
  $('rescueHero').src = outfitImg(revive || learn ? h.id : 'lia', learn ? 'adv' : 'act');
  $('rescueHero').hidden = daily;
  $('rescueHero').alt = learn ? h.name : revive ? `${h.name} te da otra oportunidad` : 'Lía protege la aventura';
  $('rescueIcon').innerHTML = icon(learn ? 'undo' : revive ? 'flame' : 'heart');
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
  $('rescueContinue').textContent = learn ? 'Repetir tablero' : revive ? 'Revivir' : 'Activar poder';
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

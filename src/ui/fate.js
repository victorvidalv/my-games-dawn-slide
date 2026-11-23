/* ============================ Cartas del destino (vista) ============================
 * · showFateDialog: al cerrar cada ciudad se reparten 3 cartas sobre el paisaje de la ciudad siguiente y se elige una.
 * · syncFateHud: botón del HUD con las cartas activas (cuántas y sus colores).
 * · openFatePanel: panel con cada carta activa y lo que suman todas juntas.
 * Las reglas viven en `game/fate.js`; aquí solo se pinta.
 */
import { Music } from '../audio/music.js';
import { sfx } from '../audio/sound.js';
import { LORE_PORTRAITS, WORLD, lorePortraitSrc } from '../data/lore.js';
import { ZONES } from '../data/zones.js';
import { $ } from '../dom.js';
import { FATE_CARDS, FATE_PICKS, STREAK_TURNS_EVERY, fateMuted, fateSummary, usesFate } from '../game/fate.js';
import { numLocale } from '../i18n.js';
import { S, holdBusy } from '../state.js';
import { fateArt } from './fate-art.js';
import { burst } from './fx.js';
import { outfitImg, storyFor } from './story.js';
import { wipeIn, wipeOut } from './transitions.js';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n) => n.toLocaleString(numLocale());
const pct = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${fmt(Math.round(Math.abs(x) * 100))} %`;
const KIND_NAME = { blessing: 'Bendición', pact: 'Pacto' };

/** Número de la carta en el mazo (1..31): se imprime en la esquina, como en una baraja. */
const numberOf = (card) => FATE_CARDS.indexOf(card) + 1;

/** Una carta completa (marco, emblema, nombre, efecto y costo). `muted`: un Pacto tuyo la deja sin efecto. */
export function fateCardHtml(card, { muted = false, tag = 'span', attrs = '', index = 0 } = {}) {
  const [a, b] = card.hue;
  return `<${tag} class="fate-card is-${card.kind}${muted ? ' is-muted' : ''}" data-card="${card.id}" style="--fa:${a};--fb:${b};--i:${index}" ${attrs}>
    <span class="fate-face">
      <span class="fate-corner" aria-hidden="true">${numberOf(card)}</span>
      <span class="fate-kind">${KIND_NAME[card.kind]}</span>
      <span class="fate-emblem">${fateArt(card)}</span>
      <span class="fate-body">
        <b class="fate-name">${card.name}</b>
        <span class="fate-gain">${card.gain}</span>
        ${card.cost ? `<span class="fate-cost">${card.cost}</span>` : ''}
        ${muted ? '<span class="fate-muted-note">Sin efecto por tu Pacto</span>' : ''}
      </span>
    </span>
  </${tag}>`;
}

/** Versión compacta de una carta ya elegida: emblema, nombre y efecto (y costo si es Pacto). */
function fateMiniHtml(card, muted = false) {
  return `<li class="fate-mini is-${card.kind}${muted ? ' is-muted' : ''}" style="--fa:${card.hue[0]};--fb:${card.hue[1]}">
    <span class="fate-mini-art">${fateArt(card)}</span>
    <span class="fate-mini-copy"><b>${card.name}</b><small>${card.gain}</small>${card.cost ? `<em>${card.cost}</em>` : ''}${muted ? '<i class="fate-mini-muted">Sin efecto por tu Pacto</i>' : ''}</span>
  </li>`;
}

/** Las cartas que ya tienes y lo que suman, sobre la oferta: así se decide viendo el destino acumulado. */
function fillOwned(run) {
  const summary = fateSummary(run, null);
  $('fateOwned').hidden = !summary.cards.length;
  $('fateOwned').open = false; // plegado: solo la tira de emblemas; al tocarlo se ven los efectos
  if (!summary.cards.length) return;
  $('fateOwnedIcons').innerHTML = summary.cards
    .map(
      (c) =>
        `<i class="${fateMuted(run, c.id) ? 'is-muted' : ''}" style="--fa:${c.hue[0]};--fb:${c.hue[1]}">${fateArt(c)}</i>`,
    )
    .join('');
  $('fateOwnedTitle').textContent = `Tus cartas · ${summary.cards.length}`;
  $('fateOwnedTotals').innerHTML = totalsHtml(summary);
  $('fateOwnedList').innerHTML = summary.cards.map((c) => fateMiniHtml(c, fateMuted(run, c.id))).join('');
}

/* ---------- HUD ---------- */
/** Muestra u oculta el botón de cartas activas y pinta su pila (los colores de las 3 últimas). */
export function syncFateHud() {
  const button = $('bFate');
  if (!button) return;
  const run = S.run;
  const cards = usesFate(run) ? fateSummary(run, S.G).cards : [];
  button.hidden = !cards.length;
  if (!cards.length) return;
  $('fateCount').textContent = cards.length;
  $('fateStack').innerHTML = cards
    .slice(-3)
    .map((c) => `<i style="--fa:${c.hue[0]};--fb:${c.hue[1]}"></i>`)
    .join('');
  button.setAttribute('aria-label', `Cartas del destino activas: ${cards.length} de ${FATE_PICKS}`);
}

/** Lo que suman todas las cartas, en chips cortos. */
function totalsHtml(summary) {
  const t = summary.totals;
  const chips = [];
  if (summary.points) chips.push(['points', `Puntos ${pct(summary.points)}`]);
  if (summary.turns)
    chips.push(['turns', `Turnos ${summary.turns > 0 ? '+' : '−'}${Math.abs(summary.turns)} por tablero`]);
  if (t.heavyIce) chips.push(['turns', `+${t.heavyIce} turnos con pesadas o hielo`]);
  if (t.curseTurns) chips.push(['turns', `+${t.curseTurns} turno en maleficios`]);
  if (t.streakTurns) chips.push(['turns', `+1 turno cada ${STREAK_TURNS_EVERY} de racha`]);
  if (t.perfectHints) chips.push(['good', 'Pista por Perfecto']);
  if (t.purePoints) chips.push(['points', `Sin ayuda ${pct(t.purePoints)}`]);
  if (t.streakKeep) chips.push(['good', 'La racha no se pierde entera']);
  if (t.perfect) chips.push(['points', `Perfecto ${pct(t.perfect)}`]);
  if (t.streakCap) chips.push(['points', `Racha hasta ×${fmt(1 + t.streakCap / 10)}`]);
  if (t.cursePoints) chips.push(['points', `Maleficios ${pct(t.cursePoints)}`]);
  if (t.finalPoints) chips.push(['points', `Tramo final ${pct(t.finalPoints)}`]);
  if (t.revives) chips.push(['good', `+${t.revives} revivir`]);
  if (t.noPower) chips.push(['bad', 'Sin poder del héroe']);
  if (t.noHints) chips.push(['bad', 'Sin pistas']);
  if (t.perfectStreak) chips.push(['bad', 'Racha solo con Perfecto']);
  return chips.map(([kind, text]) => `<span class="fate-chip is-${kind}">${text}</span>`).join('');
}

/** Panel de cartas activas (botón del HUD). Pausa el tablero mientras está abierto. */
function openFatePanel() {
  const run = S.run;
  if (!usesFate(run) || S.busy) return;
  const release = holdBusy();
  const summary = fateSummary(run, S.G);
  $('fatePanelTitle').textContent = `Tu destino · ${summary.cards.length} de ${FATE_PICKS}`;
  $('fateTotals').innerHTML = totalsHtml(summary);
  $('fateHand').innerHTML = summary.cards.map((c) => fateMiniHtml(c, fateMuted(run, c.id))).join('');
  $('fateEmpty').hidden = summary.cards.length > 0;
  const modal = $('fatePanel');
  const close = () => {
    modal.classList.remove('show');
    modal.removeEventListener('keydown', key);
    release();
    $('bFate').focus();
  };
  const key = (e) => {
    if (e.key === 'Escape') close();
  };
  $('fatePanelClose').onclick = close;
  modal.addEventListener('keydown', key);
  modal.classList.add('show');
  $('fatePanelClose').focus();
}
$('bFate')?.addEventListener('click', openFatePanel);

/* ---------- Elección al cerrar la ciudad ---------- */
/** Paisaje, héroe y texto de la ciudad a la que se llega (city = 1..9: la siguiente es ZONES[city]). */
function fillStage(hero, city) {
  const story = storyFor(hero.id, city * 3 + 1);
  $('travelScene').src = `backgrounds/zone-${city + 1}.webp`;
  $('travelHero').src = outfitImg(hero.id, 'adv');
  $('travelHero').alt = hero.name;
  const name = document.createElement('span');
  name.className = 'travel-city';
  name.textContent = ZONES[city].n;
  $('travelTitle').replaceChildren(name);
  $('travelInscription').textContent = `«${story.inscription}»`;
  $('fateChapter').textContent =
    `THYES · AÑO ${WORLD.year} · TRAMO ${city + 1} DE ${ZONES.length} · NIVELES ${city * 3 + 1}–${(city + 1) * 3}`;
  const portrait = LORE_PORTRAITS[city],
    chip = $('travelLoreChip'),
    line = story.vhorn ? `Vhorn: «${story.vhorn}»` : story.cityLines?.[0] || story.body || '';
  chip.hidden = !portrait && !line;
  if (portrait) {
    $('travelChipImg').src = lorePortraitSrc(portrait.id);
    $('travelChipImg').alt = portrait.name;
    const who = document.createElement('bdi'),
      caption = document.createElement('bdi');
    who.textContent = portrait.name;
    caption.textContent = portrait.caption;
    $('travelChipName').replaceChildren(who, ' · ', caption);
  } else {
    $('travelChipImg').removeAttribute('src');
    $('travelChipName').textContent = ZONES[city].n;
  }
  $('travelChipLine').textContent = line;
}

/** Lo que acaban de pagar las cartas que ya tenías (Brújula, Cosecha). */
function rewardsText(rewards) {
  const parts = [];
  if (rewards?.hints) parts.push(rewards.hints > 1 ? `+${rewards.hints} pistas` : '+1 pista');
  if (rewards?.score) parts.push(`+${fmt(rewards.score)} pts`);
  return parts.length ? `Tus cartas te dan: ${parts.join(' · ')}` : '';
}

/** Chispas con los colores de la carta elegida. */
function sparkle(el, card) {
  if (reduced()) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, 34, [card.hue[0], card.hue[1], '#fff', '#ffe38a'], 7);
}

/**
 * Diálogo de cartas: `cards` son las 3 de la oferta. `onChoose(id)` aplica la elección y la guarda (se llama una vez);
 * la promesa se resuelve cuando termina la animación de salida. `isActive()` evita aplicarla si la partida cambió.
 */
export function showFateDialog({ run, hero, city, cards, canReroll = false, rewards, onReroll, onChoose, isActive }) {
  return new Promise((resolve) => {
    const modal = $('travel'),
      box = $('fateOffer'),
      rerollBtn = $('fateReroll');
    let currentCards = cards;
    let buttons = [];
    fillStage(hero, city);
    $('fateAsk').textContent = `Carta del destino ${city} de ${FATE_PICKS}`;
    const reward = rewardsText(rewards);
    $('fateRewards').hidden = !reward;
    $('fateRewards').textContent = reward;
    fillOwned(run);
    let chosen = false;
    let dealtAt = Infinity;
    const choose = (button) => {
      // nada se elige hasta que las cartas están sobre la mesa (el toque que salta la entrada no cuenta)
      if (chosen || !isActive() || performance.now() - dealtAt < 350) return;
      chosen = true;
      if (rerollBtn) rerollBtn.hidden = true;
      const card = currentCards.find((c) => c.id === button.dataset.card);
      buttons.forEach((b) => {
        b.disabled = true;
        b.classList.add(b === button ? 'picked' : 'unpicked');
      });
      onChoose(card.id);
      modal.removeEventListener('keydown', key);
      (card.kind === 'pact' ? sfx.fatePact : sfx.fatePick)();
      sparkle(button, card);
      setTimeout(
        async () => {
          await wipeIn('gold');
          modal.classList.remove('show', 'fate-dealt');
          box.replaceChildren();
          wipeOut();
          resolve();
        },
        reduced() ? 0 : 1100,
      );
    };
    const renderCards = (list) => {
      currentCards = list;
      $('fateSub').textContent =
        list.length > 2
          ? 'Se suma a las que ya tienes. Las otras dos no vuelven.'
          : 'Se suma a las que ya tienes. La otra no vuelve.';
      box.innerHTML = list
        .map((card, i) =>
          fateCardHtml(card, {
            tag: 'button',
            muted: fateMuted(run, card.id),
            index: i,
            attrs: `type="button" aria-label="${card.name}. ${card.gain}.${card.cost ? ` Costo: ${card.cost}.` : ''}"`,
          }),
        )
        .join('');
      buttons = [...box.querySelectorAll('.fate-card')];
      buttons.forEach((b) => (b.onclick = () => choose(b)));
    };
    renderCards(cards);
    if (rerollBtn) {
      rerollBtn.hidden = !canReroll;
      rerollBtn.disabled = false;
      rerollBtn.onclick = () => {
        if (chosen || !isActive() || !onReroll || performance.now() - dealtAt < 350) return;
        const fresh = onReroll();
        if (!fresh?.length) return;
        rerollBtn.hidden = true;
        modal.classList.remove('fate-dealt');
        renderCards(fresh);
        sfx.fateDeal();
        setTimeout(
          () => {
            modal.classList.add('fate-dealt');
            dealtAt = performance.now();
            buttons[0]?.focus({ preventScroll: true });
          },
          reduced() ? 0 : 80,
        );
      };
    }
    const key = (e) => {
      const at = buttons.indexOf(document.activeElement);
      if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
        buttons[(Math.max(0, at) + d + buttons.length) % buttons.length].focus();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        buttons[(Math.max(0, at) + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
      }
    };
    // Entrada: «Ciudad completada» con una carta que brilla (≈1,4 s, se salta con un toque) y después se reparten las cartas.
    $('fateIntroCity').textContent = ZONES[city - 1].n;
    let dealt = false;
    const deal = () => {
      if (dealt) return;
      dealt = true;
      clearTimeout(introTimer);
      modal.removeEventListener('pointerdown', deal);
      modal.classList.remove('intro');
      sfx.fateDeal();
      setTimeout(
        () => {
          modal.classList.add('fate-dealt');
          dealtAt = performance.now();
        },
        reduced() ? 0 : 260,
      );
      buttons[0]?.focus({ preventScroll: true });
    };
    let introTimer = 0;
    wipeIn('gold').then(() => {
      modal.classList.add('show', 'intro');
      modal.addEventListener('keydown', key);
      modal.addEventListener('pointerdown', deal);
      Music.scene('fate');
      sfx.routePick();
      introTimer = setTimeout(deal, reduced() ? 0 : 1400);
      wipeOut();
    });
  });
}

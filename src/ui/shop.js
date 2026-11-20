import { sfx } from '../audio/sound.js';
import { $, cssUrl } from '../dom.js';
import { shopPersona } from '../game/shop-personas.js';
import { MERCHANT_LINES, SHOP_NOTES } from '../data/merchant.js';
import { SHOP_ITEMS, availability, buy, extraTurns, itemById, priceOf } from '../game/shop.js';
import { saveRun, skipLevel } from '../game/session.js';
import { S, holdBusy } from '../state.js';
import { shopDiscount } from '../game/routes.js';
import { layout, recLine, updateHud } from './board.js';
import { updateHeroHud } from './heroes.js';
import { ask } from './menu.js';
import { icon } from './icons.js';
import { playBuyEffect, playRewindEffect } from './turns.js';
import { numLocale } from '../i18n.js';

const fmt = (n) => n.toLocaleString(numLocale());
/** Nombre con los turnos reales que da en este tablero (son un % del límite). */
const nameOf = (item) => (item.share ? `+${extraTurns(item.id, S.G.limit)} turnos` : item.name); // la cifra real, nunca un porcentaje
const priceNow = (id) => priceOf(id, S.G.rate, S.run.start, S.run);

/** Refleja en pantalla la compra ya cobrada. */
function applyEffects(id) {
  $('score').textContent = fmt(S.run.score);
  recLine();
  if (id === 'hint') {
    updateHeroHud();
  } else if (itemById(id)?.share) {
    $('lim').textContent = S.G.limit;
    updateHud();
    playBuyEffect();
    $('msg').textContent = `${nameOf(itemById(id))}: ahora el límite es ${S.G.limit}.`;
  } else if (id === 'redo') {
    playRewindEffect();
    layout();
    $('bUndo').disabled = true;
    updateHud();
    $('msg').textContent = 'Tablero reiniciado desde cero.';
  }
  saveRun();
}

/** Compra con confirmación (los precios son altos). Devuelve true si se compró. */
export async function confirmBuy(id) {
  const item = itemById(id);
  const price = priceNow(id);
  const ok = await ask({
    ico: item.icon,
    title: `${nameOf(item)} · ${fmt(price)} pts`,
    text: `${item.detail}<br><br>Tienes <b>${fmt(S.run.score)}</b> puntos y te quedarían <b>${fmt(S.run.score - price)}</b>.`,
    yes: 'Comprar',
    no: 'Ahora no',
  });
  if (!ok) return false;
  const r = buy(id, { run: S.run, G: S.G });
  if (!r.ok) return false;
  applyEffects(id);
  return true;
}

/* ---------- Don Dublón habla ---------- */
/* Don Dublón, vendedor sarcástico: varias frases por situación, elegidas al azar sin repetir la anterior. */
const shortOf = (id) => SHOP_NOTES[id];
const lastIdx = new Map();
const merchantLine = (key) => pick(shopPersona(S.run?.hero).lines?.[key] || MERCHANT_LINES[key]);
/** Elige una frase al azar sin repetir la anterior de la misma lista. */
const pick = (arr) => {
  if (typeof arr === 'string') return arr;
  let i = Math.floor(Math.random() * arr.length);
  if (arr.length > 1 && i === lastIdx.get(arr)) i = (i + 1 + Math.floor(Math.random() * (arr.length - 1))) % arr.length;
  lastIdx.set(arr, i);
  return arr[i];
};

function say(text, mood) {
  const b = $('shopBubble');
  b.textContent = text;
  b.classList.remove('say');
  void b.offsetWidth;
  b.classList.add('say');
  if (mood) {
    const m = $('merchant');
    m.classList.remove('happy', 'nope');
    void m.offsetWidth;
    m.classList.add(mood);
  }
}

function render() {
  $('shopScore').textContent = fmt(S.run.score);
  const discount = shopDiscount(S.run);
  $('shopDiscount').hidden = !discount;
  $('shopDiscount').textContent = `Descuento en tienda · −${fmt(Number((discount * 100).toFixed(1)))} %`;
  $('shopList').innerHTML = SHOP_ITEMS.map((i) => {
    const a = availability(i.id, { run: S.run, G: S.G });
    return `<button class="shop-item${a.ok ? '' : ' off'}" data-id="${i.id}" aria-disabled="${!a.ok}">
      <span class="ico">${icon(i.icon)}</span><span><b>${nameOf(i)}</b><small>${a.ok || !a.reason ? shortOf(i.id) : a.reason}</small></span>
      <span class="price">${discount ? `<del>${fmt(priceOf(i.id, S.G.rate, S.run.start))}</del>` : ''}${fmt(priceNow(i.id))}</span></button>`;
  }).join('');
}

/** Abre la tienda (botón 🛒). Bloquea el tablero mientras está abierta. */
export function openShop() {
  if (!S.G || S.G.done || S.busy || !S.run) return;
  const release = holdBusy();
  const modal = $('shop');
  const persona = shopPersona(S.run.hero);
  modal.dataset.hero = S.run.hero;
  $('shopBg').src = persona.background;
  $('shopMerchant').src = persona.portrait;
  $('shopMerchant').alt = `${persona.name}, ${persona.title}`;
  $('shopTitle').textContent = `Tienda de ${persona.name}`;
  modal.style.setProperty('--shop-scene', cssUrl(persona.background));
  const close = () => {
    modal.classList.remove('show');
    $('shopClose').onclick = null;
    release();
    updateHeroHud(); // la pista y el poder se pintaron desactivados mientras la tienda estaba abierta
  };
  render();
  modal.classList.add('show');
  sfx.merchantBell();
  say(merchantLine('greet'), 'happy');
  $('shopClose').onclick = close;
  const list = $('shopList');
  const lineFor = (b) => {
    if (b.classList.contains('off')) {
      if (b.dataset.id === 'redo' && S.G.moves === 0) return merchantLine('nothing');
      const { reason } = availability(b.dataset.id, { run: S.run, G: S.G });
      return reason === 'No te alcanzan los puntos.' ? merchantLine('poor') : reason;
    }
    return merchantLine(b.dataset.id);
  };
  list.onpointerover = (e) => {
    const b = e.target.closest('.shop-item');
    if (b && e.pointerType === 'mouse') say(lineFor(b));
  };
  list.onfocusin = (e) => {
    const b = e.target.closest('.shop-item');
    if (b) say(lineFor(b));
  };
  list.onclick = async (e) => {
    const b = e.target.closest('.shop-item');
    if (!b) return;
    if (b.classList.contains('off')) {
      sfx.merchantNope();
      say(lineFor(b), 'nope');
      return;
    }
    const id = b.dataset.id;
    say(merchantLine(id));
    if (!(await confirmBuy(id))) {
      sfx.merchantNope();
      say(merchantLine('decline'));
      return;
    }
    sfx.merchantCoin();
    say(merchantLine('bought'), 'happy');
    if (id === 'skip') {
      close();
      skipLevel();
      return;
    }
    render();
    if (id === 'redo' || itemById(id)?.share) setTimeout(close, 650); // un instante para ver a Don Dublón contento
  };
  $('shopClose').focus();
}

/**
 * Parada de minijuego (niveles 15, 25, …, 95). Esta pantalla es el «marco» común de los nueve juegos:
 *
 *   1. CÓMO SE JUEGA  – una demostración animada, una sola frase, qué suma y qué resta, y el premio en juego.
 *   2. 3 · 2 · 1      – cuenta atrás (nadie empieza por sorpresa).
 *   3. EL JUEGO       – cada uno vive en src/ui/minigames/ y solo dibuja; las reglas y la nota están en src/game/minigames.js.
 *   4. RESULTADO      – de 0 a 5 estrellas, y las pistas que valen en este nivel.
 *
 * Si la pestaña se oculta a mitad de partida el juego se congela y espera. Si se cierra la app, la parada vuelve a
 * empezar desde la explicación; una vez decidida la nota ya no cambia y el premio se cobra una sola vez.
 */
import { Music } from '../audio/music.js';
import { $, cssUrl } from '../dom.js';
import { zoneIdx } from '../data/zones.js';
import { MAX_GRADE, bonusIndex, claimBonus, ensureBonusPlan, finishBonus, gameFor, maxPrize, setupFor } from '../game/minigames.js';
import { saveRun } from '../game/session.js';
import { S, heroOf } from '../state.js';
import { burst } from './fx.js';
import { icon } from './icons.js';
import { catchGame, stackGame, whackGame } from './minigames/lia.js';
import { clockGame, orderGame, rhythmGame } from './minigames/jean.js';
import { pairsGame, shellGame, simonGame } from './minigames/juth.js';
import { createRunner, el, reduceMotion, snd } from './minigames/kit.js';
import { heroArt } from './story.js';
export { isBonusLevel } from '../game/minigames.js';

const GAME_UI = { catch: catchGame, whack: whackGame, stack: stackGame, clock: clockGame, rhythm: rhythmGame, order: orderGame, pairs: pairsGame, simon: simonGame, shell: shellGame };
/** Juegos que se guían por el oído: la música de fondo baja más. */
const QUIET = { rhythm: 0.14, simon: 0.2 };
const VERDICTS = ['Sin premio esta vez', 'Por los pelos', 'Nada mal', '¡Bien jugado!', '¡Excelente!', '¡Perfecto!'];
/** Lo que dice el héroe según le haya ido: [0-1 estrellas, 2-3, 4-5]. */
const HERO_SAYS = {
  lia: ['«Una brasa no se apaga por un tropiezo.»', '«Calienta. La próxima arderá más.»', '«¡Así arde una brasa!»'],
  jean: ['«El tiempo da segundas oportunidades.»', '«Buen pulso. Aún puedo afinarlo.»', '«Ni un segundo fuera de sitio.»'],
  van: ['«Hasta las runas se emborronan a veces.»', '«Trazo firme, casi sin tachones.»', '«Escrito sin un solo borrón.»'],
};
const STAR_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2.5l4 8.6 9.4 1.2-6.9 6.5 1.8 9.3L16 23.5l-8.3 4.6 1.8-9.3-6.9-6.5L12 11.1z"/></svg>';
const wait = (ms) => new Promise((res) => setTimeout(res, ms));
const hintWord = (n) => (n === 1 ? 'pista' : 'pistas');

export function showBonus() {
  const run = S.run, plan = ensureBonusPlan(run), hero = heroOf(plan.hero), game = gameFor(hero.id, plan.level), ui = GAME_UI[plan.kind];
  saveRun();
  return new Promise((resolve) => {
    const modal = $('mini'), stage = $('miniStage'), field = $('miniField'), skip = $('miniSkip'), status = $('miniStatus');
    const top = maxPrize(plan.level, plan.start);
    let runner = null, inst = null, phase = 'intro', closed = false, armed = 0;
    const listeners = [];
    const alive = () => !closed && S.run === run && run.bonusPlan === plan;
    const say = (text) => { if (status.textContent !== text) status.textContent = text; };
    const overlay = (node) => { stage.querySelectorAll('.mini-overlay').forEach((o) => o.remove()); if (node) stage.appendChild(node); return node; };

    /* ----- cabecera ----- */
    modal.dataset.hero = hero.id;
    modal.dataset.game = plan.kind;
    modal.dataset.phase = 'intro';
    modal.style.setProperty('--mini-accent', hero.color);
    modal.style.setProperty('--mini-scene', cssUrl(`backgrounds/zone-${zoneIdx(plan.level) + 1}.webp`));
    $('miniTag').textContent = `${hero.name} · Parada ${bonusIndex(plan.level) + 1} de 9`;
    $('miniTitle').textContent = game.title;
    $('miniHero').innerHTML = `<img src="${heroArt(hero.id, 'story')}" alt="${hero.name}">`;
    $('miniMax').textContent = String(top);
    $('miniPrize').setAttribute('aria-label', `Premio máximo: ${top} pistas`);

    /* ----- marcador común: etiqueta + valor a la izquierda, texto a la derecha y una barra ----- */
    const leftLabel = $('miniLeftLabel'), leftValue = $('miniLeftValue'), right = $('miniRight'), bar = $('miniBar'), hudBox = $('miniHud');
    const set = (node, text) => { if (node.textContent !== text) node.textContent = text; };
    const hud = {
      left(label, value) { set(leftLabel, label); set(leftValue, value); },
      right(text) { set(right, text); },
      /** `mode` 'fill' = progreso que crece (dorado); por defecto, tiempo que se agota (avisa en rojo al final). */
      bar(frac, mode = 'time') {
        const f = Math.max(0, Math.min(1, frac));
        bar.style.transform = `scaleX(${f.toFixed(4)})`;
        hudBox.classList.toggle('fill', mode === 'fill');
        hudBox.classList.toggle('low', mode !== 'fill' && f < 0.25);
      },
      flash() { hudBox.classList.remove('flash'); void hudBox.offsetWidth; hudBox.classList.add('flash'); },
    };
    hud.left('', ''); hud.right(''); hud.bar(1, 'fill');
    hudBox.classList.remove('low', 'flash');

    const listen = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); listeners.push(() => target.removeEventListener(type, fn, opts)); };
    function teardown() {
      runner?.stop(); runner = null; inst = null;
      listeners.splice(0).forEach((off) => off());
    }

    /* ----- 1. cómo se juega ----- */
    function intro() {
      phase = 'intro'; modal.dataset.phase = 'intro';
      field.replaceChildren();
      say('');
      skip.hidden = false; skip.textContent = 'Saltar reto (sin premio)';
      const node = overlay(el(`<div class="mini-overlay mini-intro">
        <div class="intro-demo" aria-hidden="true">${ui.demo}</div>
        <p class="intro-rule"></p>
        <ul class="intro-dos">${ui.dos.map((d) => `<li class="${d.ok ? 'ok' : 'no'}"><span class="dos-art" aria-hidden="true">${d.art}</span><span class="dos-text"></span></li>`).join('')}</ul>
        <p class="intro-hint"></p>
        <div class="intro-prize"><span class="intro-stars" aria-hidden="true">${STAR_SVG.repeat(MAX_GRADE)}</span><span class="intro-prize-text"></span></div>
        <button type="button" class="primary mini-play"><span>¡Jugar!</span></button>
      </div>`));
      node.querySelector('.intro-rule').textContent = ui.rule;
      node.querySelectorAll('.dos-text').forEach((n, i) => { n.textContent = ui.dos[i].text; });
      node.querySelector('.intro-hint').textContent = ui.hint;
      node.querySelector('.intro-prize-text').textContent = `5 estrellas = ${top} pistas`;
      const play = node.querySelector('.mini-play');
      play.onclick = () => { if (alive() && phase === 'intro') countdown(); };
      play.focus();
    }

    /* ----- 2. cuenta atrás ----- */
    async function countdown() {
      phase = 'count'; modal.dataset.phase = 'count';
      skip.hidden = true;
      teardown();
      runner = createRunner();
      inst = ui.mount({ field, setup: setupFor(plan), plan, hero, runner, hud, say, listen, done: (grade) => finish(grade) });
      const node = overlay(el('<div class="mini-overlay mini-count" aria-hidden="true"><b></b></div>')), num = node.firstElementChild;
      say('Prepárate…');
      Music.duck(QUIET[plan.kind] ?? 0.5);
      const quick = reduceMotion();
      for (const label of quick ? ['¡Ya!'] : ['3', '2', '1', '¡Ya!']) {
        if (!alive() || phase !== 'count') return;
        num.textContent = label;
        num.classList.remove('tick'); void num.offsetWidth; num.classList.add('tick');
        if (label === '¡Ya!') snd.go(); else snd.count();
        await wait(label === '¡Ya!' ? 420 : 620);
      }
      if (!alive() || phase !== 'count') return;
      overlay(null);
      phase = 'play'; modal.dataset.phase = 'play';
      skip.hidden = false; skip.textContent = 'Terminar ya'; armed = 0;
      say('');
      runner.start();
      inst.start();
      if (document.hidden) pause();
    }

    /* ----- pausa (pestaña oculta) ----- */
    function pause() {
      if (phase !== 'play' || !runner || runner.paused) return;
      runner.pause();
      const node = overlay(el('<div class="mini-overlay mini-paused"><h3>En pausa</h3><p>El reto te espera tal como lo dejaste.</p><button type="button" class="primary"><span>Seguir jugando</span></button></div>'));
      node.querySelector('button').onclick = () => { overlay(null); runner?.resume(); };
      node.querySelector('button').focus();
    }
    const onHide = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', onHide);

    /* ----- 4. resultado ----- */
    async function finish(grade, restore = false) {
      if (!alive() || phase === 'result') return;
      phase = 'result'; modal.dataset.phase = 'result';
      teardown();
      const prize = finishBonus(plan, grade), g = plan.grade ?? 0;
      saveRun();
      skip.hidden = true;
      say('');
      Music.duck(0.5);
      const mood = g >= 4 ? 2 : g >= 2 ? 1 : 0;
      const node = overlay(el(`<div class="mini-overlay mini-result g${g}">
        <div class="mres-rays" aria-hidden="true"></div>
        <img class="mres-hero" src="${heroArt(hero.id, mood === 2 ? 'victory' : 'story')}" alt="">
        <h3 class="mres-verdict"></h3>
        <div class="mres-stars" role="img">${Array.from({ length: MAX_GRADE }, () => `<i class="mres-star">${STAR_SVG}</i>`).join('')}</div>
        <div class="mres-prize ${prize ? '' : 'none'}"><span class="mres-prize-ico" aria-hidden="true">${icon('hint')}</span><b></b><span class="mres-prize-word"></span></div>
        <p class="mres-says"></p>
        <button type="button" class="primary mini-go" disabled><span></span></button>
      </div>`));
      const stars = [...node.querySelectorAll('.mres-star')], go = node.querySelector('.mini-go'), prizeBox = node.querySelector('.mres-prize');
      node.querySelector('.mres-verdict').textContent = VERDICTS[g];
      node.querySelector('.mres-stars').setAttribute('aria-label', `${g} de 5 estrellas`);
      node.querySelector('.mres-prize b').textContent = prize ? `+${prize}` : '0';
      node.querySelector('.mres-prize-word').textContent = hintWord(prize);
      node.querySelector('.mres-says').textContent = HERO_SAYS[hero.id][mood];
      go.firstElementChild.textContent = prize ? 'Recoger y continuar' : 'Continuar';
      go.onclick = () => {
        if (go.disabled || closed) return;
        go.disabled = true;
        const won = claimBonus(run);
        saveRun();
        close();
        resolve(won);
      };
      const quick = restore || reduceMotion();
      if (!quick) await wait(380);
      for (let i = 0; i < MAX_GRADE; i++) {
        if (closed) return;
        stars[i].classList.add(i < g ? 'on' : 'off');
        if (!quick) { if (i < g) snd.star(i + 1); else snd.starOff(); await wait(i < g ? 260 : 110); }
      }
      if (closed) return;
      node.classList.add('revealed');
      prizeBox.classList.add('show');
      if (!restore) {
        snd.result(g);
        if (g >= 4 && !reduceMotion()) { const r = prizeBox.getBoundingClientRect(); burst(r.left + r.width / 2, r.top, g === 5 ? 70 : 40, ['#ffd24a', '#fff6c9', hero.color, '#ff8a5a']); }
      }
      go.disabled = false;
      go.focus();
    }

    function close() {
      closed = true;
      teardown();
      document.removeEventListener('visibilitychange', onHide);
      modal.onkeydown = null; skip.onclick = null;
      overlay(null);
      field.replaceChildren();
      modal.classList.remove('show');
      Music.duck(1);
    }

    /* ----- saltar / terminar: pide un segundo toque para que no se pierda el premio por accidente ----- */
    skip.onclick = () => {
      if (!alive() || phase === 'result' || phase === 'count') return;
      if (Date.now() - armed > 3000) { armed = Date.now(); skip.textContent = phase === 'intro' ? '¿Seguro? Toca otra vez para saltar' : '¿Seguro? Toca otra vez para terminar'; return; }
      finish(phase === 'play' && inst ? inst.grade() : 0);
    };
    modal.onkeydown = (e) => {
      if (e.key !== 'Tab') return;
      const buttons = [...modal.querySelectorAll('button')].filter((b) => !b.disabled && !b.hidden && b.getClientRects().length);
      if (!buttons.length) return;
      if (e.shiftKey && document.activeElement === buttons[0]) { e.preventDefault(); buttons.at(-1).focus(); } else if (!e.shiftKey && document.activeElement === buttons.at(-1)) { e.preventDefault(); buttons[0].focus(); }
    };

    modal.classList.add('show');
    if (plan.prize !== undefined || plan.phase === 'done') finish(plan.grade ?? 0, true); else intro();
  });
}

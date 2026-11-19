import { BOSS_RULES } from '../src/game/bosses.js';
import { DAILY_TARGETS } from '../src/game/daily.js';
import { MAX_GRADE, maxPrize } from '../src/game/minigames.js';
import { FIRST_ROTATED_LEVEL } from '../src/game/orientation.js';
import { HEROIC_BENEFITS } from '../src/game/routes.js';
import { BOSS_FREE_RETRIES } from '../src/game/shop.js';
import { WORLD } from '../src/data/lore.js';
import { HERO_LORE } from '../src/data/story.js';
import { tr } from '../src/i18n.js';
import { guides } from './content.js';
import { extraChapters } from './chapters.js';

export const guidePaths = { es: 'guia/', en: 'guia/en/', ja: 'guia/ja/', zh: 'guia/zh/' };
export const guideEntries = Object.fromEntries(
  Object.entries(guidePaths).map(([lang, path]) => [lang, path + 'index.html']),
);
const timedBosses = Object.entries(BOSS_RULES).filter(([, rule]) => rule.seconds);

export function renderGuide(lang) {
  const g = { ...guides[lang], ...extraChapters[lang] };
  const up = lang === 'es' ? './' : '../';
  const play = lang === 'es' ? '../' : '../../';
  const locales = Object.keys(guidePaths).map((code) => {
    const href = up + (code === 'es' ? '' : code + '/');
    const { htmlLang, language } = guides[code];
    return `<a href="${href}" hreflang="${htmlLang}" lang="${htmlLang}"${code === lang ? ' aria-current="page"' : ''}>${language}</a>`;
  }).join('');
  const alternates = Object.entries(guidePaths).map(([code, path]) =>
    `<link rel="alternate" hreflang="${guides[code].htmlLang}" href="%SITE_URL%/${path}">`).join('\n');
  const chapters = [
    ['como-jugar', g.basics], ['retos-diarios', g.daily], ['pistas', g.hints],
    ['tienda', g.shop], ['minijuegos', g.miniTitle], ['mecanicas', g.mechanics],
    ['maleficios', g.curseTitle], ['heroes', g.heroes], ['caminos-heroicos', g.heroicTitle],
    ['jefes', g.bosses], ['historia', g.story], ['banda-sonora', g.sound],
  ];
  const figure = (level, [caption, alt], eager = false) => `<figure class="capture">
    <a class="capture-link" href="${up}capturas/${lang}-${level}.webp" aria-label="${g.zoom} · ${caption}">
      <img src="/guia/capturas/${lang}-${level}.webp" width="${level === 'shop' ? 928 : 1000}" height="${level === 'shop' ? 780 : 462}" alt="${alt}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
    </a>
    <figcaption>${caption}</figcaption>
  </figure>`;
  const feature = (key, symbol) => `<div class="mechanic mechanic-${key}"><dt><span aria-hidden="true">${symbol}</span>${g[key][0]}</dt><dd>${g[key][1]}</dd></div>`;
  const heroes = [['lia', 'lia'], ['jean', 'jean'], ['juth', 'van']];
  const hero = ([key, file]) => `<article class="hero hero-${key}">
    <img src="/heroes/${file}-story.webp" alt="" width="320" height="224" loading="lazy" decoding="async">
    <div class="hero-copy">
      <h3>${g[key][0]}</h3><p>${g[key][1]}</p>
      <blockquote>${tr(HERO_LORE[file].quote, lang)}</blockquote>
    </div>
  </article>`;
  const route = ([key, file], index) => `<div class="route-guide hero-${key}">
    <dt><span>${g.routeNames[index]}</span><strong aria-label="${g.bonusPoints} +${Math.round(HEROIC_BENEFITS.points[file] * 100)}%">+${Math.round(HEROIC_BENEFITS.points[file] * 100)}%</strong></dt>
    <dd>${g[key][0]} · ${g.heroPaths[index]}</dd>
  </div>`;
  const track = ([key, file]) => `<button type="button" class="track hero-${key}" data-track="${file}" aria-pressed="false">
    <span class="track-icon" aria-hidden="true">♫</span><b>${g[key][0]}</b><span class="listen-action">${g.listen}</span>
  </button>`;

  return `<!doctype html>
<html lang="${g.htmlLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#111e29">
  <title>${g.title}</title>
  <meta name="description" content="${g.description}">
  <link rel="canonical" href="%SITE_URL%/${guidePaths[lang]}">
  ${alternates}
  <link rel="alternate" hreflang="x-default" href="%SITE_URL%/guia/en/">
  <link rel="icon" href="/icons/icon-192.png">
  <link rel="stylesheet" href="/guia/style.css">
</head>
<body>
  <header class="site-head">
    <div class="wrap head-inner">
      <a class="wordmark" href="${play}">DAWN<span>SLIDE</span></a>
      <nav class="languages" aria-label="${g.languageLabel}">${locales}</nav>
    </div>
  </header>
  <main>
    <div class="intro">
      <div class="wrap intro-grid">
        <div class="intro-copy">
          <p class="guide-label">${g.title}</p>
          <h1>${g.heading}</h1>
          <p>${g.intro}</p>
          <a class="play" href="${play}">${g.play} <span aria-hidden="true">→</span></a>
        </div>
        ${figure(1, g.startShot, true)}
      </div>
    </div>
    <div class="wrap chapters">
      <nav class="contents" aria-labelledby="contents-title">
        <h2 id="contents-title">${g.contents}</h2>
        <ul class="chapter-links">${chapters.map(([id, name]) => `<li><a href="#${id}">${name}<span aria-hidden="true">↘</span></a></li>`).join('')}</ul>
      </nav>

      <section id="como-jugar" class="section basic">
        <h2>${g.basics}</h2>
        <p>${g.moves}</p>
        <p>${g.exit}</p>
        <p>${g.score}</p>
      </section>

      <section id="retos-diarios" class="section daily">
        <div>
          <h2>${g.daily}</h2>
          <p>${g.dailyIntro.replace('{targets}', new Intl.ListFormat(g.htmlLang).format(DAILY_TARGETS.map(String)))}</p>
          <div class="daily-targets" aria-label="${g.targetsTitle}">${DAILY_TARGETS.map((target) => `<span>${target}</span>`).join('')}</div>
          <p>${g.dailyUnlock}</p>
        </div>
        ${figure('daily', g.dailyShot)}
        <div class="streak"><h3>${g.rewardTitle}</h3><p>${g.dailyStreak}</p></div>
      </section>

      <section id="pistas" class="section basic">
        <h2>${g.hints}</h2>
        <p>${g.hintTip}</p>
        <p>${g.earnHints}</p>
      </section>

      <section id="tienda" class="section feature-section">
        <div>
          <h2>${g.shop}</h2>
          <p>${g.shopIntro}</p>
          <p>${g.shopLimit}</p>
        </div>
        ${figure('shop', g.shopShot)}
      </section>

      <section id="minijuegos" class="section feature-section">
        <div>
          <h2>${g.miniTitle}</h2>
          <p>${g.miniIntro}</p>
          <p>${g.miniPrize.replace('{stars}', MAX_GRADE).replace('{first}', maxPrize(15)).replace('{last}', maxPrize(95))}</p>
        </div>
        ${figure('mini', g.miniShot)}
      </section>

      <section id="mecanicas" class="section">
        <h2>${g.mechanics}</h2>
        <p class="section-intro">${g.mechanicsIntro}</p>
        <div class="mechanics-grid">
          <div>${figure(28, g.rockShot)}<dl>${feature('rock', '▪')}${feature('heavy', '1')}</dl></div>
          <div>${figure(65, g.iceShot)}<dl>${feature('gate', '🔒')}${feature('ice', '❄')}</dl></div>
        </div>
      </section>

      <section id="maleficios" class="section feature-section">
        <div>
          <h2>${g.curseTitle}</h2>
          <p>${g.curseIntro.replace('{level}', FIRST_ROTATED_LEVEL)}</p>
          <p>${g.curseTip}</p>
        </div>
        ${figure('curse', g.curseShot)}
      </section>

      <section id="heroes" class="section">
        <h2>${g.heroes}</h2>
        <p class="section-intro">${g.heroesIntro}</p>
        <div class="hero-grid">${heroes.map(hero).join('')}</div>
      </section>

      <section id="caminos-heroicos" class="section feature-section">
        <div>
          <h2>${g.heroicTitle}</h2>
          <p>${g.heroicIntro}</p>
          <dl class="route-guide-list">${heroes.map(route).join('')}</dl>
        </div>
        ${figure('route', g.routeShot)}
      </section>

      <section id="jefes" class="section bosses">
        <div>
          <h2>${g.bosses}</h2>
          <p>${g.bossIntro.replace('{attempts}', BOSS_FREE_RETRIES + 1)}</p>
          <p>${g.retry.replace('{retries}', BOSS_FREE_RETRIES)}</p>
        </div>
        ${figure(100, g.bossShot)}
        <table>
          <caption>${g.clock}</caption>
          <thead><tr><th scope="row">${g.level}</th>${timedBosses.map(([level]) => `<th scope="col">${level}</th>`).join('')}</tr></thead>
          <tbody><tr><th scope="row">${g.seconds}</th>${timedBosses.map(([, rule]) => `<td>${Math.floor(rule.seconds / 60)}:${String(rule.seconds % 60).padStart(2, '0')}</td>`).join('')}</tr></tbody>
        </table>
      </section>

      <section id="historia" class="section story feature-section">
        <div>
          <h2>${g.story}</h2>
          <p class="story-world">${WORLD.name} · ${WORLD.year}</p>
          <h3>${g.storyTitle}</h3>
          <p>${g.storyIntro}</p>
          <p>${g.storySeals}</p>
        </div>
        <img class="story-art" src="/guia/arte/historias-de-thyes.webp" width="1220" height="687" alt="${g.storyArt}" loading="lazy" decoding="async">
      </section>

      <section id="banda-sonora" class="section soundtrack">
        <div>
          <h2>${g.sound}</h2>
          <p>${g.soundIntro}</p>
        </div>
        <div id="guide-audio" data-listen="${g.listen}" data-stop="${g.stop}">
          ${heroes.map(track).join('')}
          <p role="status" hidden>${g.audioUnavailable}</p>
        </div>
      </section>
    </div>
  </main>
  <footer class="site-foot"><a class="play" href="${play}">${g.play} <span aria-hidden="true">→</span></a></footer>
  <button id="audioRecover" hidden></button>
  <script type="module" src="/guia/audio.js"></script>
  <script type="module" src="/guia/scroll.js"></script>
</body>
</html>`;
}

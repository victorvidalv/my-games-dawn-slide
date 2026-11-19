import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { tr, isEnglish, lang, LANGS, DICTS, LANG_INFO, detectLang } from '../src/i18n.js';
import { EN } from '../src/i18n/en.js';
import { CHAPTERS, HERO_LORE, HERO_TALK, HERO_TUTORIAL_TALK } from '../src/data/story.js';
import { INSCRIPTIONS } from '../src/data/lore.js';
import { HEROES } from '../src/game/heroes.js';
import { SHOP_PERSONAS } from '../src/game/shop-personas.js';
import { ZONES } from '../src/data/zones.js';

/** Todos los textos de una estructura (cadenas anidadas en objetos y listas). */
const strings = (v) =>
  typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];
const NAMES = /^(Maela|Don Dublón|Azhar|Lía|Jean|Juth)$|\.(webp|png)$/; // nombres propios y rutas de imagen: no se traducen
const missing = (list) =>
  [...new Set(list)].filter(
    (s) => s.length > 3 && !NAMES.test(s) && /[A-Za-zÁ-ú]/.test(s) && tr(s) === s.replace(/\s+/g, ' ').trim(),
  );

describe('cuatro idiomas: inglés, español, chino y japonés, con las mismas claves', () => {
  const ph = (x) => (x.match(/\{\w+\}/g) || []).sort().join();
  it('idioma inicial: el del navegador si es uno de los nuestros; si no, inglés', () => {
    expect(LANGS).toEqual(['en', 'es', 'zh', 'ja']);
    expect(detectLang(['es-CL', 'en'])).toBe('es');
    expect(detectLang(['zh-TW'])).toBe('zh');
    expect(detectLang(['zh_CN'])).toBe('zh');
    expect(detectLang(['ja-JP', 'en-US'])).toBe('ja');
    expect(detectLang(['fr-FR', 'de', 'ja'])).toBe('ja'); // se respeta el orden de preferencia
    expect(detectLang(['pt-BR'])).toBe('en');
    expect(detectLang([])).toBe('en');
    expect(detectLang([undefined, null, ''])).toBe('en');
    for (const l of LANGS) expect(LANG_INFO[l].name.length, l).toBeGreaterThan(0);
  });
  it('todos los diccionarios tienen exactamente las mismas claves que el inglés, sin traducciones vacías', () => {
    const base = Object.keys(EN);
    for (const [code, dict] of Object.entries(DICTS)) {
      expect(Object.keys(dict).length, code).toBe(base.length);
      expect(
        base.filter((k) => !(k in dict)),
        code,
      ).toEqual([]);
      for (const [es, out] of Object.entries(dict)) expect(out.trim().length, `${code}: ${es}`).toBeGreaterThan(0);
    }
  });
  it('cada traducción conserva los marcadores {x} y los símbolos del juego de su clave', () => {
    const symbols = (x) => [...new Set(x.match(/[➜▣◆●▲👑↩📲🔊★▶↻⚔🔥🔑]/gu) || [])].sort().join('');
    for (const [code, dict] of Object.entries(DICTS))
      for (const [es, out] of Object.entries(dict)) {
        expect(ph(out), `${code}: ${es}`).toBe(ph(es));
        if (code !== 'en') expect(symbols(out), `${code}: ${es}`).toBe(symbols(es));
      }
  });
  it('chino y japonés: no queda español ni inglés suelto, y usan su propia escritura', () => {
    const NAMES =
      /Lía|Jean|Juth|Vhorn|VHORN|Thyes|THYES|Tri|Maela|Azhar|Don Dublón|Kogn|Sahrim|Ennari|Aluen|DAWNSLIDE|LV|OK/g;
    for (const code of ['zh', 'ja']) {
      const script = code === 'zh' ? /[\u4e00-\u9fff]/ : /[\u3040-\u30ff\u4e00-\u9fff]/;
      let withScript = 0;
      for (const [es, out] of Object.entries(DICTS[code])) {
        const rest = out.replace(NAMES, '').replace(/\{\w+\}/g, '');
        expect(/[A-Za-zÁ-ú]{2,}/.test(rest), `${code}: ${es} → ${out}`).toBe(false);
        if (script.test(out)) withScript++;
      }
      expect(withScript / Object.keys(DICTS[code]).length, code).toBeGreaterThan(0.93);
    }
    // el japonés usa kana (no es una copia del chino)
    expect(Object.values(DICTS.ja).filter((v) => /[\u3040-\u30ff]/.test(v)).length).toBeGreaterThan(600);
  });
  it('traduce a cualquier idioma: frases exactas, plantillas con números y nombres anidados', () => {
    expect(tr('Pista', 'zh')).toBe('提示');
    expect(tr('Pista', 'ja')).toBe('ヒント');
    expect(tr('Pista', 'es')).toBe('Pista');
    expect(tr('Te quedan 3 turnos.', 'zh')).toBe('你还剩 3 步。');
    expect(tr('Te quedan 3 turnos.', 'ja')).toBe('残り 3 手です。');
    expect(tr('Sello de Corazón', 'zh')).toBe('心之印');
    expect(tr('Sello de Corazón', 'ja')).toBe('心の封印');
    expect(tr('Valle Esmeralda', 'zh')).toBe('翡翠谷');
    expect(tr('3.250', 'ja')).toBe('3.250');
    expect(tr('«Incluso la ceniza recuerda el calor.»', 'zh')).toBe('「就连灰烬也记得温暖。」');
    expect(tr('Incluso la ceniza recuerda el calor.', 'ja')).toBe('灰でさえ、ぬくもりを覚えている。'); // citada sin comillas dentro de otro texto
  });
});

describe('idioma: el inglés es el idioma por defecto y cubre la historia', () => {
  it('sin preferencia guardada ni idioma de navegador conocido el juego está en inglés', () => {
    expect(lang).toBe('en');
    expect(isEnglish).toBe(true);
  });
  it('traduce frases exactas, plantillas con números y nombres anidados', () => {
    expect(tr('Pista')).toBe('Hint');
    expect(tr('Te quedan 3 turnos.')).toBe('You have 3 turns left.');
    expect(tr('Sello de Corazón')).toBe('Heart Seal');
    expect(tr('Camino heroico · +15 % de puntos · poderes a la mitad · tienda −30 %')).toBe(
      'Heroic path · +15 % points · half-strength powers · shop −30 %',
    );
    expect(tr('Perfecto · +480 puntos · Una puerta menos.')).toBe('Perfect · +480 points · One door fewer.');
  });
  it('lo que ya está en inglés o no tiene letras se deja igual', () => {
    expect(tr('Lía')).toBe('Lía');
    expect(tr('3.250')).toBe('3.250');
    expect(tr('+480')).toBe('+480');
  });
  it('los capítulos, los héroes, los pueblos y las inscripciones están traducidos', () => {
    expect(
      missing(
        strings([CHAPTERS.map(({ inscription, ...c }) => c), HERO_LORE, HERO_TALK, HERO_TUTORIAL_TALK, INSCRIPTIONS]),
      ),
    ).toEqual([]);
  });
  it('los héroes, las tiendas y las ciudades están traducidos', () => {
    const heroText = HEROES.flatMap((h) => [h.role, h.power, h.short, h.detail, h.quote]);
    const shopText = Object.values(SHOP_PERSONAS).flatMap((p) => strings(p));
    expect(missing([...heroText, ...shopText, ...ZONES.map((z) => z.n)])).toEqual([]);
  });
  it('ninguna traducción está vacía', () => {
    for (const [es, en] of Object.entries(EN)) expect(en.trim().length, es).toBeGreaterThan(0);
  });

  it('no queda ningún texto en español del código sin traducción al inglés (vigilante de futuros textos)', () => {
    const norm = (x) => x.replace(/\s+/g, ' ').trim();
    const keys = new Set(Object.keys(EN).map(norm));
    const pats = Object.keys(EN)
      .filter((k) => /\{\w+\}/.test(k))
      .map(
        (k) =>
          new RegExp(
            '^' +
              norm(k)
                .replace(/[.*+?^$()|[\]\\]/g, '\\$&')
                .replace(/\\\{\w+\\\}|\{\w+\}/g, '(.+?)') +
              '$',
          ),
      );
    const known = (x) => keys.has(x) || pats.some((p) => p.test(x));
    const walk = (d) =>
      fs
        .readdirSync(d, { withFileTypes: true })
        .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
    const spanish =
      /[áéíóúñ¿¡ÁÉÍÓÚÑ]|\b(el|la|los|las|de|del|un|una|tu|tus|que|con|para|por|se|te|al|nivel|niveles|pista|turnos?|puntos?|tienda|elige|volver|siguiente|jugar|salir|héroe|camino|tablero|pieza|movimientos?|llave|sello|aventura|partida|ahora|aquí|cada|más|sin|ya|como|pero|este|esta|todo|hasta|sobre|solo|muy|bien|otra|otro)\b/i;
    // Textos que se componen por trozos (se traducen por separado en pantalla) o que no se ven: se revisaron a mano con scripts/i18n-diff.js
    const REVIEWED =
      /(Pieza ilegible|^Lía$|^Don Dublón$|X\+X puntos|es propio de tu héroe|XXX Sellos|XArrastra|Mueve la pieza brillante|Pagaste por revivir|XNivel máx|X en el nivel X\. El Sello)/;
    const missing = [];
    for (const f of walk('src').filter((x) => x.endsWith('.js') && !/i18n|tools|audio[\\/]themes|qr\.js/.test(x))) {
      const re = /(['"`])((?:\\.|(?!\1)[^\\\n])*?)\1/g;
      const src = fs.readFileSync(f, 'utf8');
      for (let m; (m = re.exec(src));) {
        const lit = m[2].replace(/\$\{[^}]*\}/g, 'X');
        if (
          lit.length < 3 ||
          !/[A-Za-zÁ-ú]/.test(lit) ||
          /^(\.|#|\/|http|data:|M\d)/.test(lit) ||
          /\.(webp|png|gif|js|css)$/.test(lit)
        )
          continue;
        if (!spanish.test(lit.replace(/<[^>]+>/g, ' '))) continue;
        if (known(norm(lit)) || REVIEWED.test(lit)) continue;
        const bad = lit
          .split(/<[^>]+>/)
          .map(norm)
          .filter((x) => x && /[A-Za-zÁ-ú]/.test(x) && spanish.test(x) && !known(x));
        if (bad.length) missing.push(`${f}: ${bad.join(' | ').slice(0, 100)}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

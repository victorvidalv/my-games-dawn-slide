import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { tr, isEnglish } from '../src/i18n.js';
import { EN } from '../src/i18n/en.js';
import { CHAPTERS, HERO_LORE, HERO_TALK, HERO_TUTORIAL_TALK } from '../src/data/story.js';
import { INSCRIPTIONS } from '../src/data/lore.js';
import { HEROES } from '../src/game/heroes.js';
import { SHOP_PERSONAS } from '../src/game/shop-personas.js';
import { ZONES } from '../src/data/zones.js';

/** Todos los textos de una estructura (cadenas anidadas en objetos y listas). */
const strings = (v) => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);
const NAMES = /^(Maela|Don Dublón|Azhar|Lía|Jean|Juth)$|\.(webp|png)$/;   // nombres propios y rutas de imagen: no se traducen
const missing = (list) => [...new Set(list)].filter((s) => s.length > 3 && !NAMES.test(s) && /[A-Za-zÁ-ú]/.test(s) && tr(s) === s.replace(/\s+/g, ' ').trim());

describe('idioma: el inglés es el idioma por defecto y cubre la historia', () => {
  it('sin preferencia guardada el juego está en inglés', () => {
    expect(isEnglish).toBe(true);
  });
  it('traduce frases exactas, plantillas con números y nombres anidados', () => {
    expect(tr('Pista')).toBe('Hint');
    expect(tr('Te quedan 3 turnos.')).toBe('You have 3 turns left.');
    expect(tr('Sello de Corazón')).toBe('Heart Seal');
    expect(tr('Camino heroico · +15 % de puntos · rebobina +3')).toBe('Heroic path · +15 % points · rewind +3');
    expect(tr('Perfecto · +480 puntos · Una puerta menos.')).toBe('Perfect · +480 points · One door fewer.');
  });
  it('lo que ya está en inglés o no tiene letras se deja igual', () => {
    expect(tr('Lía')).toBe('Lía');
    expect(tr('3.250')).toBe('3.250');
    expect(tr('+480')).toBe('+480');
  });
  it('los capítulos, los héroes, los pueblos y las inscripciones están traducidos', () => {
    expect(missing(strings([CHAPTERS.map(({ inscription, ...c }) => c), HERO_LORE, HERO_TALK, HERO_TUTORIAL_TALK, INSCRIPTIONS]))).toEqual([]);
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
    const pats = Object.keys(EN).filter((k) => /\{\w+\}/.test(k)).map((k) => new RegExp('^' + norm(k).replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\\{\w+\\\}|\{\w+\}/g, '(.+?)') + '$'));
    const known = (x) => keys.has(x) || pats.some((p) => p.test(x));
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
    const spanish = /[áéíóúñ¿¡ÁÉÍÓÚÑ]|\b(el|la|los|las|de|del|un|una|tu|tus|que|con|para|por|se|te|al|nivel|niveles|pista|turnos?|puntos?|tienda|elige|volver|siguiente|jugar|salir|héroe|camino|tablero|pieza|movimientos?|llave|sello|aventura|partida|ahora|aquí|cada|más|sin|ya|como|pero|este|esta|todo|hasta|sobre|solo|muy|bien|otra|otro)\b/i;
    // Textos que se componen por trozos (se traducen por separado en pantalla) o que no se ven: se revisaron a mano con scripts/i18n-diff.js
    const REVIEWED = /(Pieza ilegible|^Lía$|^Don Dublón$|X\+X puntos|es propio de tu héroe|XXX Sellos|XArrastra|Mueve la pieza brillante|Pagaste por revivir|XNivel máx)/;
    const missing = [];
    for (const f of walk('src').filter((x) => x.endsWith('.js') && !/i18n|tools|audio[\\/]themes|qr\.js/.test(x))) {
      const re = /(['"`])((?:\\.|(?!\1)[^\\\n])*?)\1/g;
      const src = fs.readFileSync(f, 'utf8');
      for (let m; (m = re.exec(src));) {
        const lit = m[2].replace(/\$\{[^}]*\}/g, 'X');
        if (lit.length < 3 || !/[A-Za-zÁ-ú]/.test(lit) || /^(\.|#|\/|http|data:|M\d)/.test(lit) || /\.(webp|png|gif|js|css)$/.test(lit)) continue;
        if (!spanish.test(lit.replace(/<[^>]+>/g, ' '))) continue;
        if (known(norm(lit)) || REVIEWED.test(lit)) continue;
        const bad = lit.split(/<[^>]+>/).map(norm).filter((x) => x && /[A-Za-zÁ-ú]/.test(x) && spanish.test(x) && !known(x));
        if (bad.length) missing.push(`${f}: ${bad.join(' | ').slice(0, 100)}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

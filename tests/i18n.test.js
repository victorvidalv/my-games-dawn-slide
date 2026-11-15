import { describe, it, expect } from 'vitest';
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
});

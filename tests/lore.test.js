import { describe, it, expect } from 'vitest';
import { WORLD, PEOPLES, INSCRIPTIONS, LORE_PORTRAITS } from '../src/data/lore.js';
import { CHAPTERS, HERO_LORE, HERO_TALK, HERO_TUTORIAL_TALK } from '../src/data/story.js';
import { HEROES } from '../src/game/heroes.js';
import { ZONES } from '../src/data/zones.js';
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const storyText = JSON.stringify([CHAPTERS, HERO_LORE, HERO_TALK]);

describe('mundo e historia: Thyes, año 4133', () => {
  it('hay 7 capítulos, uno por zona, cada uno con su sello, título y frase grabada', () => {
    expect(CHAPTERS).toHaveLength(7);
    expect(ZONES).toHaveLength(7);
    expect(new Set(CHAPTERS.map((c) => c.seal)).size).toBe(7);
    CHAPTERS.forEach((c, i) => {
      expect(c.title && c.opening && c.end && c.seal, `capítulo ${i + 1}`).toBeTruthy();
      expect(c.cityLines, `capítulo ${i + 1}`).toHaveLength(3);
      expect(c.inscription).toBeTruthy();
    });
  });

  it('las diez frases grabadas se leen en orden como una sola idea que empieza por Tri y termina con Tri', () => {
    expect(INSCRIPTIONS).toHaveLength(10);
    const text = INSCRIPTIONS.join(' ');
    expect(INSCRIPTIONS[0]).toMatch(/Tri/);
    expect(INSCRIPTIONS[9]).toMatch(/Tri/);
    for (const light of ['brasa', 'hora', 'palabra']) expect(text.toLowerCase()).toContain(light);
  });

  it('el mundo se llama Thyes, es el año 4133 y aparece en el menú, el viaje y el final', () => {
    expect(WORLD).toMatchObject({ name: 'Thyes', year: 4133, nextYear: 4134, villain: 'Vhorn', guardian: 'Tri' });
    expect(read('index.html')).toContain('AÑO 4133');
    expect(read('src/ui/fate.js')).toContain('WORLD.year');
    expect(read('src/ui/finale.js')).toMatch(/año 4134/);
    expect(storyText).toContain('4133');
  });

  it('los pueblos antiguos se mencionan en los textos del mundo', () => {
    expect(PEOPLES.map((p) => p.name)).toEqual(['Kogn', 'Sahrim', 'Ennari', 'Aluen']);
    expect(JSON.stringify(CHAPTERS[1])).toMatch(/Kogn/);
  });

  it('el malo se llama Vhorn: se nombra en la historia, aparece al inicio y en el final, y Tri no es la culpable en los textos oficiales', () => {
    expect((storyText.match(/Vhorn/g) || []).length).toBeGreaterThanOrEqual(5);
    expect(CHAPTERS[0].opening).toContain('Vhorn');
    expect(CHAPTERS[6].opening).toContain('Vhorn');
    expect(CHAPTERS[6].end).toContain('Vhorn');
    for (const h of Object.values(HERO_LORE)) expect(h.endingLore).toMatch(/Faro del Amanecer/);
    expect(read('index.html')).toContain('VHORN');
    expect(read('src/ui/finale.js')).toContain('Vhorn');
  });

  it('cada héroe encaja con una de las tres luces y todos terminan en el Faro, el año 4133 o Thyes', () => {
    expect(HEROES.map((h) => h.role)).toEqual(['Portadora de la Brasa', 'Vigía del Péndulo', 'Escriba de las Runas']);
    for (const h of Object.values(HERO_LORE)) {
      expect(h.chapterLines).toHaveLength(10);
      expect(h.endingLore).toMatch(/Thyes|4133/);
    }
  });

  it('el revivir y la pantalla de derrota hablan el mismo idioma del mundo', () => {
    expect(read('index.html')).toMatch(/Guardiana del Amanecer/);
    expect(read('src/ui/finale.js')).toMatch(/LA NOCHE SE CIERRA/);
  });

  it('no quedan en los textos del juego las ideas antiguas que chocan con la historia', () => {
    for (const bad of ['dios del fuego', 'Dios nórdico', 'LA SOMBRA DE TRI'])
      expect(read('index.html')).not.toContain(bad);
    expect(read('src/data/story.js')).not.toContain('Tri apagó');
  });

  it('los retratos de la historia existen (640×960 WebP) y cada pueblo sale en su reino; Vhorn, antes del Castillo', () => {
    const ids = Object.values(LORE_PORTRAITS).map((p) => p.id);
    expect(ids.sort()).toEqual(['aluen', 'ennari', 'kogn', 'sahrim', 'vhorn']);
    for (const [city, p] of Object.entries(LORE_PORTRAITS)) {
      const file = new URL(`../public/historia/${p.id}.webp`, import.meta.url);
      expect(existsSync(file), p.id).toBe(true);
      expect(readFileSync(file).length, p.id).toBeGreaterThan(20000);
      expect(p.name && p.caption).toBeTruthy();
      const people = PEOPLES.find((x) => x.id === p.id);
      if (people) expect(Number(city)).toBe(people.city);
    }
    expect(LORE_PORTRAITS[6].id).toBe('vhorn');
    // todos salen en un tramo que existe en la aventura de 21 niveles (el diálogo de cartas va de 1 a 6)
    for (const city of Object.keys(LORE_PORTRAITS)) expect(Number(city)).toBeLessThanOrEqual(6);
  });

  it('en el tutorial de cada pieza, cada héroe se queja o desafía a Vhorn; Vhorn habla en los últimos tramos', () => {
    for (const hero of ['lia', 'jean', 'van'])
      for (const mech of ['wall', 'heavy', 'gate', 'ice'])
        expect(HERO_TUTORIAL_TALK[hero][mech], `${hero} ${mech}`).toMatch(/Vhorn/);
    expect(CHAPTERS.filter((c) => !!c.vhorn).length).toBeGreaterThanOrEqual(2);
  });
});

describe('requisitos alcanzables', () => {
  it('ninguna entrada de Lore ni objeto de Personalizar pide más de lo que el juego permite conseguir', async () => {
    const { UNLOCKS } = await import('../src/game/achievements.js');
    const { FATE_CARDS } = await import('../src/game/fate.js');
    const { CHALLENGE_ROUTES } = await import('../src/game/survival.js');
    const { CHALLENGES } = await import('../src/game/daily.js');
    const L = await import('../src/data/lore-book.js');
    // Máximo real de cada estadística acotada (3 reliquias, 3 héroes, 5 retos, 3 rutas, 21 niveles…)
    const MAX = {
      relicsSeenCount: 3,
      heroWinsCount: 3,
      heroes: 3,
      paths: 3,
      challengeRelics: 3,
      challengeRoutesPlayed: 3,
      challengeWonCount: CHALLENGE_ROUTES.length,
      challengeBest: Math.max(...CHALLENGE_ROUTES.map((r) => r.levels)),
      dailyKinds: CHALLENGES.length,
      fateSeenCount: FATE_CARDS.length,
      maxLevel: 21,
      hardLevel: 21,
      expertLevel: 21,
    };
    // Sistemas retirados: sus contadores ya no suben, así que nada puede pedirlos
    const RETIRED = ['goldSeals', 'legacyAchPoints', 'mini5Kinds', 'mini5'];
    const reqs = Object.entries(UNLOCKS).flatMap(([k, u]) => u.reqs.map((r) => [k, r.stat, r.goal]));
    const add = (w, req) => (req || []).forEach(([s, g]) => reqs.push([w, s, g]));
    L.CHARACTERS.forEach((c) => c.entries.forEach((e) => add(`${c.id}:${e.id}`, e.req)));
    L.PLACES.forEach((p) => [p.main, p.memory, p.secret].forEach((x) => x && add(p.id, x.req)));
    L.PEOPLES_LORE.forEach((p) => [p, p.legacy].forEach((x) => x && add(p.id, x.req)));
    L.BOOKS.forEach((b) => add(`libro ${b.id}`, b.req));
    L.SCENES.forEach((s) => add(`escena ${s.id}`, s.req));
    const { STATS } = await import('../src/game/stats.js');
    const { unlockText } = await import('../src/game/achievements.js');
    const impossible = reqs.filter(
      ([, stat, goal]) => !(stat in STATS) || RETIRED.includes(stat) || goal > (MAX[stat] ?? Infinity),
    );
    expect(impossible, 'estadística inexistente, retirada o meta por encima del máximo').toEqual([]);
    // Cada condición se explica al jugador: ninguna se muestra en blanco
    expect(reqs.filter(([, stat, goal]) => !unlockText(stat, goal))).toEqual([]);
  });
});

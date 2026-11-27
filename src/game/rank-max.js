/* Máximo de puntos por dificultad: mejor héroe, reliquia y 6 cartas con los 21 tableros perfectos.
 * Generado por `npm run rank-max` (scripts/rank-max.mjs); no se edita a mano.
 * `byHero` = el máximo de cada héroe (con su mejor reliquia y cartas): el rango se mide contra el de tu héroe. */
export const MAX_SCORE = {
  1: {
    score: 92331,
    hero: 'lia',
    relic: 'sun',
    cards: ['temerario', 'racha-larga', 'destello', 'frenesi', 'cosecha', 'long-board'],
    byHero: {
      lia: {
        score: 92331,
        relic: 'sun',
        cards: ['temerario', 'racha-larga', 'destello', 'frenesi', 'cosecha', 'long-board'],
      },
      jean: {
        score: 86792,
        relic: 'sun',
        cards: ['juramento', 'temerario', 'racha-larga', 'destello', 'cosecha', 'power-echo'],
      },
      van: {
        score: 86792,
        relic: 'sun',
        cards: ['temerario', 'juramento', 'racha-larga', 'destello', 'cosecha', 'lucidez'],
      },
    },
  },
  50: {
    score: 130871,
    hero: 'lia',
    relic: 'sun',
    cards: ['temerario', 'racha-larga', 'destello', 'frenesi', 'cosecha', 'long-board'],
    byHero: {
      lia: {
        score: 130871,
        relic: 'sun',
        cards: ['temerario', 'racha-larga', 'destello', 'frenesi', 'cosecha', 'long-board'],
      },
      jean: {
        score: 122851,
        relic: 'sun',
        cards: ['juramento', 'temerario', 'racha-larga', 'destello', 'cosecha', 'pendulo-roto'],
      },
      van: {
        score: 122851,
        relic: 'sun',
        cards: ['juramento', 'temerario', 'racha-larga', 'destello', 'cosecha', 'codicia'],
      },
    },
  },
  75: {
    score: 168379,
    hero: 'lia',
    relic: 'sun',
    cards: ['temerario', 'racha-larga', 'destello', 'frenesi', 'cosecha', 'constelacion'],
    byHero: {
      lia: {
        score: 168379,
        relic: 'sun',
        cards: ['temerario', 'racha-larga', 'destello', 'frenesi', 'cosecha', 'constelacion'],
      },
      jean: {
        score: 157959,
        relic: 'sun',
        cards: ['juramento', 'temerario', 'racha-larga', 'destello', 'cosecha', 'vinculo'],
      },
      van: {
        score: 157959,
        relic: 'sun',
        cards: ['juramento', 'temerario', 'racha-larga', 'destello', 'cosecha', 'racha-firme'],
      },
    },
  },
};

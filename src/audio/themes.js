/**
 * Temas musicales: uno por ciudad (mismo orden que ZONES) más el del menú y el de la elección de héroe.
 * Cada tema lleva además un `hook`: un ostinato sincopado propio ({s: pasos, n: notas del acorde, voice}) que le da un ritmo reconocible.
 * Y un `choir`: la vocal que canta el coro en los estribillos (`ah`, `oh`, `oo`, `eh`), los pasos de sus gritos a compás (`chant`) y los de
 * las palmas (`clap`). Vocal + gritos + palmas son distintos en cada tema: el estribillo de cada ciudad se reconoce con los ojos cerrados.
 * Estilo «juego acogedor»: acordes con séptima, bajo caminante, ritmo con swing y melodías cantables.
 *
 * Cada tema es una pieza de 16 compases (4/4, 16 pasos por compás) que se repite:
 *   prog  – acorde de cada compás. Un número es el grado de la escala (acorde de 7ª diatónico: d, d+2, d+4, d+6);
 *           «"4:7"» fuerza otra calidad (7 dominante, m7, maj7, 9…); un arreglo [a, b] cambia de acorde a mitad de compás.
 *   tune  – la melodía, un texto por compás con notas «grado:duración» (duración en pasos de 1/16, `r` = silencio).
 *           El grado 0 es la tónica; 7 es la tónica una octava arriba.
 *   B     – atajo: en vez de escribir los 16 compases, se escriben 8 (la sección A); la sección B repite los
 *           primeros 6 desplazados `k` grados de la escala (la melodía y los acordes se mueven juntos, así que
 *           siguen sonando bien) y `end`/`endProg` aportan los 2 compases finales.
 *   epic  – capas orquestales extra (0-3): 1 cuerdas largas, 2 + timbal y trompas, 3 + caja y platillo.
 */
import { JUTH_THEME_DATA } from './themes-juth.js';
import { LIA_THEME_DATA } from './themes-lia.js';

export const SCALES = {
  min: [0, 2, 3, 5, 7, 8, 10],
  dor: [0, 2, 3, 5, 7, 9, 10],
  maj: [0, 2, 4, 5, 7, 9, 11],
  phr: [0, 1, 3, 5, 7, 8, 10],
  lyd: [0, 2, 4, 6, 7, 9, 11],
  hmin: [0, 2, 3, 5, 7, 8, 11],
  mix: [0, 2, 4, 5, 7, 9, 10],
  phd: [0, 1, 4, 5, 7, 8, 10],
  pent: [0, 2, 4, 7, 9],
};

/** Calidades de acorde que se pueden forzar con «"grado:calidad"» (semitonos sobre la fundamental). */
const QUALITIES = {
  7: [0, 4, 7, 10],
  9: [0, 4, 7, 10, 14],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  m: [0, 3, 7],
  maj: [0, 4, 7],
  dim: [0, 3, 6, 9],
};

/** «11:4 r:2 9:2» → { notes: [[paso, grado, duración], …], length } */
export function parseBar(text) {
  const notes = [];
  let at = 0;
  for (const tok of text.trim().split(/\s+/)) {
    const [deg, dur] = tok.split(':');
    const d = Number(dur);
    if (deg !== 'r') notes.push([at, Number(deg), d]);
    at += d;
  }
  return { notes, length: at };
}

/** Mueve una melodía `k` grados de la escala (los silencios no cambian). */
export const shiftBar = (text, k) =>
  text
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [deg, dur] = tok.split(':');
      return deg === 'r' ? tok : `${Number(deg) + k}:${dur}`;
    })
    .join(' ');

/** Mueve un acorde `k` grados (en la sección B los acordes son los diatónicos de la escala). */
export const shiftEntry = (e, k, n = 7) => {
  if (Array.isArray(e)) return e.map((x) => shiftEntry(x, k, n));
  const d = typeof e === 'string' ? Number(e.split(':')[0]) : e;
  return (((d + k) % n) + n) % n;
};

/** Acorde (notas MIDI) de una entrada de `prog` para un tema. */
export function chordMidi(th, entry) {
  const scale = SCALES[th.sc];
  const n = scale.length;
  const at = (deg) => th.root + scale[((deg % n) + n) % n] + 12 * Math.floor(deg / n);
  if (typeof entry === 'string') {
    const [d, q] = entry.split(':');
    const r = at(Number(d));
    return QUALITIES[q].map((x) => r + x);
  }
  return [at(entry), at(entry + 2), at(entry + 4), at(entry + 6)];
}

/** Entrada de `prog` activa en un paso del compás (los acordes dobles cambian en el paso 8). */
export const entryAt = (th, bar, st) => {
  const e = th.prog[bar % th.prog.length];
  return Array.isArray(e) ? (st < 8 ? e[0] : e[1]) : e;
};

const JEAN_THEME_DATA = [
  {
    name: 'Un corazón al sol',
    choir: {
      vowel: 'ah',
      chant: [0, 6, 12],
      clap: [4, 12],
    },
    hook: {
      s: [0, 2, 4, 6, 8, 10, 12, 14],
      n: [0, 2, 3, 2, 1, 2, 3, 2],
      voice: 'celesta',
      v: 0.015,
    },
    epic: 2,
    bpm: 128,
    sc: 'maj',
    root: 48,
    swing: 0.04,
    leadVoice: 'flute',
    compVoice: 'piano',
    comp: 'charleston',
    bassPat: 'walk',
    groove: 'pop',
    arpVoice: 'glass',
    arpPat: [0, 2, 3, 1],
    arpEvery: 2,
    arpV: 0.013,
    echo: true,
    prog: [0, 4, 5, 3, 0, [2, 5], 1, 4],
    tuneText: [
      '7:2 11:2 14:2 16:2 14:2 11:2 9:2 7:2',
      '11:2 15:2 18:2 15:2 13:2 11:2 13:4',
      '12:2 16:2 19:2 16:2 14:2 12:2 14:4',
      '10:2 14:2 17:2 14:2 12:2 10:2 12:4',
      '14:2 11:2 9:2 11:2 14:2 16:2 18:4',
      '13:2 16:2 14:2 12:2 14:2 16:2 14:4',
      '12:2 10:2 8:2 10:2 12:2 14:2 15:4',
      '15:2 13:2 11:2 13:2 15:2 17:2 18:4',
    ],
    B: {
      k: 2,
      endProg: [4, 0],
      end: ['17:2 15:2 13:2 15:2 17:2 19:2 18:4', '14:2 16:2 18:2 21:6 r:4'],
    },
  },
  {
    name: 'Vals de las pequeñas velas',
    choir: {
      vowel: 'eh',
      chant: [0, 8],
      clap: [4, 6, 12, 14],
    },
    hook: {
      s: [0, 2, 4, 8, 10, 12],
      n: [0, 2, 1, 0, 2, 3],
      voice: 'pizz',
      v: 0.018,
    },
    epic: 2,
    bpm: 130,
    sc: 'mix',
    root: 50,
    swing: 0.06,
    leadVoice: 'whistle',
    compVoice: 'accordion',
    comp: 'oompah',
    bassPat: 'oompah',
    groove: 'polka',
    arpVoice: 'celesta',
    arpPat: [0, 2, 1, 3],
    arpEvery: 2,
    arpV: 0.012,
    echo: true,
    prog: [0, 6, 3, 0, 0, 4, [3, 4], 0],
    tuneText: [
      '7:2 11:2 14:2 11:2 13:2 15:2 14:4',
      '13:2 10:2 13:2 15:2 17:2 15:2 13:4',
      '12:2 14:2 16:2 14:2 12:2 10:2 12:4',
      '11:2 14:2 16:2 14:2 11:2 9:2 7:4',
      '14:2 11:2 14:2 16:2 18:2 16:2 14:4',
      '15:2 13:2 11:2 13:2 15:2 17:2 18:4',
      '12:2 14:2 16:2 14:2 13:2 15:2 17:4',
      '14:2 11:2 9:2 7:2 9:2 11:2 14:4',
    ],
    B: {
      k: 3,
      endProg: [[3, 4], 0],
      end: ['15:2 13:2 11:2 13:2 15:2 17:2 18:4', '14:2 16:2 18:2 21:6 r:4'],
    },
  },
  {
    name: 'Gotas sobre la arena',
    choir: {
      vowel: 'oh',
      chant: [3, 6],
      clap: [4, 10, 12],
    },
    hook: {
      s: [0, 3, 6, 10, 12, 14],
      n: [0, 2, 1, 3, 2, 1],
      voice: 'koto',
      v: 0.017,
    },
    epic: 2,
    bpm: 124,
    sc: 'phd',
    root: 52,
    swing: 0.04,
    leadVoice: 'clarinet',
    compVoice: 'pizz',
    comp: 'montuno',
    bassPat: 'tumbao',
    groove: 'latin',
    arpVoice: 'glass',
    arpPat: [0, 1, 2, 3],
    arpEvery: 2,
    arpV: 0.012,
    echo: true,
    prog: [0, 1, 0, 6, 0, 1, [3, 6], 0],
    tuneText: [
      '7:2 11:2 14:2 11:2 9:1 8:1 7:2 9:4',
      '10:2 12:2 14:3 16:1 14:2 12:2 10:4',
      '14:2 11:2 14:2 16:2 15:1 14:1 12:2 11:4',
      '12:2 10:2 8:2 10:2 12:3 14:1 13:4',
      '11:2 14:2 16:2 14:2 13:1 11:1 9:2 11:4',
      '12:2 15:2 17:2 15:2 14:2 12:2 10:4',
      '10:2 12:2 14:2 16:2 13:2 12:2 10:4',
      '7:2 9:2 11:2 14:2 16:2 14:2 11:4',
    ],
    B: {
      k: -2,
      endProg: [[3, 6], 0],
      end: ['12:2 10:2 8:2 10:2 13:2 12:2 10:4', '11:2 9:2 7:2 9:2 11:2 14:4 r:2'],
    },
  },
  {
    name: 'Las hojas recuerdan',
    choir: {
      vowel: 'oo',
      chant: [0, 14],
      clap: [4, 12, 13],
    },
    hook: {
      s: [0, 2, 4, 6, 8, 10, 12, 14],
      n: [0, 1, 2, 3, 2, 1, 2, 3],
      voice: 'pizz',
      v: 0.016,
    },
    epic: 2,
    bpm: 122,
    sc: 'dor',
    root: 45,
    swing: 0.06,
    leadVoice: 'fiddle',
    compVoice: 'piano',
    comp: 'charleston',
    bassPat: 'walk',
    groove: 'shuffle',
    arpVoice: 'celesta',
    arpPat: [0, 2, 1, 3],
    arpEvery: 1,
    arpV: 0.012,
    echo: true,
    prog: [0, 3, [6, 3], 0, 0, 3, [6, 4], 0],
    tuneText: [
      '7:2 11:2 14:2 16:2 14:3 13:1 11:4',
      '10:2 14:2 16:2 14:2 12:3 10:1 12:4',
      '13:2 10:2 13:2 15:2 14:3 12:1 10:4',
      '11:2 14:2 16:2 14:2 11:3 9:1 11:4',
      '9:2 11:2 14:2 16:2 14:3 11:1 9:4',
      '12:2 14:2 16:2 18:2 16:3 14:1 12:4',
      '10:2 12:2 14:2 16:2 15:3 13:1 11:4',
      '14:2 11:2 9:2 7:2 9:3 11:1 14:4',
    ],
    B: {
      k: -3,
      endProg: [[6, 4], 0],
      end: ['12:2 14:2 16:2 14:2 13:2 15:2 17:4', '14:2 11:2 9:2 7:2 9:2 11:2 14:4'],
    },
  },
  {
    name: 'Las horas prestadas',
    choir: {
      vowel: 'ah',
      chant: [2, 10],
      clap: [4, 7, 12],
    },
    hook: {
      s: [0, 2, 3, 6, 8, 10, 11, 14],
      n: [0, 0, 2, 1, 0, 0, 3, 2],
      voice: 'synth',
      v: 0.016,
    },
    epic: 3,
    bpm: 132,
    sc: 'maj',
    root: 53,
    swing: 0.02,
    leadVoice: 'synth',
    compVoice: 'pizz',
    comp: 'skank',
    bassPat: 'funk',
    groove: 'disco',
    arpVoice: 'vibes',
    arpPat: [0, 2, 3, 1],
    arpEvery: 1,
    arpV: 0.013,
    echo: true,
    prog: [0, [1, '4:7'], 0, [5, 1], 3, [2, 5], [1, '4:7'], 0],
    tuneText: [
      '11:1 r:1 14:1 r:1 16:2 14:2 11:2 13:2 15:2 14:2',
      '12:1 r:1 15:1 r:1 17:2 15:2 12:2 10:2 12:2 14:2',
      '13:1 r:1 16:1 r:1 18:2 16:2 14:2 12:2 14:4',
      '12:2 14:2 16:2 14:2 12:2 10:2 12:4',
      '14:2 16:2 18:2 16:2 14:2 12:2 14:4',
      '13:2 15:2 17:2 15:2 13:2 11:2 13:4',
      '12:2 14:2 15:2 13:2 11:2 13:2 15:4',
      '14:2 16:2 18:2 16:2 14:2 11:2 14:4',
    ],
    B: {
      k: 2,
      endProg: [[1, '4:7'], 0],
      end: ['15:2 13:2 11:2 13:2 15:2 17:2 18:4', '14:2 16:2 18:2 21:6 r:4'],
    },
  },
  {
    name: 'Campanas de cristal',
    choir: {
      vowel: 'oo',
      chant: [0],
      clap: [12],
    },
    hook: {
      s: [0, 3, 6, 9, 12],
      n: [0, 2, 3, 2, 1],
      voice: 'bell',
      v: 0.016,
    },
    epic: 2,
    bpm: 120,
    sc: 'maj',
    root: 51,
    swing: 0.04,
    leadVoice: 'celesta',
    compVoice: 'piano',
    comp: 'arp',
    bassPat: 'walk',
    groove: 'pop',
    arpVoice: 'glass',
    arpPat: [0, 2, 3, 2, 1, 2, 3, 2],
    arpEvery: 1,
    arpV: 0.015,
    echo: true,
    prog: [0, [2, 5], 3, [1, 4], 0, [5, 2], 3, 4],
    tuneText: [
      '7:2 11:2 14:2 16:2 14:2 11:2 14:4',
      '13:2 11:2 9:2 11:2 13:2 15:2 16:4',
      '14:2 16:2 17:2 16:2 14:2 12:2 14:4',
      '12:2 10:2 8:2 10:2 12:2 13:2 15:4',
      '11:2 14:2 16:2 18:2 16:2 14:2 11:4',
      '12:2 14:2 16:2 14:2 12:2 11:2 13:4',
      '12:2 14:2 16:2 14:2 12:2 10:2 12:4',
      '15:2 13:2 11:2 13:2 15:2 17:2 18:4',
    ],
    B: {
      k: -4,
      endProg: [[1, 4], 0],
      end: ['15:2 13:2 11:2 13:2 15:2 17:2 18:4', '14:2 16:2 18:2 21:6 r:4'],
    },
  },
  {
    name: 'Pétalos en el viento',
    choir: {
      vowel: 'ah',
      chant: [8],
      clap: [6, 12],
    },
    hook: {
      s: [0, 3, 6, 8, 11, 14],
      n: [0, 2, 3, 1, 2, 0],
      voice: 'vibes',
      v: 0.016,
    },
    epic: 2,
    bpm: 122,
    sc: 'maj',
    root: 49,
    swing: 0.06,
    leadVoice: 'koto',
    compVoice: 'pizz',
    comp: 'skank',
    bassPat: 'bossa',
    groove: 'bossa',
    arpVoice: 'celesta',
    arpPat: [0, 1, 2, 3],
    arpEvery: 2,
    arpV: 0.013,
    echo: true,
    prog: [0, 5, 3, 4, 0, [5, 2], 3, [1, 4]],
    tuneText: [
      '9:2 11:1 9:1 7:2 9:2 11:2 14:2 11:2 9:2',
      '12:3 14:1 16:2 18:2 16:2 14:2 12:4',
      '14:2 16:2 18:2 16:2 14:2 12:2 14:4',
      '15:2 13:2 11:2 13:2 15:3 17:1 15:4',
      '16:2 14:2 11:2 9:2 11:2 14:2 16:4',
      '12:2 14:1 12:1 11:2 9:2 11:2 12:2 14:4',
      '14:2 16:2 18:2 16:2 14:2 12:2 14:4',
      '15:2 13:2 11:2 13:2 15:2 17:2 18:4',
    ],
    B: {
      k: 2,
      endProg: [[1, 4], 0],
      end: ['15:2 13:2 11:2 13:2 15:2 17:2 18:4', '14:3 11:1 9:2 7:2 9:2 11:2 14:4'],
    },
  },
  {
    name: 'La fragua de los sueños',
    choir: {
      vowel: 'oh',
      chant: [0, 3, 8],
      clap: [4, 12, 14, 15],
    },
    hook: {
      s: [0, 2, 3, 8, 10, 11],
      n: [0, 0, 2, 1, 1, 3],
      voice: 'pizz',
      oct: 0,
      v: 0.024,
    },
    epic: 3,
    bpm: 132,
    sc: 'min',
    root: 43,
    swing: 0.04,
    leadVoice: 'brass',
    compVoice: 'piano',
    comp: 'charleston',
    bassPat: 'gallop',
    groove: 'march',
    echo: false,
    prog: [0, 5, [3, '4:7'], 0, 5, ['6:7', 2], [3, '4:7'], 0],
    tuneText: [
      '7:2 11:2 14:2 16:2 14:2 11:2 9:2 7:2',
      '12:2 14:2 16:2 18:2 16:2 14:2 12:4',
      '14:2 12:2 10:2 12:2 14:2 15:2 17:4',
      '14:2 11:2 9:2 7:2 9:2 11:2 14:4',
      '12:2 14:2 16:2 18:2 16:2 14:2 16:4',
      '13:2 15:2 17:2 15:2 13:2 11:2 13:4',
      '14:2 12:2 10:2 12:2 13:2 15:2 17:4',
      '14:2 11:2 9:2 7:2 9:2 11:2 14:4',
    ],
    B: {
      k: 2,
      endProg: [[3, '4:7'], 0],
      end: ['15:2 13:2 11:2 13:2 15:2 17:2 18:4', '14:2 16:2 18:2 21:6 r:4'],
    },
  },
  {
    name: 'Un puente entre estrellas',
    choir: {
      vowel: 'oo',
      chant: [0, 10],
      clap: [4, 11],
    },
    hook: {
      s: [0, 4, 8, 12],
      n: [0, 2, 3, 1],
      voice: 'celesta',
      v: 0.016,
    },
    epic: 3,
    bpm: 120,
    sc: 'lyd',
    root: 54,
    swing: 0.06,
    leadVoice: 'vibes',
    compVoice: 'piano',
    comp: 'charleston',
    bassPat: 'walk',
    groove: 'chill',
    arpVoice: 'glass',
    arpPat: [0, 2, 3, 2],
    arpEvery: 1,
    arpV: 0.014,
    echo: true,
    prog: [0, [1, 0], 5, [4, 1], 0, [2, 5], [1, 4], 0],
    tuneText: [
      '11:2 14:2 16:2 18:2 16:2 14:2 11:4',
      '12:2 14:2 16:2 14:2 12:2 10:2 12:4',
      '12:2 14:2 16:2 18:2 16:2 14:2 16:4',
      '13:2 15:2 17:2 15:2 13:2 11:2 13:4',
      '14:2 16:2 18:2 16:2 14:2 11:2 14:4',
      '13:2 11:2 9:2 11:2 13:2 14:2 16:4',
      '14:2 12:2 10:2 12:2 13:2 15:2 17:4',
      '14:2 16:2 18:2 16:2 14:2 11:2 14:4',
    ],
    B: {
      k: -3,
      endProg: [[1, 0], 0],
      end: ['14:2 12:2 10:2 12:2 13:2 15:2 17:4', '14:2 16:2 18:2 21:6 r:4'],
    },
  },
  {
    name: 'El regreso del amanecer',
    choir: {
      vowel: 'ah',
      chant: [0, 6, 8],
      clap: [4, 10, 12, 14],
    },
    hook: {
      s: [0, 3, 6, 8, 11, 14],
      n: [0, 2, 3, 0, 2, 1],
      voice: 'guitar',
      v: 0.018,
    },
    epic: 3,
    bpm: 134,
    sc: 'maj',
    root: 46,
    swing: 0.1,
    leadVoice: 'brass',
    compVoice: 'piano',
    comp: 'charleston',
    bassPat: 'walk',
    groove: 'bigband',
    arpVoice: 'celesta',
    arpPat: [0, 2, 3, 1],
    arpEvery: 2,
    arpV: 0.013,
    echo: false,
    prog: [0, 3, [5, 1], 4, 0, 3, [1, 4], 0],
    tuneText: [
      '7:2 7:1 7:1 11:2 11:2 14:3 11:1 9:2 7:2',
      '10:2 10:1 10:1 14:2 14:2 16:3 14:1 12:2 10:2',
      '12:2 12:1 14:1 16:2 14:2 14:2 12:1 10:1 12:2 14:2',
      '13:2 13:1 15:1 17:2 15:2 13:2 11:2 13:2 15:2',
      '14:2 11:1 14:1 16:2 14:2 11:2 14:2 16:2 r:2',
      '14:2 12:1 14:1 16:2 14:2 12:2 14:2 16:2 r:2',
      '14:2 12:2 10:2 12:2 13:2 15:1 13:1 11:2 13:2',
      '14:3 11:1 14:2 16:2 14:4 r:2 11:2',
    ],
    B: {
      k: -3,
      endProg: [[1, 4], 0],
      end: ['14:2 12:2 10:2 12:2 13:2 15:2 17:2 15:2', '14:3 11:1 14:2 16:2 18:4 r:4'],
    },
  },
];

/**
 * Menú principal: himno de aventura en Re mayor sobre la progresión vi–IV–I–V. La melodía es un MOTIVO sincopado (3+3+2)
 * que se repite subiendo con los acordes (eso es lo que se pega); la sección B responde arriba con llamadas cortas.
 */
const MENU_DATA = {
  name: 'Crónicas de la llave roja',
  choir: { vowel: 'ah', chant: [0, 3, 6], clap: [4, 12, 15] },
  ownChorus: true,
  epic: 3,
  bpm: 126,
  sc: 'maj',
  root: 50,
  swing: 0.04,
  leadVoice: 'brass',
  counterVoice: 'strings',
  compVoice: 'guitar',
  comp: 'pump',
  bassPat: 'funk',
  groove: 'drive',
  echo: true,
  leadV: 0.04,
  compV: 0.014,
  hook: { s: [0, 3, 6, 8, 11, 14], n: [0, 2, 3, 0, 2, 1], voice: 'pizz', v: 0.02 },
  prog: [5, 3, 0, 4, 5, 3, 0, [4, 0], 3, 4, 5, 0, 3, 4, [1, 4], 0],
  tuneText: [
    '9:3 9:3 11:2 12:3 11:3 9:2',
    '10:3 10:3 12:2 14:3 12:3 10:2',
    '11:3 11:3 14:2 16:3 14:3 11:2',
    '13:3 13:3 15:2 13:4 r:2 11:2',
    '9:3 9:3 11:2 12:3 11:3 9:2',
    '10:3 10:3 12:2 14:3 15:3 17:2',
    '18:3 16:3 14:2 16:3 14:3 11:2',
    '13:3 15:3 13:2 14:6 r:2',
    '17:2 r:1 17:1 17:2 15:2 14:4 12:2 14:2',
    '18:2 r:1 18:1 18:2 17:2 15:4 13:2 15:2',
    '19:2 r:1 19:1 19:2 18:2 16:4 14:2 16:2',
    '18:3 16:3 14:2 11:4 r:2 14:1 16:1',
    '17:2 r:1 17:1 17:2 15:2 14:4 15:2 17:2',
    '18:2 r:1 18:1 18:2 20:2 22:4 20:2 18:2',
    '21:3 19:3 17:2 18:3 17:3 15:2',
    '14:3 14:3 16:2 14:6 r:2',
  ],
};

/**
 * Elección de héroe: llamada a las armas en Si dórico. El motivo es un redoble de semicorcheas («ta-ta-TAA») que arranca cada
 * compás y sube; la sección B contesta con golpes cortos y silencios, cada vez más arriba, hasta el remate.
 */
const HEROES_DATA = {
  name: 'Un compañero, un poder',
  choir: { vowel: 'oh', chant: [0, 2, 3], clap: [4, 8, 12] },
  ownChorus: true,
  epic: 3,
  bpm: 132,
  sc: 'dor',
  root: 47,
  swing: 0.03,
  leadVoice: 'brass',
  counterVoice: 'horn',
  compVoice: 'pizz',
  comp: 'chop16',
  bassPat: 'gallop',
  groove: 'march',
  echo: false,
  leadV: 0.042,
  compV: 0.016,
  hook: { s: [0, 2, 3, 6, 8, 10, 11, 14], n: [0, 0, 2, 1, 0, 0, 3, 2], voice: 'pizz', oct: 0, v: 0.022 },
  prog: [0, 3, 0, 6, 0, 3, 6, [3, 4], 2, 6, 3, 0, 2, 6, 3, [4, 0]],
  tuneText: [
    '7:1 7:1 7:2 9:2 11:2 14:3 11:3 9:2',
    '10:1 10:1 10:2 12:2 14:2 17:3 14:3 12:2',
    '11:1 11:1 11:2 13:2 14:2 16:3 14:3 11:2',
    '13:3 12:3 10:2 13:4 r:2 12:1 13:1',
    '7:1 7:1 7:2 9:2 11:2 14:3 16:3 18:2',
    '19:1 19:1 19:2 17:2 15:2 14:3 12:3 10:2',
    '13:1 13:1 13:2 15:2 17:2 20:3 19:3 17:2',
    '17:3 15:3 14:2 15:6 r:2',
    '16:2 r:1 16:1 18:2 16:2 15:3 13:3 11:2',
    '15:2 r:1 15:1 17:2 15:2 13:3 12:3 10:2',
    '17:2 r:1 17:1 19:2 17:2 14:3 12:3 10:2',
    '14:1 14:1 14:2 16:2 18:2 21:4 r:2 18:2',
    '16:2 r:1 16:1 18:2 20:2 22:3 20:3 18:2',
    '20:2 r:1 20:1 19:2 17:2 15:3 17:3 19:2',
    '21:3 19:3 17:2 19:3 17:3 14:2',
    '18:3 17:3 15:2 14:6 r:2',
  ],
};

/**
 * Cartas del destino (cierre de cada ciudad): marcha dramática en menor armónico, más rápida y con orquesta completa.
 */
const FATE_DATA = {
  name: 'Marcha del destino',
  choir: { vowel: 'oh', chant: [0, 8], clap: [] },
  ownChorus: true,
  hook: { s: [0, 2, 3, 6, 8, 10, 11, 14], n: [0, 0, 2, 0, 1, 1, 3, 2], voice: 'pizz', oct: 0, v: 0.024 },
  march: true,
  epic: 3,
  bpm: 134,
  sc: 'hmin',
  root: 38,
  swing: 0.08,
  leadVoice: 'brass',
  compVoice: 'strings',
  comp: 'charleston',
  bassPat: 'gallop',
  groove: 'march',
  echo: false,
  leadV: 0.05,
  prog: [0, 5, 3, 4, 0, 5, [3, 4], 0, 3, 3, 5, 4, 0, 5, '4:7', 0],
  tuneText: [
    '7:2 r:2 9:2 7:2 11:4 9:2 7:2',
    '12:2 r:2 14:2 12:2 11:4 9:2 7:2',
    '10:2 r:2 12:2 14:2 12:4 10:2 12:2',
    '11:2 13:2 15:2 13:2 11:4 13:2 r:2',
    '14:4 12:2 11:2 9:4 7:4',
    '12:2 14:2 16:2 14:2 12:4 11:2 9:2',
    '10:2 12:2 14:2 12:2 11:4 13:2 11:2',
    '14:2 13:2 14:2 16:2 14:4 r:4',
    '17:2 r:2 17:2 15:2 14:4 12:4',
    '17:2 15:2 14:2 12:2 14:4 15:2 17:2',
    '19:2 r:2 19:2 18:2 16:4 14:4',
    '18:2 17:2 15:2 17:2 18:4 20:2 r:2',
    '21:4 19:2 18:2 16:4 14:4',
    '19:2 18:2 16:2 14:2 12:4 14:2 16:2',
    '18:2 20:2 21:2 20:2 18:4 17:2 15:2',
    '21:2 20:2 21:2 22:2 21:6 r:2',
  ],
};

/**
 * Capas por nivel: cada ciudad tiene UNA melodía central y, a medida que avanzas por sus 10 niveles, se le suman capas.
 * Así el nivel 1 suena limpio y el 10 suena a orquesta completa, sin cambiar la melodía (no cansa y se siente avanzar).
 *   1  melodía + colchón de cuerdas + bajo mínimo      6  + arpegio
 *   2  + bajo completo                                 7  + contramelodía (armonía una tercera debajo)
 *   3  + percusión ligera (escobillas, shaker, rim)    8  + orquesta (timbal y metales / cuerdas)
 *   4  + acompañamiento (acordes)                      9  + melodía doblada una octava arriba
 *   5  + bombo y caja con redobles                    10  + eco, platillos: todo
 */
/**
 * FORMA DE CANCIÓN: cada tema ya no es una vuelta de 16 compases que se repite, sino una canción de 88 compases (unos 3 minutos)
 * armada con sus dos mitades (A = compases 1-8, B = 9-16) y un arreglo distinto por sección:
 *   intro      – sin melodía: colchón, el gancho rítmico, percusión ligera; el bajo entra a mitad y un redoble la empuja.
 *   estrofa    – la melodía A, sola y limpia; en la 2.ª entra la armonía y más batería; la 3.ª la canta OTRO instrumento.
 *   pre-coro   – el arranque de B con un redoble que crece.
 *   CORO       – el momento pegajoso: el MOTIVO del primer compás repetido en secuencia sobre los acordes de B (y un remate cada
 *                4 compases), con todo: batería completa, metales, octava, armonía de tercera, platillo y timbal al entrar.
 *   corte      – se cae todo menos el gancho y la percusión; redoble de vuelta.
 *   puente     – B dos grados más abajo (acordes incluidos), a medio tiempo, con otro instrumento: respira y cambia de color.
 *   subida     – cuatro compases de redoble y ruido ascendente.
 *   coro final – el coro otra vez, 16 compases, MODULADO un tono arriba (la subida «épica» de las canciones).
 *   cierre     – vuelve la calma con el gancho y un eco de la melodía; de ahí otra vez a la intro.
 * `cap`/`lift` ligan la sección con las capas por nivel: capa efectiva = min(cap, capa del nivel + lift), así el coro siempre
 * suena grande y los primeros niveles de una ciudad siguen siendo más ligeros que los últimos.
 */
export const FORM = [
  { id: 'intro', bars: 4, src: 'A', lead: false, cap: 4, lift: 0, drums: 'light', bassFrom: 2, build: true },
  { id: 'verse', bars: 8, src: 'A', cap: 7, lift: 1 },
  { id: 'verse2', bars: 8, src: 'A', cap: 8, lift: 2, harmony: true },
  { id: 'pre', bars: 4, src: 'B', cap: 8, lift: 2, build: true },
  { id: 'chorus', bars: 8, src: 'B', chorus: true, cap: 10, lift: 5, crash: true },
  { id: 'break', bars: 4, src: 'A', lead: false, cap: 3, lift: 0, drums: 'light', build: true },
  { id: 'verse3', bars: 8, src: 'A', cap: 8, lift: 2, alt: true, harmony: true },
  { id: 'chorus2', bars: 8, src: 'B', chorus: true, cap: 10, lift: 5, crash: true },
  { id: 'bridge', bars: 8, src: 'B', shift: -2, cap: 6, lift: 1, drums: 'half', hook: false, alt: true },
  { id: 'rise', bars: 4, src: 'A', lead: false, cap: 5, lift: 1, drums: 'build' },
  { id: 'final', bars: 16, src: 'BA', chorus: true, mod: 2, cap: 10, lift: 6, crash: true },
  { id: 'outro', bars: 8, src: 'A', leadBars: 2, cap: 3, lift: 0, drums: 'light' },
];
export const FORM_BARS = FORM.reduce((n, sec) => n + sec.bars, 0);
/** Sección de la forma y compás dentro de ella para un compás absoluto de la canción. */
export function sectionAt(bar) {
  let b = ((bar % FORM_BARS) + FORM_BARS) % FORM_BARS;
  for (const sec of FORM) {
    if (b < sec.bars) return { sec, k: b };
    b -= sec.bars;
  }
  return { sec: FORM[0], k: 0 };
}
/** Instrumento que releva al solista en la 3.ª estrofa y el puente. */
export const ALT_VOICE = {
  flute: 'fiddle',
  whistle: 'clarinet',
  clarinet: 'flute',
  fiddle: 'whistle',
  synth: 'vibes',
  celesta: 'flute',
  koto: 'flute',
  brass: 'horn',
  vibes: 'celesta',
  horn: 'brass',
};

export const LAYERS_PER_CITY = 10;
export const layerOfLevel = (level) => ((Math.max(1, level) - 1) % LAYERS_PER_CITY) + 1;
export const layersFor = (layer = LAYERS_PER_CITY) => ({
  bass: layer >= 2 ? 'full' : 'lite',
  drums: layer >= 5 ? 'full' : layer >= 3 ? 'light' : 'none',
  comp: layer >= 4,
  arp: layer >= 6,
  counter: layer >= 7,
  orchestra: layer >= 8,
  octave: layer >= 9,
  tutti: layer >= 10,
});

/** Completa los 8 compases de la sección A con la B desplazada (si el tema usa el atajo `B`) hasta tener 16. */
function expand(d) {
  if (!d.B) return d;
  const n = SCALES[d.sc].length;
  const { k, end, endProg } = d.B;
  return {
    ...d,
    tuneText: [...d.tuneText, ...d.tuneText.slice(0, 6).map((b) => shiftBar(b, k)), ...end],
    prog: [...d.prog, ...d.prog.slice(0, 6).map((e) => shiftEntry(e, k, n)), ...endProg],
  };
}

/** Valores comunes de timbre (suaves) que cada tema puede sobrescribir. */
const build = (raw) => {
  const d = expand(raw);
  return {
    padW: 'sine',
    padV: 0.016,
    bassV: 0.07,
    compV: 0.02,
    arpV: 0.02,
    leadV: 0.042,
    epic: 1,
    groove: 'pop',
    echo: false,
    ...d,
    tune: d.tuneText.map((b) => parseBar(b).notes),
  };
};

/** La instrumentación de fondo conserva el estilo de cada ciudad. Cada héroe tiene partitura propia. */
const buildRepertoire = (songs) => songs.map((song, city) => build({ ...JEAN_THEME_DATA[city], ...song }));
export const ZONE_THEMES = JEAN_THEME_DATA.map(build);
export const CITY_REPERTOIRES = {
  jean: ZONE_THEMES,
  lia: buildRepertoire(LIA_THEME_DATA),
  van: buildRepertoire(JUTH_THEME_DATA),
};
export const cityThemeFor = (city, hero) =>
  (Object.hasOwn(CITY_REPERTOIRES, hero) ? CITY_REPERTOIRES[hero] : ZONE_THEMES)[city];
export const MENU_THEME = build(MENU_DATA);
export const HEROES_THEME = build(HEROES_DATA);
export const FATE_THEME = build(FATE_DATA);
export const ALL_THEMES = [...Object.values(CITY_REPERTOIRES).flat(), MENU_THEME, HEROES_THEME, FATE_THEME];
